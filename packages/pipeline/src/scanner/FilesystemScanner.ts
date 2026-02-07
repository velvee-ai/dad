import * as fs from 'fs';
import * as path from 'path';
import type { ScanResult, SystemMeta } from '../types';
import { systemId } from '../assembler/IdGenerator';
import { ContainerDetector } from './ContainerDetector';
import { DataStoreDetector } from './DataStoreDetector';
import { ExternalServiceRegistry } from './ExternalServiceRegistry';

interface WorkspaceConfig {
  name: string;
  description?: string;
  systems: Array<{
    name: string;
    path: string;
    description?: string;
    team?: string;
  }>;
}

/**
 * Stage 1: Walks the project filesystem and detects containers, data stores,
 * and external services.
 */
export class FilesystemScanner {
  private containerDetector = new ContainerDetector();
  private dataStoreDetector = new DataStoreDetector();
  private externalServiceRegistry = new ExternalServiceRegistry();

  async scan(rootPath: string): Promise<ScanResult> {
    const workspace = this.loadWorkspaceConfig(rootPath);
    const projectName = workspace?.name || path.basename(rootPath);

    const result: ScanResult = {
      projectName,
      rootPath,
      systems: [],
      containerMeta: [],
      dataStores: [],
      externalServices: [],
    };

    if (workspace) {
      // Multi-system workspace (has workspace.json)
      for (const sys of workspace.systems) {
        const sysPath = path.resolve(rootPath, sys.path);
        const sysId = systemId(sys.name);

        const systemMeta: SystemMeta = {
          id: sysId,
          name: this.formatName(sys.name),
          path: sys.path,
          team: sys.team,
          containerIds: [],
          dataStoreIds: [],
        };

        // Detect containers in this system
        const containers = await this.containerDetector.detect(sysPath, sysId);
        for (const c of containers) {
          systemMeta.containerIds.push(c.id);
        }
        result.containerMeta.push(...containers);

        // Detect data stores from docker-compose
        const composeFiles = this.dataStoreDetector.findComposeFiles(sysPath);
        for (const composePath of composeFiles) {
          const parsed = this.dataStoreDetector.parse(composePath, sysId);

          for (const ds of parsed.dataStores) {
            systemMeta.dataStoreIds.push(ds.id);
          }
          result.dataStores.push(...parsed.dataStores);

          // Merge env vars into containers
          for (const [serviceName, envVars] of Object.entries(parsed.serviceEnvVars)) {
            const container = result.containerMeta.find(
              c => path.basename(c.path) === serviceName || c.id === `container:${serviceName}`
            );
            if (container) {
              container.envVars = { ...container.envVars, ...envVars };
            }
          }
        }

        result.systems.push(systemMeta);
      }
    } else {
      // Single-system project (no workspace.json)
      const sysId = systemId(projectName);
      const systemMeta: SystemMeta = {
        id: sysId,
        name: this.formatName(projectName),
        path: '.',
        containerIds: [],
        dataStoreIds: [],
      };

      const containers = await this.containerDetector.detect(rootPath, sysId);
      for (const c of containers) {
        systemMeta.containerIds.push(c.id);
      }
      result.containerMeta.push(...containers);

      const composeFiles = this.dataStoreDetector.findComposeFiles(rootPath);
      for (const composePath of composeFiles) {
        const parsed = this.dataStoreDetector.parse(composePath, sysId);

        for (const ds of parsed.dataStores) {
          systemMeta.dataStoreIds.push(ds.id);
        }
        result.dataStores.push(...parsed.dataStores);

        for (const [serviceName, envVars] of Object.entries(parsed.serviceEnvVars)) {
          const container = result.containerMeta.find(
            c => path.basename(c.path) === serviceName || c.id === `container:${serviceName}`
          );
          if (container) {
            container.envVars = { ...container.envVars, ...envVars };
          }
        }
      }

      result.systems.push(systemMeta);
    }

    // Detect external services from all container dependencies + env vars
    this.detectExternalServices(result);

    return result;
  }

  private loadWorkspaceConfig(rootPath: string): WorkspaceConfig | null {
    const wsPath = path.join(rootPath, 'workspace.json');
    if (!fs.existsSync(wsPath)) return null;

    try {
      const raw = fs.readFileSync(wsPath, 'utf-8');
      return JSON.parse(raw) as WorkspaceConfig;
    } catch {
      return null;
    }
  }

  private detectExternalServices(result: ScanResult): void {
    // Aggregate all deps and env vars across all containers
    const allDeps: Record<string, string> = {};
    const allEnvVars: Record<string, string> = {};

    for (const container of result.containerMeta) {
      if (container.packageJson) {
        Object.assign(allDeps, container.packageJson.dependencies);
      }
      Object.assign(allEnvVars, container.envVars);
    }

    result.externalServices = this.externalServiceRegistry.detect(allDeps, allEnvVars);
  }

  private formatName(name: string): string {
    return name
      .split(/[-_]/)
      .map(w => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ');
  }
}
