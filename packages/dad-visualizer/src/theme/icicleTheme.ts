/**
 * Icicle Theme — DAD.ai Visualizer Design System
 *
 * Brand-forward, glassmorphic dark theme with icicle cyan→mint accents.
 * Implements C4Theme interface.
 */

import type { C4Theme } from './c4ThemeTypes';

export const ICICLE_THEME: C4Theme = {
  name: 'icicle',

  // --- Canvas ---
  canvas: {
    bg0: '#070B10',
    bg1: '#0B1220',
    gridDotColor: 'rgba(255,255,255,0.06)',
    gridDotSize: 1,
  },

  // --- Glass Surface ---
  glass: {
    surface: 'rgba(255,255,255,0.06)',
    surfaceStrong: 'rgba(255,255,255,0.10)',
    stroke: 'rgba(255,255,255,0.14)',
    strokeStrong: 'rgba(255,255,255,0.22)',
    backdropBlur: 'blur(14px)',
  },

  // --- Text ---
  text: {
    primary: 'rgba(255,255,255,0.92)',
    secondary: 'rgba(255,255,255,0.72)',
    tertiary: 'rgba(255,255,255,0.52)',
  },

  // --- Accents ---
  accents: {
    icicleA: '#4FE9FF', // icy cyan
    icicleB: '#2FF7C7', // mint
    icicleC: '#B8FFF2', // frost highlight
    warning: '#FFD166',
    danger: '#FF5C8A',
    neutral: 'rgba(255,255,255,0.35)',
  },

  // --- Fonts ---
  fontFamily: 'Inter, system-ui, -apple-system, Segoe UI, Roboto, sans-serif',
  monoFontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',

  fontSizes: {
    landscape: { title: 18, meta: 12, body: 13, chip: 11 },
    context: { title: 18, meta: 12, body: 13, chip: 11 },
    container: { title: 16, meta: 11, body: 12, chip: 10 },
    component: { title: 14, meta: 11, body: 12, chip: 10 },
    code: { title: 13, meta: 10, body: 11, chip: 9 },
  },

  // --- Node Variants ---
  nodeVariants: {
    person: {
      shapeConfig: { shape: 'ActorCard' },
      badgeConfig: { text: 'Actor', show: true },
      iconConfig: {
        typeIcon: { position: 'badge-left', size: 14 },
        techIcon: { show: false, position: 'none', size: 0 },
      },
      accentColor: '#4FE9FF',
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
      accentColor: '#4FE9FF',
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
      accentColor: '#2FF7C7',
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
      accentColor: '#FF5C8A',
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
      accentColor: '#4FE9FF',
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
      accentColor: '#FFD166',
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
      accentColor: '#B8FFF2',
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
      accentColor: 'rgba(255,255,255,0.35)',
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
      strokeColor: 'rgba(255,255,255,0.35)',
      strokeWidth: 1.5,
      strokeDasharray: 'none',
      animated: false,
      animationDuration: '0s',
    },
    async: {
      strokeColor: '#FFD166',
      strokeWidth: 1.5,
      strokeDasharray: '6,10',
      animated: true,
      animationDuration: '1.8s',
    },
    streaming: {
      strokeColor: '#4FE9FF',
      strokeWidth: 2,
      strokeDasharray: '6,10',
      animated: true,
      animationDuration: '1.4s',
    },
    data: {
      strokeColor: '#2FF7C7',
      strokeWidth: 1.5,
      strokeDasharray: 'none',
      animated: false,
      animationDuration: '0s',
    },
    external: {
      strokeColor: '#FF5C8A',
      strokeWidth: 1,
      strokeDasharray: '4,4',
      animated: false,
      animationDuration: '0s',
    },
  },

  // --- Shadows ---
  shadows: {
    ambient: '0 2px 8px rgba(0,0,0,0.3), 0 0 1px rgba(255,255,255,0.05)',
    hover: '0 4px 20px rgba(0,0,0,0.4), 0 0 15px rgba(79,233,255,0.15)',
    selected: '0 0 0 2px rgba(79,233,255,0.5), 0 4px 20px rgba(79,233,255,0.2)',
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
    hoverDuration: 200,
    hoverEasing: 'cubic-bezier(0.4, 0, 0.2, 1)',
    drillDownDuration: 350,
    drillDownEasing: 'cubic-bezier(0.4, 0, 0.2, 1)',
    flowDashPattern: '6 10',
    flowLoopDuration: '1.8s',
  },

  // --- Boundary Box ---
  boundary: {
    borderColor: 'rgba(79,233,255,0.15)',
    backgroundColor: 'rgba(79,233,255,0.03)',
    labelColor: 'rgba(79,233,255,0.5)',
    borderDash: '6,4',
  },
};
