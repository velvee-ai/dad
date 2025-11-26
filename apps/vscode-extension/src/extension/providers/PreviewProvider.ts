import * as vscode from 'vscode';
import { PreviewSession } from '../../shared/types';

export class PreviewProvider {
  public static currentPanel: PreviewProvider | undefined;
  private readonly _panel: vscode.WebviewPanel;
  private readonly _extensionUri: vscode.Uri;
  private _disposables: vscode.Disposable[] = [];
  private _currentSession?: PreviewSession;
  private _onRefresh?: () => Promise<void>;

  public static createOrShow(extensionUri: vscode.Uri) {
    const column = vscode.ViewColumn.Beside;

    if (PreviewProvider.currentPanel) {
      PreviewProvider.currentPanel._panel.reveal(column);
      return PreviewProvider.currentPanel;
    }

    const panel = vscode.window.createWebviewPanel(
      'daadPreview',
      'DAAD - Preview Session',
      column,
      {
        enableScripts: true,
        retainContextWhenHidden: true,
        localResourceRoots: [
          vscode.Uri.joinPath(extensionUri, 'dist'),
          vscode.Uri.joinPath(extensionUri, 'media')
        ]
      }
    );

    PreviewProvider.currentPanel = new PreviewProvider(panel, extensionUri);
    return PreviewProvider.currentPanel;
  }

  private constructor(panel: vscode.WebviewPanel, extensionUri: vscode.Uri) {
    this._panel = panel;
    this._extensionUri = extensionUri;

    this._panel.webview.html = this._getHtmlForWebview();

    this._panel.onDidDispose(() => this.dispose(), null, this._disposables);

    this._panel.webview.onDidReceiveMessage(
      async (message) => {
        switch (message.command) {
          case 'ready':
            // Send current session if available
            if (this._currentSession) {
              this.updateSession(this._currentSession);
            }
            break;
          case 'refresh':
            if (this._onRefresh) {
              await this._onRefresh();
            }
            break;
          case 'copyUrl':
            if (this._currentSession) {
              await vscode.env.clipboard.writeText(this._currentSession.url);
              vscode.window.showInformationMessage('Preview URL copied to clipboard');
            }
            break;
          case 'error':
            vscode.window.showErrorMessage(`Preview error: ${message.text}`);
            break;
        }
      },
      null,
      this._disposables
    );
  }

  public updateSession(session: PreviewSession) {
    this._currentSession = session;
    this._panel.webview.postMessage({
      command: 'updateSession',
      session: session
    });
  }

  public clearSession() {
    this._currentSession = undefined;
    this._panel.webview.postMessage({
      command: 'clearSession'
    });
  }

  public showError(error: string) {
    this._panel.webview.postMessage({
      command: 'showError',
      error: error
    });
  }

  public showLoading(message: string = 'Loading preview...') {
    this._panel.webview.postMessage({
      command: 'showLoading',
      message: message
    });
  }

  public setRefreshHandler(handler: () => Promise<void>) {
    this._onRefresh = handler;
  }

  private _getHtmlForWebview() {
    const scriptUri = this._panel.webview.asWebviewUri(
      vscode.Uri.joinPath(this._extensionUri, 'dist', 'webview.js')
    );

    const styleUri = this._panel.webview.asWebviewUri(
      vscode.Uri.joinPath(this._extensionUri, 'dist', 'webview.css')
    );

    const nonce = getNonce();

    return `<!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${this._panel.webview.cspSource} 'unsafe-inline'; script-src 'nonce-${nonce}'; img-src ${this._panel.webview.cspSource} data:; font-src ${this._panel.webview.cspSource};">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <link href="${styleUri}" rel="stylesheet">
      <title>Preview Session</title>
      <style>
        body {
          padding: 0;
          margin: 0;
          width: 100vw;
          height: 100vh;
          overflow: hidden;
        }
        #root {
          width: 100%;
          height: 100%;
        }
        .loading {
          display: flex;
          align-items: center;
          justify-content: center;
          height: 100vh;
          font-family: var(--vscode-font-family);
          color: var(--vscode-foreground);
        }
        .error {
          display: flex;
          align-items: center;
          justify-content: center;
          height: 100vh;
          font-family: var(--vscode-font-family);
          color: var(--vscode-errorForeground);
          padding: 20px;
          text-align: center;
        }
      </style>
    </head>
    <body>
      <div id="root" data-view-type="preview">
        <div class="loading">Initializing preview panel...</div>
      </div>
      <script nonce="${nonce}">
        const vscode = acquireVsCodeApi();
        window.vscode = vscode;
      </script>
      <script nonce="${nonce}" src="${scriptUri}"></script>
    </body>
    </html>`;
  }

  public dispose() {
    PreviewProvider.currentPanel = undefined;
    this._panel.dispose();

    while (this._disposables.length) {
      const disposable = this._disposables.pop();
      if (disposable) {
        disposable.dispose();
      }
    }
  }
}

function getNonce() {
  let text = '';
  const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  for (let i = 0; i < 32; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
}
