// Node Types
export type NodeType = 'start' | 'process' | 'decision' | 'loop' | 'call' | 'return' | 'end';

export interface Position {
  x: number;
  y: number;
}

export interface DiagramNode {
  id: string;
  type: NodeType;
  label: string;
  description?: string;
  codeLines?: string;
  position?: Position;
}

// Edge Types
export type EdgeType = 'default' | 'conditional' | 'loop' | 'error';

export interface DiagramEdge {
  id: string;
  source: string;
  target: string;
  label?: string;
  type?: EdgeType;
  condition?: string;
}

// Diagram Types
export interface DiagramMetadata {
  language: string;
  complexity?: number;
  summary?: string;
  filename?: string;
  timestamp?: string;
}

export interface Diagram {
  nodes: DiagramNode[];
  edges: DiagramEdge[];
  metadata?: DiagramMetadata;
}

// API Request/Response Types
export interface AnalyzeOptions {
  includeComments?: boolean;
  maxDepth?: number;
  includeTests?: boolean;
}

export interface AnalyzeRequest {
  code: string;
  language: string;
  filename?: string;
  options?: AnalyzeOptions;
}

export interface AnalyzeResponse {
  diagram: Diagram;
  success: boolean;
  error?: string;
}

// Export Types
export type ExportFormat = 'd2' | 'mermaid' | 'json' | 'svg' | 'png';

export interface ExportRequest {
  diagram: Diagram;
  format: ExportFormat;
  options?: {
    theme?: string;
    layout?: string;
  };
}

export interface ExportResponse {
  content: string;
  format: ExportFormat;
  success: boolean;
  error?: string;
}

// Storage Types
export interface SavedDiagram {
  id: string;
  diagram: Diagram;
  code: string;
  timestamp: number;
  filename?: string;
}

// AI Provider Types
export interface AIProviderConfig {
  provider: 'claude' | 'openrouter';
  apiKey?: string;
  model?: string;
}

export interface AIAnalyzeRequest {
  code: string;
  language: string;
  config: AIProviderConfig;
}

export interface AIAnalyzeResponse {
  diagram: Diagram;
  tokensUsed?: number;
  model?: string;
}
