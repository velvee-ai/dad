# Installation Guide

## Installing the DAAD Extension

### Option 1: Install from VSIX (Recommended for Testing)

The extension has been packaged as `claude-flow-visualizer-0.0.1.vsix`

#### Via VS Code UI:
1. Open VS Code
2. Go to Extensions view (Cmd+Shift+X on Mac, Ctrl+Shift+X on Windows/Linux)
3. Click the "..." menu at the top of the Extensions view
4. Select "Install from VSIX..."
5. Navigate to `/Users/sathish/git/daad/main/`
6. Select `claude-flow-visualizer-0.0.1.vsix`
7. Click Install

#### Via Command Line:
```bash
code --install-extension claude-flow-visualizer-0.0.1.vsix
```

### Option 2: Development Mode

For development and debugging:

1. Open the project in VS Code
2. Press F5 to launch a new VS Code window with the extension loaded
3. The extension will be available in the debug instance

### Option 3: Build and Install Fresh

```bash
# Clean build
npm run clean
npm install
npm run compile

# Package
npx vsce package

# Install
code --install-extension claude-flow-visualizer-0.0.1.vsix
```

## Verify Installation

1. Open any JavaScript/TypeScript/Python file
2. Select some code
3. Right-click and look for "Visualize Code Flow"
4. Or use Command Palette (Cmd+Shift+P) and search for "Claude Flow"

## System Requirements

- VS Code 1.80.0 or higher
- Node.js 16+ (for development)
- Claude CLI (for diagram generation)

## Features Available After Installation

### Commands
- **Claude Flow: Visualize Selection** - Generate flow chart from selected code
- **Claude Flow: Visualize File** - Generate flow chart for entire file
- **Claude Flow: Visualize All Functions** - Analyze all functions separately
- **Claude Flow: Smart Detection** - Auto-detect relevant code at cursor

### Views
- **Saved Charts** - Tree view in Explorer showing all saved diagrams

### Context Menu
- Right-click on selected code → "Visualize Code Flow"

### Edit Mode Features
- Toggle between View/Edit modes
- Add/delete nodes
- Create connections
- Auto-layout
- Save/reset changes

## Troubleshooting

### Extension Not Showing
1. Check VS Code version (must be 1.80.0+)
2. Reload VS Code window (Cmd+R / Ctrl+R)
3. Check extension is enabled in Extensions view

### Claude Not Found
1. Ensure Claude CLI is installed
2. Check PATH includes Claude
3. Run `which claude` in terminal to verify

### Diagrams Not Generating
1. Check Output panel → "Claude Flow Visualizer"
2. Verify code selection is valid
3. Try smaller code snippets first

## Uninstalling

### Via VS Code:
1. Go to Extensions view
2. Find "Claude Flow Visualizer"
3. Click Uninstall

### Via Command Line:
```bash
code --uninstall-extension claude-flow-visualizer
```

## Updates

When a new version is available:
1. Uninstall the old version
2. Install the new VSIX file
3. Reload VS Code

## File Locations

After installation, the extension creates:
- `.daad/` folder in workspace root (for saved diagrams)
- `.daad/.gitignore` (to optionally exclude from git)

## Support

For issues or questions:
- Check the Output panel (View → Output → Claude Flow Visualizer)
- Review error messages in Developer Tools (Help → Toggle Developer Tools)
- File issues with error logs and reproduction steps