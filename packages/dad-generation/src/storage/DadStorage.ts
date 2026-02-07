import * as fs from 'fs';
import * as path from 'path';
import type { C4Level, DadFile } from '@dad/shared-types';
import { validateDadFile, validateDadFileIntegrity } from '@dad/diagram-schema';

const DAD_FOLDER = '.dad';
const DAD_FILE = 'landscape.dad.json';
const LEVELS_FOLDER = 'levels';
const MANIFEST_FILE = 'manifest.json';

type RepoLevel = 'context' | 'container' | 'component' | 'code';
const REPO_LEVELS: RepoLevel[] = ['context', 'container', 'component', 'code'];

interface ManifestLevelEntry {
  file: string;
  nodeCount: number;
  edgeCount: number;
}

interface DadManifest {
  version: '1.0';
  generatedAt: string;
  projectName: string;
  landscapeFile: string;
  nodeCount: number;
  edgeCount: number;
  // Multi-file fields (present when saveAll is used)
  combinedFile?: string;
  levels?: Partial<Record<C4Level, ManifestLevelEntry>>;
  totalNodes?: number;
  totalEdges?: number;
}

/** Minimal interface matching pipeline's DadFileSet without importing from @dad/pipeline */
export interface DadFileSetInput {
  context: DadFile;
  container: DadFile;
  component: DadFile;
  code: DadFile;
  combined: DadFile;
}

/**
 * Handles reading and writing `.dad.json` files in the workspace.
 *
 * Storage layout:
 *   .dad/
 *     landscape.dad.json   -- Full 5-level graph
 *     manifest.json        -- Index metadata
 */
export class DadStorage {
  private readonly storageDir: string;

  constructor(private workspaceRoot: string) {
    this.storageDir = path.join(workspaceRoot, DAD_FOLDER);
  }

  private ensureDir(): void {
    if (!fs.existsSync(this.storageDir)) {
      fs.mkdirSync(this.storageDir, { recursive: true });
    }
  }

  /**
   * Save a DadFile to disk. Validates before writing.
   */
  save(dadFile: DadFile): { success: boolean; errors: string[] } {
    // Validate schema
    try {
      validateDadFile(dadFile);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      return { success: false, errors: [`Schema validation failed: ${msg}`] };
    }

    // Validate referential integrity
    const integrityErrors = validateDadFileIntegrity(dadFile);
    if (integrityErrors.length > 0) {
      return { success: false, errors: integrityErrors };
    }

    this.ensureDir();

    // Write the main .dad.json file
    const filePath = path.join(this.storageDir, DAD_FILE);
    fs.writeFileSync(filePath, JSON.stringify(dadFile, null, 2));

    // Write manifest
    const manifest: DadManifest = {
      version: '1.0',
      generatedAt: dadFile.metadata.generatedAt,
      projectName: dadFile.metadata.projectName,
      landscapeFile: DAD_FILE,
      nodeCount: dadFile.nodes.length,
      edgeCount: dadFile.edges.length,
    };
    const manifestPath = path.join(this.storageDir, MANIFEST_FILE);
    fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));

    return { success: true, errors: [] };
  }

  /**
   * Save a DadFileSet as per-level files + manifest. No combined file.
   */
  saveAll(fileSet: DadFileSetInput): { success: boolean; errors: string[] } {
    this.ensureDir();

    // Create levels/ directory
    const levelsDir = path.join(this.storageDir, LEVELS_FOLDER);
    if (!fs.existsSync(levelsDir)) {
      fs.mkdirSync(levelsDir, { recursive: true });
    }

    // Write per-level files
    const levelEntries: Partial<Record<C4Level, ManifestLevelEntry>> = {};
    let totalNodes = 0;
    let totalEdges = 0;
    for (const level of REPO_LEVELS) {
      const levelFile = fileSet[level];
      const relPath = `${LEVELS_FOLDER}/${level}.dad.json`;
      const absPath = path.join(this.storageDir, relPath);
      fs.writeFileSync(absPath, JSON.stringify(levelFile, null, 2));
      levelEntries[level] = {
        file: relPath,
        nodeCount: levelFile.nodes.length,
        edgeCount: levelFile.edges.length,
      };
      totalNodes += levelFile.nodes.length;
      totalEdges += levelFile.edges.length;
    }

    // Write manifest
    const combined = fileSet.combined;
    const manifest: DadManifest = {
      version: '1.0',
      generatedAt: combined.metadata.generatedAt,
      projectName: combined.metadata.projectName,
      landscapeFile: `${LEVELS_FOLDER}/context.dad.json`,
      nodeCount: totalNodes,
      edgeCount: totalEdges,
      levels: levelEntries,
      totalNodes,
      totalEdges,
    };
    const manifestPath = path.join(this.storageDir, MANIFEST_FILE);
    fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));

    return { success: true, errors: [] };
  }

  /**
   * Load a per-level DadFile from disk. Returns null if not found.
   */
  loadLevel(level: C4Level): DadFile | null {
    const filePath = path.join(this.storageDir, LEVELS_FOLDER, `${level}.dad.json`);
    if (!fs.existsSync(filePath)) {
      return null;
    }

    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      return JSON.parse(content) as DadFile;
    } catch (err) {
      console.error(`[DadStorage] Failed to load level file ${level}:`, err);
      return null;
    }
  }

  /**
   * Load all per-level files and merge into a single DadFile for visualization.
   * Excludes boundary nodes (they're duplicates used for per-level self-containment).
   */
  loadMerged(): DadFile | null {
    const allNodes: DadFile['nodes'] = [];
    const allEdges: DadFile['edges'] = [];
    let metadata: DadFile['metadata'] | null = null;

    for (const level of REPO_LEVELS) {
      const levelFile = this.loadLevel(level);
      if (!levelFile) continue;

      // Skip boundary nodes — they're reference copies from other levels
      const realNodes = levelFile.nodes.filter(n => !n.boundary);
      allNodes.push(...realNodes);
      allEdges.push(...levelFile.edges);

      if (!metadata) {
        metadata = { ...levelFile.metadata };
      }
    }

    if (!metadata || allNodes.length === 0) return null;

    metadata.totalNodes = allNodes.length;
    metadata.totalEdges = allEdges.length;

    return {
      version: '1.0',
      metadata,
      nodes: allNodes,
      edges: allEdges,
    };
  }

  /**
   * Load the existing DadFile from disk. Returns null if not found.
   */
  load(): DadFile | null {
    const filePath = path.join(this.storageDir, DAD_FILE);
    if (!fs.existsSync(filePath)) {
      return null;
    }

    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      const parsed = JSON.parse(content);
      return validateDadFile(parsed) as unknown as DadFile;
    } catch (err) {
      console.error('[DadStorage] Failed to load .dad.json:', err);
      return null;
    }
  }

  /**
   * Check if a .dad file exists in this workspace.
   */
  exists(): boolean {
    return fs.existsSync(path.join(this.storageDir, LEVELS_FOLDER, 'context.dad.json'));
  }

  /**
   * Get the absolute path to the context level file (entry point).
   */
  getFilePath(): string {
    return path.join(this.storageDir, LEVELS_FOLDER, 'context.dad.json');
  }

  /**
   * Delete the .dad directory and all contents.
   */
  clear(): void {
    if (fs.existsSync(this.storageDir)) {
      fs.rmSync(this.storageDir, { recursive: true, force: true });
    }
  }

  /**
   * Load the manifest (lightweight metadata without the full graph).
   */
  loadManifest(): DadManifest | null {
    const manifestPath = path.join(this.storageDir, MANIFEST_FILE);
    if (!fs.existsSync(manifestPath)) {
      return null;
    }
    try {
      const content = fs.readFileSync(manifestPath, 'utf-8');
      return JSON.parse(content) as DadManifest;
    } catch {
      return null;
    }
  }
}
