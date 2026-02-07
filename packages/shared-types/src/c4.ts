// ============================================================
// DAD (Diagram as a Delivery) - C4 Type System
// Extended 5-Level C4 Model: Landscape > Context > Container > Component > Code
// ============================================================

// --- C4 Levels ---

export type C4Level = 'landscape' | 'context' | 'container' | 'component' | 'code';

// --- Node Types ---

export type DadNodeType =
  | 'landscape'        // Level 0: Org/workspace ecosystem
  | 'group'            // Any level: Visual grouping boundary
  | 'softwareSystem'   // Level 1: A complete software system
  | 'person'           // Level 1: A user/actor/persona
  | 'externalSystem'   // Level 1: External dependency (Stripe, SendGrid, etc.)
  | 'container'        // Level 2: Deployable service/app
  | 'dataStore'        // Level 2: Database, cache, message queue
  | 'component'        // Level 3: Module, controller, service class
  | 'codeUnit';        // Level 4: Function, method, class

// --- Person Scope ---

export type PersonScope = 'internal' | 'external';

// --- Container Subtypes ---

export type ContainerSubtype =
  | 'server-side-application'
  | 'single-page-application'
  | 'mobile-application'
  | 'directory'
  | 'blob-store'
  | 'relational-database'
  | 'message-queue'
  | (string & {});         // Allow custom values while preserving autocomplete

// --- Code Unit Kinds ---

export type CodeUnitKind =
  | 'interface'
  | 'class'
  | 'abstract-class'
  | 'type'
  | 'enum'
  | 'function'
  | 'method';

// --- Element Status (Author Mode) ---

export type DadElementStatus = 'existing' | 'user-proposed' | 'agent-planned' | 'finalized';

// --- Author Session ---

export interface AuthorSession {
  mode: 'view' | 'edit' | 'coalescing' | 'reviewing' | 'implementing' | 'finalized';
  baselineSnapshot?: string;   // JSON of original DadFile before edits
  agentPlan?: string;          // Markdown plan from the design agent
  startedAt?: string;          // ISO 8601
}

// --- Edge Direction ---

export type EdgeDirection = 'forward' | 'backward' | 'bidirectional' | 'none';

// --- Source Mapping ---

export interface SourceMapping {
  filePath: string;       // Relative path from workspace root
  startLine?: number;     // First line of this entity in source
  endLine?: number;       // Last line
  language?: string;      // "typescript", "python", "go", etc.
}

// --- Node ---

export interface DadNode {
  id: string;                    // Namespaced ID: "landscape:acme", "container:api-gateway"
  c4Level: C4Level;              // Which hierarchy level
  name: string;                  // Display name
  type: DadNodeType;             // Element type

  // Embedded per-node content (hybrid format)
  designSpec: string;            // YAML string: C4-inspired design language
  documentation: string;         // Markdown string: human-readable description

  // Source code mapping (enables code-first round-tripping)
  sourceMapping?: SourceMapping;

  // Hierarchy
  parentId?: string | null;      // Parent node ID (null for landscape root)
  childIds: string[];            // Direct children IDs

  // Visual metadata
  position?: { x: number; y: number };
  collapsed?: boolean;

  // Classification
  technology?: string;           // e.g., "TypeScript/Express", "Python/FastAPI"
  tags?: string[];               // For styling: ["critical", "external", "database"]

  // Author mode status
  status?: DadElementStatus;     // 'existing' | 'user-proposed' | 'agent-planned' | 'finalized'

  // Person-specific fields (when type === 'person')
  scope?: PersonScope;           // 'internal' (bank staff) or 'external' (customer)

  // Container-specific fields (when type === 'container' | 'dataStore')
  containerSubtype?: ContainerSubtype;

  // Code-specific fields (when type === 'codeUnit')
  codeUnitKind?: CodeUnitKind;   // 'interface', 'class', 'abstract-class', 'type', etc.

  // Multi-file per-level fields
  boundary?: boolean;            // true = reference copy from another level
}

// --- Edge ---

export interface DadEdge {
  id: string;                    // Unique edge ID
  source: string;                // Source node ID
  target: string;                // Target node ID
  label: string;                 // Relationship description: "Makes API calls to"
  technology?: string;           // Protocol/tech: "REST/HTTPS", "gRPC", "Kafka events"
  c4Level: C4Level;              // Level at which this relationship exists
  tags?: string[];               // For styling: ["async", "critical-path"]
  direction?: EdgeDirection;     // Arrow direction: 'forward', 'backward', 'bidirectional', 'none'
  strength?: string;             // Relationship strength: "full", "partial", "strong", "medium", etc.
  multiplicity?: string;         // Cardinality: "1", "1..*", "0..1", "1..20", etc.
  status?: DadElementStatus;     // Author mode: 'existing' | 'user-proposed' | 'agent-planned' | 'finalized'
}

// --- File Metadata ---

export interface DadFileMetadata {
  projectName: string;           // "Acme Corp Engineering"
  generatedAt: string;           // ISO 8601 timestamp
  generatedBy: string;           // "dad-vscode/0.0.1"
  sourceCommit?: string;         // Git commit hash at generation time
  totalNodes: number;
  totalEdges: number;
}

// --- Views ---

export interface DadView {
  key: string;                // Unique view key
  title: string;
  description?: string;
  scopeId: string;            // Node ID this view is scoped to
  include: string[];          // Node IDs or "*" for all children
  exclude?: string[];         // Node IDs to hide
  autoLayout: {
    direction: 'tb' | 'lr' | 'bt' | 'rl';
    rankSeparation?: number;
    nodeSeparation?: number;
  };
}

export interface DadViews {
  systemLandscape: DadView;
  systemContext: DadView[];   // One per softwareSystem
  container: DadView[];       // One per softwareSystem
  component: DadView[];       // One per container
}

// --- Styles ---

export type DadElementShape =
  | 'Box' | 'RoundedBox' | 'Person' | 'Cylinder'
  | 'Pipe' | 'WebBrowser' | 'Hexagon' | 'Component' | 'Folder';

export interface DadElementStyle {
  tag: string;                // Matches node type or tag
  shape?: DadElementShape;
  background?: string;        // Hex color
  color?: string;             // Text color
  stroke?: string;            // Border color
  strokeWidth?: number;
  border?: 'solid' | 'dashed' | 'dotted';
  fontSize?: number;
  opacity?: number;           // 0-100
  icon?: string;              // Technology icon filename
  width?: number;
  height?: number;
}

export interface DadRelationshipStyle {
  tag: string;                // "sync", "async", "data", "external"
  color?: string;
  dashed?: boolean;
  strokeWidth?: number;
  opacity?: number;
}

export interface DadStyles {
  elements: DadElementStyle[];
  relationships: DadRelationshipStyle[];
}

// --- Top-Level File ---

export interface DadFile {
  version: '1.0';
  metadata: DadFileMetadata;
  nodes: DadNode[];
  edges: DadEdge[];
  views?: DadViews;
  styles?: DadStyles;
  authorSession?: AuthorSession;
}

// --- Helper Types ---

/** Maps C4 level to the node types valid at that level */
export const C4_LEVEL_NODE_TYPES: Record<C4Level, DadNodeType[]> = {
  landscape: ['landscape', 'group'],
  context: ['softwareSystem', 'person', 'externalSystem', 'group'],
  container: ['container', 'dataStore', 'group'],
  component: ['component', 'group'],
  code: ['codeUnit', 'group'],
};

/** Maps node type back to its C4 level (groups default to landscape; actual level set via c4Level field) */
export const NODE_TYPE_TO_LEVEL: Record<DadNodeType, C4Level> = {
  landscape: 'landscape',
  group: 'landscape',
  softwareSystem: 'context',
  person: 'context',
  externalSystem: 'context',
  container: 'container',
  dataStore: 'container',
  component: 'component',
  codeUnit: 'code',
};

/** C4 level ordering (0 = landscape, 4 = code) */
export const C4_LEVEL_ORDER: Record<C4Level, number> = {
  landscape: 0,
  context: 1,
  container: 2,
  component: 3,
  code: 4,
};

// --- Generation Pipeline Types ---

/** Structural skeleton produced by ProjectScanner (before LLM analysis) */
export interface ProjectSkeleton {
  rootPath: string;
  nodes: SkeletonNode[];
}

export interface SkeletonNode {
  id: string;
  name: string;
  type: DadNodeType;
  c4Level: C4Level;
  parentId?: string | null;
  childIds: string[];
  sourceMapping?: SourceMapping;
  technology?: string;
  /** Detection method: how we identified this entity */
  detectedBy: 'filesystem' | 'package-json' | 'dockerfile' | 'docker-compose' | 'directory-pattern' | 'source-file';
}

/** Result from a single LLM analysis pass */
export interface C4AnalysisResult {
  nodeId: string;
  designSpec: string;            // YAML
  documentation: string;         // Markdown
  relationships: Array<{
    targetId: string;
    label: string;
    technology?: string;
  }>;
}
