import * as vscode from 'vscode';
import { GitUtils, ChangeSummary } from '../utils/git';
import { FlowVisualizerProvider } from '../providers/FlowVisualizerProvider';
import { ClaudeClient } from '../claude/client';
import { OpenRouterClient } from '../openrouter/client';

export interface VisualizeChangesOptions {
  workspacePath: string;
  client: ClaudeClient | OpenRouterClient;
  extensionUri: vscode.Uri;
  workersApiUrl?: string;
}

export class VisualizeChangesCommand {
  /**
   * Execute the visualize changes command
   */
  static async execute(options: VisualizeChangesOptions): Promise<void> {
    const { workspacePath, client, extensionUri, workersApiUrl } = options;

    try {
      // Check if it's a git repository
      const isRepo = await GitUtils.isGitRepository(workspacePath);
      if (!isRepo) {
        vscode.window.showErrorMessage('Not a git repository. This command requires git.');
        return;
      }

      // Check if there are any changes
      const hasChanges = await GitUtils.hasChanges(workspacePath);
      if (!hasChanges) {
        vscode.window.showInformationMessage('No uncommitted changes found.');
        return;
      }

      // Show loading indicator
      await vscode.window.withProgress(
        {
          location: vscode.ProgressLocation.Notification,
          title: 'Visualizing Changes',
          cancellable: false,
        },
        async (progress) => {
          progress.report({ message: 'Detecting changes...' });

          // Get uncommitted changes
          const changes = await GitUtils.getUncommittedChanges(workspacePath);

          if (changes.files.length === 0) {
            vscode.window.showInformationMessage('No file changes detected.');
            return;
          }

          progress.report({
            message: `Found ${changes.files.length} changed file(s). Extracting code...`,
          });

          // Extract code snippets from changed regions
          const snippets = await GitUtils.extractChangedCodeSnippets(
            workspacePath,
            changes.files
          );

          if (snippets.length === 0) {
            vscode.window.showInformationMessage('No code changes to visualize.');
            return;
          }

          progress.report({
            message: `Analyzing ${snippets.length} code snippet(s)...`,
          });

          // Get branch and commit info
          const branch = await GitUtils.getCurrentBranch(workspacePath);
          const baseSha = await GitUtils.getCurrentCommitSha(workspacePath);

          // Create webview panel
          const panel = FlowVisualizerProvider.createOrShow(extensionUri);
          panel.showLoading();

          // Prepare the code for analysis
          const combinedCode = this.combineCodeSnippets(snippets, changes);

          try {
            // If Workers API URL is provided, call the preview API
            if (workersApiUrl) {
              progress.report({ message: 'Calling Workers preview API...' });
              const diagramData = await this.callWorkersPreviewApi(
                workersApiUrl,
                combinedCode,
                changes.tempCommitSha || 'uncommitted',
                branch,
                baseSha
              );

              if (diagramData) {
                panel.updateFlowChart(diagramData);
                vscode.window.showInformationMessage(
                  `Changes visualized: ${changes.files.length} file(s), ` +
                    `+${changes.totalAdditions} -${changes.totalDeletions} lines`
                );
                return;
              }
            }

            // Fallback: Use local Claude/OpenRouter client
            progress.report({ message: 'Analyzing changes with AI...' });
            const flowChartData = await client.analyzeCode(
              combinedCode,
              'typescript' // Default language, could be improved with language detection
            );

            // Update the webview with the flow chart
            panel.updateFlowChart(flowChartData);

            // Show success message with stats
            vscode.window.showInformationMessage(
              `Changes visualized: ${changes.files.length} file(s), ` +
                `+${changes.totalAdditions} -${changes.totalDeletions} lines`
            );
          } catch (error) {
            const errorMessage =
              error instanceof Error ? error.message : 'Unknown error occurred';
            panel.showError(errorMessage);
            vscode.window.showErrorMessage(
              `Failed to visualize changes: ${errorMessage}`
            );
          }
        }
      );
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error occurred';
      vscode.window.showErrorMessage(`Failed to visualize changes: ${errorMessage}`);
    }
  }

  /**
   * Combine code snippets into a single code block with context
   */
  private static combineCodeSnippets(
    snippets: { file: string; code: string; language: string }[],
    changes: ChangeSummary
  ): string {
    const header = [
      '// ===== GIT CHANGES SUMMARY =====',
      `// Total Files Changed: ${changes.files.length}`,
      `// Total Additions: +${changes.totalAdditions}`,
      `// Total Deletions: -${changes.totalDeletions}`,
      `// Status: ${changes.hasStaged ? 'Staged' : 'Unstaged'} changes`,
      changes.tempCommitSha ? `// Temp Commit SHA: ${changes.tempCommitSha}` : '',
      '// ================================',
      '',
    ]
      .filter(Boolean)
      .join('\n');

    const codeBlocks = snippets
      .map((snippet, index) => {
        return [
          `// ===== CHANGE ${index + 1}: ${snippet.file} =====`,
          snippet.code,
          '',
          '// ===== END CHANGE =====',
          '',
        ].join('\n');
      })
      .join('\n');

    return header + '\n' + codeBlocks;
  }

  /**
   * Call the Workers preview API
   */
  private static async callWorkersPreviewApi(
    apiUrl: string,
    code: string,
    commitSha: string,
    branch: string,
    baseSha: string
  ): Promise<any> {
    try {
      const response = await fetch(`${apiUrl}/api/preview`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          code,
          commitSha,
          branch,
          baseSha,
          type: 'uncommitted',
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(
          `Workers API error: ${response.status} - ${errorText}`
        );
      }

      const result = await response.json();
      return result.diagram || result.flowChart;
    } catch (error) {
      console.error('Workers API call failed:', error);
      // Return null to fallback to local analysis
      return null;
    }
  }

  /**
   * Show a quick pick with options for visualizing changes
   */
  static async showChangeOptions(options: VisualizeChangesOptions): Promise<void> {
    const { workspacePath } = options;

    // Get change summary
    const changes = await GitUtils.getUncommittedChanges(workspacePath);

    if (changes.files.length === 0) {
      vscode.window.showInformationMessage('No uncommitted changes found.');
      return;
    }

    // Build quick pick items
    const items: vscode.QuickPickItem[] = [
      {
        label: '$(graph) Visualize All Changes',
        description: `${changes.files.length} file(s), +${changes.totalAdditions} -${changes.totalDeletions}`,
        detail: 'Analyze and visualize all uncommitted changes',
      },
    ];

    // Add individual file options
    changes.files.forEach((file) => {
      const icon =
        file.changeType === 'added'
          ? '$(diff-added)'
          : file.changeType === 'deleted'
          ? '$(diff-removed)'
          : file.changeType === 'renamed'
          ? '$(diff-renamed)'
          : '$(diff-modified)';

      items.push({
        label: `${icon} ${file.file}`,
        description: file.changeType,
        detail: `${file.hunks.length} change region(s)`,
      });
    });

    const selected = await vscode.window.showQuickPick(items, {
      placeHolder: 'Select what to visualize',
      matchOnDescription: true,
      matchOnDetail: true,
    });

    if (!selected) {
      return;
    }

    // Execute visualization
    if (selected.label.includes('Visualize All Changes')) {
      await this.execute(options);
    } else {
      // TODO: Implement single-file visualization
      vscode.window.showInformationMessage('Single file visualization coming soon!');
    }
  }
}
