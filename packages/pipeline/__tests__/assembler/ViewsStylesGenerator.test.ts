import { describe, it, expect } from 'vitest';
import { ViewsStylesGenerator } from '../../src/assembler/ViewsStylesGenerator';
import type { DadNode } from '../../src/types';

describe('ViewsStylesGenerator', () => {
  const generator = new ViewsStylesGenerator();

  const sampleNodes: DadNode[] = [
    {
      id: 'landscape:acme',
      c4Level: 'landscape',
      name: 'Acme Corp',
      type: 'landscape',
      designSpec: '',
      documentation: '',
      parentId: null,
      childIds: ['system:ecommerce'],
    },
    {
      id: 'system:ecommerce',
      c4Level: 'context',
      name: 'E-Commerce',
      type: 'softwareSystem',
      designSpec: '',
      documentation: '',
      parentId: 'landscape:acme',
      childIds: ['container:api-gateway', 'container:user-service'],
    },
    {
      id: 'container:api-gateway',
      c4Level: 'container',
      name: 'API Gateway',
      type: 'container',
      designSpec: '',
      documentation: '',
      parentId: 'system:ecommerce',
      childIds: ['component:auth-routes'],
      technology: 'TypeScript/Express',
    },
    {
      id: 'container:user-service',
      c4Level: 'container',
      name: 'User Service',
      type: 'container',
      designSpec: '',
      documentation: '',
      parentId: 'system:ecommerce',
      childIds: [],
      technology: 'TypeScript/Express',
    },
    {
      id: 'component:auth-routes',
      c4Level: 'component',
      name: 'Auth Routes',
      type: 'component',
      designSpec: '',
      documentation: '',
      parentId: 'container:api-gateway',
      childIds: [],
    },
  ];

  describe('generateViews', () => {
    it('should generate a system landscape view', () => {
      const views = generator.generateViews(sampleNodes);
      expect(views.systemLandscape).toBeDefined();
      expect(views.systemLandscape!.key).toBe('landscape');
      expect(views.systemLandscape!.scopeId).toBe('landscape:acme');
    });

    it('should generate system context views per softwareSystem', () => {
      const views = generator.generateViews(sampleNodes);
      expect(views.systemContext).toBeDefined();
      expect(views.systemContext!.length).toBe(1);
      expect(views.systemContext![0].scopeId).toBe('system:ecommerce');
    });

    it('should generate container views per softwareSystem', () => {
      const views = generator.generateViews(sampleNodes);
      expect(views.container).toBeDefined();
      expect(views.container!.length).toBe(1);
      expect(views.container![0].scopeId).toBe('system:ecommerce');
    });

    it('should generate component views only for containers with children', () => {
      const views = generator.generateViews(sampleNodes);
      expect(views.component).toBeDefined();
      // Only api-gateway has childIds, user-service doesn't
      expect(views.component!.length).toBe(1);
      expect(views.component![0].scopeId).toBe('container:api-gateway');
    });

    it('should include autoLayout for all views', () => {
      const views = generator.generateViews(sampleNodes);
      expect(views.systemLandscape!.autoLayout).toBeDefined();
      expect(views.systemLandscape!.autoLayout.direction).toBe('tb');

      for (const view of views.systemContext || []) {
        expect(view.autoLayout).toBeDefined();
      }
    });
  });

  describe('generateStyles', () => {
    it('should include element styles', () => {
      const styles = generator.generateStyles();
      expect(styles.elements.length).toBeGreaterThan(0);

      const personStyle = styles.elements.find(s => s.tag === 'Person');
      expect(personStyle).toBeDefined();
      expect(personStyle!.shape).toBe('Person');

      const containerStyle = styles.elements.find(s => s.tag === 'Container');
      expect(containerStyle).toBeDefined();

      const dataStoreStyle = styles.elements.find(s => s.tag === 'Data Store');
      expect(dataStoreStyle).toBeDefined();
      expect(dataStoreStyle!.shape).toBe('Cylinder');
    });

    it('should include relationship styles', () => {
      const styles = generator.generateStyles();
      expect(styles.relationships.length).toBeGreaterThan(0);

      const syncStyle = styles.relationships.find(s => s.tag === 'sync');
      expect(syncStyle).toBeDefined();
      expect(syncStyle!.dashed).toBe(false);

      const asyncStyle = styles.relationships.find(s => s.tag === 'async');
      expect(asyncStyle).toBeDefined();
      expect(asyncStyle!.dashed).toBe(true);
    });
  });
});
