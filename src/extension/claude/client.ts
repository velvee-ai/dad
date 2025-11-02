import { spawn } from 'child_process';
import * as vscode from 'vscode';
import { FlowChartData } from '../../shared/types';

export class ClaudeClient {
  private outputChannel: vscode.OutputChannel;

  constructor() {
    this.outputChannel = vscode.window.createOutputChannel('Claude Flow Visualizer');
  }

  async analyzeCode(code: string, language: string): Promise<FlowChartData> {
    return new Promise((resolve, reject) => {
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

      this.outputChannel.appendLine('=== STARTING CLAUDE ANALYSIS ===');
      this.outputChannel.appendLine(`Language: ${language}`);
      this.outputChannel.appendLine(`Code length: ${truncatedCode.length} characters`);
      this.outputChannel.appendLine('Prompt preview (first 200 chars):');
      this.outputChannel.appendLine(prompt.substring(0, 200) + '...');

      // Try a simpler approach - just ask Claude to analyze without JSON format flag
      const claude = spawn('claude', [
        '-p',
        prompt
      ]);

      let output = '';
      let error = '';
      const chunks: string[] = [];

      claude.stdout.on('data', (data) => {
        const chunk = data.toString();
        chunks.push(chunk);
        output += chunk;
      });

      claude.stderr.on('data', (data) => {
        error += data.toString();
      });

      claude.on('close', (exitCode) => {
        if (exitCode !== 0) {
          this.outputChannel.appendLine(`Claude process exited with code ${exitCode}`);
          this.outputChannel.appendLine(`Error: ${error}`);
          reject(new Error(`Claude process failed: ${error}`));
          return;
        }

        this.outputChannel.appendLine(`Claude process completed with exit code: ${exitCode}`);
        this.outputChannel.appendLine(`Total output length: ${output.length} characters`);

        if (output.length === 0) {
          this.outputChannel.appendLine('ERROR: No output received from Claude!');
          this.outputChannel.appendLine('This might mean Claude is not properly installed or authenticated.');
          reject(new Error('No output received from Claude. Please check Claude installation.'));
          return;
        }

        try {
          this.outputChannel.appendLine('=== CLAUDE RAW RESPONSE START ===');
          this.outputChannel.appendLine(output.substring(0, 1000));
          if (output.length > 1000) {
            this.outputChannel.appendLine('... (truncated, showing first 1000 chars)');
          }
          this.outputChannel.appendLine('=== CLAUDE RAW RESPONSE END ===');

          // Try to parse the response
          let flowChart: FlowChartData;

          try {
            const response = JSON.parse(output);

            // Extract the flow chart from various possible response formats
            if (response.flowChart) {
              flowChart = response.flowChart;
            } else if (response.content) {
              // Sometimes Claude returns content as a string that needs parsing
              if (typeof response.content === 'string') {
                // Try to extract JSON from the content string
                const jsonMatch = response.content.match(/\{[\s\S]*\}/);
                if (jsonMatch) {
                  const parsed = JSON.parse(jsonMatch[0]);
                  flowChart = parsed.flowChart || parsed;
                } else {
                  throw new Error('No JSON found in content');
                }
              } else {
                flowChart = response.content.flowChart || response.content;
              }
            } else if (response.nodes && response.edges) {
              // Direct flow chart structure
              flowChart = response;
            } else {
              // Fallback: create a simple flow chart
              flowChart = this.createFallbackFlowChart(truncatedCode, language);
            }
          } catch (parseError) {
            this.outputChannel.appendLine(`JSON parse error: ${parseError}`);
            this.outputChannel.appendLine('Attempting to extract JSON from response...');

            // Try to find and extract JSON from the response
            const jsonMatch = output.match(/\{[\s\S]*"nodes"[\s\S]*"edges"[\s\S]*\}/);
            if (jsonMatch) {
              try {
                const extracted = JSON.parse(jsonMatch[0]);
                flowChart = extracted.flowChart || extracted;
              } catch (e) {
                this.outputChannel.appendLine('Failed to parse extracted JSON');
                flowChart = this.createFallbackFlowChart(truncatedCode, language);
              }
            } else {
              flowChart = this.createFallbackFlowChart(truncatedCode, language);
            }
          }

          // Validate and fix the flow chart structure
          flowChart = this.validateAndFixFlowChart(flowChart);

          // Add default positions if not provided
          if (flowChart.nodes) {
            flowChart.nodes = flowChart.nodes.map((node, index) => ({
              ...node,
              position: node.position || { x: 250, y: index * 100 }
            }));
          }

          this.outputChannel.appendLine('Successfully processed flow chart');
          resolve(flowChart);
        } catch (err) {
          this.outputChannel.appendLine(`Failed to process Claude response: ${err}`);
          this.outputChannel.appendLine('Creating fallback visualization...');

          // Return a simple fallback flow chart
          const fallback = this.createFallbackFlowChart(truncatedCode, language);
          resolve(fallback);
        }
      });

      claude.on('error', (err) => {
        this.outputChannel.appendLine(`Failed to spawn Claude: ${err}`);
        reject(new Error(`Failed to spawn Claude process: ${err}`));
      });

      // Don't send anything to stdin - the prompt already includes the code
      claude.stdin.end();
    });
  }

  private createSimplifiedPrompt(code: string, language: string, wasTruncated: boolean): string {
    const truncateNote = wasTruncated ? '\nNote: Code was truncated to fit size limits.' : '';

    return `Analyze this ${language} code and return ONLY a valid JSON object for a flow chart.${truncateNote}

Return a compact JSON with this exact structure (no extra text):
{
  "nodes": [
    {"id": "n1", "type": "start", "data": {"label": "Start"}},
    {"id": "n2", "type": "process", "data": {"label": "Process"}},
    {"id": "n3", "type": "end", "data": {"label": "End"}}
  ],
  "edges": [
    {"id": "e1", "source": "n1", "target": "n2"},
    {"id": "e2", "source": "n2", "target": "n3"}
  ]
}

Node types: start, process, decision, loop, call, return, end
Keep labels very short (max 20 chars). Limit to 20 nodes max.

Code to analyze:
${code}`;
  }

  private validateAndFixFlowChart(flowChart: any): FlowChartData {
    // Ensure basic structure
    if (!flowChart || typeof flowChart !== 'object') {
      return this.createFallbackFlowChart('', 'unknown');
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

  private createFallbackFlowChart(code: string, language: string): FlowChartData {
    this.outputChannel.appendLine('Creating fallback flow chart...');

    // Create a simple flow chart based on code structure
    const nodes: FlowChartData['nodes'] = [
      {
        id: 'start',
        type: 'start',
        data: { label: 'Start', description: `Analyzing ${language} code` },
        position: { x: 250, y: 0 }
      },
      {
        id: 'analyze',
        type: 'process',
        data: { label: 'Code Analysis', description: 'Processing code structure' },
        position: { x: 250, y: 100 }
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

    // Add some basic detection for common patterns
    let nodeY = 200;
    let lastNodeId = 'analyze';

    if (code.includes('if')) {
      const ifNode = {
        id: 'if_detected',
        type: 'decision' as const,
        data: { label: 'Conditional', description: 'if statement detected' },
        position: { x: 250, y: nodeY }
      };
      nodes.push(ifNode);
      edges.push({
        id: `e_${edges.length + 1}`,
        source: lastNodeId,
        target: ifNode.id,
        type: 'default' as const
      });
      lastNodeId = ifNode.id;
      nodeY += 100;
    }

    if (code.includes('for') || code.includes('while')) {
      const loopNode = {
        id: 'loop_detected',
        type: 'loop' as const,
        data: { label: 'Loop', description: 'loop detected' },
        position: { x: 250, y: nodeY }
      };
      nodes.push(loopNode);
      edges.push({
        id: `e_${edges.length + 1}`,
        source: lastNodeId,
        target: loopNode.id,
        type: 'default' as const
      });
      lastNodeId = loopNode.id;
      nodeY += 100;
    }

    if (code.includes('function') || code.includes('def') || code.includes('func')) {
      const funcNode = {
        id: 'func_detected',
        type: 'call' as const,
        data: { label: 'Function', description: 'function detected' },
        position: { x: 250, y: nodeY }
      };
      nodes.push(funcNode);
      edges.push({
        id: `e_${edges.length + 1}`,
        source: lastNodeId,
        target: funcNode.id,
        type: 'default' as const
      });
      lastNodeId = funcNode.id;
      nodeY += 100;
    }

    // Add end node
    const endNode = {
      id: 'end',
      type: 'end' as const,
      data: { label: 'End', description: '' },
      position: { x: 250, y: nodeY }
    };
    nodes.push(endNode);
    edges.push({
      id: `e_${edges.length + 1}`,
      source: lastNodeId,
      target: 'end',
      type: 'default' as const
    });

    return {
      nodes,
      edges,
      metadata: {
        language,
        summary: 'Fallback visualization (Claude response could not be parsed)'
      }
    };
  }

  dispose() {
    this.outputChannel.dispose();
  }
}