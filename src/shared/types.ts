export interface FlowNode {
  id: string;
  type: 'start' | 'process' | 'decision' | 'loop' | 'call' | 'return' | 'end';
  data: {
    label: string;
    description?: string;
    codeLines?: string;
  };
  position: { x: number; y: number };
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
  };
}

export interface FlowChartData {
  nodes: FlowNode[];
  edges: FlowEdge[];
  metadata?: {
    language: string;
    complexity?: number;
    summary?: string;
  };
}

export interface ClaudeResponse {
  flowChart: FlowChartData;
  error?: string;
}