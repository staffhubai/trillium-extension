document.addEventListener('DOMContentLoaded', function() {
    const captureBtn = document.getElementById('captureBtn');
    const screenshot = document.getElementById('screenshot');
    const errorMsg = document.getElementById('errorMsg');
    const timestamp = document.getElementById('timestamp');

    // Show screenshot when it gets a src
    const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            if (mutation.type === 'attributes' && mutation.attributeName === 'src') {
                screenshot.style.display = screenshot.src ? 'block' : 'none';
            }
        });
    });

    observer.observe(screenshot, {
        attributes: true,
        attributeFilter: ['src']
    });

    captureBtn.addEventListener('click', async () => {
        try {
            errorMsg.style.display = 'none';
            captureBtn.disabled = true;
            captureBtn.textContent = 'Capturing...';
            
            const response = await chrome.runtime.sendMessage({
                type: 'getScreenshot'
            });
            
            if (response && response.success && response.screenshot) {
                screenshot.src = response.screenshot;
                timestamp.textContent = `Last capture: ${new Date().toLocaleTimeString()}`;
                
                // Notify Replit app if it requested the screenshot
                const replitFrame = document.getElementById('replitFrame');
                replitFrame.contentWindow.postMessage({
                    type: "SCREENSHOT_RESPONSE",
                    data: response.screenshot.split(',')[1]
                }, 'https://trillium-tutor2.replit.app');
            } else {
                throw new Error(response?.error || 'Failed to capture screenshot');
            }
        } catch (error) {
            errorMsg.textContent = `Error: ${error.message}`;
            errorMsg.style.display = 'block';
            screenshot.style.display = 'none';
        } finally {
            captureBtn.disabled = false;
            captureBtn.textContent = 'Capture Screenshot';
        }
    });
});