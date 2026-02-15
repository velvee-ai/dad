import * as yaml from 'js-yaml';
import type { DadNode, DadFileSet, ScanResult, ComponentGroup, ComponentRole } from '../types';

const ROLE_DESCRIPTIONS: Record<ComponentRole, string> = {
  controller: 'Handles incoming HTTP requests and delegates to service components',
  service: 'Contains business logic and orchestrates operations',
  repository: 'Manages data access and persistence operations',
  middleware: 'Intercepts and processes requests in the middleware pipeline',
  handler: 'Processes events or messages',
  model: 'Defines data structures and domain models',
  route: 'Defines API route endpoints and request handling',
  event: 'Manages event definitions and event-driven communication',
  utility: 'Provides shared utility functions and helpers',
};

/**
 * Stage 4.5: Enriches DadFile nodes with statically-generated designSpec (YAML)
 * and documentation (Markdown) from data already available in the pipeline.
 * Runs before LLM enrichment so LLM can overwrite with richer content,
 * but serves as a fallback when LLM is unavailable or fails.
 */
export class StaticEnricher {
  enrich(
    dadFileSet: DadFileSet,
    scanResult: ScanResult,
    components: ComponentGroup[]
  ): DadFileSet {
    const allNodes = dadFileSet.combined.nodes;
    const allEdges = dadFileSet.combined.edges;

    for (const node of allNodes) {
      if (node.boundary) continue;

      switch (node.type) {
        case 'landscape':
          this.enrichLandscape(node, allNodes);
          break;
        case 'softwareSystem':
          this.enrichSystem(node, allNodes);
          break;
        case 'container':
          this.enrichContainer(node, allNodes, allEdges, components);
          break;
        case 'component':
          this.enrichComponent(node, allNodes, allEdges, components);
          break;
        case 'dataStore':
          this.enrichDataStore(node, allNodes, allEdges);
          break;
        case 'externalSystem':
          this.enrichExternalSystem(node, scanResult);
          break;
        case 'person':
          this.enrichPerson(node);
          break;
        case 'codeUnit':
          this.enrichCodeUnit(node);
          break;
      }
    }

    this.syncFromCombined(dadFileSet);
    return dadFileSet;
  }

  private enrichLandscape(node: DadNode, allNodes: DadNode[]): void {
    const systems = allNodes.filter(n => n.type === 'softwareSystem' && n.parentId === node.id);
    const systemCount = systems.length;
    const description = `Workspace landscape comprising ${systemCount} system${systemCount !== 1 ? 's' : ''}`;

    const spec: Record<string, unknown> = {
      element: {
        type: 'landscape',
        name: node.name,
        description,
        systems: systems.map(s => s.name),
      },
    };
    node.designSpec = this.toYaml(spec);

    const lines: string[] = [
      `# ${node.name}`,
      '',
      `${description}.`,
      '',
      '## Systems',
    ];
    for (const sys of systems) {
      lines.push(`- **${sys.name}**${sys.technology ? ` (${sys.technology})` : ''}`);
    }

    node.documentation = lines.join('\n');
  }

  private enrichSystem(node: DadNode, allNodes: DadNode[]): void {
    const children = allNodes.filter(n => n.parentId === node.id);
    const containers = children.filter(n => n.type === 'container');
    const dataStores = children.filter(n => n.type === 'dataStore');

    const description = `Software system comprising ${containers.length} service${containers.length !== 1 ? 's' : ''} and ${dataStores.length} data store${dataStores.length !== 1 ? 's' : ''}`;

    const spec: Record<string, unknown> = {
      element: {
        type: 'softwareSystem',
        name: node.name,
        description,
        ...(node.technology ? { technology: node.technology } : {}),
        containers: children.map(c => c.name),
      },
    };
    node.designSpec = this.toYaml(spec);

    const lines: string[] = [
      `# ${node.name}`,
      '',
      `${description}.`,
    ];

    if (containers.length > 0) {
      lines.push('', '## Services');
      for (const c of containers) {
        lines.push(`- **${c.name}**${c.technology ? ` (${c.technology})` : ''}`);
      }
    }

    if (dataStores.length > 0) {
      lines.push('', '## Data Stores');
      for (const ds of dataStores) {
        lines.push(`- **${ds.name}**${ds.technology ? ` (${ds.technology})` : ''}`);
      }
    }

    node.documentation = lines.join('\n');
  }

  private enrichContainer(
    node: DadNode,
    allNodes: DadNode[],
    allEdges: { source: string; target: string; label: string }[],
    components: ComponentGroup[]
  ): void {
    const childComponents = allNodes.filter(
      n => n.type === 'component' && n.parentId === node.id
    );
    const containerComponents = components.filter(c => c.containerId === node.id);
    const roles = [...new Set(containerComponents.map(c => c.role))];

    const outEdges = allEdges.filter(e => e.source === node.id);
    const dependencies = outEdges.map(e => {
      const target = allNodes.find(n => n.id === e.target);
      return target?.name || e.target;
    });

    const roleDescriptions = roles
      .map(r => ROLE_DESCRIPTIONS[r])
      .filter(Boolean);
    const description = roleDescriptions.length > 0
      ? `Provides ${roleDescriptions[0].toLowerCase()} and related capabilities`
      : `${node.name} service`;

    const spec: Record<string, unknown> = {
      element: {
        type: 'container',
        name: node.name,
        description,
        ...(node.technology ? { technology: node.technology } : {}),
        ...(roles.length > 0 ? { responsibilities: roles.map(r => ROLE_DESCRIPTIONS[r]).filter(Boolean) } : {}),
        ...(dependencies.length > 0 ? { dependencies } : {}),
      },
    };
    node.designSpec = this.toYaml(spec);

    const lines: string[] = [
      `# ${node.name}`,
      '',
      `${description}.`,
    ];

    if (childComponents.length > 0) {
      lines.push('', '## Components');
      for (const comp of childComponents) {
        const role = comp.tags?.[0] || '';
        lines.push(`- **${comp.name}**${role ? ` (${role})` : ''}`);
      }
    }

    if (roles.length > 0) {
      lines.push('', '## Responsibilities');
      for (const role of roles) {
        const desc = ROLE_DESCRIPTIONS[role];
        if (desc) lines.push(`- ${desc}`);
      }
    }

    node.documentation = lines.join('\n');
  }

  private enrichComponent(
    node: DadNode,
    allNodes: DadNode[],
    allEdges: { source: string; target: string; label: string }[],
    components: ComponentGroup[]
  ): void {
    const role = (node.tags?.[0] as ComponentRole) || undefined;
    const parentContainer = allNodes.find(n => n.id === node.parentId);
    const containerName = parentContainer?.name || 'its container';

    const roleDesc = role ? ROLE_DESCRIPTIONS[role] : undefined;
    const description = roleDesc
      ? `${roleDesc} within ${containerName}`
      : `Component within ${containerName}`;

    const spec: Record<string, unknown> = {
      element: {
        type: 'component',
        name: node.name,
        description,
        ...(node.technology ? { technology: node.technology } : {}),
        ...(role ? { role } : {}),
      },
    };
    node.designSpec = this.toYaml(spec);

    const outEdges = allEdges.filter(e => e.source === node.id);
    const lines: string[] = [
      `# ${node.name}`,
      '',
      `${description}.`,
    ];

    if (outEdges.length > 0) {
      lines.push('', '## Dependencies');
      for (const edge of outEdges) {
        const target = allNodes.find(n => n.id === edge.target);
        lines.push(`- ${target?.name || edge.target}${edge.label ? ` — ${edge.label}` : ''}`);
      }
    }

    node.documentation = lines.join('\n');
  }

  private enrichDataStore(
    node: DadNode,
    allNodes: DadNode[],
    allEdges: { source: string; target: string }[]
  ): void {
    const incomingEdges = allEdges.filter(e => e.target === node.id);
    const connectedContainers = incomingEdges
      .map(e => allNodes.find(n => n.id === e.source))
      .filter((n): n is DadNode => n != null && n.type === 'container')
      .map(n => n.name);
    const uniqueContainers = [...new Set(connectedContainers)];

    const spec: Record<string, unknown> = {
      element: {
        type: 'dataStore',
        name: node.name,
        description: `${node.technology || 'Database'} data store`,
        ...(node.technology ? { technology: node.technology } : {}),
      },
    };
    node.designSpec = this.toYaml(spec);

    const lines: string[] = [
      `# ${node.name}`,
      '',
      `A ${node.technology || 'database'} data store${uniqueContainers.length > 0 ? ` used by ${uniqueContainers.join(', ')}` : ''}.`,
    ];

    node.documentation = lines.join('\n');
  }

  private enrichExternalSystem(node: DadNode, scanResult: ScanResult): void {
    const extMeta = scanResult.externalServices.find(e => e.id === node.id);
    const detectedBy = extMeta?.detectedByPackage
      ? `package \`${extMeta.detectedByPackage}\``
      : extMeta?.detectedByEnvVar
        ? `environment variable \`${extMeta.detectedByEnvVar}\``
        : 'dependency analysis';

    const spec: Record<string, unknown> = {
      element: {
        type: 'externalSystem',
        name: node.name,
        description: `External ${node.technology || 'service'}`,
        ...(node.technology ? { technology: node.technology } : {}),
        detectedBy,
      },
    };
    node.designSpec = this.toYaml(spec);

    node.documentation = [
      `# ${node.name}`,
      '',
      `External ${node.technology || 'service'}. Detected via ${detectedBy}.`,
    ].join('\n');
  }

  private enrichPerson(node: DadNode): void {
    // Only overwrite if documentation is trivial
    const isTrivial = !node.documentation
      || node.documentation === `${node.name} person`
      || node.documentation.length < 20;

    const spec: Record<string, unknown> = {
      element: {
        type: 'person',
        name: node.name,
        description: node.documentation || `${node.name} user`,
        ...(node.scope ? { scope: node.scope } : {}),
      },
    };
    node.designSpec = this.toYaml(spec);

    if (isTrivial) {
      const scopeLabel = node.scope === 'internal' ? 'internal' : 'external';
      node.documentation = [
        `# ${node.name}`,
        '',
        `An ${scopeLabel} user of the system.`,
      ].join('\n');
    }
  }

  private enrichCodeUnit(node: DadNode): void {
    const spec: Record<string, unknown> = {
      element: {
        type: 'codeUnit',
        name: node.name,
        ...(node.codeUnitKind ? { kind: node.codeUnitKind } : {}),
        ...(node.technology ? { technology: node.technology } : {}),
      },
    };
    node.designSpec = this.toYaml(spec);
    // Preserve existing documentation (docComment from source is already meaningful)
  }

  private toYaml(obj: Record<string, unknown>): string {
    return yaml.dump(obj, { lineWidth: -1 }).trim();
  }

  private syncFromCombined(dadFileSet: DadFileSet): void {
    const combined = dadFileSet.combined;

    dadFileSet.context.nodes = combined.nodes.filter(n => n.c4Level === 'context');
    dadFileSet.container.nodes = combined.nodes.filter(n => n.c4Level === 'container');
    dadFileSet.component.nodes = combined.nodes.filter(n => n.c4Level === 'component');
    dadFileSet.code.nodes = combined.nodes.filter(n => n.c4Level === 'code');

    for (const level of ['context', 'container', 'component', 'code'] as const) {
      dadFileSet[level].metadata.totalNodes = dadFileSet[level].nodes.length;
    }
  }
}
