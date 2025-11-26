# DAAD - Diagram Editing Guide

## Overview
DAAD (Diagram as a Delivery) now supports full diagram editing capabilities. You can modify, enhance, and reorganize the flow charts generated from your code.

## Features

### 🎯 Two Modes of Operation

#### View Mode (Default)
- Clean, read-only visualization
- Optimized for understanding code flow
- No accidental modifications
- Minimal UI clutter

#### Edit Mode
- Full diagram manipulation
- Add/remove nodes and connections
- Reposition elements
- Auto-layout capabilities
- Save/reset functionality

## How to Use

### 1. Generate a Diagram
```bash
# Select code in VS Code
# Run command: "Claude Flow: Visualize Selection"
# Or right-click → "Visualize Code Flow"
```

### 2. Enter Edit Mode
Click the **"👁️ Viewing"** button in the toolbar to switch to **"📝 Editing"** mode.

### 3. Available Edit Operations

#### **Add Node** (➕)
- Click "Add Node" button
- New node appears automatically positioned
- Drag to desired location
- Connect to other nodes by dragging from handles

#### **Delete Elements** (🗑️)
- Select nodes/edges by clicking
- Multi-select with Ctrl/Cmd+Click
- Click "Delete" button
- Selected elements show count in toolbar

#### **Reposition Nodes**
- In edit mode, drag any node to new position
- Grid snapping helps alignment
- Changes are tracked automatically

#### **Create Connections**
- Hover over source node to see handles
- Drag from handle to target node
- Connection type auto-determined

#### **Auto Layout** (🔄)
- Click to reorganize entire diagram
- Uses dagre algorithm for optimal spacing
- Respects hierarchical relationships
- Choice of vertical (TB) or horizontal (LR) layouts

#### **Save Changes** (💾)
- Saves edited diagram to storage
- Preserves both original and edited versions
- Updates `.daad` folder with new version
- Shows success notification

#### **Reset Changes** (↩️)
- Discards all unsaved edits
- Returns to last saved state
- Useful for experimentation

### 4. Keyboard Shortcuts (In Edit Mode)
- `Delete/Backspace` - Delete selected elements
- `Ctrl/Cmd+A` - Select all nodes
- `Escape` - Deselect all

## Architecture

### Hybrid Approach
The extension uses a smart hybrid architecture:

1. **Initial Generation** → Server-side layout (consistent, fast)
2. **User Edits** → Client-side manipulation (interactive)
3. **Layout Operations** → Lazy-loaded dagre (optimized bundle)

### Storage Structure
```json
{
  "id": "unique_id",
  "flowChart": { /* current version */ },
  "editHistory": {
    "originalGenerated": { /* Claude's version */ },
    "userEdited": { /* Your modifications */ },
    "lastModified": 1234567890,
    "editCount": 3
  }
}
```

## Advanced Features

### Smart Layout Detection
The layout engine automatically detects:
- **Branches** - Increases spacing for decision trees
- **Parallel Flows** - Optimizes for split-merge patterns
- **Linear Flows** - Suggests horizontal layout for long sequences
- **Complex Networks** - Applies hierarchical organization

### Position Preservation
When using auto-layout:
- Manually positioned nodes can be preserved
- Relative relationships maintained
- New nodes intelligently placed

### Edit History
Every diagram maintains:
- Original Claude-generated version
- User modifications
- Edit count and timestamps
- Ability to revert to original

## Best Practices

### For Code Analysis
1. Start with Claude's auto-generated layout
2. Use edit mode to highlight important paths
3. Group related nodes visually
4. Add emphasis to critical decision points

### For Documentation
1. Simplify complex flows by removing less important nodes
2. Reposition for clarity
3. Save multiple versions for different audiences
4. Export clean diagrams for documentation

### For Debugging
1. Trace execution paths
2. Highlight error conditions
3. Mark validated vs. unvalidated paths
4. Save debug-annotated versions

## Performance Considerations

### Bundle Size
- Base viewer: ~300KB
- With edit capabilities: ~383KB
- Dagre loaded on-demand (lazy loading)
- Minimal impact on initial load

### Large Diagrams
- 100+ nodes handled smoothly
- Auto-layout optimized for performance
- Virtualization for extreme cases (future)

## Troubleshooting

### Changes Not Saving?
- Ensure you're in edit mode
- Check for unsaved indicator
- Verify `.daad` folder permissions

### Layout Issues?
- Try auto-layout button
- Reset and try different approach
- Check for disconnected nodes

### Performance Slow?
- Reduce node count if possible
- Close other panels
- Consider chunking large files

## Future Enhancements

### Coming Soon
- [ ] Undo/Redo functionality
- [ ] Node property editing
- [ ] Custom node colors/styles
- [ ] Export as SVG/PNG
- [ ] Collaborative editing
- [ ] Layout presets
- [ ] Node grouping/clustering
- [ ] Search within diagram
- [ ] Annotations and comments
- [ ] Diagram templates

## Tips & Tricks

### Quick Reorganization
1. Enter edit mode
2. Select all (Ctrl+A)
3. Click Auto Layout
4. Fine-tune individual nodes

### Creating Sub-flows
1. Add new nodes for sub-processes
2. Connect with different edge types
3. Use spatial grouping for clarity

### Emphasizing Critical Paths
1. Position critical nodes centrally
2. Use straight connections for main flow
3. Push alternative paths to sides

## Feedback & Support

Found a bug or have a feature request?
- Open an issue on GitHub
- Include diagram JSON if relevant
- Describe expected vs. actual behavior

---

*Happy diagramming! 🎨*