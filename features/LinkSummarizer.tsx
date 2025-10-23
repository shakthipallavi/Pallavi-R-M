import React, { useState, useContext } from 'react';
import { GoogleGenAI } from "@google/genai";
import ReactMarkdown from 'react-markdown';
import Spinner from '../components/Spinner';
import FeatureLayout from './common/FeatureLayout';
import { Label, Input, Button } from './common/Controls';
import { HistoryContext } from '../context/HistoryContext';
import { getFriendlyErrorMessage } from '../utils/errorHandler';
import { IconDownload } from '../components/Icons';

const LinkSummarizer: React.FC = () => {
    const { addHistoryItem } = useContext(HistoryContext);
    const [url, setUrl] = useState<string>('');
    const [summary, setSummary] = useState<string>('');
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);

    const handleDownload = () => {
        if (!summary) return;
        const blob = new Blob([summary], { type: 'text/plain' });
        const downloadUrl = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = downloadUrl;
        link.download = `gemini-summary.txt`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(downloadUrl);
    };

    const handleSummarize = async () => {
        if (!url.trim()) {
            setError('Please enter a URL to summarize.');
            return;
        }
        // Basic URL validation
        try {
            new URL(url);
        } catch (_) {
            setError('Please enter a valid URL.');
            return;
        }

        setIsLoading(true);
        setError(null);
        setSummary('');

        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });
            const prompt = `Please provide a concise summary of the content at the following URL: ${url}`;
            
            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: prompt,
            });
            
            const resultText = response.text;
            setSummary(resultText);

            addHistoryItem({
                id: Date.now().toString(),
                feature: 'Link Summarizer',
                timestamp: Date.now(),
                inputs: { linkUrl: url },
                outputs: { summary: resultText }
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
            title="Link Summarizer"
            description="Paste a link from YouTube or Instagram to get a quick summary of its content from Gemini."
        >
            <div className="space-y-6">
                <div className="space-y-2">
                    <Label htmlFor="url-input">YouTube or Instagram URL</Label>
                    <div className="flex gap-4">
                        <Input
                            id="url-input"
                            type="url"
                            value={url}
                            onChange={(e) => setUrl(e.target.value)}
                            placeholder="https://www.youtube.com/watch?v=..."
                            className="flex-grow"
                        />
                         <Button onClick={handleSummarize} disabled={isLoading}>
                            {isLoading ? <><Spinner className="w-5 h-5 mr-2" /> Summarizing...</> : 'Summarize'}
                        </Button>
                    </div>
                </div>

                {error && (
                    <div className="text-red-400 bg-red-900/50 p-3 rounded-md prose prose-invert max-w-none prose-p:my-0">
                        <ReactMarkdown components={{ a: ({node, ...props}) => <a {...props} className="text-blue-400 hover:underline" target="_blank" rel="noopener noreferrer" /> }}>
                            {error}
                        </ReactMarkdown>
                    </div>
                )}
                
                {summary && (
                    <div className="p-4 bg-gray-900/50 rounded-lg">
                        <div className="flex justify-between items-center mb-2">
                            <h3 className="text-lg font-semibold">Summary</h3>
                            <button
                                onClick={handleDownload}
                                className="flex items-center gap-2 px-3 py-1 bg-gray-700 hover:bg-gray-600 rounded-md text-sm"
                            >
                                <IconDownload />
                                Download
                            </button>
                        </div>
                        <div className="prose prose-invert max-w-none text-gray-300">
                             <ReactMarkdown>{summary}</ReactMarkdown>
                        </div>
                    </div>
                )}
            </div>
        </FeatureLayout>
    );
};

export default LinkSummarizer;