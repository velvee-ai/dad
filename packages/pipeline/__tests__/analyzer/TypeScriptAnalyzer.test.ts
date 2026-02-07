import { describe, it, expect } from 'vitest';
import { MockLanguageServiceAdapter } from '../../src/analyzer/LanguageServiceAdapter';
import { CodeAnalyzer } from '../../src/analyzer/CodeAnalyzer';
import type { DocumentSymbol } from '../../src/types';

describe('CodeAnalyzer', () => {
  it('should extract symbols from a TypeScript file', async () => {
    const adapter = new MockLanguageServiceAdapter();
    const uri = 'file:///project/src/controllers/userController.ts';

    // Register mock symbols for userController.ts
    const symbols: DocumentSymbol[] = [
      {
        name: 'UserController',
        kind: 'class',
        range: { start: { line: 5, character: 0 }, end: { line: 65, character: 1 } },
        selectionRange: { start: { line: 5, character: 13 }, end: { line: 5, character: 27 } },
        children: [
          {
            name: 'registerUser',
            kind: 'method',
            range: { start: { line: 10, character: 2 }, end: { line: 45, character: 3 } },
            selectionRange: { start: { line: 10, character: 8 }, end: { line: 10, character: 20 } },
            detail: 'Handles user registration request',
          },
          {
            name: 'getUserProfile',
            kind: 'method',
            range: { start: { line: 47, character: 2 }, end: { line: 65, character: 3 } },
            selectionRange: { start: { line: 47, character: 8 }, end: { line: 47, character: 22 } },
            detail: 'Retrieves user profile',
          },
        ],
      },
    ];
    adapter.registerSymbols(uri, symbols);

    const analyzer = new CodeAnalyzer(adapter);
    const result = await analyzer.analyzeFile(
      uri,
      'src/controllers/userController.ts',
      'typescript',
      'container:user-service'
    );

    expect(result.filePath).toBe('src/controllers/userController.ts');
    expect(result.language).toBe('typescript');
    expect(result.containerId).toBe('container:user-service');

    // Should find the UserController class
    expect(result.symbols.length).toBe(1);
    expect(result.symbols[0].name).toBe('UserController');
    expect(result.symbols[0].kind).toBe('class');

    // Should find methods as members
    expect(result.symbols[0].members).toBeDefined();
    expect(result.symbols[0].members!.length).toBe(2);
    expect(result.symbols[0].members![0].name).toBe('registerUser');
    expect(result.symbols[0].members![0].kind).toBe('method');
  });

  it('should extract functions from a file', async () => {
    const adapter = new MockLanguageServiceAdapter();
    const uri = 'file:///project/src/utils/helpers.ts';

    const symbols: DocumentSymbol[] = [
      {
        name: 'formatDate',
        kind: 'function',
        range: { start: { line: 1, character: 0 }, end: { line: 5, character: 1 } },
        selectionRange: { start: { line: 1, character: 16 }, end: { line: 1, character: 26 } },
      },
      {
        name: 'parseJSON',
        kind: 'function',
        range: { start: { line: 7, character: 0 }, end: { line: 15, character: 1 } },
        selectionRange: { start: { line: 7, character: 16 }, end: { line: 7, character: 25 } },
      },
    ];
    adapter.registerSymbols(uri, symbols);

    const analyzer = new CodeAnalyzer(adapter);
    const result = await analyzer.analyzeFile(uri, 'src/utils/helpers.ts', 'typescript', 'container:test');

    expect(result.symbols.length).toBe(2);
    expect(result.symbols[0].kind).toBe('function');
    expect(result.symbols[1].kind).toBe('function');
  });

  it('should extract interfaces', async () => {
    const adapter = new MockLanguageServiceAdapter();
    const uri = 'file:///project/src/models/user.ts';

    const symbols: DocumentSymbol[] = [
      {
        name: 'User',
        kind: 'interface',
        range: { start: { line: 1, character: 0 }, end: { line: 10, character: 1 } },
        selectionRange: { start: { line: 1, character: 17 }, end: { line: 1, character: 21 } },
      },
      {
        name: 'UserRole',
        kind: 'enum',
        range: { start: { line: 12, character: 0 }, end: { line: 16, character: 1 } },
        selectionRange: { start: { line: 12, character: 12 }, end: { line: 12, character: 20 } },
      },
    ];
    adapter.registerSymbols(uri, symbols);

    const analyzer = new CodeAnalyzer(adapter);
    const result = await analyzer.analyzeFile(uri, 'src/models/user.ts', 'typescript', 'container:test');

    expect(result.symbols.length).toBe(2);
    expect(result.symbols[0].kind).toBe('interface');
    expect(result.symbols[1].kind).toBe('enum');
  });

  it('should handle empty files gracefully', async () => {
    const adapter = new MockLanguageServiceAdapter();
    const uri = 'file:///project/src/empty.ts';
    // No symbols registered → empty array

    const analyzer = new CodeAnalyzer(adapter);
    const result = await analyzer.analyzeFile(uri, 'src/empty.ts', 'typescript', 'container:test');

    expect(result.symbols).toEqual([]);
    expect(result.imports).toEqual([]);
  });

  it('should filter out irrelevant symbols like modules and namespaces', async () => {
    const adapter = new MockLanguageServiceAdapter();
    const uri = 'file:///project/src/mixed.ts';

    const symbols: DocumentSymbol[] = [
      {
        name: 'utils',
        kind: 'module',
        range: { start: { line: 0, character: 0 }, end: { line: 50, character: 1 } },
        selectionRange: { start: { line: 0, character: 0 }, end: { line: 0, character: 5 } },
      },
      {
        name: 'Helper',
        kind: 'class',
        range: { start: { line: 2, character: 0 }, end: { line: 20, character: 1 } },
        selectionRange: { start: { line: 2, character: 13 }, end: { line: 2, character: 19 } },
      },
    ];
    adapter.registerSymbols(uri, symbols);

    const analyzer = new CodeAnalyzer(adapter);
    const result = await analyzer.analyzeFile(uri, 'src/mixed.ts', 'typescript', 'container:test');

    // Should skip the module symbol, keep only the class
    expect(result.symbols.length).toBe(1);
    expect(result.symbols[0].name).toBe('Helper');
  });
});

describe('MockLanguageServiceAdapter', () => {
  it('should return registered symbols', async () => {
    const adapter = new MockLanguageServiceAdapter();
    const uri = 'file:///test';

    const symbols: DocumentSymbol[] = [
      {
        name: 'TestClass',
        kind: 'class',
        range: { start: { line: 0, character: 0 }, end: { line: 10, character: 0 } },
        selectionRange: { start: { line: 0, character: 0 }, end: { line: 0, character: 9 } },
      },
    ];
    adapter.registerSymbols(uri, symbols);

    const result = await adapter.getDocumentSymbols(uri);
    expect(result).toEqual(symbols);
  });

  it('should return empty array for unregistered URIs', async () => {
    const adapter = new MockLanguageServiceAdapter();
    const result = await adapter.getDocumentSymbols('file:///unknown');
    expect(result).toEqual([]);
  });

  it('should return null for unregistered hover', async () => {
    const adapter = new MockLanguageServiceAdapter();
    const result = await adapter.getHover('file:///test', { line: 0, character: 0 });
    expect(result).toBeNull();
  });
});
