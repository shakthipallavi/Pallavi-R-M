import React, { useState, useContext } from 'react';
import { GoogleGenAI } from "@google/genai";
import ReactMarkdown from 'react-markdown';
import Spinner from '../components/Spinner';
import FeatureLayout from './common/FeatureLayout';
import { Label, TextArea, Select, Button } from './common/Controls';
import { HistoryContext } from '../context/HistoryContext';
import { getFriendlyErrorMessage } from '../utils/errorHandler';

const languages = ['English', 'Hindi', 'Tamil', 'Telugu', 'Kannada'];
const sourceLanguages = ['Auto-detect', ...languages];

const Translation: React.FC = () => {
    const { addHistoryItem } = useContext(HistoryContext);
    const [inputText, setInputText] = useState<string>('Hello, how are you?');
    const [outputText, setOutputText] = useState<string>('');
    const [sourceLang, setSourceLang] = useState<string>('Auto-detect');
    const [targetLang, setTargetLang] = useState<string>('Hindi');
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);

    const handleTranslate = async () => {
        if (!inputText) {
            setError('Please enter some text to translate.');
            return;
        }
        if (sourceLang !== 'Auto-detect' && sourceLang === targetLang) {
            setError('Source and target languages cannot be the same.');
            return;
        }

        setIsLoading(true);
        setError(null);
        setOutputText('');

        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });
            const prompt = sourceLang === 'Auto-detect'
                ? `Translate the following text to ${targetLang}: "${inputText}"`
                : `Translate the following text from ${sourceLang} to ${targetLang}: "${inputText}"`;

            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: prompt,
            });
            const resultText = response.text;
            setOutputText(resultText);

            addHistoryItem({
                id: Date.now().toString(),
                feature: 'Translation',
                timestamp: Date.now(),
                inputs: {
                    text: inputText,
                    sourceLanguage: sourceLang,
                    targetLanguage: targetLang,
                },
                outputs: {
                    translatedText: resultText,
                }
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
            title="Language Translation"
            description="Translate text between multiple languages including Tamil, English, Kannada, Telugu, and Hindi."
        >
            <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <Label htmlFor="source-lang">From</Label>
                        <Select id="source-lang" value={sourceLang} onChange={(e) => setSourceLang(e.target.value)}>
                            {sourceLanguages.map(lang => (
                                <option key={lang} value={lang}>{lang}</option>
                            ))}
                        </Select>
                        <TextArea
                            value={inputText}
                            onChange={(e) => setInputText(e.target.value)}
                            className="mt-2"
                            rows={8}
                            placeholder="Enter text to translate..."
                        />
                    </div>
                    <div>
                        <Label htmlFor="target-lang">To</Label>
                        <Select id="target-lang" value={targetLang} onChange={(e) => setTargetLang(e.target.value)}>
                            {languages.map(lang => (
                                <option key={lang} value={lang}>{lang}</option>
                            ))}
                        </Select>
                        <TextArea
                            value={outputText}
                            readOnly
                            className="mt-2 bg-gray-900/50"
                            rows={8}
                            placeholder="Translation will appear here..."
                        />
                    </div>
                </div>
                <div>
                    <Button onClick={handleTranslate} disabled={isLoading}>
                        {isLoading ? <><Spinner className="w-5 h-5 mr-2" /> Translating...</> : 'Translate'}
                    </Button>
                </div>
                {error && (
                    <div className="text-red-400 bg-red-900/50 p-3 rounded-md prose prose-invert max-w-none prose-p:my-0">
                        <ReactMarkdown components={{ a: ({node, ...props}) => <a {...props} className="text-blue-400 hover:underline" target="_blank" rel="noopener noreferrer" /> }}>
                            {error}
                        </ReactMarkdown>
                    </div>
                )}
            </div>
        </FeatureLayout>
    );
};

export default Translation;