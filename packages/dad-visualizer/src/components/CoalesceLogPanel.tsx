/**
 * CoalesceLogPanel — Floating log viewer shown during coalescing/implementing.
 *
 * Displays agent progress messages on the canvas so the user
 * can see what's happening during the design/implementation phases.
 */
import React, { useEffect, useState, useRef } from 'react';

export interface LogEntry {
  timestamp: number;
  message: string;
  type: 'info' | 'progress' | 'success' | 'error';
}

export interface CoalesceLogPanelProps {
  mode: 'coalescing' | 'implementing';
  logs: LogEntry[];
}

const CoalesceLogPanel: React.FC<CoalesceLogPanelProps> = ({ mode, logs }) => {
  const [dots, setDots] = useState('');
  const logEndRef = useRef<HTMLDivElement>(null);

  // Animate dots
  useEffect(() => {
    const interval = setInterval(() => {
      setDots(prev => prev.length >= 3 ? '' : prev + '.');
    }, 500);
    return () => clearInterval(interval);
  }, []);

  // Auto-scroll to bottom
  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs.length]);

  const title = mode === 'coalescing'
    ? 'Design Agent Analyzing'
    : 'Claude Code Implementing';

  const accentColor = mode === 'coalescing'
    ? 'rgba(79,233,255,0.90)'
    : 'rgba(47,247,199,0.90)';

  return (
    <div style={{
      position: 'absolute',
      bottom: '80px',
      left: '50%',
      transform: 'translateX(-50%)',
      width: '420px',
      maxHeight: '280px',
      background: 'rgba(7,11,16,0.92)',
      border: '1px solid rgba(255,255,255,0.10)',
      borderRadius: '14px',
      backdropFilter: 'blur(20px)',
      WebkitBackdropFilter: 'blur(20px)',
      zIndex: 40,
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
      fontFamily: 'Inter, system-ui, sans-serif',
    }}>
      {/* Header with pulse animation */}
      <div style={{
        padding: '12px 16px',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        flexShrink: 0,
      }}>
        {/* Pulsing dot */}
        <div style={{
          width: '8px',
          height: '8px',
          borderRadius: '50%',
          background: accentColor,
          animation: 'pulse-dot 1.5s ease-in-out infinite',
        }} />
        <span style={{
          fontSize: '13px',
          fontWeight: 600,
          color: accentColor,
        }}>
          {title}{dots}
        </span>
      </div>

      {/* Log entries */}
      <div style={{
        flex: 1,
        overflow: 'auto',
        padding: '8px 16px',
        minHeight: '60px',
      }}>
        {logs.length === 0 && (
          <div style={{
            fontSize: '11px',
            color: 'rgba(255,255,255,0.35)',
            padding: '8px 0',
          }}>
            Waiting for agent response...
          </div>
        )}
        {logs.map((log, i) => (
          <div key={i} style={{
            fontSize: '11px',
            lineHeight: 1.5,
            padding: '2px 0',
            color: log.type === 'error' ? 'rgba(255,92,138,0.80)' :
                   log.type === 'success' ? 'rgba(47,247,199,0.80)' :
                   log.type === 'progress' ? 'rgba(79,233,255,0.70)' :
                   'rgba(255,255,255,0.55)',
            display: 'flex',
            gap: '8px',
          }}>
            <span style={{ opacity: 0.4, flexShrink: 0 }}>
              {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </span>
            <span>{log.message}</span>
          </div>
        ))}
        <div ref={logEndRef} />
      </div>

      {/* CSS animation */}
      <style>{`
        @keyframes pulse-dot {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.4; transform: scale(0.8); }
        }
      `}</style>
    </div>
  );
};

export default CoalesceLogPanel;
