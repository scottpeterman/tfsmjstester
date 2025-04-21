// Get the VS Code API
const vscode = acquireVsCodeApi();

// Initialize the UI when DOM is fully loaded
document.addEventListener('DOMContentLoaded', function() {
    // Get DOM elements
    const templateTextarea = document.getElementById('template');
    const textTextarea = document.getElementById('text');
    const resultTextarea = document.getElementById('result');
    const statusElement = document.getElementById('status');
    const parseButton = document.getElementById('parse');
    const parseDictButton = document.getElementById('parse-dict');
    const clearButton = document.getElementById('clear');
    const openTemplateButton = document.getElementById('open-template');
    const openTextButton = document.getElementById('open-text');
    const aboutModal = document.getElementById('about-modal');
    const aboutButton = document.getElementById('about-button');
    const closeButton = document.querySelector('.close-button');
    
    // Attempt to load any saved state
    try {
        const state = vscode.getState();
        if (state) {
            if (state.template) templateTextarea.value = state.template;
            if (state.text) textTextarea.value = state.text;
            if (state.result) resultTextarea.value = state.result;
        }
    } catch (err) {
        console.log('Could not restore state:', err);
    }
    
    // Function to save state
    function saveState() {
        try {
            vscode.setState({
                template: templateTextarea.value,
                text: textTextarea.value,
                result: resultTextarea.value
            });
        } catch (err) {
            console.log('Could not save state:', err);
        }
    }
    
    // Save state on input
    templateTextarea.addEventListener('input', saveState);
    textTextarea.addEventListener('input', saveState);
    
    // Update status
    function updateStatus(message, isError = false) {
        statusElement.textContent = message;
        statusElement.style.color = isError ? 
            'var(--error-color)' : 
            'var(--vscode-descriptionForeground)';
    }
    
    // Open template file
    openTemplateButton.addEventListener('click', function() {
        vscode.postMessage({
            command: 'open-file',
            type: 'template'
        });
    });
    
    // Open input text file
    openTextButton.addEventListener('click', function() {
        vscode.postMessage({
            command: 'open-file',
            type: 'text'
        });
    });
    
    // Parse text
    parseButton.addEventListener('click', function() {
        const template = templateTextarea.value;
        const text = textTextarea.value;

        if (!template || !text) {
            resultTextarea.value = 'Please enter both template and text.';
            updateStatus('Missing input', true);
            return;
        }

        try {
            resultTextarea.value = 'Processing...';
            updateStatus('Processing...');

            // Access the TextFSM constructor from the global TextFSMModule
            const fsm = new window.TextFSM.TextFSM(template);
            const results = fsm.parseText(text);

            // Format results
            let output = 'Header: ' + JSON.stringify(fsm.header) + '\n\n';
            output += 'Results:\n';

            results.forEach((row, index) => {
                output += `Row ${index + 1}: ${JSON.stringify(row)}\n`;
            });

            resultTextarea.value = output;
            updateStatus(`Parsed ${results.length} rows successfully`);
            saveState();
        } catch (error) {
            resultTextarea.value = `Error: ${error.name}\n${error.message}\n\nStack trace:\n${error.stack}`;
            console.error(error);
            updateStatus('Error: ' + error.message, true);
            
            // Send error to extension
            vscode.postMessage({
                command: 'alert',
                text: `Error: ${error.message}`
            });
        }
    });

    // Parse to dictionary
    parseDictButton.addEventListener('click', function() {
        const template = templateTextarea.value;
        const text = textTextarea.value;

        if (!template || !text) {
            resultTextarea.value = 'Please enter both template and text.';
            updateStatus('Missing input', true);
            return;
        }

        try {
            resultTextarea.value = 'Processing...';
            updateStatus('Processing...');

            // Access the TextFSM constructor from the global TextFSMModule
            const fsm = new window.TextFSM.TextFSM(template);
            const results = fsm.parseTextToDicts(text);

            // Format results as a simple JSON array of dictionaries
            let output = JSON.stringify(results, null, 2);

            resultTextarea.value = output;
            updateStatus(`Parsed ${results.length} rows successfully as dictionaries`);
            saveState();
        } catch (error) {
            resultTextarea.value = `Error: ${error.name}\n${error.message}\n\nStack trace:\n${error.stack}`;
            console.error(error);
            updateStatus('Error: ' + error.message, true);
            
            // Send error to extension
            vscode.postMessage({
                command: 'alert',
                text: `Error: ${error.message}`
            });
        }
    });

    // Clear all
    clearButton.addEventListener('click', function() {
        templateTextarea.value = '';
        textTextarea.value = '';
        resultTextarea.value = '';
        updateStatus('All fields cleared');
        saveState();
    });

    // Open modal when About button is clicked
    aboutButton.addEventListener('click', function() {
        aboutModal.style.display = 'block';
        
        // Try to load the logo from the extension resources if available
        try {
            // Send message to extension to get logo URI
            vscode.postMessage({
                command: 'get-logo-uri'
            });
        } catch (err) {
            console.log('Could not request logo:', err);
        }
    });

    // Close modal when X is clicked
    closeButton.addEventListener('click', function() {
        aboutModal.style.display = 'none';
    });

    // Close modal when clicking outside of it
    window.addEventListener('click', function(event) {
        if (event.target === aboutModal) {
            aboutModal.style.display = 'none';
        }
    });

    // Listen for messages from the extension
    window.addEventListener('message', event => {
        const message = event.data;
        switch (message.command) {
            case 'update-theme':
                // The extension can notify about theme changes
                document.body.className = message.theme;
                break;
            case 'file-content':
                // File content received
                if (message.type === 'template') {
                    templateTextarea.value = message.content;
                    updateStatus('Template file loaded');
                } else if (message.type === 'text') {
                    textTextarea.value = message.content;
                    updateStatus('Input text file loaded');
                }
                saveState();
                break;
            case 'set-content':
                // Set initial content
                if (message.content.template) {
                    templateTextarea.value = message.content.template;
                }
                if (message.content.text) {
                    textTextarea.value = message.content.text;
                }
                updateStatus('Content loaded');
                saveState();
                break;
            case 'logo-uri':
                if (message.uri) {
                    document.getElementById('logo-img').src = message.uri;
                    document.getElementById('logo-img').style.display = 'block';
                }
                break;
        }
    });
    
    // Detect initial theme from VS Code
    if (document.body.classList.contains('vscode-light')) {
        console.log('Light theme detected');
    } else if (document.body.classList.contains('vscode-dark')) {
        console.log('Dark theme detected');
    } else if (document.body.classList.contains('vscode-high-contrast')) {
        console.log('High contrast theme detected');
    }
});