let scrapedData = [];

const presets = {
    news: {
        url: 'https://news.ycombinator.com',
        selector: '.titleline > a',
        attribute: ''
    },
    github: {
        url: 'https://github.com/trending',
        selector: 'h2.h3 a',
        attribute: ''
    },
    stackoverflow: {
        url: 'https://stackoverflow.com/questions',
        selector: '.s-post-summary--content-title a',
        attribute: ''
    }
};

function loadPreset(type) {
    const preset = presets[type];
    if (preset) {
        document.getElementById('url').value = preset.url;
        document.getElementById('selector').value = preset.selector;
        document.getElementById('attribute').value = preset.attribute;
    }
}

async function scrapeWebsite() {
    const url = document.getElementById('url').value;
    const selector = document.getElementById('selector').value;
    const attribute = document.getElementById('attribute').value;

    if (!url || !selector) {
        showError('Please enter both URL and CSS selector');
        return;
    }

    const btn = document.getElementById('scrapeBtn');
    btn.disabled = true;
    btn.textContent = '🔄 Scraping...';

    showLoading();

    try {
        // Use puter.net.fetch to get the webpage
        const response = await puter.net.fetch(url);
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const html = await response.text();
        
        // Parse HTML and extract data
        const results = parseHTML(html, selector, attribute, url);
        
        if (results.length === 0) {
            showError('No elements found with the specified selector. Try a different CSS selector.');
        } else {
            scrapedData = results;
            displayResults(results);
        }

    } catch (error) {
        showError(`Failed to scrape website: ${error.message}`);
    } finally {
        btn.disabled = false;
        btn.textContent = '🔍 Scrape Data';
    }
}

function parseHTML(html, selector, attribute, baseUrl) {
    // Create a temporary DOM parser
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    
    // Find all elements matching the selector
    const elements = doc.querySelectorAll(selector);
    const results = [];

    elements.forEach((element, index) => {
        let value;
        
        if (attribute) {
            if (attribute === 'data-*') {
                // Extract all data attributes
                const dataAttrs = {};
                for (let attr of element.attributes) {
                    if (attr.name.startsWith('data-')) {
                        dataAttrs[attr.name] = attr.value;
                    }
                }
                value = JSON.stringify(dataAttrs);
            } else {
                value = element.getAttribute(attribute) || '';
                
                // Convert relative URLs to absolute
                if ((attribute === 'href' || attribute === 'src') && value && !value.startsWith('http')) {
                    try {
                        const absoluteUrl = new URL(value, baseUrl);
                        value = absoluteUrl.href;
                    } catch (e) {
                        // Keep original value if URL construction fails
                    }
                }
            }
        } else {
            value = element.textContent.trim();
        }

        if (value) {
            results.push({
                index: index + 1,
                value: value,
                tagName: element.tagName.toLowerCase(),
                className: element.className,
                id: element.id
            });
        }
    });

    return results;
}

function showLoading() {
    const resultsSection = document.getElementById('resultsSection');
    resultsSection.innerHTML = `
        <div class="loading">
            <div class="spinner"></div>
            <p>Fetching and parsing webpage...</p>
        </div>
    `;
}

function displayResults(results) {
    const resultsSection = document.getElementById('resultsSection');
    
    let html = `
        <h3>📊 Found ${results.length} results</h3>
        <div class="save-section">
            <div class="flex-row">
                <div class="input-group">
                    <label for="filename">Save results to file</label>
                    <input type="text" id="filename" value="scraped_data.json" placeholder="filename.json">
                </div>
                <button class="btn" onclick="saveResults()">💾 Save to Cloud</button>
            </div>
        </div>
    `;
    
    results.forEach(result => {
        html += `
            <div class="result-item">
                <h3>Result #${result.index}</h3>
                <p><strong>Content:</strong> ${escapeHtml(result.value)}</p>
                <p><strong>Element:</strong> ${result.tagName}${result.className ? `.${result.className}` : ''}${result.id ? `#${result.id}` : ''}</p>
            </div>
        `;
    });
    
    resultsSection.innerHTML = html;
}

function showError(message) {
    const resultsSection = document.getElementById('resultsSection');
    resultsSection.innerHTML = `
        <div class="error">
            <strong>❌ Error:</strong> ${escapeHtml(message)}
        </div>
    `;
}

async function saveResults() {
    if (scrapedData.length === 0) {
        showError('No data to save. Please scrape a website first.');
        return;
    }

    const filename = document.getElementById('filename').value || 'scraped_data.json';
    
    try {
        const dataToSave = {
            scrapedAt: new Date().toISOString(),
            url: document.getElementById('url').value,
            selector: document.getElementById('selector').value,
            attribute: document.getElementById('attribute').value,
            resultCount: scrapedData.length,
            results: scrapedData
        };

        await puter.fs.write(filename, JSON.stringify(dataToSave, null, 2));
        
        // Show success message
        const resultsSection = document.getElementById('resultsSection');
        const successDiv = document.createElement('div');
        successDiv.style.cssText = 'background: #d4edda; color: #155724; padding: 15px; border-radius: 8px; margin-bottom: 20px;';
        successDiv.innerHTML = `<strong>✅ Success:</strong> Results saved to <code>${filename}</code> in your cloud storage!`;
        resultsSection.insertBefore(successDiv, resultsSection.firstChild);
        
        // Remove success message after 5 seconds
        setTimeout(() => successDiv.remove(), 5000);
        
    } catch (error) {
        showError(`Failed to save results: ${error.message}`);
    }
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Load a default example
window.addEventListener('load', () => {
    loadPreset('news');
});
