import { describe, it, expect, beforeEach } from 'vitest';
import * as yaml from 'js-yaml';
import { StaticEnricher } from '../../src/enrichment/StaticEnricher';
import type { DadFileSet, DadFile, DadNode, DadEdge, ScanResult, ComponentGroup } from '../../src/types';

function makeMeta(totalNodes = 0, totalEdges = 0) {
  return {
    projectName: 'test-project',
    generatedAt: new Date().toISOString(),
    generatedBy: 'test',
    totalNodes,
    totalEdges,
  };
}

function makeDadFile(nodes: DadNode[] = [], edges: DadEdge[] = []): DadFile {
  return {
    version: '1.0',
    metadata: makeMeta(nodes.length, edges.length),
    nodes,
    edges,
  };
}

function buildFixture() {
  const systemNode: DadNode = {
    id: 'system:ecommerce',
    c4Level: 'context',
    name: 'Ecommerce Platform',
    type: 'softwareSystem',
    designSpec: '',
    documentation: 'Ecommerce Platform software system',
    parentId: null,
    childIds: ['container:order-service', 'datastore:postgres'],
    technology: 'TypeScript/Express',
    tags: [],
  };

  const containerNode: DadNode = {
    id: 'container:order-service',
    c4Level: 'container',
    name: 'Order Service',
    type: 'container',
    designSpec: '',
    documentation: 'Order Service container',
    parentId: 'system:ecommerce',
    childIds: ['component:order-controller', 'component:order-service-logic'],
    technology: 'TypeScript/Express',
    tags: [],
  };

  const dataStoreNode: DadNode = {
    id: 'datastore:postgres',
    c4Level: 'container',
    name: 'PostgreSQL',
    type: 'dataStore',
    designSpec: '',
    documentation: 'PostgreSQL data store',
    parentId: 'system:ecommerce',
    childIds: [],
    technology: 'PostgreSQL 15',
    tags: ['database'],
  };

  const controllerComponent: DadNode = {
    id: 'component:order-controller',
    c4Level: 'component',
    name: 'Order Controller',
    type: 'component',
    designSpec: '',
    documentation: 'Order Controller component',
    parentId: 'container:order-service',
    childIds: [],
    technology: 'TypeScript',
    tags: ['controller'],
  };

  const serviceComponent: DadNode = {
    id: 'component:order-service-logic',
    c4Level: 'component',
    name: 'Order Service Logic',
    type: 'component',
    designSpec: '',
    documentation: 'Order Service Logic component',
    parentId: 'container:order-service',
    childIds: ['code:create-order'],
    technology: 'TypeScript',
    tags: ['service'],
  };

  const externalNode: DadNode = {
    id: 'external:stripe',
    c4Level: 'context',
    name: 'Stripe',
    type: 'externalSystem',
    designSpec: '',
    documentation: 'Stripe external service',
    parentId: null,
    childIds: [],
    technology: 'REST API',
    tags: ['external'],
  };

  const personNode: DadNode = {
    id: 'person:customer',
    c4Level: 'context',
    name: 'Customer',
    type: 'person',
    designSpec: '',
    documentation: 'Interacts with the system via web browser',
    parentId: null,
    childIds: [],
    scope: 'external',
    tags: ['external-person'],
  };

  const codeUnitNode: DadNode = {
    id: 'code:create-order',
    c4Level: 'code',
    name: 'createOrder()',
    type: 'codeUnit',
    codeUnitKind: 'function',
    designSpec: '',
    documentation: 'Creates a new order in the system',
    parentId: 'component:order-service-logic',
    childIds: [],
    technology: 'TypeScript',
    tags: ['function'],
  };

  const boundaryNode: DadNode = {
    id: 'external:sendgrid',
    c4Level: 'context',
    name: 'SendGrid',
    type: 'externalSystem',
    designSpec: '',
    documentation: '',
    childIds: [],
    boundary: true,
  };

  const allNodes = [
    systemNode, containerNode, dataStoreNode,
    controllerComponent, serviceComponent,
    externalNode, personNode, codeUnitNode, boundaryNode,
  ];

  const edges: DadEdge[] = [
    {
      id: 'edge:order-to-postgres',
      source: 'container:order-service',
      target: 'datastore:postgres',
      label: 'Reads/writes orders',
      c4Level: 'container',
    },
    {
      id: 'edge:controller-to-service',
      source: 'component:order-controller',
      target: 'component:order-service-logic',
      label: 'Delegates to',
      c4Level: 'component',
    },
    {
      id: 'edge:order-to-stripe',
      source: 'container:order-service',
      target: 'external:stripe',
      label: 'Processes payments',
      c4Level: 'container',
    },
  ];

  const dadFileSet: DadFileSet = {
    context: makeDadFile(
      allNodes.filter(n => n.c4Level === 'context'),
      edges.filter(e => e.c4Level === 'context')
    ),
    container: makeDadFile(
      allNodes.filter(n => n.c4Level === 'container'),
      edges.filter(e => e.c4Level === 'container')
    ),
    component: makeDadFile(
      allNodes.filter(n => n.c4Level === 'component'),
      edges.filter(e => e.c4Level === 'component')
    ),
    code: makeDadFile(
      allNodes.filter(n => n.c4Level === 'code'),
      []
    ),
    combined: makeDadFile(allNodes, edges),
  };

  const scanResult: ScanResult = {
    projectName: 'test-project',
    rootPath: '/test',
    systems: [
      {
        id: 'system:ecommerce',
        name: 'Ecommerce Platform',
        path: '.',
        containerIds: ['container:order-service'],
        dataStoreIds: ['datastore:postgres'],
      },
    ],
    containerMeta: [
      {
        id: 'container:order-service',
        name: 'Order Service',
        path: 'order-service',
        systemId: 'system:ecommerce',
        detectedBy: 'package-json',
        technology: 'TypeScript/Express',
        sourceFiles: ['src/controllers/order.ts', 'src/services/order.ts'],
        envVars: {},
      },
    ],
    dataStores: [
      {
        id: 'datastore:postgres',
        name: 'PostgreSQL',
        image: 'postgres:15',
        technology: 'PostgreSQL 15',
        systemId: 'system:ecommerce',
        detectedBy: 'docker-compose',
      },
    ],
    externalServices: [
      {
        id: 'external:stripe',
        name: 'Stripe',
        technology: 'REST API',
        detectedByPackage: 'stripe',
      },
    ],
  };

  const components: ComponentGroup[] = [
    {
      id: 'component:order-controller',
      name: 'Order Controller',
      containerId: 'container:order-service',
      codeUnitIds: [],
      sourceFiles: ['src/controllers/order.ts'],
      technology: 'TypeScript',
      role: 'controller',
    },
    {
      id: 'component:order-service-logic',
      name: 'Order Service Logic',
      containerId: 'container:order-service',
      codeUnitIds: ['code:create-order'],
      sourceFiles: ['src/services/order.ts'],
      technology: 'TypeScript',
      role: 'service',
    },
  ];

  return { dadFileSet, scanResult, components };
}

describe('StaticEnricher', () => {
  let enricher: StaticEnricher;
  let dadFileSet: DadFileSet;
  let scanResult: ScanResult;
  let components: ComponentGroup[];

  beforeEach(() => {
    enricher = new StaticEnricher();
    const fixture = buildFixture();
    dadFileSet = fixture.dadFileSet;
    scanResult = fixture.scanResult;
    components = fixture.components;
  });

  it('should set non-empty designSpec on all non-boundary nodes', () => {
    enricher.enrich(dadFileSet, scanResult, components);

    for (const node of dadFileSet.combined.nodes) {
      if (node.boundary) continue;
      expect(node.designSpec, `designSpec empty for ${node.id}`).not.toBe('');
    }
  });

  it('should produce valid YAML designSpec with element root key', () => {
    enricher.enrich(dadFileSet, scanResult, components);

    for (const node of dadFileSet.combined.nodes) {
      if (node.boundary) continue;
      const parsed = yaml.load(node.designSpec) as Record<string, unknown>;
      expect(parsed, `invalid YAML for ${node.id}`).toHaveProperty('element');
      const element = parsed.element as Record<string, unknown>;
      expect(element).toHaveProperty('type');
      expect(element).toHaveProperty('name');
    }
  });

  it('should produce non-template documentation for system nodes', () => {
    enricher.enrich(dadFileSet, scanResult, components);

    const system = dadFileSet.combined.nodes.find(n => n.type === 'softwareSystem')!;
    expect(system.documentation).not.toBe('Ecommerce Platform software system');
    expect(system.documentation).toContain('# Ecommerce Platform');
    expect(system.documentation).toContain('Order Service');
  });

  it('should list child containers in system documentation', () => {
    enricher.enrich(dadFileSet, scanResult, components);

    const system = dadFileSet.combined.nodes.find(n => n.type === 'softwareSystem')!;
    expect(system.documentation).toContain('## Services');
    expect(system.documentation).toContain('Order Service');
  });

  it('should list data stores in system documentation', () => {
    enricher.enrich(dadFileSet, scanResult, components);

    const system = dadFileSet.combined.nodes.find(n => n.type === 'softwareSystem')!;
    expect(system.documentation).toContain('## Data Stores');
    expect(system.documentation).toContain('PostgreSQL');
  });

  it('should produce non-template documentation for container nodes', () => {
    enricher.enrich(dadFileSet, scanResult, components);

    const container = dadFileSet.combined.nodes.find(n => n.id === 'container:order-service')!;
    expect(container.documentation).not.toBe('Order Service container');
    expect(container.documentation).toContain('# Order Service');
  });

  it('should list components in container documentation', () => {
    enricher.enrich(dadFileSet, scanResult, components);

    const container = dadFileSet.combined.nodes.find(n => n.id === 'container:order-service')!;
    expect(container.documentation).toContain('## Components');
    expect(container.documentation).toContain('Order Controller');
  });

  it('should include responsibilities in container documentation', () => {
    enricher.enrich(dadFileSet, scanResult, components);

    const container = dadFileSet.combined.nodes.find(n => n.id === 'container:order-service')!;
    expect(container.documentation).toContain('## Responsibilities');
  });

  it('should produce Markdown heading for component nodes', () => {
    enricher.enrich(dadFileSet, scanResult, components);

    const comp = dadFileSet.combined.nodes.find(n => n.id === 'component:order-controller')!;
    expect(comp.documentation).toContain('# Order Controller');
  });

  it('should include role description in component documentation', () => {
    enricher.enrich(dadFileSet, scanResult, components);

    const comp = dadFileSet.combined.nodes.find(n => n.id === 'component:order-controller')!;
    expect(comp.documentation).toContain('HTTP requests');
  });

  it('should list dependencies in component documentation', () => {
    enricher.enrich(dadFileSet, scanResult, components);

    const comp = dadFileSet.combined.nodes.find(n => n.id === 'component:order-controller')!;
    expect(comp.documentation).toContain('## Dependencies');
    expect(comp.documentation).toContain('Order Service Logic');
  });

  it('should mention "data store" in dataStore documentation', () => {
    enricher.enrich(dadFileSet, scanResult, components);

    const ds = dadFileSet.combined.nodes.find(n => n.type === 'dataStore')!;
    expect(ds.documentation).toContain('data store');
  });

  it('should mention connected containers in dataStore documentation', () => {
    enricher.enrich(dadFileSet, scanResult, components);

    const ds = dadFileSet.combined.nodes.find(n => n.type === 'dataStore')!;
    expect(ds.documentation).toContain('Order Service');
  });

  it('should mention "Detected via" in externalSystem documentation', () => {
    enricher.enrich(dadFileSet, scanResult, components);

    const ext = dadFileSet.combined.nodes.find(n => n.type === 'externalSystem' && !n.boundary)!;
    expect(ext.documentation).toContain('Detected via');
    expect(ext.documentation).toContain('stripe');
  });

  it('should set designSpec on person nodes', () => {
    enricher.enrich(dadFileSet, scanResult, components);

    const person = dadFileSet.combined.nodes.find(n => n.type === 'person')!;
    const parsed = yaml.load(person.designSpec) as Record<string, unknown>;
    expect((parsed.element as Record<string, unknown>).type).toBe('person');
  });

  it('should preserve non-trivial person documentation', () => {
    enricher.enrich(dadFileSet, scanResult, components);

    const person = dadFileSet.combined.nodes.find(n => n.type === 'person')!;
    // Original doc is "Interacts with the system via web browser" (> 20 chars), should be preserved
    expect(person.documentation).toBe('Interacts with the system via web browser');
  });

  it('should set designSpec on code unit nodes without overwriting documentation', () => {
    enricher.enrich(dadFileSet, scanResult, components);

    const code = dadFileSet.combined.nodes.find(n => n.type === 'codeUnit')!;
    expect(code.designSpec).not.toBe('');
    // Documentation should remain unchanged
    expect(code.documentation).toBe('Creates a new order in the system');
  });

  it('should not modify boundary nodes', () => {
    enricher.enrich(dadFileSet, scanResult, components);

    const boundary = dadFileSet.combined.nodes.find(n => n.boundary)!;
    expect(boundary.designSpec).toBe('');
  });

  it('should sync enriched data to per-level files', () => {
    enricher.enrich(dadFileSet, scanResult, components);

    // Context-level nodes should have enriched designSpec
    const contextSystem = dadFileSet.context.nodes.find(n => n.type === 'softwareSystem');
    expect(contextSystem).toBeDefined();
    expect(contextSystem!.designSpec).not.toBe('');

    // Container-level nodes should have enriched designSpec
    const containerNode = dadFileSet.container.nodes.find(n => n.type === 'container');
    expect(containerNode).toBeDefined();
    expect(containerNode!.designSpec).not.toBe('');

    // Metadata counts should be updated
    expect(dadFileSet.context.metadata.totalNodes).toBe(
      dadFileSet.combined.nodes.filter(n => n.c4Level === 'context').length
    );
  });
});
