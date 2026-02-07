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
