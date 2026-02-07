import * as path from 'path';
import type {
  AnalyzedFile,
  AnalyzedSymbol,
  CodeUnitKind,
  ContainerMeta,
  DocumentSymbol,
  ImportReference,
  LanguageServiceAdapter,
  LSPPosition,
} from '../types';

/**
 * Stage 2: Analyzes source files using VS Code language services.
 * The LanguageServiceAdapter is injected by the VS Code extension.
 */
export class CodeAnalyzer {
  constructor(private adapter: LanguageServiceAdapter) {}

  /**
   * Analyze all source files in a container.
   */
  async analyzeContainer(container: ContainerMeta, rootPath: string): Promise<AnalyzedFile[]> {
    const results: AnalyzedFile[] = [];

    for (const relFile of container.sourceFiles) {
      const absPath = path.resolve(rootPath, container.path, relFile);
      const uri = `file://${absPath}`;
      const language = this.detectLanguage(relFile);

      try {
        const analyzed = await this.analyzeFile(uri, relFile, language, container.id);
        results.push(analyzed);
      } catch {
        // Skip files that fail analysis
      }
    }

    return results;
  }

  /**
   * Analyze a single source file.
   */
  async analyzeFile(
    uri: string,
    filePath: string,
    language: string,
    containerId: string
  ): Promise<AnalyzedFile> {
    // Get document symbols (classes, functions, interfaces, etc.)
    const docSymbols = await this.adapter.getDocumentSymbols(uri);
    const symbols = this.convertSymbols(docSymbols);

    // Extract imports by analyzing symbol references
    const imports = await this.extractImports(uri, docSymbols);

    return {
      filePath,
      language,
      containerId,
      symbols,
      imports,
    };
  }

  private convertSymbols(docSymbols: DocumentSymbol[]): AnalyzedSymbol[] {
    return docSymbols
      .filter(s => this.isRelevantSymbol(s.kind))
      .map(s => this.convertSymbol(s));
  }

  private convertSymbol(sym: DocumentSymbol): AnalyzedSymbol {
    const kind = this.mapSymbolKind(sym.kind);
    const members = sym.children
      ? sym.children.filter(c => this.isRelevantSymbol(c.kind)).map(c => this.convertSymbol(c))
      : undefined;

    return {
      name: sym.name,
      kind,
      exportType: 'none', // Will be refined by hover/detail info
      startLine: sym.range.start.line,
      endLine: sym.range.end.line,
      docComment: sym.detail,
      members: members && members.length > 0 ? members : undefined,
    };
  }

  private async extractImports(
    uri: string,
    docSymbols: DocumentSymbol[]
  ): Promise<ImportReference[]> {
    // Use references/definitions to trace imports
    // For each symbol, check if it's imported from elsewhere
    const imports: ImportReference[] = [];
    const seen = new Set<string>();

    for (const sym of docSymbols) {
      if (sym.kind === 'module' || sym.kind === 'namespace') {
        continue;
      }

      // Try to get definition for the symbol
      const pos: LSPPosition = {
        line: sym.selectionRange.start.line,
        character: sym.selectionRange.start.character,
      };

      try {
        const defs = await this.adapter.getDefinition(uri, pos);
        for (const def of defs) {
          if (def.uri !== uri && !seen.has(def.uri)) {
            seen.add(def.uri);
            const isExternal = def.uri.includes('node_modules');
            imports.push({
              source: this.extractImportSource(def.uri),
              specifiers: [sym.name],
              isExternal,
              resolvedPath: isExternal ? undefined : def.uri.replace('file://', ''),
            });
          }
        }
      } catch {
        // Definition lookup can fail for some symbols
      }
    }

    return imports;
  }

  private extractImportSource(uri: string): string {
    const filePath = uri.replace('file://', '');
    if (filePath.includes('node_modules')) {
      // Extract package name from node_modules path
      const parts = filePath.split('node_modules/');
      const pkgPath = parts[parts.length - 1];
      if (pkgPath.startsWith('@')) {
        return pkgPath.split('/').slice(0, 2).join('/');
      }
      return pkgPath.split('/')[0];
    }
    return filePath;
  }

  private isRelevantSymbol(kind: string): boolean {
    return [
      'class',
      'function',
      'method',
      'interface',
      'enum',
      'variable',
      'constant',
      'property',
    ].includes(kind);
  }

  private mapSymbolKind(kind: string): CodeUnitKind {
    switch (kind) {
      case 'class':
        return 'class';
      case 'interface':
        return 'interface';
      case 'enum':
        return 'enum';
      case 'function':
        return 'function';
      case 'method':
        return 'method';
      default:
        return 'function';
    }
  }

  private detectLanguage(filePath: string): string {
    const ext = path.extname(filePath).toLowerCase();
    switch (ext) {
      case '.ts':
      case '.tsx':
        return 'typescript';
      case '.js':
      case '.jsx':
        return 'javascript';
      case '.py':
        return 'python';
      case '.go':
        return 'go';
      default:
        return 'unknown';
    }
  }
}
