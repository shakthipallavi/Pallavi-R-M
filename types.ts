import { Feature } from './App';

export type AspectRatio = "1:1" | "16:9" | "9:16" | "4:3" | "3:4";
export type VideoAspectRatio = "16:9" | "9:16";

// Fix: Moved AIStudio interface into declare global to resolve type conflicts.
declare global {
    interface AIStudio {
        hasSelectedApiKey: () => Promise<boolean>;
        openSelectKey: () => Promise<void>;
    }

    interface Window {
        aistudio?: AIStudio;
    }
}

// History Types
export interface HistoryItem {
    id: string;
    feature: Feature;
    timestamp: number;
    inputs: Record<string, any>;
    outputs: Record<string, any>;
}
