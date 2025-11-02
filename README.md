# Claude Flow Visualizer

A VSCode extension that visualizes code flow using Claude Code and React Flow.

## Features

- Select any code in your editor
- Right-click and choose "Visualize Code Flow with Claude"
- Claude analyzes your code and generates a flow chart
- Interactive visualization with React Flow

## Prerequisites

1. **Claude Code CLI** must be installed and available in your PATH
   - Install Claude Code from [claude.com/claude-code](https://claude.com/claude-code)
   - Make sure you can run `claude` from your terminal

2. **VSCode** version 1.74.0 or higher

## Installation

### Development Mode

1. Clone this repository
2. Install dependencies:
   ```bash
   npm install
   ```

3. Build the extension:
   ```bash
   npm run compile
   ```

4. Open the project in VSCode

5. Press `F5` to run the extension in a new Extension Development Host window

## Usage

1. Open any code file in VSCode
2. Select the code you want to visualize (e.g., a function)
3. Right-click on the selection
4. Choose "Visualize Code Flow with Claude" from the context menu
5. Wait for Claude to analyze the code
6. View the interactive flow chart in the side panel

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
react-flow-research/
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

### Extension not activating

1. Make sure you have selected code before right-clicking
2. Check that the extension is enabled in the Extensions panel

## Known Limitations

- Requires Claude Code CLI to be installed separately
- Large code selections may take longer to process
- Complex nested structures might need manual node repositioning

## Contributing

Contributions are welcome! Please feel free to submit issues or pull requests.

## License

ISC