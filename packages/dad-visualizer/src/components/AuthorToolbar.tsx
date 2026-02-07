/**
 * AuthorToolbar — Mode-dependent toolbar for Author Mode.
 *
 * Glass-morphic style matching C4ControlBar.
 * Shows different buttons based on the current author session mode.
 */
import React from 'react';
import type { AuthorMode } from '../hooks/useAuthorMode';

const GLASS = {
  bg: 'rgba(7,11,16,0.80)',
  border: '1px solid rgba(255,255,255,0.10)',
  radius: '14px',
  blur: 'blur(16px)',
};

const BTN_BASE: React.CSSProperties = {
  padding: '6px 14px',
  borderRadius: '8px',
  border: '1px solid rgba(255,255,255,0.12)',
  cursor: 'pointer',
  fontFamily: 'inherit',
  fontSize: '12px',
  fontWeight: 500,
  transition: 'all 180ms ease',
};

export interface AuthorToolbarProps {
  mode: AuthorMode;
  proposedNodeCount: number;
  agentPlannedNodeCount: number;
  onToggleEditMode: () => void;
  onAddNode: () => void;
  onAddEdge: () => void;
  onCoalesceDesign: () => void;
  onApprove: () => void;
  onReject: () => void;
  onReset: () => void;
}

const AuthorToolbar: React.FC<AuthorToolbarProps> = ({
  mode,
  proposedNodeCount,
  agentPlannedNodeCount,
  onToggleEditMode,
  onAddNode,
  onAddEdge,
  onCoalesceDesign,
  onApprove,
  onReject,
  onReset,
}) => {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      padding: '8px 14px',
      background: GLASS.bg,
      border: GLASS.border,
      borderRadius: GLASS.radius,
      backdropFilter: GLASS.blur,
      WebkitBackdropFilter: GLASS.blur,
    }}>
      {/* Mode indicator */}
      <span style={{
        fontSize: '10px',
        fontWeight: 600,
        padding: '2px 8px',
        borderRadius: '4px',
        background: mode === 'edit' ? 'rgba(180,180,180,0.12)' :
                    mode === 'reviewing' ? 'rgba(66,133,244,0.15)' :
                    mode === 'coalescing' || mode === 'implementing' ? 'rgba(79,233,255,0.12)' :
                    mode === 'finalized' ? 'rgba(47,247,199,0.15)' :
                    'rgba(255,255,255,0.06)',
        color: mode === 'edit' ? 'rgba(255,255,255,0.60)' :
               mode === 'reviewing' ? 'rgba(100,170,255,0.90)' :
               mode === 'finalized' ? 'rgba(47,247,199,0.90)' :
               'rgba(255,255,255,0.50)',
        textTransform: 'uppercase' as const,
        letterSpacing: '0.05em',
      }}>
        {mode === 'view' ? 'Author' :
         mode === 'edit' ? 'Editing' :
         mode === 'coalescing' ? 'Analyzing...' :
         mode === 'reviewing' ? 'Review Plan' :
         mode === 'implementing' ? 'Implementing...' :
         'Done'}
      </span>

      {/* View mode: Enter edit */}
      {mode === 'view' && (
        <button onClick={onToggleEditMode} style={{
          ...BTN_BASE,
          background: 'rgba(79,233,255,0.10)',
          color: 'rgba(79,233,255,0.90)',
          borderColor: 'rgba(79,233,255,0.25)',
        }}>
          Author Mode
        </button>
      )}

      {/* Edit mode: Add Node, Add Edge, Coalesce */}
      {mode === 'edit' && (
        <>
          <button onClick={onAddNode} style={{
            ...BTN_BASE,
            background: 'rgba(255,255,255,0.06)',
            color: 'rgba(255,255,255,0.70)',
          }}>
            + Node
          </button>
          <button onClick={onAddEdge} style={{
            ...BTN_BASE,
            background: 'rgba(255,255,255,0.06)',
            color: 'rgba(255,255,255,0.70)',
          }}>
            + Edge
          </button>

          {proposedNodeCount > 0 && (
            <span style={{ fontSize: '11px', color: 'rgba(180,180,180,0.70)' }}>
              {proposedNodeCount} proposed
            </span>
          )}

          <button
            onClick={onCoalesceDesign}
            disabled={proposedNodeCount === 0}
            style={{
              ...BTN_BASE,
              background: proposedNodeCount > 0 ? 'rgba(79,233,255,0.12)' : 'rgba(255,255,255,0.04)',
              color: proposedNodeCount > 0 ? 'rgba(79,233,255,0.90)' : 'rgba(255,255,255,0.30)',
              borderColor: proposedNodeCount > 0 ? 'rgba(79,233,255,0.30)' : 'rgba(255,255,255,0.08)',
              cursor: proposedNodeCount > 0 ? 'pointer' : 'not-allowed',
            }}
          >
            Coalesce Design
          </button>

          <button onClick={onToggleEditMode} style={{
            ...BTN_BASE,
            background: 'rgba(255,255,255,0.04)',
            color: 'rgba(255,255,255,0.40)',
          }}>
            Cancel
          </button>
        </>
      )}

      {/* Coalescing: spinner */}
      {mode === 'coalescing' && (
        <span style={{
          fontSize: '11px',
          color: 'rgba(79,233,255,0.70)',
          animation: 'pulse 1.5s ease-in-out infinite',
        }}>
          Design agent is analyzing...
        </span>
      )}

      {/* Reviewing: Approve / Reject */}
      {mode === 'reviewing' && (
        <>
          {agentPlannedNodeCount > 0 && (
            <span style={{ fontSize: '11px', color: 'rgba(100,170,255,0.70)' }}>
              {agentPlannedNodeCount} AI planned
            </span>
          )}
          <button onClick={onApprove} style={{
            ...BTN_BASE,
            background: 'rgba(47,247,199,0.12)',
            color: 'rgba(47,247,199,0.90)',
            borderColor: 'rgba(47,247,199,0.30)',
          }}>
            Approve
          </button>
          <button onClick={onReject} style={{
            ...BTN_BASE,
            background: 'rgba(255,92,138,0.10)',
            color: 'rgba(255,92,138,0.80)',
            borderColor: 'rgba(255,92,138,0.25)',
          }}>
            Reject
          </button>
        </>
      )}

      {/* Implementing: progress */}
      {mode === 'implementing' && (
        <span style={{
          fontSize: '11px',
          color: 'rgba(79,233,255,0.70)',
          animation: 'pulse 1.5s ease-in-out infinite',
        }}>
          Claude Code is implementing...
        </span>
      )}

      {/* Finalized: Done */}
      {mode === 'finalized' && (
        <button onClick={onReset} style={{
          ...BTN_BASE,
          background: 'rgba(47,247,199,0.10)',
          color: 'rgba(47,247,199,0.85)',
          borderColor: 'rgba(47,247,199,0.25)',
        }}>
          Done
        </button>
      )}
    </div>
  );
};

export default AuthorToolbar;
