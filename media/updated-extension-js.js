const vscode = require('vscode');
const path = require('path');
const fs = require('fs');

/**
 * Tool provider class for the tree view
 */
class DeveloperToolsProvider {
  constructor() {
    this._onDidChangeTreeData = new vscode.EventEmitter();
    this.onDidChangeTreeData = this._onDidChangeTreeData.event;
    this.tools = [
      { id: 'textfsm-tester', label: 'TextFSM Tester', command: 'textfsm-tester.openTester' },
      // Add more tools here as you develop them
    ];
  }

  getTreeItem(element) {
    const treeItem = new vscode.TreeItem(element.label);
    treeItem.command = {
      command: element.command,
      title: element.label
    };
    treeItem.collapsibleState = vscode.TreeItemCollapsibleState.None;
    return treeItem;
  }

  getChildren() {
    return this.tools;
  }

  refresh() {
    this._onDidChangeTreeData.fire();
  }
}

/**
 * @param {vscode.ExtensionContext} context
 */
function activate(context) {
  console.log('TextFSM Tester extension is now active');

  // Register the tree data provider
  const toolsProvider = new DeveloperToolsProvider();
  vscode.window.registerTreeDataProvider('developerToolsList', toolsProvider);

  // Register command to open TextFSM Tester
  let disposable = vscode.commands.registerCommand('textfsm-tester.openTester', function () {
    openTextFSMTester(context);
  });

  // Command to open TextFSM Tester with the current file as template
  let openAsTemplateDisposable = vscode.commands.registerCommand('textfsm-tester.openAsTemplate', function () {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
      vscode.window.showInformationMessage('No file is currently open');
      return;
    }

    const document = editor.document;
    const templateContent = document.getText();
    openTextFSMTester(context, {template: templateContent});
  });

  // Command to open TextFSM Tester with the current file as input text
  let openAsInputDisposable = vscode.commands.registerCommand('textfsm-tester.openAsInput', function () {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
      vscode.window.showInformationMessage('No file is currently open');
      return;
    }

    const document = editor.document;
    const textContent = document.getText();
    openTextFSMTester(context, {text: textContent});
  });

  context.subscriptions.push(disposable, openAsTemplateDisposable, openAsInputDisposable);
}

/**
 * Opens the TextFSM Tester with optional initial content
 * @param {vscode.ExtensionContext} context 
 * @param {Object} initialContent Optional content to load (template and/or text)
 */
function openTextFSMTester(context, initialContent = {}) {
  // Create and show panel
  const panel = vscode.window.createWebviewPanel(
    'textfsmTester',
    'TextFSM Tester',
    vscode.ViewColumn.One,
    {
      // Enable scripts in the webview
      enableScripts: true,
      // Restrict the webview to only loading content from our extension's directory
      localResourceRoots: [vscode.Uri.file(path.join(context.extensionPath, 'media'))]
    }
  );

  // Get path to all required files
  const htmlPath = vscode.Uri.file(path.join(context.extensionPath, 'media', 'index.html'));
  const tfsmPath = vscode.Uri.file(path.join(context.extensionPath, 'media', 'tfsm.js'));
  const mainJsPath = vscode.Uri.file(path.join(context.extensionPath, 'media', 'main.js'));
  const cssPath = vscode.Uri.file(path.join(context.extensionPath, 'media', 'styles.css'));
  const modalCssPath = vscode.Uri.file(path.join(context.extensionPath, 'media', 'modal.css'));
  
  // Add paths for CodeMirror files
  const cmJsPath = vscode.Uri.file(path.join(context.extensionPath, 'media', 'codemirror.min.js'));
  const cmCssPath = vscode.Uri.file(path.join(context.extensionPath, 'media', 'codemirror.min.css'));
  const cmSimpleJsPath = vscode.Uri.file(path.join(context.extensionPath, 'media', 'simple.min.js'));
  
  // And get the local path to these resources
  const htmlUri = panel.webview.asWebviewUri(htmlPath);
  const tfsmUri = panel.webview.asWebviewUri(tfsmPath);
  const mainJsUri = panel.webview.asWebviewUri(mainJsPath);
  const cssUri = panel.webview.asWebviewUri(cssPath);
  const modalCssUri = panel.webview.asWebviewUri(modalCssPath);
  
  // Get the CodeMirror URIs
  const cmJsUri = panel.webview.asWebviewUri(cmJsPath);
  const cmCssUri = panel.webview.asWebviewUri(cmCssPath);
  const cmSimpleJsUri = panel.webview.asWebviewUri(cmSimpleJsPath);

  // Read the HTML file
  const htmlContent = fs.readFileSync(path.join(context.extensionPath, 'media', 'index.html'), 'utf8');
  
  // Replace the script and CSS src with the webview URI
  let modifiedHtml = htmlContent;
  
  // Replace CodeMirror CSS
  modifiedHtml = modifiedHtml.replace(
    '<link rel="stylesheet" href="codemirror.min.css">',
    `<link rel="stylesheet" href="${cmCssUri}">`
  );
  
  // Replace CodeMirror JS files
  modifiedHtml = modifiedHtml.replace(
    '<script type="text/javascript" src="codemirror.min.js"></script>',
    `<script type="text/javascript" src="${cmJsUri}"></script>`
  );
  
  modifiedHtml = modifiedHtml.replace(
    '<script type="text/javascript" src="simple.min.js"></script>',
    `<script type="text/javascript" src="${cmSimpleJsUri}"></script>`
  );
  
  // Replace TextFSM JS
  modifiedHtml = modifiedHtml.replace(
    '<script type="text/javascript" src="tfsm.js"></script>',
    `<script type="text/javascript" src="${tfsmUri}"></script>`
  );

  // Replace main.js
  modifiedHtml = modifiedHtml.replace(
    '<script type="text/javascript" src="main.js"></script>',
    `<script type="text/javascript" src="${mainJsUri}"></script>`
  );
  
  // Add CSS links if not already present
  if (!modifiedHtml.includes(cssUri.toString())) {
    modifiedHtml = modifiedHtml.replace(
      '</head>',
      `<link rel="stylesheet" href="${cssUri}">\n</head>`
    );
  } else {
    modifiedHtml = modifiedHtml.replace(
      '<link rel="stylesheet" href="styles.css">',
      `<link rel="stylesheet" href="${cssUri}">`
    );
  }
  
  // Add modal CSS link if not already present
  if (!modifiedHtml.includes(modalCssUri.toString())) {
    modifiedHtml = modifiedHtml.replace(
      '</head>',
      `<link rel="stylesheet" href="${modalCssUri}">\n</head>`
    );
  } else {
    modifiedHtml = modifiedHtml.replace(
      '<link rel="stylesheet" href="modal.css">',
      `<link rel="stylesheet" href="${modalCssUri}">`
    );
  }

  // Set the modified HTML content
  panel.webview.html = modifiedHtml;

  // Function to get current theme
  function getTheme() {
    return vscode.window.activeColorTheme.kind === vscode.ColorThemeKind.Light
      ? 'vscode-light'
      : vscode.window.activeColorTheme.kind === vscode.ColorThemeKind.Dark
        ? 'vscode-dark'
        : 'vscode-high-contrast';
  }

  // Send current theme to webview
  panel.webview.postMessage({
    command: 'update-theme',
    theme: getTheme()
  });

  // Send initial content if provided
  if (initialContent.template || initialContent.text) {
    setTimeout(() => {
      panel.webview.postMessage({
        command: 'set-content',
        content: initialContent
      });
    }, 500); // Small delay to ensure webview is ready
  }

  // Listen for theme changes
  vscode.window.onDidChangeActiveColorTheme(theme => {
    if (panel && panel.visible) {
      panel.webview.postMessage({
        command: 'update-theme', 
        theme: getTheme()
      });
    }
  });

  // Handle messages from the webview
  panel.webview.onDidReceiveMessage(
    message => {
      switch (message.command) {
        case 'alert':
          vscode.window.showInformationMessage(message.text);
          return;
        case 'open-file':
          openFile(message.type).then(content => {
            if (content) {
              panel.webview.postMessage({
                command: 'file-content',
                type: message.type,
                content: content
              });
            }
          });
          return;
        case 'get-logo-uri':
          // Respond with the logo URI if there's a logo in the media folder
          const logoPath = vscode.Uri.file(path.join(context.extensionPath, 'media', 'logo.jpg'));
          const logoUri = panel.webview.asWebviewUri(logoPath);
          if (fs.existsSync(path.join(context.extensionPath, 'media', 'logo.jpg'))) {
            panel.webview.postMessage({
              command: 'logo-uri',
              uri: logoUri.toString()
            });
          }
          return;
      }
    },
    undefined,
    context.subscriptions
  );
  
  return panel;
}

/**
 * Open file dialog to select a file
 * @param {string} type The type of file to open ('template' or 'text')
 * @returns {Promise<string>} The file content
 */
async function openFile(type) {
  const filters = type === 'template' 
    ? { 'TextFSM Templates': ['textfsm', 'tpl', 'template', 'txt'], 'All Files': ['*'] }
    : { 'Text Files': ['txt', 'log', 'conf'], 'All Files': ['*'] };
  
  const fileUri = await vscode.window.showOpenDialog({
    canSelectFiles: true,
    canSelectFolders: false,
    canSelectMany: false,
    openLabel: `Select ${type === 'template' ? 'Template' : 'Input Text'} File`,
    filters: filters
  });
  
  if (fileUri && fileUri.length > 0) {
    try {
      const document = await vscode.workspace.openTextDocument(fileUri[0]);
      return document.getText();
    } catch (err) {
      vscode.window.showErrorMessage(`Error opening file: ${err.message}`);
      return null;
    }
  }
  
  return null;
}

function deactivate() {}

module.exports = {
  activate,
  deactivate
}