/**
 * useAuthorMode — State management hook for the Author Mode workflow.
 *
 * Tracks the author session state machine:
 * view → edit → coalescing → reviewing → implementing → finalized
 */

import { useState, useCallback, useRef } from 'react';
import type { DadFile, DadNode, DadEdge } from '@dad/shared-types';

export type AuthorMode = 'view' | 'edit' | 'coalescing' | 'reviewing' | 'implementing' | 'finalized';

export interface AuthorSession {
  mode: AuthorMode;
  baselineSnapshot?: string;
  agentPlan?: string;
  startedAt?: string;
}

export interface UseAuthorModeReturn {
  mode: AuthorMode;
  isEditing: boolean;
  baselineDad: DadFile | null;
  agentPlan: string | null;
  proposedNodeCount: number;
  agentPlannedNodeCount: number;

  // Actions
  enterEditMode: (currentDad: DadFile) => void;
  exitAuthorMode: () => void;
  addNode: (node: DadNode, currentDad: DadFile) => DadFile;
  addEdge: (edge: DadEdge, currentDad: DadFile) => DadFile;
  removeProposed: (nodeId: string, currentDad: DadFile) => DadFile;
  startCoalescing: () => void;
  receiveCoalesceResult: (plan: string, coalescedDad: DadFile) => DadFile;
  approve: () => void;
  reject: (currentDad: DadFile) => DadFile;
  finalize: (finalizedDad: DadFile) => DadFile;
}

let nextProposedId = 0;
export function generateProposedId(): string {
  return `proposed:${Date.now()}-${nextProposedId++}`;
}

export function useAuthorMode(): UseAuthorModeReturn {
  const [mode, setMode] = useState<AuthorMode>('view');
  const [agentPlan, setAgentPlan] = useState<string | null>(null);
  const baselineDadRef = useRef<DadFile | null>(null);
  const [proposedNodeCount, setProposedNodeCount] = useState(0);
  const [agentPlannedNodeCount, setAgentPlannedNodeCount] = useState(0);

  const updateCounts = useCallback((dad: DadFile) => {
    setProposedNodeCount(dad.nodes.filter(n => n.status === 'user-proposed').length);
    setAgentPlannedNodeCount(dad.nodes.filter(n => n.status === 'agent-planned').length);
  }, []);

  const enterEditMode = useCallback((currentDad: DadFile) => {
    baselineDadRef.current = JSON.parse(JSON.stringify(currentDad));
    setMode('edit');
    setAgentPlan(null);
    setProposedNodeCount(0);
    setAgentPlannedNodeCount(0);
  }, []);

  const exitAuthorMode = useCallback(() => {
    setMode('view');
    baselineDadRef.current = null;
    setAgentPlan(null);
    setProposedNodeCount(0);
    setAgentPlannedNodeCount(0);
  }, []);

  const addNode = useCallback((node: DadNode, currentDad: DadFile): DadFile => {
    const newNode: DadNode = {
      ...node,
      status: 'user-proposed',
    };

    // Update parent's childIds if parentId is set
    const updatedNodes = currentDad.nodes.map(n => {
      if (n.id === newNode.parentId) {
        return { ...n, childIds: [...n.childIds, newNode.id] };
      }
      return n;
    });

    const updatedDad: DadFile = {
      ...currentDad,
      nodes: [...updatedNodes, newNode],
      metadata: {
        ...currentDad.metadata,
        totalNodes: currentDad.metadata.totalNodes + 1,
      },
    };

    updateCounts(updatedDad);
    return updatedDad;
  }, [updateCounts]);

  const addEdge = useCallback((edge: DadEdge, currentDad: DadFile): DadFile => {
    const newEdge: DadEdge = {
      ...edge,
      status: 'user-proposed',
    };

    const updatedDad: DadFile = {
      ...currentDad,
      edges: [...currentDad.edges, newEdge],
      metadata: {
        ...currentDad.metadata,
        totalEdges: currentDad.metadata.totalEdges + 1,
      },
    };

    return updatedDad;
  }, []);

  const removeProposed = useCallback((nodeId: string, currentDad: DadFile): DadFile => {
    const node = currentDad.nodes.find(n => n.id === nodeId);
    if (!node || (node.status !== 'user-proposed' && node.status !== 'agent-planned')) {
      return currentDad;
    }

    const updatedNodes = currentDad.nodes
      .filter(n => n.id !== nodeId)
      .map(n => {
        if (n.id === node.parentId) {
          return { ...n, childIds: n.childIds.filter((id: string) => id !== nodeId) };
        }
        return n;
      });

    const updatedEdges = currentDad.edges.filter(
      e => e.source !== nodeId && e.target !== nodeId
    );

    const updatedDad: DadFile = {
      ...currentDad,
      nodes: updatedNodes,
      edges: updatedEdges,
      metadata: {
        ...currentDad.metadata,
        totalNodes: updatedNodes.length,
        totalEdges: updatedEdges.length,
      },
    };

    updateCounts(updatedDad);
    return updatedDad;
  }, [updateCounts]);

  const startCoalescing = useCallback(() => {
    setMode('coalescing');
  }, []);

  const receiveCoalesceResult = useCallback((plan: string, coalescedDad: DadFile): DadFile => {
    setAgentPlan(plan);
    setMode('reviewing');
    updateCounts(coalescedDad);
    return coalescedDad;
  }, [updateCounts]);

  const approve = useCallback(() => {
    setMode('implementing');
  }, []);

  const reject = useCallback((currentDad: DadFile): DadFile => {
    // Revert agent-planned nodes, keep user-proposed ones
    const updatedNodes = currentDad.nodes.filter(n => n.status !== 'agent-planned');
    const agentPlannedIds = new Set(
      currentDad.nodes.filter(n => n.status === 'agent-planned').map(n => n.id)
    );
    const updatedEdges = currentDad.edges.filter(
      e => !agentPlannedIds.has(e.source) && !agentPlannedIds.has(e.target) && e.status !== 'agent-planned'
    );

    const updatedDad: DadFile = {
      ...currentDad,
      nodes: updatedNodes,
      edges: updatedEdges,
      metadata: {
        ...currentDad.metadata,
        totalNodes: updatedNodes.length,
        totalEdges: updatedEdges.length,
      },
    };

    setMode('edit');
    setAgentPlan(null);
    updateCounts(updatedDad);
    return updatedDad;
  }, [updateCounts]);

  const finalize = useCallback((finalizedDad: DadFile): DadFile => {
    // Mark all nodes/edges as finalized
    const updatedDad: DadFile = {
      ...finalizedDad,
      nodes: finalizedDad.nodes.map(n => {
        const { status, ...rest } = n;
        return rest as DadNode;
      }),
      edges: finalizedDad.edges.map(e => {
        const { status, ...rest } = e;
        return rest as DadEdge;
      }),
    };

    setMode('finalized');
    setProposedNodeCount(0);
    setAgentPlannedNodeCount(0);
    return updatedDad;
  }, []);

  return {
    mode,
    isEditing: mode === 'edit',
    baselineDad: baselineDadRef.current,
    agentPlan,
    proposedNodeCount,
    agentPlannedNodeCount,
    enterEditMode,
    exitAuthorMode,
    addNode,
    addEdge,
    removeProposed,
    startCoalescing,
    receiveCoalesceResult,
    approve,
    reject,
    finalize,
  };
}
