import * as vscode from 'vscode';
import * as path from 'path';
import { Pipeline, LandscapeAggregator, ClaudeProvider } from '@dad/pipeline';
import { DadStorage, type DadFileSetInput } from '@dad/generation';
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
        let dadFile: DadFile | null = null;

        // If the file is under .dad/levels/, load and merge all level files
        const filePath = uri.fsPath;
        const dadDir = filePath.includes(`${path.sep}.dad${path.sep}`)
          ? filePath.substring(0, filePath.indexOf(`${path.sep}.dad${path.sep}`))
          : null;

        if (dadDir) {
          const storage = new DadStorage(dadDir);
          const isLandscape = path.basename(filePath) === 'landscape.dad.json';
          dadFile = storage.loadMerged(isLandscape);
        }

        // Fallback: load the single file directly
        if (!dadFile) {
          const raw = await vscode.workspace.fs.readFile(uri);
          dadFile = JSON.parse(Buffer.from(raw).toString('utf-8'));
        }

        if (!dadFile || !Array.isArray(dadFile.nodes) || !Array.isArray(dadFile.edges)) {
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
              llmProvider: new ClaudeProvider(undefined, 'claude-sonnet-4-5-20250929', 16384),
              onProgress: (_stage, message, percent) => {
                progress.report({ message, increment: percent });
              },
            });

            const result = await pipeline.run();
            const dadFile = result.combined;

            // Write combined + per-level files via DadStorage
            const storage = new DadStorage(rootPath);
            const saveResult = storage.saveAll(result as unknown as DadFileSetInput);
            if (!saveResult.success) {
              vscode.window.showErrorMessage(`DAD: Save failed — ${saveResult.errors.join(', ')}`);
              return;
            }

            const outUri = vscode.Uri.file(storage.getFilePath());

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

  const enableAuthorModeCommand = vscode.commands.registerCommand(
    'dad.enableAuthorMode',
    () => {
      const panel = FlowVisualizerProvider.currentPanel;
      if (!panel) {
        vscode.window.showWarningMessage('DAD: No visualizer panel open. Open a .dad.json file first.');
        return;
      }
      panel.enableAuthorMode();
    }
  );

  const generateLandscapeCommand = vscode.commands.registerCommand(
    'dad.generateLandscape',
    async (uri?: vscode.Uri) => {
      if (!uri) {
        vscode.window.showErrorMessage('DAD: No folder selected. Right-click a folder in Explorer.');
        return;
      }

      const workspacePath = uri.fsPath;

      // Check for workspace.json
      const workspaceConfigPath = path.join(workspacePath, 'workspace.json');
      try {
        await vscode.workspace.fs.stat(vscode.Uri.file(workspaceConfigPath));
      } catch {
        vscode.window.showErrorMessage(
          'DAD: No workspace.json found. Create one listing your systems.'
        );
        return;
      }

      await vscode.window.withProgress(
        {
          location: vscode.ProgressLocation.Notification,
          title: 'DAD: Generating Landscape',
          cancellable: false,
        },
        async (progress) => {
          try {
            const aggregator = new LandscapeAggregator({
              workspacePath,
              onProgress: (_stage, message, percent) => {
                progress.report({ message, increment: percent });
              },
            });

            const result = await aggregator.aggregate();
            const landscapeFile = result.landscapeFile;

            // Save landscape file via DadStorage
            const storage = new DadStorage(workspacePath);
            const saveResult = storage.saveLandscape(landscapeFile as unknown as DadFile);
            if (!saveResult.success) {
              vscode.window.showErrorMessage(`DAD: Save failed — ${saveResult.errors.join(', ')}`);
              return;
            }

            const systemCount = result.systemSummaries.length;
            vscode.window.showInformationMessage(
              `DAD: Landscape complete — ${systemCount} systems, ${landscapeFile.nodes.length} nodes, ${landscapeFile.edges.length} edges`
            );

            // Open the landscape file in the visualizer
            const landscapeFilePath = path.join(workspacePath, '.dad', 'levels', 'landscape.dad.json');
            const outUri = vscode.Uri.file(landscapeFilePath);
            await vscode.commands.executeCommand('dad.visualizeDadFile', outUri);
          } catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            vscode.window.showErrorMessage(`DAD: Landscape generation failed — ${msg}`);
          }
        }
      );
    }
  );

  context.subscriptions.push(visualizeCommand, analyzeCommand, enableAuthorModeCommand, generateLandscapeCommand);
}

export function deactivate() {}
