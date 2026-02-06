/**
 * C4 Architecture Visualizer — Design Tokens
 *
 * Structurizr-standard color palette:
 *   Internal elements: Blue gradient (dark→light per level)
 *   External elements: Grey gradient
 *   Person: Darkest blue
 *   DataStore: Container-level blue
 */

// --- Color Palette ---

export interface NodeColorSet {
  bg: string;
  bgLight: string;
  border: string;
  text: string;
  accent: string;
}

const INTERNAL_COLORS: Record<string, NodeColorSet> = {
  landscape: { bg: '#08427B', bgLight: '#0B5394', border: '#063562', text: '#FFFFFF', accent: '#1168BD' },
  context:   { bg: '#1168BD', bgLight: '#2B7CD0', border: '#0D5293', text: '#FFFFFF', accent: '#438DD5' },
  container: { bg: '#438DD5', bgLight: '#5AA0E0', border: '#2E73B8', text: '#FFFFFF', accent: '#85BBF0' },
  component: { bg: '#85BBF0', bgLight: '#A0CFF5', border: '#6BA3D9', text: '#1A1A1A', accent: '#438DD5' },
  code:      { bg: '#B8D9F8', bgLight: '#CCE5FB', border: '#9BC4ED', text: '#1A1A1A', accent: '#85BBF0' },
};

const EXTERNAL_COLORS: Record<string, NodeColorSet> = {
  landscape: { bg: '#555555', bgLight: '#666666', border: '#444444', text: '#FFFFFF', accent: '#777777' },
  context:   { bg: '#777777', bgLight: '#888888', border: '#666666', text: '#FFFFFF', accent: '#999999' },
  container: { bg: '#999999', bgLight: '#AAAAAA', border: '#808080', text: '#1A1A1A', accent: '#BBBBBB' },
  component: { bg: '#BBBBBB', bgLight: '#CCCCCC', border: '#AAAAAA', text: '#1A1A1A', accent: '#999999' },
  code:      { bg: '#DDDDDD', bgLight: '#EEEEEE', border: '#CCCCCC', text: '#1A1A1A', accent: '#BBBBBB' },
};

const SPECIAL_COLORS = {
  person:    { bg: '#08427B', bgLight: '#0B5394', border: '#063562', text: '#FFFFFF', accent: '#1168BD' },
  dataStore: { bg: '#438DD5', bgLight: '#5AA0E0', border: '#2E73B8', text: '#FFFFFF', accent: '#85BBF0' },
};

export function getNodeColors(c4Level: string, c4Type?: string, isExternal?: boolean): NodeColorSet {
  if (c4Type === 'person') return SPECIAL_COLORS.person;
  if (c4Type === 'dataStore') return SPECIAL_COLORS.dataStore;
  if (isExternal || c4Type === 'externalSystem') {
    return EXTERNAL_COLORS[c4Level] || EXTERNAL_COLORS.context;
  }
  return INTERNAL_COLORS[c4Level] || INTERNAL_COLORS.context;
}

// --- Node Sizes ---

export interface NodeSize {
  width: number;
  height: number;
  collapsedWidth: number;
  collapsedHeight: number;
}

export const C4_NODE_SIZES: Record<string, NodeSize> = {
  landscape: { width: 380, height: 180, collapsedWidth: 200, collapsedHeight: 55 },
  context:   { width: 300, height: 150, collapsedWidth: 180, collapsedHeight: 50 },
  container: { width: 260, height: 130, collapsedWidth: 160, collapsedHeight: 45 },
  component: { width: 220, height: 100, collapsedWidth: 140, collapsedHeight: 40 },
  code:      { width: 180, height: 70,  collapsedWidth: 130, collapsedHeight: 35 },
};

export function getNodeSize(c4Level: string, collapsed?: boolean): { width: number; height: number } {
  const sizes = C4_NODE_SIZES[c4Level] || C4_NODE_SIZES.context;
  if (collapsed) return { width: sizes.collapsedWidth, height: sizes.collapsedHeight };
  return { width: sizes.width, height: sizes.height };
}

// --- Font Sizes ---

export interface FontSizes {
  title: number;
  subtitle: number;
  body: number;
}

export const C4_FONTS: Record<string, FontSizes> = {
  landscape: { title: 17, subtitle: 12, body: 11 },
  context:   { title: 15, subtitle: 11, body: 10 },
  container: { title: 13, subtitle: 10, body: 9 },
  component: { title: 12, subtitle: 10, body: 9 },
  code:      { title: 11, subtitle: 9,  body: 8 },
};

export function getFontSizes(c4Level: string): FontSizes {
  return C4_FONTS[c4Level] || C4_FONTS.context;
}

// --- Border Radius ---

export function getBorderRadius(c4Type?: string): string {
  switch (c4Type) {
    case 'person': return '50%';
    case 'dataStore': return '4px 4px 20px 20px';
    default: return '10px';
  }
}

// --- Shadows ---

export const C4_SHADOWS: Record<string, string> = {
  landscape: '0 4px 16px rgba(8, 66, 123, 0.35)',
  context:   '0 3px 12px rgba(17, 104, 189, 0.30)',
  container: '0 2px 10px rgba(67, 141, 213, 0.25)',
  component: '0 2px 8px rgba(133, 187, 240, 0.20)',
  code:      '0 1px 6px rgba(184, 217, 248, 0.15)',
  hover:     '0 6px 24px rgba(17, 104, 189, 0.45)',
  boundary:  '0 1px 4px rgba(0, 0, 0, 0.08)',
};

export function getNodeShadow(c4Level: string): string {
  return C4_SHADOWS[c4Level] || C4_SHADOWS.context;
}

// --- Edge Styles ---

export interface EdgeStyleTokens {
  strokeDasharray: string;
  strokeWidth: number;
  color: string;
  animated?: boolean;
}

export const C4_EDGE_STYLES = {
  sync:     { strokeDasharray: 'none',  strokeWidth: 2,   color: '#555555', animated: false },
  async:    { strokeDasharray: '8,4',   strokeWidth: 2,   color: '#E67E22', animated: true },
  event:    { strokeDasharray: '5,5',   strokeWidth: 1.5, color: '#9B59B6', animated: true },
  data:     { strokeDasharray: 'none',  strokeWidth: 2,   color: '#3498DB', animated: false },
  external: { strokeDasharray: '4,4',   strokeWidth: 1.5, color: '#7F8C8D', animated: false },
} as const;

export function getEdgeStyle(technology?: string, tags?: string[]): EdgeStyleTokens {
  const tech = (technology || '').toLowerCase();
  const tagSet = new Set((tags || []).map(t => t.toLowerCase()));

  if (tagSet.has('async') || tagSet.has('event-driven')) return C4_EDGE_STYLES.async;
  if (tagSet.has('external')) return C4_EDGE_STYLES.external;
  if (tagSet.has('data') || tagSet.has('cache')) return C4_EDGE_STYLES.data;

  if (tech.includes('kafka') || tech.includes('rabbitmq') || tech.includes('sqs') ||
      tech.includes('amqp') || tech.includes('event') || tech.includes('pub/sub') ||
      tech.includes('nats')) {
    return C4_EDGE_STYLES.async;
  }
  if (tech.includes('websocket') || tech.includes('sse')) return C4_EDGE_STYLES.async;
  if (tech.includes('redis') || tech.includes('postgres') || tech.includes('mysql') ||
      tech.includes('mongo')) {
    return C4_EDGE_STYLES.data;
  }

  return C4_EDGE_STYLES.sync;
}

// --- Animation Tokens ---

export const C4_ANIMATIONS = {
  drillDown:  { duration: 350, easing: 'cubic-bezier(0.4, 0, 0.2, 1)' },
  drillUp:    { duration: 300, easing: 'cubic-bezier(0.4, 0, 0.2, 1)' },
  nodeHover:  { duration: 150, easing: 'ease-out' },
  edgePulse:  { duration: 2000, easing: 'ease-in-out' },
  fadeIn:     { duration: 200, easing: 'ease-out' },
} as const;

// --- Layout Tokens ---

export const C4_LAYOUT = {
  nodeSpacing: 60,
  rankSpacing: 80,
  boundaryPadding: 40,
  boundaryLabelHeight: 28,
  fitViewPadding: 0.15,
} as const;

// --- Boundary Box ---

export const C4_BOUNDARY = {
  borderColor: 'rgba(17, 104, 189, 0.3)',
  borderWidth: 2,
  borderDash: '6,4',
  backgroundColor: 'rgba(17, 104, 189, 0.04)',
  labelColor: 'rgba(17, 104, 189, 0.6)',
  labelFontSize: 11,
  cornerRadius: 8,
} as const;
