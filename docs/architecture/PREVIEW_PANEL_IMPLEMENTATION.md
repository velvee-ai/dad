# Preview Panel UI Implementation

## Overview
This implementation creates a comprehensive React-based preview panel UI for displaying diagrams from uncommitted changes in the VSCode extension.

## Files Created

### 1. `apps/vscode-extension/src/webview/components/PreviewPanel.tsx`
The main preview panel component that displays:
- **List of changed files** with status indicators (added/modified/deleted)
- **Preview session information** including base branch, file count, and expiration time
- **Format toggle** to switch between JSON, D2, and Mermaid formats
- **Share Preview button** with URL copy functionality
- **Expiration countdown timer** that updates in real-time
- **Refresh capability** to reload the preview session
- **Side-by-side comparison view** for before/after changes

#### Key Features:
- Clean, VSCode-themed UI using VSCode CSS variables
- Responsive layout with sidebar and content area
- Auto-selection of first file on load
- Real-time countdown timer for session expiration
- One-click URL copying with feedback
- Format conversion for D2 and Mermaid diagram languages

### 2. `apps/vscode-extension/src/webview/components/DiagramDiff.tsx`
A specialized component for displaying differences between diagrams:
- **Change statistics** showing nodes/edges added, removed, and modified
- **Detailed change list** with visual indicators for each type of change
- **Side-by-side comparison** of base and current diagrams
- **Syntax highlighting** for different diagram formats
- **Smart diff algorithm** that handles:
  - Node additions, deletions, and modifications
  - Edge additions, deletions, and modifications
  - Label changes with "before" values shown

#### Key Features:
- Visual diff with color-coded changes
- Comprehensive statistics summary
- Support for all three export formats (JSON, D2, Mermaid)
- Intelligent comparison that handles renamed edges

### 3. `apps/vscode-extension/src/extension/providers/PreviewProvider.ts`
The VSCode webview provider that manages the preview panel:
- **Session management** for preview data
- **Message handling** between extension and webview
- **Refresh handler** support for reloading previews
- **Error and loading states** management
- **Singleton pattern** to prevent multiple panels

#### Key Features:
- Proper webview lifecycle management
- Secure content security policy
- Nonce-based script loading
- Disposable pattern for cleanup
- Type-safe message passing

### 4. `apps/vscode-extension/src/webview/PreviewApp.tsx`
A wrapper component for the preview panel with state management:
- Message handling from extension
- Loading and error states
- Session state management
- Refresh functionality

### 5. Updated `apps/vscode-extension/src/webview/index.tsx`
Enhanced entry point to support multiple webview types:
- Router logic to switch between visualizer and preview
- Data attribute-based view type detection
- Shared bundle for both webview types

### 6. Updated `apps/vscode-extension/src/shared/types.ts`
Added preview-related types:
- `ChangedFile` interface for file changes
- `PreviewSession` interface for session data
- Type-safe exports used across extension and webview

## UI Features Implemented

### ✅ Display list of changed files
- Sidebar with all changed files
- Status indicators (➕ added, 📝 modified, 🗑️ deleted)
- Click to select and view

### ✅ Show diagrams for each changed file
- Content area displays selected file's diagram
- Supports multiple export formats

### ✅ Add format toggle (JSON/D2/Mermaid view)
- Dropdown selector in toolbar
- Real-time format conversion
- Maintains selection across file switches

### ✅ Add comparison view (before/after)
- Toggle button to switch between current and diff view
- Only shown when base diagram is available
- Side-by-side layout with headers

### ✅ Add "Share Preview" button (copy URL)
- URL input field showing preview URL
- Copy button with success feedback
- Automatic clipboard integration

### ✅ Show preview expiration time
- Real-time countdown timer
- Format: "Xh Ym Zs"
- Visual indicator when expired

### ✅ Add refresh capability
- Refresh button in header
- Calls back to extension to reload data
- Loading state during refresh

## Technical Details

### Format Conversion
The implementation includes converters for three diagram formats:

1. **JSON**: Native format with pretty printing
2. **D2**: Converts to D2 syntax with shapes based on node types
3. **Mermaid**: Converts to Mermaid flowchart syntax with proper brackets

### Diff Algorithm
The DiagramDiff component implements a comprehensive diff algorithm:
- Compares nodes by ID and properties
- Tracks additions, deletions, and modifications
- Handles edge comparison with fallback to source-target matching
- Generates detailed statistics

### Styling
All components use VSCode theme variables:
- `--vscode-editor-background`
- `--vscode-editor-foreground`
- `--vscode-button-background`
- `--vscode-panel-border`
- And many more for consistent theming

### Type Safety
All components are fully typed with TypeScript:
- Shared types between extension and webview
- Interface definitions for all data structures
- Type-safe message passing

## Architecture

```
Extension Side:
└── PreviewProvider
    ├── Manages webview lifecycle
    ├── Handles session updates
    └── Processes messages from webview

Webview Side:
└── PreviewApp (Router)
    └── PreviewPanel
        ├── File list sidebar
        ├── Session info bar
        ├── Share section
        └── Content area
            ├── Format selector
            ├── Comparison toggle
            └── DiagramDiff (when comparing)
```

## Integration Points

### Extension Commands (to be added)
The following commands would integrate with this UI:
- `daad.createPreview` - Create preview session from uncommitted changes
- `daad.refreshPreview` - Refresh current preview
- `daad.openPreview` - Open preview panel

### Workers API Integration (future)
The preview URLs would be generated by the Workers API:
- `POST /api/previews` - Create preview session
- `GET /api/previews/:id` - Retrieve preview data
- Session expiration tracked server-side

## Acceptance Criteria

✅ **Displays all diagrams from preview session**
- Shows list of all changed files
- Renders diagrams in selected format

✅ **Can toggle between formats**
- JSON, D2, and Mermaid formats supported
- Dropdown selector for easy switching

✅ **Shows meaningful diff when comparison available**
- Side-by-side comparison view
- Detailed change statistics
- Visual indicators for changes

✅ **Copy preview URL works**
- One-click copy to clipboard
- Success feedback to user
- URL automatically selected

✅ **UI is responsive and intuitive**
- Clean, organized layout
- Consistent with VSCode design
- Clear visual hierarchy

✅ **Loading states are handled properly**
- Loading spinner during operations
- Error messages with helpful context
- Empty state when no session

## Next Steps

To complete the preview functionality:

1. **Create extension commands** to trigger preview creation
2. **Implement git integration** to detect changed files
3. **Add Workers API endpoints** for preview session management
4. **Implement diagram generation** for changed files
5. **Add base comparison** by generating diagrams for base branch
6. **Test integration** with real preview sessions

## Usage Example

```typescript
// In extension code
const provider = PreviewProvider.createOrShow(context.extensionUri);

const session: PreviewSession = {
  id: 'preview-123',
  url: 'https://daad.preview/preview-123',
  expiresAt: Date.now() + (24 * 60 * 60 * 1000), // 24 hours
  changedFiles: [
    {
      path: 'src/utils/helper.ts',
      status: 'modified',
      diagram: currentDiagram,
      baseDiagram: baseDiagram
    }
  ],
  baseBranch: 'main',
  createdAt: Date.now()
};

provider.updateSession(session);
```

## Dependencies

All required dependencies are already in package.json:
- React 18.3.1
- ReactFlow 11.11.4 (for diagram visualization)
- VSCode Extension API 1.74.0+

No additional dependencies needed for this implementation.
