import type {
  C4Level,
  DadFile,
  DadFileMetadata,
  DadNode,
  DadEdge,
  ScanResult,
  ComponentGroup,
  AnalyzedFile,
  DadFileSet,
  ProfileActor,
} from '../types';
import { codeUnitId, personId } from './IdGenerator';
import { EdgeInference } from './EdgeInference';
import { PersonDetector } from './PersonDetector';
import { ViewsStylesGenerator } from './ViewsStylesGenerator';

/**
 * Stage 4: Assembles DadFile structures from scan results, component groups,
 * and analyzed files. Produces one DadFile per C4 level plus a combined file.
 */
export class DadFileAssembler {
  private edgeInference = new EdgeInference();
  private personDetector = new PersonDetector();
  private viewsStylesGenerator = new ViewsStylesGenerator();

  /**
   * Assemble DadFiles from pipeline data.
   */
  assemble(
    scanResult: ScanResult,
    components: ComponentGroup[],
    analyzedFiles: AnalyzedFile[]
  ): DadFileSet {
    // Build all nodes
    const contextNodes = this.buildContextNodes(scanResult);
    const containerNodes = this.buildContainerNodes(scanResult);
    const componentNodes = this.buildComponentNodes(components);
    const codeNodes = this.buildCodeNodes(analyzedFiles, components);

    // Detect persons: use profile actors if available, otherwise heuristic detection
    let personNodes: DadNode[];
    let personEdges: DadEdge[];

    if (scanResult.profileActors?.length) {
      const profilePersons = this.buildPersonsFromProfile(scanResult.profileActors, scanResult);
      personNodes = profilePersons.map(p => p.node);
      personEdges = profilePersons.flatMap(p => p.edges);
    } else {
      const detectedPersons = this.personDetector.detect(scanResult);
      personNodes = detectedPersons.map(p => p.node);
      personEdges = detectedPersons.flatMap(p => p.edges);
    }

    // Update childIds for context nodes
    for (const sys of scanResult.systems) {
      const sysNode = contextNodes.find(n => n.id === sys.id);
      if (sysNode) {
        sysNode.childIds = [
          ...sys.containerIds,
          ...sys.dataStoreIds,
        ];
      }
    }

    // Build edges
    // Profile edges take priority over heuristic edges when available
    const profileEdges = this.edgeInference.inferEdgesFromProfile(scanResult);
    const containerEdges = profileEdges.length > 0
      ? profileEdges.filter(e => e.c4Level === 'container')
      : this.edgeInference.inferContainerEdges(scanResult);
    const contextEdges = profileEdges.length > 0
      ? profileEdges.filter(e => e.c4Level === 'context')
      : this.edgeInference.inferContextEdges(scanResult);

    // Use LSP-based import edges when imports are available; fall back to role-based heuristics
    const hasImports = analyzedFiles.some(f => f.imports.length > 0);
    const importEdges = hasImports
      ? this.edgeInference.inferComponentEdges(analyzedFiles, components)
      : [];
    const roleEdges = this.edgeInference.inferComponentEdgesFromRoles(components, containerEdges);
    // Merge: import edges take priority, add role edges for pairs not covered
    const importEdgeKeys = new Set(importEdges.map(e => `${e.source}->${e.target}`));
    const componentEdges = [
      ...importEdges,
      ...roleEdges.filter(e => !importEdgeKeys.has(`${e.source}->${e.target}`)),
    ];

    const allNodes = [...contextNodes, ...personNodes, ...containerNodes, ...componentNodes, ...codeNodes];
    const allEdges = [...contextEdges, ...personEdges, ...containerEdges, ...componentEdges];

    const metadata = this.buildMetadata(scanResult.projectName, allNodes.length, allEdges.length);

    // Generate views and styles
    const views = this.viewsStylesGenerator.generateViews(allNodes);
    const styles = this.viewsStylesGenerator.generateStyles();

    return {
      context: this.filterByLevel('context', allNodes, allEdges, metadata),
      container: this.filterByLevel('container', allNodes, allEdges, metadata),
      component: this.filterByLevel('component', allNodes, allEdges, metadata),
      code: this.filterByLevel('code', allNodes, allEdges, metadata),
      combined: {
        version: '1.0',
        metadata: { ...metadata, totalNodes: allNodes.length, totalEdges: allEdges.length },
        nodes: allNodes,
        edges: allEdges,
        views,
        styles,
      },
    };
  }

  private buildPersonsFromProfile(
    actors: ProfileActor[],
    scanResult: ScanResult
  ): Array<{ node: DadNode; edges: DadEdge[] }> {
    return actors.map(actor => {
      const id = personId(actor.name);
      const node: DadNode = {
        id,
        c4Level: 'context',
        name: actor.name,
        type: 'person',
        designSpec: '',
        documentation: actor.description,
        parentId: null,
        childIds: [],
        scope: actor.scope,
        tags: [actor.scope === 'external' ? 'external-person' : 'internal-person'],
      };

      // Edges from actors to containers come from profileRelationships
      // (handled by EdgeInference.inferEdgesFromProfile)
      return { node, edges: [] };
    });
  }

  private buildContextNodes(scanResult: ScanResult): DadNode[] {
    const nodes: DadNode[] = [];

    // Software system nodes
    for (const sys of scanResult.systems) {
      nodes.push({
        id: sys.id,
        c4Level: 'context',
        name: sys.name,
        type: 'softwareSystem',
        designSpec: '',
        documentation: `${sys.name} software system`,
        parentId: null,
        childIds: [],
        technology: this.inferSystemTechnology(scanResult, sys.id),
        tags: [],
      });
    }

    // External service nodes
    for (const ext of scanResult.externalServices) {
      nodes.push({
        id: ext.id,
        c4Level: 'context',
        name: ext.name,
        type: 'externalSystem',
        designSpec: '',
        documentation: `${ext.name} external service`,
        parentId: null,
        childIds: [],
        technology: ext.technology,
        tags: ['external'],
      });
    }

    return nodes;
  }

  private buildContainerNodes(scanResult: ScanResult): DadNode[] {
    const nodes: DadNode[] = [];

    // Container nodes (services)
    for (const container of scanResult.containerMeta) {
      nodes.push({
        id: container.id,
        c4Level: 'container',
        name: container.name,
        type: 'container',
        designSpec: '',
        documentation: `${container.name} container`,
        sourceMapping: {
          filePath: container.path,
          language: container.technology.toLowerCase().includes('python') ? 'python' : 'typescript',
        },
        parentId: container.systemId,
        childIds: [], // Will be filled when components are assembled
        technology: container.technology,
        tags: [],
      });
    }

    // Data store nodes
    for (const ds of scanResult.dataStores) {
      nodes.push({
        id: ds.id,
        c4Level: 'container',
        name: ds.name,
        type: 'dataStore',
        designSpec: '',
        documentation: `${ds.name} data store`,
        parentId: ds.systemId,
        childIds: [],
        technology: ds.technology,
        tags: ['database'],
      });
    }

    return nodes;
  }

  private buildComponentNodes(components: ComponentGroup[]): DadNode[] {
    return components.map(comp => {
      // Find the container node to update its childIds
      const node: DadNode = {
        id: comp.id,
        c4Level: 'component',
        name: comp.name,
        type: 'component',
        designSpec: '',
        documentation: `${comp.name} component`,
        sourceMapping: comp.sourceFiles.length > 0
          ? { filePath: comp.sourceFiles[0], language: this.inferLanguage(comp.sourceFiles[0]) }
          : undefined,
        parentId: comp.containerId,
        childIds: comp.codeUnitIds,
        technology: comp.technology,
        tags: [comp.role],
      };
      return node;
    });
  }

  private buildCodeNodes(
    files: AnalyzedFile[],
    components: ComponentGroup[]
  ): DadNode[] {
    const nodes: DadNode[] = [];
    const seen = new Set<string>();

    for (const file of files) {
      for (const symbol of file.symbols) {
        // Find which component owns this symbol
        const parentComponent = components.find(c =>
          c.sourceFiles.includes(file.filePath)
        );

        const id = codeUnitId(symbol.name);
        if (seen.has(id)) continue;
        seen.add(id);

        nodes.push({
          id,
          c4Level: 'code',
          name: symbol.kind === 'function' || symbol.kind === 'method'
            ? `${symbol.name}()`
            : symbol.name,
          type: 'codeUnit',
          codeUnitKind: symbol.kind,
          designSpec: '',
          documentation: symbol.docComment || `${symbol.kind}: ${symbol.name}`,
          sourceMapping: {
            filePath: file.filePath,
            startLine: symbol.startLine,
            endLine: symbol.endLine,
            language: file.language,
          },
          parentId: parentComponent?.id,
          childIds: [],
          technology: file.language === 'typescript' ? 'TypeScript' : file.language,
          tags: [symbol.kind],
        });

        // Also create nodes for class members (methods)
        if (symbol.members) {
          for (const member of symbol.members) {
            const memberId = codeUnitId(`${symbol.name}-${member.name}`);
            if (seen.has(memberId)) continue;
            seen.add(memberId);

            nodes.push({
              id: memberId,
              c4Level: 'code',
              name: member.kind === 'function' || member.kind === 'method'
                ? `${member.name}()`
                : member.name,
              type: 'codeUnit',
              codeUnitKind: member.kind,
              designSpec: '',
              documentation: member.docComment || `${member.kind}: ${symbol.name}.${member.name}`,
              sourceMapping: {
                filePath: file.filePath,
                startLine: member.startLine,
                endLine: member.endLine,
                language: file.language,
              },
              parentId: parentComponent?.id,
              childIds: [],
              technology: file.language === 'typescript' ? 'TypeScript' : file.language,
              tags: [member.kind],
            });
          }
        }
      }
    }

    return nodes;
  }

  private filterByLevel(
    level: C4Level,
    allNodes: DadNode[],
    allEdges: DadEdge[],
    metadata: DadFileMetadata
  ): DadFile {
    const levelNodes = allNodes.filter(n => n.c4Level === level);
    const edges = allEdges.filter(e => e.c4Level === level);

    // Collect boundary nodes: nodes referenced by edges but belonging to a different level
    const levelNodeIds = new Set(levelNodes.map(n => n.id));
    const referencedIds = new Set<string>();
    for (const edge of edges) {
      if (!levelNodeIds.has(edge.source)) referencedIds.add(edge.source);
      if (!levelNodeIds.has(edge.target)) referencedIds.add(edge.target);
    }

    const boundaryNodes: DadNode[] = [];
    for (const id of referencedIds) {
      const node = allNodes.find(n => n.id === id);
      if (node) {
        boundaryNodes.push({
          id: node.id,
          name: node.name,
          type: node.type,
          c4Level: node.c4Level,
          designSpec: '',
          documentation: '',
          childIds: [],
          boundary: true,
        });
      }
    }

    const nodes = [...levelNodes, ...boundaryNodes];

    return {
      version: '1.0',
      metadata: { ...metadata, totalNodes: nodes.length, totalEdges: edges.length },
      nodes,
      edges,
    };
  }

  private buildMetadata(projectName: string, totalNodes: number, totalEdges: number): DadFileMetadata {
    return {
      projectName,
      generatedAt: new Date().toISOString(),
      generatedBy: 'dad-pipeline/0.0.1',
      totalNodes,
      totalEdges,
    };
  }

  private inferSystemTechnology(scanResult: ScanResult, systemId: string): string {
    const containers = scanResult.containerMeta.filter(c => c.systemId === systemId);
    const techs = [...new Set(containers.map(c => c.technology))];
    return techs.length > 0 ? techs.join(', ') : 'Unknown';
  }

  private inferLanguage(filePath: string): string {
    if (filePath.endsWith('.py')) return 'python';
    if (filePath.endsWith('.go')) return 'go';
    return 'typescript';
  }

  /**
   * Update container nodes' childIds based on assembled components.
   */
  linkComponentsToContainers(dadFileSet: DadFileSet): void {
    const containerNodes = dadFileSet.combined.nodes.filter(n => n.type === 'container');
    const componentNodes = dadFileSet.combined.nodes.filter(n => n.type === 'component');

    for (const container of containerNodes) {
      const children = componentNodes.filter(c => c.parentId === container.id);
      container.childIds = children.map(c => c.id);
    }
  }
}
