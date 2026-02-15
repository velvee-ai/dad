import type {
  PipelineConfig,
  DadFileSet,
  ScanResult,
  AnalyzedFile,
  ComponentGroup,
} from '../types';
import * as path from 'path';
import { FilesystemScanner } from '../scanner/FilesystemScanner';
import { CodeAnalyzer } from '../analyzer/CodeAnalyzer';
import { LightweightSymbolExtractor } from '../analyzer/LightweightSymbolExtractor';
import { ComponentGrouper } from '../grouper/ComponentGrouper';
import { DadFileAssembler } from '../assembler/DadFileAssembler';
import { LLMEnricher } from '../enrichment/LLMEnricher';
import { StaticEnricher } from '../enrichment/StaticEnricher';
import { ProjectProfiler } from '../profiler/ProjectProfiler';
import { ProfileToScanResult } from '../profiler/ProfileToScanResult';

/**
 * Main pipeline orchestrator: scan → analyze → group → assemble → enrich.
 */
export class Pipeline {
  private config: PipelineConfig;

  constructor(config: PipelineConfig) {
    this.config = config;
  }

  /**
   * Run the full pipeline and produce a DadFileSet.
   */
  async run(): Promise<DadFileSet> {
    let scanResult: ScanResult;

    // Stage 0: LLM-driven project profiling (when provider available)
    if (this.config.llmProvider) {
      this.progress('profile', 'Analyzing project structure with LLM...', 0);
      const profiler = new ProjectProfiler(this.config.llmProvider);
      const profile = await profiler.profile(this.config.rootPath);

      if (profile) {
        this.progress('profile', 'Converting profile to scan result...', 10);
        const converter = new ProfileToScanResult();
        scanResult = await converter.convert(profile, this.config.rootPath);
        this.progress('profile', `Profile: ${scanResult.containerMeta.length} containers, ${scanResult.dataStores.length} data stores`, 15);
      } else {
        // LLM profiling failed — fall back to heuristic scan
        this.progress('scan', 'Profile failed, falling back to heuristic scan...', 0);
        const scanner = new FilesystemScanner();
        scanResult = await scanner.scan(this.config.rootPath);
      }
    } else {
      // No LLM — use heuristic scan
      this.progress('scan', 'Scanning project filesystem...', 0);
      const scanner = new FilesystemScanner();
      scanResult = await scanner.scan(this.config.rootPath);
    }

    if (this.config.projectName) {
      scanResult.projectName = this.config.projectName;
    }

    this.progress('scan', `Found ${scanResult.containerMeta.length} containers, ${scanResult.dataStores.length} data stores, ${scanResult.externalServices.length} external services`, 20);

    // Stage 2: Analyze code (if language service adapter is provided)
    let analyzedFiles: AnalyzedFile[] = [];
    if (this.config.languageServiceAdapter) {
      this.progress('analyze', 'Analyzing source code via language services...', 20);
      const analyzer = new CodeAnalyzer(this.config.languageServiceAdapter);

      for (const container of scanResult.containerMeta) {
        const files = await analyzer.analyzeContainer(container, this.config.rootPath);
        analyzedFiles.push(...files);
      }

      this.progress('analyze', `Analyzed ${analyzedFiles.length} source files`, 40);
    } else {
      // Fallback: lightweight symbol extraction (parse-only, no type checking)
      this.progress('analyze', 'Extracting symbols via lightweight parser...', 20);
      const extractor = new LightweightSymbolExtractor();

      for (const container of scanResult.containerMeta) {
        for (const relFile of container.sourceFiles) {
          const absPath = path.resolve(this.config.rootPath, container.path, relFile);
          const result = extractor.extractFromFile(absPath, container.id);
          if (result) {
            // Store relative filePath for consistency with CodeAnalyzer
            result.filePath = relFile;
            analyzedFiles.push(result);
          }
        }
      }

      this.progress('analyze', `Extracted symbols from ${analyzedFiles.length} files`, 40);
    }

    // Stage 3: Group into components
    this.progress('group', 'Grouping code into components...', 40);
    const grouper = new ComponentGrouper();
    let components: ComponentGroup[] = [];

    if (analyzedFiles.length > 0) {
      // Group from analyzed files (rich mode)
      for (const container of scanResult.containerMeta) {
        const containerFiles = analyzedFiles.filter(f => f.containerId === container.id);
        const containerComponents = grouper.group(containerFiles, container.id, container.technology);
        components.push(...containerComponents);
      }
    } else {
      // Group from file paths only (scanner-only mode)
      for (const container of scanResult.containerMeta) {
        const containerComponents = grouper.groupFromPaths(
          container.sourceFiles,
          container.id,
          container.technology
        );
        components.push(...containerComponents);
      }
    }

    this.progress('group', `Created ${components.length} component groups`, 60);

    // Stage 4: Assemble DadFiles
    this.progress('assemble', 'Assembling C4 model files...', 60);
    const assembler = new DadFileAssembler();
    const dadFileSet = assembler.assemble(scanResult, components, analyzedFiles);
    assembler.linkComponentsToContainers(dadFileSet);

    this.progress('assemble', 'Assembly complete', 70);

    // Stage 4.5: Static enrichment (always runs)
    this.progress('static-enrich', 'Generating designSpec and documentation...', 70);
    const staticEnricher = new StaticEnricher();
    staticEnricher.enrich(dadFileSet, scanResult, components);
    this.progress('static-enrich', 'Static enrichment complete', 80);

    // Stage 5: LLM enrichment (if provider is available)
    if (this.config.llmProvider) {
      this.progress('enrich', 'Enriching with LLM descriptions...', 80);
      const enricher = new LLMEnricher(this.config.llmProvider);
      await enricher.enrich(dadFileSet, scanResult);
      this.progress('enrich', 'Enrichment complete', 100);
    } else {
      this.progress('enrich', 'Skipping LLM enrichment (no provider)', 100);
    }

    return dadFileSet;
  }

  /**
   * Run only the scanner stage (useful for quick previews).
   */
  async scanOnly(): Promise<ScanResult> {
    const scanner = new FilesystemScanner();
    return scanner.scan(this.config.rootPath);
  }

  private progress(stage: string, message: string, percent: number): void {
    this.config.onProgress?.(stage, message, percent);
  }
}
