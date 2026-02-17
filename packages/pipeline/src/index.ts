// Pipeline orchestrator
export { Pipeline } from './pipeline/Pipeline';

// Scanner (Stage 1)
export { FilesystemScanner } from './scanner/FilesystemScanner';
export { ContainerDetector } from './scanner/ContainerDetector';
export { DataStoreDetector } from './scanner/DataStoreDetector';
export { ExternalServiceRegistry } from './scanner/ExternalServiceRegistry';

// Analyzer (Stage 2)
export { CodeAnalyzer } from './analyzer/CodeAnalyzer';
export { LightweightSymbolExtractor } from './analyzer/LightweightSymbolExtractor';
export { MockLanguageServiceAdapter } from './analyzer/LanguageServiceAdapter';

// Grouper (Stage 3)
export { ComponentGrouper } from './grouper/ComponentGrouper';

// Assembler (Stage 4)
export { DadFileAssembler } from './assembler/DadFileAssembler';
export { EdgeInference } from './assembler/EdgeInference';
export { PersonDetector } from './assembler/PersonDetector';
export { ViewsStylesGenerator } from './assembler/ViewsStylesGenerator';
export * from './assembler/IdGenerator';

// Profiler (Stage 0)
export { ProjectProfiler } from './profiler/ProjectProfiler';
export { SkeletonCollector } from './profiler/SkeletonCollector';
export { ProfilePromptBuilder } from './profiler/ProfilePromptBuilder';
export { ProfileToScanResult } from './profiler/ProfileToScanResult';
export type { ProjectProfile, ProjectSkeleton } from './profiler/types';

// Enrichment (Stage 4.5 + Stage 5)
export { StaticEnricher } from './enrichment/StaticEnricher';
export { LLMEnricher } from './enrichment/LLMEnricher';
export { PromptBuilder } from './enrichment/PromptBuilder';
export { MockLLMProvider, ClaudeProvider, OpenRouterProvider } from './enrichment/LLMProvider';

// Landscape Aggregator
export { LandscapeAggregator } from './landscape/LandscapeAggregator';
export { CrossSystemEdgeInference } from './landscape/CrossSystemEdgeInference';
export type {
  LandscapeWorkspaceConfig,
  LandscapeSystemEntry,
  DeclaredRelationship,
  LandscapeAggregatorConfig,
  LandscapeResult,
  SystemSummary,
} from './landscape/types';

// Types
export type {
  ScanResult,
  ContainerMeta,
  DataStoreMeta,
  ExternalServiceMeta,
  SystemMeta,
  AnalyzedFile,
  AnalyzedSymbol,
  ImportReference,
  ComponentGroup,
  ComponentRole,
  DadFileSet,
  LanguageServiceAdapter,
  DocumentSymbol,
  CallHierarchyItem,
  CallHierarchyOutgoingCall,
  CallHierarchyIncomingCall,
  HoverResult,
  LSPPosition,
  LSPRange,
  LSPLocation,
  LLMProvider,
  EnrichmentResult,
  PipelineConfig,
  ViewConfig,
  DadViews,
  DadStyles,
  StyleRule,
  ProfileRelationship,
  ProfileActor,
} from './types';
