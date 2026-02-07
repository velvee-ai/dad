import type { DadFile, DadNode, DadEdge, LLMProvider } from '../types';

// Re-use DadManifest from dad-generation (imported at runtime)
// Define a minimal version here to avoid tight coupling
export interface DadManifestLite {
  version: '1.0';
  generatedAt: string;
  projectName: string;
  landscapeFile: string;
  nodeCount: number;
  edgeCount: number;
  combinedFile?: string;
  levels?: Partial<Record<string, { file: string; nodeCount: number; edgeCount: number }>>;
  totalNodes?: number;
  totalEdges?: number;
}

export interface LandscapeWorkspaceConfig {
  name: string;
  description?: string;
  systems: LandscapeSystemEntry[];
  relationships?: DeclaredRelationship[];
}

export interface LandscapeSystemEntry {
  name: string;
  path: string;          // relative from workspace root
  description?: string;
  team?: string;
}

export interface DeclaredRelationship {
  source: string;        // system name or external service name
  target: string;
  label: string;
  technology?: string;
  tags?: string[];
}

export interface LandscapeAggregatorConfig {
  workspacePath: string;
  workspaceConfig?: LandscapeWorkspaceConfig;
  llmProvider?: LLMProvider;
  onProgress?: (stage: string, message: string, percent: number) => void;
}

export interface LandscapeResult {
  landscapeFile: DadFile;
  systemSummaries: SystemSummary[];
}

export interface SystemSummary {
  name: string;
  path: string;
  nodeCount: number;
  edgeCount: number;
  containers: string[];
  externalServices: string[];
  persons: string[];
}

/** Internal type used during aggregation */
export interface ProjectContext {
  systemEntry: LandscapeSystemEntry;
  manifest: DadManifestLite;
  contextFile: DadFile;
  containerFile: DadFile | null;
}
