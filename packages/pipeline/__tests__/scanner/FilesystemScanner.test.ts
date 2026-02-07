import { describe, it, expect } from 'vitest';
import * as path from 'path';
import { FilesystemScanner } from '../../src/scanner/FilesystemScanner';

const MOCK_ROOT = path.resolve(__dirname, '../../../../examples/mock-microservices');

describe('FilesystemScanner', () => {
  it('should detect all systems from workspace.json', async () => {
    const scanner = new FilesystemScanner();
    const result = await scanner.scan(MOCK_ROOT);

    expect(result.systems).toHaveLength(2);
    expect(result.systems.map(s => s.name).sort()).toEqual([
      'Ecommerce Platform',
      'Internal Tools',
    ]);
  });

  it('should detect project name from workspace.json', async () => {
    const scanner = new FilesystemScanner();
    const result = await scanner.scan(MOCK_ROOT);

    expect(result.projectName).toBe('Velvee.ai, Inc');
  });

  it('should detect all containers (services with package.json or requirements.txt)', async () => {
    const scanner = new FilesystemScanner();
    const result = await scanner.scan(MOCK_ROOT);

    const containerNames = result.containerMeta.map(c => c.name).sort();
    expect(containerNames).toContain('Api Gateway');
    expect(containerNames).toContain('User Service');
    expect(containerNames).toContain('Order Service');
    expect(containerNames).toContain('Notification Service');
    expect(containerNames).toContain('Admin Dashboard');
  });

  it('should detect data stores from docker-compose', async () => {
    const scanner = new FilesystemScanner();
    const result = await scanner.scan(MOCK_ROOT);

    const dataStoreNames = result.dataStores.map(d => d.name).sort();
    expect(dataStoreNames).toContain('PostgreSQL');
    expect(dataStoreNames).toContain('Redis');
    expect(dataStoreNames).toContain('Kafka');
  });

  it('should detect data store technology with version', async () => {
    const scanner = new FilesystemScanner();
    const result = await scanner.scan(MOCK_ROOT);

    const postgres = result.dataStores.find(d => d.name === 'PostgreSQL');
    expect(postgres).toBeDefined();
    expect(postgres!.technology).toBe('PostgreSQL 15');

    const redis = result.dataStores.find(d => d.name === 'Redis');
    expect(redis).toBeDefined();
    expect(redis!.technology).toBe('Redis 7');
  });

  it('should detect external services from dependencies', async () => {
    const scanner = new FilesystemScanner();
    const result = await scanner.scan(MOCK_ROOT);

    const extNames = result.externalServices.map(e => e.name).sort();
    expect(extNames).toContain('Stripe');
    expect(extNames).toContain('SendGrid');
  });

  it('should detect container technology from package dependencies', async () => {
    const scanner = new FilesystemScanner();
    const result = await scanner.scan(MOCK_ROOT);

    const apiGateway = result.containerMeta.find(c => c.id === 'container:api-gateway');
    expect(apiGateway).toBeDefined();
    expect(apiGateway!.technology).toBe('TypeScript/Express');

    const notificationService = result.containerMeta.find(
      c => c.id === 'container:notification-service'
    );
    expect(notificationService).toBeDefined();
    expect(notificationService!.technology).toContain('Python');
  });

  it('should assign containers to the correct system', async () => {
    const scanner = new FilesystemScanner();
    const result = await scanner.scan(MOCK_ROOT);

    const ecommSystem = result.systems.find(s => s.name === 'Ecommerce Platform');
    expect(ecommSystem).toBeDefined();
    expect(ecommSystem!.containerIds).toContain('container:api-gateway');
    expect(ecommSystem!.containerIds).toContain('container:user-service');
    expect(ecommSystem!.containerIds).toContain('container:order-service');
    expect(ecommSystem!.containerIds).toContain('container:notification-service');

    const internalSystem = result.systems.find(s => s.name === 'Internal Tools');
    expect(internalSystem).toBeDefined();
    expect(internalSystem!.containerIds).toContain('container:admin-dashboard');
  });

  it('should merge env vars from docker-compose into containers', async () => {
    const scanner = new FilesystemScanner();
    const result = await scanner.scan(MOCK_ROOT);

    const apiGateway = result.containerMeta.find(c => c.id === 'container:api-gateway');
    expect(apiGateway).toBeDefined();
    expect(apiGateway!.envVars).toBeDefined();
    expect(apiGateway!.envVars['USER_SERVICE_URL']).toBe('http://user-service:4001');
    expect(apiGateway!.envVars['REDIS_URL']).toBe('redis://redis:6379');
  });

  it('should find source files in containers', async () => {
    const scanner = new FilesystemScanner();
    const result = await scanner.scan(MOCK_ROOT);

    const userService = result.containerMeta.find(c => c.id === 'container:user-service');
    expect(userService).toBeDefined();
    expect(userService!.sourceFiles.length).toBeGreaterThan(0);
    expect(userService!.sourceFiles.some(f => f.includes('userController'))).toBe(true);
  });

  it('should use deterministic IDs with correct prefixes', async () => {
    const scanner = new FilesystemScanner();
    const result = await scanner.scan(MOCK_ROOT);

    // System IDs
    for (const sys of result.systems) {
      expect(sys.id).toMatch(/^system:/);
    }

    // Container IDs
    for (const container of result.containerMeta) {
      expect(container.id).toMatch(/^container:/);
    }

    // Data store IDs
    for (const ds of result.dataStores) {
      expect(ds.id).toMatch(/^datastore:/);
    }

    // External service IDs
    for (const ext of result.externalServices) {
      expect(ext.id).toMatch(/^external:/);
    }
  });
});
