let lastScreenshotTime = 0;
const SCREENSHOT_THROTTLE_MS = 100;

async function captureTabScreenshot() {
    try {
        console.log('Starting screenshot capture...');
        
        // Get active tab
        const [tab] = await chrome.tabs.query({active: true, currentWindow: true});
        if (!tab?.id) {
            throw new Error('No active tab found');
        }

        // First request temporary access to the tab
        await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            function: () => true // Simple ping to ensure we have access
        });
        
        // Throttle screenshots
        const now = Date.now();
        if (now - lastScreenshotTime < SCREENSHOT_THROTTLE_MS) {
            await new Promise(resolve => 
                setTimeout(resolve, SCREENSHOT_THROTTLE_MS - (now - lastScreenshotTime))
            );
        }
        
        lastScreenshotTime = Date.now();

        // Capture the visible area
        const imageData = await chrome.tabs.captureVisibleTab(null, {
            format: 'jpeg',
            quality: 80
        });
        
        if (!imageData) {
            throw new Error('No image data captured');
        }
        
        console.log('Screenshot captured successfully');
        
        return {
            success: true,
            screenshot: imageData,
            timestamp: now,
            tabId: tab.id
        };
    } catch (error) {
        console.error('Screenshot capture failed:', error);
        return {
            success: false,
            error: error.message || 'Screenshot capture failed',
            timestamp: Date.now()
        };
    }
}

// Handle messages from the extension UI
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    console.log('Received message:', request.type);
    
    if (request.type === 'getScreenshot') {
        captureTabScreenshot()
            .then(result => {
                console.log('Sending screenshot result:', result.success);
                sendResponse(result);
            })
            .catch(error => {
                console.error('Screenshot error:', error);
                sendResponse({
                    success: false,
                    error: error.message || 'Unknown error',
                    timestamp: Date.now()
                });
            });
        
        return true; // Keep message channel open for async response
    }
    
    return false;
});

// Handle extension icon click
chrome.action.onClicked.addListener((tab) => {
    console.log('Opening side panel for tab:', tab.id);
    chrome.sidePanel.open({ windowId: tab.windowId }).catch(error => {
        console.error('Failed to open side panel:', error);
    });
});

console.log('Screenshot extension service worker started');