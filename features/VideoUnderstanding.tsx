import React, { useState, useContext } from 'react';
import { GoogleGenAI, Part } from "@google/genai";
import { extractVideoFrames, fileToBase64 } from '../utils/fileUtils';
import Spinner from '../components/Spinner';
import FeatureLayout from './common/FeatureLayout';
import { Label, Input, TextArea, Button } from './common/Controls';
import ReactMarkdown from 'react-markdown';
import { HistoryContext } from '../context/HistoryContext';

const VideoUnderstanding: React.FC = () => {
    const { addHistoryItem } = useContext(HistoryContext);
    const [videoFile, setVideoFile] = useState<File | null>(null);
    const [videoUrl, setVideoUrl] = useState<string | null>(null);
    const [prompt, setPrompt] = useState<string>('Summarize this video. What are the key events?');
    const [analysis, setAnalysis] = useState<string>('');
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [loadingText, setLoadingText] = useState('');
    const [error, setError] = useState<string | null>(null);
    
    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setVideoFile(file);
            setVideoUrl(URL.createObjectURL(file));
            setAnalysis('');
        }
    };

    const handleAnalyze = async () => {
        if (!videoFile || !prompt) {
            setError('Please upload a video and provide a prompt.');
            return;
        }
        setIsLoading(true);
        setError(null);
        setAnalysis('');

        try {
            setLoadingText('Extracting frames from video (1 frame per second)...');
            const frames = await extractVideoFrames(videoFile, 1);
            if(frames.length === 0) {
                throw new Error("Could not extract any frames from the video. It might be too short or in an unsupported format.");
            }
            
            setLoadingText(`Analyzing ${frames.length} frames...`);

            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });
            
            const parts: Part[] = [
                { text: prompt },
                ...frames.map(frame => ({
                    inlineData: {
                        data: frame.base64,
                        mimeType: frame.mimeType
                    }
                }))
            ];
            
            const response = await ai.models.generateContent({
                model: 'gemini-2.5-pro',
                contents: { parts: parts },
            });
            
            const resultText = response.text;
            setAnalysis(resultText);

            addHistoryItem({
                id: Date.now().toString(),
                feature: 'Video Understanding',
                timestamp: Date.now(),
                inputs: { prompt, video: videoUrl },
                outputs: { analysis: resultText }
            });

        } catch (e: any) {
            setError(e.message || 'An error occurred while analyzing the video.');
            console.error(e);
        } finally {
            setIsLoading(false);
            setLoadingText('');
        }
    };

    return (
        <FeatureLayout
            title="Video Understanding"
            description="Analyze video content to identify objects, summarize events, and answer your questions."
        >
            <div className="space-y-6">
                <div>
                    <Label htmlFor="video-upload">Upload a Video to Analyze</Label>
                    <Input id="video-upload" type="file" accept="video/*" onChange={handleFileChange} />
                </div>
                {videoUrl && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <video src={videoUrl} controls className="rounded-lg shadow-lg w-full" />
                        <div className="space-y-4">
                            <div>
                                <Label htmlFor="prompt">What do you want to know?</Label>
                                <TextArea
                                    id="prompt"
                                    value={prompt}
                                    onChange={(e) => setPrompt(e.target.value)}
                                    placeholder="e.g., What brand of car is shown?"
                                />
                            </div>
                            <div>
                                <Button onClick={handleAnalyze} disabled={isLoading || !videoFile}>
                                    {isLoading ? <><Spinner className="w-5 h-5 mr-2" /> Analyzing...</> : 'Analyze Video'}
                                </Button>
                            </div>
                        </div>
                    </div>
                )}
                {isLoading && <div className="text-blue-300">{loadingText}</div>}
                {error && <div className="text-red-400 bg-red-900/50 p-3 rounded-md">{error}</div>}
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

export default VideoUnderstanding;