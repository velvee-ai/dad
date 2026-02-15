import React, { useEffect, useState, useCallback } from 'react';
import { DadVisualizer } from '@dad/visualizer';
import type { DadFile } from '@dad/shared-types';

declare const vscode: {
  postMessage(message: any): void;
};

export function DadVisualizerWebview() {
  const [dadFile, setDadFile] = useState<DadFile | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [authorMode, setAuthorMode] = useState(false);

  useEffect(() => {
    const handler = (event: MessageEvent) => {
      const message = event.data;
      switch (message.command) {
        case 'updateDadFile':
          setError(null);
          setDadFile(message.data);
          break;
        case 'showError':
          setDadFile(null);
          setError(message.error);
          break;

        // --- Author Mode messages from extension ---
        case 'enableAuthorMode':
          setAuthorMode(true);
          break;
        case 'coalesceResult':
          // Agent returned plan + updated DAD
          setDadFile(message.dadFile);
          // The useAuthorMode hook in DadVisualizer handles the state transition
          // We need to forward this to the visualizer via a custom event
          window.dispatchEvent(new CustomEvent('dad-coalesce-result', {
            detail: { plan: message.plan, dadFile: message.dadFile },
          }));
          break;
        case 'implementationResult':
          // Implementation complete, finalized DAD returned
          setDadFile(message.dadFile);
          window.dispatchEvent(new CustomEvent('dad-implementation-result', {
            detail: { dadFile: message.dadFile },
          }));
          break;
        case 'coalesceProgress':
          // Progress update during coalescing/implementing
          window.dispatchEvent(new CustomEvent('dad-coalesce-progress', {
            detail: { message: message.message, type: message.type },
          }));
          break;
        case 'updateAuthorSession':
          // Mode transition from extension
          window.dispatchEvent(new CustomEvent('dad-author-session-update', {
            detail: { mode: message.mode },
          }));
          break;
      }
    };

    window.addEventListener('message', handler);
    vscode.postMessage({ command: 'ready' });
    return () => window.removeEventListener('message', handler);
  }, []);

  const handleOpenSource = useCallback((filePath: string) => {
    vscode.postMessage({ command: 'openSourceFile', filePath });
  }, []);

  const handleCoalesceDesign = useCallback((proposedDad: DadFile) => {
    vscode.postMessage({ command: 'coalesceDesign', dadFile: proposedDad });
  }, []);

  const handleApproveDesign = useCallback((approvedDad: DadFile, plan: string) => {
    vscode.postMessage({ command: 'approveDesign', dadFile: approvedDad, plan });
  }, []);

  const handleRejectDesign = useCallback(() => {
    vscode.postMessage({ command: 'rejectDesign' });
  }, []);

  const handleDadFileChange = useCallback((updatedDad: DadFile) => {
    vscode.postMessage({ command: 'dadFileChanged', dadFile: updatedDad });
  }, []);

  const handleNavigate = useCallback((filePath: string) => {
    vscode.postMessage({ command: 'navigateDadFile', filePath });
  }, []);

  if (error) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        color: 'var(--vscode-errorForeground)',
        padding: 20,
        textAlign: 'center',
        fontFamily: 'var(--vscode-font-family)',
      }}>
        {error}
      </div>
    );
  }

  if (!dadFile) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        color: 'var(--vscode-foreground)',
        fontFamily: 'var(--vscode-font-family)',
      }}>
        Waiting for DadFile...
      </div>
    );
  }

  return (
    <DadVisualizer
      dadFile={dadFile}
      onOpenSource={handleOpenSource}
      authorMode={authorMode}
      onCoalesceDesign={handleCoalesceDesign}
      onApproveDesign={handleApproveDesign}
      onRejectDesign={handleRejectDesign}
      onDadFileChange={handleDadFileChange}
      onNavigate={handleNavigate}
      style={{ width: '100%', height: '100vh' }}
    />
  );
}
