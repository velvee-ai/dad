import type { ProjectSkeleton, SkeletonNode } from '@dad/shared-types';

/**
 * Prompt templates for each C4 level.
 * The LLM is asked to return a JSON array of C4AnalysisResult objects.
 */

const SYSTEM_ROLE = `You are a software architect. You analyze codebases and produce C4-model architecture descriptions.
You always respond with valid JSON. Never include markdown code fences or explanatory text—only JSON.`;

/**
 * Generates the prompt for Landscape + System Context (Level 0-1).
 * Input: the full project skeleton + any readme/workspace metadata.
 */
export function buildLandscapePrompt(
  skeleton: ProjectSkeleton,
  readmeContent?: string,
  workspaceJson?: string
): { system: string; user: string } {
  const skeletonSummary = skeleton.nodes
    .filter(n => n.c4Level === 'landscape' || n.c4Level === 'context')
    .map(n => `- ${n.id} (${n.type}): "${n.name}"${n.technology ? ` [${n.technology}]` : ''}`)
    .join('\n');

  const contextFiles = [
    readmeContent ? `## README:\n${readmeContent.substring(0, 2000)}` : '',
    workspaceJson ? `## workspace.json:\n${workspaceJson.substring(0, 1000)}` : '',
  ].filter(Boolean).join('\n\n');

  const user = `Analyze this software project at the Landscape and System Context levels.

## Detected Structure:
${skeletonSummary}

${contextFiles}

For EACH node listed above, produce a JSON object with:
- "nodeId": the node ID exactly as shown
- "designSpec": a YAML string describing the element (type, name, description, responsibilities if applicable)
- "documentation": a Markdown string (2-4 sentences) explaining what this element does
- "relationships": array of { "targetId", "label", "technology" } for how this element relates to others

Respond with a JSON array of these objects. Example:
[
  {
    "nodeId": "landscape:acme",
    "designSpec": "element:\\n  type: landscape\\n  name: Acme Corp\\n  description: All software systems",
    "documentation": "# Acme Corp\\nThe engineering organization maintains multiple software systems.",
    "relationships": []
  }
]`;

  return { system: SYSTEM_ROLE, user };
}

/**
 * Generates the prompt for Container level (Level 2).
 * Input: a single system's containers + their skeleton info.
 */
export function buildContainerPrompt(
  systemNode: SkeletonNode,
  containerNodes: SkeletonNode[],
  dockerCompose?: string
): { system: string; user: string } {
  const containerSummary = containerNodes
    .map(n => `- ${n.id} (${n.type}): "${n.name}"${n.technology ? ` [${n.technology}]` : ''}${n.sourceMapping?.filePath ? ` at ${n.sourceMapping.filePath}` : ''}`)
    .join('\n');

  const user = `Analyze the containers (deployable units) within the "${systemNode.name}" system.

## System: ${systemNode.name} (${systemNode.id})

## Detected Containers:
${containerSummary}

${dockerCompose ? `## docker-compose.yml:\n${dockerCompose.substring(0, 3000)}` : ''}

For EACH container, produce a JSON object with:
- "nodeId": the container's ID exactly as shown
- "designSpec": YAML string with element type, name, description, technology, responsibilities (list), and interfaces (name, protocol, port)
- "documentation": Markdown string (3-5 sentences) explaining what this container does, its role in the system, and key technical details
- "relationships": array of { "targetId", "label", "technology" } describing how this container communicates with others (REST, gRPC, Kafka, database connections, etc.)

Important: Infer relationships from the technology stack and container names. For example:
- An api-gateway likely routes to other services (REST/HTTPS)
- A notification-service likely consumes events (Kafka)
- Services that share a database both relate to that data store

Respond with a JSON array.`;

  return { system: SYSTEM_ROLE, user };
}

/**
 * Generates the prompt for Component level (Level 3).
 * Input: a single container's components + their source code.
 */
export function buildComponentPrompt(
  containerNode: SkeletonNode,
  componentNodes: SkeletonNode[],
  sourceSnippets: Map<string, string>
): { system: string; user: string } {
  const componentSummary = componentNodes
    .map(n => {
      const snippet = sourceSnippets.get(n.id);
      const snippetPreview = snippet ? `\n    Code preview (first 500 chars):\n    ${snippet.substring(0, 500)}` : '';
      return `- ${n.id} (${n.type}): "${n.name}"${n.sourceMapping?.filePath ? ` at ${n.sourceMapping.filePath}` : ''}${snippetPreview}`;
    })
    .join('\n');

  const user = `Analyze the internal components of the "${containerNode.name}" container.

## Container: ${containerNode.name} (${containerNode.id})
Technology: ${containerNode.technology || 'Unknown'}

## Detected Components:
${componentSummary}

For EACH component, produce a JSON object with:
- "nodeId": the component's ID exactly as shown
- "designSpec": YAML string with element type, name, description, responsibilities (list), and key methods/functions if identifiable
- "documentation": Markdown string (2-4 sentences) explaining what this component does
- "relationships": array of { "targetId", "label", "technology" } describing internal dependencies (e.g., controller calls service, service calls repository)

Respond with a JSON array.`;

  return { system: SYSTEM_ROLE, user };
}

/**
 * Generates the prompt for Code level (Level 4).
 * Input: a single component's code files with their source.
 */
export function buildCodePrompt(
  componentNode: SkeletonNode,
  codeNodes: SkeletonNode[],
  sourceCode: Map<string, string>
): { system: string; user: string } {
  const codeEntries = codeNodes
    .map(n => {
      const code = sourceCode.get(n.id) || '';
      return `### ${n.name} (${n.id})\nFile: ${n.sourceMapping?.filePath || 'unknown'}\n\`\`\`\n${code.substring(0, 2000)}\n\`\`\``;
    })
    .join('\n\n');

  const user = `Analyze the code units within the "${componentNode.name}" component.

## Component: ${componentNode.name} (${componentNode.id})

## Source Files:
${codeEntries}

For EACH code unit, produce a JSON object with:
- "nodeId": the code unit's ID exactly as shown
- "designSpec": YAML string with element type, name, description, key functions/methods, and their purposes
- "documentation": Markdown string (1-3 sentences) summarizing the file's purpose
- "relationships": array of { "targetId", "label" } for internal calls or imports between these code units

Respond with a JSON array.`;

  return { system: SYSTEM_ROLE, user };
}
