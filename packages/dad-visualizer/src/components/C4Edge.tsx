/**
 * C4Edge — Icicle-themed edge renderer with flow animation
 *
 * Reads all visual properties from data.style (resolved by the adapter).
 * Supports animated dash offset for async/streaming edges.
 */
import React, { memo, useState } from 'react';
import {
  EdgeProps,
  getBezierPath,
  EdgeLabelRenderer,
} from 'reactflow';
import type { VisualEdgeData } from '../adapter/c4VisualModel';

const C4Edge: React.FC<EdgeProps<VisualEdgeData>> = ({
  id,
  sourceX, sourceY,
  targetX, targetY,
  sourcePosition,
  targetPosition,
  data,
  label,
  markerEnd,
}) => {
  const [hovered, setHovered] = useState(false);

  const style = data?.style;
  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX, sourceY,
    targetX, targetY,
    sourcePosition,
    targetPosition,
  });

  const displayLabel = label || data?.label || '';
  const techLabel = data?.technology ? ` [${data.technology}]` : '';

  // Fallback styling if adapter data missing
  const strokeColor = style?.strokeColor || 'rgba(255,255,255,0.35)';
  const strokeWidth = style?.strokeWidth || 1.5;
  const strokeDasharray = style?.strokeDasharray === 'none' ? undefined : style?.strokeDasharray;
  const animated = style?.animated || false;
  const hoverStrokeWidth = style?.hoverStrokeWidth || strokeWidth + 1;
  const labelBg = style?.labelBackground || 'rgba(10,16,26,0.62)';
  const labelBorder = style?.labelBorderColor || 'rgba(255,255,255,0.16)';
  const labelText = style?.labelTextColor || 'rgba(255,255,255,0.92)';
  const glowColor = style?.glowColor || 'transparent';

  return (
    <>
      {/* Invisible wider path for easier hover detection */}
      <path
        d={edgePath}
        fill="none"
        stroke="transparent"
        strokeWidth={20}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      />

      {/* Visible edge path */}
      <path
        id={id}
        d={edgePath}
        fill="none"
        stroke={strokeColor}
        strokeWidth={hovered ? hoverStrokeWidth : strokeWidth}
        strokeDasharray={strokeDasharray}
        strokeOpacity={hovered ? 1 : 0.7}
        markerEnd={markerEnd}
        style={{
          transition: 'all 200ms ease-out',
          ...(animated ? {
            animation: `c4EdgeFlow ${style?.animationDuration || '1.8s'} linear infinite`,
          } : {}),
        }}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      />

      {/* Hover glow effect */}
      {hovered && (
        <path
          d={edgePath}
          fill="none"
          stroke={glowColor}
          strokeWidth={strokeWidth + 4}
          strokeDasharray={strokeDasharray}
          strokeOpacity={0.3}
          style={{ pointerEvents: 'none' }}
        />
      )}

      {/* Edge label */}
      {displayLabel && (
        <EdgeLabelRenderer>
          <div
            style={{
              position: 'absolute',
              transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
              pointerEvents: 'all',
              fontSize: hovered ? '11px' : '10px',
              fontFamily: 'Inter, system-ui, sans-serif',
              background: labelBg,
              color: labelText,
              padding: '2px 8px',
              borderRadius: '8px',
              border: `1px solid ${labelBorder}`,
              whiteSpace: 'nowrap',
              opacity: hovered ? 1 : 0.75,
              maxWidth: hovered ? '300px' : '180px',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              transition: 'all 200ms ease-out',
              boxShadow: hovered ? `0 2px 8px ${glowColor}` : 'none',
              backdropFilter: 'blur(8px)',
              WebkitBackdropFilter: 'blur(8px)',
            }}
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
          >
            {displayLabel}
            {hovered && techLabel && (
              <span style={{ opacity: 0.6, fontSize: '9px' }}>{techLabel}</span>
            )}
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
};

export default memo(C4Edge);
