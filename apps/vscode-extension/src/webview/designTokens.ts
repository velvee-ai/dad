/**
 * Design Tokens — Backward Compatibility Shim
 *
 * The visual system has moved to:
 *   - theme/icicleTheme.ts (all colors, styles, animations)
 *   - adapter/c4Adapter.ts (DAD → Visual translation)
 *
 * This file re-exports only what the layout engine still needs:
 *   - C4_NODE_SIZES (for dagre node dimensions)
 *   - C4_LAYOUT (spacing/padding constants)
 */

import { ICICLE_THEME } from './theme/icicleTheme';

// --- Node Sizes (derived from Icicle theme variants) ---

export interface NodeSize {
  width: number;
  height: number;
  collapsedWidth: number;
  collapsedHeight: number;
}

/**
 * Node sizes per C4 level — used by c4LayoutEngine for dagre layout.
 * Derived from the largest node variant at each level.
 */
export const C4_NODE_SIZES: Record<string, NodeSize> = {
  landscape: {
    width: ICICLE_THEME.nodeVariants.landscape.width,
    height: ICICLE_THEME.nodeVariants.landscape.height,
    collapsedWidth: ICICLE_THEME.nodeVariants.landscape.collapsedWidth,
    collapsedHeight: ICICLE_THEME.nodeVariants.landscape.collapsedHeight,
  },
  context: {
    width: ICICLE_THEME.nodeVariants.softwareSystem.width,
    height: ICICLE_THEME.nodeVariants.softwareSystem.height,
    collapsedWidth: ICICLE_THEME.nodeVariants.softwareSystem.collapsedWidth,
    collapsedHeight: ICICLE_THEME.nodeVariants.softwareSystem.collapsedHeight,
  },
  container: {
    width: ICICLE_THEME.nodeVariants.container.width,
    height: ICICLE_THEME.nodeVariants.container.height,
    collapsedWidth: ICICLE_THEME.nodeVariants.container.collapsedWidth,
    collapsedHeight: ICICLE_THEME.nodeVariants.container.collapsedHeight,
  },
  component: {
    width: ICICLE_THEME.nodeVariants.component.width,
    height: ICICLE_THEME.nodeVariants.component.height,
    collapsedWidth: ICICLE_THEME.nodeVariants.component.collapsedWidth,
    collapsedHeight: ICICLE_THEME.nodeVariants.component.collapsedHeight,
  },
  code: {
    width: ICICLE_THEME.nodeVariants.codeUnit.width,
    height: ICICLE_THEME.nodeVariants.codeUnit.height,
    collapsedWidth: ICICLE_THEME.nodeVariants.codeUnit.collapsedWidth,
    collapsedHeight: ICICLE_THEME.nodeVariants.codeUnit.collapsedHeight,
  },
};

// --- Layout Constants ---

export const C4_LAYOUT = {
  nodeSpacing: ICICLE_THEME.layout.nodeSpacing,
  rankSpacing: ICICLE_THEME.layout.rankSpacing,
  boundaryPadding: ICICLE_THEME.layout.boundaryPadding,
  boundaryLabelHeight: 28,
  fitViewPadding: ICICLE_THEME.layout.fitViewPadding,
} as const;
