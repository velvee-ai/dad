import type { Diagram } from '@dad/shared-types';
import { toD2 } from '@dad/diagram-schema';

export interface D2RenderOptions {
  theme?: 'default' | 'dark' | 'light' | 'terminal';
  layout?: 'dagre' | 'elk';
  sketch?: boolean;
  pad?: number;
}

/**
 * D2 Renderer for Cloudflare Workers
 *
 * Since Cloudflare Workers don't support native subprocess execution,
 * we have several implementation options:
 *
 * 1. External Rendering Service: Call a dedicated D2 rendering service
 * 2. Durable Objects: Use Durable Objects with D2 binary
 * 3. WebAssembly: Use D2 compiled to WASM (if available)
 * 4. Proxy to another service: Forward to a Node.js service with D2 installed
 */

/**
 * Render D2 diagram to SVG
 * This implementation uses an external rendering service
 */
export async function renderD2(
  diagram: Diagram,
  options: D2RenderOptions = {}
): Promise<string> {
  const d2Source = toD2(diagram);

  // Option 1: Use external rendering service
  // Uncomment and configure when service is available
  /*
  const renderServiceUrl = process.env.D2_RENDER_SERVICE_URL || 'https://d2-renderer.example.com/render';

  const response = await fetch(renderServiceUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      source: d2Source,
      theme: options.theme || 'default',
      layout: options.layout || 'dagre',
      sketch: options.sketch || false,
      pad: options.pad || 100,
    }),
  });

  if (!response.ok) {
    throw new Error(`D2 rendering service failed: ${response.statusText}`);
  }

  const result = await response.json();
  return result.svg;
  */

  // Option 2: For development/testing - return placeholder SVG
  return generatePlaceholderSVG(diagram, 'd2', options);
}

/**
 * Generate a placeholder SVG for testing/development
 * This creates a simple SVG representation of the diagram structure
 */
function generatePlaceholderSVG(
  diagram: Diagram,
  renderer: string,
  options: D2RenderOptions
): string {
  const width = 800;
  const height = 600;
  const theme = options.theme || 'default';

  const nodeCount = diagram.nodes.length;
  const edgeCount = diagram.edges.length;

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <defs>
    <style>
      .bg { fill: ${theme === 'dark' ? '#1e1e1e' : '#ffffff'}; }
      .text { fill: ${theme === 'dark' ? '#ffffff' : '#000000'}; font-family: Arial, sans-serif; }
      .node { fill: ${theme === 'dark' ? '#2d2d2d' : '#e8e8e8'}; stroke: ${theme === 'dark' ? '#666' : '#333'}; stroke-width: 2; }
      .edge { stroke: ${theme === 'dark' ? '#666' : '#333'}; stroke-width: 2; fill: none; }
      .label { font-size: 14px; }
      .title { font-size: 20px; font-weight: bold; }
      .info { font-size: 12px; fill: #888; }
    </style>
  </defs>

  <rect class="bg" width="${width}" height="${height}"/>

  <text class="text title" x="${width / 2}" y="40" text-anchor="middle">
    ${diagram.metadata?.summary || 'Diagram Visualization'}
  </text>

  <text class="text info" x="${width / 2}" y="70" text-anchor="middle">
    Rendered with: ${renderer.toUpperCase()} | Nodes: ${nodeCount} | Edges: ${edgeCount}
  </text>

  <text class="text info" x="${width / 2}" y="90" text-anchor="middle">
    Theme: ${theme} | Layout: ${options.layout || 'dagre'}
  </text>

  <g transform="translate(${width / 2 - 150}, 150)">
    ${diagram.nodes.slice(0, 5).map((node, i) => `
    <g transform="translate(0, ${i * 80})">
      <rect class="node" x="0" y="0" width="300" height="60" rx="5"/>
      <text class="text label" x="150" y="35" text-anchor="middle">${escapeXml(node.label)}</text>
    </g>
    `).join('')}
  </g>

  <text class="text info" x="${width / 2}" y="${height - 40}" text-anchor="middle">
    Note: This is a placeholder. Configure D2 CLI or rendering service for production use.
  </text>

  <text class="text info" x="${width / 2}" y="${height - 20}" text-anchor="middle">
    Language: ${diagram.metadata?.language || 'unknown'} | Generated: ${new Date().toISOString()}
  </text>
</svg>`;
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
 * Configuration helper for D2 rendering service
 */
export interface D2ServiceConfig {
  url: string;
  apiKey?: string;
  timeout?: number;
}

let d2ServiceConfig: D2ServiceConfig | null = null;

export function configureD2Service(config: D2ServiceConfig) {
  d2ServiceConfig = config;
}

export function getD2ServiceConfig(): D2ServiceConfig | null {
  return d2ServiceConfig;
}
