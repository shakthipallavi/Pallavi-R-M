import React, { useState } from 'react';
import ImageGeneration from './features/ImageGeneration';
import ImageEditing from './features/ImageEditing';
import ImageUnderstanding from './features/ImageUnderstanding';
import VideoGeneration from './features/VideoGeneration';
import VideoUnderstanding from './features/VideoUnderstanding';
import VideoEditing from './features/VideoEditing';
import TextToSpeech from './features/TextToSpeech';
import AudioAnalysis from './features/AudioAnalysis';
import LiveConversation from './features/LiveConversation';
import Translation from './features/Translation';
import FastChat from './features/FastChat';
import History from './features/History';
import LinkSummarizer from './features/LinkSummarizer';
import { IconPhoto, IconMovie, IconVolume, IconMessage, IconEdit, IconBrain, IconHistory, IconTranslate, IconFastChat, IconAudioWave, IconVideoEdit, IconLink } from './components/Icons';
import { Feature } from './types';

const features: { name: Feature, icon: React.ReactElement }[] = [
    { name: 'Image Generation', icon: <IconPhoto /> },
    { name: 'Image Editing', icon: <IconEdit /> },
    { name: 'Image Understanding', icon: <IconBrain /> },
    { name: 'Video Generation', icon: <IconMovie /> },
    { name: 'Video Understanding', icon: <IconMovie /> },
    { name: 'Video Editing', icon: <IconVideoEdit /> },
    { name: 'Text to Speech', icon: <IconVolume /> },
    { name: 'Audio Analysis', icon: <IconAudioWave /> },
    { name: 'Translation', icon: <IconTranslate /> },
    { name: 'Link Summarizer', icon: <IconLink /> },
    { name: 'Fast Chat', icon: <IconFastChat /> },
    { name: 'Live Conversation', icon: <IconMessage /> },
    { name: 'History', icon: <IconHistory /> },
];

const App: React.FC = () => {
    const [activeFeature, setActiveFeature] = useState<Feature>('Image Generation');

    const renderFeature = () => {
        switch (activeFeature) {
            case 'Image Generation': return <ImageGeneration />;
            case 'Image Editing': return <ImageEditing />;
            case 'Image Understanding': return <ImageUnderstanding />;
            case 'Video Generation': return <VideoGeneration />;
            case 'Video Understanding': return <VideoUnderstanding />;
            case 'Video Editing': return <VideoEditing />;
            case 'Text to Speech': return <TextToSpeech />;
            case 'Audio Analysis': return <AudioAnalysis />;
            case 'Translation': return <Translation />;
            case 'Link Summarizer': return <LinkSummarizer />;
            case 'Fast Chat': return <FastChat />;
            case 'Live Conversation': return <LiveConversation />;
            case 'History': return <History />;
            default: return <ImageGeneration />;
        }
    };

    return (
        <div className="min-h-screen bg-gray-900 text-gray-200 flex flex-col">
            <header className="bg-gray-800/50 backdrop-blur-sm shadow-lg p-4 sticky top-0 z-10">
                <div className="container mx-auto flex justify-between items-center">
                    <h1 className="text-2xl font-bold tracking-wider text-white">
                        Gemini Multi-Modal Showcase
                    </h1>
                </div>
            </header>

            <div className="container mx-auto p-4 flex-grow flex flex-col md:flex-row gap-6">
                <nav className="w-full md:w-64 flex-shrink-0">
                    <ul className="space-y-2">
                        {features.map(({ name, icon }) => (
                            <li key={name}>
                                <button
                                    onClick={() => setActiveFeature(name)}
                                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-all duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                                        activeFeature === name
                                            ? 'bg-blue-600 text-white shadow-md'
                                            : 'bg-gray-700/50 hover:bg-gray-700 text-gray-300 hover:text-white'
                                    }`}
                                >
                                    {icon}
                                    <span className="font-medium">{name}</span>
                                </button>
                            </li>
                        ))}
                    </ul>
                </nav>

                <main className="flex-grow bg-gray-800/50 rounded-xl shadow-2xl p-6 overflow-auto">
                    {renderFeature()}
                </main>
            </div>
        </div>
    );
};

export default App;