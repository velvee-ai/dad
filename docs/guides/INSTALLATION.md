# DAD Installation Guide

> For complete system setup including CLI, Workers, and infrastructure, see [Complete Setup Guide](docs/setup/SETUP.md)

This guide covers quick installation of the DAD VSCode extension. For full monorepo setup, infrastructure configuration, and deployment, refer to the comprehensive setup guide.

## Quick Install: VSCode Extension

### Prerequisites

- VSCode 1.74.0 or higher
- Node.js 18+ (for development only)

### Option 1: Install from VSIX (Recommended)

Download the latest `.vsix` file and install:

#### Via VSCode UI:
1. Open VSCode
2. Go to Extensions view (`Cmd+Shift+X` / `Ctrl+Shift+X`)
3. Click the "..." menu at the top
4. Select "Install from VSIX..."
5. Navigate to the downloaded `.vsix` file
6. Click Install
7. Reload VSCode

#### Via Command Line:
```bash
code --install-extension dad-0.0.1.vsix
```

### Option 2: Development Mode

For extension development:

```bash
# Navigate to extension directory
cd apps/vscode-extension

# Install dependencies
pnpm install

# Open in VSCode and press F5
code .
```

Press `F5` to launch the Extension Development Host.

### Option 3: Build from Source

```bash
# From monorepo root
pnpm install
pnpm build

# Navigate to extension
cd apps/vscode-extension

# Package extension
pnpm package

# Install
code --install-extension dad-0.0.1.vsix
```

## Verify Installation

1. Open any code file (JavaScript, TypeScript, Python, etc.)
2. Select a function or code block
3. Right-click → "Visualize Code Flow with Claude"
4. Or use Command Palette (`Cmd+Shift+P`) → "Claude Flow: Visualize Selection"
5. Interactive flow chart should appear

## Available Features

### Commands
- **Claude Flow: Visualize Selection** - Generate flow chart from selected code
- **Claude Flow: Visualize Entire File** - Analyze complete file
- **Claude Flow: Visualize All Functions** - List and visualize all functions
- **Claude Flow: Smart Detection** - Auto-detect code at cursor

### Views
- **Saved Flow Charts** - Explorer sidebar showing saved diagrams
- Click any saved chart to reload it

### Context Menu
- Right-click selected code → "Visualize Code Flow"
- Right-click in editor → "Visualize Entire File"
- Right-click file in Explorer → "Visualize File"

## Storage

The extension automatically creates a `.dad/` folder in your workspace root for saved diagrams.

## Troubleshooting

### Extension Not Appearing

1. Check VSCode version is 1.74.0+
2. Reload VSCode window (`Cmd+R` / `Ctrl+R`)
3. Verify extension is enabled in Extensions view
4. Check Developer Tools for errors (`Help` → `Toggle Developer Tools`)

### Diagrams Not Generating

1. Check Output panel (`View` → `Output` → select "Claude Flow Visualizer")
2. Ensure code selection is valid
3. Try with smaller code snippets
4. Verify you have an active internet connection (for AI features)

### Performance Issues

1. Large files: Use "Visualize All Functions" instead of entire file
2. Clear saved diagrams: Delete `.dad/` folder
3. Check Output panel for specific errors

## Uninstalling

### Via VSCode:
1. Extensions view → Find "DAD" → Uninstall

### Via Command Line:
```bash
code --uninstall-extension dad
```

### Clean Up Files:
```bash
# Remove saved diagrams
rm -rf .dad/
```

## Updates

Install new versions by:
1. Uninstalling the current version
2. Installing the new `.vsix` file
3. Reloading VSCode

## Full System Setup

For complete setup including:
- CLI tool installation
- Cloudflare Workers deployment
- R2 storage configuration
- KV cache setup
- Development environment

See the **[Complete Setup Guide](docs/setup/SETUP.md)**

## Additional Resources

- **[Quick Start Guide](QUICK_START.md)** - Common commands and workflows
- **[VSCode Extension README](apps/vscode-extension/README.md)** - Detailed extension documentation
- **[Main README](README.md)** - Project overview

## Support

- **Output Panel**: `View` → `Output` → "Claude Flow Visualizer"
- **Developer Tools**: `Help` → `Toggle Developer Tools`
- **Issues**: File issues on GitHub with error logs and reproduction steps