import * as fs from 'fs';
import * as path from 'path';
import type { DadFile } from '@daad/shared-types';
import { validateDadFile, validateDadFileIntegrity } from '@daad/diagram-schema';

const DAD_FOLDER = '.dad';
const DAD_FILE = 'landscape.dad.json';
const MANIFEST_FILE = 'manifest.json';

interface DadManifest {
  version: '1.0';
  generatedAt: string;
  projectName: string;
  landscapeFile: string;
  nodeCount: number;
  edgeCount: number;
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
    return fs.existsSync(path.join(this.storageDir, DAD_FILE));
  }

  /**
   * Get the absolute path to the .dad.json file.
   */
  getFilePath(): string {
    return path.join(this.storageDir, DAD_FILE);
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
