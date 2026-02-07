import * as vscode from 'vscode';
import * as path from 'path';
import { Pipeline } from '@dad/pipeline';
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

  const analyzeCommand = vscode.commands.registerCommand(
    'dad.analyzeProject',
    async (uri?: vscode.Uri) => {
      if (!uri) {
        vscode.window.showErrorMessage('DAD: No folder selected. Right-click a folder in Explorer.');
        return;
      }

      const rootPath = uri.fsPath;
      const projectName = path.basename(rootPath);

      await vscode.window.withProgress(
        {
          location: vscode.ProgressLocation.Notification,
          title: `DAD: Analyzing "${projectName}"`,
          cancellable: false,
        },
        async (progress) => {
          try {
            const pipeline = new Pipeline({
              rootPath,
              projectName,
              onProgress: (_stage, message, percent) => {
                progress.report({ message, increment: percent });
              },
            });

            const result = await pipeline.run();
            const dadFile = result.combined;

            const dadDir = vscode.Uri.file(path.join(rootPath, '.dad'));
            await vscode.workspace.fs.createDirectory(dadDir);

            const outUri = vscode.Uri.file(path.join(rootPath, '.dad', 'landscape.dad.json'));
            const json = JSON.stringify(dadFile, null, 2);
            await vscode.workspace.fs.writeFile(outUri, Buffer.from(json, 'utf-8'));

            vscode.window.showInformationMessage(
              `DAD: Analysis complete — ${dadFile.nodes.length} nodes, ${dadFile.edges.length} edges`
            );

            await vscode.commands.executeCommand('dad.visualizeDadFile', outUri);
          } catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            vscode.window.showErrorMessage(`DAD: Analysis failed — ${msg}`);
          }
        }
      );
    }
  );

  context.subscriptions.push(visualizeCommand, analyzeCommand);
}

export function deactivate() {}
