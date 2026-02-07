/**
 * C4 Adapter — Translates DAD file data into fully-resolved visual model
 *
 * Pure function: no React, no side effects.
 * Input: DadFile nodes/edges + optional theme
 * Output: ReactFlow nodes/edges with VisualNodeData/VisualEdgeData
 */

import type { Node, Edge } from 'reactflow';
import { MarkerType } from 'reactflow';
import type { VisualNodeData, VisualNodeStyle, VisualEdgeData, VisualEdgeStyle } from './c4VisualModel';
import type { C4Theme } from '../theme/c4ThemeTypes';
import { ICICLE_THEME } from '../theme/icicleTheme';

// --- Public API ---

export function translateDadToVisual(
  dadFile: { nodes: any[]; edges: any[] },
  theme: C4Theme = ICICLE_THEME
): {
  nodes: Node<VisualNodeData>[];
  edges: Edge<VisualEdgeData>[];
} {
  const nodes = dadFile.nodes.map((node: any) =>
    translateNode(node, theme)
  );

  const edges = dadFile.edges.map((edge: any) =>
    translateEdge(edge, theme)
  );

  return { nodes, edges };
}

// --- Node Translation ---

function translateNode(node: any, theme: C4Theme): Node<VisualNodeData> {
  const nodeType = node.type || 'container';
  const c4Level = node.c4Level || 'context';
  const variant = theme.nodeVariants[nodeType] || theme.nodeVariants.container;
  const fonts = theme.fontSizes[c4Level] || theme.fontSizes.context;
  const collapsed = node.collapsed || false;

  const width = collapsed ? variant.collapsedWidth : variant.width;
  const height = collapsed ? variant.collapsedHeight : variant.height;

  const fontFamily = variant.fontFamily === 'mono'
    ? theme.monoFontFamily
    : theme.fontFamily;

  const style = resolveNodeStyle(variant, theme, fonts, width, height, fontFamily);

  const data: VisualNodeData = {
    dadNodeId: node.id,
    label: node.name || node.id,
    c4Level,
    c4Type: nodeType,
    technology: node.technology || undefined,
    description: node.documentation?.substring(0, 150) || undefined,
    tags: node.tags || [],
    parentId: node.parentId || null,
    childCount: node.childIds?.length || 0,
    collapsed,
    designSpec: node.designSpec || '',
    documentation: node.documentation || '',
    sourceFilePath: node.sourceMapping?.filePath || undefined,
    style,
  };

  return {
    id: node.id,
    type: 'c4Node',
    position: { x: 0, y: 0 },
    data,
  };
}

function resolveNodeStyle(
  variant: C4Theme['nodeVariants'][string],
  theme: C4Theme,
  fonts: C4Theme['fontSizes'][string],
  width: number,
  height: number,
  fontFamily: string
): VisualNodeStyle {
  const accent = variant.accentColor;

  // External systems use their accent for the border; others get neutral
  const isExternal = variant.borderStyle === 'dashed';
  const borderColor = isExternal ? hexToRgba(accent, 0.35) : theme.glass.stroke;

  return {
    // Glass surface — neutral for all cards
    background: theme.glass.surface,
    backdropFilter: theme.glass.backdropBlur,
    borderColor,
    borderStyle: variant.borderStyle,
    borderWidth: 1,
    borderRadius: '18px',

    // Accent — used for icon/badge text color only (not fills)
    accentColor: accent,
    glowColor: 'transparent',   // no glow in default state

    // Text
    textColor: theme.text.primary,
    textColorSecondary: theme.text.secondary,
    textColorTertiary: theme.text.tertiary,

    // Dimensions
    width,
    height,

    // Typography
    fontSizes: fonts,
    fontFamily,

    // Shape + Layout
    shapeConfig: variant.shapeConfig,
    badgeConfig: variant.badgeConfig,
    iconConfig: variant.iconConfig,

    // Content
    contentPadding: variant.contentPadding,
    textAlign: variant.textAlign,

    // States — neutral glass → subtle brighten → gradient glow
    shadow: theme.shadows.ambient,
    hoverShadow: theme.shadows.hover,
    selectedRing: theme.shadows.selected,
    hoverBorderColor: theme.glass.strokeStrong,
    hoverScale: 1,   // no scale — use translateY(-1px) in component instead

    // Animation
    transitionDuration: theme.animations.hoverDuration,
    transitionEasing: theme.animations.hoverEasing,
  };
}

// --- Edge Translation ---

function translateEdge(edge: any, theme: C4Theme): Edge<VisualEdgeData> {
  const classification = classifyEdge(edge.technology, edge.tags);
  const variant = theme.edgeVariants[classification] || theme.edgeVariants.sync;

  const style: VisualEdgeStyle = {
    strokeColor: variant.strokeColor,
    strokeWidth: variant.strokeWidth,
    strokeDasharray: variant.strokeDasharray,
    animated: variant.animated,
    animationDuration: variant.animationDuration,
    labelBackground: 'rgba(7,11,16,0.75)',
    labelBorderColor: 'rgba(255,255,255,0.08)',
    labelTextColor: 'rgba(255,255,255,0.70)',
    hoverStrokeWidth: variant.strokeWidth + 0.8,
    glowColor: hexToRgba(variant.strokeColor, 0.2),
  };

  const data: VisualEdgeData = {
    dadEdgeId: edge.id,
    label: edge.label || '',
    technology: edge.technology || undefined,
    tags: edge.tags || [],
    style,
  };

  return {
    id: edge.id,
    source: edge.source,
    target: edge.target,
    label: edge.label || '',
    type: 'c4Edge',
    animated: false, // We handle animation in the component via CSS
    markerEnd: {
      type: MarkerType.ArrowClosed,
      width: 16,
      height: 16,
      color: variant.strokeColor,
    },
    data,
  };
}

function classifyEdge(technology?: string, tags?: string[]): string {
  const tech = (technology || '').toLowerCase();
  const tagSet = new Set((tags || []).map((t: string) => t.toLowerCase()));

  // Tag-based classification
  if (tagSet.has('async') || tagSet.has('event-driven')) return 'async';
  if (tagSet.has('streaming')) return 'streaming';
  if (tagSet.has('external')) return 'external';
  if (tagSet.has('data') || tagSet.has('cache')) return 'data';

  // Technology-based classification
  if (
    tech.includes('kafka') || tech.includes('rabbitmq') || tech.includes('sqs') ||
    tech.includes('amqp') || tech.includes('event') || tech.includes('pub/sub') ||
    tech.includes('nats')
  ) {
    return 'async';
  }
  if (tech.includes('websocket') || tech.includes('sse') || tech.includes('grpc streaming')) {
    return 'streaming';
  }
  if (
    tech.includes('redis') || tech.includes('postgres') || tech.includes('mysql') ||
    tech.includes('mongo') || tech.includes('sql') || tech.includes('dynamodb')
  ) {
    return 'data';
  }

  return 'sync';
}

// --- Helpers ---

function hexToRgba(color: string, alpha: number): string {
  // Handle rgba(...) strings — just adjust alpha
  if (color.startsWith('rgba')) {
    return color.replace(/[\d.]+\)$/, `${alpha})`);
  }
  // Handle hex colors
  if (color.startsWith('#')) {
    const hex = color.replace('#', '');
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    return `rgba(${r},${g},${b},${alpha})`;
  }
  return color;
}
