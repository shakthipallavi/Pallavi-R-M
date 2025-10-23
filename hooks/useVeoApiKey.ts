import { useState, useEffect, useCallback } from 'react';

// Fix: Removed local AIStudio interface definition. It is now defined globally in types.ts to avoid declaration conflicts.

export function useVeoApiKey() {
    const [isKeySelected, setIsKeySelected] = useState(false);
    const [isCheckingKey, setIsCheckingKey] = useState(true);

    const checkKey = useCallback(async () => {
        setIsCheckingKey(true);
        if (window.aistudio) {
            try {
                const hasKey = await window.aistudio.hasSelectedApiKey();
                setIsKeySelected(hasKey);
            } catch (error) {
                console.error("Error checking for API key:", error);
                setIsKeySelected(false);
            }
        } else {
            // In environments where aistudio is not available, assume key is set via env
            setIsKeySelected(true); 
        }
        setIsCheckingKey(false);
    }, []);

    useEffect(() => {
        checkKey();
    }, [checkKey]);

    const selectKey = useCallback(async () => {
        if (window.aistudio) {
            try {
                await window.aistudio.openSelectKey();
                // Assume success after opening dialog to avoid race conditions
                setIsKeySelected(true);
            } catch (error) {
                console.error("Error opening key selection:", error);
                setIsKeySelected(false);
            }
        }
    }, []);

    const handleApiError = useCallback((error: any) => {
        if (error?.message?.includes('Requested entity was not found')) {
            setIsKeySelected(false);
        }
    }, []);

    return { isKeySelected, isCheckingKey, selectKey, handleApiError };
}
