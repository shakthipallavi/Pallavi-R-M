import React, { useState, useContext } from 'react';
import { GoogleGenAI } from "@google/genai";
import { fileToBase64 } from '../utils/fileUtils';
import Spinner from '../components/Spinner';
import FeatureLayout from './common/FeatureLayout';
import { Label, Input, TextArea, Button } from './common/Controls';
import ReactMarkdown from 'react-markdown';
import { HistoryContext } from '../context/HistoryContext';

const ImageUnderstanding: React.FC = () => {
    const { addHistoryItem } = useContext(HistoryContext);
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [imageUrl, setImageUrl] = useState<string | null>(null);
    const [prompt, setPrompt] = useState<string>('Describe this image in detail. What objects are present and what is happening?');
    const [analysis, setAnalysis] = useState<string>('');
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    
    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setImageFile(file);
            setImageUrl(URL.createObjectURL(file));
            setAnalysis('');
        }
    };

    const handleAnalyze = async () => {
        if (!imageFile || !prompt) {
            setError('Please upload an image and provide a prompt.');
            return;
        }
        setIsLoading(true);
        setError(null);
        setAnalysis('');

        try {
            const base64Data = await fileToBase64(imageFile);
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });
            
            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: {
                    parts: [
                        { inlineData: { data: base64Data, mimeType: imageFile.type } },
                        { text: prompt },
                    ],
                },
            });
            const resultText = response.text;
            setAnalysis(resultText);

            addHistoryItem({
                id: Date.now().toString(),
                feature: 'Image Understanding',
                timestamp: Date.now(),
                inputs: { prompt, image: imageUrl },
                outputs: { analysis: resultText }
            });

        } catch (e: any) {
            setError(e.message || 'An error occurred while analyzing the image.');
            console.error(e);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <FeatureLayout
            title="Image Understanding"
            description="Unlock insights from your images. Upload a photo and ask questions to get detailed analysis from Gemini."
        >
            <div className="space-y-6">
                <div>
                    <Label htmlFor="image-upload">Upload an Image to Analyze</Label>
                    <Input id="image-upload" type="file" accept="image/*" onChange={handleFileChange} />
                </div>
                {imageUrl && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <img src={imageUrl} alt="For analysis" className="rounded-lg shadow-lg w-full h-auto object-contain max-h-96" />
                        <div className="space-y-4">
                            <div>
                                <Label htmlFor="prompt">What do you want to know?</Label>
                                <TextArea
                                    id="prompt"
                                    value={prompt}
                                    onChange={(e) => setPrompt(e.target.value)}
                                    placeholder="e.g., What is the breed of this dog?"
                                />
                            </div>
                            <div>
                                <Button onClick={handleAnalyze} disabled={isLoading || !imageFile}>
                                    {isLoading ? <><Spinner className="w-5 h-5 mr-2" /> Analyzing...</> : 'Analyze Image'}
                                </Button>
                            </div>
                        </div>
                    </div>
                )}
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

export default ImageUnderstanding;