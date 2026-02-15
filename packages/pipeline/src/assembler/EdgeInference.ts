import type {
  DadEdge,
  AnalyzedFile,
  ComponentGroup,
  ScanResult,
  C4Level,
} from '../types';
import { personId } from './IdGenerator';
import { ExternalServiceRegistry } from '../scanner/ExternalServiceRegistry';

/**
 * Derives DadEdge relationships from imports, docker-compose config, and env vars.
 */
export class EdgeInference {
  private externalRegistry = new ExternalServiceRegistry();

  /**
   * Create edges from LLM profile relationships.
   * Resolves source/target names to node IDs and assigns appropriate c4Level.
   */
  inferEdgesFromProfile(scanResult: ScanResult): DadEdge[] {
    if (!scanResult.profileRelationships?.length) return [];

    const edges: DadEdge[] = [];
    const seen = new Set<string>();

    // Build name→id lookup maps
    const nameToId = new Map<string, string>();
    for (const c of scanResult.containerMeta) {
      nameToId.set(c.name.toLowerCase(), c.id);
    }
    for (const ds of scanResult.dataStores) {
      nameToId.set(ds.name.toLowerCase(), ds.id);
    }
    for (const ext of scanResult.externalServices) {
      nameToId.set(ext.name.toLowerCase(), ext.id);
    }
    if (scanResult.profileActors) {
      for (const actor of scanResult.profileActors) {
        nameToId.set(actor.name.toLowerCase(), personId(actor.name));
      }
    }

    for (const rel of scanResult.profileRelationships) {
      const sourceId = this.resolveNameToId(rel.source, nameToId);
      const targetId = this.resolveNameToId(rel.target, nameToId);

      if (!sourceId || !targetId) continue;
      if (sourceId === targetId) continue;

      const edgeKey = `${sourceId}->${targetId}`;
      if (seen.has(edgeKey)) continue;
      seen.add(edgeKey);

      // Determine c4Level based on source/target types
      const c4Level = this.determineEdgeLevel(sourceId);

      edges.push({
        id: `edge:${this.slug(sourceId)}-to-${this.slug(targetId)}`,
        source: sourceId,
        target: targetId,
        label: rel.label,
        technology: rel.technology,
        c4Level,
        tags: rel.tags,
      });
    }

    return edges;
  }

  private resolveNameToId(name: string, nameToId: Map<string, string>): string | null {
    // Exact match (case-insensitive)
    const lower = name.toLowerCase();
    const exact = nameToId.get(lower);
    if (exact) return exact;

    // Fuzzy match: check if any key contains the name or vice versa
    for (const [key, id] of nameToId) {
      if (key.includes(lower) || lower.includes(key)) {
        return id;
      }
    }

    return null;
  }

  private determineEdgeLevel(sourceId: string): C4Level {
    if (sourceId.startsWith('person:') || sourceId.startsWith('system:') || sourceId.startsWith('external:')) {
      return 'context';
    }
    if (sourceId.startsWith('component:')) {
      return 'component';
    }
    return 'container';
  }

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
   * Heuristic fallback: infer component-level edges from role conventions
   * when no LSP-based import analysis is available.
   *
   * Rules (within same container):
   *   controller → service
   *   route → middleware (for API gateways)
   *   handler → service
   *   service → repository
   *   service → model
   *
   * Also propagates container-level external edges down to matching components.
   */
  inferComponentEdgesFromRoles(
    components: ComponentGroup[],
    containerEdges: DadEdge[]
  ): DadEdge[] {
    const edges: DadEdge[] = [];
    const seen = new Set<string>();

    // Group components by container
    const byContainer = new Map<string, ComponentGroup[]>();
    for (const comp of components) {
      const list = byContainer.get(comp.containerId) || [];
      list.push(comp);
      byContainer.set(comp.containerId, list);
    }

    const roleEdgeRules: Array<{ from: string; to: string; label: string }> = [
      { from: 'controller', to: 'service', label: 'Delegates business logic to' },
      { from: 'route', to: 'middleware', label: 'Uses for request processing' },
      { from: 'handler', to: 'service', label: 'Delegates processing to' },
      { from: 'service', to: 'repository', label: 'Reads/writes data via' },
      { from: 'service', to: 'model', label: 'Uses model types from' },
    ];

    for (const [, containerComps] of byContainer) {
      for (const rule of roleEdgeRules) {
        const sources = containerComps.filter(c => c.role === rule.from);
        const targets = containerComps.filter(c => c.role === rule.to);

        for (const source of sources) {
          for (const target of targets) {
            const edgeKey = `${source.id}->${target.id}`;
            if (!seen.has(edgeKey)) {
              seen.add(edgeKey);
              edges.push({
                id: `edge:${this.slug(source.id)}-to-${this.slug(target.id)}`,
                source: source.id,
                target: target.id,
                label: rule.label,
                technology: 'Internal call',
                c4Level: 'component',
                tags: ['internal'],
              });
            }
          }
        }
      }
    }

    // Propagate container→external edges down to service/handler components
    for (const containerEdge of containerEdges) {
      if (!containerEdge.tags?.includes('external')) continue;

      const containerId = containerEdge.source;
      const containerComps = byContainer.get(containerId);
      if (!containerComps) continue;

      // Find service or handler components that would use the external service
      const relevantComps = containerComps.filter(
        c => c.role === 'service' || c.role === 'handler'
      );
      for (const comp of relevantComps) {
        const edgeKey = `${comp.id}->${containerEdge.target}`;
        if (!seen.has(edgeKey)) {
          seen.add(edgeKey);
          edges.push({
            id: `edge:${this.slug(comp.id)}-to-${this.slug(containerEdge.target)}`,
            source: comp.id,
            target: containerEdge.target,
            label: containerEdge.label,
            technology: containerEdge.technology,
            c4Level: 'component',
            tags: ['external'],
          });
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
