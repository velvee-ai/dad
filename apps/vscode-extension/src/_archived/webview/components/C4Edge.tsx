/**
 * C4Edge — Icicle v2 Edge Renderer
 *
 * Sync edges: solid gray, quiet.
 * Async edges: dashed cyan, animated.
 * Hover: subtle glow + expanded label.
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

  // Fallback styling
  const strokeColor = style?.strokeColor || 'rgba(255,255,255,0.28)';
  const strokeWidth = style?.strokeWidth || 1.2;
  const strokeDasharray = style?.strokeDasharray === 'none' ? undefined : style?.strokeDasharray;
  const animated = style?.animated || false;
  const hoverStrokeWidth = style?.hoverStrokeWidth || strokeWidth + 0.8;
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
        strokeOpacity={hovered ? 0.9 : 0.6}
        markerEnd={markerEnd}
        style={{
          transition: 'all 180ms ease-out',
          ...(animated ? {
            animation: `c4EdgeFlow ${style?.animationDuration || '2s'} linear infinite`,
          } : {}),
        }}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      />

      {/* Hover glow effect — subtle */}
      {hovered && (
        <path
          d={edgePath}
          fill="none"
          stroke={glowColor}
          strokeWidth={strokeWidth + 3}
          strokeDasharray={strokeDasharray}
          strokeOpacity={0.2}
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
              background: 'rgba(7,11,16,0.75)',
              color: 'rgba(255,255,255,0.70)',
              padding: '2px 8px',
              borderRadius: '8px',
              border: '1px solid rgba(255,255,255,0.08)',
              whiteSpace: 'nowrap',
              opacity: hovered ? 1 : 0.6,
              maxWidth: hovered ? '300px' : '180px',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              transition: 'all 180ms ease-out',
              backdropFilter: 'blur(8px)',
              WebkitBackdropFilter: 'blur(8px)',
            }}
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
          >
            {displayLabel}
            {hovered && techLabel && (
              <span style={{ opacity: 0.5, fontSize: '9px' }}>{techLabel}</span>
            )}
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
};

export default memo(C4Edge);
