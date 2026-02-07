import * as vscode from 'vscode';
import {
  LanguageClient
} from 'vscode-languageclient/node';
import {
  CallHierarchyItem,
  CallHierarchyIncomingCall,
  CallHierarchyOutgoingCall,
  CallHierarchyPrepareRequest,
  CallHierarchyIncomingCallsRequest,
  CallHierarchyOutgoingCallsRequest,
  DocumentSymbolRequest,
  DefinitionRequest,
  ImplementationRequest,
  HoverRequest,
  SymbolKind,
  DocumentSymbol,
  Location,
  LocationLink,
  Hover,
} from 'vscode-languageserver-protocol';
import { FlowChartData, FlowNode, FlowEdge } from '../../shared/types';

export interface CallGraphNode {
  name: string;
  kind: SymbolKind;
  uri: string;
  range: { start: { line: number; character: number }; end: { line: number; character: number } };
  selectionRange: { start: { line: number; character: number }; end: { line: number; character: number } };
  outgoingCalls: CallGraphNode[];
  incomingCalls: CallGraphNode[];
}

export class FlowExtractor {
  private outputChannel: vscode.OutputChannel;

  constructor(
    private client: LanguageClient,
    outputChannel?: vscode.OutputChannel
  ) {
    this.outputChannel = outputChannel ?? vscode.window.createOutputChannel('DAAD FlowExtractor');
  }

  /**
   * Get all symbols (functions, classes, methods) in a document.
   */
  async getDocumentSymbols(uri: vscode.Uri): Promise<DocumentSymbol[]> {
    const result = await this.client.sendRequest(DocumentSymbolRequest.type, {
      textDocument: { uri: uri.toString() }
    });

    if (!result) return [];

    // DocumentSymbol[] (hierarchical) vs SymbolInformation[] (flat)
    // We prefer hierarchical — check if first item has `children`
    if (result.length > 0 && 'children' in result[0]) {
      return result as DocumentSymbol[];
    }

    // Flat SymbolInformation — convert to DocumentSymbol shape
    return (result as any[]).map(sym => ({
      name: sym.name,
      kind: sym.kind,
      range: sym.location.range,
      selectionRange: sym.location.range,
      children: []
    }));
  }

  /**
   * Prepare a call hierarchy item at the given position.
   */
  async prepareCallHierarchy(uri: vscode.Uri, position: vscode.Position): Promise<CallHierarchyItem[]> {
    const result = await this.client.sendRequest(CallHierarchyPrepareRequest.type, {
      textDocument: { uri: uri.toString() },
      position: { line: position.line, character: position.character }
    });

    return result ?? [];
  }

  /**
   * Get outgoing calls from a call hierarchy item.
   * "What does this function call?"
   */
  async getOutgoingCalls(item: CallHierarchyItem): Promise<CallHierarchyOutgoingCall[]> {
    const result = await this.client.sendRequest(CallHierarchyOutgoingCallsRequest.type, {
      item
    });

    return result ?? [];
  }

  /**
   * Get incoming calls to a call hierarchy item.
   * "What calls this function?"
   */
  async getIncomingCalls(item: CallHierarchyItem): Promise<CallHierarchyIncomingCall[]> {
    const result = await this.client.sendRequest(CallHierarchyIncomingCallsRequest.type, {
      item
    });

    return result ?? [];
  }

  /**
   * Resolve a symbol at the given position to its definition.
   */
  async getDefinition(uri: vscode.Uri, position: vscode.Position): Promise<Location | Location[] | LocationLink[] | null> {
    const result = await this.client.sendRequest(DefinitionRequest.type, {
      textDocument: { uri: uri.toString() },
      position: { line: position.line, character: position.character }
    });

    return result;
  }

  /**
   * Get all implementations of a method/class (for OOP flows).
   */
  async getImplementations(uri: vscode.Uri, position: vscode.Position): Promise<Location | Location[] | LocationLink[] | null> {
    const result = await this.client.sendRequest(ImplementationRequest.type, {
      textDocument: { uri: uri.toString() },
      position: { line: position.line, character: position.character }
    });

    return result;
  }

  /**
   * Get hover information (type signature, docstring) for a symbol.
   */
  async getHover(uri: vscode.Uri, position: vscode.Position): Promise<Hover | null> {
    const result = await this.client.sendRequest(HoverRequest.type, {
      textDocument: { uri: uri.toString() },
      position: { line: position.line, character: position.character }
    });

    return result;
  }

  /**
   * Build a call graph starting from a function at the given position.
   * Recursively expands outgoing calls up to `maxDepth`.
   */
  async buildCallGraph(uri: vscode.Uri, position: vscode.Position, maxDepth: number = 3): Promise<CallGraphNode | null> {
    const items = await this.prepareCallHierarchy(uri, position);
    if (items.length === 0) return null;

    const visited = new Set<string>();
    return this.expandCallGraphNode(items[0], visited, maxDepth);
  }

  private async expandCallGraphNode(
    item: CallHierarchyItem,
    visited: Set<string>,
    depth: number
  ): Promise<CallGraphNode> {
    const nodeKey = `${item.uri}:${item.name}:${item.range.start.line}`;
    visited.add(nodeKey);

    const node: CallGraphNode = {
      name: item.name,
      kind: item.kind,
      uri: item.uri,
      range: item.range,
      selectionRange: item.selectionRange,
      outgoingCalls: [],
      incomingCalls: []
    };

    if (depth <= 0) return node;

    try {
      const outgoing = await this.getOutgoingCalls(item);

      for (const call of outgoing) {
        const callKey = `${call.to.uri}:${call.to.name}:${call.to.range.start.line}`;

        if (visited.has(callKey)) {
          // Avoid infinite recursion — add a stub node
          node.outgoingCalls.push({
            name: call.to.name,
            kind: call.to.kind,
            uri: call.to.uri,
            range: call.to.range,
            selectionRange: call.to.selectionRange,
            outgoingCalls: [],
            incomingCalls: []
          });
          continue;
        }

        const childNode = await this.expandCallGraphNode(call.to, visited, depth - 1);
        node.outgoingCalls.push(childNode);
      }
    } catch (err) {
      this.outputChannel.appendLine(`Failed to get outgoing calls for ${item.name}: ${err}`);
    }

    return node;
  }

  /**
   * Build a FlowChartData from a call graph rooted at the given position.
   * This is the main entry point for generating diagrams from LSP data.
   */
  async buildFlowChart(uri: vscode.Uri, position: vscode.Position, maxDepth: number = 3): Promise<FlowChartData> {
    const callGraph = await this.buildCallGraph(uri, position, maxDepth);

    if (!callGraph) {
      return {
        nodes: [
          { id: 'start', type: 'start', data: { label: 'No call hierarchy' }, position: { x: 0, y: 0 } },
          { id: 'end', type: 'end', data: { label: 'End' }, position: { x: 0, y: 0 } }
        ],
        edges: [
          { id: 'e1', source: 'start', target: 'end' }
        ],
        metadata: { language: 'python', summary: 'No call hierarchy data available' }
      };
    }

    const nodes: FlowNode[] = [];
    const edges: FlowEdge[] = [];
    const nodeIdMap = new Map<string, string>();
    let nodeCounter = 0;

    const getNodeId = (name: string, uri: string, line: number): string => {
      const key = `${uri}:${name}:${line}`;
      if (!nodeIdMap.has(key)) {
        nodeIdMap.set(key, `n${nodeCounter++}`);
      }
      return nodeIdMap.get(key)!;
    };

    // Recursive traversal to build nodes and edges
    const visited = new Set<string>();

    const traverse = (graphNode: CallGraphNode, isRoot: boolean) => {
      const nodeId = getNodeId(graphNode.name, graphNode.uri, graphNode.range.start.line);
      const nodeKey = `${graphNode.uri}:${graphNode.name}:${graphNode.range.start.line}`;

      if (visited.has(nodeKey)) return;
      visited.add(nodeKey);

      const nodeType = this.symbolKindToNodeType(graphNode.kind, isRoot);
      const fileName = graphNode.uri.split('/').pop() ?? '';

      nodes.push({
        id: nodeId,
        type: nodeType,
        data: {
          label: graphNode.name,
          description: `${fileName}:${graphNode.range.start.line + 1}`
        },
        position: { x: 0, y: 0 } // Layout engine will reposition
      });

      for (const child of graphNode.outgoingCalls) {
        const childId = getNodeId(child.name, child.uri, child.range.start.line);

        edges.push({
          id: `e${edges.length}`,
          source: nodeId,
          target: childId,
          type: 'default'
        });

        traverse(child, false);
      }
    };

    traverse(callGraph, true);

    return {
      nodes,
      edges,
      metadata: {
        language: 'python',
        summary: `Call graph from ${callGraph.name} (depth ${maxDepth})`
      }
    };
  }

  /**
   * Build a FlowChartData showing all functions in a document and their call relationships.
   */
  async buildDocumentFlowChart(uri: vscode.Uri): Promise<FlowChartData> {
    const symbols = await this.getDocumentSymbols(uri);
    const functions = this.extractFunctions(symbols);

    if (functions.length === 0) {
      return {
        nodes: [
          { id: 'empty', type: 'process', data: { label: 'No functions found' }, position: { x: 0, y: 0 } }
        ],
        edges: [],
        metadata: { language: 'python', summary: 'No functions found in document' }
      };
    }

    const nodes: FlowNode[] = [];
    const edges: FlowEdge[] = [];
    const nodeIdMap = new Map<string, string>();
    let edgeCounter = 0;

    // Create nodes for each function
    for (let i = 0; i < functions.length; i++) {
      const func = functions[i];
      const nodeId = `fn${i}`;
      nodeIdMap.set(func.name, nodeId);

      nodes.push({
        id: nodeId,
        type: this.symbolKindToNodeType(func.kind, false),
        data: {
          label: func.name,
          description: `Line ${func.selectionRange.start.line + 1}`
        },
        position: { x: 0, y: 0 }
      });
    }

    // For each function, get outgoing calls and link to known functions
    for (let i = 0; i < functions.length; i++) {
      const func = functions[i];
      const sourceId = `fn${i}`;

      try {
        const position = new vscode.Position(
          func.selectionRange.start.line,
          func.selectionRange.start.character
        );

        const items = await this.prepareCallHierarchy(uri, position);
        if (items.length === 0) continue;

        const outgoing = await this.getOutgoingCalls(items[0]);
        for (const call of outgoing) {
          const targetId = nodeIdMap.get(call.to.name);
          if (targetId && targetId !== sourceId) {
            edges.push({
              id: `e${edgeCounter++}`,
              source: sourceId,
              target: targetId,
              type: 'default'
            });
          }
        }
      } catch (err) {
        this.outputChannel.appendLine(`Failed to get calls for ${func.name}: ${err}`);
      }
    }

    const fileName = uri.fsPath.split('/').pop() ?? '';
    return {
      nodes,
      edges,
      metadata: {
        language: 'python',
        summary: `${functions.length} functions in ${fileName}`
      }
    };
  }

  private extractFunctions(symbols: DocumentSymbol[], result: DocumentSymbol[] = []): DocumentSymbol[] {
    for (const sym of symbols) {
      if (
        sym.kind === SymbolKind.Function ||
        sym.kind === SymbolKind.Method ||
        sym.kind === SymbolKind.Class
      ) {
        result.push(sym);
      }
      if (sym.children) {
        this.extractFunctions(sym.children, result);
      }
    }
    return result;
  }

  private symbolKindToNodeType(kind: SymbolKind, isRoot: boolean): FlowNode['type'] {
    if (isRoot) return 'start';

    switch (kind) {
      case SymbolKind.Function:
      case SymbolKind.Method:
        return 'call';
      case SymbolKind.Class:
        return 'process';
      case SymbolKind.Constructor:
        return 'call';
      default:
        return 'process';
    }
  }
}
