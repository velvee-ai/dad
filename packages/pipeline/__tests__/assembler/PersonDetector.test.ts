import { describe, it, expect } from 'vitest';
import { PersonDetector } from '../../src/assembler/PersonDetector';
import type { ScanResult } from '../../src/types';

describe('PersonDetector', () => {
  const detector = new PersonDetector();

  function makeScanResult(overrides: Partial<ScanResult> = {}): ScanResult {
    return {
      projectName: 'Test',
      rootPath: '/test',
      systems: [],
      containerMeta: [],
      dataStores: [],
      externalServices: [],
      ...overrides,
    };
  }

  it('should detect Customer person when React frontend exists', () => {
    const scanResult = makeScanResult({
      containerMeta: [
        {
          id: 'container:web-frontend',
          name: 'Web Frontend',
          path: 'web-frontend',
          systemId: 'system:test',
          detectedBy: 'package-json',
          technology: 'TypeScript/React',
          sourceFiles: [],
          envVars: {},
        },
      ],
    });

    const results = detector.detect(scanResult);
    const customer = results.find(r => r.node.name === 'Customer');

    expect(customer).toBeDefined();
    expect(customer!.node.type).toBe('person');
    expect(customer!.node.scope).toBe('external');
    expect(customer!.node.parentId).toBeNull();
    expect(customer!.edges.length).toBeGreaterThan(0);
    expect(customer!.edges[0].target).toBe('container:web-frontend');
  });

  it('should detect Admin User person when admin container exists', () => {
    const scanResult = makeScanResult({
      containerMeta: [
        {
          id: 'container:admin-dashboard',
          name: 'Admin Dashboard',
          path: 'admin-dashboard',
          systemId: 'system:test',
          detectedBy: 'package-json',
          technology: 'TypeScript/React',
          sourceFiles: [],
          envVars: {},
        },
      ],
    });

    const results = detector.detect(scanResult);
    const admin = results.find(r => r.node.name === 'Admin User');

    expect(admin).toBeDefined();
    expect(admin!.node.type).toBe('person');
    expect(admin!.node.scope).toBe('internal');
    expect(admin!.edges.length).toBe(1);
    expect(admin!.edges[0].target).toBe('container:admin-dashboard');
  });

  it('should detect both Customer and Admin when both frontends exist', () => {
    const scanResult = makeScanResult({
      containerMeta: [
        {
          id: 'container:web-frontend',
          name: 'Web Frontend',
          path: 'web-frontend',
          systemId: 'system:test',
          detectedBy: 'package-json',
          technology: 'TypeScript/React',
          sourceFiles: [],
          envVars: {},
        },
        {
          id: 'container:admin-dashboard',
          name: 'Admin Dashboard',
          path: 'admin-dashboard',
          systemId: 'system:test',
          detectedBy: 'package-json',
          technology: 'TypeScript/React',
          sourceFiles: [],
          envVars: {},
        },
      ],
    });

    const results = detector.detect(scanResult);
    expect(results.length).toBe(2);
    expect(results.map(r => r.node.name).sort()).toEqual(['Admin User', 'Customer']);
  });

  it('should not create Customer edge to admin frontend', () => {
    const scanResult = makeScanResult({
      containerMeta: [
        {
          id: 'container:admin-dashboard',
          name: 'Admin Dashboard',
          path: 'admin-dashboard',
          systemId: 'system:test',
          detectedBy: 'package-json',
          technology: 'TypeScript/React',
          sourceFiles: [],
          envVars: {},
        },
      ],
    });

    const results = detector.detect(scanResult);
    const customer = results.find(r => r.node.name === 'Customer');

    // Customer is detected because React exists, but edge should go to gateway (none exists)
    // or have no edge
    if (customer) {
      const adminEdge = customer.edges.find(e => e.target === 'container:admin-dashboard');
      expect(adminEdge).toBeUndefined();
    }
  });

  it('should return empty when no frontends exist', () => {
    const scanResult = makeScanResult({
      containerMeta: [
        {
          id: 'container:api-service',
          name: 'API Service',
          path: 'api-service',
          systemId: 'system:test',
          detectedBy: 'package-json',
          technology: 'TypeScript/Express',
          sourceFiles: [],
          envVars: {},
        },
      ],
    });

    const results = detector.detect(scanResult);
    expect(results.length).toBe(0);
  });

  it('should detect Next.js as customer-facing frontend', () => {
    const scanResult = makeScanResult({
      containerMeta: [
        {
          id: 'container:web-app',
          name: 'Web App',
          path: 'web-app',
          systemId: 'system:test',
          detectedBy: 'package-json',
          technology: 'TypeScript/Next.js',
          sourceFiles: [],
          envVars: {},
        },
      ],
    });

    const results = detector.detect(scanResult);
    const customer = results.find(r => r.node.name === 'Customer');
    expect(customer).toBeDefined();
  });
});
