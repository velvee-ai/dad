import { describe, it, expect } from 'vitest';
import * as path from 'path';
import * as yaml from 'js-yaml';
import { LandscapeAggregator } from '../../src/landscape/LandscapeAggregator';

const MOCK_ROOT = path.resolve(__dirname, '../../../../examples/mock-microservices');

describe('LandscapeAggregator', () => {
  it('should produce a single landscape node as root', async () => {
    const aggregator = new LandscapeAggregator({ workspacePath: MOCK_ROOT });
    const result = await aggregator.aggregate();

    const landscapeNodes = result.landscapeFile.nodes.filter(n => n.type === 'landscape');
    expect(landscapeNodes).toHaveLength(1);
    expect(landscapeNodes[0].parentId).toBeNull();
    expect(landscapeNodes[0].c4Level).toBe('landscape');
  });

  it('should produce 2 softwareSystem nodes for ecommerce-platform and internal-tools', async () => {
    const aggregator = new LandscapeAggregator({ workspacePath: MOCK_ROOT });
    const result = await aggregator.aggregate();

    const systems = result.landscapeFile.nodes.filter(n => n.type === 'softwareSystem');
    expect(systems).toHaveLength(2);

    const names = systems.map(s => s.name).sort();
    expect(names).toEqual(['Ecommerce Platform', 'Internal Tools']);
  });

  it('should deduplicate person nodes (Customer, Admin User from internal-tools)', async () => {
    const aggregator = new LandscapeAggregator({ workspacePath: MOCK_ROOT });
    const result = await aggregator.aggregate();

    const persons = result.landscapeFile.nodes.filter(n => n.type === 'person');
    // internal-tools has Customer and Admin User persons
    expect(persons.length).toBeGreaterThanOrEqual(1);

    // No duplicate person IDs
    const personIds = persons.map(p => p.id);
    expect(new Set(personIds).size).toBe(personIds.length);
  });

  it('should deduplicate externalSystem nodes', async () => {
    const aggregator = new LandscapeAggregator({ workspacePath: MOCK_ROOT });
    const result = await aggregator.aggregate();

    const externals = result.landscapeFile.nodes.filter(n => n.type === 'externalSystem');
    // ecommerce-platform has Stripe, SendGrid, Twilio
    expect(externals.length).toBeGreaterThanOrEqual(3);

    // No duplicate external IDs
    const externalIds = externals.map(e => e.id);
    expect(new Set(externalIds).size).toBe(externalIds.length);
  });

  it('should set non-empty designSpec YAML on landscape node', async () => {
    const aggregator = new LandscapeAggregator({ workspacePath: MOCK_ROOT });
    const result = await aggregator.aggregate();

    const landscapeNode = result.landscapeFile.nodes.find(n => n.type === 'landscape')!;
    expect(landscapeNode.designSpec).toBeTruthy();

    // Should be valid YAML
    const parsed = yaml.load(landscapeNode.designSpec) as Record<string, unknown>;
    expect(parsed).toHaveProperty('element');
    const element = parsed.element as Record<string, unknown>;
    expect(element.type).toBe('landscape');
    expect(element.systems).toBeDefined();
  });

  it('should include both system names in landscape documentation', async () => {
    const aggregator = new LandscapeAggregator({ workspacePath: MOCK_ROOT });
    const result = await aggregator.aggregate();

    const landscapeNode = result.landscapeFile.nodes.find(n => n.type === 'landscape')!;
    expect(landscapeNode.documentation).toContain('Ecommerce Platform');
    expect(landscapeNode.documentation).toContain('Internal Tools');
  });

  it('should set system nodes parentId to landscape node ID', async () => {
    const aggregator = new LandscapeAggregator({ workspacePath: MOCK_ROOT });
    const result = await aggregator.aggregate();

    const landscapeNode = result.landscapeFile.nodes.find(n => n.type === 'landscape')!;
    const systems = result.landscapeFile.nodes.filter(n => n.type === 'softwareSystem');

    for (const sys of systems) {
      expect(sys.parentId).toBe(landscapeNode.id);
    }
  });

  it('should set landscape node childIds to include all system + person + external IDs', async () => {
    const aggregator = new LandscapeAggregator({ workspacePath: MOCK_ROOT });
    const result = await aggregator.aggregate();

    const landscapeNode = result.landscapeFile.nodes.find(n => n.type === 'landscape')!;
    const nonLandscapeNodes = result.landscapeFile.nodes.filter(n => n.type !== 'landscape');

    // All non-landscape nodes should be in childIds
    for (const node of nonLandscapeNodes) {
      expect(landscapeNode.childIds).toContain(node.id);
    }
  });

  it('should generate views including systemLandscape view', async () => {
    const aggregator = new LandscapeAggregator({ workspacePath: MOCK_ROOT });
    const result = await aggregator.aggregate();

    expect(result.landscapeFile.views).toBeDefined();
    expect(result.landscapeFile.views!.systemLandscape).toBeDefined();
    expect(result.landscapeFile.views!.systemLandscape!.key).toBe('landscape');
  });

  it('should have edges in the landscape file', async () => {
    const aggregator = new LandscapeAggregator({ workspacePath: MOCK_ROOT });
    const result = await aggregator.aggregate();

    expect(result.landscapeFile.edges.length).toBeGreaterThan(0);
    // All edges should be at landscape level
    for (const edge of result.landscapeFile.edges) {
      expect(edge.c4Level).toBe('landscape');
    }
  });

  it('should build system summaries for each loaded project', async () => {
    const aggregator = new LandscapeAggregator({ workspacePath: MOCK_ROOT });
    const result = await aggregator.aggregate();

    expect(result.systemSummaries).toHaveLength(2);
    const names = result.systemSummaries.map(s => s.name).sort();
    expect(names).toEqual(['ecommerce-platform', 'internal-tools']);

    const ecommerce = result.systemSummaries.find(s => s.name === 'ecommerce-platform')!;
    expect(ecommerce.containers.length).toBeGreaterThanOrEqual(1);
    expect(ecommerce.externalServices.length).toBeGreaterThanOrEqual(3);
  });

  it('should handle missing .dad/ directory gracefully', async () => {
    const aggregator = new LandscapeAggregator({
      workspacePath: MOCK_ROOT,
      workspaceConfig: {
        name: 'Test Workspace',
        systems: [
          { name: 'ecommerce-platform', path: './ecommerce-platform' },
          { name: 'nonexistent-system', path: './nonexistent-system' },
        ],
      },
    });

    // Should not throw, just skip the missing system
    const result = await aggregator.aggregate();
    expect(result.systemSummaries).toHaveLength(1);
    expect(result.systemSummaries[0].name).toBe('ecommerce-platform');
  });

  it('should support declared relationships from config', async () => {
    const aggregator = new LandscapeAggregator({
      workspacePath: MOCK_ROOT,
      workspaceConfig: {
        name: 'Test Workspace',
        systems: [
          { name: 'ecommerce-platform', path: './ecommerce-platform' },
          { name: 'internal-tools', path: './internal-tools' },
        ],
        relationships: [
          {
            source: 'ecommerce-platform',
            target: 'internal-tools',
            label: 'Provides data to',
            technology: 'REST API',
          },
        ],
      },
    });

    const result = await aggregator.aggregate();
    const declaredEdges = result.landscapeFile.edges.filter(e => e.tags?.includes('declared'));
    expect(declaredEdges).toHaveLength(1);
    expect(declaredEdges[0].label).toBe('Provides data to');
  });

  it('should call onProgress callback', async () => {
    const progressCalls: { stage: string; message: string; percent: number }[] = [];
    const aggregator = new LandscapeAggregator({
      workspacePath: MOCK_ROOT,
      onProgress: (stage, message, percent) => {
        progressCalls.push({ stage, message, percent });
      },
    });

    await aggregator.aggregate();

    expect(progressCalls.length).toBeGreaterThan(0);
    expect(progressCalls[0].percent).toBe(0);
    expect(progressCalls[progressCalls.length - 1].percent).toBe(100);
  });

  it('should set system nodes childIds to empty (containers not in landscape)', async () => {
    const aggregator = new LandscapeAggregator({ workspacePath: MOCK_ROOT });
    const result = await aggregator.aggregate();

    const systems = result.landscapeFile.nodes.filter(n => n.type === 'softwareSystem');
    for (const sys of systems) {
      expect(sys.childIds).toEqual([]);
    }
  });
});
