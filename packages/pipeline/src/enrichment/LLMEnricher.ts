import type { DadNode, DadFileSet, LLMProvider, ScanResult } from '../types';
import { PromptBuilder } from './PromptBuilder';
import { personId } from '../assembler/IdGenerator';

/**
 * Stage 5: Enriches DadFile nodes with LLM-generated descriptions and designSpecs.
 */
export class LLMEnricher {
  private promptBuilder = new PromptBuilder();

  constructor(private provider: LLMProvider) {}

  /**
   * Enrich all nodes in a DadFileSet with LLM-generated content.
   */
  async enrich(dadFileSet: DadFileSet, scanResult: ScanResult): Promise<DadFileSet> {
    const combined = dadFileSet.combined;

    // Enrich landscape node
    const landscapeNodes = combined.nodes.filter(n => n.type === 'landscape');
    for (const node of landscapeNodes) {
      await this.enrichNode(node, scanResult);
    }

    // Enrich system nodes
    const systemNodes = combined.nodes.filter(n => n.type === 'softwareSystem');
    for (const node of systemNodes) {
      await this.enrichNode(node, scanResult);
    }

    // Enrich container nodes
    const containerNodes = combined.nodes.filter(
      n => n.type === 'container' || n.type === 'dataStore'
    );
    for (const node of containerNodes) {
      await this.enrichDesignSpec(node);
    }

    // Enrich external system nodes
    const externalNodes = combined.nodes.filter(n => n.type === 'externalSystem');
    for (const node of externalNodes) {
      await this.enrichDesignSpec(node);
    }

    // Enrich component nodes
    await this.enrichComponents(combined.nodes);

    // Enrich code unit nodes
    await this.enrichCodeUnits(combined.nodes);

    // Detect and add persons (only if not already present from heuristic detection)
    await this.detectAndAddPersons(dadFileSet, scanResult);

    // Update per-level files from combined
    this.syncFromCombined(dadFileSet);

    return dadFileSet;
  }

  private async enrichNode(node: DadNode, scanResult: ScanResult): Promise<void> {
    // Generate documentation
    let prompt: string;
    if (node.type === 'landscape') {
      prompt = this.promptBuilder.landscapeDescription(node, scanResult);
    } else {
      prompt = this.promptBuilder.systemDescription(node, scanResult);
    }

    try {
      const documentation = await this.provider.analyze(prompt);
      node.documentation = documentation;
    } catch {
      // Keep existing documentation on failure
    }

    // Generate designSpec
    await this.enrichDesignSpec(node);
  }

  private async enrichDesignSpec(node: DadNode): Promise<void> {
    const prompt = this.promptBuilder.designSpec(node);
    try {
      const designSpec = await this.provider.analyze(prompt);
      node.designSpec = designSpec;
    } catch {
      // Keep existing designSpec on failure
    }
  }

  /**
   * Enrich component nodes with documentation and designSpec.
   * Groups components by container for context.
   */
  private async enrichComponents(nodes: DadNode[]): Promise<void> {
    const componentNodes = nodes.filter(n => n.type === 'component');
    if (componentNodes.length === 0) return;

    // Group by parent container for contextual enrichment
    const byContainer = new Map<string, DadNode[]>();
    for (const comp of componentNodes) {
      const key = comp.parentId || 'unknown';
      const list = byContainer.get(key) || [];
      list.push(comp);
      byContainer.set(key, list);
    }

    for (const [containerId, siblings] of byContainer) {
      for (const comp of siblings) {
        const prompt = this.promptBuilder.componentDescription(comp, siblings);
        try {
          const documentation = await this.provider.analyze(prompt);
          comp.documentation = documentation;
        } catch {
          // Keep existing documentation
        }

        await this.enrichDesignSpec(comp);
      }
    }
  }

  /**
   * Enrich code unit nodes with documentation and designSpec.
   */
  private async enrichCodeUnits(nodes: DadNode[]): Promise<void> {
    const codeNodes = nodes.filter(n => n.type === 'codeUnit');
    if (codeNodes.length === 0) return;

    for (const codeNode of codeNodes) {
      // Find parent component for context
      const parentComponent = nodes.find(n => n.id === codeNode.parentId);
      const prompt = this.promptBuilder.codeUnitDescription(codeNode, parentComponent);

      try {
        const documentation = await this.provider.analyze(prompt);
        codeNode.documentation = documentation;
      } catch {
        // Keep existing documentation
      }

      await this.enrichDesignSpec(codeNode);
    }
  }

  private async detectAndAddPersons(
    dadFileSet: DadFileSet,
    scanResult: ScanResult
  ): Promise<void> {
    const prompt = this.promptBuilder.detectActors(scanResult);
    try {
      const response = await this.provider.analyze(prompt);
      const persons = JSON.parse(response) as Array<{
        name: string;
        scope: 'internal' | 'external';
        description: string;
      }>;

      const landscapeNode = dadFileSet.combined.nodes.find(n => n.type === 'landscape');

      for (const person of persons) {
        const id = personId(person.name);

        // Skip if already exists (e.g. from heuristic detection)
        if (dadFileSet.combined.nodes.some(n => n.id === id)) continue;

        const personNode: DadNode = {
          id,
          c4Level: 'context',
          name: person.name,
          type: 'person',
          designSpec: '',
          documentation: person.description,
          parentId: landscapeNode?.id,
          childIds: [],
          scope: person.scope,
          tags: [`${person.scope}-person`],
        };

        dadFileSet.combined.nodes.push(personNode);
        if (landscapeNode) {
          landscapeNode.childIds.push(id);
        }
      }
    } catch {
      // Person detection is optional
    }
  }

  private syncFromCombined(dadFileSet: DadFileSet): void {
    const combined = dadFileSet.combined;

    dadFileSet.landscape.nodes = combined.nodes.filter(n => n.c4Level === 'landscape');
    dadFileSet.context.nodes = combined.nodes.filter(n => n.c4Level === 'context');
    dadFileSet.container.nodes = combined.nodes.filter(n => n.c4Level === 'container');
    dadFileSet.component.nodes = combined.nodes.filter(n => n.c4Level === 'component');
    dadFileSet.code.nodes = combined.nodes.filter(n => n.c4Level === 'code');

    // Update metadata counts
    for (const level of ['landscape', 'context', 'container', 'component', 'code'] as const) {
      dadFileSet[level].metadata.totalNodes = dadFileSet[level].nodes.length;
    }
  }
}
