import type {
  CallHierarchyIncomingCall,
  CallHierarchyItem,
  CallHierarchyOutgoingCall,
  DocumentSymbol,
  HoverResult,
  LanguageServiceAdapter,
  LSPLocation,
  LSPPosition,
} from '../types';

/**
 * Mock implementation of LanguageServiceAdapter for testing.
 * Returns realistic LSP responses based on pre-configured data.
 */
export class MockLanguageServiceAdapter implements LanguageServiceAdapter {
  private symbolsMap = new Map<string, DocumentSymbol[]>();
  private definitionsMap = new Map<string, LSPLocation[]>();
  private referencesMap = new Map<string, LSPLocation[]>();
  private hoverMap = new Map<string, HoverResult>();
  private callHierarchyMap = new Map<string, CallHierarchyItem[]>();
  private outgoingCallsMap = new Map<string, CallHierarchyOutgoingCall[]>();
  private incomingCallsMap = new Map<string, CallHierarchyIncomingCall[]>();

  /** Register document symbols for a URI */
  registerSymbols(uri: string, symbols: DocumentSymbol[]): void {
    this.symbolsMap.set(uri, symbols);
  }

  /** Register definitions for a key (uri:line:char) */
  registerDefinitions(key: string, locations: LSPLocation[]): void {
    this.definitionsMap.set(key, locations);
  }

  /** Register references for a key (uri:line:char) */
  registerReferences(key: string, locations: LSPLocation[]): void {
    this.referencesMap.set(key, locations);
  }

  /** Register hover result for a key (uri:line:char) */
  registerHover(key: string, hover: HoverResult): void {
    this.hoverMap.set(key, hover);
  }

  /** Register call hierarchy items for a key */
  registerCallHierarchy(key: string, items: CallHierarchyItem[]): void {
    this.callHierarchyMap.set(key, items);
  }

  /** Register outgoing calls for a call hierarchy item name */
  registerOutgoingCalls(itemName: string, calls: CallHierarchyOutgoingCall[]): void {
    this.outgoingCallsMap.set(itemName, calls);
  }

  /** Register incoming calls for a call hierarchy item name */
  registerIncomingCalls(itemName: string, calls: CallHierarchyIncomingCall[]): void {
    this.incomingCallsMap.set(itemName, calls);
  }

  private posKey(uri: string, pos: LSPPosition): string {
    return `${uri}:${pos.line}:${pos.character}`;
  }

  async getDocumentSymbols(uri: string): Promise<DocumentSymbol[]> {
    return this.symbolsMap.get(uri) || [];
  }

  async prepareCallHierarchy(
    uri: string,
    position: LSPPosition
  ): Promise<CallHierarchyItem[]> {
    return this.callHierarchyMap.get(this.posKey(uri, position)) || [];
  }

  async getOutgoingCalls(item: CallHierarchyItem): Promise<CallHierarchyOutgoingCall[]> {
    return this.outgoingCallsMap.get(item.name) || [];
  }

  async getIncomingCalls(item: CallHierarchyItem): Promise<CallHierarchyIncomingCall[]> {
    return this.incomingCallsMap.get(item.name) || [];
  }

  async getDefinition(uri: string, position: LSPPosition): Promise<LSPLocation[]> {
    return this.definitionsMap.get(this.posKey(uri, position)) || [];
  }

  async getReferences(uri: string, position: LSPPosition): Promise<LSPLocation[]> {
    return this.referencesMap.get(this.posKey(uri, position)) || [];
  }

  async getHover(uri: string, position: LSPPosition): Promise<HoverResult | null> {
    return this.hoverMap.get(this.posKey(uri, position)) || null;
  }
}
