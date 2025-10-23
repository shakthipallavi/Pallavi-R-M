import React, { useState, useContext } from 'react';
import { GoogleGenAI } from "@google/genai";
import { VideoAspectRatio } from '../types';
import Spinner from '../components/Spinner';
import FeatureLayout from './common/FeatureLayout';
import { Label, Input, TextArea, Select, Button } from './common/Controls';
import { useVeoApiKey } from '../hooks/useVeoApiKey';
import { fileToBase64 } from '../utils/fileUtils';
import { HistoryContext } from '../context/HistoryContext';

type GenerationMode = 'text-to-video' | 'image-to-video';

const loadingMessages = [
    "Warming up the digital director's chair...",
    "Choreographing pixels into motion...",
    "Rendering your cinematic masterpiece...",
    "This can take a few minutes, please be patient...",
    "The final cut is almost ready...",
];

const VideoGeneration: React.FC = () => {
    const { addHistoryItem } = useContext(HistoryContext);
    const { isKeySelected, isCheckingKey, selectKey, handleApiError } = useVeoApiKey();
    const [mode, setMode] = useState<GenerationMode>('text-to-video');
    const [prompt, setPrompt] = useState<string>('A high-speed chase between two futuristic spaceships through an asteroid field.');
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [imageUrl, setImageUrl] = useState<string | null>(null);
    const [aspectRatio, setAspectRatio] = useState<VideoAspectRatio>('16:9');
    const [videoUrl, setVideoUrl] = useState<string | null>(null);
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

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setImageFile(file);
            setImageUrl(URL.createObjectURL(file));
        }
    };
    
    const handleGenerate = async () => {
        if (!prompt && mode === 'text-to-video') {
            setError('Please enter a prompt.');
            return;
        }
        if (!imageFile && mode === 'image-to-video') {
            setError('Please upload an image.');
            return;
        }

        setIsLoading(true);
        setError(null);
        setVideoUrl(null);
        setLoadingMessage(loadingMessages[0]);

        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });

            let operation;
            if (mode === 'image-to-video' && imageFile) {
                const base64Data = await fileToBase64(imageFile);
                operation = await ai.models.generateVideos({
                    model: 'veo-3.1-fast-generate-preview',
                    prompt: prompt,
                    image: { imageBytes: base64Data, mimeType: imageFile.type },
                    config: { numberOfVideos: 1, resolution: '720p', aspectRatio: aspectRatio }
                });
            } else {
                 operation = await ai.models.generateVideos({
                    model: 'veo-3.1-fast-generate-preview',
                    prompt: prompt,
                    config: { numberOfVideos: 1, resolution: '720p', aspectRatio: aspectRatio }
                });
            }
            
            while (!operation.done) {
                await new Promise(resolve => setTimeout(resolve, 10000));
                operation = await ai.operations.getVideosOperation({ operation: operation });
            }

            const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;
            if (downloadLink) {
                 const response = await fetch(`${downloadLink}&key=${process.env.API_KEY}`);
                 const blob = await response.blob();
                 const newVideoUrl = URL.createObjectURL(blob);
                 setVideoUrl(newVideoUrl);

                 addHistoryItem({
                    id: Date.now().toString(),
                    feature: 'Video Generation',
                    timestamp: Date.now(),
                    inputs: { prompt, mode, image: imageUrl, aspectRatio },
                    outputs: { video: newVideoUrl }
                 });

            } else {
                throw new Error("Video generation completed, but no download link was provided.");
            }
        } catch (e: any) {
            handleApiError(e);
            setError(e.message || 'An error occurred while generating the video.');
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
                <p className="mb-4 max-w-md">Video generation requires a valid API key with billing enabled. Please select your key to proceed.</p>
                <p className="text-sm text-gray-400 mb-6">For more info, see the <a href="https://ai.google.dev/gemini-api/docs/billing" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">billing documentation</a>.</p>
                <Button onClick={selectKey}>Select API Key</Button>
            </div>
        );
    }


    return (
        <FeatureLayout
            title="Video Generation"
            description="Create dynamic videos from text or images with Veo. Perfect for short clips, ads, and creative content."
        >
            <div className="space-y-6">
                <div className="flex space-x-2 bg-gray-900/50 p-1 rounded-lg">
                    <button onClick={() => setMode('text-to-video')} className={`w-full py-2 rounded-md transition ${mode === 'text-to-video' ? 'bg-blue-600' : ''}`}>Text-to-Video</button>
                    <button onClick={() => setMode('image-to-video')} className={`w-full py-2 rounded-md transition ${mode === 'image-to-video' ? 'bg-blue-600' : ''}`}>Image-to-Video</button>
                </div>

                {mode === 'image-to-video' && (
                    <div>
                        <Label htmlFor="image-upload">Upload Starting Image</Label>
                        <Input id="image-upload" type="file" accept="image/*" onChange={handleFileChange} />
                         {imageUrl && <img src={imageUrl} alt="preview" className="mt-4 rounded-lg max-h-40"/>}
                    </div>
                )}
                
                <div>
                    <Label htmlFor="prompt">Video Prompt</Label>
                    <TextArea
                        id="prompt"
                        value={prompt}
                        onChange={(e) => setPrompt(e.target.value)}
                        placeholder="e.g., An astronaut riding a horse on the moon"
                    />
                </div>
                <div>
                    <Label htmlFor="aspectRatio">Aspect Ratio</Label>
                    <Select
                        id="aspectRatio"
                        value={aspectRatio}
                        onChange={(e) => setAspectRatio(e.target.value as VideoAspectRatio)}
                    >
                        <option value="16:9">16:9 (Landscape)</option>
                        <option value="9:16">9:16 (Portrait)</option>
                    </Select>
                </div>
                <div>
                    <Button onClick={handleGenerate} disabled={isLoading}>
                        {isLoading ? <><Spinner className="w-5 h-5 mr-2" /> Generating...</> : 'Generate Video'}
                    </Button>
                </div>
                {error && <div className="text-red-400 bg-red-900/50 p-3 rounded-md">{error}</div>}
                
                {isLoading && (
                     <div className="text-center p-4 bg-gray-900/50 rounded-lg">
                        <p className="text-lg">{loadingMessage}</p>
                    </div>
                )}

                {videoUrl && (
                    <div>
                         <h3 className="text-lg font-semibold mb-2">Generated Video</h3>
                        <video src={videoUrl} controls autoPlay loop className="rounded-lg shadow-lg w-full" />
                    </div>
                )}
            </div>
        </FeatureLayout>
    );
};

export default VideoGeneration;