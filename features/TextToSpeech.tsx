import React, { useState, useContext } from 'react';
import { GoogleGenAI, Modality } from "@google/genai";
import Spinner from '../components/Spinner';
import FeatureLayout from './common/FeatureLayout';
import { Label, TextArea, Button } from './common/Controls';
import { decode, decodeAudioData } from '../utils/audioUtils';
import { HistoryContext } from '../context/HistoryContext';

const TextToSpeech: React.FC = () => {
    const { addHistoryItem } = useContext(HistoryContext);
    const [text, setText] = useState<string>('Hello, this is Gemini. I can convert text into natural-sounding speech. Try typing something new!');
    const [audioUrl, setAudioUrl] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);

    const handleGenerateSpeech = async () => {
        if (!text) {
            setError('Please enter some text to synthesize.');
            return;
        }
        setIsLoading(true);
        setError(null);
        setAudioUrl(null);

        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });
            const response = await ai.models.generateContent({
                model: "gemini-2.5-flash-preview-tts",
                contents: [{ parts: [{ text: text }] }],
                config: {
                    responseModalities: [Modality.AUDIO],
                    speechConfig: {
                        voiceConfig: {
                            prebuiltVoiceConfig: { voiceName: 'Kore' },
                        },
                    },
                },
            });

            const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
            if (base64Audio) {
                const outputAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
                const audioBuffer = await decodeAudioData(
                    decode(base64Audio),
                    outputAudioContext,
                    24000,
                    1
                );
                
                const getWav = (buffer: AudioBuffer) => {
                    const numOfChan = buffer.numberOfChannels,
                        len = buffer.length * numOfChan * 2 + 44,
                        bufferOut = new ArrayBuffer(len),
                        view = new DataView(bufferOut),
                        channels = [];
                    let i, sample, offset = 0, pos = 0;

                    setUint32(0x46464952); 
                    setUint32(len - 8); 
                    setUint32(0x45564157); 
                    setUint32(0x20746d66); 
                    setUint32(16); 
                    setUint16(1); 
                    setUint16(numOfChan); 
                    setUint32(buffer.sampleRate); 
                    setUint32(buffer.sampleRate * 2 * numOfChan); 
                    setUint16(numOfChan * 2); 
                    setUint16(16); 
                    setUint32(0x61746164); 
                    setUint32(len - pos - 4); 

                    function setUint16(data: number) { view.setUint16(pos, data, true); pos += 2; }
                    function setUint32(data: number) { view.setUint32(pos, data, true); pos += 4; }

                    for (i = 0; i < numOfChan; i++) channels.push(buffer.getChannelData(i));
                    
                    while (pos < len) {
                        for (i = 0; i < numOfChan; i++) {
                            sample = Math.max(-1, Math.min(1, channels[i][offset]));
                            sample = (0.5 + sample < 0 ? sample * 32768 : sample * 32767) | 0;
                            view.setInt16(pos, sample, true);
                            pos += 2;
                        }
                        offset++;
                    }

                    return new Blob([bufferOut], { type: "audio/wav" });
                };

                const wavBlob = getWav(audioBuffer);
                const url = URL.createObjectURL(wavBlob);
                setAudioUrl(url);

                addHistoryItem({
                    id: Date.now().toString(),
                    feature: 'Text to Speech',
                    timestamp: Date.now(),
                    inputs: { text },
                    outputs: { audio: url }
                });


            } else {
                throw new Error("No audio data was returned from the API.");
            }
        } catch (e: any) {
            setError(e.message || 'An error occurred while generating speech.');
            console.error(e);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <FeatureLayout
            title="Text-to-Speech"
            description="Bring your text to life with natural-sounding voices. Enter any text to generate high-quality audio."
        >
            <div className="space-y-6">
                <div>
                    <Label htmlFor="text-input">Text to Synthesize</Label>
                    <TextArea
                        id="text-input"
                        value={text}
                        onChange={(e) => setText(e.target.value)}
                        placeholder="Enter text here..."
                        rows={6}
                    />
                </div>

                <div>
                    <Button onClick={handleGenerateSpeech} disabled={isLoading}>
                        {isLoading ? <><Spinner className="w-5 h-5 mr-2" /> Generating Audio...</> : 'Generate Speech'}
                    </Button>
                </div>
                {error && <div className="text-red-400 bg-red-900/50 p-3 rounded-md">{error}</div>}
                
                {audioUrl && (
                    <div className="mt-4">
                        <h3 className="text-lg font-semibold mb-2">Generated Audio</h3>
                        <audio controls src={audioUrl} className="w-full">
                            Your browser does not support the audio element.
                        </audio>
                    </div>
                )}
            </div>
        </FeatureLayout>
    );
};

export default TextToSpeech;