import React, { useState, useContext, useEffect } from 'react';
import { GoogleGenAI, Modality, Part } from "@google/genai";
import ReactMarkdown from 'react-markdown';
import { AspectRatio } from '../types';
import Spinner from '../components/Spinner';
import FeatureLayout from './common/FeatureLayout';
import { Label, TextArea, Select, Button } from './common/Controls';
import { HistoryContext } from '../context/HistoryContext';
import { fileToBase64 } from '../utils/fileUtils';
import { getFriendlyErrorMessage } from '../utils/errorHandler';
import { IconDownload, IconUpload } from '../components/Icons';
import Dropzone from '../components/Dropzone';

type GenerationMode = 'text-to-image' | 'image-to-image';

const aspectRatios: AspectRatio[] = ["1:1", "16:9", "9:16", "4:3", "3:4"];
const qualityOptions = ['720p', '1080p', '2K', '4K', '8K'];

const styles = [
    "No Style", "Realistic", "Hyper-realistic", "Cinematic", "Epic", "Fantasy",
    "Anime", "Cartoon", "Surreal", "Cyberpunk", "Steampunk", "Concept Art",
    "Digital Art", "Oil Painting", "Watercolor", "Minimalist", "Retro",
    "Futuristic", "Dark Art", "Portrait", "Landscape", "Nature Documentary", "Abstract", "Vaporwave"
];

const imageModels = [
    { name: 'ImageFX', value: 'imagen-4.0-generate-001', isGeminiNative: true, note: 'High Quality (Imagen 4)' },
    { name: 'Nano Banana', value: 'gemini-2.5-flash-image', isGeminiNative: true, note: 'Fast, Supports Image & Text' },
    { name: 'DALL·E', value: 'dalle', isGeminiNative: false, note: 'Not Available' },
    { name: 'MidJourney', value: 'midjourney', isGeminiNative: false, note: 'Not Available' },
    { name: 'Stable Diffusion', value: 'stable-diffusion', isGeminiNative: false, note: 'Not Available' },
    { name: 'Seedream', value: 'seedream', isGeminiNative: false, note: 'Not Available' },
];

const ImageGeneration: React.FC = () => {
    const { addHistoryItem } = useContext(HistoryContext);
    const [prompt, setPrompt] = useState<string>('A majestic lion in the savanna at sunset.');
    const [model, setModel] = useState<string>('imagen-4.0-generate-001');
    const [style, setStyle] = useState<string>('Cinematic');
    const [aspectRatio, setAspectRatio] = useState<AspectRatio>('16:9');
    const [quality, setQuality] = useState<string>('1080p');
    const [numImages, setNumImages] = useState<number>(1);
    const [generatedImages, setGeneratedImages] = useState<string[]>([]);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const [mode, setMode] = useState<GenerationMode>('text-to-image');
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [imageUrl, setImageUrl] = useState<string | null>(null);
    
    useEffect(() => {
        if (mode === 'image-to-image') {
            setModel('gemini-2.5-flash-image');
        } else {
             setImageFile(null);
             setImageUrl(null);
        }
    }, [mode]);

    const handleModelChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const newModelValue = e.target.value;
        setModel(newModelValue);
    };

    const handleFileSelect = (file: File) => {
        if (file) {
            setImageFile(file);
            setImageUrl(URL.createObjectURL(file));
        } else {
            setImageFile(null);
            setImageUrl(null);
        }
    };

    const handleDownload = (url: string, index: number) => {
        const link = document.createElement('a');
        link.href = url;
        link.download = `gemini-image-${index + 1}.jpg`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleGenerate = async () => {
        const selectedModelObject = imageModels.find(m => m.value === model);
        if (!selectedModelObject || !selectedModelObject.isGeminiNative) {
            setError("Please select a Gemini-native model like ImageFX or Nano Banana to generate an image.");
            return;
        }

        if (!prompt) {
            setError('Please enter a prompt.');
            return;
        }
        if (mode === 'image-to-image' && !imageFile) {
            setError('Please upload an image for Image & Text generation.');
            return;
        }
        setIsLoading(true);
        setError(null);
        setGeneratedImages([]);

        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });
            
            let basePrompt = style === 'No Style' ? prompt : `${style} style, ${prompt}`;
            if (mode === 'text-to-image') {
                basePrompt += `, ${quality}, ultra high resolution, cinematic quality, sharp focus`;
            }

            let images: string[] = [];

            if (model === 'imagen-4.0-generate-001') {
                const effectivePrompt = basePrompt + `, in a ${aspectRatio} aspect ratio`;
                const response = await ai.models.generateImages({
                    model: 'imagen-4.0-generate-001',
                    prompt: effectivePrompt,
                    config: {
                        numberOfImages: numImages,
                        outputMimeType: 'image/jpeg',
                        aspectRatio: aspectRatio,
                    },
                });

                images = response.generatedImages.map(
                    (img) => `data:image/jpeg;base64,${img.image.imageBytes}`
                );
                setGeneratedImages(images);

            } else { // gemini-2.5-flash-image
                const effectivePrompt = basePrompt + `, in a ${aspectRatio} aspect ratio`;
                const baseParts: Part[] = [{ text: effectivePrompt }];
                if (mode === 'image-to-image' && imageFile) {
                    const base64Data = await fileToBase64(imageFile);
                    baseParts.unshift({ inlineData: { data: base64Data, mimeType: imageFile.type } });
                }
                
                const generateSingleImage = async (): Promise<string> => {
                    const response = await ai.models.generateContent({
                        model: 'gemini-2.5-flash-image',
                        contents: { parts: baseParts },
                        config: {
                            responseModalities: [Modality.IMAGE],
                        },
                    });
                    const part = response.candidates?.[0]?.content?.parts?.[0];
                    if (part?.inlineData) {
                        const base64ImageBytes = part.inlineData.data;
                        return `data:${part.inlineData.mimeType};base64,${base64ImageBytes}`;
                    } else {
                        throw new Error("No image was returned from the API for one of the requests.");
                    }
                };
        
                const generatedImagesSoFar: string[] = [];
                for (let i = 0; i < numImages; i++) {
                    const newImage = await generateSingleImage();
                    generatedImagesSoFar.push(newImage);
                    setGeneratedImages([...generatedImagesSoFar]);
                }
                images = generatedImagesSoFar;
            }
            
            const historyInputs: Record<string, any> = { 
                prompt, 
                mode: mode === 'text-to-image' ? 'Text-to-Image' : 'Image & Text',
                model: selectedModelObject?.name || model, 
                style,
                aspectRatio,
                numImages,
                image: imageUrl 
            };
            if (mode === 'text-to-image') {
                 historyInputs.quality = quality;
            }

            addHistoryItem({
                id: Date.now().toString(),
                feature: 'Image Generation',
                timestamp: Date.now(),
                inputs: historyInputs,
                outputs: { images }
            });

        } catch (e: any) {
            setError(getFriendlyErrorMessage(e));
            console.error(e);
        } finally {
            setIsLoading(false);
        }
    };
    
    const selectedModelObject = imageModels.find(m => m.value === model);
    const isGenerationDisabled = isLoading || !selectedModelObject?.isGeminiNative;

    return (
        <FeatureLayout
            title="Image Generation"
            description="Create stunning visuals from text or image descriptions. Describe what you want to see and the AI will bring it to life."
        >
            <div className="space-y-6">
                <div className="p-4 bg-gray-900/50 rounded-lg space-y-4">
                    <div>
                        <Label>Generation Mode</Label>
                         <div className="flex space-x-2 bg-gray-800 p-1 rounded-lg">
                            <button onClick={() => setMode('text-to-image')} className={`w-full py-2 rounded-md transition ${mode === 'text-to-image' ? 'bg-blue-600' : 'hover:bg-gray-700'}`}>Text-to-Image</button>
                            <button onClick={() => setMode('image-to-image')} className={`w-full py-2 rounded-md transition ${mode === 'image-to-image' ? 'bg-blue-600' : 'hover:bg-gray-700'}`}>Image & Text</button>
                        </div>
                    </div>
                     {mode === 'image-to-image' && (
                        <div>
                            <Label>Upload Base Image</Label>
                            <Dropzone onFileSelect={handleFileSelect} accept="image/*">
                                <div className="flex flex-col items-center justify-center text-gray-400">
                                    <IconUpload />
                                    <p className="mt-2">Drag & drop an image here, or click to select a file</p>
                                    {imageFile && <p className="mt-2 text-sm text-green-400">Selected: {imageFile.name}</p>}
                                </div>
                            </Dropzone>
                            {imageUrl && <img src={imageUrl} alt="Base" className="mt-4 rounded-lg max-h-40"/>}
                        </div>
                     )}
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <Label htmlFor="model">Model</Label>
                            <Select id="model" value={model} onChange={handleModelChange} disabled={mode === 'image-to-image'}>
                                {imageModels.map(m => (
                                    <option key={m.name} value={m.value} disabled={!m.isGeminiNative}>
                                        {m.name} ({m.note})
                                    </option>
                                ))}
                            </Select>
                             {mode === 'image-to-image' && <p className="text-xs text-gray-500 mt-1">Image & Text mode is only available with the Nano Banana model.</p>}
                             {selectedModelObject && !selectedModelObject.isGeminiNative && (
                                <p className="text-sm text-yellow-400 bg-yellow-900/50 p-2 rounded-md mt-2">
                                    This model is for demonstration purposes. Please select a Gemini-native model like ImageFX or Nano Banana to enable generation.
                                </p>
                            )}
                        </div>
                        <div>
                            <Label htmlFor="style">Style</Label>
                            <Select id="style" value={style} onChange={(e) => setStyle(e.target.value)}>
                                {styles.map((s) => (
                                    <option key={s} value={s}>{s}</option>
                                ))}
                            </Select>
                        </div>
                    </div>
                    <div>
                        <Label htmlFor="prompt">Your Prompt</Label>
                        <TextArea
                            id="prompt"
                            value={prompt}
                            onChange={(e) => setPrompt(e.target.value)}
                            placeholder="e.g., A futuristic cityscape at night with flying cars"
                        />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                            <Label htmlFor="aspectRatio">Aspect Ratio</Label>
                            <Select
                                id="aspectRatio"
                                value={aspectRatio}
                                onChange={(e) => setAspectRatio(e.target.value as AspectRatio)}
                            >
                                {aspectRatios.map((ratio) => (
                                    <option key={ratio} value={ratio}>{ratio}</option>
                                ))}
                            </Select>
                        </div>
                        <div>
                            <Label htmlFor="numImages">Number of Images (1-4)</Label>
                            <input
                                id="numImages"
                                type="number"
                                min="1"
                                max="4"
                                value={numImages}
                                onChange={(e) => setNumImages(Math.max(1, Math.min(4, parseInt(e.target.value, 10))))}
                                className="w-full bg-gray-900/50 border border-gray-600 rounded-md shadow-sm px-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
                            />
                        </div>
                        <div>
                             <Label htmlFor="quality">Quality</Label>
                             <Select
                                id="quality"
                                value={quality}
                                onChange={(e) => setQuality(e.target.value)}
                                disabled={mode === 'image-to-image'}
                            >
                                {qualityOptions.map((q) => (
                                    <option key={q} value={q}>{q}</option>
                                ))}
                            </Select>
                            {mode === 'image-to-image' && <p className="text-xs text-gray-500 mt-1">Not applicable.</p>}
                        </div>
                    </div>
                </div>
                
                <div>
                    <Button onClick={handleGenerate} disabled={isGenerationDisabled}>
                        {isLoading ? <><Spinner className="w-5 h-5 mr-2" /> Generating...</> : 'Generate'}
                    </Button>
                </div>

                {error && (
                    <div className="text-red-400 bg-red-900/50 p-3 rounded-md prose prose-invert max-w-none prose-p:my-0">
                        <ReactMarkdown components={{ a: ({node, ...props}) => <a {...props} className="text-blue-400 hover:underline" target="_blank" rel="noopener noreferrer" /> }}>
                            {error}
                        </ReactMarkdown>
                    </div>
                )}
                
                {generatedImages.length > 0 && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {generatedImages.map((src, index) => (
                             <div key={index} className="relative group">
                                <img
                                    src={src}
                                    alt={`Generated image ${index + 1}`}
                                    className="rounded-lg shadow-lg w-full h-auto object-cover"
                                />
                                <button
                                    onClick={() => handleDownload(src, index)}
                                    className="absolute top-2 right-2 bg-black bg-opacity-50 p-2 rounded-full text-white hover:bg-opacity-75 transition opacity-0 group-hover:opacity-100"
                                    aria-label="Download image"
                                >
                                    <IconDownload />
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </FeatureLayout>
    );
};

export default ImageGeneration;