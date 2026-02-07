import { describe, it, expect } from 'vitest';
import * as path from 'path';
import { FilesystemScanner } from '../../src/scanner/FilesystemScanner';
import { EdgeInference } from '../../src/assembler/EdgeInference';

const MOCK_ROOT = path.resolve(__dirname, '../../../../examples/mock-microservices');

describe('EdgeInference', () => {
  it('should infer container edges from env var URLs', async () => {
    const scanner = new FilesystemScanner();
    const scanResult = await scanner.scan(MOCK_ROOT);

    const edgeInference = new EdgeInference();
    const edges = edgeInference.inferContainerEdges(scanResult);

    // API gateway → user-service (via USER_SERVICE_URL env var)
    const gatewayToUser = edges.find(
      e => e.source === 'container:api-gateway' && e.target === 'container:user-service'
    );
    expect(gatewayToUser).toBeDefined();
    expect(gatewayToUser!.technology).toBe('REST/HTTP');

    // API gateway → order-service (via ORDER_SERVICE_URL env var)
    const gatewayToOrder = edges.find(
      e => e.source === 'container:api-gateway' && e.target === 'container:order-service'
    );
    expect(gatewayToOrder).toBeDefined();
  });

  it('should infer database edges from DATABASE_URL', async () => {
    const scanner = new FilesystemScanner();
    const scanResult = await scanner.scan(MOCK_ROOT);

    const edgeInference = new EdgeInference();
    const edges = edgeInference.inferContainerEdges(scanResult);

    // user-service → postgres (via DATABASE_URL)
    const userToPostgres = edges.find(
      e => e.source === 'container:user-service' && e.target === 'datastore:postgresql'
    );
    expect(userToPostgres).toBeDefined();
    expect(userToPostgres!.technology).toBe('PostgreSQL protocol');

    // order-service → postgres (via DATABASE_URL)
    const orderToPostgres = edges.find(
      e => e.source === 'container:order-service' && e.target === 'datastore:postgresql'
    );
    expect(orderToPostgres).toBeDefined();
  });

  it('should infer Redis edges from REDIS_URL', async () => {
    const scanner = new FilesystemScanner();
    const scanResult = await scanner.scan(MOCK_ROOT);

    const edgeInference = new EdgeInference();
    const edges = edgeInference.inferContainerEdges(scanResult);

    // api-gateway → redis (via REDIS_URL)
    const gatewayToRedis = edges.find(
      e => e.source === 'container:api-gateway' && e.target === 'datastore:redis'
    );
    expect(gatewayToRedis).toBeDefined();
    expect(gatewayToRedis!.technology).toBe('Redis protocol');
  });

  it('should infer Kafka async edges between producers and consumers', async () => {
    const scanner = new FilesystemScanner();
    const scanResult = await scanner.scan(MOCK_ROOT);

    const edgeInference = new EdgeInference();
    const edges = edgeInference.inferContainerEdges(scanResult);

    // Services with KAFKA_BROKERS → notification-service (consumer)
    const kafkaEdges = edges.filter(e => e.tags?.includes('event-driven'));
    expect(kafkaEdges.length).toBeGreaterThan(0);

    // user-service → notification-service
    const userToNotification = kafkaEdges.find(
      e => e.source === 'container:user-service' && e.target === 'container:notification-service'
    );
    expect(userToNotification).toBeDefined();
    expect(userToNotification!.technology).toBe('Kafka events');

    // order-service → notification-service
    const orderToNotification = kafkaEdges.find(
      e => e.source === 'container:order-service' && e.target === 'container:notification-service'
    );
    expect(orderToNotification).toBeDefined();
  });

  it('should infer external service edges from package dependencies', async () => {
    const scanner = new FilesystemScanner();
    const scanResult = await scanner.scan(MOCK_ROOT);

    const edgeInference = new EdgeInference();
    const edges = edgeInference.inferContainerEdges(scanResult);

    // order-service → Stripe (via stripe package)
    const orderToStripe = edges.find(
      e => e.source === 'container:order-service' && e.target === 'external:stripe'
    );
    expect(orderToStripe).toBeDefined();
    expect(orderToStripe!.tags).toContain('external');
  });

  it('should infer context-level edges between systems', async () => {
    const scanner = new FilesystemScanner();
    const scanResult = await scanner.scan(MOCK_ROOT);

    const edgeInference = new EdgeInference();
    const edges = edgeInference.inferContextEdges(scanResult);

    // With 2 systems, there should be an edge between them
    expect(edges.length).toBeGreaterThan(0);
    expect(edges[0].c4Level).toBe('context');
  });

  it('should not create duplicate edges', async () => {
    const scanner = new FilesystemScanner();
    const scanResult = await scanner.scan(MOCK_ROOT);

    const edgeInference = new EdgeInference();
    const edges = edgeInference.inferContainerEdges(scanResult);

    const edgeKeys = edges.map(e => `${e.source}->${e.target}`);
    const uniqueKeys = [...new Set(edgeKeys)];
    expect(edgeKeys.length).toBe(uniqueKeys.length);
  });

  it('should assign correct c4Level to all edges', async () => {
    const scanner = new FilesystemScanner();
    const scanResult = await scanner.scan(MOCK_ROOT);

    const edgeInference = new EdgeInference();
    const containerEdges = edgeInference.inferContainerEdges(scanResult);
    const contextEdges = edgeInference.inferContextEdges(scanResult);

    for (const edge of containerEdges) {
      expect(edge.c4Level).toBe('container');
    }
    for (const edge of contextEdges) {
      expect(edge.c4Level).toBe('context');
    }
  });
});
