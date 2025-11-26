import React, { useEffect, useState, useCallback } from 'react';
import PreviewPanel from './components/PreviewPanel';
import { PreviewSession } from '../shared/types';

interface VSCode {
  postMessage(message: any): void;
}

declare global {
  interface Window {
    vscode: VSCode;
  }
}

const PreviewApp: React.FC = () => {
  const [session, setSession] = useState<PreviewSession | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      const message = event.data;

      switch (message.command) {
        case 'updateSession':
          setIsLoading(false);
          setError(null);
          setSession(message.session);
          break;

        case 'clearSession':
          setSession(undefined);
          break;

        case 'showLoading':
          setIsLoading(true);
          setError(null);
          break;

        case 'showError':
          setIsLoading(false);
          setError(message.error);
          break;
      }
    };

    window.addEventListener('message', handleMessage);

    // Notify extension that webview is ready
    if (window.vscode) {
      window.vscode.postMessage({ command: 'ready' });
    }

    return () => {
      window.removeEventListener('message', handleMessage);
    };
  }, []);

  const handleRefresh = useCallback(() => {
    if (window.vscode) {
      window.vscode.postMessage({ command: 'refresh' });
      setIsLoading(true);
    }
  }, []);

  if (isLoading) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        fontFamily: 'var(--vscode-font-family)',
        color: 'var(--vscode-foreground)'
      }}>
        <div>
          <div>Loading preview session...</div>
          <div style={{ marginTop: '10px', fontSize: '12px', opacity: 0.7 }}>
            This may take a few seconds
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        fontFamily: 'var(--vscode-font-family)',
        padding: '20px'
      }}>
        <div style={{
          maxWidth: '600px',
          padding: '20px',
          border: '1px solid var(--vscode-errorForeground)',
          borderRadius: '5px',
          backgroundColor: 'var(--vscode-inputValidation-errorBackground)'
        }}>
          <div style={{
            fontSize: '18px',
            marginBottom: '15px',
            color: 'var(--vscode-errorForeground)',
            fontWeight: 'bold'
          }}>
            Preview Session Error
          </div>
          <div style={{ marginBottom: '20px', color: 'var(--vscode-foreground)' }}>
            {error}
          </div>
        </div>
      </div>
    );
  }

  return <PreviewPanel session={session} onRefresh={handleRefresh} />;
};

export default PreviewApp;
