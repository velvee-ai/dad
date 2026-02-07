/**
 * Icicle Theme v2 — DAD.ai Visualizer Design System
 *
 * Dark glass everything → gradient on focus node only.
 * Color lives in: borders, icons, flows, motion.
 *
 * All cards: neutral glass
 * Selected/active: icicle gradient glow
 * Actors: white icon + label only
 * External systems: desaturated rose border only
 * Internal services: no fill color
 * Data stores: mint icon accent only
 * Async edges: dashed + cyan
 * Sync edges: solid + gray
 * Active flow: animated icicle gradient
 */

import type { C4Theme } from './c4ThemeTypes';

export const ICICLE_THEME: C4Theme = {
  name: 'icicle',

  // --- Canvas ---
  canvas: {
    bg0: '#070B10',
    bg1: '#0B1220',
    gridDotColor: 'rgba(255,255,255,0.04)',
    gridDotSize: 1,
  },

  // --- Glass Surface ---
  glass: {
    surface: 'rgba(255,255,255,0.04)',
    surfaceStrong: 'rgba(255,255,255,0.07)',
    stroke: 'rgba(255,255,255,0.10)',
    strokeStrong: 'rgba(255,255,255,0.18)',
    backdropBlur: 'blur(16px)',
  },

  // --- Text ---
  text: {
    primary: 'rgba(255,255,255,0.88)',
    secondary: 'rgba(255,255,255,0.55)',
    tertiary: 'rgba(255,255,255,0.38)',
  },

  // --- Accents ---
  accents: {
    icicleA: '#4FE9FF',       // icy cyan
    icicleB: '#2FF7C7',       // mint
    icicleC: '#B8FFF2',       // frost highlight
    warning: '#FFD166',
    danger: '#FF5C8A',
    neutral: 'rgba(255,255,255,0.25)',
  },

  // --- Fonts ---
  fontFamily: 'Inter, system-ui, -apple-system, Segoe UI, Roboto, sans-serif',
  monoFontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',

  fontSizes: {
    landscape: { title: 18, meta: 12, body: 13, chip: 11 },
    context:   { title: 18, meta: 12, body: 13, chip: 11 },
    container: { title: 16, meta: 11, body: 12, chip: 10 },
    component: { title: 14, meta: 11, body: 12, chip: 10 },
    code:      { title: 13, meta: 10, body: 11, chip: 9 },
  },

  // --- Node Variants ---
  // accentColor is used for icon tint + badge chip color only (not fills)
  nodeVariants: {
    person: {
      shapeConfig: { shape: 'ActorCard' },
      badgeConfig: { text: 'Actor', show: true },
      iconConfig: {
        typeIcon: { position: 'badge-left', size: 14 },
        techIcon: { show: false, position: 'none', size: 0 },
      },
      accentColor: 'rgba(255,255,255,0.70)',  // white icon + label
      width: 240,
      height: 110,
      collapsedWidth: 160,
      collapsedHeight: 45,
      contentPadding: '16px',
      textAlign: 'left',
      fontFamily: 'inherit',
      borderStyle: 'solid',
    },
    landscape: {
      shapeConfig: { shape: 'GlassCard' },
      badgeConfig: { text: 'System', show: true },
      iconConfig: {
        typeIcon: { position: 'badge-left', size: 14 },
        techIcon: { show: false, position: 'none', size: 0 },
      },
      accentColor: 'rgba(255,255,255,0.50)',  // neutral badge
      width: 340,
      height: 150,
      collapsedWidth: 200,
      collapsedHeight: 50,
      contentPadding: '16px',
      textAlign: 'left',
      fontFamily: 'inherit',
      borderStyle: 'solid',
    },
    softwareSystem: {
      shapeConfig: { shape: 'GlassCard' },
      badgeConfig: { text: 'Service', show: true },
      iconConfig: {
        typeIcon: { position: 'badge-left', size: 14 },
        techIcon: { show: true, position: 'header-right', size: 24 },
      },
      accentColor: 'rgba(255,255,255,0.50)',  // neutral — no fill color
      width: 300,
      height: 140,
      collapsedWidth: 180,
      collapsedHeight: 45,
      contentPadding: '16px',
      textAlign: 'left',
      fontFamily: 'inherit',
      borderStyle: 'solid',
    },
    externalSystem: {
      shapeConfig: { shape: 'GlassCard' },
      badgeConfig: { text: 'External', show: true },
      iconConfig: {
        typeIcon: { position: 'badge-left', size: 14 },
        techIcon: { show: true, position: 'header-right', size: 24 },
      },
      accentColor: '#8B5A6B',  // desaturated rose — border only
      width: 300,
      height: 140,
      collapsedWidth: 180,
      collapsedHeight: 45,
      contentPadding: '16px',
      textAlign: 'left',
      fontFamily: 'inherit',
      borderStyle: 'dashed',
    },
    container: {
      shapeConfig: { shape: 'GlassCard' },
      badgeConfig: { text: 'Service', show: true },
      iconConfig: {
        typeIcon: { position: 'badge-left', size: 14 },
        techIcon: { show: true, position: 'header-right', size: 24 },
      },
      accentColor: 'rgba(255,255,255,0.50)',  // neutral — no fill color
      width: 300,
      height: 140,
      collapsedWidth: 180,
      collapsedHeight: 45,
      contentPadding: '16px',
      textAlign: 'left',
      fontFamily: 'inherit',
      borderStyle: 'solid',
    },
    dataStore: {
      shapeConfig: { shape: 'StoreCard', topCap: true },
      badgeConfig: { text: 'Store', show: true },
      iconConfig: {
        typeIcon: { position: 'badge-left', size: 14 },
        techIcon: { show: true, position: 'meta-row', size: 16 },
      },
      accentColor: '#2FF7C7',  // mint icon accent only
      width: 320,
      height: 120,
      collapsedWidth: 180,
      collapsedHeight: 45,
      contentPadding: '16px',
      textAlign: 'left',
      fontFamily: 'inherit',
      borderStyle: 'solid',
    },
    component: {
      shapeConfig: { shape: 'GlassCard' },
      badgeConfig: { text: 'Component', show: true },
      iconConfig: {
        typeIcon: { position: 'badge-left', size: 14 },
        techIcon: { show: true, position: 'header-right', size: 20 },
      },
      accentColor: 'rgba(255,255,255,0.45)',  // neutral
      width: 260,
      height: 100,
      collapsedWidth: 160,
      collapsedHeight: 40,
      contentPadding: '14px',
      textAlign: 'left',
      fontFamily: 'inherit',
      borderStyle: 'solid',
    },
    codeUnit: {
      shapeConfig: { shape: 'CodeBlock' },
      badgeConfig: { text: 'Code', show: true },
      iconConfig: {
        typeIcon: { position: 'none', size: 0 },
        techIcon: { show: false, position: 'none', size: 0 },
      },
      accentColor: 'rgba(255,255,255,0.30)',
      width: 220,
      height: 80,
      collapsedWidth: 140,
      collapsedHeight: 35,
      contentPadding: '12px',
      textAlign: 'left',
      fontFamily: 'mono',
      borderStyle: 'solid',
    },
  },

  // --- Edge Variants ---
  edgeVariants: {
    sync: {
      strokeColor: 'rgba(255,255,255,0.28)',  // solid gray
      strokeWidth: 1.2,
      strokeDasharray: 'none',
      animated: false,
      animationDuration: '0s',
    },
    async: {
      strokeColor: '#4FE9FF',                 // dashed cyan
      strokeWidth: 1.2,
      strokeDasharray: '6,10',
      animated: true,
      animationDuration: '2s',
    },
    streaming: {
      strokeColor: '#4FE9FF',
      strokeWidth: 1.5,
      strokeDasharray: '4,8',
      animated: true,
      animationDuration: '1.4s',
    },
    data: {
      strokeColor: 'rgba(255,255,255,0.22)',   // subtle gray (data stores)
      strokeWidth: 1.2,
      strokeDasharray: 'none',
      animated: false,
      animationDuration: '0s',
    },
    external: {
      strokeColor: '#8B5A6B',                  // desaturated rose
      strokeWidth: 1,
      strokeDasharray: '4,4',
      animated: false,
      animationDuration: '0s',
    },
  },

  // --- Shadows ---
  shadows: {
    ambient: '0 1px 4px rgba(0,0,0,0.25)',
    hover: '0 2px 12px rgba(0,0,0,0.35), 0 0 1px rgba(255,255,255,0.08)',
    selected: '0 0 0 1.5px rgba(79,233,255,0.7), 0 0 24px rgba(79,233,255,0.25), 0 0 48px rgba(47,247,199,0.12)',
  },

  // --- Layout ---
  layout: {
    nodeSpacing: 60,
    rankSpacing: 80,
    boundaryPadding: 40,
    fitViewPadding: 0.12,
  },

  // --- Animation ---
  animations: {
    hoverDuration: 180,
    hoverEasing: 'cubic-bezier(0.25, 0.1, 0.25, 1)',
    drillDownDuration: 350,
    drillDownEasing: 'cubic-bezier(0.4, 0, 0.2, 1)',
    flowDashPattern: '6 10',
    flowLoopDuration: '2s',
  },

  // --- Status Overlays (Author Mode) ---
  statusOverlays: {
    'user-proposed': {
      surfaceOverride: 'linear-gradient(135deg, rgba(180,180,180,0.12), rgba(120,120,120,0.08))',
      borderColorOverride: 'rgba(180,180,180,0.30)',
      glowColor: 'rgba(180,180,180,0.15)',
      badgeBackground: 'rgba(180,180,180,0.12)',
      badgeTextColor: 'rgba(255,255,255,0.60)',
      opacity: 0.85,
    },
    'agent-planned': {
      surfaceOverride: 'linear-gradient(135deg, rgba(66,133,244,0.15), rgba(30,90,210,0.10))',
      borderColorOverride: 'rgba(66,133,244,0.40)',
      glowColor: 'rgba(66,133,244,0.20)',
      badgeBackground: 'rgba(66,133,244,0.15)',
      badgeTextColor: 'rgba(100,170,255,0.90)',
      opacity: 1,
    },
  },

  // --- Boundary Box ---
  boundary: {
    borderColor: 'rgba(255,255,255,0.08)',
    backgroundColor: 'rgba(255,255,255,0.02)',
    labelColor: 'rgba(255,255,255,0.35)',
    borderDash: '6,4',
  },
};
