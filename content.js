// Progress bar and download management
let currentDownload = null;
let progressInterval = null;

function createProgressBar() {
    const progressContainer = document.createElement('div');
    progressContainer.id = 'yt-download-progress';
    progressContainer.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        width: 350px;
        background: rgba(0, 0, 0, 0.9);
        color: white;
        padding: 15px;
        border-radius: 10px;
        z-index: 10000;
        font-family: Arial, sans-serif;
        box-shadow: 0 4px 20px rgba(0,0,0,0.3);
        display: none;
    `;

    const title = document.createElement('div');
    title.textContent = 'YouTube Video Download';
    title.style.cssText = `
        font-weight: bold;
        margin-bottom: 10px;
        font-size: 14px;
    `;

    const progressBarContainer = document.createElement('div');
    progressBarContainer.style.cssText = `
        background: #333;
        height: 20px;
        border-radius: 10px;
        overflow: hidden;
        margin-bottom: 10px;
    `;

    const progressBar = document.createElement('div');
    progressBar.id = 'yt-progress-fill';
    progressBar.style.cssText = `
        height: 100%;
        background: linear-gradient(90deg, #ff0000, #ff4444);
        width: 0%;
        transition: width 0.3s ease;
        border-radius: 10px;
    `;

    const progressText = document.createElement('div');
    progressText.id = 'yt-progress-text';
    progressText.style.cssText = `
        font-size: 12px;
        text-align: center;
        margin-bottom: 10px;
    `;

    const statusText = document.createElement('div');
    statusText.id = 'yt-status-text';
    statusText.style.cssText = `
        font-size: 11px;
        opacity: 0.8;
        word-wrap: break-word;
    `;

    const closeButton = document.createElement('button');
    closeButton.textContent = '×';
    closeButton.style.cssText = `
        position: absolute;
        top: 5px;
        right: 10px;
        background: none;
        border: none;
        color: white;
        font-size: 18px;
        cursor: pointer;
        padding: 0;
        width: 20px;
        height: 20px;
    `;

    closeButton.onclick = () => {
        progressContainer.style.display = 'none';
        if (progressInterval) {
            clearInterval(progressInterval);
            progressInterval = null;
        }
    };

    progressBarContainer.appendChild(progressBar);
    progressContainer.appendChild(title);
    progressContainer.appendChild(closeButton);
    progressContainer.appendChild(progressBarContainer);
    progressContainer.appendChild(progressText);
    progressContainer.appendChild(statusText);

    document.body.appendChild(progressContainer);
    return progressContainer;
}

function updateProgress(downloadId) {
    fetch(`http://localhost:5000/progress/${downloadId}`)
        .then(res => res.json())
        .then(data => {
            const progressBar = document.getElementById('yt-progress-fill');
            const progressText = document.getElementById('yt-progress-text');
            const statusText = document.getElementById('yt-status-text');

            if (progressBar && progressText && statusText) {
                progressBar.style.width = `${data.percentage}%`;
                progressText.textContent = `${data.percentage.toFixed(1)}%`;
                statusText.textContent = data.message || 'Processing...';

                if (data.status === 'completed') {
                    progressText.textContent = 'Download Complete!';
                    statusText.innerHTML = `
                        <a href="${data.download_url}" target="_blank" style="color: #4CAF50; text-decoration: none;">
                            📁 Click to download file
                        </a>
                    `;
                    if (progressInterval) {
                        clearInterval(progressInterval);
                        progressInterval = null;
                    }
                    // Auto-hide after 10 seconds
                    setTimeout(() => {
                        const container = document.getElementById('yt-download-progress');
                        if (container) container.style.display = 'none';
                    }, 10000);
                } else if (data.status === 'error') {
                    progressBar.style.background = '#f44336';
                    progressText.textContent = 'Download Failed';
                    statusText.textContent = data.message || 'Unknown error occurred';
                    if (progressInterval) {
                        clearInterval(progressInterval);
                        progressInterval = null;
                    }
                }
            }
        })
        .catch(err => {
            console.error('Progress update error:', err);
            const statusText = document.getElementById('yt-status-text');
            if (statusText) {
                statusText.textContent = 'Connection error';
            }
        });
}

function startDownload(quality = 'best') {
    const videoUrl = window.location.href;
    const progressContainer = document.getElementById('yt-download-progress') || createProgressBar();
    
    progressContainer.style.display = 'block';
    
    // Reset progress bar
    const progressBar = document.getElementById('yt-progress-fill');
    const progressText = document.getElementById('yt-progress-text');
    const statusText = document.getElementById('yt-status-text');
    
    if (progressBar) progressBar.style.width = '0%';
    if (progressText) progressText.textContent = '0%';
    if (statusText) statusText.textContent = 'Starting download...';

    fetch('http://localhost:5000/download', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
            url: videoUrl,
            quality: quality
        })
    })
    .then(res => res.json())
    .then(data => {
        if (data.download_id) {
            currentDownload = data.download_id;
            // Start polling for progress
            progressInterval = setInterval(() => {
                updateProgress(data.download_id);
            }, 1000);
        } else {
            throw new Error(data.error || 'Download failed to start');
        }
    })
    .catch(err => {
        console.error('Download error:', err);
        const statusText = document.getElementById('yt-status-text');
        if (statusText) {
            statusText.textContent = `Error: ${err.message}`;
        }
        const progressBar = document.getElementById('yt-progress-fill');
        if (progressBar) {
            progressBar.style.background = '#f44336';
        }
    });
}

function createQualityDropdown() {
    const dropdown = document.createElement('select');
    dropdown.id = 'yt-quality-select';
    dropdown.style.cssText = `
        margin-left: 8px;
        padding: 5px;
        background: #282828;
        color: white;
        border: 1px solid #404040;
        border-radius: 4px;
        font-size: 12px;
        cursor: pointer;
    `;

    const options = [
        { value: 'best', text: '🎬 Best Quality (4K)' },
        { value: 'high', text: '🎥 High Quality (1080p)' },
        { value: 'medium', text: '📱 Medium Quality (720p)' }
    ];

    options.forEach(option => {
        const optionElement = document.createElement('option');
        optionElement.value = option.value;
        optionElement.textContent = option.text;
        dropdown.appendChild(optionElement);
    });

    return dropdown;
}

function addDownloadButton() {
    // Try multiple possible selectors for the buttons container
    const possibleSelectors = [
        '#top-level-buttons-computed',
        '#top-level-buttons',
        '#menu-container',
        '.ytd-video-primary-info-renderer #top-level-buttons-computed',
        '.ytd-menu-renderer',
        '#info-contents #top-level-buttons-computed'
    ];
    
    let container = null;
    for (const selector of possibleSelectors) {
        container = document.querySelector(selector);
        if (container) break;
    }
    
    if (!container || document.getElementById('yt-download-btn')) return;

    const downloadContainer = document.createElement('div');
    downloadContainer.style.cssText = `
        display: flex;
        align-items: center;
        margin-left: 10px;
    `;

    const btn = document.createElement('button');
    btn.id = 'yt-download-btn';
    btn.innerHTML = '⬇️ Download';
    btn.style.cssText = `
        padding: 8px 16px;
        background: linear-gradient(45deg, #ff0000, #cc0000);
        color: white;
        border: none;
        border-radius: 20px;
        cursor: pointer;
        font-weight: bold;
        font-size: 14px;
        transition: all 0.3s ease;
        box-shadow: 0 2px 10px rgba(255,0,0,0.3);
    `;

    btn.onmouseover = () => {
        btn.style.transform = 'scale(1.05)';
        btn.style.boxShadow = '0 4px 20px rgba(255,0,0,0.5)';
    };

    btn.onmouseout = () => {
        btn.style.transform = 'scale(1)';
        btn.style.boxShadow = '0 2px 10px rgba(255,0,0,0.3)';
    };

    const qualityDropdown = createQualityDropdown();

    btn.onclick = () => {
        const selectedQuality = qualityDropdown.value;
        startDownload(selectedQuality);
    };

    downloadContainer.appendChild(btn);
    downloadContainer.appendChild(qualityDropdown);
    container.appendChild(downloadContainer);
}

// Initialize the extension with better timing
function init() {
    // Wait for page to be fully loaded
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
        return;
    }
    
    addDownloadButton();
    
    // Create progress bar container (hidden initially)
    if (!document.getElementById('yt-download-progress')) {
        createProgressBar();
    }
}

// Multiple strategies for detecting when elements are ready
function waitForElement(selector, callback, maxAttempts = 50) {
    let attempts = 0;
    
    const checkForElement = () => {
        const element = document.querySelector(selector);
        if (element) {
            callback(element);
            return;
        }
        
        attempts++;
        if (attempts < maxAttempts) {
            setTimeout(checkForElement, 200);
        }
    };
    
    checkForElement();
}

// Enhanced initialization with multiple detection methods
function enhancedInit() {
    // Method 1: Direct check
    addDownloadButton();
    
    // Method 2: Wait for specific element
    waitForElement('#top-level-buttons-computed', () => {
        addDownloadButton();
    });
    
    // Method 3: MutationObserver for dynamic changes
    const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            if (mutation.type === 'childList') {
                mutation.addedNodes.forEach((node) => {
                    if (node.nodeType === 1) { // Element node
                        if (node.id === 'top-level-buttons-computed' || 
                            node.querySelector && node.querySelector('#top-level-buttons-computed')) {
                            addDownloadButton();
                        }
                    }
                });
            }
        });
    });
    
    observer.observe(document.body, {
        childList: true,
        subtree: true
    });
    
    // Create progress bar container (hidden initially)
    if (!document.getElementById('yt-download-progress')) {
        createProgressBar();
    }
}

// Run initialization with multiple strategies
enhancedInit();

// Keep the interval as backup, but with longer delay
setInterval(() => {
    if (!document.getElementById('yt-download-btn')) {
        addDownloadButton();
    }
}, 3000);

// Also listen for YouTube's navigation events
window.addEventListener('yt-navigate-finish', () => {
    setTimeout(addDownloadButton, 1000);
});

// Listen for popstate events (browser back/forward)
window.addEventListener('popstate', () => {
    setTimeout(addDownloadButton, 1000);
});

// Clean up on page unload
window.addEventListener('beforeunload', () => {
    if (progressInterval) {
        clearInterval(progressInterval);
        progressInterval = null;
    }
});