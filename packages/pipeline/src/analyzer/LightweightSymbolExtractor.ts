import * as fs from 'fs';
import * as path from 'path';
import * as ts from 'typescript';
import type { AnalyzedFile, AnalyzedSymbol, CodeUnitKind } from '../types';

/**
 * Lightweight symbol extraction fallback when no LSP adapter is available.
 * - TypeScript: uses ts.createSourceFile (parse-only, no type checking)
 * - Python: regex-based extraction of classes and functions
 */
export class LightweightSymbolExtractor {
  /**
   * Extract symbols from a TypeScript/JavaScript file using the TS compiler API.
   * Only parses the AST — no type checking or resolution.
   */
  extractFromTypeScript(filePath: string, containerId: string): AnalyzedFile | null {
    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      const sourceFile = ts.createSourceFile(
        path.basename(filePath),
        content,
        ts.ScriptTarget.Latest,
        true,
        filePath.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS
      );

      const symbols: AnalyzedSymbol[] = [];
      this.visitNode(sourceFile, sourceFile, symbols);

      return {
        filePath,
        language: 'typescript',
        containerId,
        symbols,
        imports: [], // No import resolution without LSP
      };
    } catch {
      return null;
    }
  }

  /**
   * Extract symbols from a Python file using regex patterns.
   * Extracts module-level classes and functions.
   */
  extractFromPython(filePath: string, containerId: string): AnalyzedFile | null {
    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      const lines = content.split('\n');
      const symbols: AnalyzedSymbol[] = [];

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];

        // Match class definitions: class Foo: or class Foo(Base):
        const classMatch = line.match(/^class\s+([A-Za-z_]\w*)\s*[:(]/);
        if (classMatch) {
          const name = classMatch[1];
          const endLine = this.findPythonBlockEnd(lines, i);
          const members = this.extractPythonMethods(lines, i, endLine);
          symbols.push({
            name,
            kind: 'class',
            exportType: 'named', // Python classes are implicitly exported
            startLine: i + 1,
            endLine: endLine + 1,
            members: members.length > 0 ? members : undefined,
          });
          continue;
        }

        // Match top-level function definitions: def foo(): or async def foo():
        const funcMatch = line.match(/^(?:async\s+)?def\s+([A-Za-z_]\w*)\s*\(/);
        if (funcMatch) {
          const name = funcMatch[1];
          if (name.startsWith('_') && name !== '__init__') continue; // Skip private
          const endLine = this.findPythonBlockEnd(lines, i);
          symbols.push({
            name,
            kind: 'function',
            exportType: 'named',
            startLine: i + 1,
            endLine: endLine + 1,
          });
        }
      }

      return {
        filePath,
        language: 'python',
        containerId,
        symbols,
        imports: [],
      };
    } catch {
      return null;
    }
  }

  /**
   * Extract symbols from a file based on its extension.
   */
  extractFromFile(filePath: string, containerId: string): AnalyzedFile | null {
    const ext = path.extname(filePath).toLowerCase();
    if (['.ts', '.tsx', '.js', '.jsx'].includes(ext)) {
      return this.extractFromTypeScript(filePath, containerId);
    }
    if (ext === '.py') {
      return this.extractFromPython(filePath, containerId);
    }
    return null;
  }

  private visitNode(
    node: ts.Node,
    sourceFile: ts.SourceFile,
    symbols: AnalyzedSymbol[]
  ): void {
    if (ts.isFunctionDeclaration(node) && node.name) {
      symbols.push({
        name: node.name.text,
        kind: 'function',
        exportType: this.getExportType(node),
        startLine: sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile)).line + 1,
        endLine: sourceFile.getLineAndCharacterOfPosition(node.getEnd()).line + 1,
      });
    } else if (ts.isClassDeclaration(node) && node.name) {
      const members = this.extractClassMembers(node, sourceFile);
      symbols.push({
        name: node.name.text,
        kind: 'class',
        exportType: this.getExportType(node),
        startLine: sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile)).line + 1,
        endLine: sourceFile.getLineAndCharacterOfPosition(node.getEnd()).line + 1,
        members: members.length > 0 ? members : undefined,
      });
    } else if (ts.isInterfaceDeclaration(node) && node.name) {
      symbols.push({
        name: node.name.text,
        kind: 'interface',
        exportType: this.getExportType(node),
        startLine: sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile)).line + 1,
        endLine: sourceFile.getLineAndCharacterOfPosition(node.getEnd()).line + 1,
      });
    } else if (ts.isEnumDeclaration(node) && node.name) {
      symbols.push({
        name: node.name.text,
        kind: 'enum',
        exportType: this.getExportType(node),
        startLine: sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile)).line + 1,
        endLine: sourceFile.getLineAndCharacterOfPosition(node.getEnd()).line + 1,
      });
    } else if (ts.isTypeAliasDeclaration(node) && node.name) {
      symbols.push({
        name: node.name.text,
        kind: 'type',
        exportType: this.getExportType(node),
        startLine: sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile)).line + 1,
        endLine: sourceFile.getLineAndCharacterOfPosition(node.getEnd()).line + 1,
      });
    }

    // Only visit top-level children
    if (node === sourceFile) {
      ts.forEachChild(node, child => this.visitNode(child, sourceFile, symbols));
    }
  }

  private extractClassMembers(
    classNode: ts.ClassDeclaration,
    sourceFile: ts.SourceFile
  ): AnalyzedSymbol[] {
    const members: AnalyzedSymbol[] = [];

    for (const member of classNode.members) {
      if (ts.isMethodDeclaration(member) && member.name) {
        const name = member.name.getText(sourceFile);
        if (name.startsWith('_') || name.startsWith('#')) continue; // Skip private
        members.push({
          name,
          kind: 'method',
          exportType: 'none',
          startLine: sourceFile.getLineAndCharacterOfPosition(member.getStart(sourceFile)).line + 1,
          endLine: sourceFile.getLineAndCharacterOfPosition(member.getEnd()).line + 1,
        });
      }
    }

    return members;
  }

  private getExportType(node: ts.Node): 'default' | 'named' | 'none' {
    const modifiers = ts.canHaveModifiers(node) ? ts.getModifiers(node) : undefined;
    if (!modifiers) return 'none';

    let hasExport = false;
    let hasDefault = false;
    for (const mod of modifiers) {
      if (mod.kind === ts.SyntaxKind.ExportKeyword) hasExport = true;
      if (mod.kind === ts.SyntaxKind.DefaultKeyword) hasDefault = true;
    }

    if (hasExport && hasDefault) return 'default';
    if (hasExport) return 'named';
    return 'none';
  }

  /**
   * Find the end of a Python indented block starting at the given line.
   */
  private findPythonBlockEnd(lines: string[], startLine: number): number {
    const startIndent = this.getIndent(lines[startLine]);
    let end = startLine;

    for (let i = startLine + 1; i < lines.length; i++) {
      const line = lines[i];
      if (line.trim() === '') continue; // Skip blank lines
      const indent = this.getIndent(line);
      if (indent <= startIndent) break;
      end = i;
    }

    return end;
  }

  /**
   * Extract method definitions within a Python class body.
   */
  private extractPythonMethods(
    lines: string[],
    classStart: number,
    classEnd: number
  ): AnalyzedSymbol[] {
    const methods: AnalyzedSymbol[] = [];
    const classIndent = this.getIndent(lines[classStart]);

    for (let i = classStart + 1; i <= classEnd; i++) {
      const line = lines[i];
      // Match indented def: "    def method_name(self, ...):"
      const methodMatch = line.match(/^(\s+)(?:async\s+)?def\s+([A-Za-z_]\w*)\s*\(/);
      if (methodMatch) {
        const name = methodMatch[2];
        if (name.startsWith('_') && name !== '__init__') continue; // Skip private
        const methodEnd = this.findPythonBlockEnd(lines, i);
        methods.push({
          name,
          kind: 'method',
          exportType: 'none',
          startLine: i + 1,
          endLine: methodEnd + 1,
        });
      }
    }

    return methods;
  }

  private getIndent(line: string): number {
    const match = line.match(/^(\s*)/);
    return match ? match[1].length : 0;
  }
}
