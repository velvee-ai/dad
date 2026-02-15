import { describe, it, expect } from 'vitest';
import * as path from 'path';
import { LandscapeAggregator } from '../../src/landscape/LandscapeAggregator';

const MOCK_ROOT = path.resolve(__dirname, '../../../../examples/mock-microservices');

describe('LandscapeAggregator (integration)', () => {
  it('should aggregate into a valid landscape', async () => {
    const aggregator = new LandscapeAggregator({ workspacePath: MOCK_ROOT });
    const result = await aggregator.aggregate();

    // Has landscape node
    const landscapeNode = result.landscapeFile.nodes.find(n => n.type === 'landscape');
    expect(landscapeNode).toBeDefined();
    expect(landscapeNode!.c4Level).toBe('landscape');

    // Has 2 software systems
    const systems = result.landscapeFile.nodes.filter(n => n.type === 'softwareSystem');
    expect(systems).toHaveLength(2);

    // Persons are deduplicated (same person:customer ID across projects)
    const persons = result.landscapeFile.nodes.filter(n => n.type === 'person');
    const personIds = new Set(persons.map(p => p.id));
    expect(personIds.size).toBe(persons.length);

    // All non-boundary nodes have designSpec (landscape node is enriched)
    expect(landscapeNode!.designSpec).toBeTruthy();

    // Edges exist
    expect(result.landscapeFile.edges.length).toBeGreaterThan(0);

    // Metadata is correct
    expect(result.landscapeFile.version).toBe('1.0');
    expect(result.landscapeFile.metadata.generatedBy).toBe('dad-pipeline/landscape-aggregator');
    expect(result.landscapeFile.metadata.totalNodes).toBe(result.landscapeFile.nodes.length);
    expect(result.landscapeFile.metadata.totalEdges).toBe(result.landscapeFile.edges.length);
  });

  it('should produce valid views and styles', async () => {
    const aggregator = new LandscapeAggregator({ workspacePath: MOCK_ROOT });
    const result = await aggregator.aggregate();

    expect(result.landscapeFile.views).toBeDefined();
    expect(result.landscapeFile.styles).toBeDefined();

    // Should have landscape view
    expect(result.landscapeFile.views!.systemLandscape).toBeDefined();
    expect(result.landscapeFile.views!.systemLandscape!.key).toBe('landscape');

    // Should have context views for each system
    expect(result.landscapeFile.views!.systemContext).toBeDefined();
    expect(result.landscapeFile.views!.systemContext!.length).toBe(2);

    // Styles should have element and relationship rules
    expect(result.landscapeFile.styles!.elements.length).toBeGreaterThan(0);
    expect(result.landscapeFile.styles!.relationships.length).toBeGreaterThan(0);
  });

  it('should produce correct system summaries', async () => {
    const aggregator = new LandscapeAggregator({ workspacePath: MOCK_ROOT });
    const result = await aggregator.aggregate();

    expect(result.systemSummaries).toHaveLength(2);

    const ecommerce = result.systemSummaries.find(s => s.name === 'ecommerce-platform')!;
    expect(ecommerce).toBeDefined();
    expect(ecommerce.containers).toContain('Order Service');
    expect(ecommerce.containers).toContain('User Service');
    expect(ecommerce.externalServices).toContain('Stripe');
    expect(ecommerce.externalServices).toContain('SendGrid');

    const internal = result.systemSummaries.find(s => s.name === 'internal-tools')!;
    expect(internal).toBeDefined();
    expect(internal.persons).toContain('Customer');
    expect(internal.persons).toContain('Admin User');
  });

  it('should have all edges at landscape level', async () => {
    const aggregator = new LandscapeAggregator({ workspacePath: MOCK_ROOT });
    const result = await aggregator.aggregate();

    for (const edge of result.landscapeFile.edges) {
      expect(edge.c4Level).toBe('landscape');
    }
  });

  it('should have consistent node references in edges', async () => {
    const aggregator = new LandscapeAggregator({ workspacePath: MOCK_ROOT });
    const result = await aggregator.aggregate();

    const nodeIds = new Set(result.landscapeFile.nodes.map(n => n.id));

    for (const edge of result.landscapeFile.edges) {
      expect(nodeIds.has(edge.source)).toBe(true);
      expect(nodeIds.has(edge.target)).toBe(true);
    }
  });
});
