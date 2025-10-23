import React, { useState, useContext, useEffect } from 'react';
import { GoogleGenAI } from "@google/genai";
import ReactMarkdown from 'react-markdown';
import { VideoAspectRatio } from '../types';
import Spinner from '../components/Spinner';
import FeatureLayout from './common/FeatureLayout';
import { Label, TextArea, Select, Button } from './common/Controls';
import { fileToBase64 } from '../utils/fileUtils';
import { HistoryContext } from '../context/HistoryContext';
import { useVeoApiKey } from '../hooks/useVeoApiKey';
import { getFriendlyErrorMessage } from '../utils/errorHandler';
import { IconDownload, IconUpload } from '../components/Icons';
import Dropzone from '../components/Dropzone';

type GenerationMode = 'text-to-video' | 'image-to-video';

const loadingMessages = [
    "Warming up the digital director's chair...",
    "Choreographing pixels into motion...",
    "Rendering your cinematic masterpiece...",
    "This can take a few minutes, please be patient...",
    "The final cut is almost ready...",
];

const videoModels = [
    { name: 'VEO 3.1', value: 'veo-3.1-fast-generate-preview', isGeminiNative: true },
    { name: 'Runway Gen-3 Alpha (trial/free mode)', value: 'runway-gen3-alpha', isGeminiNative: false },
    { name: 'Seedream Video', value: 'seedream-video', isGeminiNative: false },
    { name: 'Haliuo AI', value: 'haliuo-ai', isGeminiNative: false },
    { name: 'HeyEddie.ai', value: 'heyeddie-ai', isGeminiNative: false },
    { name: 'Wan2.5', value: 'wan2.5', isGeminiNative: false },
    { name: 'SEO 3', value: 'seo-3', isGeminiNative: false },
];

const styles = [
    "No Style", "Cinematic", "Realistic", "Anime", "Fantasy", "Cartoon",
    "Hyper-realistic", "Surreal", "Epic", "Documentary", "Music Video",
    "Drone View", "Vlog Style"
];

const resolutions = ["720p", "1080p", "2K", "4K"];
const frameRates = [24, 30, 60];
const aspectRatios: { label: string, value: string }[] = [
    { label: "16:9 (Landscape)", value: "16:9" },
    { label: "9:16 (Portrait)", value: "9:16" },
    { label: "1:1 (Square)", value: "1:1" },
    { label: "4:3 (Classic TV)", value: "4:3" },
];

const VideoGeneration: React.FC = () => {
    const { addHistoryItem } = useContext(HistoryContext);
    const { isKeySelected, isCheckingKey, selectKey, handleApiError } = useVeoApiKey();
    const [mode, setMode] = useState<GenerationMode>('text-to-video');
    const [prompt, setPrompt] = useState<string>('A high-speed chase between two futuristic spaceships through an asteroid field.');
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [imageUrl, setImageUrl] = useState<string | null>(null);
    const [videoUrl, setVideoUrl] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [loadingMessage, setLoadingMessage] = useState(loadingMessages[0]);
    const [error, setError] = useState<string | null>(null);

    const [model, setModel] = useState<string>('veo-3.1-fast-generate-preview');
    const [style, setStyle] = useState<string>('Cinematic');
    const [duration, setDuration] = useState<number>(10);
    const [resolution, setResolution] = useState<string>('1080p');
    const [aspectRatio, setAspectRatio] = useState<string>('16:9');
    const [frameRate, setFrameRate] = useState<number>(30);

    useEffect(() => {
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

    useEffect(() => {
        if (model === 'runway-gen3-alpha') {
            setResolution('1080p');
            setFrameRate(30);
        }
    }, [model]);

    const handleFileSelect = (file: File) => {
        if (file) {
            setImageFile(file);
            setImageUrl(URL.createObjectURL(file));
        }
    };

    const handleDownload = () => {
        if (!videoUrl) return;
        const link = document.createElement('a');
        link.href = videoUrl;
        link.download = 'gemini-video.mp4';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };
    
    const handleGenerate = async () => {
        const selectedModelObject = videoModels.find(m => m.value === model);
        if (!selectedModelObject || !selectedModelObject.isGeminiNative) {
            setError("Please select the VEO 3.1 model to generate a video.");
            return;
        }
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

            let finalPrompt = style === 'No Style' ? prompt : `${style} style, ${prompt}`;
            if (['2K', '4K'].includes(resolution)) {
                finalPrompt += `, ${resolution}, ultra-high definition, photorealistic`;
            }
            finalPrompt += `, ${frameRate}fps, a ${duration} second long video.`;
            
            const effectiveModel = 'veo-3.1-fast-generate-preview';
            const apiResolution = ['720p', '1080p'].includes(resolution) ? resolution : '1080p';
            const apiAspectRatio = ['16:9', '9:16'].includes(aspectRatio) ? aspectRatio : '16:9';

            let operation;
            if (mode === 'image-to-video' && imageFile) {
                const base64Data = await fileToBase64(imageFile);
                operation = await ai.models.generateVideos({
                    model: effectiveModel,
                    prompt: finalPrompt,
                    image: { imageBytes: base64Data, mimeType: imageFile.type },
                    config: { numberOfVideos: 1, resolution: apiResolution as '720p' | '1080p', aspectRatio: apiAspectRatio as VideoAspectRatio }
                });
            } else {
                 operation = await ai.models.generateVideos({
                    model: effectiveModel,
                    prompt: finalPrompt,
                    config: { numberOfVideos: 1, resolution: apiResolution as '720p' | '1080p', aspectRatio: apiAspectRatio as VideoAspectRatio }
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

                 const historyInputs: Record<string, any> = { prompt, mode, image: imageUrl, model: selectedModelObject?.name, style, duration, resolution, aspectRatio, frameRate };
                 
                 addHistoryItem({
                    id: Date.now().toString(),
                    feature: 'Video Generation',
                    timestamp: Date.now(),
                    inputs: historyInputs,
                    outputs: { video: newVideoUrl }
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
             <FeatureLayout title="Video Generation" description="Create dynamic videos from text or images. Describe the scene, choose your style and settings, and let the AI bring it to life.">
                <div className="flex flex-col justify-center items-center h-full text-center">
                    <h3 className="text-2xl font-bold mb-4">API Key Required for Veo</h3>
                    <p className="mb-4 max-w-md">Video generation requires a valid API key with billing enabled. Please select your key to proceed.</p>
                    <p className="text-sm text-gray-400 mb-6">For more info, see the <a href="https://ai.google.dev/gemini-api/docs/billing" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">billing documentation</a>.</p>
                    <Button onClick={selectKey}>Select API Key</Button>
                </div>
            </FeatureLayout>
        );
    }

    const selectedModelObject = videoModels.find(m => m.value === model);
    const isGenerationDisabled = isLoading || !selectedModelObject?.isGeminiNative;
    const isRunwayMode = model === 'runway-gen3-alpha';

    return (
        <FeatureLayout
            title="Video Generation"
            description="Create dynamic videos from text or images. Describe the scene, choose your style and settings, and let the AI bring it to life."
        >
            <div className="space-y-6">
                 <div className="p-4 bg-gray-900/50 rounded-lg space-y-4">
                    <div className="flex space-x-2 bg-gray-800 p-1 rounded-lg">
                        <button onClick={() => setMode('text-to-video')} className={`w-full py-2 rounded-md transition ${mode === 'text-to-video' ? 'bg-blue-600' : 'hover:bg-gray-700'}`}>Text-to-Video</button>
                        <button onClick={() => setMode('image-to-video')} className={`w-full py-2 rounded-md transition ${mode === 'image-to-video' ? 'bg-blue-600' : 'hover:bg-gray-700'}`}>Image-to-Video</button>
                    </div>

                    {mode === 'image-to-video' && (
                        <div>
                            <Label>Upload Starting Image</Label>
                            <Dropzone onFileSelect={handleFileSelect} accept="image/*">
                                <div className="flex flex-col items-center justify-center text-gray-400">
                                    <IconUpload />
                                    <p className="mt-2">Drag & drop an image here, or click to select a file</p>
                                    {imageFile && <p className="mt-2 text-sm text-green-400">Selected: {imageFile.name}</p>}
                                </div>
                            </Dropzone>
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
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <Label htmlFor="model">Model</Label>
                            <Select id="model" value={model} onChange={(e) => setModel(e.target.value)}>
                                {videoModels.map(m => <option key={m.value} value={m.value}>{m.name}</option>)}
                            </Select>
                            {selectedModelObject && !selectedModelObject.isGeminiNative && (
                                <p className="text-sm text-yellow-400 bg-yellow-900/50 p-2 rounded-md mt-2">
                                    This model is for demonstration purposes. Video generation is exclusively powered by Google's VEO model. Please select VEO 3.1 to enable generation.
                                </p>
                            )}
                        </div>
                        <div>
                            <Label htmlFor="style">Style</Label>
                            <Select id="style" value={style} onChange={(e) => setStyle(e.target.value)}>
                                {styles.map(s => <option key={s} value={s}>{s}</option>)}
                            </Select>
                        </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <div>
                            <Label htmlFor="resolution">Resolution</Label>
                            <Select id="resolution" value={resolution} onChange={(e) => setResolution(e.target.value)} disabled={isRunwayMode}>
                                {resolutions.map(r => <option key={r} value={r}>{r}</option>)}
                            </Select>
                            {!['720p', '1080p'].includes(resolution) && <p className="text-xs text-gray-500 mt-1">Simulated via prompt.</p>}
                        </div>
                         <div>
                            <Label htmlFor="aspectRatio">Aspect Ratio</Label>
                            <Select
                                id="aspectRatio"
                                value={aspectRatio}
                                onChange={(e) => setAspectRatio(e.target.value)}
                            >
                                {aspectRatios.map(ar => <option key={ar.value} value={ar.value}>{ar.label}</option>)}
                            </Select>
                            {!['16:9', '9:16'].includes(aspectRatio) && <p className="text-xs text-gray-500 mt-1">VEO will use 16:9.</p>}
                        </div>
                        <div>
                            <Label htmlFor="frameRate">Frame Rate (fps)</Label>
                            <Select id="frameRate" value={frameRate} onChange={(e) => setFrameRate(Number(e.target.value))} disabled={isRunwayMode}>
                                {frameRates.map(fr => <option key={fr} value={fr}>{fr}</option>)}
                            </Select>
                             <p className="text-xs text-gray-500 mt-1">Hinted via prompt.</p>
                        </div>
                        <div>
                            <Label htmlFor="duration">Duration ({duration}s)</Label>
                            <input
                                id="duration"
                                type="range"
                                min="5"
                                max="60"
                                step="1"
                                value={duration}
                                onChange={(e) => setDuration(Number(e.target.value))}
                                className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-600"
                            />
                        </div>
                    </div>
                </div>
                
                <div>
                    <Button onClick={handleGenerate} disabled={isGenerationDisabled}>
                        {isLoading ? <><Spinner className="w-5 h-5 mr-2" /> Generating...</> : 'Generate Video'}
                    </Button>
                </div>
                
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

                {videoUrl && (
                    <div>
                        <div className="flex justify-between items-center mb-2">
                             <h3 className="text-lg font-semibold">Generated Video</h3>
                             <button
                                onClick={handleDownload}
                                className="flex items-center gap-2 px-3 py-1 bg-gray-700 hover:bg-gray-600 rounded-md text-sm"
                            >
                                <IconDownload />
                                Download
                            </button>
                        </div>
                        <video src={videoUrl} controls autoPlay loop className="rounded-lg shadow-lg w-full" />
                    </div>
                )}
            </div>
        </FeatureLayout>
    );
};

export default VideoGeneration;