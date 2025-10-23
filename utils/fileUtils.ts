
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

export const extractLastVideoFrame = async (
    videoFile: File
): Promise<{ base64: string; mimeType: string; width: number; height: number }> => {
    return new Promise((resolve, reject) => {
        const video = document.createElement('video');
        video.muted = true;
        video.preload = 'metadata';
        video.src = URL.createObjectURL(videoFile);
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');

        video.onloadedmetadata = () => {
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            const duration = video.duration;
            // Seek to a point very close to the end of the video
            video.currentTime = Math.max(0, duration - 0.1); 
        };
        
        video.onseeked = () => {
            if (!context) {
                URL.revokeObjectURL(video.src);
                reject(new Error("Canvas context not available"));
                return;
            }
            context.drawImage(video, 0, 0, canvas.width, canvas.height);
            const dataUrl = canvas.toDataURL('image/jpeg');
            const base64 = dataUrl.split(',')[1];
            
            URL.revokeObjectURL(video.src);
            
            resolve({ 
                base64, 
                mimeType: 'image/jpeg', 
                width: canvas.width, 
                height: canvas.height 
            });
        };

        video.onerror = (e) => {
            URL.revokeObjectURL(video.src);
            reject(new Error("Failed to load video. It may be in an unsupported format."));
        };
    });
};