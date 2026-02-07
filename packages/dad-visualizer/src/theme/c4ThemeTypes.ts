/**
 * C4 Theme Types — Theme interface for the DAD Visualizer
 *
 * A C4Theme encapsulates all visual constants: colors, glass tokens,
 * typography, node/edge variants, animation, and layout.
 */

import type { ShapeConfig, BadgeConfig, IconConfig } from '../adapter/c4VisualModel';

// --- Glass Surface Tokens ---

export interface GlassTokens {
  surface: string;
  surfaceStrong: string;
  stroke: string;
  strokeStrong: string;
  backdropBlur: string;
}

// --- Text Tokens ---

export interface TextTokens {
  primary: string;
  secondary: string;
  tertiary: string;
}

// --- Accent Tokens ---

export interface AccentTokens {
  icicleA: string;
  icicleB: string;
  icicleC: string;
  warning: string;
  danger: string;
  neutral: string;
}

// --- Canvas Tokens ---

export interface CanvasTokens {
  bg0: string;
  bg1: string;
  gridDotColor: string;
  gridDotSize: number;
}

// --- Node Variant Config ---

export interface NodeVariantConfig {
  shapeConfig: ShapeConfig;
  badgeConfig: BadgeConfig;
  iconConfig: IconConfig;
  accentColor: string;
  width: number;
  height: number;
  collapsedWidth: number;
  collapsedHeight: number;
  contentPadding: string;
  textAlign: 'left' | 'center';
  fontFamily: string; // 'inherit' or 'mono'
  borderStyle: 'solid' | 'dashed';
}

// --- Edge Variant Config ---

export interface EdgeVariantConfig {
  strokeColor: string;
  strokeWidth: number;
  strokeDasharray: string;
  animated: boolean;
  animationDuration: string;
}

// --- Font Sizes per level ---

export interface ThemeFontSizes {
  title: number;
  meta: number;
  body: number;
  chip: number;
}

// --- Status Overlay (Author Mode) ---

export interface StatusOverlayConfig {
  surfaceOverride?: string;
  borderColorOverride?: string;
  glowColor?: string;
  badgeBackground?: string;
  badgeTextColor?: string;
  opacity?: number;
}

// --- C4 Theme ---

export interface C4Theme {
  name: string;

  // Canvas
  canvas: CanvasTokens;

  // Glass surface
  glass: GlassTokens;

  // Text
  text: TextTokens;

  // Accents
  accents: AccentTokens;

  // Fonts
  fontFamily: string;
  monoFontFamily: string;
  fontSizes: Record<string, ThemeFontSizes>;

  // Node variants per DadNodeType
  nodeVariants: Record<string, NodeVariantConfig>;

  // Edge variants by classification
  edgeVariants: Record<string, EdgeVariantConfig>;

  // Shadows
  shadows: {
    ambient: string;
    hover: string;
    selected: string;
  };

  // Layout
  layout: {
    nodeSpacing: number;
    rankSpacing: number;
    boundaryPadding: number;
    fitViewPadding: number;
  };

  // Animation
  animations: {
    hoverDuration: number;
    hoverEasing: string;
    drillDownDuration: number;
    drillDownEasing: string;
    flowDashPattern: string;
    flowLoopDuration: string;
  };

  // Status overlays (Author Mode — applied on top of base node variant)
  statusOverlays?: Record<string, StatusOverlayConfig>;

  // Boundary box
  boundary: {
    borderColor: string;
    backgroundColor: string;
    labelColor: string;
    borderDash: string;
  };
}
