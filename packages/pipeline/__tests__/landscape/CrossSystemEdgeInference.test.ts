import { describe, it, expect } from 'vitest';
import { CrossSystemEdgeInference } from '../../src/landscape/CrossSystemEdgeInference';
import type { ProjectContext } from '../../src/landscape/types';
import type { DadFile } from '../../src/types';

function makeContextFile(overrides: Partial<DadFile> = {}): DadFile {
  return {
    version: '1.0',
    metadata: {
      projectName: 'test',
      generatedAt: '2026-01-01T00:00:00Z',
      generatedBy: 'test',
      totalNodes: 0,
      totalEdges: 0,
    },
    nodes: [],
    edges: [],
    ...overrides,
  };
}

function makeProjectContext(
  systemName: string,
  contextNodes: DadFile['nodes'],
  contextEdges: DadFile['edges'] = [],
  containerNodes: DadFile['nodes'] = [],
): ProjectContext {
  return {
    systemEntry: { name: systemName, path: `./${systemName}` },
    manifest: {
      version: '1.0',
      generatedAt: '2026-01-01T00:00:00Z',
      projectName: systemName,
      landscapeFile: 'levels/context.dad.json',
      nodeCount: contextNodes.length,
      edgeCount: contextEdges.length,
    },
    contextFile: makeContextFile({ nodes: contextNodes, edges: contextEdges }),
    containerFile: containerNodes.length > 0
      ? makeContextFile({ nodes: containerNodes })
      : null,
  };
}

describe('CrossSystemEdgeInference', () => {
  const inference = new CrossSystemEdgeInference();

  it('should infer edges from shared external services', () => {
    const ctx1 = makeProjectContext('system-a', [
      {
        id: 'system:system-a', c4Level: 'context', name: 'System A', type: 'softwareSystem',
        designSpec: '', documentation: '', childIds: [], tags: [], parentId: null,
      },
      {
        id: 'external:stripe', c4Level: 'context', name: 'Stripe', type: 'externalSystem',
        designSpec: '', documentation: '', childIds: [], tags: ['external'], parentId: null,
      },
    ]);

    const ctx2 = makeProjectContext('system-b', [
      {
        id: 'system:system-b', c4Level: 'context', name: 'System B', type: 'softwareSystem',
        designSpec: '', documentation: '', childIds: [], tags: [], parentId: null,
      },
      {
        id: 'external:stripe', c4Level: 'context', name: 'Stripe', type: 'externalSystem',
        designSpec: '', documentation: '', childIds: [], tags: ['external'], parentId: null,
      },
    ]);

    const edges = inference.infer([ctx1, ctx2]);

    // Both systems should have edges to stripe
    const stripeEdges = edges.filter(e => e.target === 'external:stripe');
    expect(stripeEdges).toHaveLength(2);
    expect(stripeEdges.map(e => e.source).sort()).toEqual(['system:system-a', 'system:system-b']);
    expect(stripeEdges[0].c4Level).toBe('landscape');
    expect(stripeEdges[0].tags).toContain('inferred');
  });

  it('should infer edges from shared data stores', () => {
    const ctx1 = makeProjectContext(
      'system-a',
      [{
        id: 'system:system-a', c4Level: 'context', name: 'System A', type: 'softwareSystem',
        designSpec: '', documentation: '', childIds: [], tags: [], parentId: null,
      }],
      [],
      [{
        id: 'datastore:postgresql', c4Level: 'container', name: 'PostgreSQL', type: 'dataStore',
        designSpec: '', documentation: '', childIds: [], tags: [], technology: 'PostgreSQL 15',
        parentId: 'system:system-a',
      }],
    );

    const ctx2 = makeProjectContext(
      'system-b',
      [{
        id: 'system:system-b', c4Level: 'context', name: 'System B', type: 'softwareSystem',
        designSpec: '', documentation: '', childIds: [], tags: [], parentId: null,
      }],
      [],
      [{
        id: 'datastore:postgresql', c4Level: 'container', name: 'PostgreSQL', type: 'dataStore',
        designSpec: '', documentation: '', childIds: [], tags: [], technology: 'PostgreSQL 15',
        parentId: 'system:system-b',
      }],
    );

    const edges = inference.infer([ctx1, ctx2]);

    const pgEdges = edges.filter(e => e.target === 'datastore:postgresql');
    expect(pgEdges).toHaveLength(2);
    expect(pgEdges[0].tags).toContain('shared-datastore');
  });

  it('should infer edges from shared persons', () => {
    const ctx1 = makeProjectContext('system-a', [
      {
        id: 'system:system-a', c4Level: 'context', name: 'System A', type: 'softwareSystem',
        designSpec: '', documentation: '', childIds: [], tags: [], parentId: null,
      },
      {
        id: 'person:customer', c4Level: 'context', name: 'Customer', type: 'person',
        designSpec: '', documentation: '', childIds: [], tags: [], scope: 'external', parentId: null,
      },
    ]);

    const ctx2 = makeProjectContext('system-b', [
      {
        id: 'system:system-b', c4Level: 'context', name: 'System B', type: 'softwareSystem',
        designSpec: '', documentation: '', childIds: [], tags: [], parentId: null,
      },
      {
        id: 'person:customer', c4Level: 'context', name: 'Customer', type: 'person',
        designSpec: '', documentation: '', childIds: [], tags: [], scope: 'external', parentId: null,
      },
    ]);

    const edges = inference.infer([ctx1, ctx2]);

    const personEdges = edges.filter(e => e.source === 'person:customer');
    expect(personEdges).toHaveLength(2);
    expect(personEdges.map(e => e.target).sort()).toEqual(['system:system-a', 'system:system-b']);
  });

  it('should lift context-level edges to landscape level', () => {
    const ctx1 = makeProjectContext(
      'system-a',
      [
        {
          id: 'system:system-a', c4Level: 'context', name: 'System A', type: 'softwareSystem',
          designSpec: '', documentation: '', childIds: [], tags: [], parentId: null,
        },
        {
          id: 'person:admin', c4Level: 'context', name: 'Admin', type: 'person',
          designSpec: '', documentation: '', childIds: [], tags: [], parentId: null,
        },
      ],
      [
        {
          id: 'edge:admin-to-system-a', source: 'person:admin', target: 'system:system-a',
          label: 'Manages', c4Level: 'context', tags: ['internal'],
        },
      ],
    );

    const edges = inference.infer([ctx1]);

    const liftedEdges = edges.filter(e => e.tags?.includes('lifted'));
    expect(liftedEdges).toHaveLength(1);
    expect(liftedEdges[0].c4Level).toBe('landscape');
    expect(liftedEdges[0].source).toBe('person:admin');
    expect(liftedEdges[0].target).toBe('system:system-a');
  });

  it('should not create duplicate edges', () => {
    const ctx1 = makeProjectContext('system-a', [
      {
        id: 'system:system-a', c4Level: 'context', name: 'System A', type: 'softwareSystem',
        designSpec: '', documentation: '', childIds: [], tags: [], parentId: null,
      },
      {
        id: 'external:stripe', c4Level: 'context', name: 'Stripe', type: 'externalSystem',
        designSpec: '', documentation: '', childIds: [], tags: ['external'], parentId: null,
      },
    ]);

    const edges = inference.infer([ctx1]);

    // Check no duplicate IDs
    const ids = edges.map(e => e.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('should return empty array when no shared entities exist', () => {
    const ctx1 = makeProjectContext('system-a', [
      {
        id: 'system:system-a', c4Level: 'context', name: 'System A', type: 'softwareSystem',
        designSpec: '', documentation: '', childIds: [], tags: [], parentId: null,
      },
    ]);

    const ctx2 = makeProjectContext('system-b', [
      {
        id: 'system:system-b', c4Level: 'context', name: 'System B', type: 'softwareSystem',
        designSpec: '', documentation: '', childIds: [], tags: [], parentId: null,
      },
    ]);

    const edges = inference.infer([ctx1, ctx2]);
    expect(edges).toHaveLength(0);
  });

  it('should not infer shared data store edges when only one system uses it', () => {
    const ctx1 = makeProjectContext(
      'system-a',
      [{
        id: 'system:system-a', c4Level: 'context', name: 'System A', type: 'softwareSystem',
        designSpec: '', documentation: '', childIds: [], tags: [], parentId: null,
      }],
      [],
      [{
        id: 'datastore:postgresql', c4Level: 'container', name: 'PostgreSQL', type: 'dataStore',
        designSpec: '', documentation: '', childIds: [], tags: [], technology: 'PostgreSQL 15',
        parentId: 'system:system-a',
      }],
    );

    const ctx2 = makeProjectContext('system-b', [
      {
        id: 'system:system-b', c4Level: 'context', name: 'System B', type: 'softwareSystem',
        designSpec: '', documentation: '', childIds: [], tags: [], parentId: null,
      },
    ]);

    const edges = inference.infer([ctx1, ctx2]);

    // No shared-datastore edges since only one system uses it
    const dsEdges = edges.filter(e => e.tags?.includes('shared-datastore'));
    expect(dsEdges).toHaveLength(0);
  });
});
