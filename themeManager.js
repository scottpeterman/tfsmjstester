// themeManager.js - Theme management for VS Code extensions
const vscode = require('vscode');

/**
 * ThemeManager for VS Code webviews
 * Handles theme detection and provides CSS variables mapping
 */
class ThemeManager {
  /**
   * Creates a new ThemeManager instance
   */
  constructor() {
    this.themeChangeListeners = [];
    this.currentTheme = this.getCurrentTheme();
    
    // Listen for theme changes in VS Code
    vscode.window.onDidChangeActiveColorTheme(theme => {
      this.currentTheme = this.getThemeKindString(theme.kind);
      this.notifyListeners();
    });
  }

  /**
   * Add a webview panel to receive theme updates
   * @param {vscode.WebviewPanel} panel The webview panel
   */
  registerWebviewPanel(panel) {
    if (!panel) return;
    
    // Add message handler for this panel
    const listener = () => {
      if (panel && panel.visible) {
        panel.webview.postMessage({
          command: 'update-theme',
          theme: this.currentTheme
        });
      }
    };
    
    this.themeChangeListeners.push(listener);
    
    // Send initial theme
    listener();
    
    // Remove listener when panel is disposed
    panel.onDidDispose(() => {
      const index = this.themeChangeListeners.indexOf(listener);
      if (index !== -1) {
        this.themeChangeListeners.splice(index, 1);
      }
    });
    
    return panel;
  }
  
  /**
   * Notify all registered panels about theme changes
   */
  notifyListeners() {
    this.themeChangeListeners.forEach(listener => listener());
  }
  
  /**
   * Get current VS Code theme
   * @returns {string} Theme class name
   */
  getCurrentTheme() {
    return this.getThemeKindString(vscode.window.activeColorTheme.kind);
  }
  
  /**
   * Convert VS Code ColorThemeKind to CSS class
   * @param {vscode.ColorThemeKind} kind Theme kind
   * @returns {string} CSS class for the theme
   */
  getThemeKindString(kind) {
    switch (kind) {
      case vscode.ColorThemeKind.Light:
        return 'vscode-light';
      case vscode.ColorThemeKind.Dark:
        return 'vscode-dark';
      case vscode.ColorThemeKind.HighContrast:
      case vscode.ColorThemeKind.HighContrastLight:
        return 'vscode-high-contrast';
      default:
        return 'vscode-dark';
    }
  }
  
  /**
   * Gets standardized CSS variables for a TextFSM theme
   * @returns {string} CSS variables
   */
  static getThemeCSS() {
    return `
:root {
    --background-color: var(--vscode-editor-background);
    --foreground-color: var(--vscode-editor-foreground);
    --border-color: var(--vscode-panel-border);
    --input-background: var(--vscode-input-background);
    --input-foreground: var(--vscode-input-foreground);
    --input-border: var(--vscode-input-border);
    --button-background: var(--vscode-button-background);
    --button-foreground: var(--vscode-button-foreground);
    --button-hover-background: var(--vscode-button-hoverBackground);
    --accent-color: var(--vscode-textLink-foreground);
    --error-color: var(--vscode-editorError-foreground, #f14c4c);
    --success-color: var(--vscode-testing-iconPassed, #23d18b);
    --warning-color: var(--vscode-editorWarning-foreground, #cca700);
    --title-color: var(--vscode-titleBar-activeForeground);
    --label-color: var(--vscode-descriptionForeground);
}

/* Theme-specific shadow variables */
.vscode-light {
    --custom-shadow: rgba(0, 0, 0, 0.1);
}

.vscode-dark {
    --custom-shadow: rgba(0, 0, 0, 0.4);
}

.vscode-high-contrast {
    --custom-shadow: none;
}
    `;
  }
}

module.exports = ThemeManager;