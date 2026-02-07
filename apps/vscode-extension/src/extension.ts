import * as vscode from 'vscode';
import { FlowVisualizerProvider } from './extension/providers/FlowVisualizerProvider';
import type { DadFile } from '@dad/shared-types';

export function activate(context: vscode.ExtensionContext) {
  const visualizeCommand = vscode.commands.registerCommand(
    'dad.visualizeDadFile',
    async (uri?: vscode.Uri) => {
      if (!uri) {
        vscode.window.showErrorMessage('DAD: No file selected. Right-click a .dad.json file in Explorer.');
        return;
      }

      try {
        const raw = await vscode.workspace.fs.readFile(uri);
        const dadFile: DadFile = JSON.parse(Buffer.from(raw).toString('utf-8'));

        if (!Array.isArray(dadFile.nodes) || !Array.isArray(dadFile.edges)) {
          vscode.window.showErrorMessage('DAD: Invalid .dad.json file — missing nodes or edges.');
          return;
        }

        const panel = FlowVisualizerProvider.createOrShow(context.extensionUri);
        panel.updateDadFile(dadFile);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        vscode.window.showErrorMessage(`DAD: Failed to load file — ${msg}`);
      }
    }
  );

  context.subscriptions.push(visualizeCommand);
}

export function deactivate() {}
