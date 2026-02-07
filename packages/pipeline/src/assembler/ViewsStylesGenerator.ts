import type { DadNode, DadViews, DadStyles, ViewConfig } from '../types';
import { slugify } from './IdGenerator';

/**
 * Generates default C4 views and style rules from the assembled node tree.
 */
export class ViewsStylesGenerator {
  /**
   * Auto-create one view per scope:
   * - 1 systemLandscape view
   * - 1 systemContext per softwareSystem
   * - 1 container view per softwareSystem
   * - 1 component view per container that has child components
   */
  generateViews(nodes: DadNode[]): DadViews {
    const views: DadViews = {};

    // System landscape
    const landscapeNode = nodes.find(n => n.type === 'landscape');
    if (landscapeNode) {
      views.systemLandscape = {
        key: 'landscape',
        title: `${landscapeNode.name} \u2014 System Landscape`,
        scopeId: landscapeNode.id,
        include: ['*'],
        autoLayout: { direction: 'tb', rankSeparation: 100, nodeSeparation: 80 },
      };
    }

    // System context views (one per software system)
    const systems = nodes.filter(n => n.type === 'softwareSystem');
    if (systems.length > 0) {
      views.systemContext = systems.map(sys => ({
        key: `context-${slugify(sys.name)}`,
        title: `${sys.name} \u2014 Context`,
        scopeId: sys.id,
        include: ['*'],
        autoLayout: { direction: 'tb' },
      }));
    }

    // Container views (one per software system)
    if (systems.length > 0) {
      views.container = systems.map(sys => ({
        key: `containers-${slugify(sys.name)}`,
        title: `${sys.name} \u2014 Containers`,
        scopeId: sys.id,
        include: ['*'],
        autoLayout: { direction: 'tb', rankSeparation: 120, nodeSeparation: 60 },
      }));
    }

    // Component views (one per container with child components)
    const containers = nodes.filter(
      n => n.type === 'container' && n.childIds.length > 0
    );
    if (containers.length > 0) {
      views.component = containers.map(container => ({
        key: `components-${slugify(container.name)}`,
        title: `${container.name} \u2014 Components`,
        scopeId: container.id,
        include: ['*'],
        autoLayout: { direction: containers.length > 2 ? 'tb' : 'lr' },
      }));
    }

    return views;
  }

  /**
   * Returns a default C4-style palette matching the reference.
   */
  generateStyles(): DadStyles {
    return {
      elements: [
        { tag: 'Person', shape: 'Person', background: '#08427B', color: '#FFFFFF' },
        { tag: 'Software System', shape: 'RoundedBox', background: '#1168BD', color: '#FFFFFF' },
        { tag: 'External System', shape: 'RoundedBox', background: '#777777', color: '#FFFFFF', border: 'dashed' },
        { tag: 'Container', shape: 'RoundedBox', background: '#438DD5', color: '#FFFFFF' },
        { tag: 'Data Store', shape: 'Cylinder', background: '#438DD5', color: '#FFFFFF' },
        { tag: 'Component', shape: 'Component', background: '#85BBF0', color: '#1A1A1A' },
        { tag: 'Code Unit', shape: 'Box', background: '#B8D9F8', color: '#1A1A1A', fontSize: 11 },
        { tag: 'external', border: 'dashed', opacity: 80 },
        { tag: 'critical', stroke: '#FF0000', strokeWidth: 3 },
        { tag: 'deprecated', opacity: 50, border: 'dotted' },
      ],
      relationships: [
        { tag: 'sync', color: '#555555', dashed: false },
        { tag: 'async', color: '#E67E22', dashed: true },
        { tag: 'event-driven', color: '#E67E22', dashed: true },
        { tag: 'data', color: '#3498DB', dashed: false },
        { tag: 'cache', color: '#3498DB', dashed: false },
        { tag: 'external', color: '#7F8C8D', dashed: true },
      ],
    };
  }
}
