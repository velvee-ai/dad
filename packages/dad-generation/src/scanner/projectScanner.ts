import * as fs from 'fs';
import * as path from 'path';
import type {
  C4Level,
  DadNodeType,
  ProjectSkeleton,
  SkeletonNode,
  SourceMapping,
} from '@dad/shared-types';

// File patterns that indicate a container (deployable service)
const CONTAINER_INDICATORS = [
  'package.json',
  'Dockerfile',
  'requirements.txt',
  'setup.py',
  'pyproject.toml',
  'go.mod',
  'Cargo.toml',
  'pom.xml',
  'build.gradle',
  'Gemfile',
];

// File patterns that indicate a landscape / multi-system setup
const LANDSCAPE_INDICATORS = [
  'workspace.json',
  'docker-compose.yml',
  'docker-compose.yaml',
  'lerna.json',
  'pnpm-workspace.yaml',
  'turbo.json',
];

// Directory names that typically represent component-level groupings
const COMPONENT_DIRS = new Set([
  'controllers',
  'services',
  'handlers',
  'models',
  'repositories',
  'middleware',
  'routes',
  'resolvers',
  'validators',
  'events',
  'commands',
  'queries',
  'providers',
  'adapters',
  'ports',
  'entities',
  'use-cases',
  'usecases',
  'domain',
]);

// Directories to skip during scanning
const SKIP_DIRS = new Set([
  'node_modules',
  '.git',
  '.dad',
  'dist',
  'build',
  'out',
  '.next',
  '.nuxt',
  '__pycache__',
  '.venv',
  'venv',
  'vendor',
  'target',
  '.turbo',
  'coverage',
  '.cache',
]);

// Source file extensions
const SOURCE_EXTENSIONS = new Set([
  '.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs',
  '.py',
  '.go',
  '.rs',
  '.java', '.kt',
  '.rb',
  '.cs',
  '.swift',
  '.proto',
]);

interface ScanContext {
  rootPath: string;
  nodes: Map<string, SkeletonNode>;
  landscapeId: string;
}

function makeId(level: C4Level, name: string): string {
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  return `${level}:${slug}`;
}

function detectLanguage(filePath: string): string | undefined {
  const ext = path.extname(filePath).toLowerCase();
  const map: Record<string, string> = {
    '.ts': 'typescript', '.tsx': 'typescript',
    '.js': 'javascript', '.jsx': 'javascript', '.mjs': 'javascript', '.cjs': 'javascript',
    '.py': 'python',
    '.go': 'go',
    '.rs': 'rust',
    '.java': 'java', '.kt': 'kotlin',
    '.rb': 'ruby',
    '.cs': 'csharp',
    '.swift': 'swift',
    '.proto': 'protobuf',
  };
  return map[ext];
}

function detectTechnology(dirPath: string): string | undefined {
  const checks: Array<{ file: string; tech: string }> = [
    { file: 'package.json', tech: 'Node.js' },
    { file: 'requirements.txt', tech: 'Python' },
    { file: 'setup.py', tech: 'Python' },
    { file: 'pyproject.toml', tech: 'Python' },
    { file: 'go.mod', tech: 'Go' },
    { file: 'Cargo.toml', tech: 'Rust' },
    { file: 'pom.xml', tech: 'Java' },
    { file: 'build.gradle', tech: 'Java/Kotlin' },
    { file: 'Gemfile', tech: 'Ruby' },
  ];

  for (const check of checks) {
    if (fs.existsSync(path.join(dirPath, check.file))) {
      // Try to get more detail from package.json
      if (check.file === 'package.json') {
        try {
          const pkg = JSON.parse(fs.readFileSync(path.join(dirPath, check.file), 'utf-8'));
          const deps = { ...pkg.dependencies, ...pkg.devDependencies };
          if (deps['express']) return 'TypeScript/Express';
          if (deps['fastify']) return 'TypeScript/Fastify';
          if (deps['@nestjs/core']) return 'TypeScript/NestJS';
          if (deps['next']) return 'TypeScript/Next.js';
          if (deps['react']) return 'TypeScript/React';
          if (deps['vue']) return 'TypeScript/Vue';
        } catch { /* ignore */ }
        return 'Node.js';
      }
      return check.tech;
    }
  }
  return undefined;
}

function readDirSafe(dirPath: string): string[] {
  try {
    return fs.readdirSync(dirPath);
  } catch {
    return [];
  }
}

function isSourceFile(filePath: string): boolean {
  return SOURCE_EXTENSIONS.has(path.extname(filePath).toLowerCase());
}

function addNode(ctx: ScanContext, node: SkeletonNode): void {
  ctx.nodes.set(node.id, node);
  // Wire parent-child relationship
  if (node.parentId) {
    const parent = ctx.nodes.get(node.parentId);
    if (parent && !parent.childIds.includes(node.id)) {
      parent.childIds.push(node.id);
    }
  }
}

/**
 * Scans a directory that represents a system (e.g., ecommerce-platform).
 * Looks for containers inside (services, apps, etc.)
 */
function scanSystem(ctx: ScanContext, systemDir: string, systemId: string): void {
  const entries = readDirSafe(systemDir);

  // Look for services/ or apps/ sub-directory
  const serviceParentDirs = ['services', 'apps', 'packages', 'microservices'];
  for (const spd of serviceParentDirs) {
    const spdPath = path.join(systemDir, spd);
    if (fs.existsSync(spdPath) && fs.statSync(spdPath).isDirectory()) {
      const serviceDirs = readDirSafe(spdPath);
      for (const serviceDir of serviceDirs) {
        if (SKIP_DIRS.has(serviceDir)) continue;
        const servicePath = path.join(spdPath, serviceDir);
        if (!fs.statSync(servicePath).isDirectory()) continue;

        // Check if this looks like a container
        const hasIndicator = CONTAINER_INDICATORS.some(f =>
          fs.existsSync(path.join(servicePath, f))
        );

        if (hasIndicator) {
          scanContainer(ctx, servicePath, serviceDir, systemId);
        } else {
          // Could be a shared library or non-service dir
          // Check if it has source files
          scanSharedDir(ctx, servicePath, serviceDir, systemId);
        }
      }
    }
  }

  // Also check for top-level containers in the system dir itself
  for (const entry of entries) {
    if (SKIP_DIRS.has(entry) || serviceParentDirs.includes(entry)) continue;
    const entryPath = path.join(systemDir, entry);
    if (!fs.statSync(entryPath).isDirectory()) continue;

    const hasIndicator = CONTAINER_INDICATORS.some(f =>
      fs.existsSync(path.join(entryPath, f))
    );
    if (hasIndicator) {
      scanContainer(ctx, entryPath, entry, systemId);
    }
  }
}

/**
 * Scans a shared directory (like shared/events/) that doesn't have container indicators
 * but may contain components/code.
 */
function scanSharedDir(ctx: ScanContext, dirPath: string, dirName: string, parentId: string): void {
  const entries = readDirSafe(dirPath);
  const hasSourceFiles = entries.some(e => isSourceFile(e));
  const hasSubDirs = entries.some(e => {
    const fullPath = path.join(dirPath, e);
    return fs.existsSync(fullPath) && fs.statSync(fullPath).isDirectory() && !SKIP_DIRS.has(e);
  });

  if (!hasSourceFiles && !hasSubDirs) return;

  // Create as a component group
  const componentId = makeId('component', `${path.basename(path.dirname(dirPath))}-${dirName}`);
  const relPath = path.relative(ctx.rootPath, dirPath);

  addNode(ctx, {
    id: componentId,
    name: dirName,
    type: 'component',
    c4Level: 'component',
    parentId,
    childIds: [],
    sourceMapping: { filePath: relPath },
    detectedBy: 'directory-pattern',
  });

  // Scan source files as code units
  for (const entry of entries) {
    const entryPath = path.join(dirPath, entry);
    if (isSourceFile(entry) && fs.statSync(entryPath).isFile()) {
      scanCodeFile(ctx, entryPath, componentId);
    }
    // Recurse into subdirs
    if (fs.statSync(entryPath).isDirectory() && !SKIP_DIRS.has(entry)) {
      scanSharedDir(ctx, entryPath, entry, componentId);
    }
  }
}

/**
 * Scans a container directory (a deployable service/app).
 */
function scanContainer(
  ctx: ScanContext,
  containerDir: string,
  containerName: string,
  systemId: string
): void {
  const containerId = makeId('container', containerName);
  const relPath = path.relative(ctx.rootPath, containerDir);
  const technology = detectTechnology(containerDir);

  // Determine if this is a data store
  const isDataStore = /(?:database|db|redis|cache|queue|kafka|rabbit|mongo|postgres|mysql)/i.test(containerName);

  addNode(ctx, {
    id: containerId,
    name: containerName,
    type: isDataStore ? 'dataStore' : 'container',
    c4Level: 'container',
    parentId: systemId,
    childIds: [],
    sourceMapping: { filePath: relPath },
    technology,
    detectedBy: 'package-json',
  });

  // Find the source root (src/, lib/, app/, etc.)
  const srcDirs = ['src', 'lib', 'app', 'source'];
  let sourceRoot = containerDir;
  for (const sd of srcDirs) {
    const candidate = path.join(containerDir, sd);
    if (fs.existsSync(candidate) && fs.statSync(candidate).isDirectory()) {
      sourceRoot = candidate;
      break;
    }
  }

  // Scan for components within the container
  scanComponentsInDir(ctx, sourceRoot, containerId);
}

/**
 * Scans a source directory for components (controllers, services, etc.)
 * and loose code files.
 */
function scanComponentsInDir(ctx: ScanContext, dirPath: string, containerId: string): void {
  const entries = readDirSafe(dirPath);

  for (const entry of entries) {
    if (SKIP_DIRS.has(entry)) continue;
    const entryPath = path.join(dirPath, entry);

    if (fs.statSync(entryPath).isDirectory()) {
      const isComponentDir = COMPONENT_DIRS.has(entry.toLowerCase());

      if (isComponentDir) {
        // This directory is a component group (e.g., controllers/, services/)
        const componentId = makeId('component', `${path.basename(path.dirname(dirPath))}-${entry}`);
        const relPath = path.relative(ctx.rootPath, entryPath);

        addNode(ctx, {
          id: componentId,
          name: entry,
          type: 'component',
          c4Level: 'component',
          parentId: containerId,
          childIds: [],
          sourceMapping: { filePath: relPath },
          detectedBy: 'directory-pattern',
        });

        // Scan files in this component directory as code units
        const componentEntries = readDirSafe(entryPath);
        for (const ce of componentEntries) {
          const cePath = path.join(entryPath, ce);
          if (isSourceFile(ce) && fs.statSync(cePath).isFile()) {
            scanCodeFile(ctx, cePath, componentId);
          }
        }
      } else {
        // Recurse into non-component subdirectories
        scanComponentsInDir(ctx, entryPath, containerId);
      }
    } else if (isSourceFile(entry)) {
      // Loose source file directly under the source root
      // Treat as a code unit under the container
      scanCodeFile(ctx, entryPath, containerId);
    }
  }
}

/**
 * Scans a source file and creates a code unit node.
 */
function scanCodeFile(ctx: ScanContext, filePath: string, parentId: string): void {
  const relPath = path.relative(ctx.rootPath, filePath);
  const fileName = path.basename(filePath, path.extname(filePath));
  const language = detectLanguage(filePath);

  // Read file to get line count
  let lineCount = 0;
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    lineCount = content.split('\n').length;
  } catch { /* ignore */ }

  const codeId = makeId('code', `${parentId.split(':')[1]}-${fileName}`);

  const sourceMapping: SourceMapping = {
    filePath: relPath,
    startLine: 1,
    endLine: lineCount,
    language,
  };

  addNode(ctx, {
    id: codeId,
    name: fileName,
    type: 'codeUnit',
    c4Level: 'code',
    parentId,
    childIds: [],
    sourceMapping,
    detectedBy: 'source-file',
  });
}

/**
 * ProjectScanner: walks a workspace directory and produces a structural skeleton
 * of C4 entities (Landscape > Systems > Containers > Components > Code).
 *
 * This is Pass 1 of the generation pipeline --- no LLM calls, pure filesystem analysis.
 */
export class ProjectScanner {
  /**
   * Scan a workspace root and return a ProjectSkeleton.
   */
  static scan(rootPath: string): ProjectSkeleton {
    const ctx: ScanContext = {
      rootPath,
      nodes: new Map(),
      landscapeId: '',
    };

    // --- Level 0: Landscape ---
    const projectName = path.basename(rootPath);
    const landscapeId = makeId('landscape', projectName);
    ctx.landscapeId = landscapeId;

    // Check for landscape indicators
    const hasLandscapeIndicator = LANDSCAPE_INDICATORS.some(f =>
      fs.existsSync(path.join(rootPath, f))
    );

    addNode(ctx, {
      id: landscapeId,
      name: projectName,
      type: 'landscape',
      c4Level: 'landscape',
      parentId: null,
      childIds: [],
      detectedBy: hasLandscapeIndicator ? 'filesystem' : 'filesystem',
    });

    // --- Level 1: Systems ---
    // Strategy: Look for system-level directories.
    // Heuristic: directories containing docker-compose.yml or services/ subdirectory,
    //            or directories that themselves contain package.json (standalone system).
    const rootEntries = readDirSafe(rootPath);

    // Check if the root itself is a single system (has services/ dir or docker-compose)
    const rootIsSystem = rootEntries.some(e =>
      ['services', 'apps', 'microservices'].includes(e) &&
      fs.statSync(path.join(rootPath, e)).isDirectory()
    ) || rootEntries.includes('docker-compose.yml') || rootEntries.includes('docker-compose.yaml');

    if (rootIsSystem) {
      // The root directory is itself a system
      const systemId = makeId('context', projectName);
      addNode(ctx, {
        id: systemId,
        name: projectName,
        type: 'softwareSystem',
        c4Level: 'context',
        parentId: landscapeId,
        childIds: [],
        detectedBy: 'docker-compose',
      });
      scanSystem(ctx, rootPath, systemId);
    } else {
      // Look for system directories inside root
      for (const entry of rootEntries) {
        if (SKIP_DIRS.has(entry)) continue;
        const entryPath = path.join(rootPath, entry);
        if (!fs.statSync(entryPath).isDirectory()) continue;

        const isSystem = LANDSCAPE_INDICATORS.some(f =>
          fs.existsSync(path.join(entryPath, f))
        ) || readDirSafe(entryPath).some(e =>
          ['services', 'apps', 'microservices'].includes(e) &&
          fs.statSync(path.join(entryPath, e)).isDirectory()
        );

        if (isSystem) {
          const systemId = makeId('context', entry);
          addNode(ctx, {
            id: systemId,
            name: entry,
            type: 'softwareSystem',
            c4Level: 'context',
            parentId: landscapeId,
            childIds: [],
            detectedBy: 'docker-compose',
          });
          scanSystem(ctx, entryPath, systemId);
        } else {
          // Check if it's a standalone container (single service, no system wrapper)
          const hasIndicator = CONTAINER_INDICATORS.some(f =>
            fs.existsSync(path.join(entryPath, f))
          );
          if (hasIndicator) {
            // Create an implicit system wrapping this container
            const systemId = makeId('context', entry);
            addNode(ctx, {
              id: systemId,
              name: entry,
              type: 'softwareSystem',
              c4Level: 'context',
              parentId: landscapeId,
              childIds: [],
              detectedBy: 'package-json',
            });
            scanContainer(ctx, entryPath, entry, systemId);
          }
        }
      }
    }

    return {
      rootPath,
      nodes: Array.from(ctx.nodes.values()),
    };
  }

  /**
   * Pretty-print a skeleton for debugging.
   */
  static printSkeleton(skeleton: ProjectSkeleton): string {
    const lines: string[] = [];
    const nodeMap = new Map(skeleton.nodes.map(n => [n.id, n]));

    function printNode(nodeId: string, indent: number): void {
      const node = nodeMap.get(nodeId);
      if (!node) return;
      const prefix = '  '.repeat(indent);
      const tech = node.technology ? ` [${node.technology}]` : '';
      const src = node.sourceMapping?.filePath ? ` (${node.sourceMapping.filePath})` : '';
      lines.push(`${prefix}${node.c4Level}:${node.type} "${node.name}"${tech}${src}`);
      for (const childId of node.childIds) {
        printNode(childId, indent + 1);
      }
    }

    // Find root nodes
    const roots = skeleton.nodes.filter(n => n.parentId === null || n.parentId === undefined);
    for (const root of roots) {
      printNode(root.id, 0);
    }

    return lines.join('\n');
  }
}
