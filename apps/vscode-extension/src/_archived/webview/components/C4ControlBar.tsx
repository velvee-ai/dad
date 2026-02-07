/**
 * C4ControlBar — Icicle-themed control toolbar for C4 Architecture View
 *
 * Features:
 * - Node search (filter/highlight by label)
 * - Zoom in / zoom out / fit view
 * - C4 level quick-nav (landscape → context → container → component → code)
 */
import React, { memo, useState, useCallback, useRef, useEffect } from 'react';
import type { Node } from 'reactflow';

interface C4ControlBarProps {
  allNodes: Node[];
  currentScope: string | null;
  onDrillDown: (nodeId: string) => void;
  onDrillToRoot: () => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onFitView: () => void;
  onFocusNode: (nodeId: string) => void;
}

const GLASS = {
  bg: 'rgba(255,255,255,0.06)',
  border: 'rgba(255,255,255,0.14)',
  borderStrong: 'rgba(255,255,255,0.22)',
  text: 'rgba(255,255,255,0.92)',
  textDim: 'rgba(255,255,255,0.52)',
  accent: '#4FE9FF',
};

const C4_LEVELS = [
  { key: 'landscape', label: 'L0', title: 'Landscape' },
  { key: 'context', label: 'L1', title: 'Context' },
  { key: 'container', label: 'L2', title: 'Container' },
  { key: 'component', label: 'L3', title: 'Component' },
  { key: 'code', label: 'L4', title: 'Code' },
];

const C4ControlBar: React.FC<C4ControlBarProps> = ({
  allNodes, currentScope, onDrillDown, onDrillToRoot,
  onZoomIn, onZoomOut, onFitView, onFocusNode,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Node[]>([]);
  const [showResults, setShowResults] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);

  // Search nodes
  const handleSearch = useCallback((query: string) => {
    setSearchQuery(query);
    if (query.length < 2) {
      setSearchResults([]);
      setShowResults(false);
      return;
    }
    const q = query.toLowerCase();
    const results = allNodes.filter(n => {
      const label = (n.data?.label || '').toLowerCase();
      const tech = (n.data?.technology || '').toLowerCase();
      const type = (n.data?.c4Type || '').toLowerCase();
      return label.includes(q) || tech.includes(q) || type.includes(q);
    }).slice(0, 8);
    setSearchResults(results);
    setShowResults(results.length > 0);
  }, [allNodes]);

  // Click outside to close results
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (
        resultsRef.current && !resultsRef.current.contains(e.target as HTMLElement) &&
        searchRef.current && !searchRef.current.contains(e.target as HTMLElement)
      ) {
        setShowResults(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Find which C4 level the current scope is at
  const currentLevel = currentScope
    ? allNodes.find(n => n.id === currentScope)?.data?.c4Level || 'landscape'
    : 'landscape';

  // Find first node at each level (for quick-nav)
  const handleLevelNav = useCallback((level: string) => {
    if (level === 'landscape') {
      onDrillToRoot();
      return;
    }
    // Find a node that has children at the target level
    const targetLevelMap: Record<string, string> = {
      context: 'landscape',    // drill into landscape to see context
      container: 'context',     // drill into a context node to see containers
      component: 'container',   // drill into a container to see components
      code: 'component',        // drill into a component to see code
    };
    const parentLevel = targetLevelMap[level];
    if (!parentLevel) return;

    // Find a parent node at the right level that has children
    const parentNode = allNodes.find(n => {
      const nodeLevel = n.data?.c4Level;
      if (nodeLevel !== parentLevel && n.data?.c4Type !== parentLevel) return false;
      return allNodes.some(child => child.data?.parentId === n.id);
    });
    if (parentNode) {
      onDrillDown(parentNode.id);
    }
  }, [allNodes, onDrillDown, onDrillToRoot]);

  const handleResultClick = useCallback((node: Node) => {
    setShowResults(false);
    setSearchQuery('');
    // Find this node's parent and navigate there, then focus the node
    if (node.data?.parentId) {
      onDrillDown(node.data.parentId);
    }
    setTimeout(() => onFocusNode(node.id), 100);
  }, [onDrillDown, onFocusNode]);

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      padding: '6px 10px',
      background: GLASS.bg,
      backdropFilter: 'blur(14px)',
      WebkitBackdropFilter: 'blur(14px)',
      border: `1px solid ${GLASS.border}`,
      borderRadius: '12px',
      fontFamily: 'Inter, system-ui, sans-serif',
      fontSize: '11px',
      boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
    }}>

      {/* Search */}
      <div style={{ position: 'relative' }}>
        <input
          ref={searchRef}
          type="text"
          placeholder="Search nodes..."
          value={searchQuery}
          onChange={(e) => handleSearch(e.target.value)}
          onFocus={() => { if (searchResults.length > 0) setShowResults(true); }}
          style={{
            width: '140px',
            padding: '4px 8px 4px 26px',
            background: 'rgba(255,255,255,0.08)',
            border: `1px solid ${GLASS.border}`,
            borderRadius: '8px',
            color: GLASS.text,
            fontSize: '11px',
            fontFamily: 'inherit',
            outline: 'none',
          }}
        />
        {/* Search icon */}
        <svg width="12" height="12" viewBox="0 0 16 16" fill="none"
          style={{ position: 'absolute', left: '8px', top: '50%', transform: 'translateY(-50%)', opacity: 0.5 }}>
          <circle cx="7" cy="7" r="4.5" stroke={GLASS.textDim} strokeWidth="1.5" />
          <path d="M10.5 10.5L14 14" stroke={GLASS.textDim} strokeWidth="1.5" strokeLinecap="round" />
        </svg>

        {/* Search results dropdown */}
        {showResults && (
          <div ref={resultsRef} style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            marginTop: '4px',
            width: '240px',
            maxHeight: '240px',
            overflowY: 'auto',
            background: 'rgba(11,18,32,0.95)',
            backdropFilter: 'blur(14px)',
            border: `1px solid ${GLASS.border}`,
            borderRadius: '10px',
            boxShadow: '0 4px 16px rgba(0,0,0,0.4)',
            zIndex: 100,
          }}>
            {searchResults.map((node) => (
              <button
                key={node.id}
                onClick={() => handleResultClick(node)}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '2px',
                  width: '100%',
                  padding: '8px 12px',
                  background: 'transparent',
                  border: 'none',
                  borderBottom: `1px solid rgba(255,255,255,0.06)`,
                  color: GLASS.text,
                  cursor: 'pointer',
                  textAlign: 'left',
                  fontFamily: 'inherit',
                  fontSize: '11px',
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.08)';
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.background = 'transparent';
                }}
              >
                <span style={{ fontWeight: 600, fontSize: '12px' }}>{node.data?.label}</span>
                <span style={{ color: GLASS.textDim, fontSize: '10px' }}>
                  {node.data?.c4Type}{node.data?.technology ? ` \u00B7 ${node.data.technology}` : ''}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Separator */}
      <div style={{ width: '1px', height: '20px', background: GLASS.border }} />

      {/* C4 Level Navigation */}
      <div style={{ display: 'flex', gap: '2px' }}>
        {C4_LEVELS.map((level) => {
          const isActive = currentLevel === level.key ||
            (level.key === 'landscape' && currentScope === null);
          return (
            <button
              key={level.key}
              onClick={() => handleLevelNav(level.key)}
              title={level.title}
              style={{
                padding: '3px 8px',
                background: isActive ? `${GLASS.accent}22` : 'transparent',
                border: `1px solid ${isActive ? `${GLASS.accent}44` : 'transparent'}`,
                borderRadius: '6px',
                color: isActive ? GLASS.accent : GLASS.textDim,
                cursor: 'pointer',
                fontFamily: 'inherit',
                fontSize: '10px',
                fontWeight: isActive ? 600 : 400,
                transition: 'all 150ms',
              }}
            >
              {level.label}
            </button>
          );
        })}
      </div>

      {/* Separator */}
      <div style={{ width: '1px', height: '20px', background: GLASS.border }} />

      {/* Zoom Controls */}
      <div style={{ display: 'flex', gap: '2px' }}>
        <button onClick={onZoomOut} title="Zoom out"
          style={zoomBtnStyle}>
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
            <line x1="4" y1="8" x2="12" y2="8" stroke={GLASS.text} strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </button>
        <button onClick={onFitView} title="Fit view"
          style={zoomBtnStyle}>
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
            <rect x="2" y="2" width="12" height="12" rx="2" stroke={GLASS.text} strokeWidth="1.2" />
            <rect x="5" y="5" width="6" height="6" rx="1" fill={GLASS.text} opacity="0.3" />
          </svg>
        </button>
        <button onClick={onZoomIn} title="Zoom in"
          style={zoomBtnStyle}>
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
            <line x1="4" y1="8" x2="12" y2="8" stroke={GLASS.text} strokeWidth="1.5" strokeLinecap="round" />
            <line x1="8" y1="4" x2="8" y2="12" stroke={GLASS.text} strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </button>
      </div>
    </div>
  );
};

const zoomBtnStyle: React.CSSProperties = {
  padding: '4px',
  background: 'transparent',
  border: `1px solid transparent`,
  borderRadius: '6px',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  transition: 'all 150ms',
};

export default memo(C4ControlBar);
