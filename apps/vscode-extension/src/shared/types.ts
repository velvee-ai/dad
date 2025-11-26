export interface FlowNode {
  id: string;
  type: 'start' | 'process' | 'decision' | 'loop' | 'call' | 'return' | 'end' | 'file' | 'function' | 'code';
  data: {
    label: string;
    description?: string;
    codeLines?: string;
    type?: 'file' | 'function' | 'code';
    collapsed?: boolean;
    childCount?: number;
    onToggleCollapse?: () => void;
    nodeType?: 'start' | 'process' | 'decision' | 'loop' | 'call' | 'return' | 'end' | 'file' | 'function' | 'code';
  };
  position: { x: number; y: number };
  parentId?: string;
  extent?: 'parent' | string;
  hidden?: boolean;
}

export interface FlowEdge {
  id: string;
  source: string;
  target: string;
  label?: string;
  type?: 'default' | 'conditional' | 'loop' | 'error';
  animated?: boolean;
  data?: {
    condition?: string;
    isCrossCall?: boolean;
  };
  hidden?: boolean;
}

export interface FlowChartData {
  nodes: FlowNode[];
  edges: FlowEdge[];
  metadata?: {
    language?: string;
    complexity?: number;
    summary?: string;
    isHierarchical?: boolean;
    levels?: {
      files: string[];
      functions: Map<string, string[]>;
    };
  };
}

export interface ClaudeResponse {
  flowChart: FlowChartData;
  error?: string;
}

// Preview Session Types
export interface ChangedFile {
  path: string;
  status: 'added' | 'modified' | 'deleted';
  diagram: FlowChartData;
  baseDiagram?: FlowChartData;
}

export interface PreviewSession {
  id: string;
  url: string;
  expiresAt: number;
  changedFiles: ChangedFile[];
  baseBranch: string;
  createdAt: number;
}