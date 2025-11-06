import React, { useState } from 'react';
import { useReactFlow, useNodes, useEdges } from 'reactflow';
import LayoutSelector from './LayoutSelector';

interface EditToolbarProps {
  isEditMode: boolean;
  hasChanges: boolean;
  onAddNode: () => void;
  onDeleteSelected: () => void;
  onAutoLayout: (algorithm?: string) => void;
  onSave: () => void;
  onReset: () => void;
  onToggleEditMode: () => void;
  onUndo?: () => void;
  onRedo?: () => void;
  canUndo?: boolean;
  canRedo?: boolean;
}

const EditToolbar: React.FC<EditToolbarProps> = ({
  isEditMode,
  hasChanges,
  onAddNode,
  onDeleteSelected,
  onAutoLayout,
  onSave,
  onReset,
  onToggleEditMode,
  onUndo,
  onRedo,
  canUndo = false,
  canRedo = false
}) => {
  const { getNodes } = useReactFlow();
  const nodes = useNodes();
  const edges = useEdges();
  const [currentLayout, setCurrentLayout] = useState<string>('dagre');

  const selectedNodesCount = nodes.filter(n => n.selected).length;
  const selectedEdgesCount = edges.filter(e => e.selected).length;
  const hasSelection = selectedNodesCount > 0 || selectedEdgesCount > 0;

  const handleLayoutChange = (layoutId: string) => {
    setCurrentLayout(layoutId);
    onAutoLayout(layoutId);
  };

  const toolbarStyle: React.CSSProperties = {
    position: 'absolute',
    top: '10px',
    left: '10px',
    zIndex: 1000,
    background: 'var(--vscode-editor-background, #1e1e1e)',
    border: '1px solid var(--vscode-panel-border, #444)',
    borderRadius: '4px',
    padding: '8px',
    display: 'flex',
    gap: '8px',
    alignItems: 'center',
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.2)'
  };

  const buttonStyle: React.CSSProperties = {
    padding: '4px 8px',
    background: 'var(--vscode-button-background, #0e639c)',
    color: 'var(--vscode-button-foreground, white)',
    border: 'none',
    borderRadius: '2px',
    cursor: 'pointer',
    fontSize: '12px',
    fontFamily: 'var(--vscode-font-family)',
    transition: 'opacity 0.2s'
  };

  const secondaryButtonStyle: React.CSSProperties = {
    ...buttonStyle,
    background: 'var(--vscode-button-secondaryBackground, #3a3d41)'
  };

  const dangerButtonStyle: React.CSSProperties = {
    ...buttonStyle,
    background: 'var(--vscode-inputValidation-errorBackground, #5a1d1d)'
  };

  const disabledButtonStyle: React.CSSProperties = {
    ...buttonStyle,
    opacity: 0.5,
    cursor: 'not-allowed'
  };

  const separatorStyle: React.CSSProperties = {
    width: '1px',
    height: '20px',
    background: 'var(--vscode-panel-border, #444)',
    margin: '0 4px'
  };

  const indicatorStyle: React.CSSProperties = {
    fontSize: '11px',
    color: 'var(--vscode-foreground, #ccc)',
    padding: '0 8px'
  };

  return (
    <div style={toolbarStyle}>
      {/* Edit Mode Toggle */}
      <button
        style={isEditMode ? secondaryButtonStyle : buttonStyle}
        onClick={onToggleEditMode}
        title={isEditMode ? 'Exit Edit Mode' : 'Enter Edit Mode'}
      >
        {isEditMode ? '📝 Editing' : '👁️ Viewing'}
      </button>

      <div style={separatorStyle} />

      {/* Edit Controls - Only show when in edit mode */}
      {isEditMode && (
        <>
          <button
            style={buttonStyle}
            onClick={onAddNode}
            title="Add a new node"
          >
            ➕ Add Node
          </button>

          <button
            style={hasSelection ? dangerButtonStyle : disabledButtonStyle}
            onClick={onDeleteSelected}
            disabled={!hasSelection}
            title={`Delete selected (${selectedNodesCount} nodes, ${selectedEdgesCount} edges)`}
          >
            🗑️ Delete
          </button>

          <div style={separatorStyle} />

          {/* Undo/Redo Controls */}
          <button
            style={canUndo ? secondaryButtonStyle : disabledButtonStyle}
            onClick={onUndo}
            disabled={!canUndo}
            title="Undo (Cmd/Ctrl+Z)"
          >
            ↶ Undo
          </button>

          <button
            style={canRedo ? secondaryButtonStyle : disabledButtonStyle}
            onClick={onRedo}
            disabled={!canRedo}
            title="Redo (Cmd/Ctrl+Shift+Z)"
          >
            ↷ Redo
          </button>

          <div style={separatorStyle} />

          {/* Layout Selector */}
          <LayoutSelector
            currentLayout={currentLayout}
            onLayoutChange={handleLayoutChange}
            disabled={false}
          />

          <div style={separatorStyle} />

          <button
            style={hasChanges ? buttonStyle : disabledButtonStyle}
            onClick={onSave}
            disabled={!hasChanges}
            title="Save changes"
          >
            💾 Save
          </button>

          <button
            style={hasChanges ? secondaryButtonStyle : disabledButtonStyle}
            onClick={onReset}
            disabled={!hasChanges}
            title="Discard changes"
          >
            ↩️ Reset
          </button>

          {hasChanges && (
            <span style={indicatorStyle}>
              ● Unsaved changes
            </span>
          )}
        </>
      )}

      {/* Selection Info */}
      {isEditMode && hasSelection && (
        <>
          <div style={separatorStyle} />
          <span style={indicatorStyle}>
            Selected: {selectedNodesCount} nodes, {selectedEdgesCount} edges
          </span>
        </>
      )}

      {/* Node Count */}
      <div style={separatorStyle} />
      <span style={indicatorStyle}>
        {nodes.length} nodes, {edges.length} edges
      </span>
    </div>
  );
};

export default EditToolbar;