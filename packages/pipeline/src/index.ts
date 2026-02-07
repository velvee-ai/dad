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

// Enrichment (Stage 5)
export { LLMEnricher } from './enrichment/LLMEnricher';
export { PromptBuilder } from './enrichment/PromptBuilder';
export { MockLLMProvider, ClaudeProvider, OpenRouterProvider } from './enrichment/LLMProvider';

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
} from './types';
