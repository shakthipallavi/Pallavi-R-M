import React, { useState, useRef, useEffect, useContext } from 'react';
import { GoogleGenAI, Chat } from "@google/genai";
import Spinner from '../components/Spinner';
import FeatureLayout from './common/FeatureLayout';
import { TextArea, Button } from './common/Controls';
import { HistoryContext } from '../context/HistoryContext';
import ReactMarkdown from 'react-markdown';
import { getFriendlyErrorMessage } from '../utils/errorHandler';

interface ChatMessage {
    source: 'user' | 'model';
    text: string;
}

const FastChat: React.FC = () => {
    const { addHistoryItem } = useContext(HistoryContext);
    const [chat, setChat] = useState<Chat | null>(null);
    const [conversation, setConversation] = useState<ChatMessage[]>([]);
    const [currentInput, setCurrentInput] = useState<string>('');
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const chatContainerRef = useRef<HTMLDivElement>(null);
    const conversationRef = useRef<ChatMessage[]>([]);

    useEffect(() => {
        conversationRef.current = conversation;
    }, [conversation]);

    // Initialize chat
    useEffect(() => {
        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });
            const chatSession = ai.chats.create({
                model: 'gemini-2.5-flash-lite',
            });
            setChat(chatSession);
        } catch (e: any) {
            setError("Failed to initialize the chat model. Please check your API key.");
            console.error(e);
        }

        // Save to history on unmount if conversation exists
        return () => {
            if (conversationRef.current.length > 0) {
                addHistoryItem({
                    id: Date.now().toString(),
                    feature: 'Fast Chat',
                    timestamp: Date.now(),
                    inputs: { model: 'gemini-2.5-flash-lite' },
                    outputs: { transcript: conversationRef.current },
                });
            }
        };
    }, [addHistoryItem]);
    
    // Auto-scroll chat
    useEffect(() => {
        if (chatContainerRef.current) {
            chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
        }
    }, [conversation]);

    const handleSendMessage = async () => {
        if (!currentInput.trim() || !chat || isLoading) return;

        const userMessage: ChatMessage = { source: 'user', text: currentInput.trim() };
        setConversation(prev => [...prev, userMessage]);
        setCurrentInput('');
        setIsLoading(true);
        setError(null);
        
        try {
            const stream = await chat.sendMessageStream({ message: userMessage.text });
            
            let modelResponse = '';
            setConversation(prev => [...prev, { source: 'model', text: '' }]);

            for await (const chunk of stream) {
                modelResponse += chunk.text;
                setConversation(prev => {
                    const newConv = [...prev];
                    newConv[newConv.length - 1] = { source: 'model', text: modelResponse };
                    return newConv;
                });
            }

        } catch (e: any) {
            setError(getFriendlyErrorMessage(e));
            console.error(e);
            setConversation(prev => {
                const lastMessage = prev[prev.length - 1];
                // Remove the empty/incomplete model message on error
                if (lastMessage && lastMessage.source === 'model' && lastMessage.text === '') {
                    return prev.slice(0, -1);
                }
                return prev;
            });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <FeatureLayout
            title="Fast Chat"
            description="Experience low-latency, streaming responses for quick Q&A and conversations using the gemini-2.5-flash-lite model."
        >
            <div className="flex flex-col h-full">
                <div ref={chatContainerRef} className="flex-grow bg-gray-900/50 rounded-lg p-4 overflow-y-auto space-y-4 mb-4">
                    {conversation.length === 0 && (
                        <div className="text-center text-gray-500 pt-10">Ask me anything...</div>
                    )}
                    {conversation.map((entry, index) => (
                        <div key={index} className={`flex ${entry.source === 'user' ? 'justify-end' : 'justify-start'}`}>
                            <div className={`max-w-xl px-4 py-2 rounded-xl prose prose-invert ${entry.source === 'user' ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-200'}`}>
                                <ReactMarkdown>{entry.text}</ReactMarkdown>
                            </div>
                        </div>
                    ))}
                     {isLoading && conversation[conversation.length - 1]?.source === 'user' && (
                        <div className="flex justify-start">
                             <div className="max-w-xl px-4 py-2 rounded-xl bg-gray-700 text-gray-200">
                                <Spinner className="w-5 h-5" />
                            </div>
                        </div>
                    )}
                </div>
                {error && (
                    <div className="text-red-400 bg-red-900/50 p-3 rounded-md mb-4 prose prose-invert max-w-none prose-p:my-0">
                        <ReactMarkdown components={{ a: ({node, ...props}) => <a {...props} className="text-blue-400 hover:underline" target="_blank" rel="noopener noreferrer" /> }}>
                            {error}
                        </ReactMarkdown>
                    </div>
                )}
                <div className="flex-shrink-0 flex gap-4">
                    <TextArea
                        value={currentInput}
                        onChange={(e) => setCurrentInput(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendMessage(); } }}
                        placeholder="Type your message..."
                        rows={2}
                        className="flex-grow"
                        disabled={isLoading}
                    />
                    <Button onClick={handleSendMessage} disabled={isLoading || !currentInput.trim()}>
                        {isLoading ? <Spinner className="w-5 h-5" /> : 'Send'}
                    </Button>
                </div>
            </div>
        </FeatureLayout>
    );
};

export default FastChat;