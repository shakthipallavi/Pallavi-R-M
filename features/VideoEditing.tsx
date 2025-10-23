import React, { useState, useContext } from 'react';
import { GoogleGenAI } from "@google/genai";
import ReactMarkdown from 'react-markdown';
import { VideoAspectRatio } from '../types';
import Spinner from '../components/Spinner';
import FeatureLayout from './common/FeatureLayout';
import { Label, TextArea, Button } from './common/Controls';
import { useVeoApiKey } from '../hooks/useVeoApiKey';
import { extractLastVideoFrame } from '../utils/fileUtils';
import { HistoryContext } from '../context/HistoryContext';
import { getFriendlyErrorMessage } from '../utils/errorHandler';
import { IconDownload, IconUpload } from '../components/Icons';
import Dropzone from '../components/Dropzone';

const loadingMessages = [
    "Analyzing the final scene...",
    "Setting up for the next take...",
    "Generating the director's cut...",
    "This can take a few minutes, good things come to those who wait...",
    "The new scene is almost ready...",
];

const VideoEditing: React.FC = () => {
    const { addHistoryItem } = useContext(HistoryContext);
    const { isKeySelected, isCheckingKey, selectKey, handleApiError } = useVeoApiKey();
    
    const [originalVideoFile, setOriginalVideoFile] = useState<File | null>(null);
    const [originalVideoUrl, setOriginalVideoUrl] = useState<string | null>(null);
    const [prompt, setPrompt] = useState<string>("Continue the action, making it more epic and dramatic.");
    const [editedVideoUrl, setEditedVideoUrl] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [loadingMessage, setLoadingMessage] = useState(loadingMessages[0]);
    const [error, setError] = useState<string | null>(null);

    React.useEffect(() => {
        let interval: number;
        if (isLoading) {
            let i = 0;
            interval = window.setInterval(() => {
                i = (i + 1) % loadingMessages.length;
                setLoadingMessage(loadingMessages[i]);
            }, 4000);
        }
        return () => window.clearInterval(interval);
    }, [isLoading]);

    const handleFileSelect = (file: File) => {
        if (file) {
            setOriginalVideoFile(file);
            setOriginalVideoUrl(URL.createObjectURL(file));
            setEditedVideoUrl(null);
            setError(null);
        }
    };

    const handleDownload = () => {
        if (!editedVideoUrl) return;
        const link = document.createElement('a');
        link.href = editedVideoUrl;
        link.download = 'gemini-extended-video.mp4';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleGenerate = async () => {
        if (!originalVideoFile) {
            setError('Please upload a video to edit.');
            return;
        }
        if (!prompt) {
            setError('Please enter a prompt to guide the edit.');
            return;
        }

        setIsLoading(true);
        setError(null);
        setEditedVideoUrl(null);
        setLoadingMessage(loadingMessages[0]);

        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });
            
            // Workaround: Extract last frame and generate a new video from it.
            const { base64, width, height } = await extractLastVideoFrame(originalVideoFile);
            const aspectRatio: VideoAspectRatio = width > height ? "16:9" : "9:16";

            const operation = await ai.models.generateVideos({
                model: 'veo-3.1-fast-generate-preview',
                prompt: prompt,
                image: { imageBytes: base64, mimeType: 'image/jpeg' },
                config: { numberOfVideos: 1, resolution: '720p', aspectRatio: aspectRatio }
            });

            let currentOperation = operation;
            while (!currentOperation.done) {
                await new Promise(resolve => setTimeout(resolve, 10000));
                currentOperation = await ai.operations.getVideosOperation({ operation: currentOperation });
            }

            const downloadLink = currentOperation.response?.generatedVideos?.[0]?.video?.uri;
            if (downloadLink) {
                 const response = await fetch(`${downloadLink}&key=${process.env.API_KEY}`);
                 const blob = await response.blob();
                 const newVideoUrl = URL.createObjectURL(blob);
                 setEditedVideoUrl(newVideoUrl);

                 addHistoryItem({
                    id: Date.now().toString(),
                    feature: 'Video Editing',
                    timestamp: Date.now(),
                    inputs: { prompt, originalVideo: originalVideoUrl },
                    outputs: { editedVideo: newVideoUrl }
                 });

            } else {
                throw new Error("Video generation completed, but no download link was provided.");
            }
        } catch (e: any) {
            handleApiError(e);
            setError(getFriendlyErrorMessage(e));
            console.error(e);
        } finally {
            setIsLoading(false);
        }
    };
    
    if (isCheckingKey) {
        return <div className="flex justify-center items-center h-full"><Spinner className="w-10 h-10" /></div>;
    }

    if (!isKeySelected) {
        return (
            <div className="flex flex-col justify-center items-center h-full text-center">
                <h3 className="text-2xl font-bold mb-4">API Key Required for Veo</h3>
                <p className="mb-4 max-w-md">Video editing requires a valid API key with billing enabled. Please select your key to proceed.</p>
                <p className="text-sm text-gray-400 mb-6">For more info, see the <a href="https://ai.google.dev/gemini-api/docs/billing" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">billing documentation</a>.</p>
                <Button onClick={selectKey}>Select API Key</Button>
            </div>
        );
    }

    return (
        <FeatureLayout
            title="Video Editing (Extension)"
            description="Upload a video and describe what happens next. Gemini will generate a new clip continuing the action from the last frame."
        >
            <div className="space-y-6">
                <div>
                    <Label>Upload Your Video</Label>
                     <Dropzone onFileSelect={handleFileSelect} accept="video/*">
                        <div className="flex flex-col items-center justify-center text-gray-400">
                            <IconUpload />
                            <p className="mt-2">Drag & drop a video here, or click to select a file</p>
                            {originalVideoFile && <p className="mt-2 text-sm text-green-400">Selected: {originalVideoFile.name}</p>}
                        </div>
                    </Dropzone>
                </div>
                
                {originalVideoUrl && (
                    <div className="space-y-4">
                        <video src={originalVideoUrl} controls className="rounded-lg shadow-lg w-full max-h-64" />
                        <div>
                            <Label htmlFor="prompt">Editing Prompt (Describe what happens next)</Label>
                            <TextArea
                                id="prompt"
                                value={prompt}
                                onChange={(e) => setPrompt(e.target.value)}
                                placeholder="e.g., A spaceship flies out of the explosion"
                            />
                        </div>
                        <div>
                            <Button onClick={handleGenerate} disabled={isLoading}>
                                {isLoading ? <><Spinner className="w-5 h-5 mr-2" /> Generating...</> : 'Extend Video'}
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
                
                {isLoading && (
                     <div className="text-center p-4 bg-gray-900/50 rounded-lg">
                        <p className="text-lg">{loadingMessage}</p>
                    </div>
                )}

                {editedVideoUrl && (
                    <div>
                        <div className="flex justify-between items-center mb-2">
                             <h3 className="text-lg font-semibold">Extended Video</h3>
                            <button
                                onClick={handleDownload}
                                className="flex items-center gap-2 px-3 py-1 bg-gray-700 hover:bg-gray-600 rounded-md text-sm"
                            >
                                <IconDownload />
                                Download
                            </button>
                         </div>
                        <video src={editedVideoUrl} controls autoPlay loop className="rounded-lg shadow-lg w-full" />
                    </div>
                )}
            </div>
        </FeatureLayout>
    );
};

export default VideoEditing;