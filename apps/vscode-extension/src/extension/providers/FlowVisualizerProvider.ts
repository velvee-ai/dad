import * as vscode from 'vscode';
import * as path from 'path';
import { FlowChartData } from '../../shared/types';

export class FlowVisualizerProvider {
  public static currentPanel: FlowVisualizerProvider | undefined;
  private readonly _panel: vscode.WebviewPanel;
  private readonly _extensionUri: vscode.Uri;
  private _disposables: vscode.Disposable[] = [];
  private _onSaveDiagram?: (data: FlowChartData) => void;
  private _isReady = false;
  private _pendingMessages: any[] = [];

  public static createOrShow(extensionUri: vscode.Uri) {
    const column = vscode.ViewColumn.Beside;

    if (FlowVisualizerProvider.currentPanel) {
      FlowVisualizerProvider.currentPanel._panel.reveal(column);
      return FlowVisualizerProvider.currentPanel;
    }

    const panel = vscode.window.createWebviewPanel(
      'daadVisualizer',
      'DAAD - Code Flow Visualization',
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

    FlowVisualizerProvider.currentPanel = new FlowVisualizerProvider(panel, extensionUri);
    return FlowVisualizerProvider.currentPanel;
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
            this._isReady = true;
            // Flush any messages that were queued before webview was ready
            for (const msg of this._pendingMessages) {
              this._panel.webview.postMessage(msg);
            }
            this._pendingMessages = [];
            break;
          case 'error':
            vscode.window.showErrorMessage(`Flow visualizer error: ${message.text}`);
            break;
          case 'saveEditedDiagram':
            if (this._onSaveDiagram) {
              this._onSaveDiagram(message.data);
            }
            break;
          case 'openSourceFile':
            if (message.filePath) {
              const workspaceFolders = vscode.workspace.workspaceFolders;
              if (workspaceFolders) {
                const fullPath = vscode.Uri.joinPath(workspaceFolders[0].uri, message.filePath);
                vscode.window.showTextDocument(fullPath);
              }
            }
            break;
        }
      },
      null,
      this._disposables
    );
  }

  /**
   * Send a message to the webview, buffering if it hasn't signaled 'ready' yet.
   */
  private _postMessage(message: any) {
    if (this._isReady) {
      this._panel.webview.postMessage(message);
    } else {
      this._pendingMessages.push(message);
    }
  }

  public updateFlowChart(data: FlowChartData) {
    this._postMessage({ command: 'updateFlow', data });
  }

  public updateHierarchicalFlowChart(data: any) {
    this._postMessage({ command: 'updateHierarchicalFlow', data });
  }

  public updateC4View(data: any) {
    this._postMessage({ command: 'updateC4View', data });
  }

  public showError(error: string) {
    this._postMessage({ command: 'showError', error });
  }

  public showLoading() {
    this._postMessage({ command: 'showLoading' });
  }

  public setSaveHandler(handler: (data: FlowChartData) => void) {
    this._onSaveDiagram = handler;
  }

  private _getHtmlForWebview() {
    const scriptUri = this._panel.webview.asWebviewUri(
      vscode.Uri.joinPath(this._extensionUri, 'dist', 'webview.js')
    );

    const styleUri = this._panel.webview.asWebviewUri(
      vscode.Uri.joinPath(this._extensionUri, 'dist', 'webview.css')
    );

    const techIconsUri = this._panel.webview.asWebviewUri(
      vscode.Uri.joinPath(this._extensionUri, 'media', 'tech-icons')
    );

    const nonce = getNonce();

    return `<!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${this._panel.webview.cspSource} 'unsafe-inline'; script-src 'nonce-${nonce}'; img-src ${this._panel.webview.cspSource} data:; font-src ${this._panel.webview.cspSource};">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <link href="${styleUri}" rel="stylesheet">
      <title>Code Flow Visualization</title>
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
      <div id="root">
        <div class="loading">Initializing flow visualizer...</div>
      </div>
      <script nonce="${nonce}">
        const vscode = acquireVsCodeApi();
        window.vscode = vscode;
        window.techIconsBaseUri = "${techIconsUri}";
      </script>
      <script nonce="${nonce}" src="${scriptUri}"></script>
    </body>
    </html>`;
  }

  public dispose() {
    FlowVisualizerProvider.currentPanel = undefined;
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