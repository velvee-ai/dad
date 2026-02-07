/**
 * ClaudeCodeBridge — Implementation phase agent for Author Mode.
 *
 * Spawns the Claude Code CLI (`claude`) as a subprocess to execute
 * the approved implementation plan and generate actual code.
 *
 * Reference: archived CLI client at _archived/extension/claude/client.ts
 */

import { execFile } from 'child_process';
import { promisify } from 'util';
import type { AgentBridge, ImplementInput, ImplementOutput } from './AgentBridge';
import { AuthorPromptBuilder } from './AuthorPromptBuilder';
import { ResponseParser } from './ResponseParser';

const execFileAsync = promisify(execFile);

export class ClaudeCodeBridge implements Pick<AgentBridge, 'implement'> {
  private cliPath: string;
  private workspaceRoot: string;

  /**
   * @param workspaceRoot - The workspace root directory for Claude Code to operate in.
   * @param cliPath - Path to the claude CLI binary. Defaults to 'claude'.
   */
  constructor(workspaceRoot: string, cliPath: string = 'claude') {
    this.workspaceRoot = workspaceRoot;
    this.cliPath = cliPath;
  }

  /**
   * Execute the approved implementation plan using Claude Code CLI.
   * Spawns `claude --print` with the implementation prompt.
   */
  async implement(input: ImplementInput): Promise<ImplementOutput> {
    const prompt = AuthorPromptBuilder.implementDesign(input);

    try {
      const { stdout } = await execFileAsync(
        this.cliPath,
        ['--print', '--output-format', 'text', '-p', prompt],
        {
          cwd: this.workspaceRoot,
          maxBuffer: 10 * 1024 * 1024, // 10MB buffer for large responses
          timeout: 300000, // 5 minute timeout
        }
      );

      return ResponseParser.parseImplementResponse(stdout);
    } catch (error: any) {
      if (error.code === 'ENOENT') {
        throw new Error(
          `Claude Code CLI not found at "${this.cliPath}". ` +
          'Please install Claude Code: npm install -g @anthropic-ai/claude-code'
        );
      }
      throw new Error(`Claude Code execution failed: ${error.message}`);
    }
  }
}
