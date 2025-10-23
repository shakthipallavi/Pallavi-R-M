import React, { useState, useRef, useCallback, useEffect, useContext } from 'react';
import { GoogleGenAI, LiveSession, LiveServerMessage, Modality, Blob as GenAIBlob } from '@google/genai';
import { decode, encode, decodeAudioData } from '../utils/audioUtils';
import FeatureLayout from './common/FeatureLayout';
import { Button } from './common/Controls';
import { IconMicrophone } from '../components/Icons';
import { HistoryContext } from '../context/HistoryContext';

interface TranscriptionEntry {
    source: 'user' | 'model';
    text: string;
}

const LiveConversation: React.FC = () => {
    const { addHistoryItem } = useContext(HistoryContext);
    const [isSessionActive, setIsSessionActive] = useState(false);
    const [transcriptionHistory, setTranscriptionHistory] = useState<TranscriptionEntry[]>([]);
    const [error, setError] = useState<string | null>(null);

    const sessionRef = useRef<LiveSession | null>(null);
    const inputAudioContextRef = useRef<AudioContext | null>(null);
    const outputAudioContextRef = useRef<AudioContext | null>(null);
    const mediaStreamRef = useRef<MediaStream | null>(null);
    const scriptProcessorRef = useRef<ScriptProcessorNode | null>(null);
    const nextStartTimeRef = useRef<number>(0);
    const audioSourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());

    const currentInputTranscriptionRef = useRef('');
    const currentOutputTranscriptionRef = useRef('');

    const stopSession = useCallback((saveHistory: boolean = false) => {
        if (saveHistory && transcriptionHistory.length > 0) {
            addHistoryItem({
                id: Date.now().toString(),
                feature: 'Live Conversation',
                timestamp: Date.now(),
                inputs: {},
                outputs: { transcript: transcriptionHistory }
            });
        }

        if (sessionRef.current) {
            sessionRef.current.close();
            sessionRef.current = null;
        }
        if (scriptProcessorRef.current) {
            scriptProcessorRef.current.disconnect();
            scriptProcessorRef.current = null;
        }
        if (mediaStreamRef.current) {
            mediaStreamRef.current.getTracks().forEach(track => track.stop());
            mediaStreamRef.current = null;
        }
        if (inputAudioContextRef.current && inputAudioContextRef.current.state !== 'closed') {
            inputAudioContextRef.current.close();
        }
        if (outputAudioContextRef.current && outputAudioContextRef.current.state !== 'closed') {
            outputAudioContextRef.current.close();
        }

        audioSourcesRef.current.forEach(source => source.stop());
        audioSourcesRef.current.clear();
        nextStartTimeRef.current = 0;

        setIsSessionActive(false);
    }, [transcriptionHistory, addHistoryItem]);

    const handleStart = async () => {
        if (isSessionActive) return;
        setError(null);
        setTranscriptionHistory([]);
        
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            mediaStreamRef.current = stream;

            inputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
            outputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
            
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });

            const sessionPromise = ai.live.connect({
                model: 'gemini-2.5-flash-native-audio-preview-09-2025',
                callbacks: {
                    onopen: () => {
                        setIsSessionActive(true);
                        const source = inputAudioContextRef.current!.createMediaStreamSource(stream);
                        const scriptProcessor = inputAudioContextRef.current!.createScriptProcessor(4096, 1, 1);
                        scriptProcessorRef.current = scriptProcessor;

                        scriptProcessor.onaudioprocess = (audioProcessingEvent) => {
                            const inputData = audioProcessingEvent.inputBuffer.getChannelData(0);
                            const pcmBlob: GenAIBlob = {
                                data: encode(new Uint8Array(new Int16Array(inputData.map(x => x * 32768)).buffer)),
                                mimeType: 'audio/pcm;rate=16000',
                            };
                            sessionPromise.then(session => session.sendRealtimeInput({ media: pcmBlob }));
                        };
                        source.connect(scriptProcessor);
                        scriptProcessor.connect(inputAudioContextRef.current!.destination);
                    },
                    onmessage: async (message: LiveServerMessage) => {
                         if (message.serverContent?.outputTranscription) {
                            currentOutputTranscriptionRef.current += message.serverContent.outputTranscription.text;
                        }
                        if (message.serverContent?.inputTranscription) {
                            currentInputTranscriptionRef.current += message.serverContent.inputTranscription.text;
                        }

                        if (message.serverContent?.turnComplete) {
                            const fullInput = currentInputTranscriptionRef.current.trim();
                            const fullOutput = currentOutputTranscriptionRef.current.trim();
                            
                            setTranscriptionHistory(prev => [
                                ...prev,
                                ...(fullInput ? [{ source: 'user', text: fullInput }] : []),
                                ...(fullOutput ? [{ source: 'model', text: fullOutput }] : []),
                            ]);

                            currentInputTranscriptionRef.current = '';
                            currentOutputTranscriptionRef.current = '';
                        }
                        
                        const base64Audio = message.serverContent?.modelTurn?.parts[0]?.inlineData.data;
                        if (base64Audio) {
                            const outputCtx = outputAudioContextRef.current!;
                            nextStartTimeRef.current = Math.max(nextStartTimeRef.current, outputCtx.currentTime);
                            const audioBuffer = await decodeAudioData(decode(base64Audio), outputCtx, 24000, 1);
                            const source = outputCtx.createBufferSource();
                            source.buffer = audioBuffer;
                            source.connect(outputCtx.destination);
                            
                            source.addEventListener('ended', () => audioSourcesRef.current.delete(source));
                            source.start(nextStartTimeRef.current);
                            nextStartTimeRef.current += audioBuffer.duration;
                            audioSourcesRef.current.add(source);
                        }
                    },
                    onerror: (e: ErrorEvent) => {
                        console.error('Session error:', e);
                        setError(`Session error: ${e.message}`);
                        stopSession(false);
                    },
                    onclose: () => {
                        stopSession(true);
                    },
                },
                config: {
                    responseModalities: [Modality.AUDIO],
                    outputAudioTranscription: {},
                    inputAudioTranscription: {},
                    speechConfig: {
                        voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Zephyr' } },
                    },
                },
            });

            sessionRef.current = await sessionPromise;
        } catch (err: any) {
            setError(err.message || 'Failed to start microphone or session.');
            console.error(err);
            stopSession(false);
        }
    };
    
    const handleStop = () => {
        stopSession(true);
    };

    useEffect(() => {
        return () => stopSession(false);
    }, [stopSession]);
    
    return (
        <FeatureLayout
            title="Live Conversation"
            description="Speak directly with Gemini in real-time. Start the session and have a natural, low-latency voice conversation."
        >
             <div className="flex flex-col h-full">
                <div className="flex-shrink-0 mb-4">
                    <Button onClick={isSessionActive ? handleStop : handleStart} className={isSessionActive ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700'}>
                        <IconMicrophone />
                        <span className="ml-2">{isSessionActive ? 'Stop Conversation' : 'Start Conversation'}</span>
                    </Button>
                    {isSessionActive && <div className="mt-2 text-green-400 animate-pulse">Listening...</div>}
                </div>
                
                {error && <div className="text-red-400 bg-red-900/50 p-3 rounded-md mb-4">{error}</div>}

                <div className="flex-grow bg-gray-900/50 rounded-lg p-4 overflow-y-auto space-y-4">
                    {transcriptionHistory.length === 0 && !isSessionActive && (
                         <div className="text-center text-gray-500 pt-10">Press "Start" to begin your conversation.</div>
                    )}
                    {transcriptionHistory.map((entry, index) => (
                        <div key={index} className={`flex ${entry.source === 'user' ? 'justify-end' : 'justify-start'}`}>
                            <div className={`max-w-xl px-4 py-2 rounded-xl ${entry.source === 'user' ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-200'}`}>
                                {entry.text}
                            </div>
                        </div>
                    ))}
                </div>
             </div>
        </FeatureLayout>
    );
};

export default LiveConversation;