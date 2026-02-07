import type { DadEdge, DadNode } from '../types';
import type { ProjectContext } from './types';
import { edgeId } from '../assembler/IdGenerator';

/**
 * Infers cross-system edges at the landscape level based on shared entities
 * (external services, data stores, persons) across multiple projects.
 */
export class CrossSystemEdgeInference {
  /**
   * Analyze multiple project contexts and produce landscape-level edges
   * that connect systems via shared external services, data stores, and persons.
   */
  infer(contexts: ProjectContext[]): DadEdge[] {
    const edges: DadEdge[] = [];
    const seenEdgeIds = new Set<string>();

    const addEdge = (edge: DadEdge): void => {
      if (!seenEdgeIds.has(edge.id)) {
        seenEdgeIds.add(edge.id);
        edges.push(edge);
      }
    };

    // Strategy 1: Shared external services
    this.inferFromSharedExternals(contexts, addEdge);

    // Strategy 2: Shared data stores
    this.inferFromSharedDataStores(contexts, addEdge);

    // Strategy 3: Shared persons
    this.inferFromSharedPersons(contexts, addEdge);

    // Strategy 4: Lift context-level edges
    this.liftContextEdges(contexts, addEdge);

    return edges;
  }

  /**
   * If the same external service (by ID) appears in multiple projects' context files,
   * create edges from each system to the shared external node.
   */
  private inferFromSharedExternals(
    contexts: ProjectContext[],
    addEdge: (edge: DadEdge) => void
  ): void {
    // Map: externalId -> list of system node IDs that reference it
    const externalToSystems = new Map<string, { systemId: string; systemName: string }[]>();

    for (const ctx of contexts) {
      const systemNode = ctx.contextFile.nodes.find(n => n.type === 'softwareSystem');
      if (!systemNode) continue;

      const externals = ctx.contextFile.nodes.filter(n => n.type === 'externalSystem' && !n.boundary);
      for (const ext of externals) {
        const list = externalToSystems.get(ext.id) || [];
        list.push({ systemId: systemNode.id, systemName: systemNode.name });
        externalToSystems.set(ext.id, list);
      }

      // Also check container file for boundary externals referenced in edges
      if (ctx.containerFile) {
        const containerExternals = ctx.containerFile.nodes.filter(
          n => n.type === 'externalSystem'
        );
        for (const ext of containerExternals) {
          const list = externalToSystems.get(ext.id) || [];
          if (!list.some(s => s.systemId === systemNode.id)) {
            list.push({ systemId: systemNode.id, systemName: systemNode.name });
            externalToSystems.set(ext.id, list);
          }
        }
      }
    }

    // Create edges from each system to the shared external
    for (const [extId, systems] of externalToSystems) {
      for (const sys of systems) {
        const id = edgeId(sys.systemId, extId);
        addEdge({
          id,
          source: sys.systemId,
          target: extId,
          label: 'Uses',
          c4Level: 'landscape',
          tags: ['inferred'],
        });
      }
    }
  }

  /**
   * If two systems have data store nodes with the same technology,
   * infer that they share a data store. Create a landscape-level
   * edge from each system to the shared data store node.
   */
  private inferFromSharedDataStores(
    contexts: ProjectContext[],
    addEdge: (edge: DadEdge) => void
  ): void {
    // Map: dataStoreId -> list of system IDs
    const dataStoreToSystems = new Map<string, { systemId: string }[]>();

    for (const ctx of contexts) {
      const systemNode = ctx.contextFile.nodes.find(n => n.type === 'softwareSystem');
      if (!systemNode || !ctx.containerFile) continue;

      const dataStores = ctx.containerFile.nodes.filter(
        n => n.type === 'dataStore' && !n.boundary
      );
      for (const ds of dataStores) {
        const list = dataStoreToSystems.get(ds.id) || [];
        if (!list.some(s => s.systemId === systemNode.id)) {
          list.push({ systemId: systemNode.id });
          dataStoreToSystems.set(ds.id, list);
        }
      }
    }

    // Only create edges for data stores shared by 2+ systems
    for (const [dsId, systems] of dataStoreToSystems) {
      if (systems.length < 2) continue;
      for (const sys of systems) {
        const id = edgeId(sys.systemId, dsId);
        addEdge({
          id,
          source: sys.systemId,
          target: dsId,
          label: 'Uses',
          c4Level: 'landscape',
          tags: ['inferred', 'shared-datastore'],
        });
      }
    }
  }

  /**
   * If the same person (by ID) appears in multiple projects,
   * create edges from that person to each system.
   */
  private inferFromSharedPersons(
    contexts: ProjectContext[],
    addEdge: (edge: DadEdge) => void
  ): void {
    const personToSystems = new Map<string, { systemId: string }[]>();

    for (const ctx of contexts) {
      const systemNode = ctx.contextFile.nodes.find(n => n.type === 'softwareSystem');
      if (!systemNode) continue;

      const persons = ctx.contextFile.nodes.filter(n => n.type === 'person');
      for (const p of persons) {
        const list = personToSystems.get(p.id) || [];
        if (!list.some(s => s.systemId === systemNode.id)) {
          list.push({ systemId: systemNode.id });
          personToSystems.set(p.id, list);
        }
      }
    }

    // Create edges from persons to all their associated systems
    for (const [personNodeId, systems] of personToSystems) {
      for (const sys of systems) {
        const id = edgeId(personNodeId, sys.systemId);
        addEdge({
          id,
          source: personNodeId,
          target: sys.systemId,
          label: 'Uses',
          c4Level: 'landscape',
          tags: ['inferred'],
        });
      }
    }
  }

  /**
   * Lift existing context-level edges to landscape level.
   * Remap source/target to point to nodes that exist in the landscape.
   */
  private liftContextEdges(
    contexts: ProjectContext[],
    addEdge: (edge: DadEdge) => void
  ): void {
    // Collect all node IDs that will exist in the landscape
    const landscapeNodeIds = new Set<string>();
    for (const ctx of contexts) {
      for (const node of ctx.contextFile.nodes) {
        if (!node.boundary) {
          landscapeNodeIds.add(node.id);
        }
      }
    }

    for (const ctx of contexts) {
      for (const edge of ctx.contextFile.edges) {
        // Only lift edges where both source and target exist in landscape
        if (landscapeNodeIds.has(edge.source) && landscapeNodeIds.has(edge.target)) {
          const liftedId = `landscape:${edge.id}`;
          addEdge({
            ...edge,
            id: liftedId,
            c4Level: 'landscape',
            tags: [...(edge.tags || []), 'lifted'],
          });
        }
      }
    }
  }
}
