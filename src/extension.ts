import * as vscode from 'vscode';
import { ClaudeClient } from './extension/claude/client';
import { FlowVisualizerProvider } from './extension/providers/FlowVisualizerProvider';

let claudeClient: ClaudeClient;

export function activate(context: vscode.ExtensionContext) {
  console.log('Claude Flow Visualizer extension is now active!');

  claudeClient = new ClaudeClient();

  // Register the visualize command
  const visualizeCommand = vscode.commands.registerCommand(
    'claudeFlow.visualize',
    async () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor) {
        vscode.window.showErrorMessage('No active editor found');
        return;
      }

      const selection = editor.selection;
      if (selection.isEmpty) {
        vscode.window.showErrorMessage('Please select code to visualize');
        return;
      }

      const selectedText = editor.document.getText(selection);
      const language = editor.document.languageId;

      // Create or show the webview panel
      const panel = FlowVisualizerProvider.createOrShow(context.extensionUri);

      // Show loading state
      panel.showLoading();

      try {
        // Check if Claude is available
        const { exec } = require('child_process');
        exec('which claude', (error: any) => {
          if (error) {
            panel.showError('Claude Code CLI not found. Please ensure Claude Code is installed and available in your PATH.');
            vscode.window.showErrorMessage(
              'Claude Code CLI not found. Please install Claude Code and ensure it\'s available in your PATH.',
              'Open Claude Code Docs'
            ).then(selection => {
              if (selection === 'Open Claude Code Docs') {
                vscode.env.openExternal(vscode.Uri.parse('https://claude.com/claude-code'));
              }
            });
            return;
          }
        });

        // Analyze code with Claude
        vscode.window.showInformationMessage('Analyzing code with Claude...');
        const flowChartData = await claudeClient.analyzeCode(selectedText, language);

        // Update the webview with the flow chart
        panel.updateFlowChart(flowChartData);
        vscode.window.showInformationMessage('Flow chart generated successfully!');

      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        panel.showError(errorMessage);
        vscode.window.showErrorMessage(`Failed to generate flow chart: ${errorMessage}`);
      }
    }
  );

  context.subscriptions.push(visualizeCommand);
  context.subscriptions.push({
    dispose: () => {
      claudeClient.dispose();
    }
  });
}

export function deactivate() {
  if (claudeClient) {
    claudeClient.dispose();
  }
}