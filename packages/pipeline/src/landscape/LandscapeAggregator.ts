import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'js-yaml';
import type { DadFile, DadNode, DadEdge } from '../types';
import type {
  LandscapeAggregatorConfig,
  LandscapeWorkspaceConfig,
  LandscapeResult,
  SystemSummary,
  ProjectContext,
  DadManifestLite,
} from './types';
import { landscapeId, systemId, edgeId } from '../assembler/IdGenerator';
import { ViewsStylesGenerator } from '../assembler/ViewsStylesGenerator';
import { CrossSystemEdgeInference } from './CrossSystemEdgeInference';

const WORKSPACE_CONFIG_FILE = 'workspace.json';

/**
 * Aggregates multiple per-project .dad/ directories into a single
 * landscape-level DadFile that shows how systems relate to each other.
 */
export class LandscapeAggregator {
  private readonly workspacePath: string;
  private readonly config: LandscapeAggregatorConfig;

  constructor(config: LandscapeAggregatorConfig) {
    this.config = config;
    this.workspacePath = config.workspacePath;
  }

  async aggregate(): Promise<LandscapeResult> {
    this.progress('load', 'Loading workspace configuration', 0);

    // 1. Load workspace config
    const wsConfig = this.config.workspaceConfig || this.loadWorkspaceConfig();

    // 2. Load project contexts
    this.progress('load', 'Loading project data', 10);
    const contexts = this.loadProjectContexts(wsConfig);
    if (contexts.length === 0) {
      throw new Error('No valid .dad/ directories found in workspace systems');
    }

    // 3. Build landscape node
    this.progress('assemble', 'Building landscape model', 30);
    const landscapeNode = this.buildLandscapeNode(wsConfig);

    // 4. Collect system nodes
    const systemNodes = this.collectSystemNodes(contexts, landscapeNode.id);

    // 5. Deduplicate persons
    const personNodes = this.deduplicatePersons(contexts, landscapeNode.id);

    // 6. Deduplicate externals
    const externalNodes = this.deduplicateExternals(contexts, landscapeNode.id);

    // 7. Set landscape childIds
    const allChildNodes = [...systemNodes, ...personNodes, ...externalNodes];
    landscapeNode.childIds = allChildNodes.map(n => n.id);

    // All nodes for the landscape file
    const allNodes: DadNode[] = [landscapeNode, ...allChildNodes];

    // 8. Infer cross-system edges
    this.progress('edges', 'Inferring cross-system relationships', 50);
    const edgeInference = new CrossSystemEdgeInference();
    const inferredEdges = edgeInference.infer(contexts);

    // 9. Add declared edges from config
    const declaredEdges = this.buildDeclaredEdges(wsConfig, allNodes);

    // Combine all edges, dedup by ID
    const allEdges = this.deduplicateEdges([...inferredEdges, ...declaredEdges]);

    // 10. Generate views and styles
    this.progress('views', 'Generating views', 70);
    const viewsGen = new ViewsStylesGenerator();
    const views = viewsGen.generateViews(allNodes);
    const styles = viewsGen.generateStyles();

    // 11. Static enrichment for landscape node
    this.progress('enrich', 'Enriching landscape metadata', 80);
    this.enrichLandscapeNode(landscapeNode, systemNodes);

    // 12. Assemble DadFile
    this.progress('assemble', 'Assembling landscape file', 90);
    const landscapeFile: DadFile = {
      version: '1.0',
      metadata: {
        projectName: wsConfig.name,
        generatedAt: new Date().toISOString(),
        generatedBy: 'dad-pipeline/landscape-aggregator',
        totalNodes: allNodes.length,
        totalEdges: allEdges.length,
      },
      nodes: allNodes,
      edges: allEdges,
      views,
      styles,
    };

    // 13. Build system summaries
    const systemSummaries = this.buildSystemSummaries(contexts);

    this.progress('done', 'Landscape aggregation complete', 100);

    return { landscapeFile, systemSummaries };
  }

  private loadWorkspaceConfig(): LandscapeWorkspaceConfig {
    const configPath = path.join(this.workspacePath, WORKSPACE_CONFIG_FILE);
    if (!fs.existsSync(configPath)) {
      throw new Error(`No ${WORKSPACE_CONFIG_FILE} found at ${this.workspacePath}`);
    }
    const content = fs.readFileSync(configPath, 'utf-8');
    return JSON.parse(content) as LandscapeWorkspaceConfig;
  }

  private loadProjectContexts(wsConfig: LandscapeWorkspaceConfig): ProjectContext[] {
    const contexts: ProjectContext[] = [];

    for (const system of wsConfig.systems) {
      const systemPath = path.resolve(this.workspacePath, system.path);
      const dadDir = path.join(systemPath, '.dad');

      if (!fs.existsSync(dadDir)) {
        console.warn(`[LandscapeAggregator] Skipping ${system.name}: no .dad/ directory at ${systemPath}`);
        continue;
      }

      // Load manifest
      const manifestPath = path.join(dadDir, 'manifest.json');
      if (!fs.existsSync(manifestPath)) {
        console.warn(`[LandscapeAggregator] Skipping ${system.name}: no manifest.json`);
        continue;
      }

      let manifest: DadManifestLite;
      try {
        manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
      } catch {
        console.warn(`[LandscapeAggregator] Skipping ${system.name}: invalid manifest.json`);
        continue;
      }

      // Load context level
      const contextPath = path.join(dadDir, 'levels', 'context.dad.json');
      if (!fs.existsSync(contextPath)) {
        console.warn(`[LandscapeAggregator] Skipping ${system.name}: no context.dad.json`);
        continue;
      }

      let contextFile: DadFile;
      try {
        contextFile = JSON.parse(fs.readFileSync(contextPath, 'utf-8'));
      } catch {
        console.warn(`[LandscapeAggregator] Skipping ${system.name}: invalid context.dad.json`);
        continue;
      }

      // Load container level (optional)
      let containerFile: DadFile | null = null;
      const containerPath = path.join(dadDir, 'levels', 'container.dad.json');
      if (fs.existsSync(containerPath)) {
        try {
          containerFile = JSON.parse(fs.readFileSync(containerPath, 'utf-8'));
        } catch {
          // container is optional, continue without it
        }
      }

      contexts.push({
        systemEntry: system,
        manifest,
        contextFile,
        containerFile,
      });
    }

    return contexts;
  }

  private buildLandscapeNode(wsConfig: LandscapeWorkspaceConfig): DadNode {
    return {
      id: landscapeId(wsConfig.name),
      c4Level: 'landscape',
      name: wsConfig.name,
      type: 'landscape',
      designSpec: '',
      documentation: '',
      parentId: null,
      childIds: [],
      tags: [],
    };
  }

  private collectSystemNodes(contexts: ProjectContext[], landscapeParentId: string): DadNode[] {
    const nodes: DadNode[] = [];

    for (const ctx of contexts) {
      const systemNode = ctx.contextFile.nodes.find(n => n.type === 'softwareSystem');
      if (!systemNode) continue;

      // Clone and re-parent to landscape, clear childIds (containers aren't in landscape)
      nodes.push({
        ...systemNode,
        c4Level: 'context',
        parentId: landscapeParentId,
        childIds: [],
        // Preserve description from workspace config if system had minimal docs
        documentation: systemNode.documentation || `${systemNode.name} software system`,
      });
    }

    return nodes;
  }

  private deduplicatePersons(contexts: ProjectContext[], landscapeParentId: string): DadNode[] {
    const personMap = new Map<string, DadNode>();

    for (const ctx of contexts) {
      const persons = ctx.contextFile.nodes.filter(n => n.type === 'person');
      for (const p of persons) {
        const existing = personMap.get(p.id);
        if (!existing) {
          personMap.set(p.id, {
            ...p,
            parentId: landscapeParentId,
            childIds: [],
          });
        } else {
          // Merge: keep richer documentation, union tags
          if (p.documentation && p.documentation.length > (existing.documentation?.length || 0)) {
            existing.documentation = p.documentation;
          }
          if (p.tags) {
            const mergedTags = new Set([...(existing.tags || []), ...p.tags]);
            existing.tags = [...mergedTags];
          }
        }
      }
    }

    return [...personMap.values()];
  }

  private deduplicateExternals(contexts: ProjectContext[], landscapeParentId: string): DadNode[] {
    const externalMap = new Map<string, DadNode>();

    for (const ctx of contexts) {
      // Collect non-boundary externals from context file
      const externals = ctx.contextFile.nodes.filter(
        n => n.type === 'externalSystem' && !n.boundary
      );
      for (const ext of externals) {
        const existing = externalMap.get(ext.id);
        if (!existing) {
          externalMap.set(ext.id, {
            ...ext,
            parentId: landscapeParentId,
            childIds: [],
          });
        } else {
          // Merge: keep richer documentation, union tags
          if (ext.documentation && ext.documentation.length > (existing.documentation?.length || 0)) {
            existing.documentation = ext.documentation;
          }
          if (ext.tags) {
            const mergedTags = new Set([...(existing.tags || []), ...ext.tags]);
            existing.tags = [...mergedTags];
          }
          if (ext.technology && !existing.technology) {
            existing.technology = ext.technology;
          }
        }
      }
    }

    return [...externalMap.values()];
  }

  private buildDeclaredEdges(wsConfig: LandscapeWorkspaceConfig, allNodes: DadNode[]): DadEdge[] {
    if (!wsConfig.relationships || wsConfig.relationships.length === 0) {
      return [];
    }

    const nodesByName = new Map<string, DadNode>();
    for (const node of allNodes) {
      nodesByName.set(node.name.toLowerCase(), node);
    }

    const edges: DadEdge[] = [];
    for (const rel of wsConfig.relationships) {
      const sourceNode = nodesByName.get(rel.source.toLowerCase())
        || allNodes.find(n => n.id === systemId(rel.source));
      const targetNode = nodesByName.get(rel.target.toLowerCase())
        || allNodes.find(n => n.id === systemId(rel.target));

      if (sourceNode && targetNode) {
        edges.push({
          id: edgeId(sourceNode.id, targetNode.id),
          source: sourceNode.id,
          target: targetNode.id,
          label: rel.label,
          technology: rel.technology,
          c4Level: 'landscape',
          tags: [...(rel.tags || []), 'declared'],
        });
      }
    }

    return edges;
  }

  private deduplicateEdges(edges: DadEdge[]): DadEdge[] {
    const seen = new Map<string, DadEdge>();
    for (const edge of edges) {
      if (!seen.has(edge.id)) {
        seen.set(edge.id, edge);
      }
    }
    return [...seen.values()];
  }

  private enrichLandscapeNode(landscapeNode: DadNode, systemNodes: DadNode[]): void {
    const systemCount = systemNodes.length;
    const description = `Workspace landscape comprising ${systemCount} system${systemCount !== 1 ? 's' : ''}`;

    const spec: Record<string, unknown> = {
      element: {
        type: 'landscape',
        name: landscapeNode.name,
        description,
        systems: systemNodes.map(s => s.name),
      },
    };
    landscapeNode.designSpec = yaml.dump(spec, { lineWidth: -1 }).trim();

    const lines: string[] = [
      `# ${landscapeNode.name}`,
      '',
      `${description}.`,
      '',
      '## Systems',
    ];
    for (const sys of systemNodes) {
      lines.push(`- **${sys.name}**${sys.technology ? ` (${sys.technology})` : ''}`);
    }

    landscapeNode.documentation = lines.join('\n');
  }

  private buildSystemSummaries(contexts: ProjectContext[]): SystemSummary[] {
    return contexts.map(ctx => {
      const containers = ctx.containerFile
        ? ctx.containerFile.nodes.filter(n => n.type === 'container' && !n.boundary).map(n => n.name)
        : [];
      const externalServices = ctx.contextFile.nodes
        .filter(n => n.type === 'externalSystem' && !n.boundary)
        .map(n => n.name);
      const persons = ctx.contextFile.nodes
        .filter(n => n.type === 'person')
        .map(n => n.name);

      return {
        name: ctx.systemEntry.name,
        path: ctx.systemEntry.path,
        nodeCount: ctx.manifest.totalNodes || ctx.manifest.nodeCount,
        edgeCount: ctx.manifest.totalEdges || ctx.manifest.edgeCount,
        containers,
        externalServices,
        persons,
      };
    });
  }

  private progress(stage: string, message: string, percent: number): void {
    this.config.onProgress?.(stage, message, percent);
  }
}
