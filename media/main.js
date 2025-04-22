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
    
    // Initialize CodeMirror for template editor
    let templateEditor;

    // Define TextFSM mode for CodeMirror
    CodeMirror.defineSimpleMode('textfsm', {
        // Start state
        start: [
            // Comments
            {regex: /#.*/, token: "comment"},
            
            // Value declarations
            {regex: /^(Value)(\s+)(\w+)(\s+)(.*)$/, 
             token: ["keyword", null, "variable", null, "string-2"]},
            
            // Value declarations with options
            {regex: /^(Value)(\s+)(\w+)(\s+)(\w+)(\s+)(.*)$/, 
             token: ["keyword", null, "attribute", null, "variable", null, "string-2"]},
            
            // State declarations
            {regex: /^(Start|End)$/, token: "keyword"},
            
            // Rules (lines starting with ^)
            {regex: /^\s*(\^.+?)(?=->|$)/, token: "string"},
            
            // Actions
            {regex: /(->)(\s+)(\w+)/, 
             token: ["operator", null, "def"]},
            
            // Variable references ${var}
            {regex: /(\${)([^}]+)(})/, 
             token: ["bracket", "variable-2", "bracket"]}
        ],
        
        // The meta property contains global information about the mode
        meta: {
            lineComment: "#"
        }
    });

    // Replace textarea with CodeMirror
    const initialValue = templateTextarea.value;
    
    templateEditor = CodeMirror.fromTextArea(templateTextarea, {
        mode: 'textfsm',
        lineNumbers: true,
        theme: document.body.classList.contains('vscode-light') ? 'vscode-light' : 'vscode-dark',
        lineWrapping: true,
        tabSize: 2,
        indentWithTabs: false,
        autofocus: false
    });
    
    // Set initial content
    templateEditor.setValue(initialValue);
    
    // Attempt to load any saved state
    try {
        const state = vscode.getState();
        if (state) {
            if (state.template) templateEditor.setValue(state.template);
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
                template: templateEditor.getValue(),
                text: textTextarea.value,
                result: resultTextarea.value
            });
        } catch (err) {
            console.log('Could not save state:', err);
        }
    }
    
    // Save state on input
    templateEditor.on('change', function() {
        saveState();
    });
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
        const template = templateEditor.getValue();
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
        const template = templateEditor.getValue();
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
        templateEditor.setValue('');
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
                // Update CodeMirror theme based on VS Code theme
                document.body.className = message.theme;
                if (message.theme === 'vscode-light') {
                    templateEditor.setOption('theme', 'vscode-light');
                } else if (message.theme === 'vscode-dark') {
                    templateEditor.setOption('theme', 'vscode-dark');
                } else {
                    templateEditor.setOption('theme', 'vscode-high-contrast');
                }
                break;
            case 'file-content':
                // File content received
                if (message.type === 'template') {
                    templateEditor.setValue(message.content);
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
                    templateEditor.setValue(message.content.template);
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
});