import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { FlowChartData } from '../../shared/types';

export interface SavedFlowChart {
  id: string;
  name: string;
  timestamp: number;
  sourceFile: string;
  codeSnippet: string;
  language: string;
  flowChart: FlowChartData;
  metadata: {
    linesOfCode: number;
    selectionStart: { line: number; character: number };
    selectionEnd: { line: number; character: number };
  };
  editHistory?: {
    originalGenerated: FlowChartData;
    userEdited?: FlowChartData;
    lastModified?: number;
    editCount?: number;
  };
  renderedOutputs?: {
    svg?: {
      d2?: string; // Path to D2 SVG file
      mermaid?: string; // Path to Mermaid SVG file
      lastRendered?: number;
    };
    d2Source?: string; // Path to D2 source file
    mermaidSource?: string; // Path to Mermaid source file
  };
}

export class FlowChartStorage {
  private storageDir: string;
  private readonly STORAGE_FOLDER = '.daad';
  private readonly FILE_EXTENSION = '.daad.json';

  constructor(private workspaceRoot: string) {
    this.storageDir = path.join(workspaceRoot, this.STORAGE_FOLDER);
    this.ensureStorageDir();
  }

  private ensureStorageDir(): void {
    if (!fs.existsSync(this.storageDir)) {
      fs.mkdirSync(this.storageDir, { recursive: true });
      // Create a .gitignore file to optionally exclude .daad files from version control
      const gitignorePath = path.join(this.storageDir, '.gitignore');
      if (!fs.existsSync(gitignorePath)) {
        fs.writeFileSync(gitignorePath, '# Uncomment the next line to exclude saved flow charts from git\n# *.daad.json\n');
      }
    }
  }

  /**
   * Save a flow chart with auto-generated name based on code content
   */
  async saveFlowChart(
    flowChart: FlowChartData,
    codeSnippet: string,
    sourceFile: string,
    language: string,
    selection: vscode.Selection
  ): Promise<string> {
    const id = this.generateId();
    const name = this.generateName(codeSnippet, sourceFile);

    const savedChart: SavedFlowChart = {
      id,
      name,
      timestamp: Date.now(),
      sourceFile,
      codeSnippet,
      language,
      flowChart,
      metadata: {
        linesOfCode: codeSnippet.split('\n').length,
        selectionStart: {
          line: selection.start.line,
          character: selection.start.character
        },
        selectionEnd: {
          line: selection.end.line,
          character: selection.end.character
        }
      }
    };

    const fileName = `${id}${this.FILE_EXTENSION}`;
    const filePath = path.join(this.storageDir, fileName);

    fs.writeFileSync(filePath, JSON.stringify(savedChart, null, 2));

    return id;
  }

  /**
   * Load a specific flow chart by ID
   */
  async loadFlowChart(id: string): Promise<SavedFlowChart | null> {
    const fileName = `${id}${this.FILE_EXTENSION}`;
    const filePath = path.join(this.storageDir, fileName);

    if (!fs.existsSync(filePath)) {
      return null;
    }

    const content = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(content) as SavedFlowChart;
  }

  /**
   * List all saved flow charts
   */
  async listFlowCharts(): Promise<SavedFlowChart[]> {
    if (!fs.existsSync(this.storageDir)) {
      return [];
    }

    const files = fs.readdirSync(this.storageDir)
      .filter(file => file.endsWith(this.FILE_EXTENSION));

    const charts: SavedFlowChart[] = [];

    for (const file of files) {
      const filePath = path.join(this.storageDir, file);
      try {
        const content = fs.readFileSync(filePath, 'utf-8');
        const chart = JSON.parse(content) as SavedFlowChart;
        charts.push(chart);
      } catch (error) {
        console.error(`Failed to load chart from ${file}:`, error);
      }
    }

    // Sort by timestamp, newest first
    return charts.sort((a, b) => b.timestamp - a.timestamp);
  }

  /**
   * Delete a saved flow chart
   */
  async deleteFlowChart(id: string): Promise<boolean> {
    const fileName = `${id}${this.FILE_EXTENSION}`;
    const filePath = path.join(this.storageDir, fileName);

    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      return true;
    }

    return false;
  }

  /**
   * Generate a unique ID for the flow chart
   */
  private generateId(): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    return `${timestamp}_${random}`;
  }

  /**
   * Generate a descriptive name based on the code content
   */
  private generateName(code: string, sourceFile: string): string {
    const fileName = path.basename(sourceFile, path.extname(sourceFile));

    // Try to extract a function/class name from the code
    const functionMatch = code.match(/(?:function|const|let|var|class|def|func)\s+(\w+)/);
    const methodMatch = code.match(/(\w+)\s*\(/);

    let identifier = '';
    if (functionMatch) {
      identifier = functionMatch[1];
    } else if (methodMatch) {
      identifier = methodMatch[1];
    }

    // Extract key operations (for, while, if, etc.)
    const hasLoop = /(?:for|while|forEach|map)/.test(code);
    const hasCondition = /(?:if|switch|case)/.test(code);

    let operation = '';
    if (hasLoop && hasCondition) {
      operation = 'loop_condition';
    } else if (hasLoop) {
      operation = 'loop';
    } else if (hasCondition) {
      operation = 'condition';
    }

    // Build the name
    const parts = [fileName];
    if (identifier) {
      parts.push(identifier);
    }
    if (operation) {
      parts.push(operation);
    }

    // Add timestamp for uniqueness
    const date = new Date();
    const timeStr = `${date.getHours().toString().padStart(2, '0')}${date.getMinutes().toString().padStart(2, '0')}`;
    parts.push(timeStr);

    return parts.join('_');
  }

  /**
   * Search flow charts by name or content
   */
  async searchFlowCharts(query: string): Promise<SavedFlowChart[]> {
    const allCharts = await this.listFlowCharts();
    const lowerQuery = query.toLowerCase();

    return allCharts.filter(chart =>
      chart.name.toLowerCase().includes(lowerQuery) ||
      chart.sourceFile.toLowerCase().includes(lowerQuery) ||
      chart.codeSnippet.toLowerCase().includes(lowerQuery)
    );
  }

  /**
   * Get storage statistics
   */
  async getStorageStats(): Promise<{
    totalCharts: number;
    totalSize: number;
    oldestChart: SavedFlowChart | null;
    newestChart: SavedFlowChart | null;
  }> {
    const charts = await this.listFlowCharts();

    let totalSize = 0;
    const files = fs.readdirSync(this.storageDir)
      .filter(file => file.endsWith(this.FILE_EXTENSION));

    for (const file of files) {
      const filePath = path.join(this.storageDir, file);
      const stats = fs.statSync(filePath);
      totalSize += stats.size;
    }

    return {
      totalCharts: charts.length,
      totalSize,
      oldestChart: charts.length > 0 ? charts[charts.length - 1] : null,
      newestChart: charts.length > 0 ? charts[0] : null
    };
  }

  /**
   * Update an existing flow chart with edited data
   */
  async updateFlowChartWithEdit(id: string, editedFlowChart: FlowChartData): Promise<boolean> {
    const existing = await this.loadFlowChart(id);
    if (!existing) {
      return false;
    }

    // Initialize edit history if not present
    if (!existing.editHistory) {
      existing.editHistory = {
        originalGenerated: existing.flowChart,
        editCount: 0
      };
    }

    // Update with edited version
    existing.editHistory.userEdited = editedFlowChart;
    existing.editHistory.lastModified = Date.now();
    existing.editHistory.editCount = (existing.editHistory.editCount || 0) + 1;
    existing.flowChart = editedFlowChart; // Update current to edited version

    const fileName = `${id}${this.FILE_EXTENSION}`;
    const filePath = path.join(this.storageDir, fileName);

    fs.writeFileSync(filePath, JSON.stringify(existing, null, 2));
    return true;
  }

  /**
   * Restore original generated version of a flow chart
   */
  async restoreOriginal(id: string): Promise<boolean> {
    const existing = await this.loadFlowChart(id);
    if (!existing || !existing.editHistory?.originalGenerated) {
      return false;
    }

    existing.flowChart = existing.editHistory.originalGenerated;
    delete existing.editHistory.userEdited;
    existing.editHistory.lastModified = Date.now();

    const fileName = `${id}${this.FILE_EXTENSION}`;
    const filePath = path.join(this.storageDir, fileName);

    fs.writeFileSync(filePath, JSON.stringify(existing, null, 2));
    return true;
  }

  /**
   * Save rendered SVG output for a flow chart
   */
  async saveSVGOutput(
    id: string,
    svgContent: string,
    format: 'd2' | 'mermaid'
  ): Promise<boolean> {
    const existing = await this.loadFlowChart(id);
    if (!existing) {
      return false;
    }

    // Initialize renderedOutputs if not present
    if (!existing.renderedOutputs) {
      existing.renderedOutputs = {};
    }
    if (!existing.renderedOutputs.svg) {
      existing.renderedOutputs.svg = {};
    }

    // Save SVG file
    const svgFileName = `${id}.${format}.svg`;
    const svgFilePath = path.join(this.storageDir, svgFileName);
    fs.writeFileSync(svgFilePath, svgContent);

    // Update metadata
    existing.renderedOutputs.svg[format] = svgFileName;
    existing.renderedOutputs.svg.lastRendered = Date.now();

    // Save updated JSON
    const fileName = `${id}${this.FILE_EXTENSION}`;
    const filePath = path.join(this.storageDir, fileName);
    fs.writeFileSync(filePath, JSON.stringify(existing, null, 2));

    return true;
  }

  /**
   * Save diagram source file (D2 or Mermaid)
   */
  async saveDiagramSource(
    id: string,
    sourceContent: string,
    format: 'd2' | 'mermaid'
  ): Promise<boolean> {
    const existing = await this.loadFlowChart(id);
    if (!existing) {
      return false;
    }

    // Initialize renderedOutputs if not present
    if (!existing.renderedOutputs) {
      existing.renderedOutputs = {};
    }

    // Save source file
    const extension = format === 'd2' ? 'd2' : 'mmd';
    const sourceFileName = `${id}.${extension}`;
    const sourceFilePath = path.join(this.storageDir, sourceFileName);
    fs.writeFileSync(sourceFilePath, sourceContent);

    // Update metadata
    if (format === 'd2') {
      existing.renderedOutputs.d2Source = sourceFileName;
    } else {
      existing.renderedOutputs.mermaidSource = sourceFileName;
    }

    // Save updated JSON
    const fileName = `${id}${this.FILE_EXTENSION}`;
    const filePath = path.join(this.storageDir, fileName);
    fs.writeFileSync(filePath, JSON.stringify(existing, null, 2));

    return true;
  }

  /**
   * Get SVG output path for a flow chart
   */
  async getSVGPath(id: string, format: 'd2' | 'mermaid'): Promise<string | null> {
    const existing = await this.loadFlowChart(id);
    if (!existing?.renderedOutputs?.svg?.[format]) {
      return null;
    }

    const svgFileName = existing.renderedOutputs.svg[format];
    return path.join(this.storageDir, svgFileName);
  }

  /**
   * Load SVG content for a flow chart
   */
  async loadSVGContent(id: string, format: 'd2' | 'mermaid'): Promise<string | null> {
    const svgPath = await this.getSVGPath(id, format);
    if (!svgPath || !fs.existsSync(svgPath)) {
      return null;
    }

    return fs.readFileSync(svgPath, 'utf-8');
  }

  /**
   * Get diagram source path
   */
  async getDiagramSourcePath(id: string, format: 'd2' | 'mermaid'): Promise<string | null> {
    const existing = await this.loadFlowChart(id);
    if (!existing?.renderedOutputs) {
      return null;
    }

    const sourceFileName = format === 'd2'
      ? existing.renderedOutputs.d2Source
      : existing.renderedOutputs.mermaidSource;

    if (!sourceFileName) {
      return null;
    }

    return path.join(this.storageDir, sourceFileName);
  }

  /**
   * Load diagram source content
   */
  async loadDiagramSourceContent(id: string, format: 'd2' | 'mermaid'): Promise<string | null> {
    const sourcePath = await this.getDiagramSourcePath(id, format);
    if (!sourcePath || !fs.existsSync(sourcePath)) {
      return null;
    }

    return fs.readFileSync(sourcePath, 'utf-8');
  }
}