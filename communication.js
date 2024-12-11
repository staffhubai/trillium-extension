// communication.js
document.addEventListener('DOMContentLoaded', function() {
    const replitFrame = document.getElementById('replitFrame');
    const screenshot = document.getElementById('screenshot');
    const errorMsg = document.getElementById('errorMsg');
    let lastScreenshotData = null;
    let microphoneStream = null;
    
    // Define allowed origins
    const ALLOWED_ORIGINS = [
        'https://trillium-tutor2.replit.app',
        'https://trillium-tutor.replit.app',
        'https://*.replit.dev',
        'https://*.replit.com'
    ];

    function isAllowedOrigin(origin) {
        return ALLOWED_ORIGINS.some(allowed => {
            if (allowed.includes('*')) {
                const pattern = allowed.replace(/\./g, '\\.').replace(/\*/g, '.*');
                return new RegExp(`^${pattern}$`).test(origin);
            }
            return allowed === origin;
        });
    }

    async function requestMicrophoneAccess() {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            microphoneStream = stream;
            
            if (replitFrame && replitFrame.contentWindow) {
                try {
                    const frameOrigin = new URL(replitFrame.src).origin;
                    if (isAllowedOrigin(frameOrigin)) {
                        replitFrame.contentWindow.postMessage({
                            type: "MICROPHONE_PERMISSION_GRANTED",
                            data: true
                        }, frameOrigin);
                        console.log('Microphone permission granted message sent');
                    }
                } catch (e) {
                    console.error('Error sending microphone permission message:', e);
                }
            }
            
            return true;
        } catch (error) {
            console.error('Microphone permission error:', error);
            
            if (replitFrame && replitFrame.contentWindow) {
                try {
                    const frameOrigin = new URL(replitFrame.src).origin;
                    if (isAllowedOrigin(frameOrigin)) {
                        replitFrame.contentWindow.postMessage({
                            type: "MICROPHONE_PERMISSION_DENIED",
                            error: error.message
                        }, frameOrigin);
                    }
                } catch (e) {
                    console.error('Error sending microphone denial message:', e);
                }
            }
            
            return false;
        }
    }

    // Listen for messages from the Replit app
    window.addEventListener('message', async function(event) {
        console.log('Received message from origin:', event.origin);
        
        // Security check - verify origin
        if (!isAllowedOrigin(event.origin)) {
            console.warn('Rejected message from unauthorized origin:', event.origin);
            return;
        }

        // Verify we have a valid source and data
        if (!event.source || !event.data || !event.data.type) {
            console.warn('Invalid message received');
            return;
        }

        console.log('Processing message:', event.data.type);
            
        switch(event.data.type) {
            case "REQUEST_MICROPHONE":
                console.log('Microphone access requested');
                const hasPermission = await requestMicrophoneAccess();
                console.log('Microphone permission result:', hasPermission);
                break;
                
            case "REQUEST_SCREENSHOT":
                try {
                    if (lastScreenshotData) {
                        event.source.postMessage({
                            type: "SCREENSHOT_RESPONSE",
                            data: lastScreenshotData
                        }, event.origin);
                    }
                    document.getElementById('captureBtn')?.click();
                } catch (error) {
                    console.error('Screenshot request error:', error);
                }
                break;

            case "CHECK_MICROPHONE":
                try {
                    const streamActive = microphoneStream && microphoneStream.active;
                    event.source.postMessage({
                        type: "MICROPHONE_STATUS",
                        active: streamActive
                    }, event.origin);
                    
                    if (!streamActive) {
                        await requestMicrophoneAccess();
                    }
                } catch (error) {
                    console.error('Microphone check error:', error);
                }
                break;

            default:
                console.log('Unhandled message type:', event.data.type);
        }
    });

    // Screenshot capture logic
    document.getElementById('captureBtn')?.addEventListener('click', async () => {
        try {
            if (errorMsg) errorMsg.style.display = 'none';
            
            const response = await chrome.runtime.sendMessage({
                type: 'getScreenshot'
            });
            
            if (response && response.success && response.screenshot) {
                lastScreenshotData = response.screenshot.split(',')[1];
                if (screenshot) {
                    screenshot.src = `data:image/jpeg;base64,${lastScreenshotData}`;
                    screenshot.style.display = 'block';
                }
                
                if (replitFrame && replitFrame.contentWindow) {
                    try {
                        const frameOrigin = new URL(replitFrame.src).origin;
                        if (isAllowedOrigin(frameOrigin)) {
                            replitFrame.contentWindow.postMessage({
                                type: "SCREENSHOT_UPDATE",
                                data: lastScreenshotData
                            }, frameOrigin);
                        }
                    } catch (e) {
                        console.error('Error sending screenshot update:', e);
                    }
                }
            } else {
                throw new Error(response?.error || 'Screenshot capture failed');
            }
        } catch (error) {
            console.error('Screenshot error:', error);
            if (errorMsg) {
                errorMsg.textContent = `Error: ${error.message}`;
                errorMsg.style.display = 'block';
            }
        }
    });

    // Initialize microphone access
    setTimeout(() => {
        console.log('Requesting initial microphone access');
        requestMicrophoneAccess();
    }, 1000);
});