import React, { useState, useContext } from 'react';
import { GoogleGenAI } from "@google/genai";
import { fileToBase64 } from '../utils/fileUtils';
import Spinner from '../components/Spinner';
import FeatureLayout from './common/FeatureLayout';
import { Label, TextArea, Button } from './common/Controls';
import ReactMarkdown from 'react-markdown';
import { HistoryContext } from '../context/HistoryContext';
import { getFriendlyErrorMessage } from '../utils/errorHandler';
import Dropzone from '../components/Dropzone';
import { IconUpload } from '../components/Icons';

const AudioAnalysis: React.FC = () => {
    const { addHistoryItem } = useContext(HistoryContext);
    const [audioFile, setAudioFile] = useState<File | null>(null);
    const [audioUrl, setAudioUrl] = useState<string | null>(null);
    const [prompt, setPrompt] = useState<string>('Transcribe the speech in this audio file.');
    const [analysis, setAnalysis] = useState<string>('');
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    
    const handleFileSelect = (file: File) => {
        if (file) {
            setAudioFile(file);
            setAudioUrl(URL.createObjectURL(file));
            setAnalysis('');
        }
    };

    const handleAnalyze = async () => {
        if (!audioFile || !prompt) {
            setError('Please upload an audio file and provide a prompt.');
            return;
        }
        setIsLoading(true);
        setError(null);
        setAnalysis('');

        try {
            const base64Data = await fileToBase64(audioFile);
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });
            
            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: {
                    parts: [
                        { inlineData: { data: base64Data, mimeType: audioFile.type } },
                        { text: prompt },
                    ],
                },
            });
            const resultText = response.text;
            setAnalysis(resultText);

            addHistoryItem({
                id: Date.now().toString(),
                feature: 'Audio Analysis',
                timestamp: Date.now(),
                inputs: { prompt, audio: audioUrl },
                outputs: { analysis: resultText }
            });

        } catch (e: any) {
            setError(getFriendlyErrorMessage(e));
            console.error(e);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <FeatureLayout
            title="Audio Analysis"
            description="Analyze audio files with Gemini. Upload an audio clip, ask a question, and get a text-based analysis."
        >
            <div className="space-y-6">
                <div>
                    <Label>Upload an Audio File to Analyze</Label>
                    <Dropzone onFileSelect={handleFileSelect} accept="audio/*">
                        <div className="flex flex-col items-center justify-center text-gray-400">
                            <IconUpload />
                            <p className="mt-2">Drag & drop an audio file here, or click to select a file</p>
                            {audioFile && <p className="mt-2 text-sm text-green-400">Selected: {audioFile.name}</p>}
                        </div>
                    </Dropzone>
                </div>
                {audioUrl && (
                    <div className="space-y-4">
                        <audio src={audioUrl} controls className="w-full rounded-lg" />
                        <div>
                            <Label htmlFor="prompt">What do you want to know about this audio?</Label>
                            <TextArea
                                id="prompt"
                                value={prompt}
                                onChange={(e) => setPrompt(e.target.value)}
                                placeholder="e.g., What is the mood of this music?"
                            />
                        </div>
                        <div>
                            <Button onClick={handleAnalyze} disabled={isLoading || !audioFile}>
                                {isLoading ? <><Spinner className="w-5 h-5 mr-2" /> Analyzing...</> : 'Analyze Audio'}
                            </Button>
                        </div>
                    </div>
                )}
                {error && (
                    <div className="text-red-400 bg-red-900/50 p-3 rounded-md prose prose-invert max-w-none prose-p:my-0">
                        <ReactMarkdown components={{ a: ({node, ...props}) => <a {...props} className="text-blue-400 hover:underline" target="_blank" rel="noopener noreferrer" /> }}>
                            {error}
                        </ReactMarkdown>
                    </div>
                )}
                {analysis && (
                    <div className="mt-6 p-4 bg-gray-900/50 rounded-lg">
                        <h3 className="text-lg font-semibold mb-2">Analysis Result</h3>
                        <div className="prose prose-invert max-w-none text-gray-300">
                             <ReactMarkdown>{analysis}</ReactMarkdown>
                        </div>
                    </div>
                )}
            </div>
        </FeatureLayout>
    );
};

export default AudioAnalysis;