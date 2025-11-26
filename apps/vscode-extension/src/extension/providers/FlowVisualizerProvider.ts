import * as vscode from 'vscode';
import * as path from 'path';
import { FlowChartData } from '../../shared/types';

export class FlowVisualizerProvider {
  public static currentPanel: FlowVisualizerProvider | undefined;
  private readonly _panel: vscode.WebviewPanel;
  private readonly _extensionUri: vscode.Uri;
  private _disposables: vscode.Disposable[] = [];
  private _onSaveDiagram?: (data: FlowChartData) => void;

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
            vscode.window.showInformationMessage('Flow visualizer is ready');
            break;
          case 'error':
            vscode.window.showErrorMessage(`Flow visualizer error: ${message.text}`);
            break;
          case 'saveEditedDiagram':
            if (this._onSaveDiagram) {
              this._onSaveDiagram(message.data);
            }
            break;
        }
      },
      null,
      this._disposables
    );
  }

  public updateFlowChart(data: FlowChartData) {
    this._panel.webview.postMessage({
      command: 'updateFlow',
      data: data
    });
  }

  public updateHierarchicalFlowChart(data: any) {
    this._panel.webview.postMessage({
      command: 'updateHierarchicalFlow',
      data: data
    });
  }

  public showError(error: string) {
    this._panel.webview.postMessage({
      command: 'showError',
      error: error
    });
  }

  public showLoading() {
    this._panel.webview.postMessage({
      command: 'showLoading'
    });
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