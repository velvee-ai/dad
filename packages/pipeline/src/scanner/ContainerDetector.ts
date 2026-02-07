import * as fs from 'fs';
import * as path from 'path';
import fg from 'fast-glob';
import type { ContainerMeta } from '../types';
import { containerId, slugify } from '../assembler/IdGenerator';

/** Known framework → technology label mappings */
const FRAMEWORK_MAP: Record<string, string> = {
  express: 'TypeScript/Express',
  fastify: 'TypeScript/Fastify',
  koa: 'TypeScript/Koa',
  hapi: 'TypeScript/Hapi',
  nestjs: 'TypeScript/NestJS',
  '@nestjs/core': 'TypeScript/NestJS',
  next: 'TypeScript/Next.js',
  react: 'TypeScript/React',
  'react-dom': 'TypeScript/React',
  vue: 'TypeScript/Vue',
  angular: 'TypeScript/Angular',
  '@angular/core': 'TypeScript/Angular',
  vite: 'TypeScript/Vite',
};

/**
 * Detects containers (deployable services) by finding package.json or
 * requirements.txt/pyproject.toml in the project.
 */
export class ContainerDetector {
  /**
   * Scan a system directory for containers (services with their own package manifests).
   */
  async detect(systemPath: string, systemId: string): Promise<ContainerMeta[]> {
    const containers: ContainerMeta[] = [];

    // Find package.json files (Node.js containers)
    const packageJsonPaths = await fg('**/package.json', {
      cwd: systemPath,
      ignore: ['**/node_modules/**', '**/dist/**', '**/build/**'],
      absolute: true,
    });

    for (const pkgPath of packageJsonPaths) {
      const container = this.parseNodeContainer(pkgPath, systemPath, systemId);
      if (container) {
        containers.push(container);
      }
    }

    // Find requirements.txt files (Python containers)
    const requirementsPaths = await fg('**/requirements.txt', {
      cwd: systemPath,
      ignore: ['**/node_modules/**', '**/.venv/**', '**/venv/**'],
      absolute: true,
    });

    for (const reqPath of requirementsPaths) {
      const container = await this.parsePythonContainer(reqPath, systemPath, systemId);
      if (container) {
        containers.push(container);
      }
    }

    // Find pyproject.toml files (Python containers, alternative)
    const pyprojectPaths = await fg('**/pyproject.toml', {
      cwd: systemPath,
      ignore: ['**/node_modules/**', '**/.venv/**', '**/venv/**'],
      absolute: true,
    });

    for (const pyPath of pyprojectPaths) {
      const dirPath = path.dirname(pyPath);
      // Skip if we already found this directory via requirements.txt
      const alreadyFound = containers.some(c => path.resolve(systemPath, c.path) === dirPath);
      if (!alreadyFound) {
        const container = await this.parsePythonContainer(pyPath, systemPath, systemId);
        if (container) {
          containers.push(container);
        }
      }
    }

    return containers;
  }

  private parseNodeContainer(
    pkgPath: string,
    systemPath: string,
    systemId: string
  ): ContainerMeta | null {
    try {
      const raw = fs.readFileSync(pkgPath, 'utf-8');
      const pkg = JSON.parse(raw);
      const containerDir = path.dirname(pkgPath);
      const relativePath = path.relative(path.dirname(systemPath), containerDir);

      // Derive name from directory or package name
      const dirName = path.basename(containerDir);
      const name = this.formatName(dirName);

      const deps = pkg.dependencies || {};
      const devDeps = pkg.devDependencies || {};
      const allDeps = { ...devDeps, ...deps };

      const technology = this.inferTechnology(deps);

      // Find source files
      const sourceFiles = this.findSourceFiles(containerDir, ['ts', 'tsx', 'js', 'jsx']);

      return {
        id: containerId(dirName),
        name,
        path: relativePath,
        systemId,
        detectedBy: 'package-json',
        technology,
        packageJson: {
          name: pkg.name || dirName,
          dependencies: deps,
          devDependencies: devDeps,
          scripts: pkg.scripts || {},
        },
        dockerfile: fs.existsSync(path.join(containerDir, 'Dockerfile')),
        sourceFiles,
        envVars: {},
      };
    } catch {
      return null;
    }
  }

  private async parsePythonContainer(
    manifestPath: string,
    systemPath: string,
    systemId: string
  ): Promise<ContainerMeta | null> {
    try {
      const containerDir = path.dirname(manifestPath);
      const relativePath = path.relative(path.dirname(systemPath), containerDir);
      const dirName = path.basename(containerDir);
      const name = this.formatName(dirName);

      const raw = fs.readFileSync(manifestPath, 'utf-8');
      const technology = this.inferPythonTechnology(raw);

      // Build a pseudo dependencies map from requirements.txt
      const deps: Record<string, string> = {};
      if (manifestPath.endsWith('requirements.txt')) {
        for (const line of raw.split('\n')) {
          const trimmed = line.trim();
          if (trimmed && !trimmed.startsWith('#')) {
            const match = trimmed.match(/^([a-zA-Z0-9_-]+)\s*[=<>~!]*(.*)/);
            if (match) {
              deps[match[1].toLowerCase()] = match[2] || '*';
            }
          }
        }
      }

      const sourceFiles = this.findSourceFiles(containerDir, ['py']);

      return {
        id: containerId(dirName),
        name,
        path: relativePath,
        systemId,
        detectedBy: 'package-json', // Close enough — detected by manifest
        technology,
        packageJson: {
          name: dirName,
          dependencies: deps,
          devDependencies: {},
          scripts: {},
        },
        dockerfile: fs.existsSync(path.join(containerDir, 'Dockerfile')),
        sourceFiles,
        envVars: {},
      };
    } catch {
      return null;
    }
  }

  private inferTechnology(deps: Record<string, string>): string {
    for (const [pkg, label] of Object.entries(FRAMEWORK_MAP)) {
      if (deps[pkg]) {
        return label;
      }
    }
    // Default for Node.js
    return 'TypeScript';
  }

  private inferPythonTechnology(content: string): string {
    const lower = content.toLowerCase();
    if (lower.includes('fastapi')) return 'Python/FastAPI';
    if (lower.includes('django')) return 'Python/Django';
    if (lower.includes('flask')) return 'Python/Flask';
    if (lower.includes('confluent-kafka') || lower.includes('kafka')) return 'Python/Kafka';
    return 'Python';
  }

  private formatName(dirName: string): string {
    return dirName
      .split('-')
      .map(w => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ');
  }

  private findSourceFiles(dir: string, extensions: string[]): string[] {
    const pattern = `**/*.{${extensions.join(',')}}`;
    try {
      return fg.sync(pattern, {
        cwd: dir,
        ignore: ['**/node_modules/**', '**/dist/**', '**/build/**', '**/.venv/**'],
      });
    } catch {
      return [];
    }
  }
}
