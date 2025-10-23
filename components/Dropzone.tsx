import React, { useState, useRef, DragEvent, ChangeEvent } from 'react';

interface DropzoneProps {
    onFileSelect: (file: File) => void;
    accept: string;
    children: React.ReactNode;
}

const Dropzone: React.FC<DropzoneProps> = ({ onFileSelect, accept, children }) => {
    const [isDraggingOver, setIsDraggingOver] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);

    const handleDragEnter = (e: DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDraggingOver(true);
    };

    const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        // Check if the leave event is heading outside the component
        if (e.relatedTarget && e.currentTarget.contains(e.relatedTarget as Node)) {
            return;
        }
        setIsDraggingOver(false);
    };

    const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation(); // Necessary to allow drop
    };

    const handleDrop = (e: DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDraggingOver(false);

        const files = e.dataTransfer.files;
        if (files && files.length > 0) {
            // Basic validation, more can be added
            const acceptedTypes = accept.split(',').map(t => t.trim());
            const file = files[0];
            const isAccepted = acceptedTypes.some(type => {
                if(type.endsWith('/*')) {
                    return file.type.startsWith(type.slice(0, -1));
                }
                return file.type === type;
            });
            
            if (isAccepted) {
                 onFileSelect(file);
            } else {
                alert(`Invalid file type. Please upload one of the following: ${accept}`);
            }
        }
    };

    const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (files && files.length > 0) {
            onFileSelect(files[0]);
        }
    };

    const handleClick = () => {
        inputRef.current?.click();
    };

    return (
        <div
            onDragEnter={handleDragEnter}
            onDragLeave={handleDragLeave}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            onClick={handleClick}
            className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors duration-200 ${
                isDraggingOver
                    ? 'border-blue-500 bg-gray-700/50'
                    : 'border-gray-600 hover:border-blue-500 hover:bg-gray-800/50'
            }`}
        >
            <input
                ref={inputRef}
                type="file"
                accept={accept}
                onChange={handleFileChange}
                className="hidden"
            />
            {children}
        </div>
    );
};

export default Dropzone;