export const getFriendlyErrorMessage = (error: any): string => {
    const defaultMessage = error.message || 'An unknown error occurred. Please check the console for details.';

    if (typeof defaultMessage === 'string') {
        if (defaultMessage.includes('exceeded your current quota') || defaultMessage.includes('RESOURCE_EXHAUSTED')) {
            return "You've exceeded your API usage quota. Please check your plan and billing details, or wait a while before trying again. For more information, visit the [Gemini API documentation on rate limits](https://ai.google.dev/gemini-api/docs/rate-limits).";
        }
        // Add other friendly error messages here if needed in the future
    }
    
    return defaultMessage;
};
