import type {
  DadEdge,
  AnalyzedFile,
  ComponentGroup,
  ScanResult,
} from '../types';
import { ExternalServiceRegistry } from '../scanner/ExternalServiceRegistry';

/**
 * Derives DadEdge relationships from imports, docker-compose config, and env vars.
 */
export class EdgeInference {
  private externalRegistry = new ExternalServiceRegistry();

  /**
   * Infer container-level edges from docker-compose dependencies, env vars, and shared infrastructure.
   */
  inferContainerEdges(scanResult: ScanResult): DadEdge[] {
    const edges: DadEdge[] = [];
    const seen = new Set<string>();

    for (const container of scanResult.containerMeta) {
      // 1. Env var URL patterns → inter-container edges
      for (const [envKey, envValue] of Object.entries(container.envVars)) {
        // Pattern: *_URL=http://service-name:port
        const urlMatch = envValue.match(/https?:\/\/([a-z0-9-]+):\d+/);
        if (urlMatch) {
          const targetServiceName = urlMatch[1];
          const target = scanResult.containerMeta.find(
            c =>
              c.id === `container:${targetServiceName}` ||
              c.path.endsWith(targetServiceName)
          );
          if (target) {
            const edgeKey = `${container.id}->${target.id}`;
            if (!seen.has(edgeKey)) {
              seen.add(edgeKey);
              edges.push({
                id: `edge:${this.slug(container.id)}-to-${this.slug(target.id)}`,
                source: container.id,
                target: target.id,
                label: `Routes requests to`,
                technology: 'REST/HTTP',
                c4Level: 'container',
                tags: ['sync'],
              });
            }
          }
        }

        // Pattern: DATABASE_URL=postgresql://...
        const dbMatch = envValue.match(/^postgresql:\/\//);
        if (dbMatch) {
          const pgStore = scanResult.dataStores.find(d => d.name === 'PostgreSQL');
          if (pgStore) {
            const edgeKey = `${container.id}->${pgStore.id}`;
            if (!seen.has(edgeKey)) {
              seen.add(edgeKey);
              edges.push({
                id: `edge:${this.slug(container.id)}-to-${this.slug(pgStore.id)}`,
                source: container.id,
                target: pgStore.id,
                label: 'Reads/writes data',
                technology: 'PostgreSQL protocol',
                c4Level: 'container',
                tags: ['data'],
              });
            }
          }
        }

        // Pattern: REDIS_URL=redis://...
        const redisMatch = envValue.match(/^redis:\/\//);
        if (redisMatch) {
          const redisStore = scanResult.dataStores.find(d => d.name === 'Redis');
          if (redisStore) {
            const edgeKey = `${container.id}->${redisStore.id}`;
            if (!seen.has(edgeKey)) {
              seen.add(edgeKey);
              edges.push({
                id: `edge:${this.slug(container.id)}-to-${this.slug(redisStore.id)}`,
                source: container.id,
                target: redisStore.id,
                label: 'Caches data',
                technology: 'Redis protocol',
                c4Level: 'container',
                tags: ['cache'],
              });
            }
          }
        }

        // Pattern: KAFKA_BROKERS → shared Kafka infrastructure
        if (envKey === 'KAFKA_BROKERS') {
          // Mark this container as a Kafka participant
          // We'll create inter-container edges below
        }
      }

      // 2. External service edges from container dependencies
      if (container.packageJson) {
        for (const dep of Object.keys(container.packageJson.dependencies)) {
          const externalName = this.externalRegistry.resolvePackage(dep);
          if (externalName) {
            const extService = scanResult.externalServices.find(
              e => e.name === externalName
            );
            if (extService) {
              const edgeKey = `${container.id}->${extService.id}`;
              if (!seen.has(edgeKey)) {
                seen.add(edgeKey);
                edges.push({
                  id: `edge:${this.slug(container.id)}-to-${this.slug(extService.id)}`,
                  source: container.id,
                  target: extService.id,
                  label: `Uses ${externalName}`,
                  technology: `REST/HTTPS (${externalName} API)`,
                  c4Level: 'container',
                  tags: ['external'],
                });
              }
            }
          }
        }
      }
    }

    // 3. Kafka-based async edges: containers sharing KAFKA_BROKERS
    const kafkaContainers = scanResult.containerMeta.filter(
      c => c.envVars['KAFKA_BROKERS']
    );
    // Heuristic: services with "service" in name publish events,
    // services with "notification" or "consumer" consume them
    const producers = kafkaContainers.filter(
      c => !c.name.toLowerCase().includes('notification') && !c.name.toLowerCase().includes('consumer')
    );
    const consumers = kafkaContainers.filter(
      c => c.name.toLowerCase().includes('notification') || c.name.toLowerCase().includes('consumer')
    );
    for (const producer of producers) {
      for (const consumer of consumers) {
        const edgeKey = `${producer.id}->${consumer.id}`;
        if (!seen.has(edgeKey)) {
          seen.add(edgeKey);
          edges.push({
            id: `edge:${this.slug(producer.id)}-to-${this.slug(consumer.id)}`,
            source: producer.id,
            target: consumer.id,
            label: 'Publishes events to',
            technology: 'Kafka events',
            c4Level: 'container',
            tags: ['async', 'event-driven'],
          });
        }
      }
    }

    return edges;
  }

  /**
   * Infer component-level edges from import relationships.
   */
  inferComponentEdges(
    files: AnalyzedFile[],
    components: ComponentGroup[]
  ): DadEdge[] {
    const edges: DadEdge[] = [];
    const seen = new Set<string>();

    for (const file of files) {
      const sourceComponent = components.find(c => c.sourceFiles.includes(file.filePath));
      if (!sourceComponent) continue;

      for (const imp of file.imports) {
        if (imp.isExternal) continue;
        if (!imp.resolvedPath) continue;

        // Find which component owns the imported file
        const targetComponent = components.find(c =>
          c.sourceFiles.some(sf => imp.resolvedPath!.endsWith(sf))
        );

        if (targetComponent && targetComponent.id !== sourceComponent.id) {
          const edgeKey = `${sourceComponent.id}->${targetComponent.id}`;
          if (!seen.has(edgeKey)) {
            seen.add(edgeKey);
            edges.push({
              id: `edge:${this.slug(sourceComponent.id)}-to-${this.slug(targetComponent.id)}`,
              source: sourceComponent.id,
              target: targetComponent.id,
              label: `Uses`,
              technology: 'Internal call',
              c4Level: 'component',
              tags: ['internal'],
            });
          }
        }
      }
    }

    return edges;
  }

  /**
   * Infer context-level edges (between systems and external services).
   */
  inferContextEdges(scanResult: ScanResult): DadEdge[] {
    const edges: DadEdge[] = [];
    const seen = new Set<string>();

    // System-to-system edges (if multiple systems share containers)
    if (scanResult.systems.length > 1) {
      // Check if any system's containers reference another system
      for (let i = 0; i < scanResult.systems.length; i++) {
        for (let j = i + 1; j < scanResult.systems.length; j++) {
          const sysA = scanResult.systems[i];
          const sysB = scanResult.systems[j];
          const edgeKey = `${sysA.id}->${sysB.id}`;
          if (!seen.has(edgeKey)) {
            seen.add(edgeKey);
            edges.push({
              id: `edge:${this.slug(sysA.id)}-to-${this.slug(sysB.id)}`,
              source: sysA.id,
              target: sysB.id,
              label: 'Manages via internal APIs',
              technology: 'REST/HTTPS',
              c4Level: 'context',
              tags: ['internal'],
            });
          }
        }
      }
    }

    return edges;
  }

  private slug(id: string): string {
    // Remove prefix for edge naming
    return id.replace(/^[a-z]+:/, '');
  }
}
