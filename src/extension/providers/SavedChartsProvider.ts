import * as vscode from 'vscode';
import * as path from 'path';
import { FlowChartStorage, SavedFlowChart } from '../storage/FlowChartStorage';

export class SavedChartsProvider implements vscode.TreeDataProvider<SavedChartItem> {
  private _onDidChangeTreeData: vscode.EventEmitter<SavedChartItem | undefined | null | void> = new vscode.EventEmitter<SavedChartItem | undefined | null | void>();
  readonly onDidChangeTreeData: vscode.Event<SavedChartItem | undefined | null | void> = this._onDidChangeTreeData.event;

  constructor(
    private storage: FlowChartStorage,
    private extensionUri: vscode.Uri
  ) {}

  refresh(): void {
    this._onDidChangeTreeData.fire();
  }

  getTreeItem(element: SavedChartItem): vscode.TreeItem {
    return element;
  }

  async getChildren(element?: SavedChartItem): Promise<SavedChartItem[]> {
    if (!this.storage) {
      return [];
    }

    if (element) {
      // No children for chart items
      return [];
    } else {
      // Root level - show all saved charts
      const charts = await this.storage.listFlowCharts();
      return charts.map(chart => new SavedChartItem(
        chart,
        vscode.TreeItemCollapsibleState.None
      ));
    }
  }
}

export class SavedChartItem extends vscode.TreeItem {
  constructor(
    public readonly chart: SavedFlowChart,
    public readonly collapsibleState: vscode.TreeItemCollapsibleState
  ) {
    super(chart.name, collapsibleState);

    const date = new Date(chart.timestamp);
    this.tooltip = `${chart.name}\n${chart.sourceFile}\n${date.toLocaleString()}\n${chart.metadata.linesOfCode} lines`;
    this.description = date.toLocaleDateString();
    this.contextValue = 'savedChart';

    // Add command to open the chart when clicked
    this.command = {
      command: 'daad.loadChart',
      title: 'Load Flow Chart',
      arguments: [chart]
    };

    // Set icon based on language
    this.iconPath = new vscode.ThemeIcon('graph');
  }
}