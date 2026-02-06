import React, { memo } from 'react';
import { BackArrowIcon, ChevronIcon } from '../c4Icons';

export interface C4Breadcrumb {
  id: string;
  label: string;
  level: string;
}

interface C4BreadcrumbsProps {
  breadcrumbs: C4Breadcrumb[];
  onNavigate: (nodeId: string) => void;
  onDrillUp: () => void;
  scopeLabel?: string;
}

const C4Breadcrumbs: React.FC<C4BreadcrumbsProps> = ({
  breadcrumbs, onNavigate, onDrillUp, scopeLabel,
}) => {
  const canGoBack = breadcrumbs.length > 1;

  return (
    <div style={{
      background: 'var(--vscode-editor-background, #1e1e1e)',
      padding: '8px 14px',
      border: '1px solid var(--vscode-panel-border, #333)',
      borderRadius: '8px',
      fontFamily: 'var(--vscode-font-family, -apple-system, sans-serif)',
      color: 'var(--vscode-foreground, #cccccc)',
      display: 'flex',
      flexDirection: 'column',
      gap: '6px',
      boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
      minWidth: '200px',
    }}>
      {/* Breadcrumb trail */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '2px',
        fontSize: '12px',
      }}>
        {/* Back button */}
        {canGoBack && (
          <button
            onClick={onDrillUp}
            style={{
              background: 'var(--vscode-button-secondaryBackground, #333)',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              padding: '3px 5px',
              display: 'flex',
              alignItems: 'center',
              marginRight: '6px',
              color: 'var(--vscode-foreground, #ccc)',
            }}
            title="Go back"
          >
            <BackArrowIcon size={14} color="var(--vscode-foreground, #ccc)" />
          </button>
        )}

        {/* Breadcrumb segments */}
        {breadcrumbs.map((b, i) => (
          <React.Fragment key={b.id}>
            {i > 0 && (
              <span style={{ opacity: 0.35, margin: '0 2px', display: 'flex' }}>
                <ChevronIcon size={10} color="var(--vscode-foreground, #ccc)" />
              </span>
            )}
            <span
              style={{
                cursor: i < breadcrumbs.length - 1 ? 'pointer' : 'default',
                opacity: i < breadcrumbs.length - 1 ? 0.65 : 1,
                fontWeight: i === breadcrumbs.length - 1 ? 600 : 400,
                padding: '1px 4px',
                borderRadius: '3px',
                transition: 'background 150ms',
              }}
              onClick={() => {
                if (i < breadcrumbs.length - 1) onNavigate(b.id);
              }}
              onMouseEnter={(e) => {
                if (i < breadcrumbs.length - 1) {
                  (e.target as HTMLElement).style.background = 'var(--vscode-list-hoverBackground, #2a2d2e)';
                }
              }}
              onMouseLeave={(e) => {
                (e.target as HTMLElement).style.background = 'transparent';
              }}
            >
              {b.label}
            </span>
          </React.Fragment>
        ))}
      </div>

      {/* Scope description */}
      {scopeLabel && (
        <div style={{
          fontSize: '10px',
          opacity: 0.5,
          paddingLeft: canGoBack ? '30px' : '0',
        }}>
          {scopeLabel}
        </div>
      )}
    </div>
  );
};

export default memo(C4Breadcrumbs);
