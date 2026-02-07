import { describe, it, expect } from 'vitest';
import * as path from 'path';
import { FilesystemScanner } from '../../src/scanner/FilesystemScanner';
import { ComponentGrouper } from '../../src/grouper/ComponentGrouper';
import { DadFileAssembler } from '../../src/assembler/DadFileAssembler';

const MOCK_ROOT = path.resolve(__dirname, '../../../../examples/mock-microservices');

describe('DadFileAssembler', () => {
  it('should assemble a DadFileSet with all 5 levels + combined', async () => {
    const scanner = new FilesystemScanner();
    const scanResult = await scanner.scan(MOCK_ROOT);

    // Group from paths (no analyzer)
    const grouper = new ComponentGrouper();
    const components = scanResult.containerMeta.flatMap(container =>
      grouper.groupFromPaths(container.sourceFiles, container.id, container.technology)
    );

    const assembler = new DadFileAssembler();
    const dadFileSet = assembler.assemble(scanResult, components, []);

    expect(dadFileSet.landscape).toBeDefined();
    expect(dadFileSet.context).toBeDefined();
    expect(dadFileSet.container).toBeDefined();
    expect(dadFileSet.component).toBeDefined();
    expect(dadFileSet.code).toBeDefined();
    expect(dadFileSet.combined).toBeDefined();
  });

  it('should produce exactly one landscape node', async () => {
    const scanner = new FilesystemScanner();
    const scanResult = await scanner.scan(MOCK_ROOT);

    const assembler = new DadFileAssembler();
    const dadFileSet = assembler.assemble(scanResult, [], []);

    expect(dadFileSet.landscape.nodes).toHaveLength(1);
    expect(dadFileSet.landscape.nodes[0].type).toBe('landscape');
    expect(dadFileSet.landscape.nodes[0].parentId).toBeNull();
  });

  it('should produce context nodes for systems and external services', async () => {
    const scanner = new FilesystemScanner();
    const scanResult = await scanner.scan(MOCK_ROOT);

    const assembler = new DadFileAssembler();
    const dadFileSet = assembler.assemble(scanResult, [], []);

    const contextNodes = dadFileSet.context.nodes;

    // 2 systems + 2 external services (Stripe, SendGrid)
    const systemNodes = contextNodes.filter(n => n.type === 'softwareSystem');
    expect(systemNodes.length).toBe(2);

    const externalNodes = contextNodes.filter(n => n.type === 'externalSystem');
    expect(externalNodes.length).toBeGreaterThanOrEqual(2);
  });

  it('should produce container nodes for services and data stores', async () => {
    const scanner = new FilesystemScanner();
    const scanResult = await scanner.scan(MOCK_ROOT);

    const assembler = new DadFileAssembler();
    const dadFileSet = assembler.assemble(scanResult, [], []);

    const containerNodes = dadFileSet.container.nodes.filter(n => n.type === 'container');
    const dataStoreNodes = dadFileSet.container.nodes.filter(n => n.type === 'dataStore');

    expect(containerNodes.length).toBeGreaterThanOrEqual(5); // 5 containers
    expect(dataStoreNodes.length).toBeGreaterThanOrEqual(3); // postgres, redis, kafka
  });

  it('should maintain correct parent-child hierarchy', async () => {
    const scanner = new FilesystemScanner();
    const scanResult = await scanner.scan(MOCK_ROOT);

    const assembler = new DadFileAssembler();
    const dadFileSet = assembler.assemble(scanResult, [], []);

    const allNodes = dadFileSet.combined.nodes;
    const nodeMap = new Map(allNodes.map(n => [n.id, n]));

    // Every node with a parentId should have a parent that exists
    for (const node of allNodes) {
      if (node.parentId) {
        expect(nodeMap.has(node.parentId)).toBe(true);
      }
    }

    // Every childId should reference an existing node
    for (const node of allNodes) {
      for (const childId of node.childIds) {
        expect(nodeMap.has(childId)).toBe(true);
      }
    }
  });

  it('should use version 1.0 for all DadFiles', async () => {
    const scanner = new FilesystemScanner();
    const scanResult = await scanner.scan(MOCK_ROOT);

    const assembler = new DadFileAssembler();
    const dadFileSet = assembler.assemble(scanResult, [], []);

    for (const level of ['landscape', 'context', 'container', 'component', 'code', 'combined'] as const) {
      expect(dadFileSet[level].version).toBe('1.0');
    }
  });

  it('should populate metadata correctly', async () => {
    const scanner = new FilesystemScanner();
    const scanResult = await scanner.scan(MOCK_ROOT);

    const assembler = new DadFileAssembler();
    const dadFileSet = assembler.assemble(scanResult, [], []);

    const meta = dadFileSet.combined.metadata;
    expect(meta.projectName).toBe('Velvee.ai, Inc');
    expect(meta.generatedBy).toBe('dad-pipeline/0.0.1');
    expect(meta.generatedAt).toBeDefined();
    expect(meta.totalNodes).toBeGreaterThan(0);
  });

  it('should produce edges at the container level', async () => {
    const scanner = new FilesystemScanner();
    const scanResult = await scanner.scan(MOCK_ROOT);

    const assembler = new DadFileAssembler();
    const dadFileSet = assembler.assemble(scanResult, [], []);

    const containerEdges = dadFileSet.container.edges;
    expect(containerEdges.length).toBeGreaterThan(0);
  });

  it('should follow ID prefix conventions', async () => {
    const scanner = new FilesystemScanner();
    const scanResult = await scanner.scan(MOCK_ROOT);

    const assembler = new DadFileAssembler();
    const dadFileSet = assembler.assemble(scanResult, [], []);

    for (const node of dadFileSet.combined.nodes) {
      switch (node.type) {
        case 'landscape':
          expect(node.id).toMatch(/^landscape:/);
          break;
        case 'softwareSystem':
          expect(node.id).toMatch(/^system:/);
          break;
        case 'externalSystem':
          expect(node.id).toMatch(/^external:/);
          break;
        case 'container':
          expect(node.id).toMatch(/^container:/);
          break;
        case 'dataStore':
          expect(node.id).toMatch(/^datastore:/);
          break;
        case 'component':
          expect(node.id).toMatch(/^component:/);
          break;
        case 'codeUnit':
          expect(node.id).toMatch(/^code:/);
          break;
      }
    }
  });
});
