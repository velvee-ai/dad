import * as vscode from 'vscode';

export interface CodeSegment {
  name: string;
  type: 'function' | 'class' | 'method' | 'file' | 'block';
  code: string;
  startLine: number;
  endLine: number;
  language: string;
}

export class CodeAnalyzer {
  /**
   * Analyze a file and extract all functions, classes, and methods
   */
  static async analyzeFile(document: vscode.TextDocument): Promise<CodeSegment[]> {
    const segments: CodeSegment[] = [];
    const text = document.getText();
    const language = document.languageId;

    // Get symbols from VSCode's built-in symbol provider
    const symbols = await vscode.commands.executeCommand<vscode.DocumentSymbol[]>(
      'vscode.executeDocumentSymbolProvider',
      document.uri
    );

    if (symbols && symbols.length > 0) {
      // Use VSCode's symbol information
      segments.push(...this.extractFromSymbols(symbols, document, language));
    } else {
      // Fallback to regex-based detection
      segments.push(...this.extractWithRegex(text, language));
    }

    // If no segments found, return the entire file
    if (segments.length === 0) {
      segments.push({
        name: CodeAnalyzer.getFileName(document.uri?.path || document.fileName || 'unknown'),
        type: 'file',
        code: text,
        startLine: 0,
        endLine: document.lineCount - 1,
        language
      });
    }

    return segments;
  }

  /**
   * Extract code segments from VSCode symbols
   */
  private static extractFromSymbols(
    symbols: vscode.DocumentSymbol[],
    document: vscode.TextDocument,
    language: string,
    parentName: string = ''
  ): CodeSegment[] {
    const segments: CodeSegment[] = [];

    for (const symbol of symbols) {
      const fullName = parentName ? `${parentName}.${symbol.name}` : symbol.name;

      // Determine the type based on symbol kind
      let type: CodeSegment['type'] = 'block';
      if (symbol.kind === vscode.SymbolKind.Function) {
        type = 'function';
      } else if (symbol.kind === vscode.SymbolKind.Class) {
        type = 'class';
      } else if (symbol.kind === vscode.SymbolKind.Method) {
        type = 'method';
      }

      // Only include functions, classes, and methods
      if (type !== 'block') {
        const startLine = symbol.range.start.line;
        const endLine = symbol.range.end.line;
        const code = document.getText(symbol.range);

        segments.push({
          name: fullName,
          type,
          code,
          startLine,
          endLine,
          language
        });
      }

      // Recursively process children (e.g., methods within classes)
      if (symbol.children && symbol.children.length > 0) {
        segments.push(...this.extractFromSymbols(
          symbol.children,
          document,
          language,
          fullName
        ));
      }
    }

    return segments;
  }

  /**
   * Fallback regex-based extraction for common languages
   */
  private static extractWithRegex(text: string, language: string): CodeSegment[] {
    const segments: CodeSegment[] = [];
    const lines = text.split('\n');

    const patterns = this.getLanguagePatterns(language);

    for (const pattern of patterns) {
      const regex = new RegExp(pattern.regex, 'gm');
      let match;

      while ((match = regex.exec(text)) !== null) {
        const name = match[1] || 'anonymous';
        const startLine = text.substring(0, match.index).split('\n').length - 1;

        // Try to find the end of the function/class
        const endLine = this.findBlockEnd(lines, startLine, language);

        const code = lines.slice(startLine, endLine + 1).join('\n');

        segments.push({
          name,
          type: pattern.type,
          code,
          startLine,
          endLine,
          language
        });
      }
    }

    return segments;
  }

  /**
   * Get regex patterns for different languages
   */
  private static getLanguagePatterns(language: string): Array<{regex: string, type: CodeSegment['type']}> {
    const patterns: Record<string, Array<{regex: string, type: CodeSegment['type']}>> = {
      javascript: [
        { regex: '(?:async\\s+)?function\\s+(\\w+)\\s*\\(', type: 'function' },
        { regex: '(?:const|let|var)\\s+(\\w+)\\s*=\\s*(?:async\\s+)?\\([^)]*\\)\\s*=>', type: 'function' },
        { regex: 'class\\s+(\\w+)(?:\\s+extends\\s+\\w+)?\\s*{', type: 'class' },
        { regex: '(\\w+)\\s*\\([^)]*\\)\\s*{', type: 'method' }
      ],
      typescript: [
        { regex: '(?:async\\s+)?function\\s+(\\w+)\\s*\\(', type: 'function' },
        { regex: '(?:const|let|var)\\s+(\\w+)\\s*=\\s*(?:async\\s+)?\\([^)]*\\)\\s*=>', type: 'function' },
        { regex: 'class\\s+(\\w+)(?:\\s+extends\\s+\\w+)?(?:\\s+implements\\s+\\w+)?\\s*{', type: 'class' },
        { regex: '(?:public|private|protected)?\\s*(?:static\\s+)?(\\w+)\\s*\\([^)]*\\)\\s*(?::\\s*\\w+)?\\s*{', type: 'method' }
      ],
      python: [
        { regex: 'def\\s+(\\w+)\\s*\\([^)]*\\)\\s*:', type: 'function' },
        { regex: 'class\\s+(\\w+)(?:\\([^)]*\\))?\\s*:', type: 'class' }
      ],
      java: [
        { regex: '(?:public|private|protected)?\\s*(?:static\\s+)?(?:\\w+\\s+)?(\\w+)\\s*\\([^)]*\\)\\s*(?:throws\\s+\\w+)?\\s*{', type: 'method' },
        { regex: 'class\\s+(\\w+)(?:\\s+extends\\s+\\w+)?(?:\\s+implements\\s+[\\w,\\s]+)?\\s*{', type: 'class' }
      ],
      go: [
        { regex: 'func\\s+(?:\\(\\w+\\s+\\*?\\w+\\)\\s+)?(\\w+)\\s*\\([^)]*\\)(?:\\s*\\([^)]*\\))?\\s*{', type: 'function' }
      ]
    };

    return patterns[language] || patterns['javascript'];
  }

  /**
   * Find the end of a code block
   */
  private static findBlockEnd(lines: string[], startLine: number, language: string): number {
    let braceCount = 0;
    let inString = false;
    let stringChar = '';

    // For Python, use indentation
    if (language === 'python') {
      const startIndent = lines[startLine].match(/^\s*/)?.[0].length || 0;
      for (let i = startLine + 1; i < lines.length; i++) {
        const line = lines[i];
        if (line.trim() === '') continue;

        const currentIndent = line.match(/^\s*/)?.[0].length || 0;
        if (currentIndent <= startIndent && line.trim() !== '') {
          return i - 1;
        }
      }
      return lines.length - 1;
    }

    // For brace-based languages
    for (let i = startLine; i < lines.length; i++) {
      const line = lines[i];

      for (let j = 0; j < line.length; j++) {
        const char = line[j];
        const prevChar = j > 0 ? line[j - 1] : '';

        // Handle strings
        if ((char === '"' || char === "'" || char === '`') && prevChar !== '\\') {
          if (!inString) {
            inString = true;
            stringChar = char;
          } else if (char === stringChar) {
            inString = false;
          }
        }

        // Count braces only outside strings
        if (!inString) {
          if (char === '{') braceCount++;
          if (char === '}') braceCount--;

          // Found the closing brace
          if (braceCount === 0 && i > startLine) {
            return i;
          }
        }
      }
    }

    return lines.length - 1;
  }

  /**
   * Get file name from path
   */
  private static getFileName(path: string): string {
    if (!path) {
      return 'unknown';
    }
    const parts = path.split('/');
    const fileName = parts[parts.length - 1];
    return fileName ? fileName.split('.')[0] : 'unknown';
  }

  /**
   * Smart detection: automatically find the most relevant code at cursor position
   */
  static async getSmartSelection(
    document: vscode.TextDocument,
    position: vscode.Position
  ): Promise<CodeSegment | null> {
    const segments = await this.analyzeFile(document);

    // Find the smallest segment containing the cursor position
    const containingSegments = segments.filter(
      seg => position.line >= seg.startLine && position.line <= seg.endLine
    );

    if (containingSegments.length === 0) {
      return null;
    }

    // Return the smallest containing segment (most specific)
    containingSegments.sort((a, b) => {
      const sizeA = a.endLine - a.startLine;
      const sizeB = b.endLine - b.startLine;
      return sizeA - sizeB;
    });

    return containingSegments[0];
  }

  /**
   * Check if a file is too large and needs chunking
   */
  static isFileTooLarge(document: vscode.TextDocument): boolean {
    const MAX_LINES = 500;
    const MAX_CHARS = 10000;

    return document.lineCount > MAX_LINES ||
           document.getText().length > MAX_CHARS;
  }

  /**
   * Split large files into manageable chunks
   */
  static chunkLargeFile(document: vscode.TextDocument): CodeSegment[] {
    const CHUNK_SIZE = 100; // lines per chunk
    const chunks: CodeSegment[] = [];
    const totalLines = document.lineCount;

    for (let i = 0; i < totalLines; i += CHUNK_SIZE) {
      const endLine = Math.min(i + CHUNK_SIZE - 1, totalLines - 1);
      const range = new vscode.Range(i, 0, endLine, document.lineAt(endLine).text.length);

      chunks.push({
        name: `Chunk ${chunks.length + 1} (lines ${i + 1}-${endLine + 1})`,
        type: 'block',
        code: document.getText(range),
        startLine: i,
        endLine: endLine,
        language: document.languageId
      });
    }

    return chunks;
  }
}