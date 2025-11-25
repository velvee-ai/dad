import * as vscode from 'vscode';
import { ClaudeClient } from './extension/claude/client';
import { OpenRouterClient } from './extension/openrouter/client';
import { FlowVisualizerProvider } from './extension/providers/FlowVisualizerProvider';
import { FlowChartStorage } from './extension/storage/FlowChartStorage';
import { SavedChartsProvider } from './extension/providers/SavedChartsProvider';
import { CodeAnalyzer } from './extension/utils/codeAnalyzer';
import { DexieCacheManager, CachedFlowChart } from './extension/storage/DexieCacheManager';
import { FlowChartData } from './shared/types';

let claudeClient: ClaudeClient | OpenRouterClient;
let storage: FlowChartStorage;
let cacheManager: DexieCacheManager | undefined;
let statusBarItem: vscode.StatusBarItem;

export async function activate(context: vscode.ExtensionContext) {
  console.log('DAAD - Diagram as a Delivery extension is now active!');

  try {
    // Create status bar item to show API provider
    statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
    context.subscriptions.push(statusBarItem);

    // Initialize the appropriate client based on configuration
    const config = vscode.workspace.getConfiguration('daad');
    const apiProvider = config.get<string>('apiProvider') || 'claude';

    if (apiProvider === 'openrouter') {
      claudeClient = new OpenRouterClient();
      const model = config.get<string>('openRouterModel') || 'qwen/qwen-2.5-coder-32b-instruct';
      const modelShort = model.split('/')[1]?.split('-')[0] || model;
      statusBarItem.text = `$(globe) DAAD: OpenRouter (${modelShort})`;
      statusBarItem.tooltip = `DAAD using OpenRouter API\nModel: ${model}`;
      statusBarItem.show();
      console.log('DAAD: Using OpenRouter API for code analysis');
      vscode.window.showInformationMessage(`DAAD: Using OpenRouter API (${model})`);
    } else {
      claudeClient = new ClaudeClient();
      statusBarItem.text = `$(terminal) DAAD: Claude CLI`;
      statusBarItem.tooltip = 'DAAD using Claude Code CLI';
      statusBarItem.show();
      console.log('DAAD: Using Claude Code CLI for code analysis');
      vscode.window.showInformationMessage('DAAD: Using Claude Code CLI');
    }

    // Watch for configuration changes
    context.subscriptions.push(
      vscode.workspace.onDidChangeConfiguration(e => {
        if (
          e.affectsConfiguration('daad.apiProvider') ||
          e.affectsConfiguration('daad.openRouterModel')
        ) {
          vscode.window
            .showWarningMessage(
              'DAAD: API provider settings changed. Please reload the window to apply changes.',
              'Reload Window'
            )
            .then(selection => {
              if (selection === 'Reload Window') {
                vscode.commands.executeCommand('workbench.action.reloadWindow');
              }
            });
        }
      })
    );

    // Initialize storage with workspace root
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
    let savedChartsProvider: SavedChartsProvider | undefined;

    if (workspaceFolder) {
      try {
        console.log('DexieCacheManager initializing', workspaceFolder.uri.fsPath);
        storage = new FlowChartStorage(workspaceFolder.uri.fsPath);
        console.log('FlowChartStorage stats', storage.getStorageStats());
        cacheManager = await DexieCacheManager.create(workspaceFolder.uri.fsPath);
        const stats = await cacheManager.getCacheStats();
        console.log('DexieCacheManager stats', stats);
        await cacheManager.cleanupOldEntries();
      } catch (error) {
        console.error('Failed to initialize storage/cache:', error);
        vscode.window.showWarningMessage(
          'DAAD: Failed to initialize cache. Extension will work without caching.'
        );
      }

      // Create tree data provider for saved charts
      savedChartsProvider = new SavedChartsProvider(storage, context.extensionUri);
      vscode.window.createTreeView('daadSavedCharts', {
        treeDataProvider: savedChartsProvider,
        showCollapseAll: true
      });

      // Watch for changes in .daad folder
      const daadPattern = new vscode.RelativePattern(workspaceFolder, '.daad/*.daad.json');
      const fileWatcher = vscode.workspace.createFileSystemWatcher(daadPattern);

      fileWatcher.onDidCreate(() => {
        savedChartsProvider?.refresh();
      });

      fileWatcher.onDidChange(() => {
        savedChartsProvider?.refresh();
      });

      fileWatcher.onDidDelete(() => {
        savedChartsProvider?.refresh();
      });

      context.subscriptions.push(fileWatcher);
    }

  // Register the visualize command
  const visualizeCommand = vscode.commands.registerCommand(
    'daad.visualize',
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

      // Set up save handler for edited diagrams
      let currentChartId: string | undefined;
      panel.setSaveHandler(async (editedData) => {
        if (storage && currentChartId) {
          const success = await storage.updateFlowChartWithEdit(currentChartId, editedData);
          if (success) {
            vscode.window.showInformationMessage('Flow chart saved successfully!');
            if (savedChartsProvider) {
              savedChartsProvider.refresh();
            }
          } else {
            vscode.window.showErrorMessage('Failed to save flow chart.');
          }
        }
      });

      // Show loading state
      panel.showLoading();

      try {
        // Check cache first
        if (cacheManager) {
          const cached = await cacheManager.findCachedByCode(
            selectedText,
            editor.document.fileName
          );

          if (cached) {
            const resolved = await resolveCachedFlowChart(cached, storage);
            if (resolved.flowChart) {
              vscode.window.showInformationMessage('Using cached flow chart (no Claude call needed)');
              panel.updateFlowChart(resolved.flowChart);
              currentChartId = resolved.chartId;
              return; // Exit early, no need to call Claude
            }
          }
        }

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

        // Analyze code with Claude (cache miss)
        vscode.window.showInformationMessage('Cache miss - Analyzing code with Claude...');
        const flowChartData = await claudeClient.analyzeCode(selectedText, language);

        let savedChartId: string | undefined;

        // Auto-save the flow chart to .daad folder
        if (storage && flowChartData) {
          try {
            savedChartId = await storage.saveFlowChart(
              flowChartData,
              selectedText,
              editor.document.fileName,
              language,
              selection
            );
            currentChartId = savedChartId;
            console.log(`Flow chart saved with ID: ${currentChartId}`);

            // Refresh the saved charts view
            if (savedChartsProvider) {
              savedChartsProvider.refresh();
            }
          } catch (saveError) {
            console.error('Failed to save flow chart:', saveError);
          }
        }

        // Save to cache (store pointer to saved chart when available)
        if (cacheManager && flowChartData) {
          await cacheManager.saveToCache(
            selectedText,
            editor.document.fileName,
            language,
            flowChartData,
            selection.start.line,
            selection.end.line,
            savedChartId
          );
        }

        // Update the webview with the flow chart
        panel.updateFlowChart(flowChartData);
        vscode.window.showInformationMessage('Flow chart generated and saved successfully!');

      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        panel.showError(errorMessage);
        vscode.window.showErrorMessage(`Failed to generate flow chart: ${errorMessage}`);
      }
    }
  );

  // Register command to visualize entire file
  const visualizeFileCommand = vscode.commands.registerCommand(
    'daad.visualizeFile',
    async (uri?: vscode.Uri) => {
      let document: vscode.TextDocument;

      if (uri) {
        // Called from explorer context menu - use the URI
        document = await vscode.workspace.openTextDocument(uri);
      } else if (vscode.window.activeTextEditor) {
        // Called from command palette or keyboard shortcut - use active editor
        document = vscode.window.activeTextEditor.document;
      } else {
        vscode.window.showErrorMessage('No active editor found. Please open a file or right-click a file in Explorer.');
        return;
      }

      const language = document.languageId;

      // Check if file is too large
      if (CodeAnalyzer.isFileTooLarge(document)) {
        const choice = await vscode.window.showWarningMessage(
          'This file is large. Would you like to visualize it in chunks or analyze all functions separately?',
          'Chunks',
          'Functions',
          'Cancel'
        );

        if (choice === 'Cancel' || !choice) {
          return;
        }

        if (choice === 'Functions') {
          vscode.commands.executeCommand('daad.visualizeAllFunctions');
          return;
        }
      }

      const panel = FlowVisualizerProvider.createOrShow(context.extensionUri);
      panel.showLoading();

      try {
        const fullText = document.getText();

        // Check cache first
        if (cacheManager) {
          const cached = await cacheManager.findCachedByCode(fullText, document.fileName);
          if (cached) {
            const resolved = await resolveCachedFlowChart(cached, storage);
            if (resolved.flowChart) {
              vscode.window.showInformationMessage('✅ Using cached flow chart (no API call)');
              panel.updateFlowChart(resolved.flowChart);
              return;
            }
          }
        }

        vscode.window.showInformationMessage('Analyzing entire file...');
        const flowChartData = await claudeClient.analyzeCode(fullText, language);

        let savedId: string | undefined;

        // Save with file-specific naming (keep for backward compatibility)
        if (storage && flowChartData) {
          try {
            savedId = await storage.saveFlowChart(
              flowChartData,
              fullText,
              document.fileName,
              language,
              new vscode.Selection(0, 0, document.lineCount - 1, 0)
            );
            console.log(`Full file flow chart saved with ID: ${savedId}`);

            savedChartsProvider?.refresh();
          } catch (saveError) {
            console.error('Failed to save flow chart:', saveError);
          }
        }

        // Save to cache
        if (cacheManager && flowChartData) {
          await cacheManager.saveToCache(
            fullText,
            document.fileName,
            language,
            flowChartData,
            0,
            document.lineCount - 1,
            savedId
          );
        }

        panel.updateFlowChart(flowChartData);
        vscode.window.showInformationMessage('File flow chart generated successfully!');

      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        panel.showError(errorMessage);
        vscode.window.showErrorMessage(`Failed to generate flow chart: ${errorMessage}`);
      }
    }
  );

  // Register command to visualize all functions in file
  const visualizeAllFunctionsCommand = vscode.commands.registerCommand(
    'daad.visualizeAllFunctions',
    async (uri?: vscode.Uri) => {
      let document: vscode.TextDocument;

      if (uri) {
        // Called from explorer context menu - use the URI
        document = await vscode.workspace.openTextDocument(uri);
      } else if (vscode.window.activeTextEditor) {
        // Called from command palette or keyboard shortcut - use active editor
        document = vscode.window.activeTextEditor.document;
      } else {
        vscode.window.showErrorMessage('No active editor found. Please open a file or right-click a file in Explorer.');
        return;
      }

      // Analyze file to find all functions/classes
      const segments = await CodeAnalyzer.analyzeFile(document);

      if (segments.length === 0) {
        vscode.window.showWarningMessage('No functions or classes found in this file');
        return;
      }

      // Show quick pick to select which function to visualize
      const items = segments.map(seg => ({
        label: `${seg.type}: ${seg.name}`,
        description: `Lines ${seg.startLine + 1}-${seg.endLine + 1}`,
        detail: seg.code.substring(0, 100) + (seg.code.length > 100 ? '...' : ''),
        segment: seg
      }));

      // Add "All" option
      items.unshift({
        label: '$(list-flat) Visualize All Functions',
        description: `Create ${segments.length} separate flow charts`,
        detail: 'Generate a flow chart for each function/class',
        segment: null as any
      });

      const selected = await vscode.window.showQuickPick(items, {
        placeHolder: 'Select function/class to visualize',
        matchOnDescription: true,
        matchOnDetail: true
      });

      if (!selected) {
        return;
      }

      const panel = FlowVisualizerProvider.createOrShow(context.extensionUri);

      if (!selected.segment) {
        // Visualize all functions - combine into single request
        vscode.window.showInformationMessage(`Analyzing ${segments.length} functions/classes in a single request...`);

        panel.showLoading();

        try {
          // Combine all segments into a single code block with markers
          const combinedCode = segments.map((seg) =>
            `// === ${seg.type.toUpperCase()}: ${seg.name} ===\n// Lines ${seg.startLine + 1}-${seg.endLine + 1}\n${seg.code}`
          ).join('\n\n// ===== NEXT FUNCTION =====\n\n');

          const language = document.languageId;

          // Check cache for combined code
          if (cacheManager) {
            const cached = await cacheManager.findCachedByCode(combinedCode, document.fileName);
            if (cached) {
              const resolved = await resolveCachedFlowChart(cached, storage);
              if (resolved.flowChart) {
                vscode.window.showInformationMessage('Using cached combined flow chart');
                panel.updateFlowChart(resolved.flowChart);
                return;
              }
            }
          }

          // Single Claude call for all functions
          const flowChartData = await claudeClient.analyzeCode(combinedCode, language);

          let combinedChartId: string | undefined;

          // Save the combined flow chart
          if (storage && flowChartData) {
            try {
              const fullSelection = new vscode.Selection(
                segments[0].startLine, 0,
                segments[segments.length - 1].endLine,
                document.lineAt(segments[segments.length - 1].endLine).text.length
              );

              combinedChartId = await storage.saveFlowChart(
                flowChartData,
                combinedCode,
                document.fileName,
                language,
                fullSelection
              );

              savedChartsProvider?.refresh();
            } catch (saveError) {
              console.error('Failed to save combined flow chart:', saveError);
            }
          }

          // Save to cache
          if (cacheManager && flowChartData) {
            await cacheManager.saveToCache(
              combinedCode,
              document.fileName,
              language,
              flowChartData,
              segments[0].startLine,
              segments[segments.length - 1].endLine,
              combinedChartId
            );
          }

          panel.updateFlowChart(flowChartData);
          vscode.window.showInformationMessage(`All ${segments.length} functions analyzed in a single flow chart!`);

        } catch (error) {
          console.error(`Failed to analyze functions:`, error);
          panel.showError(error instanceof Error ? error.message : 'Failed to analyze functions');
        }

      } else {
        // Visualize single selected function
        panel.showLoading();

        try {
          // Check cache first
          if (cacheManager) {
            const cached = await cacheManager.findCachedByCode(
              selected.segment.code,
              document.fileName
            );
            if (cached) {
              const resolved = await resolveCachedFlowChart(cached, storage);
              if (resolved.flowChart) {
                vscode.window.showInformationMessage(`Using cached flow chart for ${selected.segment.name}`);
                panel.updateFlowChart(resolved.flowChart);
                return;
              }
            }
          }

          vscode.window.showInformationMessage(`Analyzing ${selected.segment.name}...`);
          const flowChartData = await claudeClient.analyzeCode(
            selected.segment.code,
            selected.segment.language
          );

          let savedSegmentId: string | undefined;

          // Save the flow chart
          if (storage && flowChartData) {
            try {
              const selection = new vscode.Selection(
                selected.segment.startLine, 0,
                selected.segment.endLine, document.lineAt(selected.segment.endLine).text.length
              );

              savedSegmentId = await storage.saveFlowChart(
                flowChartData,
                selected.segment.code,
                document.fileName,
                selected.segment.language,
                selection
              );

              savedChartsProvider?.refresh();
            } catch (saveError) {
              console.error('Failed to save flow chart:', saveError);
            }
          }

          // Save to cache
          if (cacheManager && flowChartData) {
            await cacheManager.saveToCache(
              selected.segment.code,
              document.fileName,
              selected.segment.language,
              flowChartData,
              selected.segment.startLine,
              selected.segment.endLine,
              savedSegmentId
            );
          }

          panel.updateFlowChart(flowChartData);
          vscode.window.showInformationMessage(`Flow chart generated for ${selected.segment.name}!`);

        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
          panel.showError(errorMessage);
          vscode.window.showErrorMessage(`Failed to generate flow chart: ${errorMessage}`);
        }
      }
    }
  );

  // Register command to visualize at cursor (smart detection)
  const visualizeSmartCommand = vscode.commands.registerCommand(
    'daad.visualizeSmart',
    async (uri?: vscode.Uri) => {
      if (uri) {
        // Called from explorer - no cursor position available, so visualize entire file
        vscode.window.showInformationMessage('No cursor position available from explorer. Visualizing entire file...');
        vscode.commands.executeCommand('daad.visualizeFile', uri);
        return;
      }

      const editor = vscode.window.activeTextEditor;
      if (!editor) {
        vscode.window.showErrorMessage('No active editor found. Smart detection requires an open file with cursor position.');
        return;
      }

      const position = editor.selection.active;
      const segment = await CodeAnalyzer.getSmartSelection(editor.document, position);

      if (!segment) {
        vscode.window.showInformationMessage('No function found at cursor. Visualizing entire file...');
        vscode.commands.executeCommand('daad.visualizeFile');
        return;
      }

      const panel = FlowVisualizerProvider.createOrShow(context.extensionUri);
      panel.showLoading();

      try {
        // Check cache first
        if (cacheManager) {
          const cached = await cacheManager.findCachedByCode(segment.code, editor.document.fileName);
          if (cached) {
            const resolved = await resolveCachedFlowChart(cached, storage);
            if (resolved.flowChart) {
              vscode.window.showInformationMessage(`✅ Using cached flow chart for ${segment.name}`);
              panel.updateFlowChart(resolved.flowChart);
              return;
            }
          }
        }

        vscode.window.showInformationMessage(`Analyzing ${segment.name}...`);
        const flowChartData = await claudeClient.analyzeCode(segment.code, segment.language);

        let smartChartId: string | undefined;

        // Save the flow chart
        if (storage && flowChartData) {
          try {
            const selection = new vscode.Selection(
              segment.startLine, 0,
              segment.endLine, editor.document.lineAt(segment.endLine).text.length
            );

            smartChartId = await storage.saveFlowChart(
              flowChartData,
              segment.code,
              editor.document.fileName,
              segment.language,
              selection
            );

            savedChartsProvider?.refresh();
          } catch (saveError) {
            console.error('Failed to save flow chart:', saveError);
          }
        }

        // Save to cache
        if (cacheManager && flowChartData) {
          await cacheManager.saveToCache(
            segment.code,
            editor.document.fileName,
            segment.language,
            flowChartData,
            segment.startLine,
            segment.endLine,
            smartChartId
          );
        }

        panel.updateFlowChart(flowChartData);
        vscode.window.showInformationMessage(`Smart detection: visualized ${segment.name}!`);

      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        panel.showError(errorMessage);
        vscode.window.showErrorMessage(`Failed to generate flow chart: ${errorMessage}`);
      }
    }
  );

  // Register command to visualize entire project (hierarchical view)
  const visualizeProjectCommand = vscode.commands.registerCommand(
    'daad.visualizeProject',
    async () => {
      if (!storage || !workspaceFolder) {
        vscode.window.showErrorMessage('No workspace folder open');
        return;
      }

      const panel = FlowVisualizerProvider.createOrShow(context.extensionUri);
      panel.showLoading();

      try {
        // Load all saved .daad files
        const charts = await storage.listFlowCharts();

        if (charts.length === 0) {
          vscode.window.showWarningMessage('No flow charts found. Please analyze some functions first.');
          panel.showError('No flow charts found. Use "Visualize Function" to analyze code first.');
          return;
        }

        vscode.window.showInformationMessage(`Building hierarchical view from ${charts.length} flow charts...`);

        // Import HierarchyBuilder dynamically
        const { HierarchyBuilder } = await import('./extension/utils/HierarchyBuilder');

        // Build the hierarchical structure
        const hierarchicalData = HierarchyBuilder.buildSoftwareHierarchy(
          charts,
          workspaceFolder.uri.fsPath
        );

        // Send to webview with special command
        panel.updateHierarchicalFlowChart(hierarchicalData);

        vscode.window.showInformationMessage(
          `Hierarchical view ready! ${hierarchicalData.metadata.levels.files.length} files, ${charts.length} functions. Zoom to explore!`
        );

      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        panel.showError(errorMessage);
        vscode.window.showErrorMessage(`Failed to build hierarchical view: ${errorMessage}`);
      }
    }
  );

  // Register command to list saved flow charts
  const listCommand = vscode.commands.registerCommand(
    'daad.listSaved',
    async () => {
      if (!storage) {
        vscode.window.showErrorMessage('No workspace folder open');
        return;
      }

      const charts = await storage.listFlowCharts();
      if (charts.length === 0) {
        vscode.window.showInformationMessage('No saved flow charts found');
        return;
      }

      // Create quick pick items with details
      const items = charts.map(chart => ({
        label: chart.name,
        description: new Date(chart.timestamp).toLocaleString(),
        detail: `${chart.sourceFile} (${chart.metadata.linesOfCode} lines)`,
        chart: chart
      }));

      const selected = await vscode.window.showQuickPick(items, {
        placeHolder: 'Select a flow chart to load',
        matchOnDescription: true,
        matchOnDetail: true
      });

      if (selected) {
        // Load the selected flow chart
        const panel = FlowVisualizerProvider.createOrShow(context.extensionUri);
        panel.updateFlowChart(selected.chart.flowChart);

        // Show info about the loaded chart
        vscode.window.showInformationMessage(`Loaded: ${selected.label}`);
      }
    }
  );

  // Register command to load a specific chart
  const loadChartCommand = vscode.commands.registerCommand(
    'daad.loadChart',
    async (chart: any) => {
      if (!chart || !chart.flowChart) {
        vscode.window.showErrorMessage('Invalid chart data');
        return;
      }

      const panel = FlowVisualizerProvider.createOrShow(context.extensionUri);
      panel.updateFlowChart(chart.flowChart);
      vscode.window.showInformationMessage(`Loaded: ${chart.name}`);
    }
  );

  // Register command to open saved charts folder
  const openFolderCommand = vscode.commands.registerCommand(
    'daad.openSavedFolder',
    async () => {
      if (!storage) {
        vscode.window.showErrorMessage('No workspace folder open');
        return;
      }

      const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
      if (workspaceFolder) {
        const daadFolder = vscode.Uri.joinPath(workspaceFolder.uri, '.daad');
        vscode.commands.executeCommand('revealFileInOS', daadFolder);
      }
    }
  );

  context.subscriptions.push(visualizeCommand);
  context.subscriptions.push(visualizeFileCommand);
  context.subscriptions.push(visualizeAllFunctionsCommand);
  context.subscriptions.push(visualizeSmartCommand);
  context.subscriptions.push(visualizeProjectCommand);
  context.subscriptions.push(listCommand);
  context.subscriptions.push(loadChartCommand);
  context.subscriptions.push(openFolderCommand);
  context.subscriptions.push({
    dispose: () => {
      claudeClient.dispose();
      void cacheManager?.close();
    }
  });
} catch (error) {
  console.error('DAAD activation error:', error);
  vscode.window.showErrorMessage(`DAAD failed to activate: ${error}`);
  throw error;
}
}

export async function deactivate() {
  claudeClient?.dispose();
  if (cacheManager) {
    await cacheManager.close();
  }
}

async function resolveCachedFlowChart(
  entry: CachedFlowChart,
  storage?: FlowChartStorage
): Promise<{ flowChart: FlowChartData | null; chartId?: string }> {
  if (entry.chartId && storage) {
    const saved = await storage.loadFlowChart(entry.chartId);
    if (saved?.flowChart) {
      return { flowChart: saved.flowChart, chartId: entry.chartId };
    }
  }

  if (entry.flowChart) {
    return { flowChart: entry.flowChart, chartId: entry.chartId };
  }

  return { flowChart: null, chartId: entry.chartId };
}
