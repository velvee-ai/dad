# DAAD - Diagram as a Delivery

> Transform code into understanding. Instantly.

**DAAD** brings AI-powered diagram generation to your IDE. Select any piece of code and watch it transform into an interactive flow chart, powered by Claude AI and visualized with React Flow.

### 🎯 Philosophy
- **D**iagram **a**s **a** **D**elivery - Ship understanding, not just code
- **D**esign **a**s **a** **D**iagram - Think visually, code better
- **D**ata **a**s **a** **D**iagram - See the flow, grasp the logic

### ✨ Features
- 🤖 AI-powered analysis using Claude
- 🎨 Beautiful interactive flow charts
- 🚀 Works with any language
- ⚡ One-click visualization
- 📊 Real-time diagram generation

---

## 🚀 Microbus Framework Integration

This repository now includes the [Microbus Fabric](https://github.com/microbus-io/fabric) framework - a complete microservices development platform with observability, messaging, and deployment capabilities.

**Quick Start with Microbus:**
```bash
# Start infrastructure (NATS + Grafana)
cd setup && docker compose -f microbus.yaml -p microbus up -d

# Run the application
cd main && go run main.go

# Test the service
curl "http://localhost:8080/helloworld.example/?name=World"
```

📖 **[Full Microbus Setup Guide →](MICROBUS_SETUP.md)**

---

## Prerequisites

1. **Claude Code CLI** must be installed and available in your PATH
   - Install Claude Code from [claude.com/claude-code](https://claude.com/claude-code)
   - Make sure you can run `claude` from your terminal

2. **VSCode** version 1.74.0 or higher

## Installation

### From VSIX (Recommended)

1. Download the latest `.vsix` file from releases
2. Install via command line:
   ```bash
   code --install-extension daad-x.x.x.vsix
   ```
   Or install through VSCode:
   - Open Command Palette (Cmd/Ctrl+Shift+P)
   - Run "Extensions: Install from VSIX..."
   - Select the downloaded file

### Development Mode

1. Clone this repository:
   ```bash
   git clone https://github.com/velvee-ai/daad.git
   cd daad
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Build the extension:
   ```bash
   npm run compile
   ```

4. Open in VSCode and press `F5` to run

## Usage

### Multiple Ways to Visualize Code

#### 1. Smart Visualization (Auto-detect) - NEW!
- **Keyboard Shortcut**: `Cmd+Shift+V` (Mac) or `Ctrl+Shift+V` (Windows/Linux)
- **Right-click**: When cursor is in code (no selection)
- Automatically detects and visualizes the function/class at cursor position

#### 2. Visualize Selected Code
- Select specific code snippet
- Right-click → "Visualize Code Flow with Claude (Selection)"
- Perfect for custom code blocks or partial functions

#### 3. Visualize Entire File - NEW!
- **Command Palette**: "Claude Flow: Visualize Entire File"
- **Right-click in editor**: "Claude Flow: Visualize Entire File"
- **File Explorer**: Right-click on any code file
- Analyzes complete file structure and flow

#### 4. Visualize All Functions - NEW!
- **Command Palette**: "Claude Flow: Visualize All Functions"
- Shows a list of all functions/classes in the file
- Select individual functions or visualize all at once
- Each function gets its own saved flow chart

### View Saved Flow Charts
- **Explorer Sidebar**: Look for "Saved Flow Charts" section in the Explorer panel
- **Command Palette**: Use "Claude Flow: Open Saved Flow Charts" command
- **Click to Load**: Click any saved chart in the sidebar to instantly load it
- **Auto-save**: All charts are automatically saved to `.daad` folder

### Smart Features
- **Auto-detection**: Intelligently finds functions, classes, and methods
- **Large file handling**: Automatically suggests chunking or function-by-function analysis
- **Multi-language support**: Works with JS, TS, Python, Java, Go, Rust, C/C++, and more
- **VSCode integration**: Uses VSCode's built-in symbol detection for accuracy

### Storage Location
All flow charts are saved in the `.daad` folder in your workspace root:
- Each chart is saved as a `.daad.json` file
- Files include the flow chart data, code snippet, and metadata
- Charts are automatically named based on the code content and timestamp

## How it Works

1. **Code Selection**: The extension captures the selected code from your editor
2. **Claude Analysis**: Sends the code to Claude Code CLI with a structured prompt
3. **JSON Response**: Claude returns a flow chart structure as JSON
4. **React Flow Visualization**: The webview renders the flow chart using React Flow

## Supported Languages

Claude can analyze code in any language it understands, including:
- JavaScript/TypeScript
- Python
- Java
- C/C++
- Go
- Rust
- And many more!

## Flow Chart Node Types

- **Start** (Green, rounded): Entry point
- **Process** (Default style): Regular statements
- **Decision** (Orange, diamond): If/else conditions
- **Loop** (Blue, rounded): For/while loops
- **Call** (Purple, dashed): Function calls
- **Return** (Pink): Return statements
- **End** (Red, rounded): Exit point

## Development

### Project Structure

```
daad/
├── src/
│   ├── extension.ts           # Main extension entry
│   ├── extension/
│   │   ├── claude/           # Claude CLI integration
│   │   └── providers/        # Webview provider
│   ├── webview/              # React Flow app
│   │   ├── App.tsx           # Main React component
│   │   └── components/       # Custom nodes/edges
│   └── shared/               # Shared types
├── dist/                     # Compiled output
└── package.json              # Extension manifest
```

### Building

- **Development build**: `npm run watch`
- **Production build**: `npm run compile`
- **Package extension**: `npm run package`

## Troubleshooting

### Claude Code not found

If you get an error that Claude Code CLI is not found:
1. Ensure Claude Code is installed
2. Check that `claude` command works in your terminal
3. Restart VSCode after installation

### No flow chart displayed

If the flow chart doesn't appear:
1. Check the Output panel (View > Output) and select "Claude Flow Visualizer"
2. Look for any error messages
3. Ensure your code selection is valid

## Contributing

Contributions are welcome! Please feel free to submit issues or pull requests.

## License

ISC

## Credits

Built with ❤️ using:
- [Claude AI](https://claude.ai) for code analysis
- [React Flow](https://reactflow.dev) for visualization
- [VSCode Extension API](https://code.visualstudio.com/api)

---

**DAAD** - Making code visual, one diagram at a time.