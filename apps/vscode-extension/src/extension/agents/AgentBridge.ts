/**
 * AgentBridge — Interface for the two-phase author mode agent workflow.
 *
 * Design phase (coalesce): DAD's Claude agent evaluates proposed changes,
 *   generates an implementation plan (MD) + updated DAD with `agent-planned` nodes.
 *
 * Implementation phase (implement): Claude Code CLI executes the approved plan,
 *   writes actual code, returns finalized DAD.
 */

import type { DadFile, DadNode, DadEdge } from '@dad/shared-types';

// --- Coalesce (Design phase) ---

export interface CoalesceInput {
  /** The current DadFile with user-proposed nodes/edges. */
  currentDadFile: DadFile;
  /** The original DadFile before any author edits. */
  baselineDadFile: DadFile;
  /** Nodes added by the user (status: 'user-proposed'). */
  proposedNodes: DadNode[];
  /** Edges added by the user (status: 'user-proposed'). */
  proposedEdges: DadEdge[];
}

export interface CoalesceOutput {
  /** Markdown implementation plan from the design agent. */
  plan: string;
  /** Updated DAD with agent-planned nodes/edges. */
  dadFile: DadFile;
}

// --- Implement (Implementation phase) ---

export interface ImplementInput {
  /** The approved DadFile (with agent-planned nodes). */
  approvedDadFile: DadFile;
  /** The approved markdown plan. */
  agentPlan: string;
}

export interface ImplementOutput {
  /** Finalized DAD after code generation. */
  dadFile: DadFile;
}

// --- Agent Bridge interface ---

export interface AgentBridge {
  /** Design phase: evaluate proposed changes and return plan + updated DAD. */
  coalesce(input: CoalesceInput): Promise<CoalesceOutput>;
  /** Implementation phase: execute the approved plan and return finalized DAD. */
  implement(input: ImplementInput): Promise<ImplementOutput>;
}
