import React, { useContext } from 'react';
import ReactMarkdown from 'react-markdown';
import { HistoryContext } from '../context/HistoryContext';
import { HistoryItem } from '../types';
import FeatureLayout from './common/FeatureLayout';
import { Button } from './common/Controls';
import { IconDownload } from '../components/Icons';

const History: React.FC = () => {
    const { historyItems, clearHistory } = useContext(HistoryContext);

    const handleClearHistory = () => {
        if (window.confirm('Are you sure you want to clear your entire history? This action cannot be undone.')) {
            clearHistory();
        }
    };

    const handleDownload = (url: string, filename: string) => {
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleTextDownload = (content: string, filename: string) => {
        const blob = new Blob([content], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        handleDownload(url, filename);
        URL.revokeObjectURL(url);
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
            if (key === 'video' || key === 'originalVideo') {
                return (
                    <div key={key}>
                         <p className="font-semibold capitalize text-gray-400">{key.replace(/([A-Z])/g, ' $1')}:</p>
                         <video src={value} controls className="rounded-md mt-1 max-h-32" />
                    </div>
                )
            }
            if (key === 'audio') {
                return (
                    <div key={key}>
                         <p className="font-semibold capitalize text-gray-400">{key.replace(/([A-Z])/g, ' $1')}:</p>
                         <audio src={value} controls className="rounded-md mt-1 w-full" />
                    </div>
                )
            }
            if (key === 'linkUrl') {
                 return (
                    <div key={key}>
                        <p className="font-semibold capitalize text-gray-400">Link URL:</p>
                        <a href={value} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline break-all">{value}</a>
                    </div>
                );
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
        const outputKey = `${item.feature.toLowerCase().replace(/ /g, '-')}-${item.id}`;
        return (
            <div>
                {item.outputs.images && (
                    <div className="grid grid-cols-2 gap-2 mt-2">
                        {item.outputs.images.map((img: string, index: number) => (
                            <div key={index} className="relative group">
                                <img src={img} alt={`Generated ${index}`} className="rounded-md w-full" />
                                <button onClick={() => handleDownload(img, `${outputKey}-image-${index}.jpg`)} className="absolute top-1 right-1 bg-black bg-opacity-50 p-2 rounded-full text-white hover:bg-opacity-75 transition opacity-0 group-hover:opacity-100"><IconDownload /></button>
                            </div>
                        ))}
                    </div>
                )}
                {item.outputs.editedImage && (
                    <div className="relative group mt-2">
                        <img src={item.outputs.editedImage} alt="Edited" className="rounded-md w-full" />
                        <button onClick={() => handleDownload(item.outputs.editedImage, `${outputKey}-edited.jpg`)} className="absolute top-1 right-1 bg-black bg-opacity-50 p-2 rounded-full text-white hover:bg-opacity-75 transition opacity-0 group-hover:opacity-100"><IconDownload /></button>
                    </div>
                )}
                {item.outputs.video && (
                    <div className="mt-2">
                        <video src={item.outputs.video} controls loop className="rounded-md w-full" />
                        <Button onClick={() => handleDownload(item.outputs.video, `${outputKey}.mp4`)} className="mt-2 w-full text-sm py-1"><IconDownload /> Download Video</Button>
                    </div>
                )}
                {item.outputs.editedVideo && (
                    <div className="mt-2">
                        <video src={item.outputs.editedVideo} controls loop className="rounded-md w-full" />
                        <Button onClick={() => handleDownload(item.outputs.editedVideo, `${outputKey}-edited.mp4`)} className="mt-2 w-full text-sm py-1"><IconDownload /> Download Edited Video</Button>
                    </div>
                )}
                {item.outputs.audio && (
                    <div className="mt-2">
                        <audio src={item.outputs.audio} controls className="w-full" />
                        <Button onClick={() => handleDownload(item.outputs.audio, `${outputKey}.wav`)} className="mt-2 w-full text-sm py-1"><IconDownload /> Download Audio</Button>
                    </div>
                )}
                {item.outputs.translatedText && (
                    <div>
                        <div className="text-gray-300 bg-gray-900 p-2 rounded-md whitespace-pre-wrap mt-2">{item.outputs.translatedText}</div>
                        <Button onClick={() => handleTextDownload(item.outputs.translatedText, `${outputKey}-translation.txt`)} className="mt-2 w-full text-sm py-1"><IconDownload /> Download Text</Button>
                    </div>
                )}
                {(item.outputs.analysis || item.outputs.summary) && (
                    <div>
                        <div className="prose prose-invert max-w-none text-gray-300 bg-gray-900 p-2 rounded-md mt-2">
                            <ReactMarkdown>{item.outputs.analysis || item.outputs.summary}</ReactMarkdown>
                        </div>
                        <Button onClick={() => handleTextDownload(item.outputs.analysis || item.outputs.summary, `${outputKey}-${item.outputs.analysis ? 'analysis' : 'summary'}.txt`)} className="mt-2 w-full text-sm py-1"><IconDownload /> Download Text</Button>
                    </div>
                )}
                {item.outputs.transcript && (
                     <div>
                        <div className="space-y-2 mt-2 max-h-48 overflow-y-auto bg-gray-900 p-2 rounded-md">
                            {item.outputs.transcript.map((entry: any, index: number) => (
                                <div key={index} className={`flex ${entry.source === 'user' ? 'justify-end' : 'justify-start'}`}>
                                    <div className={`max-w-md px-3 py-1 rounded-lg prose prose-invert ${entry.source === 'user' ? 'bg-blue-700 text-white' : 'bg-gray-600 text-gray-200'}`}>
                                        <ReactMarkdown>{entry.text}</ReactMarkdown>
                                    </div>
                                </div>
                            ))}
                        </div>
                        <Button onClick={() => {
                            const formatted = item.outputs.transcript.map((e:any) => `${e.source === 'user' ? 'User' : 'Model'}: ${e.text}`).join('\n\n');
                            handleTextDownload(formatted, `${outputKey}-transcript.txt`);
                        }} className="mt-2 w-full text-sm py-1"><IconDownload /> Download Transcript</Button>
                    </div>
                )}
            </div>
        );
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