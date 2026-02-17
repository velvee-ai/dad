import * as fs from 'fs';
import * as path from 'path';
import type { ProjectSkeleton } from './types';

/**
 * Collects a minimal but informative snapshot of a project for LLM profiling.
 *
 * The snapshot includes:
 * 1. File tree (depth 4, excluding build artifacts)
 * 2. Key config files (first 200 lines each)
 * 3. Sample sub-project configs (up to 3 representative samples)
 * 4. IaC file listing (CDK/Terraform/K8s directory contents)
 */
export class SkeletonCollector {
  private static readonly EXCLUDED_DIRS = new Set([
    'node_modules',
    'dist',
    'build',
    '.venv',
    'venv',
    '__pycache__',
    'cdk.out',
    '.git',
    '.next',
    '.nuxt',
    'coverage',
    '.tox',
    '.mypy_cache',
    '.pytest_cache',
    '.eggs',
    '*.egg-info',
    '.terraform',
    'target',
  ]);

  private static readonly ROOT_CONFIG_FILES = [
    'README.md',
    'CLAUDE.md',
    'claude.md',
    'package.json',
    'pyproject.toml',
    'workspace.toml',
    'docker-compose.yml',
    'docker-compose.yaml',
    'workspace.json',
    'nx.json',
    'turbo.json',
    'pnpm-workspace.yaml',
    'lerna.json',
    'rush.json',
    'Cargo.toml',
    'go.mod',
    'settings.gradle',
    'build.gradle',
    'pom.xml',
    'cdk.json',
    '.env.example',
    '.env.template',
  ];

  private static readonly SHORT_CONFIG_FILES = new Set([
    'justfile',
    'Justfile',
    'Makefile',
  ]);

  private static readonly SUB_PROJECT_CONFIGS = [
    'package.json',
    'pyproject.toml',
    'Cargo.toml',
    'go.mod',
    'build.gradle',
    'pom.xml',
  ];

  private static readonly IAC_DIRS = [
    'cdk',
    'infra',
    'infrastructure',
    'terraform',
    'k8s',
    'kubernetes',
    'deploy',
    'deployment',
    'pulumi',
    'cloudformation',
  ];

  async collect(rootPath: string): Promise<ProjectSkeleton> {
    const fileTree = this.buildFileTree(rootPath, '', 0, 4);
    const configFiles = this.readConfigFiles(rootPath);
    const sampleSubProjectConfigs = this.readSubProjectConfigs(rootPath);
    const iacFileListing = this.listIacFiles(rootPath);

    return {
      fileTree,
      configFiles,
      sampleSubProjectConfigs,
      iacFileListing,
    };
  }

  private buildFileTree(dir: string, prefix: string, depth: number, maxDepth: number): string {
    if (depth >= maxDepth) return '';

    let result = '';
    let entries: fs.Dirent[];

    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      return '';
    }

    // Sort: directories first, then files
    entries.sort((a, b) => {
      if (a.isDirectory() && !b.isDirectory()) return -1;
      if (!a.isDirectory() && b.isDirectory()) return 1;
      return a.name.localeCompare(b.name);
    });

    for (const entry of entries) {
      if (this.isExcluded(entry.name)) continue;
      if (entry.name.startsWith('.') && !entry.name.startsWith('.env')) continue;

      if (entry.isDirectory()) {
        result += `${prefix}${entry.name}/\n`;
        result += this.buildFileTree(
          path.join(dir, entry.name),
          prefix + '  ',
          depth + 1,
          maxDepth,
        );
      } else {
        result += `${prefix}${entry.name}\n`;
      }
    }

    return result;
  }

  private isExcluded(name: string): boolean {
    if (SkeletonCollector.EXCLUDED_DIRS.has(name)) return true;
    if (name.endsWith('.egg-info')) return true;
    return false;
  }

  private readConfigFiles(rootPath: string): Array<{ path: string; content: string }> {
    const configs: Array<{ path: string; content: string }> = [];

    for (const configFile of SkeletonCollector.ROOT_CONFIG_FILES) {
      const filePath = path.join(rootPath, configFile);
      const content = this.readFileTruncated(filePath, 200);
      if (content !== null) {
        configs.push({ path: configFile, content });
      }
    }

    // Short config files (first 50 lines)
    for (const configFile of SkeletonCollector.SHORT_CONFIG_FILES) {
      const filePath = path.join(rootPath, configFile);
      const content = this.readFileTruncated(filePath, 50);
      if (content !== null) {
        configs.push({ path: configFile, content });
      }
    }

    return configs;
  }

  private readSubProjectConfigs(rootPath: string): Array<{ path: string; content: string }> {
    const configs: Array<{ path: string; content: string }> = [];
    const maxSamples = 3;

    // Look for sub-directories that have their own project configs
    let topDirs: string[] = [];
    try {
      topDirs = fs.readdirSync(rootPath, { withFileTypes: true })
        .filter(d => d.isDirectory() && !this.isExcluded(d.name) && !d.name.startsWith('.'))
        .map(d => d.name);
    } catch {
      return configs;
    }

    // Search up to 2 levels deep for sub-project configs
    const candidateDirs = [...topDirs];
    for (const topDir of topDirs) {
      try {
        const subDirs = fs.readdirSync(path.join(rootPath, topDir), { withFileTypes: true })
          .filter(d => d.isDirectory() && !this.isExcluded(d.name) && !d.name.startsWith('.'))
          .map(d => path.join(topDir, d.name));
        candidateDirs.push(...subDirs);
      } catch {
        // skip
      }
    }

    for (const configName of SkeletonCollector.SUB_PROJECT_CONFIGS) {
      const found: Array<{ path: string; content: string }> = [];

      for (const dir of candidateDirs) {
        if (found.length >= maxSamples) break;

        const configPath = path.join(rootPath, dir, configName);
        const content = this.readFileTruncated(configPath, 200);
        if (content !== null) {
          found.push({ path: path.join(dir, configName), content });
        }
      }

      configs.push(...found);
    }

    return configs;
  }

  private listIacFiles(rootPath: string): string[] {
    const files: string[] = [];

    for (const iacDir of SkeletonCollector.IAC_DIRS) {
      const dirPath = path.join(rootPath, iacDir);
      if (!fs.existsSync(dirPath)) continue;

      this.listFilesRecursive(dirPath, iacDir, files, 3);
    }

    return files;
  }

  private listFilesRecursive(dir: string, prefix: string, files: string[], maxDepth: number): void {
    if (maxDepth <= 0) return;

    let entries: fs.Dirent[];
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }

    for (const entry of entries) {
      if (this.isExcluded(entry.name)) continue;

      const relativePath = path.join(prefix, entry.name);
      if (entry.isDirectory()) {
        this.listFilesRecursive(path.join(dir, entry.name), relativePath, files, maxDepth - 1);
      } else {
        files.push(relativePath);
      }
    }
  }

  private readFileTruncated(filePath: string, maxLines: number): string | null {
    try {
      if (!fs.existsSync(filePath)) return null;
      const content = fs.readFileSync(filePath, 'utf-8');
      const lines = content.split('\n');
      if (lines.length > maxLines) {
        return lines.slice(0, maxLines).join('\n') + `\n... (truncated, ${lines.length} total lines)`;
      }
      return content;
    } catch {
      return null;
    }
  }
}
