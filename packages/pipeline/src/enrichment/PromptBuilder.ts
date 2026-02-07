import type { DadNode, ScanResult } from '../types';

/**
 * Builds LLM prompts for enriching C4 model descriptions and designSpecs.
 */
export class PromptBuilder {
  /**
   * Build a prompt to generate a rich description for a landscape node.
   */
  landscapeDescription(node: DadNode, scanResult: ScanResult): string {
    const systemNames = scanResult.systems.map(s => s.name).join(', ');
    return `You are a software architect documenting a C4 model.

Generate a rich Markdown description for this landscape-level node:
- Name: ${node.name}
- Systems: ${systemNames}
- Total containers: ${scanResult.containerMeta.length}

The description should include:
1. A brief overview paragraph
2. A "Systems" section listing each system with a one-line description
3. A "Teams" section as a table if team info is available

Keep it concise (under 200 words). Use Markdown formatting.`;
  }

  /**
   * Build a prompt to generate a rich description for a software system node.
   */
  systemDescription(node: DadNode, scanResult: ScanResult): string {
    const containers = scanResult.containerMeta.filter(c => c.systemId === node.id);
    const containerList = containers.map(c => `- ${c.name} (${c.technology})`).join('\n');

    return `You are a software architect documenting a C4 model.

Generate a rich Markdown description for this software system:
- Name: ${node.name}
- Technology: ${node.technology || 'Various'}
- Containers:
${containerList}

The description should include:
1. A brief overview paragraph explaining the system's purpose
2. An "Architecture" section describing the architecture style
3. A "Key Flows" section listing 2-3 primary user flows

Keep it concise (under 200 words). Use Markdown formatting.`;
  }

  /**
   * Build a prompt to generate a designSpec YAML for a node.
   */
  designSpec(node: DadNode): string {
    return `You are a software architect. Generate a YAML designSpec for this C4 element:
- Name: ${node.name}
- Type: ${node.type}
- Technology: ${node.technology || 'Unknown'}
- Level: ${node.c4Level}

The designSpec should follow this format:
\`\`\`yaml
element:
  type: ${node.type}
  name: "${node.name}"
  description: "One line description"
  technology: "${node.technology || ''}"
  responsibilities:
    - "Responsibility 1"
    - "Responsibility 2"
\`\`\`

Return ONLY the YAML, no explanation.`;
  }

  /**
   * Build a prompt to generate a description for a component node.
   * Uses sibling components for architectural context.
   */
  componentDescription(node: DadNode, siblings: DadNode[]): string {
    const siblingList = siblings
      .filter(s => s.id !== node.id)
      .map(s => `- ${s.name} (${s.tags?.join(', ') || 'unknown role'})`)
      .join('\n');

    return `You are a software architect documenting a C4 model.

Generate a concise Markdown description for this component:
- Name: ${node.name}
- Role: ${node.tags?.join(', ') || 'unknown'}
- Technology: ${node.technology || 'Unknown'}
- Parent container: ${node.parentId || 'unknown'}

Sibling components in the same container:
${siblingList || '(none)'}

The description should include:
1. A brief paragraph explaining the component's purpose
2. Its key responsibilities (2-3 bullet points)

Keep it concise (under 100 words). Use Markdown formatting.`;
  }

  /**
   * Build a prompt to generate a description for a code unit node.
   * Uses parent component context.
   */
  codeUnitDescription(node: DadNode, parentComponent?: DadNode): string {
    const parentInfo = parentComponent
      ? `- Parent component: ${parentComponent.name} (${parentComponent.tags?.join(', ') || 'unknown role'})`
      : '- Parent component: unknown';

    return `You are a software architect documenting a C4 model.

Generate a concise Markdown description for this code unit:
- Name: ${node.name}
- Kind: ${node.codeUnitKind || 'unknown'}
- Technology: ${node.technology || 'Unknown'}
${parentInfo}
${node.sourceMapping ? `- File: ${node.sourceMapping.filePath} (lines ${node.sourceMapping.startLine}-${node.sourceMapping.endLine})` : ''}

The description should include:
1. A brief sentence explaining what this code unit does
2. Its signature or interface (if applicable)
3. Any notable behavior or side effects

Keep it concise (under 80 words). Use Markdown formatting.`;
  }

  /**
   * Build a prompt to detect actors who interact with the system.
   */
  detectActors(scanResult: ScanResult): string {
    const systemNames = scanResult.systems.map(s => s.name).join(', ');
    const containerNames = scanResult.containerMeta.map(c => c.name).join(', ');

    return `You are a software architect analyzing a system to identify actors.

Systems: ${systemNames}
Containers: ${containerNames}

Identify the actors (users/personas) who interact with this system.
For each actor provide:
1. name: Display name (e.g., "Customer", "Admin")
2. scope: "internal" or "external"
3. description: One sentence describing this actor

Return as JSON array:
[{"name": "...", "scope": "...", "description": "..."}]

Return ONLY the JSON, no explanation.`;
  }

  /**
   * Build a prompt to refine edge labels.
   */
  refineEdgeLabel(source: string, target: string, technology: string): string {
    return `You are a software architect. Generate a concise, descriptive label for an edge in a C4 diagram.

Source: ${source}
Target: ${target}
Technology: ${technology}

The label should describe what the source does with the target (e.g., "Routes auth requests to", "Reads/writes user data").
Return ONLY the label text, no quotes or explanation.`;
  }
}
