import React, { useState, useContext } from 'react';
import { GoogleGenAI, Modality } from "@google/genai";
import { AspectRatio } from '../types';
import Spinner from '../components/Spinner';
import FeatureLayout from './common/FeatureLayout';
import { Label, Input, TextArea, Select, Button } from './common/Controls';
import { HistoryContext } from '../context/HistoryContext';

const aspectRatios: AspectRatio[] = ["1:1", "16:9", "9:16", "4:3", "3:4"];

const styles = [
    "No Style", "Realistic", "Hyper-realistic", "Cinematic", "Epic", "Fantasy",
    "Anime", "Cartoon", "Surreal", "Cyberpunk", "Steampunk", "Concept Art",
    "Digital Art", "Oil Painting", "Watercolor", "Minimalist", "Retro",
    "Futuristic", "Dark Art", "Portrait", "Landscape", "Abstract", "Vaporwave"
];

const imageModels = [
    { name: 'ImageFX', value: 'imagen-4.0-generate-001', enabled: true, note: 'High Quality (Imagen 4)' },
    { name: 'Nano Banana', value: 'gemini-2.5-flash-image', enabled: true, note: 'Fast' },
    { name: 'DALL·E', value: 'dalle', enabled: false, note: 'This model is not available through the Gemini API.' },
    { name: 'MidJourney', value: 'midjourney', enabled: false, note: 'This model is not available through the Gemini API.' },
    { name: 'Stable Diffusion', value: 'stable-diffusion', enabled: false, note: 'This model is not available through the Gemini API.' },
    { name: 'Seedream', value: 'seedream', enabled: false, note: 'This model is not available through the Gemini API.' },
];

const ImageGeneration: React.FC = () => {
    const { addHistoryItem } = useContext(HistoryContext);
    const [prompt, setPrompt] = useState<string>('A majestic lion in the savanna at sunset.');
    const [model, setModel] = useState<string>('imagen-4.0-generate-001');
    const [style, setStyle] = useState<string>('Cinematic');
    const [aspectRatio, setAspectRatio] = useState<AspectRatio>('16:9');
    const [numImages, setNumImages] = useState<number>(1);
    const [generatedImages, setGeneratedImages] = useState<string[]>([]);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    
    const selectedModelObject = imageModels.find(m => m.value === model);
    const isCurrentModelEnabled = selectedModelObject?.enabled ?? false;
    
    const handleModelChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const newModelValue = e.target.value;
        setModel(newModelValue);
        
        if (newModelValue === 'gemini-2.5-flash-image') {
            setNumImages(1);
        }
    };

    const handleGenerate = async () => {
        if (!prompt) {
            setError('Please enter a prompt.');
            return;
        }
        setIsLoading(true);
        setError(null);
        setGeneratedImages([]);

        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });
            const finalPrompt = style === 'No Style' ? prompt : `${style} style, ${prompt}`;
            
            let images: string[] = [];
            if (model === 'imagen-4.0-generate-001') {
                const response = await ai.models.generateImages({
                    model: 'imagen-4.0-generate-001',
                    prompt: finalPrompt,
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
                const response = await ai.models.generateContent({
                    model: 'gemini-2.5-flash-image',
                    contents: {
                        parts: [{ text: finalPrompt }],
                    },
                    config: {
                        responseModalities: [Modality.IMAGE],
                    },
                });
                const part = response.candidates?.[0]?.content?.parts?.[0];
                if (part?.inlineData) {
                    const base64ImageBytes = part.inlineData.data;
                    const imageUrl = `data:${part.inlineData.mimeType};base64,${base64ImageBytes}`;
                    images = [imageUrl];
                    setGeneratedImages(images);
                } else {
                    throw new Error("No image was returned from the API.");
                }
            }
            
            addHistoryItem({
                id: Date.now().toString(),
                feature: 'Image Generation',
                timestamp: Date.now(),
                inputs: { prompt, model: selectedModelObject?.name || model, style, aspectRatio, numImages },
                outputs: { images }
            });

        } catch (e: any) {
            setError(e.message || 'An error occurred while generating images.');
            console.error(e);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <FeatureLayout
            title="Image Generation"
            description="Create stunning visuals from text descriptions. Describe what you want to see, select your options, and the AI will bring it to life."
        >
            <div className="space-y-6">
                <div className="p-4 bg-gray-900/50 rounded-lg space-y-4">
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <Label htmlFor="model">Model</Label>
                            <Select id="model" value={model} onChange={handleModelChange}>
                                {imageModels.map(m => (
                                    <option key={m.name} value={m.value}>
                                        {m.name}
                                    </option>
                                ))}
                            </Select>
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
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <Label htmlFor="aspectRatio">Aspect Ratio</Label>
                            <Select
                                id="aspectRatio"
                                value={aspectRatio}
                                onChange={(e) => setAspectRatio(e.target.value as AspectRatio)}
                                disabled={model === 'gemini-2.5-flash-image'}
                            >
                                {aspectRatios.map((ratio) => (
                                    <option key={ratio} value={ratio}>{ratio}</option>
                                ))}
                            </Select>
                            {model === 'gemini-2.5-flash-image' && <p className="text-xs text-gray-500 mt-1">Not configurable for Nano Banana.</p>}
                        </div>
                        <div>
                            <Label htmlFor="numImages">Number of Images (1-6)</Label>
                            <Input
                                id="numImages"
                                type="number"
                                min="1"
                                max="6"
                                value={numImages}
                                onChange={(e) => setNumImages(Math.max(1, Math.min(6, parseInt(e.target.value, 10))))}
                                disabled={model === 'gemini-2.5-flash-image'}
                            />
                             {model === 'gemini-2.5-flash-image' && <p className="text-xs text-gray-500 mt-1">Generates 1 image at a time.</p>}
                        </div>
                    </div>
                </div>
                
                <div>
                    <Button onClick={handleGenerate} disabled={isLoading || !isCurrentModelEnabled}>
                        {isLoading ? <><Spinner className="w-5 h-5 mr-2" /> Generating...</> : 'Generate'}
                    </Button>
                </div>

                {!isCurrentModelEnabled && selectedModelObject && (
                    <div className="text-yellow-400 bg-yellow-900/50 p-3 rounded-md">
                        <b>{selectedModelObject.name} is not available.</b>
                        <p className="text-sm">{selectedModelObject.note}</p>
                    </div>
                )}

                {error && <div className="text-red-400 bg-red-900/50 p-3 rounded-md">{error}</div>}
                
                {generatedImages.length > 0 && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {generatedImages.map((src, index) => (
                            <img
                                key={index}
                                src={src}
                                alt={`Generated image ${index + 1}`}
                                className="rounded-lg shadow-lg w-full h-auto object-cover"
                            />
                        ))}
                    </div>
                )}
            </div>
        </FeatureLayout>
    );
};

export default ImageGeneration;