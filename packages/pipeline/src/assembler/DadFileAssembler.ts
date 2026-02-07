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
} from '../types';
import { landscapeId } from './IdGenerator';
import { EdgeInference } from './EdgeInference';

/**
 * Stage 4: Assembles DadFile structures from scan results, component groups,
 * and analyzed files. Produces one DadFile per C4 level plus a combined file.
 */
export class DadFileAssembler {
  private edgeInference = new EdgeInference();

  /**
   * Assemble DadFiles from pipeline data.
   */
  assemble(
    scanResult: ScanResult,
    components: ComponentGroup[],
    analyzedFiles: AnalyzedFile[]
  ): DadFileSet {
    // Build all nodes
    const landscapeNode = this.buildLandscapeNode(scanResult);
    const contextNodes = this.buildContextNodes(scanResult, landscapeNode.id);
    const containerNodes = this.buildContainerNodes(scanResult);
    const componentNodes = this.buildComponentNodes(components);
    const codeNodes = this.buildCodeNodes(analyzedFiles, components);

    // Update childIds for landscape and context nodes
    landscapeNode.childIds = contextNodes.map(n => n.id);

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
    const containerEdges = this.edgeInference.inferContainerEdges(scanResult);
    const componentEdges = this.edgeInference.inferComponentEdges(analyzedFiles, components);
    const contextEdges = this.edgeInference.inferContextEdges(scanResult);

    const allNodes = [landscapeNode, ...contextNodes, ...containerNodes, ...componentNodes, ...codeNodes];
    const allEdges = [...contextEdges, ...containerEdges, ...componentEdges];

    const metadata = this.buildMetadata(scanResult.projectName, allNodes.length, allEdges.length);

    return {
      landscape: this.filterByLevel('landscape', allNodes, allEdges, metadata),
      context: this.filterByLevel('context', allNodes, allEdges, metadata),
      container: this.filterByLevel('container', allNodes, allEdges, metadata),
      component: this.filterByLevel('component', allNodes, allEdges, metadata),
      code: this.filterByLevel('code', allNodes, allEdges, metadata),
      combined: {
        version: '1.0',
        metadata: { ...metadata, totalNodes: allNodes.length, totalEdges: allEdges.length },
        nodes: allNodes,
        edges: allEdges,
      },
    };
  }

  private buildLandscapeNode(scanResult: ScanResult): DadNode {
    return {
      id: landscapeId(scanResult.projectName),
      c4Level: 'landscape',
      name: scanResult.projectName,
      type: 'landscape',
      designSpec: '',
      documentation: `All software systems in ${scanResult.projectName}`,
      parentId: null,
      childIds: [],
      technology: 'Multi-system',
      tags: ['root'],
    };
  }

  private buildContextNodes(scanResult: ScanResult, landscapeNodeId: string): DadNode[] {
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
        parentId: landscapeNodeId,
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
        parentId: landscapeNodeId,
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

    for (const file of files) {
      for (const symbol of file.symbols) {
        // Find which component owns this symbol
        const parentComponent = components.find(c =>
          c.sourceFiles.includes(file.filePath)
        );

        nodes.push({
          id: `code:${symbol.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
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
    const nodes = allNodes.filter(n => n.c4Level === level);
    const edges = allEdges.filter(e => e.c4Level === level);

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
      generatedBy: 'daad-pipeline/0.0.1',
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
