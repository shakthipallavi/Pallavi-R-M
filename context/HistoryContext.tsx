import React, { createContext, useState, useEffect, ReactNode } from 'react';
import { HistoryItem } from '../types';

interface HistoryContextType {
    historyItems: HistoryItem[];
    addHistoryItem: (item: HistoryItem) => void;
    clearHistory: () => void;
}

export const HistoryContext = createContext<HistoryContextType>({
    historyItems: [],
    addHistoryItem: () => {},
    clearHistory: () => {},
});

export const HistoryProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [historyItems, setHistoryItems] = useState<HistoryItem[]>([]);

    useEffect(() => {
        try {
            const storedItems = localStorage.getItem('gemini-showcase-history');
            if (storedItems) {
                setHistoryItems(JSON.parse(storedItems));
            }
        } catch (error) {
            console.error("Failed to load history from localStorage", error);
        }
    }, []);

    useEffect(() => {
        try {
            localStorage.setItem('gemini-showcase-history', JSON.stringify(historyItems));
        } catch (error) {
            console.error("Failed to save history to localStorage", error);
        }
    }, [historyItems]);

    const addHistoryItem = (item: HistoryItem) => {
        setHistoryItems(prevItems => [item, ...prevItems]);
    };

    const clearHistory = () => {
        setHistoryItems([]);
    };

    return (
        <HistoryContext.Provider value={{ historyItems, addHistoryItem, clearHistory }}>
            {children}
        </HistoryContext.Provider>
    );
};
