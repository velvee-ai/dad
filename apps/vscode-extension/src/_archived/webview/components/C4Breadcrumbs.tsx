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

const GLASS = {
  bg: 'rgba(255,255,255,0.06)',
  border: 'rgba(255,255,255,0.14)',
  text: 'rgba(255,255,255,0.92)',
  textDim: 'rgba(255,255,255,0.52)',
  accent: '#4FE9FF',
  hover: 'rgba(255,255,255,0.10)',
};

const C4Breadcrumbs: React.FC<C4BreadcrumbsProps> = ({
  breadcrumbs, onNavigate, onDrillUp, scopeLabel,
}) => {
  const canGoBack = breadcrumbs.length > 1;

  return (
    <div style={{
      background: GLASS.bg,
      backdropFilter: 'blur(14px)',
      WebkitBackdropFilter: 'blur(14px)',
      padding: '8px 14px',
      border: `1px solid ${GLASS.border}`,
      borderRadius: '12px',
      fontFamily: 'Inter, system-ui, sans-serif',
      color: GLASS.text,
      display: 'flex',
      flexDirection: 'column',
      gap: '6px',
      boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
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
              background: 'rgba(255,255,255,0.08)',
              border: `1px solid ${GLASS.border}`,
              borderRadius: '6px',
              cursor: 'pointer',
              padding: '3px 5px',
              display: 'flex',
              alignItems: 'center',
              marginRight: '6px',
              color: GLASS.text,
              transition: 'all 150ms',
            }}
            title="Go back"
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.background = GLASS.hover;
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.08)';
            }}
          >
            <BackArrowIcon size={14} color={GLASS.text} />
          </button>
        )}

        {/* Breadcrumb segments */}
        {breadcrumbs.map((b, i) => (
          <React.Fragment key={b.id}>
            {i > 0 && (
              <span style={{ opacity: 0.35, margin: '0 2px', display: 'flex' }}>
                <ChevronIcon size={10} color={GLASS.textDim} />
              </span>
            )}
            <span
              style={{
                cursor: i < breadcrumbs.length - 1 ? 'pointer' : 'default',
                opacity: i < breadcrumbs.length - 1 ? 0.65 : 1,
                fontWeight: i === breadcrumbs.length - 1 ? 600 : 400,
                color: i === breadcrumbs.length - 1 ? GLASS.accent : GLASS.text,
                padding: '1px 6px',
                borderRadius: '4px',
                transition: 'all 150ms',
              }}
              onClick={() => {
                if (i < breadcrumbs.length - 1) onNavigate(b.id);
              }}
              onMouseEnter={(e) => {
                if (i < breadcrumbs.length - 1) {
                  (e.target as HTMLElement).style.background = GLASS.hover;
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
          color: GLASS.textDim,
          paddingLeft: canGoBack ? '30px' : '0',
        }}>
          {scopeLabel}
        </div>
      )}
    </div>
  );
};

export default memo(C4Breadcrumbs);
