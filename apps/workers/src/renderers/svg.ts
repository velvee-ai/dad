import type { Diagram } from '@dad/shared-types';
import { renderD2, type D2RenderOptions } from './d2-renderer';
import { renderMermaid, type MermaidRenderOptions } from './mermaid-renderer';

export interface SVGRenderOptions {
  theme?: string;
  layout?: string;
  optimize?: boolean;
  // D2 specific
  sketch?: boolean;
  pad?: number;
  // Mermaid specific
  backgroundColor?: string;
  width?: number;
  height?: number;
}

export interface SVGRenderResult {
  svg: string;
  format: 'd2' | 'mermaid';
  success: boolean;
  error?: string;
}

/**
 * Render diagram to SVG using D2
 */
export async function renderD2ToSVG(
  diagram: Diagram,
  options: SVGRenderOptions = {}
): Promise<SVGRenderResult> {
  try {
    const d2Options: D2RenderOptions = {
      theme: options.theme as any,
      layout: options.layout as any,
      sketch: options.sketch,
      pad: options.pad,
    };

    const svg = await renderD2(diagram, d2Options);

    return {
      svg,
      format: 'd2',
      success: true,
    };
  } catch (error) {
    return {
      svg: '',
      format: 'd2',
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Render diagram to SVG using Mermaid
 */
export async function renderMermaidToSVG(
  diagram: Diagram,
  options: SVGRenderOptions = {}
): Promise<SVGRenderResult> {
  try {
    const mermaidOptions: MermaidRenderOptions = {
      theme: options.theme as any,
      backgroundColor: options.backgroundColor,
      width: options.width,
      height: options.height,
    };

    const svg = await renderMermaid(diagram, mermaidOptions);

    return {
      svg,
      format: 'mermaid',
      success: true,
    };
  } catch (error) {
    return {
      svg: '',
      format: 'mermaid',
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Optimize SVG output using SVGO
 */
export async function optimizeSVG(svg: string): Promise<string> {
  try {
    // Dynamic import for SVGO (better for Cloudflare Workers)
    const { optimize } = await import('svgo');

    const result = optimize(svg, {
      multipass: true,
      plugins: [
        {
          name: 'preset-default',
          params: {
            overrides: {
              // Keep viewBox for proper scaling
              removeViewBox: false,
              // Keep IDs for interactivity
              cleanupIds: false,
            },
          },
        },
        // Remove unnecessary metadata
        'removeMetadata',
        // Remove comments
        'removeComments',
        // Minify styles
        'minifyStyles',
        // Remove hidden elements
        'removeHiddenElems',
        // Optimize transforms
        'convertTransform',
        // Merge paths where possible
        'mergePaths',
      ],
    });

    return result.data;
  } catch (error) {
    console.error('Error optimizing SVG:', error);
    // Return original SVG if optimization fails
    return svg;
  }
}

/**
 * Main function to render diagram to SVG
 * Supports both D2 and Mermaid formats
 */
export async function renderDiagramToSVG(
  diagram: Diagram,
  format: 'd2' | 'mermaid',
  options: SVGRenderOptions = {}
): Promise<SVGRenderResult> {
  let result: SVGRenderResult;

  if (format === 'd2') {
    result = await renderD2ToSVG(diagram, options);
  } else {
    result = await renderMermaidToSVG(diagram, options);
  }

  // Optimize SVG if requested
  if (result.success && options.optimize && result.svg) {
    result.svg = await optimizeSVG(result.svg);
  }

  return result;
}
