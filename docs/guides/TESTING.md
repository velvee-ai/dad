# Testing the Claude Flow Visualizer Extension

Since F5 debugging might not work in all environments, here are alternative ways to test the extension:

## Method 1: Package and Install Locally (Recommended)

1. **Build the extension**:
   ```bash
   npm run compile
   ```

2. **Package the extension**:
   ```bash
   npm run package
   ```
   This creates a `.vsix` file (e.g., `claude-flow-visualizer-0.0.1.vsix`)

3. **Install the extension in VSCode**:

   Option A - Using command line:
   ```bash
   code --install-extension claude-flow-visualizer-0.0.1.vsix
   ```

   Option B - Using VSCode UI:
   - Open VSCode
   - Go to Extensions view (Cmd+Shift+X on Mac, Ctrl+Shift+X on Windows/Linux)
   - Click the "..." menu at the top of the Extensions view
   - Choose "Install from VSIX..."
   - Select the `claude-flow-visualizer-0.0.1.vsix` file

4. **Reload VSCode** (if prompted)

5. **Test the extension**:
   - Open `test-code.js` (or any code file)
   - Select a function or block of code
   - Right-click on the selection
   - Choose "Visualize Code Flow with Claude"

## Method 2: Using VSCode's Extension Development Host

1. **Open the project in VSCode**:
   ```bash
   code /Users/sathish/git/react-flow-research
   ```

2. **Open the Command Palette** (Cmd+Shift+P on Mac, Ctrl+Shift+P on Windows/Linux)

3. **Run the command**: "Tasks: Run Build Task"
   - This will start watching for changes

4. **Open a new terminal in VSCode** and run:
   ```bash
   code --extensionDevelopmentPath=/Users/sathish/git/react-flow-research
   ```
   This opens a new VSCode window with your extension loaded

## Method 3: Debug from Terminal

1. **Build the extension**:
   ```bash
   cd /Users/sathish/git/react-flow-research
   npm run compile
   ```

2. **Launch VSCode with the extension**:
   ```bash
   code --extensionDevelopmentPath=$(pwd) .
   ```

## Troubleshooting

### Extension not showing in context menu
- Make sure you have selected text before right-clicking
- Check that the extension is enabled in Extensions view
- Try reloading the VSCode window (Cmd+R or Ctrl+R in the developer tools)

### Claude Code not found error
- Ensure Claude Code CLI is installed
- Test by running `claude --version` in terminal
- If not installed, install from https://claude.com/claude-code

### Viewing extension logs
1. Open the Output panel (View > Output)
2. Select "Claude Flow Visualizer" from the dropdown
3. Check for any error messages

### Viewing developer console
- Open Developer Tools: Help > Toggle Developer Tools
- Check the Console tab for any JavaScript errors

## Uninstalling the test extension

If you installed the extension via VSIX:
1. Go to Extensions view
2. Find "Claude Flow Visualizer"
3. Click the gear icon > Uninstall

Or via command line:
```bash
code --uninstall-extension claude-flow.claude-flow-visualizer
```