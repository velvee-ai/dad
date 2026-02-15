// ============================================================
// Re-exported C4 types (from @dad/shared-types/src/c4.ts)
// These are defined here because shared-types doesn't expose c4.ts
// via package exports. Keep in sync with the source.
// ============================================================

export type C4Level = 'landscape' | 'context' | 'container' | 'component' | 'code';

export type DadNodeType =
  | 'landscape'
  | 'group'
  | 'softwareSystem'
  | 'person'
  | 'externalSystem'
  | 'container'
  | 'dataStore'
  | 'component'
  | 'codeUnit';

export type PersonScope = 'internal' | 'external';
export type ContainerSubtype = 'server-side-application' | 'single-page-application' | 'mobile-application' | 'directory' | 'blob-store' | 'relational-database' | 'message-queue' | (string & {});
export type CodeUnitKind = 'interface' | 'class' | 'abstract-class' | 'type' | 'enum' | 'function' | 'method';
export type EdgeDirection = 'forward' | 'backward' | 'bidirectional' | 'none';

export type DadElementStatus = 'existing' | 'user-proposed' | 'agent-planned' | 'finalized';

export interface AuthorSession {
  mode: 'view' | 'edit' | 'coalescing' | 'reviewing' | 'implementing' | 'finalized';
  baselineSnapshot?: string;
  agentPlan?: string;
  startedAt?: string;
}

export interface SourceMapping {
  filePath: string;
  startLine?: number;
  endLine?: number;
  language?: string;
}

export interface DadNode {
  id: string;
  c4Level: C4Level;
  name: string;
  type: DadNodeType;
  designSpec: string;
  documentation: string;
  sourceMapping?: SourceMapping;
  parentId?: string | null;
  childIds: string[];
  position?: { x: number; y: number };
  collapsed?: boolean;
  technology?: string;
  tags?: string[];
  scope?: PersonScope;
  containerSubtype?: ContainerSubtype;
  codeUnitKind?: CodeUnitKind;
  status?: DadElementStatus;
  boundary?: boolean;            // true = reference copy from another level
  contextFilePath?: string;      // Relative path to this system's context .dad.json
}

export interface DadEdge {
  id: string;
  source: string;
  target: string;
  label: string;
  technology?: string;
  c4Level: C4Level;
  tags?: string[];
  direction?: EdgeDirection;
  strength?: string;
  multiplicity?: string;
  status?: DadElementStatus;
}

export interface DadFileMetadata {
  projectName: string;
  generatedAt: string;
  generatedBy: string;
  sourceCommit?: string;
  totalNodes: number;
  totalEdges: number;
}

// ============================================================
// Views & Styles Types
// ============================================================

export interface ViewConfig {
  key: string;
  title: string;
  scopeId: string;
  include: string[];
  autoLayout: { direction: 'tb' | 'lr'; rankSeparation?: number; nodeSeparation?: number };
}

export interface DadViews {
  systemLandscape?: ViewConfig;
  systemContext?: ViewConfig[];
  container?: ViewConfig[];
  component?: ViewConfig[];
}

export interface StyleRule { tag: string; [key: string]: unknown; }

export interface DadStyles {
  elements: StyleRule[];
  relationships: StyleRule[];
}

export interface DadFile {
  version: '1.0';
  metadata: DadFileMetadata;
  nodes: DadNode[];
  edges: DadEdge[];
  views?: DadViews;
  styles?: DadStyles;
  authorSession?: AuthorSession;
}

export type DetectedBy = 'filesystem' | 'package-json' | 'dockerfile' | 'docker-compose' | 'directory-pattern' | 'source-file';

// ============================================================
// Scanner Output Types (Stage 1)
// ============================================================

export interface ScanResult {
  projectName: string;
  rootPath: string;
  systems: SystemMeta[];
  containerMeta: ContainerMeta[];
  dataStores: DataStoreMeta[];
  externalServices: ExternalServiceMeta[];
  profileRelationships?: ProfileRelationship[];  // from LLM profile
  profileActors?: ProfileActor[];                // from LLM profile
}

export interface ProfileRelationship {
  source: string;
  target: string;
  label: string;
  technology: string;
  tags: string[];
}

export interface ProfileActor {
  name: string;
  scope: 'internal' | 'external';
  description: string;
}

export interface SystemMeta {
  id: string;
  name: string;
  path: string;
  team?: string;
  containerIds: string[];
  dataStoreIds: string[];
}

export interface ContainerMeta {
  id: string;
  name: string;
  path: string; // Relative from root
  systemId: string;
  detectedBy: DetectedBy;
  technology: string; // "TypeScript/Express"
  packageJson?: {
    name: string;
    dependencies: Record<string, string>;
    devDependencies: Record<string, string>;
    scripts: Record<string, string>;
  };
  dockerfile?: boolean;
  sourceFiles: string[]; // All source files in this container
  envVars: Record<string, string>; // From docker-compose environment
}

export interface DataStoreMeta {
  id: string;
  name: string;
  image: string; // Docker image name
  technology: string; // "PostgreSQL 15", "Redis 7"
  systemId: string;
  detectedBy: DetectedBy;
}

export interface ExternalServiceMeta {
  id: string;
  name: string; // "Stripe", "SendGrid"
  technology: string; // "REST API"
  detectedByPackage?: string; // npm package name
  detectedByEnvVar?: string; // env var name
}

// ============================================================
// Analyzer Output Types (Stage 2)
// ============================================================

export interface AnalyzedFile {
  filePath: string;
  language: string;
  containerId: string;
  symbols: AnalyzedSymbol[];
  imports: ImportReference[];
}

export interface AnalyzedSymbol {
  name: string;
  kind: CodeUnitKind;
  exportType: 'default' | 'named' | 'none';
  startLine: number;
  endLine: number;
  docComment?: string;
  members?: AnalyzedSymbol[];
  baseClass?: string;
  implementedInterfaces?: string[];
}

export interface ImportReference {
  source: string; // './services/userService' or 'express'
  specifiers: string[]; // ['UserService', 'default']
  isExternal: boolean; // node_modules vs local
  resolvedPath?: string; // Resolved local path
}

// ============================================================
// Grouper Output Types (Stage 3)
// ============================================================

export type ComponentRole =
  | 'controller'
  | 'service'
  | 'repository'
  | 'middleware'
  | 'handler'
  | 'model'
  | 'utility'
  | 'route'
  | 'event';

export interface ComponentGroup {
  id: string; // "component:user-controller"
  name: string;
  containerId: string;
  codeUnitIds: string[];
  sourceFiles: string[];
  technology: string;
  role: ComponentRole;
}

// ============================================================
// Pipeline Output Types (Stage 4)
// ============================================================

export interface DadFileSet {
  code: DadFile;
  component: DadFile;
  container: DadFile;
  context: DadFile;
  combined: DadFile;
}

// ============================================================
// Language Service Adapter Types (Stage 2)
// ============================================================

export interface LSPPosition {
  line: number;
  character: number;
}

export interface LSPRange {
  start: LSPPosition;
  end: LSPPosition;
}

export interface LSPLocation {
  uri: string;
  range: LSPRange;
}

export type SymbolKind =
  | 'file'
  | 'module'
  | 'namespace'
  | 'package'
  | 'class'
  | 'method'
  | 'property'
  | 'field'
  | 'constructor'
  | 'enum'
  | 'interface'
  | 'function'
  | 'variable'
  | 'constant'
  | 'string'
  | 'number'
  | 'boolean'
  | 'array'
  | 'object'
  | 'key'
  | 'null'
  | 'enumMember'
  | 'struct'
  | 'event'
  | 'operator'
  | 'typeParameter';

export interface DocumentSymbol {
  name: string;
  kind: SymbolKind;
  range: LSPRange;
  selectionRange: LSPRange;
  children?: DocumentSymbol[];
  detail?: string;
}

export interface CallHierarchyItem {
  name: string;
  kind: SymbolKind;
  uri: string;
  range: LSPRange;
  selectionRange: LSPRange;
  detail?: string;
}

export interface CallHierarchyOutgoingCall {
  to: CallHierarchyItem;
  fromRanges: LSPRange[];
}

export interface CallHierarchyIncomingCall {
  from: CallHierarchyItem;
  fromRanges: LSPRange[];
}

export interface HoverResult {
  contents: string;
  range?: LSPRange;
}

/**
 * Interface that the VS Code extension implements to inject language service capabilities.
 * Same protocol for vtsls (TypeScript) and Pyrefly (Python).
 */
export interface LanguageServiceAdapter {
  getDocumentSymbols(uri: string): Promise<DocumentSymbol[]>;
  prepareCallHierarchy(uri: string, position: LSPPosition): Promise<CallHierarchyItem[]>;
  getOutgoingCalls(item: CallHierarchyItem): Promise<CallHierarchyOutgoingCall[]>;
  getIncomingCalls(item: CallHierarchyItem): Promise<CallHierarchyIncomingCall[]>;
  getDefinition(uri: string, position: LSPPosition): Promise<LSPLocation[]>;
  getReferences(uri: string, position: LSPPosition): Promise<LSPLocation[]>;
  getHover(uri: string, position: LSPPosition): Promise<HoverResult | null>;
}

// ============================================================
// LLM Enrichment Types (Stage 5)
// ============================================================

export interface LLMProvider {
  analyze(prompt: string): Promise<string>;
}

export interface EnrichmentResult {
  nodeId: string;
  description?: string;
  designSpec?: string;
}

// ============================================================
// Pipeline Configuration
// ============================================================

export interface PipelineConfig {
  rootPath: string;
  projectName?: string;
  languageServiceAdapter?: LanguageServiceAdapter;
  llmProvider?: LLMProvider;
  /** Progress callback */
  onProgress?: (stage: string, message: string, percent: number) => void;
}
