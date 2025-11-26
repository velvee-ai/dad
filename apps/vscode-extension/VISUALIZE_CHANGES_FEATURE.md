# Visualize Changes Feature

## Overview

The "Visualize Changes" command allows developers to visualize uncommitted and staged changes in their git repository as flow diagrams.

## Usage

### Command Palette
1. Open the Command Palette (`Ctrl+Shift+P` or `Cmd+Shift+P`)
2. Type "DAAD: Visualize Changes"
3. Press Enter

### Keyboard Shortcut
- **Windows/Linux**: `Ctrl+Shift+G`
- **macOS**: `Cmd+Shift+G`

## Features

- **Automatic Change Detection**: Detects both staged and unstaged changes
- **Code Snippet Extraction**: Extracts changed code regions with context
- **Temp Commit SHA**: Generates a temporary commit SHA for uncommitted changes
- **Workers API Integration**: Optional integration with DAAD Workers API
- **Fallback to Local Analysis**: Uses Claude/OpenRouter if Workers API is not available

## Configuration

Add the Workers API URL in VSCode settings (optional):

```json
{
  "daad.workersApiUrl": "https://your-worker.workers.dev"
}
```

## Implementation Details

### Files Created

1. **apps/vscode-extension/src/extension/utils/git.ts**
   - Git utility functions for detecting and parsing changes
   - Change detection (staged, unstaged, untracked)
   - Diff parsing
   - Code snippet extraction
   - Temp commit SHA generation

2. **apps/vscode-extension/src/extension/commands/visualizeChanges.ts**
   - Main command implementation
   - Integration with Workers API
   - Fallback to local AI analysis
   - Progress reporting

3. **apps/vscode-extension/src/extension.ts** (modified)
   - Command registration
   - Integration with existing extension infrastructure

4. **apps/vscode-extension/package.json** (modified)
   - Command contribution
   - Keyboard shortcut binding
   - Configuration option for Workers API URL

## How It Works

1. **Change Detection**
   - Checks if the workspace is a git repository
   - Runs `git diff HEAD` to get all uncommitted changes
   - Parses the diff output to identify changed files and hunks

2. **Code Extraction**
   - For each changed file, extracts code snippets around changed regions
   - Adds context lines (±5 lines) for better understanding
   - Combines snippets into a single code block

3. **Diagram Generation**
   - If Workers API URL is configured, calls the preview API
   - Otherwise, uses the local Claude/OpenRouter client
   - Displays the generated flow diagram in the webview

4. **User Feedback**
   - Shows progress notifications
   - Displays change statistics (files, additions, deletions)
   - Shows appropriate error messages if something goes wrong

## Requirements

- Git repository
- Uncommitted or staged changes
- Claude Code CLI or OpenRouter API key (for local analysis)
- Optional: DAAD Workers API endpoint

## Limitations

- Requires git to be installed and available in PATH
- Large diffs (>10MB) may cause performance issues
- Binary files are skipped
- Deleted files are not included in visualization

## Future Enhancements

- Single-file change visualization
- Interactive change selection
- Diff-specific visualization modes
- Integration with PR previews
- Caching of change visualizations

## Error Handling

The command handles various error scenarios:

- Not a git repository → Shows error message
- No changes detected → Shows informational message
- Git command failures → Shows appropriate error
- API failures → Falls back to local analysis
- Network errors → Shows error with details

## Testing

To test the feature:

1. Make some changes to files in your git repository
2. Run the "DAAD: Visualize Changes" command
3. Verify that the changes are visualized correctly
4. Test with both staged and unstaged changes
5. Test with different file types
6. Test error cases (no git repo, no changes, etc.)

## See Also

- [VSCode Extension README](./README.md)
- [DAAD Workers API](../workers/README.md)
