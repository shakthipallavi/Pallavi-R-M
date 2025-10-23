
export const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => {
            const result = reader.result as string;
            // Remove the data URL prefix (e.g., "data:image/png;base64,")
            const base64 = result.split(',')[1];
            resolve(base64);
        };
        reader.onerror = (error) => reject(error);
    });
};

export const extractVideoFrames = async (
    videoFile: File,
    fps: number
): Promise<{ base64: string; mimeType: string }[]> => {
    return new Promise((resolve, reject) => {
        const video = document.createElement('video');
        video.muted = true;
        video.src = URL.createObjectURL(videoFile);
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        const frames: { base64: string; mimeType: string }[] = [];

        video.onloadedmetadata = () => {
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            const duration = video.duration;
            const interval = 1 / fps;
            let currentTime = 0;

            const captureFrame = () => {
                if (currentTime > duration) {
                    URL.revokeObjectURL(video.src);
                    resolve(frames);
                    return;
                }

                video.currentTime = currentTime;
            };
            
            video.onseeked = () => {
                if(!context) {
                    reject(new Error("Canvas context not available"));
                    return;
                }
                context.drawImage(video, 0, 0, canvas.width, canvas.height);
                const dataUrl = canvas.toDataURL('image/jpeg');
                const base64 = dataUrl.split(',')[1];
                frames.push({ base64, mimeType: 'image/jpeg' });
                currentTime += interval;
                captureFrame();
            };

            captureFrame();
        };

        video.onerror = (e) => {
            reject(new Error("Failed to load video metadata."));
        };
    });
};
