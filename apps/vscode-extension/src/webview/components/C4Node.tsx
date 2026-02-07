/**
 * C4Node — Generic Glassmorphic Card Renderer
 *
 * Reads all visual properties from data.style (resolved by the adapter).
 * Zero type-specific branches — shape, badge, icon, and accent are
 * fully determined upstream by the theme + adapter.
 */
import React, { memo, useState } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import type { VisualNodeData } from '../adapter/c4VisualModel';
import { getC4TypeIcon, getTechBadgeIcon, DrillDownIcon } from '../c4Icons';

const C4Node: React.FC<NodeProps<VisualNodeData>> = ({ data, selected }) => {
  const [hovered, setHovered] = useState(false);
  const s = data.style;
  const hasChildren = data.childCount > 0;

  return (
    <div
      style={{
        width: `${s.width}px`,
        minHeight: `${s.height}px`,
        background: s.background,
        backdropFilter: s.backdropFilter,
        WebkitBackdropFilter: s.backdropFilter,
        border: `${s.borderWidth}px ${s.borderStyle} ${hovered ? s.hoverBorderColor : s.borderColor}`,
        borderRadius: s.borderRadius,
        color: s.textColor,
        fontFamily: s.fontFamily,
        boxShadow: selected ? s.selectedRing : hovered ? s.hoverShadow : s.shadow,
        transform: hovered ? `scale(${s.hoverScale})` : 'scale(1)',
        transition: `all ${s.transitionDuration}ms ${s.transitionEasing}`,
        position: 'relative',
        overflow: 'hidden',
        cursor: 'pointer',
        display: 'flex',
        flexDirection: 'column',
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Handles */}
      <Handle type="target" position={Position.Top}
        style={{ background: s.accentColor, width: 6, height: 6, border: 'none', opacity: 0.7 }} />
      <Handle type="source" position={Position.Bottom}
        style={{ background: s.accentColor, width: 6, height: 6, border: 'none', opacity: 0.7 }} />
      <Handle type="target" position={Position.Left} id="left-target"
        style={{ background: s.accentColor, width: 5, height: 5, border: 'none', opacity: 0.5 }} />
      <Handle type="source" position={Position.Right} id="right-source"
        style={{ background: s.accentColor, width: 5, height: 5, border: 'none', opacity: 0.5 }} />

      {/* Store card: cylinder top cap */}
      {s.shapeConfig.topCap && (
        <div style={{
          height: '14px',
          background: `${s.accentColor}22`,
          borderRadius: '50%',
          marginTop: '-1px',
          marginLeft: '-1px',
          marginRight: '-1px',
          border: `1px solid ${s.accentColor}44`,
          flexShrink: 0,
        }} />
      )}

      {/* Top-edge accent glow */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: '60px',
        background: `radial-gradient(60% 60% at 50% 0%, ${s.glowColor}, transparent)`,
        pointerEvents: 'none',
        zIndex: 0,
      }} />

      {/* Main content */}
      <div style={{ padding: s.contentPadding, position: 'relative', zIndex: 1, flex: 1 }}>

        {/* Row 1: Badge chip (left) + Tech icon (right) */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}>
          {/* Badge chip */}
          {s.badgeConfig.show && (
            <span style={{
              fontSize: `${s.fontSizes.chip}px`,
              fontWeight: 600,
              padding: '2px 8px',
              borderRadius: '6px',
              background: `${s.accentColor}22`,
              border: `1px solid ${s.accentColor}44`,
              color: s.accentColor,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              lineHeight: 1.4,
            }}>
              {s.iconConfig.typeIcon.position === 'badge-left' &&
                getC4TypeIcon(data.c4Type, s.iconConfig.typeIcon.size, s.accentColor)}
              {s.badgeConfig.text}
            </span>
          )}

          {/* Tech icon (top-right) */}
          {s.iconConfig.techIcon.position === 'header-right' && data.technology && !data.collapsed && (
            <span style={{ flexShrink: 0, opacity: 0.9 }}>
              {getTechBadgeIcon(data.technology, s.iconConfig.techIcon.size)}
            </span>
          )}
        </div>

        {/* Row 2: Title */}
        <div style={{
          fontSize: `${s.fontSizes.title}px`,
          fontWeight: 650,
          marginTop: '10px',
          lineHeight: 1.2,
          letterSpacing: '-0.01em',
          color: s.textColor,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: data.collapsed ? 'nowrap' : 'normal',
          textAlign: s.textAlign,
        }}>
          {data.label}
        </div>

        {/* Row 3: Description (max 2 lines) */}
        {data.description && !data.collapsed && (
          <div style={{
            fontSize: `${s.fontSizes.body}px`,
            marginTop: '6px',
            color: s.textColorSecondary,
            lineHeight: 1.35,
            maxHeight: '36px',
            overflow: 'hidden',
            textAlign: s.textAlign,
          }}>
            {data.description.length > 120
              ? data.description.substring(0, 117) + '...'
              : data.description}
          </div>
        )}

        {/* Row 4: Meta row — technology info (when not header-right) */}
        {data.technology && !data.collapsed && s.iconConfig.techIcon.position !== 'header-right' && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            marginTop: '10px',
            fontSize: `${s.fontSizes.meta}px`,
            color: s.textColorTertiary,
          }}>
            {s.iconConfig.techIcon.position === 'meta-row' &&
              getTechBadgeIcon(data.technology, s.iconConfig.techIcon.size)}
            <span>{data.technology}</span>
          </div>
        )}

        {/* Technology as subtle text (when icon is header-right) */}
        {data.technology && !data.collapsed && s.iconConfig.techIcon.position === 'header-right' && (
          <div style={{
            marginTop: '6px',
            fontSize: `${s.fontSizes.meta}px`,
            color: s.textColorTertiary,
          }}>
            {data.technology}
          </div>
        )}

        {/* Row 5: Drill-down button */}
        {hasChildren && !data.collapsed && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              window.dispatchEvent(new CustomEvent('c4-drill-down', {
                detail: { nodeId: data.dadNodeId },
              }));
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '5px',
              marginTop: '10px',
              padding: '4px 10px',
              fontSize: `${s.fontSizes.meta}px`,
              color: s.accentColor,
              background: `${s.accentColor}15`,
              border: `1px solid ${s.accentColor}33`,
              borderRadius: '8px',
              cursor: 'pointer',
              opacity: hovered ? 1 : 0.6,
              transition: `all ${s.transitionDuration}ms`,
              fontFamily: 'inherit',
            }}
          >
            <DrillDownIcon size={14} color={s.accentColor} />
            <span>
              Explore {data.childCount} {data.childCount === 1 ? 'item' : 'items'}
            </span>
          </button>
        )}
      </div>

      {/* Hover border glow */}
      {hovered && (
        <div style={{
          position: 'absolute',
          inset: -1,
          borderRadius: s.borderRadius,
          border: `1px solid ${s.accentColor}66`,
          pointerEvents: 'none',
          zIndex: 2,
        }} />
      )}
    </div>
  );
};

export default memo(C4Node);
