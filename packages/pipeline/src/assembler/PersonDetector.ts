import type { DadNode, DadEdge, ScanResult } from '../types';
import { personId } from './IdGenerator';

interface DetectedPerson {
  node: DadNode;
  edges: DadEdge[];
}

/**
 * Heuristic person detection from container metadata.
 * Runs in the assembler so persons exist even without LLM enrichment.
 */
export class PersonDetector {
  detect(scanResult: ScanResult, landscapeNodeId: string): DetectedPerson[] {
    const results: DetectedPerson[] = [];
    const seenNames = new Set<string>();

    // Check for customer-facing frontends → "Customer" person
    const hasFrontend = scanResult.containerMeta.some(c => {
      const tech = c.technology.toLowerCase();
      return (
        tech.includes('react') ||
        tech.includes('next') ||
        tech.includes('vue') ||
        tech.includes('angular')
      );
    });

    if (hasFrontend && !seenNames.has('Customer')) {
      seenNames.add('Customer');
      const id = personId('Customer');
      const node: DadNode = {
        id,
        c4Level: 'context',
        name: 'Customer',
        type: 'person',
        designSpec: '',
        documentation: 'End user who interacts with the system through a web browser or mobile app.',
        parentId: landscapeNodeId,
        childIds: [],
        scope: 'external',
        tags: ['external-person'],
      };

      const edges: DadEdge[] = [];

      // Find frontend containers to create person→frontend edges
      const frontendContainers = scanResult.containerMeta.filter(c => {
        const tech = c.technology.toLowerCase();
        return (
          tech.includes('react') ||
          tech.includes('next') ||
          tech.includes('vue') ||
          tech.includes('angular')
        );
      });

      for (const frontend of frontendContainers) {
        // Only add edge to customer-facing frontends (not admin)
        if (frontend.name.toLowerCase().includes('admin')) continue;
        edges.push({
          id: `edge:customer-to-${this.slug(frontend.id)}`,
          source: id,
          target: frontend.id,
          label: 'Browses and interacts with',
          technology: 'HTTPS',
          c4Level: 'context',
          tags: ['external'],
        });
      }

      // If no direct frontend, try api-gateway
      if (edges.length === 0) {
        const gateway = scanResult.containerMeta.find(c =>
          c.name.toLowerCase().includes('gateway')
        );
        if (gateway) {
          edges.push({
            id: `edge:customer-to-${this.slug(gateway.id)}`,
            source: id,
            target: gateway.id,
            label: 'Makes API requests to',
            technology: 'HTTPS',
            c4Level: 'context',
            tags: ['external'],
          });
        }
      }

      results.push({ node, edges });
    }

    // Check for admin containers → "Admin User" person
    const adminContainer = scanResult.containerMeta.find(c =>
      c.name.toLowerCase().includes('admin')
    );

    if (adminContainer && !seenNames.has('Admin User')) {
      seenNames.add('Admin User');
      const id = personId('Admin User');
      const node: DadNode = {
        id,
        c4Level: 'context',
        name: 'Admin User',
        type: 'person',
        designSpec: '',
        documentation: 'Internal administrator who manages the platform via admin tools.',
        parentId: landscapeNodeId,
        childIds: [],
        scope: 'internal',
        tags: ['internal-person'],
      };

      const edges: DadEdge[] = [
        {
          id: `edge:admin-to-${this.slug(adminContainer.id)}`,
          source: id,
          target: adminContainer.id,
          label: 'Manages platform via',
          technology: 'HTTPS',
          c4Level: 'context',
          tags: ['internal'],
        },
      ];

      results.push({ node, edges });
    }

    return results;
  }

  private slug(id: string): string {
    return id.replace(/^[a-z]+:/, '');
  }
}
