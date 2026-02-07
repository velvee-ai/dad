/**
 * PlanReviewPanel — Side panel showing the agent's plan for review.
 *
 * Displayed when authorSession.mode === 'reviewing'.
 * Shows the markdown plan and approve/reject actions.
 */
import React, { useState } from 'react';

export interface PlanReviewPanelProps {
  plan: string;
  addedNodeCount: number;
  addedEdgeCount: number;
  onApprove: () => void;
  onReject: () => void;
  onClose: () => void;
}

const PlanReviewPanel: React.FC<PlanReviewPanelProps> = ({
  plan,
  addedNodeCount,
  addedEdgeCount,
  onApprove,
  onReject,
  onClose,
}) => {
  const [expanded, setExpanded] = useState(true);

  return (
    <div style={{
      position: 'absolute',
      top: 0,
      right: 0,
      width: expanded ? '420px' : '48px',
      height: '100%',
      background: 'rgba(7,11,16,0.94)',
      borderLeft: '1px solid rgba(255,255,255,0.08)',
      backdropFilter: 'blur(20px)',
      WebkitBackdropFilter: 'blur(20px)',
      zIndex: 50,
      display: 'flex',
      flexDirection: 'column',
      transition: 'width 300ms ease',
      overflow: 'hidden',
    }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '16px',
        borderBottom: '1px solid rgba(255,255,255,0.08)',
        flexShrink: 0,
      }}>
        {expanded && (
          <>
            <div>
              <div style={{
                fontSize: '14px',
                fontWeight: 600,
                color: 'rgba(100,170,255,0.90)',
              }}>
                Design Plan
              </div>
              <div style={{
                fontSize: '11px',
                color: 'rgba(255,255,255,0.45)',
                marginTop: '2px',
              }}>
                {addedNodeCount} nodes, {addedEdgeCount} edges proposed
              </div>
            </div>
            <button
              onClick={onClose}
              style={{
                background: 'none',
                border: 'none',
                color: 'rgba(255,255,255,0.40)',
                cursor: 'pointer',
                fontSize: '18px',
                padding: '4px',
              }}
            >
              x
            </button>
          </>
        )}
        {!expanded && (
          <button
            onClick={() => setExpanded(true)}
            style={{
              background: 'none',
              border: 'none',
              color: 'rgba(100,170,255,0.80)',
              cursor: 'pointer',
              fontSize: '16px',
              padding: '4px',
              writingMode: 'vertical-rl' as const,
              textOrientation: 'mixed' as const,
            }}
          >
            Plan
          </button>
        )}
      </div>

      {/* Plan content */}
      {expanded && (
        <>
          <div style={{
            flex: 1,
            overflow: 'auto',
            padding: '16px',
          }}>
            <pre style={{
              fontFamily: 'Inter, system-ui, sans-serif',
              fontSize: '12px',
              lineHeight: 1.6,
              color: 'rgba(255,255,255,0.75)',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
              margin: 0,
            }}>
              {plan}
            </pre>
          </div>

          {/* Actions */}
          <div style={{
            padding: '16px',
            borderTop: '1px solid rgba(255,255,255,0.08)',
            display: 'flex',
            gap: '8px',
            flexShrink: 0,
          }}>
            <button
              onClick={onApprove}
              style={{
                flex: 1,
                padding: '10px 16px',
                borderRadius: '8px',
                border: '1px solid rgba(47,247,199,0.30)',
                background: 'rgba(47,247,199,0.12)',
                color: 'rgba(47,247,199,0.90)',
                cursor: 'pointer',
                fontSize: '13px',
                fontFamily: 'inherit',
                fontWeight: 600,
              }}
            >
              Approve & Implement
            </button>
            <button
              onClick={onReject}
              style={{
                padding: '10px 16px',
                borderRadius: '8px',
                border: '1px solid rgba(255,92,138,0.25)',
                background: 'rgba(255,92,138,0.08)',
                color: 'rgba(255,92,138,0.80)',
                cursor: 'pointer',
                fontSize: '13px',
                fontFamily: 'inherit',
                fontWeight: 500,
              }}
            >
              Reject
            </button>
          </div>
        </>
      )}
    </div>
  );
};

export default PlanReviewPanel;
