import React, { useEffect, useState } from 'react';
import { DadVisualizer } from '@dad/visualizer';
import type { DadFile } from '@dad/shared-types';

declare const vscode: {
  postMessage(message: any): void;
};

export function DadVisualizerWebview() {
  const [dadFile, setDadFile] = useState<DadFile | null>(null);
  const [error, setError] = useState<string | null>(null);

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
      }
    };

    window.addEventListener('message', handler);
    vscode.postMessage({ command: 'ready' });
    return () => window.removeEventListener('message', handler);
  }, []);

  const handleOpenSource = (filePath: string) => {
    vscode.postMessage({ command: 'openSourceFile', filePath });
  };

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
      style={{ width: '100%', height: '100vh' }}
    />
  );
}
