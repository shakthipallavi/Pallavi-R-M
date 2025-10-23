
import React from 'react';

interface FeatureLayoutProps {
    title: string;
    description: string;
    children: React.ReactNode;
}

const FeatureLayout: React.FC<FeatureLayoutProps> = ({ title, description, children }) => {
    return (
        <div className="flex flex-col h-full">
            <div className="mb-6">
                <h2 className="text-3xl font-bold text-white mb-2">{title}</h2>
                <p className="text-gray-400">{description}</p>
            </div>
            <div className="flex-grow overflow-y-auto pr-2">
                {children}
            </div>
        </div>
    );
};

export default FeatureLayout;
