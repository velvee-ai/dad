/**
 * C4Node — Dark Glass Card Renderer (Icicle v2)
 *
 * Neutral glass by default. Color lives in borders, icons, and motion only.
 * Gradient glow reserved for the selected/focused node.
 * Hover state: subtle border brighten + slight lift.
 */
import React, { memo, useState } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import type { VisualNodeData } from '../adapter/c4VisualModel';
import { getC4TypeIcon, getTechBadgeIcon, DrillDownIcon } from './c4Icons';

const C4Node: React.FC<NodeProps<VisualNodeData>> = ({ data, selected }) => {
  const [hovered, setHovered] = useState(false);
  const s = data.style;
  const hasChildren = data.childCount > 0;

  // Border: neutral default → brighten on hover → cyan icicle on selected
  const borderColor = selected
    ? '#4FE9FF'
    : hovered
      ? s.hoverBorderColor
      : s.borderColor;

  // Shadow: minimal default → subtle lift on hover → gradient glow on selected
  const boxShadow = selected
    ? s.selectedRing
    : hovered
      ? s.hoverShadow
      : s.shadow;

  return (
    <div
      style={{
        width: `${s.width}px`,
        minHeight: `${s.height}px`,
        background: s.background,
        backdropFilter: s.backdropFilter,
        WebkitBackdropFilter: s.backdropFilter,
        border: `${s.borderWidth}px ${s.borderStyle} ${borderColor}`,
        borderRadius: s.borderRadius,
        color: s.textColor,
        fontFamily: s.fontFamily,
        boxShadow,
        transform: hovered && !selected ? 'translateY(-1px)' : 'none',
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
        style={{ background: 'rgba(255,255,255,0.25)', width: 5, height: 5, border: 'none', opacity: 0.6 }} />
      <Handle type="source" position={Position.Bottom}
        style={{ background: 'rgba(255,255,255,0.25)', width: 5, height: 5, border: 'none', opacity: 0.6 }} />
      <Handle type="target" position={Position.Left} id="left-target"
        style={{ background: 'rgba(255,255,255,0.20)', width: 4, height: 4, border: 'none', opacity: 0.4 }} />
      <Handle type="source" position={Position.Right} id="right-source"
        style={{ background: 'rgba(255,255,255,0.20)', width: 4, height: 4, border: 'none', opacity: 0.4 }} />

      {/* Store card: cylinder top cap */}
      {s.shapeConfig.topCap && (
        <div style={{
          height: '12px',
          background: `${s.accentColor}18`,
          borderRadius: '50%',
          marginTop: '-1px',
          marginLeft: '-1px',
          marginRight: '-1px',
          border: `1px solid ${s.accentColor}30`,
          flexShrink: 0,
        }} />
      )}

      {/* Selected: cyan/blue icicle gradient glow */}
      {selected && (
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: '60px',
          background: 'radial-gradient(80% 120% at 50% 0%, rgba(79,233,255,0.22), rgba(47,247,199,0.08), transparent)',
          pointerEvents: 'none',
          zIndex: 0,
        }} />
      )}

      {/* Main content */}
      <div style={{ padding: s.contentPadding, position: 'relative', zIndex: 1, flex: 1 }}>

        {/* Row 1: Badge chip (left) + Tech icon (right) */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}>
          {/* Badge chip — neutral glass, accent color for text only */}
          {s.badgeConfig.show && (
            <span style={{
              fontSize: `${s.fontSizes.chip}px`,
              fontWeight: 600,
              padding: '2px 8px',
              borderRadius: '6px',
              background: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(255,255,255,0.10)',
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
            <span style={{ flexShrink: 0, opacity: 0.7 }}>
              {getTechBadgeIcon(data.technology, s.iconConfig.techIcon.size)}
            </span>
          )}

          {/* Status pill (Author Mode) */}
          {data.status === 'user-proposed' && (
            <span style={{
              fontSize: `${s.fontSizes.chip}px`,
              fontWeight: 500,
              padding: '1px 6px',
              borderRadius: '4px',
              background: 'rgba(180,180,180,0.12)',
              color: 'rgba(255,255,255,0.60)',
              lineHeight: 1.3,
            }}>
              Proposed
            </span>
          )}
          {data.status === 'agent-planned' && (
            <span style={{
              fontSize: `${s.fontSizes.chip}px`,
              fontWeight: 500,
              padding: '1px 6px',
              borderRadius: '4px',
              background: 'rgba(66,133,244,0.15)',
              color: 'rgba(100,170,255,0.90)',
              lineHeight: 1.3,
            }}>
              AI Planned
            </span>
          )}
        </div>

        {/* Row 2: Title */}
        <div style={{
          fontSize: `${s.fontSizes.title}px`,
          fontWeight: 600,
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

        {/* Row 5: Drill-down button — mint green for focus */}
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
              color: hovered ? 'rgba(47,247,199,0.95)' : 'rgba(47,247,199,0.75)',
              background: hovered ? 'rgba(47,247,199,0.10)' : 'rgba(47,247,199,0.06)',
              border: `1px solid ${hovered ? 'rgba(47,247,199,0.30)' : 'rgba(47,247,199,0.18)'}`,
              borderRadius: '8px',
              cursor: 'pointer',
              transition: `all ${s.transitionDuration}ms`,
              fontFamily: 'inherit',
            }}
          >
            <DrillDownIcon size={14} color={hovered ? 'rgba(47,247,199,0.95)' : 'rgba(47,247,199,0.75)'} />
            <span>
              Explore {data.childCount} {data.childCount === 1 ? 'item' : 'items'}
            </span>
          </button>
        )}
      </div>
    </div>
  );
};

export default memo(C4Node);
