import * as vscode from 'vscode';
import { FlowChartData } from '@dad/shared-types';
import { LayoutEngine } from '../utils/layoutEngine';

interface OpenRouterMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface OpenRouterResponse {
  id: string;
  choices: Array<{
    message: {
      role: string;
      content: string;
    };
    finish_reason: string;
  }>;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export class OpenRouterClient {
  private outputChannel: vscode.OutputChannel;
  private apiKey: string | undefined;
  private model: string;
  private apiUrl = 'https://openrouter.ai/api/v1/chat/completions';

  constructor() {
    this.outputChannel = vscode.window.createOutputChannel('DAD');

    // Get configuration
    const config = vscode.workspace.getConfiguration('dad');
    this.apiKey = config.get<string>('openRouterApiKey');
    this.model = config.get<string>('openRouterModel') || 'qwen/qwen-2.5-coder-32b-instruct';
  }

  async analyzeCode(code: string, language: string): Promise<FlowChartData> {
    // Check if API key is configured
    if (!this.apiKey) {
      this.outputChannel.appendLine('ERROR: OpenRouter API key not configured');
      vscode.window.showErrorMessage(
        'OpenRouter API key not found. Please configure it in settings: dad.openRouterApiKey'
      );
      throw new Error('OpenRouter API key not configured');
    }

    // Limit code size to prevent issues
    const MAX_CODE_LENGTH = 2000;
    let truncatedCode = code;
    let wasTruncated = false;

    if (code.length > MAX_CODE_LENGTH) {
      truncatedCode = code.substring(0, MAX_CODE_LENGTH);
      wasTruncated = true;
      this.outputChannel.appendLine(`Code truncated from ${code.length} to ${MAX_CODE_LENGTH} characters`);
    }

    const prompt = this.createSimplifiedPrompt(truncatedCode, language, wasTruncated);

    this.outputChannel.appendLine('=== STARTING OPENROUTER API ANALYSIS ===');
    this.outputChannel.appendLine('API Provider: OpenRouter (HTTP API)');
    this.outputChannel.appendLine(`Model: ${this.model}`);
    this.outputChannel.appendLine(`API Endpoint: ${this.apiUrl}`);
    this.outputChannel.appendLine(`Language: ${language}`);
    this.outputChannel.appendLine(`Code length: ${truncatedCode.length} characters`);

    try {
      const messages: OpenRouterMessage[] = [
        {
          role: 'system',
          content: 'You are a code analysis assistant that generates flow chart JSON. Always respond with valid JSON only, no markdown or explanations.'
        },
        {
          role: 'user',
          content: prompt
        }
      ];

      const response = await this.callOpenRouter(messages);

      this.outputChannel.appendLine('=== OPENROUTER RAW RESPONSE START ===');
      this.outputChannel.appendLine(response.substring(0, 1000));
      if (response.length > 1000) {
        this.outputChannel.appendLine('... (truncated, showing first 1000 chars)');
      }
      this.outputChannel.appendLine('=== OPENROUTER RAW RESPONSE END ===');

      // Parse the response
      let flowChart: FlowChartData;

      try {
        // Remove markdown code blocks if present
        let cleanedResponse = response.trim();
        if (cleanedResponse.startsWith('```json')) {
          cleanedResponse = cleanedResponse.replace(/```json\n?/, '').replace(/\n?```$/, '');
        } else if (cleanedResponse.startsWith('```')) {
          cleanedResponse = cleanedResponse.replace(/```\n?/, '').replace(/\n?```$/, '');
        }

        const parsed = JSON.parse(cleanedResponse);

        // Extract the flow chart from various possible response formats
        if (parsed.flowChart) {
          flowChart = parsed.flowChart;
        } else if (parsed.nodes && parsed.edges) {
          flowChart = parsed;
        } else {
          this.outputChannel.appendLine('Unexpected response format, creating fallback');
          flowChart = await this.createFallbackFlowChart(truncatedCode, language);
        }
      } catch (parseError) {
        this.outputChannel.appendLine(`JSON parse error: ${parseError}`);
        this.outputChannel.appendLine('Attempting to extract JSON from response...');

        // Try to find and extract JSON from the response
        const jsonMatch = response.match(/\{[\s\S]*"nodes"[\s\S]*"edges"[\s\S]*\}/);
        if (jsonMatch) {
          try {
            const extracted = JSON.parse(jsonMatch[0]);
            flowChart = extracted.flowChart || extracted;
          } catch (e) {
            this.outputChannel.appendLine('Failed to parse extracted JSON');
            flowChart = await this.createFallbackFlowChart(truncatedCode, language);
          }
        } else {
          flowChart = await this.createFallbackFlowChart(truncatedCode, language);
        }
      }

      // Validate and fix the flow chart structure
      flowChart = await this.validateAndFixFlowChart(flowChart);

      // Apply smart auto-layout to position nodes properly
      flowChart = await LayoutEngine.applySmartLayout(flowChart);

      this.outputChannel.appendLine('Successfully processed flow chart with auto-layout');
      this.outputChannel.appendLine(`Nodes: ${flowChart.nodes.length}, Edges: ${flowChart.edges.length}`);

      return flowChart;
    } catch (error) {
      this.outputChannel.appendLine(`Failed to process OpenRouter response: ${error}`);
      this.outputChannel.appendLine('Creating fallback visualization...');

      // Return a simple fallback flow chart with auto-layout
      const fallback = await this.createFallbackFlowChart(truncatedCode, language);
      return fallback;
    }
  }

  private async callOpenRouter(messages: OpenRouterMessage[]): Promise<string> {
    const headers = {
      'Authorization': `Bearer ${this.apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://github.com/yourusername/dad', // Optional
      'X-Title': 'DAD - Diagram as a Delivery' // Optional
    };

    const body = {
      model: this.model,
      messages: messages,
      temperature: 0.3, // Lower temperature for more consistent JSON output
      max_tokens: 2000
    };

    this.outputChannel.appendLine(`Making request to OpenRouter API...`);

    const response = await fetch(this.apiUrl, {
      method: 'POST',
      headers: headers,
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      const errorText = await response.text();
      this.outputChannel.appendLine(`API Error: ${response.status} ${response.statusText}`);
      this.outputChannel.appendLine(`Error details: ${errorText}`);
      throw new Error(`OpenRouter API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json() as OpenRouterResponse;

    if (data.usage) {
      this.outputChannel.appendLine(`Token usage: ${data.usage.prompt_tokens} prompt + ${data.usage.completion_tokens} completion = ${data.usage.total_tokens} total`);
    }

    if (!data.choices || data.choices.length === 0) {
      throw new Error('No response from OpenRouter');
    }

    return data.choices[0].message.content;
  }

  private createSimplifiedPrompt(code: string, language: string, wasTruncated: boolean): string {
    const truncateNote = wasTruncated ? '\nNote: Code was truncated to fit size limits.' : '';

    return `Analyze this ${language} code and return ONLY a valid JSON object for a flow chart.${truncateNote}

Return a compact JSON with this exact structure (no markdown, no explanation, just the JSON):
{
  "nodes": [
    {"id": "n1", "type": "start", "data": {"label": "Start"}},
    {"id": "n2", "type": "process", "data": {"label": "Process description"}},
    {"id": "n3", "type": "end", "data": {"label": "End"}}
  ],
  "edges": [
    {"id": "e1", "source": "n1", "target": "n2"},
    {"id": "e2", "source": "n2", "target": "n3"}
  ]
}

Node types allowed: start, process, decision, loop, call, return, end
Keep labels very short (max 20 chars). Limit to 20 nodes max.
For decision nodes, create branches with different edges.

Code to analyze:
\`\`\`${language}
${code}
\`\`\``;
  }

  private async validateAndFixFlowChart(flowChart: any): Promise<FlowChartData> {
    // Ensure basic structure
    if (!flowChart || typeof flowChart !== 'object') {
      return await this.createFallbackFlowChart('', 'unknown');
    }

    // Ensure nodes array exists
    if (!Array.isArray(flowChart.nodes)) {
      flowChart.nodes = [];
    }

    // Ensure edges array exists
    if (!Array.isArray(flowChart.edges)) {
      flowChart.edges = [];
    }

    // Validate and fix nodes
    flowChart.nodes = flowChart.nodes.map((node: any, index: number) => {
      if (!node.id) {
        node.id = `node_${index}`;
      }
      if (!node.type) {
        node.type = 'process';
      }
      if (!node.data) {
        node.data = { label: `Node ${index}` };
      }
      if (!node.data.label) {
        node.data.label = `${node.type} ${index}`;
      }
      // Truncate long labels
      if (node.data.label && node.data.label.length > 50) {
        node.data.label = node.data.label.substring(0, 47) + '...';
      }
      return node;
    });

    // Validate and fix edges
    flowChart.edges = flowChart.edges.map((edge: any, index: number) => {
      if (!edge.id) {
        edge.id = `edge_${index}`;
      }
      // Ensure source and target exist
      if (!edge.source || !edge.target) {
        return null; // Will be filtered out
      }
      return edge;
    }).filter(Boolean);

    // If no nodes, create default ones
    if (flowChart.nodes.length === 0) {
      flowChart.nodes = [
        { id: 'start', type: 'start', data: { label: 'Start' } },
        { id: 'end', type: 'end', data: { label: 'End' } }
      ];
      flowChart.edges = [
        { id: 'e1', source: 'start', target: 'end' }
      ];
    }

    return flowChart;
  }

  private async createFallbackFlowChart(code: string, language: string): Promise<FlowChartData> {
    this.outputChannel.appendLine('Creating fallback flow chart...');

    const nodes: FlowChartData['nodes'] = [
      {
        id: 'start',
        type: 'start',
        data: { label: 'Start', description: `Analyzing ${language} code` },
        position: { x: 0, y: 0 }
      },
      {
        id: 'analyze',
        type: 'process',
        data: { label: 'Code Analysis', description: 'Processing code structure' },
        position: { x: 0, y: 0 }
      }
    ];

    const edges = [
      {
        id: 'e1',
        source: 'start',
        target: 'analyze',
        type: 'default' as const
      }
    ];

    let lastNodeId = 'analyze';

    if (code.includes('if')) {
      const ifNode = {
        id: 'if_detected',
        type: 'decision' as const,
        data: { label: 'Conditional', description: 'if statement detected' },
        position: { x: 0, y: 0 }
      };
      nodes.push(ifNode);
      edges.push({
        id: `e_${edges.length + 1}`,
        source: lastNodeId,
        target: ifNode.id,
        type: 'default' as const
      });
      lastNodeId = ifNode.id;
    }

    if (code.includes('for') || code.includes('while')) {
      const loopNode = {
        id: 'loop_detected',
        type: 'loop' as const,
        data: { label: 'Loop', description: 'loop detected' },
        position: { x: 0, y: 0 }
      };
      nodes.push(loopNode);
      edges.push({
        id: `e_${edges.length + 1}`,
        source: lastNodeId,
        target: loopNode.id,
        type: 'default' as const
      });
      lastNodeId = loopNode.id;
    }

    if (code.includes('function') || code.includes('def') || code.includes('func')) {
      const funcNode = {
        id: 'func_detected',
        type: 'call' as const,
        data: { label: 'Function', description: 'function detected' },
        position: { x: 0, y: 0 }
      };
      nodes.push(funcNode);
      edges.push({
        id: `e_${edges.length + 1}`,
        source: lastNodeId,
        target: funcNode.id,
        type: 'default' as const
      });
      lastNodeId = funcNode.id;
    }

    const endNode = {
      id: 'end',
      type: 'end' as const,
      data: { label: 'End', description: '' },
      position: { x: 0, y: 0 }
    };
    nodes.push(endNode);
    edges.push({
      id: `e_${edges.length + 1}`,
      source: lastNodeId,
      target: 'end',
      type: 'default' as const
    });

    const flowChart = {
      nodes,
      edges,
      metadata: {
        language,
        summary: 'Fallback visualization (API response could not be parsed)'
      }
    };

    return await LayoutEngine.applySmartLayout(flowChart);
  }

  dispose() {
    this.outputChannel.dispose();
  }
}
