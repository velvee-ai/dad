import type { Diagram } from '@daad/shared-types';
import { toMermaid } from '@daad/diagram-schema';

export interface MermaidRenderOptions {
  theme?: 'default' | 'dark' | 'forest' | 'neutral';
  backgroundColor?: string;
  width?: number;
  height?: number;
}

/**
 * Mermaid Renderer for Cloudflare Workers
 *
 * Implementation options:
 * 1. Use mermaid-cli (mmdc) via external service
 * 2. Use Puppeteer/Playwright for headless rendering
 * 3. Use mermaid.js library directly (requires browser-like environment)
 * 4. Use external rendering service (e.g., mermaid.ink)
 */

/**
 * Render Mermaid diagram to SVG
 */
export async function renderMermaid(
  diagram: Diagram,
  options: MermaidRenderOptions = {}
): Promise<string> {
  const mermaidSource = toMermaid(diagram);

  // Option 1: Use external rendering service (e.g., mermaid.ink)
  // This is a public service that can render Mermaid diagrams
  // For production, consider self-hosting or using a dedicated service
  /*
  const mermaidInkUrl = 'https://mermaid.ink/svg';
  const encodedDiagram = btoa(mermaidSource);

  const response = await fetch(`${mermaidInkUrl}/${encodedDiagram}`, {
    method: 'GET',
  });

  if (!response.ok) {
    throw new Error(`Mermaid rendering failed: ${response.statusText}`);
  }

  return await response.text();
  */

  // Option 2: Use custom rendering service
  // Uncomment and configure when service is available
  /*
  const renderServiceUrl = process.env.MERMAID_RENDER_SERVICE_URL || 'https://mermaid-renderer.example.com/render';

  const response = await fetch(renderServiceUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      source: mermaidSource,
      theme: options.theme || 'default',
      backgroundColor: options.backgroundColor || 'transparent',
      width: options.width,
      height: options.height,
    }),
  });

  if (!response.ok) {
    throw new Error(`Mermaid rendering service failed: ${response.statusText}`);
  }

  const result = await response.json();
  return result.svg;
  */

  // For development/testing - return placeholder SVG
  return generateMermaidPlaceholderSVG(diagram, options);
}

/**
 * Generate a placeholder SVG for testing/development
 */
function generateMermaidPlaceholderSVG(
  diagram: Diagram,
  options: MermaidRenderOptions
): string {
  const width = options.width || 800;
  const height = options.height || 600;
  const theme = options.theme || 'default';

  const themeColors = {
    default: { bg: '#ffffff', text: '#000000', node: '#e8e8e8', stroke: '#333333' },
    dark: { bg: '#1e1e1e', text: '#ffffff', node: '#2d2d2d', stroke: '#666666' },
    forest: { bg: '#f4f4f4', text: '#333333', node: '#cdebc4', stroke: '#2d6a4f' },
    neutral: { bg: '#f9f9f9', text: '#2d2d2d', node: '#e0e0e0', stroke: '#666666' },
  };

  const colors = themeColors[theme];
  const nodeCount = diagram.nodes.length;
  const edgeCount = diagram.edges.length;

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <defs>
    <style>
      .bg { fill: ${colors.bg}; }
      .text { fill: ${colors.text}; font-family: 'Courier New', monospace; }
      .node { fill: ${colors.node}; stroke: ${colors.stroke}; stroke-width: 2; }
      .edge { stroke: ${colors.stroke}; stroke-width: 2; fill: none; marker-end: url(#arrowhead); }
      .label { font-size: 14px; }
      .title { font-size: 20px; font-weight: bold; }
      .info { font-size: 12px; fill: #888; }
      .node-type { font-size: 10px; fill: #666; }
    </style>
    <marker id="arrowhead" markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto">
      <polygon points="0 0, 10 3, 0 6" fill="${colors.stroke}" />
    </marker>
  </defs>

  <rect class="bg" width="${width}" height="${height}"/>

  <text class="text title" x="${width / 2}" y="40" text-anchor="middle">
    ${diagram.metadata?.summary || 'Mermaid Flow Diagram'}
  </text>

  <text class="text info" x="${width / 2}" y="70" text-anchor="middle">
    Rendered with: Mermaid | Nodes: ${nodeCount} | Edges: ${edgeCount}
  </text>

  <text class="text info" x="${width / 2}" y="90" text-anchor="middle">
    Theme: ${theme} | Language: ${diagram.metadata?.language || 'unknown'}
  </text>

  <g transform="translate(${width / 2 - 150}, 150)">
    ${diagram.nodes.slice(0, 6).map((node, i) => {
      const shapeInfo = getMermaidShapeForNode(node.type);
      return `
    <g transform="translate(0, ${i * 90})">
      ${shapeInfo.svg}
      <text class="text label" x="150" y="35" text-anchor="middle">${escapeXml(node.label)}</text>
      <text class="text node-type" x="150" y="55" text-anchor="middle">${node.type}</text>
    </g>
      `;
    }).join('')}
  </g>

  ${diagram.edges.slice(0, 5).map((edge, i) => {
    const y = 150 + (i * 90) + 30;
    return `<line class="edge" x1="${width / 2 - 130}" y1="${y}" x2="${width / 2 + 130}" y2="${y + 90}" />`;
  }).join('\n  ')}

  <text class="text info" x="${width / 2}" y="${height - 40}" text-anchor="middle">
    Note: This is a placeholder. Configure Mermaid CLI or rendering service for production use.
  </text>

  <text class="text info" x="${width / 2}" y="${height - 20}" text-anchor="middle">
    Generated: ${new Date().toISOString()}
  </text>
</svg>`;
}

function getMermaidShapeForNode(nodeType: string): { svg: string } {
  const shapes: Record<string, string> = {
    start: '<rect class="node" x="50" y="10" width="200" height="50" rx="25"/>',
    end: '<rect class="node" x="50" y="10" width="200" height="50" rx="25"/>',
    process: '<rect class="node" x="50" y="10" width="200" height="50" rx="5"/>',
    decision: '<polygon class="node" points="150,10 250,35 150,60 50,35"/>',
    loop: '<rect class="node" x="50" y="10" width="200" height="50" rx="5" stroke-width="4"/>',
    call: '<polygon class="node" points="50,10 250,10 250,60 50,60"/>',
    return: '<rect class="node" x="50" y="10" width="200" height="50" rx="5"/>',
  };
  return { svg: shapes[nodeType] || shapes.process };
}

function escapeXml(unsafe: string): string {
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Configuration helper for Mermaid rendering service
 */
export interface MermaidServiceConfig {
  url: string;
  apiKey?: string;
  timeout?: number;
  useMermaidInk?: boolean; // Use public mermaid.ink service
}

let mermaidServiceConfig: MermaidServiceConfig | null = null;

export function configureMermaidService(config: MermaidServiceConfig) {
  mermaidServiceConfig = config;
}

export function getMermaidServiceConfig(): MermaidServiceConfig | null {
  return mermaidServiceConfig;
}

/**
 * Render using mermaid.ink public service
 * This is useful for development and testing
 */
export async function renderWithMermaidInk(mermaidSource: string): Promise<string> {
  try {
    // Base64 encode the mermaid source
    const encoder = new TextEncoder();
    const data = encoder.encode(mermaidSource);
    const base64 = btoa(String.fromCharCode(...data));

    const url = `https://mermaid.ink/svg/${base64}`;

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'image/svg+xml',
      },
    });

    if (!response.ok) {
      throw new Error(`Mermaid.ink rendering failed: ${response.statusText}`);
    }

    return await response.text();
  } catch (error) {
    console.error('Error rendering with mermaid.ink:', error);
    throw error;
  }
}
