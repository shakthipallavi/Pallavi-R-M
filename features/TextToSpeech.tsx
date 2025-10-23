import React, { useState, useContext } from 'react';
import { GoogleGenAI, Modality } from "@google/genai";
import ReactMarkdown from 'react-markdown';
import Spinner from '../components/Spinner';
import FeatureLayout from './common/FeatureLayout';
import { Label, TextArea, Button, Select } from './common/Controls';
import { decode, decodeAudioData } from '../utils/audioUtils';
import { HistoryContext } from '../context/HistoryContext';
import { getFriendlyErrorMessage } from '../utils/errorHandler';
import { IconDownload } from '../components/Icons';

const voiceGroups = {
    "Baby & Toddler Voices": [
        { name: 'Baby (Cooing Boy)', value: 'Puck' },
        { name: 'Baby (Giggling Girl)', value: 'Kore' },
        { name: 'Baby (Babbling)', value: 'Puck' },
        { name: 'Baby (Sleepy Yawns)', value: 'Puck' },
        { name: 'Baby (Excited Squeals)', value: 'Kore' },
        { name: 'Toddler (Male)', value: 'Puck' },
        { name: 'Toddler (Female)', value: 'Kore' },
        { name: 'Toddler (Giggly Girl)', value: 'Kore' },
        { name: 'Toddler (Curious Boy)', value: 'Puck' },
        { name: 'Leo (Playful Boy)', value: 'Puck' },
        { name: 'Lily (Sweet Girl)', value: 'Kore' },
    ],
    "Young Age": [
        { name: 'Rachel (Clear American Female)', value: 'Kore' },
        { name: 'Antoni (Youthful Male)', value: 'Puck' },
        { name: 'Bella (Soft Female Narrator)', value: 'Zephyr' },
        { name: 'Josh (Casual Male)', value: 'Puck' },
        { name: 'Elli (Upbeat Female)', value: 'Kore' },
        { name: 'Mia (Upbeat American Female)', value: 'Kore' },
        { name: 'Noah (Friendly Young Male)', value: 'Puck' },
        { name: 'Olivia (Sweet Female Voice)', value: 'Zephyr' },
        { name: 'Liam (Calm Narrator)', value: 'Puck' },
        { name: 'Young Male (Energetic)', value: 'Puck' },
        { name: 'Young Female (Storyteller)', value: 'Kore' },
        { name: 'Teen Boy (Casual)', value: 'Puck' },
        { name: 'Teen Girl (Upbeat)', value: 'Kore' },
    ],
    "Middle Age": [
        { name: 'Adam (Deep American Male)', value: 'Fenrir' },
        { name: 'Adam V2 (Storyteller)', value: 'Puck' },
        { name: 'Serena (Soothing Female)', value: 'Zephyr' },
        { name: 'Arnold (Powerful Male)', value: 'Charon' },
        { name: 'Ethan (Clear Announcer)', value: 'Charon' },
        { name: 'Fin (Raspy Male)', value: 'Fenrir' },
        { name: 'Middle-Aged Male (Confident)', value: 'Charon' },
        { name: 'Middle-Aged Female (Warm)', value: 'Zephyr' },
        { name: 'Middle-Aged Male (Friendly)', value: 'Puck' },
        { name: 'Middle-Aged Female (Professional)', value: 'Kore' },
        { name: 'Middle-Aged Male (Authoritative)', value: 'Fenrir' },
        { name: 'Middle-Aged Female (Energetic)', value: 'Kore' },
        { name: 'James (Deep Documentary Male)', value: 'Fenrir' },
        { name: 'Sophia (Elegant Female Narrator)', value: 'Zephyr' },
        { name: 'David (Corporate Male)', value: 'Charon' },
        { name: 'Emma (Warm Conversational Female)', value: 'Kore' },
        { name: 'Middle-Aged Female (News Anchor)', value: 'Kore' },
        { name: 'Middle-Aged Female (Calm Instructor)', value: 'Zephyr' },
        { name: 'Middle-Aged Male (Radio Host)', value: 'Charon' },
    ],
    "Old Age": [
        { name: 'Old Man (Narrator)', value: 'Fenrir' },
        { name: 'Old Woman (Storyteller)', value: 'Zephyr' },
        { name: 'Old Man (Wise Sage)', value: 'Charon' },
        { name: 'Old Woman (Gentle Grandmother)', value: 'Zephyr' },
        { name: 'Arthur (Grandfatherly Storyteller)', value: 'Fenrir' },
        { name: 'Eleanor (Wise Grandmother)', value: 'Zephyr' },
        { name: 'Old Male (Gruff Veteran)', value: 'Fenrir' },
        { name: 'Old Male (Gentle Professor)', value: 'Charon' },
        { name: 'Old Female (Quirky Aunt)', value: 'Zephyr' },
    ],
    "Gemini Base Voices": [
        { name: 'Kore (Female)', value: 'Kore' },
        { name: 'Puck (Male)', value: 'Puck' },
        { name: 'Charon (Male)', value: 'Charon' },
        { name: 'Fenrir (Male)', value: 'Fenrir' },
        { name: 'Zephyr (Female)', value: 'Zephyr' },
    ]
};

const allVoices = Object.values(voiceGroups).flat();

const TextToSpeech: React.FC = () => {
    const { addHistoryItem } = useContext(HistoryContext);
    const [text, setText] = useState<string>('Hello, this is Gemini. I can convert text into natural-sounding speech. Try typing something new!');
    const [voiceName, setVoiceName] = useState<string>('Adam (Deep American Male)');
    const [audioUrl, setAudioUrl] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);

    const handleDownload = () => {
        if (!audioUrl) return;
        const link = document.createElement('a');
        link.href = audioUrl;
        link.download = 'gemini-speech.wav';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleGenerateSpeech = async () => {
        if (!text) {
            setError('Please enter some text to synthesize.');
            return;
        }
        setIsLoading(true);
        setError(null);
        setAudioUrl(null);

        try {
            const selectedVoice = allVoices.find(v => v.name === voiceName);
            const voiceApiValue = selectedVoice?.value || 'Fenrir'; // Fallback to a default

            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });
            const response = await ai.models.generateContent({
                model: "gemini-2.5-flash-preview-tts",
                contents: [{ parts: [{ text: text }] }],
                config: {
                    responseModalities: [Modality.AUDIO],
                    speechConfig: {
                        voiceConfig: {
                            prebuiltVoiceConfig: { voiceName: voiceApiValue },
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
                    inputs: { text, voice: voiceName },
                    outputs: { audio: url }
                });


            } else {
                throw new Error("No audio data was returned from the API.");
            }
        } catch (e: any) {
            setError(getFriendlyErrorMessage(e));
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
                    <Label htmlFor="voice-select">Voice</Label>
                    <Select id="voice-select" value={voiceName} onChange={(e) => setVoiceName(e.target.value)}>
                        {Object.entries(voiceGroups).map(([groupName, voices]) => (
                            <optgroup key={groupName} label={groupName}>
                                {voices.map(v => (
                                    <option key={v.name} value={v.name}>{v.name}</option>
                                ))}
                            </optgroup>
                        ))}
                    </Select>
                </div>

                <div>
                    <Button onClick={handleGenerateSpeech} disabled={isLoading}>
                        {isLoading ? <><Spinner className="w-5 h-5 mr-2" /> Generating Audio...</> : 'Generate Speech'}
                    </Button>
                </div>
                {error && (
                    <div className="text-red-400 bg-red-900/50 p-3 rounded-md prose prose-invert max-w-none prose-p:my-0">
                        <ReactMarkdown components={{ a: ({node, ...props}) => <a {...props} className="text-blue-400 hover:underline" target="_blank" rel="noopener noreferrer" /> }}>
                            {error}
                        </ReactMarkdown>
                    </div>
                )}
                
                {audioUrl && (
                    <div className="mt-4">
                        <div className="flex justify-between items-center mb-2">
                            <h3 className="text-lg font-semibold">Generated Audio</h3>
                            <button
                                onClick={handleDownload}
                                className="flex items-center gap-2 px-3 py-1 bg-gray-700 hover:bg-gray-600 rounded-md text-sm"
                            >
                                <IconDownload />
                                Download
                            </button>
                        </div>
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