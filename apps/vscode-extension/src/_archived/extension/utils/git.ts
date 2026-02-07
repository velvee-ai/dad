import * as vscode from 'vscode';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as crypto from 'crypto';

const execAsync = promisify(exec);

export interface GitChange {
  file: string;
  changeType: 'added' | 'modified' | 'deleted' | 'renamed';
  oldFile?: string;
  hunks: GitHunk[];
}

export interface GitHunk {
  oldStart: number;
  oldLines: number;
  newStart: number;
  newLines: number;
  lines: string[];
  content: string;
}

export interface ChangeSummary {
  files: GitChange[];
  totalAdditions: number;
  totalDeletions: number;
  hasUncommitted: boolean;
  hasStaged: boolean;
  tempCommitSha?: string;
}

export class GitUtils {
  /**
   * Check if current directory is a git repository
   */
  static async isGitRepository(workspacePath: string): Promise<boolean> {
    try {
      await execAsync('git rev-parse --git-dir', { cwd: workspacePath });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get uncommitted changes (staged + unstaged)
   */
  static async getUncommittedChanges(workspacePath: string): Promise<ChangeSummary> {
    const isRepo = await this.isGitRepository(workspacePath);
    if (!isRepo) {
      throw new Error('Not a git repository');
    }

    // Check for staged changes
    const { stdout: stagedStatus } = await execAsync('git diff --cached --name-status', {
      cwd: workspacePath
    });

    // Check for unstaged changes
    const { stdout: unstagedStatus } = await execAsync('git diff --name-status', {
      cwd: workspacePath
    });

    const hasStaged = stagedStatus.trim().length > 0;
    const hasUncommitted = unstagedStatus.trim().length > 0;

    if (!hasStaged && !hasUncommitted) {
      return {
        files: [],
        totalAdditions: 0,
        totalDeletions: 0,
        hasUncommitted: false,
        hasStaged: false,
      };
    }

    // Get detailed diff including both staged and unstaged
    const { stdout: diffOutput } = await execAsync('git diff HEAD', {
      cwd: workspacePath,
      maxBuffer: 10 * 1024 * 1024 // 10MB buffer for large diffs
    });

    const files = this.parseDiff(diffOutput);

    // Calculate stats
    let totalAdditions = 0;
    let totalDeletions = 0;

    files.forEach(file => {
      file.hunks.forEach(hunk => {
        hunk.lines.forEach(line => {
          if (line.startsWith('+') && !line.startsWith('+++')) {
            totalAdditions++;
          } else if (line.startsWith('-') && !line.startsWith('---')) {
            totalDeletions++;
          }
        });
      });
    });

    // Generate temp commit SHA for uncommitted changes
    const tempCommitSha = this.generateTempCommitSha(diffOutput);

    return {
      files,
      totalAdditions,
      totalDeletions,
      hasUncommitted,
      hasStaged,
      tempCommitSha,
    };
  }

  /**
   * Parse git diff output into structured format
   */
  private static parseDiff(diffOutput: string): GitChange[] {
    const files: GitChange[] = [];
    const diffBlocks = diffOutput.split(/^diff --git /gm).filter(Boolean);

    for (const block of diffBlocks) {
      const lines = block.split('\n');

      // Extract file information from the first line
      const firstLine = lines[0];
      const fileMatch = firstLine.match(/a\/(.+?) b\/(.+?)$/);
      if (!fileMatch) continue;

      const oldFile = fileMatch[1];
      const newFile = fileMatch[2];

      // Determine change type
      let changeType: GitChange['changeType'] = 'modified';
      if (block.includes('new file mode')) {
        changeType = 'added';
      } else if (block.includes('deleted file mode')) {
        changeType = 'deleted';
      } else if (oldFile !== newFile) {
        changeType = 'renamed';
      }

      // Parse hunks
      const hunks: GitHunk[] = [];
      let currentHunk: GitHunk | null = null;
      let inHunk = false;

      for (let i = 1; i < lines.length; i++) {
        const line = lines[i];

        // Hunk header: @@ -oldStart,oldLines +newStart,newLines @@
        const hunkMatch = line.match(/^@@ -(\d+),?(\d*) \+(\d+),?(\d*) @@/);
        if (hunkMatch) {
          if (currentHunk) {
            currentHunk.content = currentHunk.lines.join('\n');
            hunks.push(currentHunk);
          }

          currentHunk = {
            oldStart: parseInt(hunkMatch[1], 10),
            oldLines: parseInt(hunkMatch[2] || '1', 10),
            newStart: parseInt(hunkMatch[3], 10),
            newLines: parseInt(hunkMatch[4] || '1', 10),
            lines: [],
            content: '',
          };
          inHunk = true;
          continue;
        }

        // Add line to current hunk
        if (inHunk && currentHunk) {
          // Skip metadata lines
          if (line.startsWith('---') || line.startsWith('+++') ||
              line.startsWith('index ') || line.startsWith('Binary files')) {
            continue;
          }
          currentHunk.lines.push(line);
        }
      }

      // Add final hunk
      if (currentHunk) {
        currentHunk.content = currentHunk.lines.join('\n');
        hunks.push(currentHunk);
      }

      files.push({
        file: newFile,
        changeType,
        oldFile: oldFile !== newFile ? oldFile : undefined,
        hunks,
      });
    }

    return files;
  }

  /**
   * Generate a temporary commit SHA for uncommitted changes
   * This creates a deterministic hash based on the diff content
   */
  private static generateTempCommitSha(diffContent: string): string {
    const timestamp = new Date().toISOString();
    const hash = crypto.createHash('sha1');
    hash.update(`temp-commit-${diffContent}-${timestamp}`);
    return `temp-${hash.digest('hex').substring(0, 7)}`;
  }

  /**
   * Extract code snippets from changed regions
   */
  static async extractChangedCodeSnippets(
    workspacePath: string,
    changes: GitChange[]
  ): Promise<{ file: string; code: string; language: string }[]> {
    const snippets: { file: string; code: string; language: string }[] = [];

    for (const change of changes) {
      if (change.changeType === 'deleted') {
        continue; // Skip deleted files
      }

      try {
        const filePath = vscode.Uri.file(`${workspacePath}/${change.file}`);
        const document = await vscode.workspace.openTextDocument(filePath);
        const language = document.languageId;

        // Collect all changed lines
        const changedLines = new Set<number>();

        for (const hunk of change.hunks) {
          // Add context around changes (e.g., ±5 lines)
          const contextLines = 5;
          const startLine = Math.max(0, hunk.newStart - contextLines);
          const endLine = Math.min(
            document.lineCount - 1,
            hunk.newStart + hunk.newLines + contextLines
          );

          for (let i = startLine; i <= endLine; i++) {
            changedLines.add(i);
          }
        }

        // Extract contiguous regions
        const sortedLines = Array.from(changedLines).sort((a, b) => a - b);
        const regions: { start: number; end: number }[] = [];
        let currentRegion = { start: sortedLines[0], end: sortedLines[0] };

        for (let i = 1; i < sortedLines.length; i++) {
          if (sortedLines[i] === currentRegion.end + 1) {
            currentRegion.end = sortedLines[i];
          } else {
            regions.push(currentRegion);
            currentRegion = { start: sortedLines[i], end: sortedLines[i] };
          }
        }
        regions.push(currentRegion);

        // Extract code for each region
        for (const region of regions) {
          const range = new vscode.Range(
            region.start,
            0,
            region.end,
            document.lineAt(region.end).text.length
          );
          const code = document.getText(range);

          snippets.push({
            file: change.file,
            code: `// ${change.file} (lines ${region.start + 1}-${region.end + 1})\n${code}`,
            language,
          });
        }

      } catch (error) {
        console.error(`Failed to extract code from ${change.file}:`, error);
      }
    }

    return snippets;
  }

  /**
   * Get current branch name
   */
  static async getCurrentBranch(workspacePath: string): Promise<string> {
    try {
      const { stdout } = await execAsync('git branch --show-current', { cwd: workspacePath });
      return stdout.trim();
    } catch {
      return 'unknown';
    }
  }

  /**
   * Get current commit SHA
   */
  static async getCurrentCommitSha(workspacePath: string): Promise<string> {
    try {
      const { stdout } = await execAsync('git rev-parse HEAD', { cwd: workspacePath });
      return stdout.trim();
    } catch {
      return 'unknown';
    }
  }

  /**
   * Check if there are any changes
   */
  static async hasChanges(workspacePath: string): Promise<boolean> {
    try {
      const { stdout } = await execAsync('git status --porcelain', { cwd: workspacePath });
      return stdout.trim().length > 0;
    } catch {
      return false;
    }
  }
}
