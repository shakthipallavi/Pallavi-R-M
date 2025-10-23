import React, { useState, useContext } from 'react';
import { GoogleGenAI, Modality } from "@google/genai";
import ReactMarkdown from 'react-markdown';
import { fileToBase64 } from '../utils/fileUtils';
import Spinner from '../components/Spinner';
import FeatureLayout from './common/FeatureLayout';
import { Label, TextArea, Button } from './common/Controls';
import { HistoryContext } from '../context/HistoryContext';
import { getFriendlyErrorMessage } from '../utils/errorHandler';
import { IconDownload, IconUpload } from '../components/Icons';
import Dropzone from '../components/Dropzone';

const ImageEditing: React.FC = () => {
    const { addHistoryItem } = useContext(HistoryContext);
    const [originalImageFile, setOriginalImageFile] = useState<File | null>(null);
    const [originalImageUrl, setOriginalImageUrl] = useState<string | null>(null);
    const [prompt, setPrompt] = useState<string>('Add a retro, vintage filter to the image.');
    const [editedImageUrl, setEditedImageUrl] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);

    const handleFileSelect = (file: File) => {
        if (file) {
            setOriginalImageFile(file);
            setOriginalImageUrl(URL.createObjectURL(file));
            setEditedImageUrl(null);
        }
    };
    
    const handleDownload = () => {
        if (!editedImageUrl) return;
        const link = document.createElement('a');
        link.href = editedImageUrl;
        link.download = 'edited-image.png';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleEdit = async () => {
        if (!originalImageFile || !prompt) {
            setError('Please upload an image and provide an editing prompt.');
            return;
        }
        setIsLoading(true);
        setError(null);
        setEditedImageUrl(null);

        try {
            const base64Data = await fileToBase64(originalImageFile);
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });
            
            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash-image',
                contents: {
                    parts: [
                        { inlineData: { data: base64Data, mimeType: originalImageFile.type } },
                        { text: prompt },
                    ],
                },
                config: {
                    responseModalities: [Modality.IMAGE],
                },
            });
            
            const part = response.candidates?.[0]?.content?.parts?.[0];
            if (part?.inlineData) {
                const base64ImageBytes = part.inlineData.data;
                const imageUrl = `data:${part.inlineData.mimeType};base64,${base64ImageBytes}`;
                setEditedImageUrl(imageUrl);
                
                addHistoryItem({
                    id: Date.now().toString(),
                    feature: 'Image Editing',
                    timestamp: Date.now(),
                    inputs: { 
                        prompt,
                        originalImage: originalImageUrl 
                    },
                    outputs: { 
                        editedImage: imageUrl 
                    }
                });

            } else {
                throw new Error("No edited image was returned from the API.");
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
            title="Image Editing"
            description="Transform your photos with simple text commands. Upload an image, describe the changes, and let Gemini do the magic."
        >
            <div className="space-y-6">
                <div>
                    <Label>Upload Your Image</Label>
                    <Dropzone onFileSelect={handleFileSelect} accept="image/*">
                         <div className="flex flex-col items-center justify-center text-gray-400">
                            <IconUpload />
                            <p className="mt-2">Drag & drop an image here, or click to select a file</p>
                            {originalImageFile && <p className="mt-2 text-sm text-green-400">Selected: {originalImageFile.name}</p>}
                        </div>
                    </Dropzone>
                </div>
                {originalImageUrl && (
                    <div>
                        <Label htmlFor="prompt">Editing Prompt</Label>
                        <TextArea
                            id="prompt"
                            value={prompt}
                            onChange={(e) => setPrompt(e.target.value)}
                            placeholder="e.g., Remove the person in the background"
                        />
                    </div>
                )}
                <div>
                    <Button onClick={handleEdit} disabled={isLoading || !originalImageFile}>
                        {isLoading ? <><Spinner className="w-5 h-5 mr-2" /> Editing...</> : 'Edit Image'}
                    </Button>
                </div>
                {error && (
                    <div className="text-red-400 bg-red-900/50 p-3 rounded-md prose prose-invert max-w-none prose-p:my-0">
                        <ReactMarkdown components={{ a: ({node, ...props}) => <a {...props} className="text-blue-400 hover:underline" target="_blank" rel="noopener noreferrer" /> }}>
                            {error}
                        </ReactMarkdown>
                    </div>
                )}
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {originalImageUrl && (
                        <div>
                            <h3 className="text-lg font-semibold mb-2">Original</h3>
                            <img src={originalImageUrl} alt="Original" className="rounded-lg shadow-lg w-full" />
                        </div>
                    )}
                    {editedImageUrl && (
                        <div>
                            <div className="flex justify-between items-center mb-2">
                                <h3 className="text-lg font-semibold">Edited</h3>
                                <button
                                    onClick={handleDownload}
                                    className="flex items-center gap-2 px-3 py-1 bg-gray-700 hover:bg-gray-600 rounded-md text-sm"
                                >
                                    <IconDownload />
                                    Download
                                </button>
                            </div>
                            <img src={editedImageUrl} alt="Edited" className="rounded-lg shadow-lg w-full" />
                        </div>
                    )}
                </div>
            </div>
        </FeatureLayout>
    );
};

export default ImageEditing;