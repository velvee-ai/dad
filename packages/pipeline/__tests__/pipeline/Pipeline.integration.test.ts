import { describe, it, expect } from 'vitest';
import * as path from 'path';
import { Pipeline } from '../../src/pipeline/Pipeline';
import { MockLLMProvider } from '../../src/enrichment/LLMProvider';

const MOCK_ROOT = path.resolve(__dirname, '../../../../examples/mock-microservices');

describe('Pipeline (integration)', () => {
  it('should run the full pipeline on mock-microservices (scanner-only mode)', async () => {
    const pipeline = new Pipeline({
      rootPath: MOCK_ROOT,
    });

    const result = await pipeline.run();

    // Should have all 5 levels + combined
    expect(result.landscape).toBeDefined();
    expect(result.context).toBeDefined();
    expect(result.container).toBeDefined();
    expect(result.component).toBeDefined();
    expect(result.code).toBeDefined();
    expect(result.combined).toBeDefined();
  });

  it('should detect correct number of containers and data stores', async () => {
    const pipeline = new Pipeline({
      rootPath: MOCK_ROOT,
    });

    const result = await pipeline.run();

    const containers = result.combined.nodes.filter(n => n.type === 'container');
    const dataStores = result.combined.nodes.filter(n => n.type === 'dataStore');

    // At least: api-gateway, user-service, order-service, notification-service, admin-dashboard
    expect(containers.length).toBeGreaterThanOrEqual(5);

    // At least: postgres, redis, kafka
    expect(dataStores.length).toBeGreaterThanOrEqual(3);
  });

  it('should detect 2 software systems', async () => {
    const pipeline = new Pipeline({
      rootPath: MOCK_ROOT,
    });

    const result = await pipeline.run();

    const systems = result.combined.nodes.filter(n => n.type === 'softwareSystem');
    expect(systems.length).toBe(2);

    const systemNames = systems.map(s => s.name).sort();
    expect(systemNames).toEqual(['Ecommerce Platform', 'Internal Tools']);
  });

  it('should detect external services (Stripe, SendGrid)', async () => {
    const pipeline = new Pipeline({
      rootPath: MOCK_ROOT,
    });

    const result = await pipeline.run();

    const externals = result.combined.nodes.filter(n => n.type === 'externalSystem');
    const extNames = externals.map(e => e.name);

    expect(extNames).toContain('Stripe');
    expect(extNames).toContain('SendGrid');
  });

  it('should infer edges from env vars and dependencies', async () => {
    const pipeline = new Pipeline({
      rootPath: MOCK_ROOT,
    });

    const result = await pipeline.run();

    const edges = result.combined.edges;
    expect(edges.length).toBeGreaterThan(0);

    // Should have container-level edges
    const containerEdges = edges.filter(e => e.c4Level === 'container');
    expect(containerEdges.length).toBeGreaterThan(0);
  });

  it('should maintain valid parent-child hierarchy', async () => {
    const pipeline = new Pipeline({
      rootPath: MOCK_ROOT,
    });

    const result = await pipeline.run();

    const nodeMap = new Map(result.combined.nodes.map(n => [n.id, n]));

    for (const node of result.combined.nodes) {
      // Every parentId references an existing node
      if (node.parentId) {
        expect(nodeMap.has(node.parentId)).toBe(true);
      }

      // Every childId references an existing node
      for (const childId of node.childIds) {
        expect(nodeMap.has(childId)).toBe(true);
      }
    }
  });

  it('should follow ID prefix conventions for all nodes', async () => {
    const pipeline = new Pipeline({
      rootPath: MOCK_ROOT,
    });

    const result = await pipeline.run();

    for (const node of result.combined.nodes) {
      expect(node.id).toMatch(/^(landscape|system|container|datastore|component|code|actor|external):/);
    }
  });

  it('should produce component groups from directory patterns', async () => {
    const pipeline = new Pipeline({
      rootPath: MOCK_ROOT,
    });

    const result = await pipeline.run();

    const components = result.combined.nodes.filter(n => n.type === 'component');
    expect(components.length).toBeGreaterThan(0);

    // Should have components with recognized roles
    const tags = components.flatMap(c => c.tags || []);
    expect(tags.some(t => ['controller', 'service', 'handler', 'route', 'middleware'].includes(t))).toBe(true);
  });

  it('should report progress when callback is provided', async () => {
    const progressMessages: Array<{ stage: string; message: string; percent: number }> = [];

    const pipeline = new Pipeline({
      rootPath: MOCK_ROOT,
      onProgress: (stage, message, percent) => {
        progressMessages.push({ stage, message, percent });
      },
    });

    await pipeline.run();

    expect(progressMessages.length).toBeGreaterThan(0);
    expect(progressMessages[0].percent).toBe(0);
    expect(progressMessages[progressMessages.length - 1].percent).toBe(100);
  });

  it('should work with LLM enrichment using MockProvider', async () => {
    const mockProvider = new MockLLMProvider();
    mockProvider.registerResponse('landscape', '# Test Landscape\n\nEnriched description.');
    mockProvider.registerResponse(
      'actors',
      '[{"name": "Customer", "scope": "external", "description": "End user"}]'
    );

    const pipeline = new Pipeline({
      rootPath: MOCK_ROOT,
      llmProvider: mockProvider,
    });

    const result = await pipeline.run();

    // LLM enrichment should have run
    expect(result.combined.nodes.length).toBeGreaterThan(0);
  });

  it('should support scanOnly mode', async () => {
    const pipeline = new Pipeline({
      rootPath: MOCK_ROOT,
    });

    const scanResult = await pipeline.scanOnly();

    expect(scanResult.projectName).toBe('Velvee.ai, Inc');
    expect(scanResult.systems.length).toBe(2);
    expect(scanResult.containerMeta.length).toBeGreaterThanOrEqual(5);
    expect(scanResult.dataStores.length).toBeGreaterThanOrEqual(3);
    expect(scanResult.externalServices.length).toBeGreaterThanOrEqual(2);
  });

  it('should set all DadFile versions to 1.0', async () => {
    const pipeline = new Pipeline({
      rootPath: MOCK_ROOT,
    });

    const result = await pipeline.run();

    for (const level of ['landscape', 'context', 'container', 'component', 'code', 'combined'] as const) {
      expect(result[level].version).toBe('1.0');
    }
  });

  it('should assign correct c4Level to all nodes', async () => {
    const pipeline = new Pipeline({
      rootPath: MOCK_ROOT,
    });

    const result = await pipeline.run();

    for (const node of result.combined.nodes) {
      switch (node.type) {
        case 'landscape':
          expect(node.c4Level).toBe('landscape');
          break;
        case 'softwareSystem':
        case 'actor':
        case 'externalSystem':
          expect(node.c4Level).toBe('context');
          break;
        case 'container':
        case 'dataStore':
          expect(node.c4Level).toBe('container');
          break;
        case 'component':
          expect(node.c4Level).toBe('component');
          break;
        case 'codeUnit':
          expect(node.c4Level).toBe('code');
          break;
      }
    }
  });
});
