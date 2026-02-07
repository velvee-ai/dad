/**
 * AddNodeDialog — Modal form for adding a new node in Author Mode.
 */
import React, { useState } from 'react';
import { generateProposedId } from '../hooks/useAuthorMode';

const NODE_TYPES = [
  { value: 'softwareSystem', label: 'Software System', level: 'context' },
  { value: 'person', label: 'Person', level: 'context' },
  { value: 'externalSystem', label: 'External System', level: 'context' },
  { value: 'container', label: 'Container / Service', level: 'container' },
  { value: 'dataStore', label: 'Data Store', level: 'container' },
  { value: 'component', label: 'Component', level: 'component' },
] as const;

interface ParentOption {
  id: string;
  name: string;
  c4Level: string;
}

export interface AddNodeDialogProps {
  parentOptions: ParentOption[];
  defaultParentId?: string | null;
  onSubmit: (node: any) => void;
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

const AddNodeDialog: React.FC<AddNodeDialogProps> = ({ parentOptions, defaultParentId, onSubmit, onClose }) => {
  const [name, setName] = useState('');
  const [type, setType] = useState<string>('container');
  const [parentId, setParentId] = useState<string>(defaultParentId || '');
  const [technology, setTechnology] = useState('');
  const [description, setDescription] = useState('');

  const selectedType = NODE_TYPES.find(t => t.value === type);
  const c4Level = selectedType?.level || 'container';

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const node = {
      id: generateProposedId(),
      c4Level,
      name: name.trim(),
      type,
      designSpec: `element:\n  type: ${type}\n  name: "${name.trim()}"`,
      documentation: description.trim() || `# ${name.trim()}`,
      parentId: parentId || null,
      childIds: [],
      technology: technology.trim() || undefined,
      tags: [],
      status: 'user-proposed',
    };

    onSubmit(node);
  };

  return (
    <div style={{
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
          Add Node
        </h3>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '14px' }}>
            <div style={LABEL_STYLE}>Name *</div>
            <input
              style={INPUT_STYLE}
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g. Spam Check Service"
              autoFocus
            />
          </div>

          <div style={{ marginBottom: '14px' }}>
            <div style={LABEL_STYLE}>Type</div>
            <select
              style={{ ...INPUT_STYLE, cursor: 'pointer' }}
              value={type}
              onChange={e => setType(e.target.value)}
            >
              {NODE_TYPES.map(t => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>

          <div style={{ marginBottom: '14px' }}>
            <div style={LABEL_STYLE}>Parent</div>
            <select
              style={{ ...INPUT_STYLE, cursor: 'pointer' }}
              value={parentId}
              onChange={e => setParentId(e.target.value)}
            >
              <option value="">(none — top level)</option>
              {parentOptions.map(p => (
                <option key={p.id} value={p.id}>{p.name} ({p.c4Level})</option>
              ))}
            </select>
          </div>

          <div style={{ marginBottom: '14px' }}>
            <div style={LABEL_STYLE}>Technology</div>
            <input
              style={INPUT_STYLE}
              value={technology}
              onChange={e => setTechnology(e.target.value)}
              placeholder="e.g. TypeScript/Express"
            />
          </div>

          <div style={{ marginBottom: '20px' }}>
            <div style={LABEL_STYLE}>Description</div>
            <textarea
              style={{ ...INPUT_STYLE, minHeight: '60px', resize: 'vertical' }}
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Brief description of this node..."
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
              disabled={!name.trim()}
              style={{
                padding: '8px 16px',
                borderRadius: '8px',
                border: '1px solid rgba(79,233,255,0.30)',
                background: name.trim() ? 'rgba(79,233,255,0.12)' : 'rgba(255,255,255,0.04)',
                color: name.trim() ? 'rgba(79,233,255,0.90)' : 'rgba(255,255,255,0.30)',
                cursor: name.trim() ? 'pointer' : 'not-allowed',
                fontSize: '13px',
                fontFamily: 'inherit',
                fontWeight: 500,
              }}
            >
              Add Node
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddNodeDialog;
