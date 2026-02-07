import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';
import type {
  C4AnalysisResult,
  DadFile,
  DadNode,
  DadEdge,
  ProjectSkeleton,
  SkeletonNode,
} from '@dad/shared-types';
import { ProjectScanner } from '../utils/projectScanner';
import { DadStorage } from '../storage/DadStorage';
import { C4AnalysisClient } from './C4AnalysisClient';
import {
  buildLandscapePrompt,
  buildContainerPrompt,
  buildComponentPrompt,
  buildCodePrompt,
} from './promptTemplates';

interface GenerationProgress {
  stage: string;
  completed: number;
  total: number;
}

/**
 * C4Generator orchestrates the multi-pass generation pipeline:
 *   1. Scan filesystem → ProjectSkeleton
 *   2. LLM Pass: Landscape + System Context
 *   3. LLM Pass: Containers (per system)
 *   4. LLM Pass: Components (per container)
 *   5. Assemble DadFile → save to .dad/
 *
 * Code-level (L4) analysis is deferred — triggered on demand when user drills down.
 */
export class C4Generator {
  private client: C4AnalysisClient;
  private outputChannel: vscode.OutputChannel;

  constructor() {
    this.client = new C4AnalysisClient();
    this.outputChannel = vscode.window.createOutputChannel('DAD C4 Generator');
  }

  /**
   * Run the full generation pipeline on a workspace.
   * Returns the assembled DadFile.
   */
  async generate(
    workspaceRoot: string,
    progress?: vscode.Progress<{ message?: string; increment?: number }>
  ): Promise<DadFile> {
    const report = (msg: string, inc?: number) => {
      this.outputChannel.appendLine(msg);
      progress?.report({ message: msg, increment: inc });
    };

    // --- Pass 1: Filesystem scan ---
    report('Scanning project structure...', 5);
    const skeleton = ProjectScanner.scan(workspaceRoot);
    this.outputChannel.appendLine(ProjectScanner.printSkeleton(skeleton));
    report(`Found ${skeleton.nodes.length} entities`, 10);

    const nodeMap = new Map(skeleton.nodes.map(n => [n.id, n]));

    // Accumulate analysis results
    const analysisMap = new Map<string, C4AnalysisResult>();

    // --- Pass 2: Landscape + System Context ---
    report('Analyzing landscape & system context...', 5);
    const landscapeResult = await this.analyzeLandscape(skeleton, workspaceRoot);
    for (const r of landscapeResult) analysisMap.set(r.nodeId, r);
    report(`Landscape analysis: ${landscapeResult.length} nodes described`, 15);

    // --- Pass 3: Containers (per system) ---
    const systemNodes = skeleton.nodes.filter(n => n.c4Level === 'context');
    let containerProgress = 0;
    const containerIncrement = systemNodes.length > 0 ? 25 / systemNodes.length : 25;

    for (const system of systemNodes) {
      report(`Analyzing containers in "${system.name}"...`);
      const containers = skeleton.nodes.filter(
        n => n.c4Level === 'container' && n.parentId === system.id
      );

      if (containers.length > 0) {
        const result = await this.analyzeContainers(system, containers, workspaceRoot);
        for (const r of result) analysisMap.set(r.nodeId, r);
      }

      containerProgress++;
      report(
        `Container analysis ${containerProgress}/${systemNodes.length}: ${system.name}`,
        containerIncrement
      );
    }

    // --- Pass 4: Components (per container) ---
    const containerNodes = skeleton.nodes.filter(n => n.c4Level === 'container');
    let componentProgress = 0;
    const componentIncrement = containerNodes.length > 0 ? 25 / containerNodes.length : 25;

    for (const container of containerNodes) {
      report(`Analyzing components in "${container.name}"...`);
      const components = skeleton.nodes.filter(
        n => n.c4Level === 'component' && n.parentId === container.id
      );

      if (components.length > 0) {
        const result = await this.analyzeComponents(container, components, workspaceRoot);
        for (const r of result) analysisMap.set(r.nodeId, r);
      }

      componentProgress++;
      report(
        `Component analysis ${componentProgress}/${containerNodes.length}: ${container.name}`,
        componentIncrement
      );
    }

    // --- Pass 5: Assemble DadFile ---
    report('Assembling .dad file...', 10);
    const dadFile = this.assembleDadFile(skeleton, analysisMap, workspaceRoot);

    // --- Save ---
    report('Saving to .dad/landscape.dad.json...', 5);
    const storage = new DadStorage(workspaceRoot);
    const saveResult = storage.save(dadFile);

    if (!saveResult.success) {
      this.outputChannel.appendLine(`Save errors: ${saveResult.errors.join(', ')}`);
      vscode.window.showWarningMessage(
        `DAD file saved with warnings: ${saveResult.errors.length} issues`
      );
    }

    report('Generation complete!', 0);
    return dadFile;
  }

  // --- Analysis Passes ---

  private async analyzeLandscape(
    skeleton: ProjectSkeleton,
    workspaceRoot: string
  ): Promise<C4AnalysisResult[]> {
    // Read optional readme / workspace.json
    const readmePath = path.join(workspaceRoot, 'README.md');
    const readmeContent = fs.existsSync(readmePath)
      ? fs.readFileSync(readmePath, 'utf-8')
      : undefined;

    const workspacePath = path.join(workspaceRoot, 'workspace.json');
    const workspaceJson = fs.existsSync(workspacePath)
      ? fs.readFileSync(workspacePath, 'utf-8')
      : undefined;

    const prompt = buildLandscapePrompt(skeleton, readmeContent, workspaceJson);
    return this.client.analyze(prompt);
  }

  private async analyzeContainers(
    systemNode: SkeletonNode,
    containerNodes: SkeletonNode[],
    workspaceRoot: string
  ): Promise<C4AnalysisResult[]> {
    // Try to read docker-compose.yml from system dir
    let dockerCompose: string | undefined;
    if (systemNode.sourceMapping?.filePath) {
      const composePath = path.join(
        workspaceRoot,
        systemNode.sourceMapping.filePath,
        'docker-compose.yml'
      );
      if (fs.existsSync(composePath)) {
        dockerCompose = fs.readFileSync(composePath, 'utf-8');
      }
    }
    // Also check workspace root
    if (!dockerCompose) {
      const rootCompose = path.join(workspaceRoot, 'docker-compose.yml');
      if (fs.existsSync(rootCompose)) {
        dockerCompose = fs.readFileSync(rootCompose, 'utf-8');
      }
    }

    const prompt = buildContainerPrompt(systemNode, containerNodes, dockerCompose);
    return this.client.analyze(prompt);
  }

  private async analyzeComponents(
    containerNode: SkeletonNode,
    componentNodes: SkeletonNode[],
    workspaceRoot: string
  ): Promise<C4AnalysisResult[]> {
    // Read source snippets for each component
    const sourceSnippets = new Map<string, string>();

    for (const comp of componentNodes) {
      if (comp.sourceMapping?.filePath) {
        const fullPath = path.join(workspaceRoot, comp.sourceMapping.filePath);
        // If it's a directory, read the first source file inside
        if (fs.existsSync(fullPath) && fs.statSync(fullPath).isDirectory()) {
          const files = fs.readdirSync(fullPath).filter(f =>
            ['.ts', '.js', '.py', '.go', '.rs', '.java'].some(ext => f.endsWith(ext))
          );
          if (files.length > 0) {
            const content = fs.readFileSync(path.join(fullPath, files[0]), 'utf-8');
            sourceSnippets.set(comp.id, content);
          }
        } else if (fs.existsSync(fullPath)) {
          const content = fs.readFileSync(fullPath, 'utf-8');
          sourceSnippets.set(comp.id, content);
        }
      }
    }

    const prompt = buildComponentPrompt(containerNode, componentNodes, sourceSnippets);
    return this.client.analyze(prompt);
  }

  // --- Assembly ---

  private assembleDadFile(
    skeleton: ProjectSkeleton,
    analysisMap: Map<string, C4AnalysisResult>,
    workspaceRoot: string
  ): DadFile {
    const nodes: DadNode[] = [];
    const edges: DadEdge[] = [];
    let edgeCounter = 0;

    for (const skelNode of skeleton.nodes) {
      const analysis = analysisMap.get(skelNode.id);

      const dadNode: DadNode = {
        id: skelNode.id,
        c4Level: skelNode.c4Level,
        name: skelNode.name,
        type: skelNode.type,
        designSpec: analysis?.designSpec || this.defaultDesignSpec(skelNode),
        documentation: analysis?.documentation || this.defaultDocumentation(skelNode),
        sourceMapping: skelNode.sourceMapping,
        parentId: skelNode.parentId ?? null,
        childIds: skelNode.childIds,
        technology: skelNode.technology,
        tags: [],
      };

      nodes.push(dadNode);

      // Create edges from analysis relationships
      if (analysis?.relationships) {
        for (const rel of analysis.relationships) {
          // Verify target exists in skeleton
          const targetExists = skeleton.nodes.some(n => n.id === rel.targetId);
          if (targetExists) {
            edgeCounter++;
            edges.push({
              id: `edge-${edgeCounter}`,
              source: skelNode.id,
              target: rel.targetId,
              label: rel.label,
              technology: rel.technology,
              c4Level: skelNode.c4Level,
              tags: [],
            });
          }
        }
      }
    }

    const projectName = path.basename(workspaceRoot);

    // Try to get git commit
    let sourceCommit: string | undefined;
    try {
      const { execSync } = require('child_process');
      sourceCommit = execSync('git rev-parse HEAD', { cwd: workspaceRoot })
        .toString()
        .trim();
    } catch { /* not in a git repo */ }

    return {
      version: '1.0',
      metadata: {
        projectName,
        generatedAt: new Date().toISOString(),
        generatedBy: 'dad-vscode/0.0.1',
        sourceCommit,
        totalNodes: nodes.length,
        totalEdges: edges.length,
      },
      nodes,
      edges,
    };
  }

  private defaultDesignSpec(node: SkeletonNode): string {
    return [
      'element:',
      `  type: ${node.type}`,
      `  name: "${node.name}"`,
      `  description: "Auto-detected ${node.type} entity"`,
      node.technology ? `  technology: "${node.technology}"` : null,
    ].filter(Boolean).join('\n');
  }

  private defaultDocumentation(node: SkeletonNode): string {
    return `# ${node.name}\n\nAuto-detected ${node.type} at the ${node.c4Level} level.`;
  }

  dispose(): void {
    this.client.dispose();
    this.outputChannel.dispose();
  }
}
