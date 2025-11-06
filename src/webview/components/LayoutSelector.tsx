import React from 'react';

export interface LayoutOption {
  id: string;
  name: string;
  icon: string;
  description: string;
}

interface LayoutSelectorProps {
  currentLayout: string;
  onLayoutChange: (layoutId: string) => void;
  disabled?: boolean;
}

const LayoutSelector: React.FC<LayoutSelectorProps> = ({
  currentLayout,
  onLayoutChange,
  disabled = false
}) => {
  const layouts: LayoutOption[] = [
    {
      id: 'dagre',
      name: 'Hierarchical',
      icon: '🌳',
      description: 'Standard tree layout (fast)'
    },
    {
      id: 'elk-layered',
      name: 'Layered',
      icon: '📊',
      description: 'Advanced hierarchical layout'
    },
    {
      id: 'elk-force',
      name: 'Force',
      icon: '🔄',
      description: 'Organic network layout'
    },
    {
      id: 'elk-stress',
      name: 'Stress',
      icon: '⚡',
      description: 'Minimizes edge crossings'
    },
    {
      id: 'elk-mrtree',
      name: 'Tree',
      icon: '🌲',
      description: 'Optimized for tree structures'
    },
    {
      id: 'elk-radial',
      name: 'Radial',
      icon: '⭕',
      description: 'Circular/radial layout'
    },
    {
      id: 'smart',
      name: 'Smart Auto',
      icon: '🤖',
      description: 'Auto-select best algorithm'
    }
  ];

  const selectorStyle: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '8px',
    padding: '4px 8px',
    background: 'var(--vscode-dropdown-background, #3c3c3c)',
    border: '1px solid var(--vscode-dropdown-border, #555)',
    borderRadius: '2px',
    color: 'var(--vscode-dropdown-foreground, #ccc)',
    fontSize: '12px',
    fontFamily: 'var(--vscode-font-family)',
    cursor: disabled ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.5 : 1
  };

  const selectStyle: React.CSSProperties = {
    background: 'transparent',
    border: 'none',
    color: 'inherit',
    fontSize: 'inherit',
    fontFamily: 'inherit',
    cursor: 'inherit',
    outline: 'none',
    minWidth: '120px'
  };

  const labelStyle: React.CSSProperties = {
    fontSize: '11px',
    opacity: 0.8,
    marginRight: '4px'
  };

  return (
    <div style={selectorStyle}>
      <span style={labelStyle}>Layout:</span>
      <select
        value={currentLayout}
        onChange={(e) => onLayoutChange(e.target.value)}
        disabled={disabled}
        style={selectStyle}
        title="Choose layout algorithm"
      >
        {layouts.map(layout => (
          <option key={layout.id} value={layout.id}>
            {layout.icon} {layout.name}
          </option>
        ))}
      </select>
    </div>
  );
};

export default LayoutSelector;