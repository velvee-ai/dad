/**
 * AuthorPromptBuilder — Builds structured LLM prompts for Author Mode operations.
 *
 * Follows the pattern of PromptBuilder in @dad/pipeline/enrichment/PromptBuilder.
 * Two prompt types:
 *   - coalesceDesign: for the design agent (evaluate + plan)
 *   - implementDesign: for the Claude Code CLI (execute plan)
 */

import type { CoalesceInput, ImplementInput } from './AgentBridge';

export class AuthorPromptBuilder {
  /**
   * Build the prompt for the design agent's coalesce phase.
   * Provides baseline architecture, proposed changes, and asks for
   * an implementation plan + updated DAD with agent-planned elements.
   */
  static coalesceDesign(input: CoalesceInput): string {
    const baselineJson = JSON.stringify(input.baselineDadFile, null, 2);
    const proposedNodesJson = JSON.stringify(input.proposedNodes, null, 2);
    const proposedEdgesJson = JSON.stringify(input.proposedEdges, null, 2);

    return `You are a senior software architect evaluating proposed architectural changes to a C4 model.

## Current Architecture (Baseline)

\`\`\`json
${baselineJson}
\`\`\`

## Proposed Changes

The engineer has proposed the following additions:

### New Nodes
\`\`\`json
${proposedNodesJson}
\`\`\`

### New Edges
\`\`\`json
${proposedEdgesJson}
\`\`\`

## Your Task

1. **Evaluate** the proposed changes for architectural fitness:
   - Do the new nodes fit the existing architecture?
   - Are the relationships (edges) correctly defined?
   - Are there any missing nodes or edges needed to complete the design?

2. **Generate an Implementation Plan** as Markdown:
   - List the files that need to be created or modified
   - Describe the implementation steps in order
   - Note any dependencies or prerequisites
   - Include any configuration changes needed

3. **Generate an Updated DAD** (JSON):
   - Include ALL existing nodes and edges from the baseline
   - Include the proposed nodes with status changed to "agent-planned"
   - Add any additional nodes/edges you recommend (also with status "agent-planned")
   - Ensure all parentId/childIds references are consistent

## Response Format

Respond with EXACTLY two sections, using these delimiters:

## Plan
[Your markdown implementation plan here]

## DAD
\`\`\`json
[The complete updated DadFile JSON here]
\`\`\`

Important:
- The DAD JSON must be valid and parseable
- Do NOT modify existing nodes (keep their original status)
- New/proposed nodes should have status: "agent-planned"
- Ensure the version field remains "1.0"
- Update metadata.totalNodes and metadata.totalEdges counts`;
  }

  /**
   * Build the prompt for the Claude Code CLI implementation phase.
   * Provides the approved plan and DAD context for code generation.
   */
  static implementDesign(input: ImplementInput): string {
    const dadJson = JSON.stringify(input.approvedDadFile, null, 2);

    return `You are implementing an approved architectural design change.

## Approved Implementation Plan

${input.agentPlan}

## Architecture Context (DAD File)

\`\`\`json
${dadJson}
\`\`\`

## Instructions

1. Follow the implementation plan above step by step
2. Create or modify the files as specified in the plan
3. Ensure all code follows existing project patterns and conventions
4. After implementing all changes, output the finalized DAD file

When you are done, output the finalized DAD JSON between these delimiters:

## FINALIZED_DAD
\`\`\`json
[The finalized DadFile JSON with all statuses cleared]
\`\`\``;
  }
}
