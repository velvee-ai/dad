/**
 * C4 Visual Model — Fully Resolved Visual Properties
 *
 * These interfaces describe the visual output of the adapter.
 * C4Node reads VisualNodeData.style directly — no lookups needed.
 */

// --- Shape ---

export type NodeShape = 'GlassCard' | 'ActorCard' | 'StoreCard' | 'CodeBlock';

export interface ShapeConfig {
  shape: NodeShape;
  topCap?: boolean; // StoreCard: cylinder ellipse at top
}

// --- Badge ---

export interface BadgeConfig {
  text: string; // 'Actor', 'Service', 'Store', etc.
  show: boolean;
}

// --- Icons ---

export interface IconConfig {
  typeIcon: {
    position: 'badge-left' | 'none';
    size: number;
  };
  techIcon: {
    show: boolean;
    position: 'header-right' | 'meta-row' | 'none';
    size: number;
  };
}

// --- Node Style (fully resolved) ---

export interface VisualNodeStyle {
  // Glass surface
  background: string;
  backdropFilter: string;
  borderColor: string;
  borderStyle: 'solid' | 'dashed';
  borderWidth: number;
  borderRadius: string;

  // Accent (per-type differentiation)
  accentColor: string;
  glowColor: string;

  // Text
  textColor: string;
  textColorSecondary: string;
  textColorTertiary: string;

  // Dimensions
  width: number;
  height: number;

  // Typography
  fontSizes: { title: number; meta: number; body: number; chip: number };
  fontFamily: string;

  // Shape + Layout
  shapeConfig: ShapeConfig;
  badgeConfig: BadgeConfig;
  iconConfig: IconConfig;

  // Content
  contentPadding: string;
  textAlign: 'left' | 'center';

  // States
  shadow: string;
  hoverShadow: string;
  selectedRing: string;
  hoverBorderColor: string;
  hoverScale: number;

  // Animation
  transitionDuration: number;
  transitionEasing: string;
}

// --- Node Data (passed to C4Node component) ---

export interface VisualNodeData {
  // Identity (from DAD)
  dadNodeId: string;
  label: string;
  c4Level: string;
  c4Type: string;
  technology?: string;
  description?: string;
  tags?: string[];

  // Hierarchy
  parentId: string | null;
  childCount: number;
  collapsed: boolean;

  // Detail panel
  designSpec: string;
  documentation: string;
  sourceFilePath?: string;

  // Fully resolved visuals
  style: VisualNodeStyle;
}

// --- Edge Style (fully resolved) ---

export interface VisualEdgeStyle {
  strokeColor: string;
  strokeWidth: number;
  strokeDasharray: string;
  animated: boolean;
  animationDuration: string;
  labelBackground: string;
  labelBorderColor: string;
  labelTextColor: string;
  hoverStrokeWidth: number;
  glowColor: string;
}

// --- Edge Data (passed to C4Edge component) ---

export interface VisualEdgeData {
  dadEdgeId: string;
  label: string;
  technology?: string;
  tags?: string[];
  style: VisualEdgeStyle;
}
