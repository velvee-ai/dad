import type { Diagram, DiagramNode, DiagramEdge } from '@daad/shared-types';

/**
 * Convert diagram to D2 format
 */
export function toD2(diagram: Diagram): string {
  const lines: string[] = [];

  // Add metadata as comment
  if (diagram.metadata) {
    lines.push(`# Language: ${diagram.metadata.language}`);
    if (diagram.metadata.summary) {
      lines.push(`# Summary: ${diagram.metadata.summary}`);
    }
    lines.push('');
  }

  // Add nodes
  diagram.nodes.forEach(node => {
    const shape = getD2Shape(node.type);
    const label = node.label.replace(/\n/g, '\\n');
    lines.push(`${node.id}: ${label} {`);
    lines.push(`  shape: ${shape}`);
    if (node.description) {
      lines.push(`  tooltip: ${node.description.replace(/\n/g, '\\n')}`);
    }
    lines.push('}');
    lines.push('');
  });

  // Add edges
  diagram.edges.forEach(edge => {
    const label = edge.label ? `: ${edge.label}` : '';
    const style = edge.type === 'conditional' ? ' {style.stroke-dash: 3}' : '';
    lines.push(`${edge.source} -> ${edge.target}${label}${style}`);
  });

  return lines.join('\n');
}

function getD2Shape(nodeType: string): string {
  const shapeMap: Record<string, string> = {
    start: 'oval',
    end: 'oval',
    process: 'rectangle',
    decision: 'diamond',
    loop: 'hexagon',
    call: 'cloud',
    return: 'rectangle',
  };
  return shapeMap[nodeType] || 'rectangle';
}

/**
 * Convert diagram to Mermaid format
 */
export function toMermaid(diagram: Diagram): string {
  const lines: string[] = ['flowchart TD'];

  // Add nodes
  diagram.nodes.forEach(node => {
    const shape = getMermaidShape(node.type);
    const label = node.label.replace(/"/g, '\\"');
    lines.push(`  ${node.id}${shape.start}"${label}"${shape.end}`);
  });

  // Add edges
  diagram.edges.forEach(edge => {
    const arrow = edge.type === 'conditional' ? '-.->' : '-->';
    const label = edge.label ? `|${edge.label}|` : '';
    lines.push(`  ${edge.source} ${arrow}${label} ${edge.target}`);
  });

  return lines.join('\n');
}

function getMermaidShape(nodeType: string): { start: string; end: string } {
  const shapeMap: Record<string, { start: string; end: string }> = {
    start: { start: '([', end: '])' },
    end: { start: '([', end: '])' },
    process: { start: '[', end: ']' },
    decision: { start: '{', end: '}' },
    loop: { start: '[[', end: ']]' },
    call: { start: '>', end: ']' },
    return: { start: '[', end: ']' },
  };
  return shapeMap[nodeType] || { start: '[', end: ']' };
}

/**
 * Convert diagram to JSON string
 */
export function toJSON(diagram: Diagram): string {
  return JSON.stringify(diagram, null, 2);
}

/**
 * Parse diagram from JSON string
 */
export function fromJSON(json: string): Diagram {
  return JSON.parse(json) as Diagram;
}
