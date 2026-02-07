export { DadVisualizer } from './DadVisualizer';
export type { DadVisualizerProps } from './DadVisualizer';

export { ICICLE_THEME } from './theme/icicleTheme';
export type { C4Theme } from './theme/c4ThemeTypes';

export { translateDadToVisual } from './adapter/c4Adapter';
export { layoutForScope, computeScopeView, applyC4DagreLayout } from './layout/c4LayoutEngine';

export type { VisualNodeData, VisualEdgeData, VisualNodeStyle, VisualEdgeStyle } from './adapter/c4VisualModel';
export type { C4Breadcrumb } from './components/C4Breadcrumbs';
export type { NodeDetail } from './components/NodeDetailPanel';
