import * as fs from 'fs';
import * as path from 'path';
import fg from 'fast-glob';
import type { ScanResult, ContainerMeta, DataStoreMeta, ExternalServiceMeta, SystemMeta, ProfileRelationship, ProfileActor } from '../types';
import type { ProjectProfile } from './types';
import { systemId, containerId, dataStoreId, externalId, slugify } from '../assembler/IdGenerator';

/**
 * Converts a ProjectProfile (LLM output) into a ScanResult that the
 * existing pipeline stages 2-5 can consume unchanged.
 */
export class ProfileToScanResult {
  async convert(profile: ProjectProfile, rootPath: string): Promise<ScanResult> {
    const sysId = systemId(profile.system.name);

    // Build containers
    const containerMeta: ContainerMeta[] = [];
    const containerIds: string[] = [];

    for (const c of profile.containers) {
      const id = containerId(c.name);
      containerIds.push(id);

      // Collect source files from all componentPaths
      const sourceFiles = this.findSourceFiles(rootPath, c.path, c.componentPaths);

      containerMeta.push({
        id,
        name: c.name,
        path: c.path,
        systemId: sysId,
        detectedBy: 'filesystem',
        technology: c.technology,
        sourceFiles,
        envVars: {},
      });
    }

    // Build data stores from both dataStores and messageQueues and objectStores
    const dataStores: DataStoreMeta[] = [];
    const dataStoreIds: string[] = [];

    for (const ds of profile.dataStores) {
      const id = dataStoreId(ds.name);
      dataStoreIds.push(id);
      dataStores.push({
        id,
        name: ds.name,
        image: ds.technology.toLowerCase(),
        technology: ds.technology,
        systemId: sysId,
        detectedBy: 'filesystem',
      });
    }

    // Message queues become data stores with queue subtype
    for (const mq of profile.messageQueues) {
      const id = dataStoreId(mq.name);
      dataStoreIds.push(id);
      dataStores.push({
        id,
        name: mq.name,
        image: mq.technology.toLowerCase(),
        technology: mq.technology,
        systemId: sysId,
        detectedBy: 'filesystem',
      });
    }

    // Object stores become data stores
    for (const os of profile.objectStores) {
      const id = dataStoreId(os.name);
      dataStoreIds.push(id);
      dataStores.push({
        id,
        name: os.name,
        image: os.technology.toLowerCase(),
        technology: os.technology,
        systemId: sysId,
        detectedBy: 'filesystem',
      });
    }

    // Build external services
    const externalServices: ExternalServiceMeta[] = [];
    for (const ext of profile.externalSystems) {
      externalServices.push({
        id: externalId(ext.name),
        name: ext.name,
        technology: ext.technology,
      });
    }

    // Build system
    const system: SystemMeta = {
      id: sysId,
      name: profile.system.name,
      path: '.',
      containerIds,
      dataStoreIds,
    };

    // Convert relationships
    const profileRelationships: ProfileRelationship[] = profile.relationships.map(r => ({
      source: r.source,
      target: r.target,
      label: r.label,
      technology: r.technology,
      tags: r.tags || [],
    }));

    // Convert actors
    const profileActors: ProfileActor[] = profile.actors.map(a => ({
      name: a.name,
      scope: a.scope,
      description: a.description,
    }));

    return {
      projectName: profile.system.name,
      rootPath,
      systems: [system],
      containerMeta,
      dataStores,
      externalServices,
      profileRelationships,
      profileActors,
    };
  }

  /**
   * Find source files for a container.
   *
   * The pipeline contract is: sourceFiles are relative to container.path,
   * so `path.resolve(rootPath, container.path, relFile)` must resolve to
   * the actual file on disk.
   *
   * This is generic — it uses path.relative() to compute the real filesystem
   * relationship between the container directory and each source file,
   * producing correct relative paths regardless of repo layout (Polylith,
   * Nx, monorepos with shared code, symlinks, etc.).
   */
  private findSourceFiles(
    rootPath: string,
    containerPath: string,
    componentPaths: string[]
  ): string[] {
    const allFiles: string[] = [];
    const seen = new Set<string>();
    const containerAbsDir = path.resolve(rootPath, containerPath);

    // Determine which directories to scan
    const dirsToScan = componentPaths.length > 0 ? componentPaths : ['.'];

    for (const compPath of dirsToScan) {
      // Try resolving relative to container path first, then relative to root
      let scanDir = path.resolve(rootPath, containerPath, compPath);

      if (!fs.existsSync(scanDir)) {
        const rootRelative = path.resolve(rootPath, compPath);
        if (fs.existsSync(rootRelative)) {
          scanDir = rootRelative;
        } else {
          continue;
        }
      }

      try {
        const files = fg.sync('**/*.{py,ts,tsx,js,jsx,go,java,kt,rs,rb}', {
          cwd: scanDir,
          ignore: [
            '**/node_modules/**',
            '**/dist/**',
            '**/build/**',
            '**/.venv/**',
            '**/venv/**',
            '**/__pycache__/**',
            '**/cdk.out/**',
            '**/.next/**',
            '**/coverage/**',
            '**/*.test.*',
            '**/*.spec.*',
            '**/test/**',
            '**/tests/**',
          ],
        });

        for (const file of files) {
          // Compute absolute path of the found file
          const fileAbsPath = path.resolve(scanDir, file);
          // Compute path relative to the container directory
          // This ensures path.resolve(rootPath, containerPath, relFile) === fileAbsPath
          const relativePath = path.relative(containerAbsDir, fileAbsPath);

          if (!seen.has(relativePath)) {
            seen.add(relativePath);
            allFiles.push(relativePath);
          }
        }
      } catch {
        // Skip directories we can't read
      }
    }

    return allFiles;
  }
}
