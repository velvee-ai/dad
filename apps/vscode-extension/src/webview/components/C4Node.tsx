import React, { memo, useState } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import {
  getNodeColors, getNodeSize, getFontSizes, getNodeShadow,
  getBorderRadius, C4_SHADOWS, C4_ANIMATIONS,
} from '../designTokens';
import { getC4TypeIcon, getTechBadgeIcon, DrillDownIcon } from '../c4Icons';

export interface C4NodeData {
  label: string;
  c4Level: 'landscape' | 'context' | 'container' | 'component' | 'code';
  c4Type: 'landscape' | 'softwareSystem' | 'person' | 'externalSystem' | 'container' | 'dataStore' | 'component' | 'codeUnit';
  technology?: string;
  description?: string;
  childCount?: number;
  collapsed?: boolean;
  isExternal?: boolean;
  tags?: string[];
  onToggleCollapse?: () => void;
  onNodeClick?: () => void;
}

const C4Node: React.FC<NodeProps<C4NodeData>> = ({ data }) => {
  const [hovered, setHovered] = useState(false);

  const colors = getNodeColors(data.c4Level, data.c4Type, data.isExternal);
  const size = getNodeSize(data.c4Level, data.collapsed);
  const fonts = getFontSizes(data.c4Level);
  const shadow = hovered ? C4_SHADOWS.hover : getNodeShadow(data.c4Level);
  const borderRadius = getBorderRadius(data.c4Type);
  const isExternal = data.isExternal || data.c4Type === 'externalSystem';
  const isPerson = data.c4Type === 'person';
  const isDataStore = data.c4Type === 'dataStore';
  const hasChildren = (data.childCount || 0) > 0;

  // Person shape: taller, narrower
  const personSize = isPerson ? { width: 130, height: 160 } : null;
  const nodeWidth = personSize?.width || size.width;
  const nodeHeight = personSize?.height || size.height;

  const handleColor = colors.accent;

  return (
    <div
      style={{
        width: `${nodeWidth}px`,
        minHeight: `${nodeHeight}px`,
        background: isPerson
          ? `linear-gradient(180deg, ${colors.bg} 0%, ${colors.bgLight} 100%)`
          : isDataStore
            ? colors.bg
            : `linear-gradient(135deg, ${colors.bg} 0%, ${colors.bgLight} 100%)`,
        border: `2px ${isExternal ? 'dashed' : 'solid'} ${colors.border}`,
        borderRadius,
        cursor: 'pointer',
        fontFamily: 'var(--vscode-font-family, -apple-system, sans-serif)',
        color: colors.text,
        transition: `all ${C4_ANIMATIONS.nodeHover.duration}ms ${C4_ANIMATIONS.nodeHover.easing}`,
        boxShadow: shadow,
        transform: hovered ? 'scale(1.02)' : 'scale(1)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        position: 'relative',
      }}
      onDoubleClick={() => data.onToggleCollapse?.()}
      onClick={() => data.onNodeClick?.()}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Handles */}
      <Handle type="target" position={Position.Top}
        style={{ background: handleColor, width: 8, height: 8, border: `2px solid ${colors.bg}` }} />
      <Handle type="source" position={Position.Bottom}
        style={{ background: handleColor, width: 8, height: 8, border: `2px solid ${colors.bg}` }} />
      <Handle type="target" position={Position.Left} id="left-target"
        style={{ background: handleColor, width: 6, height: 6, border: `2px solid ${colors.bg}`, opacity: 0.6 }} />
      <Handle type="source" position={Position.Right} id="right-source"
        style={{ background: handleColor, width: 6, height: 6, border: `2px solid ${colors.bg}`, opacity: 0.6 }} />

      {/* DataStore: cylinder top cap */}
      {isDataStore && (
        <div style={{
          height: '14px',
          background: colors.bgLight,
          borderRadius: '50%',
          marginTop: '-1px',
          marginLeft: '-1px',
          marginRight: '-1px',
          border: `1px solid ${colors.border}`,
          flexShrink: 0,
        }} />
      )}

      {/* Main content area */}
      <div style={{ padding: data.c4Level === 'code' ? '8px 10px' : '12px 16px', flex: 1 }}>

        {/* Person: centered icon */}
        {isPerson && !data.collapsed && (
          <div style={{
            display: 'flex',
            justifyContent: 'center',
            marginBottom: '8px',
            opacity: 0.9,
          }}>
            {getC4TypeIcon(data.c4Type, 36, colors.text)}
          </div>
        )}

        {/* Header row: icon + label */}
        <div style={{
          display: 'flex',
          alignItems: isPerson ? 'center' : 'flex-start',
          justifyContent: isPerson ? 'center' : 'space-between',
          gap: '8px',
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            flex: 1,
            minWidth: 0,
          }}>
            {!isPerson && (
              <span style={{ flexShrink: 0, opacity: 0.85 }}>
                {getC4TypeIcon(data.c4Type, data.c4Level === 'landscape' ? 22 : 18, colors.text)}
              </span>
            )}
            <span style={{
              fontSize: `${fonts.title}px`,
              fontWeight: 600,
              letterSpacing: '-0.01em',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: data.collapsed ? 'nowrap' : 'normal',
              lineHeight: 1.2,
              textAlign: isPerson ? 'center' : 'left',
              fontFamily: data.c4Type === 'codeUnit'
                ? 'var(--vscode-editor-font-family, monospace)'
                : 'inherit',
            }}>
              {data.label}
            </span>
          </div>
        </div>

        {/* C4 type label */}
        {!data.collapsed && (
          <div style={{
            fontSize: `${fonts.body}px`,
            opacity: 0.55,
            marginTop: '2px',
            textTransform: 'lowercase',
            letterSpacing: '0.02em',
            textAlign: isPerson ? 'center' : 'left',
          }}>
            [{data.c4Type === 'softwareSystem' ? 'Software System'
              : data.c4Type === 'externalSystem' ? 'External System'
              : data.c4Type === 'dataStore' ? 'Data Store'
              : data.c4Type === 'codeUnit' ? 'Code'
              : data.c4Type}]
          </div>
        )}

        {/* Technology badge */}
        {data.technology && !data.collapsed && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            marginTop: '6px',
            justifyContent: isPerson ? 'center' : 'flex-start',
          }}>
            {getTechBadgeIcon(data.technology, 14)}
            <span style={{
              fontSize: `${fonts.subtitle}px`,
              padding: '1px 8px',
              background: `${colors.accent}33`,
              border: `1px solid ${colors.accent}55`,
              borderRadius: '10px',
              display: 'inline-block',
              letterSpacing: '0.01em',
            }}>
              {data.technology}
            </span>
          </div>
        )}

        {/* Description */}
        {data.description && !data.collapsed && (
          <div style={{
            fontSize: `${fonts.body}px`,
            marginTop: '8px',
            opacity: 0.7,
            lineHeight: 1.35,
            maxHeight: '38px',
            overflow: 'hidden',
            textAlign: isPerson ? 'center' : 'left',
          }}>
            {data.description.length > 120
              ? data.description.substring(0, 117) + '...'
              : data.description}
          </div>
        )}

        {/* Child count + drill-down indicator */}
        {hasChildren && !data.collapsed && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            marginTop: '8px',
            fontSize: `${fonts.body}px`,
            opacity: hovered ? 0.9 : 0.5,
            transition: `opacity ${C4_ANIMATIONS.nodeHover.duration}ms`,
            justifyContent: isPerson ? 'center' : 'flex-start',
          }}>
            <DrillDownIcon size={12} color={colors.text} />
            <span>
              {data.childCount} {data.childCount === 1 ? 'item' : 'items'}
            </span>
          </div>
        )}
      </div>

      {/* Hover border glow */}
      {hovered && (
        <div style={{
          position: 'absolute',
          inset: -2,
          borderRadius,
          border: `2px solid ${colors.accent}`,
          pointerEvents: 'none',
          opacity: 0.6,
        }} />
      )}
    </div>
  );
};

export default memo(C4Node);
