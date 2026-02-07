export { DadVisualizer } from './DadVisualizer';
export type { DadVisualizerProps } from './DadVisualizer';

export { ICICLE_THEME } from './theme/icicleTheme';
export type { C4Theme } from './theme/c4ThemeTypes';
export type { StatusOverlayConfig } from './theme/c4ThemeTypes';

export { translateDadToVisual } from './adapter/c4Adapter';
export { layoutForScope, computeScopeView, applyC4DagreLayout } from './layout/c4LayoutEngine';

export type { VisualNodeData, VisualEdgeData, VisualNodeStyle, VisualEdgeStyle } from './adapter/c4VisualModel';
export type { C4Breadcrumb } from './components/C4Breadcrumbs';
export type { NodeDetail, NodeUpdatePayload } from './components/NodeDetailPanel';

// Author Mode
export { useAuthorMode, generateProposedId } from './hooks/useAuthorMode';
export type { AuthorMode, AuthorSession, UseAuthorModeReturn } from './hooks/useAuthorMode';
export { computeDadDiff, countByStatus } from './utils/dadDiff';
export type { DadDiffResult } from './utils/dadDiff';
export { default as AuthorToolbar } from './components/AuthorToolbar';
export type { AuthorToolbarProps } from './components/AuthorToolbar';
export { default as AddNodeDialog } from './components/AddNodeDialog';
export type { AddNodeDialogProps } from './components/AddNodeDialog';
export { default as AddEdgeDialog } from './components/AddEdgeDialog';
export type { AddEdgeDialogProps } from './components/AddEdgeDialog';
export { default as PlanReviewPanel } from './components/PlanReviewPanel';
export type { PlanReviewPanelProps } from './components/PlanReviewPanel';
export { default as CoalesceLogPanel } from './components/CoalesceLogPanel';
export type { CoalesceLogPanelProps, LogEntry } from './components/CoalesceLogPanel';
