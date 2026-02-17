import * as fs from 'fs';
import * as path from 'path';
import type { LLMProvider } from '../types';
import type { ProjectProfile } from './types';
import { SkeletonCollector } from './SkeletonCollector';
import { ProfilePromptBuilder } from './ProfilePromptBuilder';

/**
 * Stage 0: LLM-driven project profiling.
 *
 * Collects a project skeleton, sends it to an LLM, and parses the response
 * into a structured ProjectProfile. Returns null on failure so the caller
 * can fall back to heuristic scanning.
 */
export class ProjectProfiler {
  constructor(private llmProvider: LLMProvider) {}

  /** Load cached profile from .dad/profile.json, or return null if missing/invalid. */
  static loadCached(rootPath: string): ProjectProfile | null {
    const profilePath = path.join(rootPath, '.dad', 'profile.json');
    if (!fs.existsSync(profilePath)) return null;
    try {
      const content = fs.readFileSync(profilePath, 'utf-8');
      const parsed = JSON.parse(content);
      return ProjectProfiler.validateProfileStatic(parsed);
    } catch {
      return null;
    }
  }

  /** Save profile to .dad/profile.json for future fast loads. */
  static saveProfile(rootPath: string, profile: ProjectProfile): void {
    const dadDir = path.join(rootPath, '.dad');
    if (!fs.existsSync(dadDir)) {
      fs.mkdirSync(dadDir, { recursive: true });
    }
    const profilePath = path.join(dadDir, 'profile.json');
    fs.writeFileSync(profilePath, JSON.stringify(profile, null, 2));
  }

  private static validateProfileStatic(obj: unknown): ProjectProfile | null {
    if (!obj || typeof obj !== 'object') return null;

    const profile = obj as Record<string, unknown>;

    if (!profile.system || typeof profile.system !== 'object') return null;
    if (!Array.isArray(profile.containers)) return null;
    if (profile.containers.length === 0) return null;

    return {
      system: profile.system as ProjectProfile['system'],
      containers: profile.containers as ProjectProfile['containers'],
      dataStores: Array.isArray(profile.dataStores) ? profile.dataStores as ProjectProfile['dataStores'] : [],
      messageQueues: Array.isArray(profile.messageQueues) ? profile.messageQueues as ProjectProfile['messageQueues'] : [],
      objectStores: Array.isArray(profile.objectStores) ? profile.objectStores as ProjectProfile['objectStores'] : [],
      externalSystems: Array.isArray(profile.externalSystems) ? profile.externalSystems as ProjectProfile['externalSystems'] : [],
      actors: Array.isArray(profile.actors) ? profile.actors as ProjectProfile['actors'] : [],
      relationships: Array.isArray(profile.relationships) ? profile.relationships as ProjectProfile['relationships'] : [],
    };
  }

  async profile(rootPath: string): Promise<ProjectProfile | null> {
    // 1. Collect skeleton
    const collector = new SkeletonCollector();
    const skeleton = await collector.collect(rootPath);

    // 2. Build prompt
    const promptBuilder = new ProfilePromptBuilder();
    const prompt = promptBuilder.build(skeleton);

    // 3. Call LLM
    let response: string;
    try {
      response = await this.llmProvider.analyze(prompt);
    } catch (err) {
      console.warn('[ProjectProfiler] LLM call failed:', err);
      return null;
    }

    // 4. Parse JSON
    const profile = this.parseProfile(response);
    if (!profile) {
      console.warn('[ProjectProfiler] Failed to parse LLM response as ProjectProfile');
      return null;
    }

    // 5. Validate minimum requirements
    if (!profile.containers || profile.containers.length === 0) {
      console.warn('[ProjectProfiler] Profile has no containers, falling back to heuristics');
      return null;
    }

    return profile;
  }

  private parseProfile(response: string): ProjectProfile | null {
    // Strip markdown code fences if present
    let json = response.trim();
    if (json.startsWith('```json')) {
      json = json.slice(7);
    } else if (json.startsWith('```')) {
      json = json.slice(3);
    }
    if (json.endsWith('```')) {
      json = json.slice(0, -3);
    }
    json = json.trim();

    // First attempt: direct parse
    try {
      return this.validateProfile(JSON.parse(json));
    } catch {
      // Continue to repair attempt
    }

    // Second attempt: repair truncated JSON (close unclosed brackets/braces)
    try {
      const repaired = this.repairJson(json);
      return this.validateProfile(JSON.parse(repaired));
    } catch {
      return null;
    }
  }

  private validateProfile(obj: unknown): ProjectProfile | null {
    if (!obj || typeof obj !== 'object') return null;

    const profile = obj as Record<string, unknown>;

    // Must have system and containers at minimum
    if (!profile.system || typeof profile.system !== 'object') return null;
    if (!Array.isArray(profile.containers)) return null;

    // Provide defaults for optional arrays
    const result: ProjectProfile = {
      system: profile.system as ProjectProfile['system'],
      containers: profile.containers as ProjectProfile['containers'],
      dataStores: Array.isArray(profile.dataStores) ? profile.dataStores as ProjectProfile['dataStores'] : [],
      messageQueues: Array.isArray(profile.messageQueues) ? profile.messageQueues as ProjectProfile['messageQueues'] : [],
      objectStores: Array.isArray(profile.objectStores) ? profile.objectStores as ProjectProfile['objectStores'] : [],
      externalSystems: Array.isArray(profile.externalSystems) ? profile.externalSystems as ProjectProfile['externalSystems'] : [],
      actors: Array.isArray(profile.actors) ? profile.actors as ProjectProfile['actors'] : [],
      relationships: Array.isArray(profile.relationships) ? profile.relationships as ProjectProfile['relationships'] : [],
    };

    return result;
  }

  private repairJson(json: string): string {
    // Count unclosed brackets and braces
    let braces = 0;
    let brackets = 0;
    let inString = false;
    let escape = false;

    for (const ch of json) {
      if (escape) {
        escape = false;
        continue;
      }
      if (ch === '\\') {
        escape = true;
        continue;
      }
      if (ch === '"') {
        inString = !inString;
        continue;
      }
      if (inString) continue;

      if (ch === '{') braces++;
      else if (ch === '}') braces--;
      else if (ch === '[') brackets++;
      else if (ch === ']') brackets--;
    }

    // Close unclosed strings
    if (inString) {
      json += '"';
    }

    // Close unclosed brackets and braces
    while (brackets > 0) {
      json += ']';
      brackets--;
    }
    while (braces > 0) {
      json += '}';
      braces--;
    }

    return json;
  }
}
