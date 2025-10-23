import React, { useContext } from 'react';
import ReactMarkdown from 'react-markdown';
import { HistoryContext } from '../context/HistoryContext';
import { HistoryItem } from '../types';
import FeatureLayout from './common/FeatureLayout';
import { Button } from './common/Controls';

const History: React.FC = () => {
    const { historyItems, clearHistory } = useContext(HistoryContext);

    const handleClearHistory = () => {
        if (window.confirm('Are you sure you want to clear your entire history? This action cannot be undone.')) {
            clearHistory();
        }
    };

    const renderInputs = (item: HistoryItem) => {
        return Object.entries(item.inputs).map(([key, value]) => {
            if (!value) return null;
            if (key === 'image' || key === 'originalImage') {
                return (
                    <div key={key}>
                        <p className="font-semibold capitalize text-gray-400">{key.replace(/([A-Z])/g, ' $1')}:</p>
                        <img src={value} alt={key} className="rounded-md mt-1 max-h-32" />
                    </div>
                );
            }
            if (key === 'video') {
                return (
                    <div key={key}>
                         <p className="font-semibold capitalize text-gray-400">{key.replace(/([A-Z])/g, ' $1')}:</p>
                         <video src={value} controls className="rounded-md mt-1 max-h-32" />
                    </div>
                )
            }
            return (
                <div key={key}>
                    <p className="font-semibold capitalize text-gray-400">{key.replace(/([A-Z])/g, ' $1')}:</p>
                    <p className="text-gray-300 bg-gray-900 p-2 rounded-md whitespace-pre-wrap">{String(value)}</p>
                </div>
            );
        });
    };

    const renderOutputs = (item: HistoryItem) => {
        if (item.outputs.images) {
            return (
                 <div className="grid grid-cols-2 gap-2 mt-2">
                    {item.outputs.images.map((img: string, index: number) => (
                        <img key={index} src={img} alt={`Generated ${index}`} className="rounded-md w-full" />
                    ))}
                </div>
            );
        }
        if (item.outputs.editedImage) {
            return <img src={item.outputs.editedImage} alt="Edited" className="rounded-md mt-2 w-full" />;
        }
        if (item.outputs.video) {
            return <video src={item.outputs.video} controls loop className="rounded-md mt-2 w-full" />;
        }
        if (item.outputs.audio) {
            return <audio src={item.outputs.audio} controls className="mt-2 w-full" />;
        }
        if (item.outputs.translatedText) {
            return (
                <div className="text-gray-300 bg-gray-900 p-2 rounded-md whitespace-pre-wrap">
                    {item.outputs.translatedText}
                </div>
            );
        }
        if (item.outputs.analysis) {
            return (
                <div className="prose prose-invert max-w-none text-gray-300 bg-gray-900 p-2 rounded-md">
                    <ReactMarkdown>{item.outputs.analysis}</ReactMarkdown>
                </div>
            );
        }
        if (item.outputs.transcript) {
            return (
                <div className="space-y-2">
                    {item.outputs.transcript.map((entry: any, index: number) => (
                         <div key={index} className={`flex ${entry.source === 'user' ? 'justify-end' : 'justify-start'}`}>
                            <div className={`max-w-md px-3 py-1 rounded-lg ${entry.source === 'user' ? 'bg-blue-700 text-white' : 'bg-gray-600 text-gray-200'}`}>
                                {entry.text}
                            </div>
                        </div>
                    ))}
                </div>
            )
        }
        return null;
    };


    return (
        <FeatureLayout
            title="Generation History"
            description="Review your past creations and analyses. All items are saved locally in your browser."
        >
            <div className="flex justify-end mb-4">
                <Button onClick={handleClearHistory} disabled={historyItems.length === 0} className="bg-red-600 hover:bg-red-700">
                    Clear History
                </Button>
            </div>
            {historyItems.length === 0 ? (
                <div className="text-center text-gray-500 py-16">
                    <p className="text-lg">Your history is empty.</p>
                    <p>Start creating with Gemini and your work will appear here.</p>
                </div>
            ) : (
                <div className="space-y-6">
                    {historyItems.map((item) => (
                        <div key={item.id} className="bg-gray-900/50 p-4 rounded-lg shadow-md">
                            <div className="flex justify-between items-center mb-3">
                                <h3 className="text-xl font-bold text-white">{item.feature}</h3>
                                <p className="text-xs text-gray-400">{new Date(item.timestamp).toLocaleString()}</p>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <h4 className="text-lg font-semibold text-gray-200 border-b border-gray-600 pb-1 mb-2">Inputs</h4>
                                    <div className="space-y-2 text-sm">{renderInputs(item)}</div>
                                </div>
                                 <div>
                                    <h4 className="text-lg font-semibold text-gray-200 border-b border-gray-600 pb-1 mb-2">Outputs</h4>
                                    <div>{renderOutputs(item)}</div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </FeatureLayout>
    );
};

export default History;