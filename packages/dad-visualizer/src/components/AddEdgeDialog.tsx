/**
 * AddEdgeDialog — Modal form for adding a new edge in Author Mode.
 */
import React, { useState } from 'react';

interface NodeOption {
  id: string;
  name: string;
  c4Level: string;
}

export interface AddEdgeDialogProps {
  nodeOptions: NodeOption[];
  onSubmit: (edge: any) => void;
  onClose: () => void;
}

const GLASS = {
  bg: 'rgba(7,11,16,0.92)',
  border: '1px solid rgba(255,255,255,0.12)',
  radius: '16px',
  blur: 'blur(20px)',
};

const INPUT_STYLE: React.CSSProperties = {
  width: '100%',
  padding: '8px 12px',
  background: 'rgba(255,255,255,0.06)',
  border: '1px solid rgba(255,255,255,0.12)',
  borderRadius: '8px',
  color: 'rgba(255,255,255,0.88)',
  fontSize: '13px',
  fontFamily: 'inherit',
  outline: 'none',
  boxSizing: 'border-box' as const,
};

const LABEL_STYLE: React.CSSProperties = {
  fontSize: '11px',
  fontWeight: 600,
  color: 'rgba(255,255,255,0.50)',
  textTransform: 'uppercase' as const,
  letterSpacing: '0.05em',
  marginBottom: '4px',
};

const AddEdgeDialog: React.FC<AddEdgeDialogProps> = ({ nodeOptions, onSubmit, onClose }) => {
  const [source, setSource] = useState('');
  const [target, setTarget] = useState('');
  const [label, setLabel] = useState('');
  const [technology, setTechnology] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!source || !target || !label.trim()) return;

    // Infer c4Level from source node
    const sourceNode = nodeOptions.find(n => n.id === source);
    const c4Level = sourceNode?.c4Level || 'container';

    const edge = {
      id: `proposed-edge:${Date.now()}`,
      source,
      target,
      label: label.trim(),
      technology: technology.trim() || undefined,
      c4Level,
      tags: [],
      status: 'user-proposed',
    };

    onSubmit(edge);
  };

  const isValid = source && target && source !== target && label.trim();

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(0,0,0,0.50)',
        zIndex: 1000,
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: '380px',
          padding: '24px',
          background: GLASS.bg,
          border: GLASS.border,
          borderRadius: GLASS.radius,
          backdropFilter: GLASS.blur,
          WebkitBackdropFilter: GLASS.blur,
        }}
        onClick={e => e.stopPropagation()}
      >
        <h3 style={{
          margin: '0 0 20px',
          fontSize: '16px',
          fontWeight: 600,
          color: 'rgba(255,255,255,0.88)',
        }}>
          Add Edge
        </h3>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '14px' }}>
            <div style={LABEL_STYLE}>Source *</div>
            <select
              style={{ ...INPUT_STYLE, cursor: 'pointer' }}
              value={source}
              onChange={e => setSource(e.target.value)}
            >
              <option value="">Select source node...</option>
              {nodeOptions.map(n => (
                <option key={n.id} value={n.id}>{n.name}</option>
              ))}
            </select>
          </div>

          <div style={{ marginBottom: '14px' }}>
            <div style={LABEL_STYLE}>Target *</div>
            <select
              style={{ ...INPUT_STYLE, cursor: 'pointer' }}
              value={target}
              onChange={e => setTarget(e.target.value)}
            >
              <option value="">Select target node...</option>
              {nodeOptions.filter(n => n.id !== source).map(n => (
                <option key={n.id} value={n.id}>{n.name}</option>
              ))}
            </select>
          </div>

          <div style={{ marginBottom: '14px' }}>
            <div style={LABEL_STYLE}>Label *</div>
            <input
              style={INPUT_STYLE}
              value={label}
              onChange={e => setLabel(e.target.value)}
              placeholder="e.g. Checks spam score via"
            />
          </div>

          <div style={{ marginBottom: '20px' }}>
            <div style={LABEL_STYLE}>Technology</div>
            <input
              style={INPUT_STYLE}
              value={technology}
              onChange={e => setTechnology(e.target.value)}
              placeholder="e.g. REST/HTTPS"
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: '8px 16px',
                borderRadius: '8px',
                border: '1px solid rgba(255,255,255,0.12)',
                background: 'rgba(255,255,255,0.04)',
                color: 'rgba(255,255,255,0.60)',
                cursor: 'pointer',
                fontSize: '13px',
                fontFamily: 'inherit',
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!isValid}
              style={{
                padding: '8px 16px',
                borderRadius: '8px',
                border: `1px solid ${isValid ? 'rgba(79,233,255,0.30)' : 'rgba(255,255,255,0.08)'}`,
                background: isValid ? 'rgba(79,233,255,0.12)' : 'rgba(255,255,255,0.04)',
                color: isValid ? 'rgba(79,233,255,0.90)' : 'rgba(255,255,255,0.30)',
                cursor: isValid ? 'pointer' : 'not-allowed',
                fontSize: '13px',
                fontFamily: 'inherit',
                fontWeight: 500,
              }}
            >
              Add Edge
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddEdgeDialog;
