/**
 * ResponseParser — Parses agent responses containing mixed Markdown + JSON.
 *
 * Design agent responses contain: ## Plan + ## DAD sections
 * Implementation agent responses contain: ## FINALIZED_DAD section
 */

import type { DadFile } from '@dad/shared-types';
import type { CoalesceOutput, ImplementOutput } from './AgentBridge';

export class ResponseParser {
  /**
   * Parse the design agent's coalesce response.
   * Extracts the markdown plan and DadFile JSON from delimited sections.
   */
  static parseCoalesceResponse(raw: string): CoalesceOutput {
    // Extract plan section
    const planMatch = raw.match(/## Plan\s*\n([\s\S]*?)(?=## DAD)/);
    const plan = planMatch ? planMatch[1].trim() : '';

    // Extract DAD JSON
    const dadJson = ResponseParser.extractJson(raw, '## DAD');

    if (!dadJson) {
      throw new Error('Failed to parse coalesce response: no DAD JSON found');
    }

    const dadFile = ResponseParser.safeParseJson<DadFile>(dadJson, 'DAD JSON from coalesce response');

    if (!plan) {
      throw new Error('Failed to parse coalesce response: no plan found');
    }

    return { plan, dadFile };
  }

  /**
   * Parse the implementation agent's response.
   * Extracts the finalized DadFile JSON.
   */
  static parseImplementResponse(raw: string): ImplementOutput {
    const dadJson = ResponseParser.extractJson(raw, '## FINALIZED_DAD');

    if (!dadJson) {
      throw new Error('Failed to parse implement response: no FINALIZED_DAD JSON found');
    }

    const dadFile = ResponseParser.safeParseJson<DadFile>(dadJson, 'FINALIZED_DAD JSON');

    return { dadFile };
  }

  /**
   * Try to parse JSON, with auto-repair for truncated responses.
   */
  private static safeParseJson<T>(json: string, context: string): T {
    // First attempt: parse as-is
    try {
      return JSON.parse(json);
    } catch (_firstError) {
      // Ignore — try repair
    }

    // Second attempt: repair truncated JSON (close unclosed brackets/braces)
    try {
      const repaired = ResponseParser.repairTruncatedJson(json);
      return JSON.parse(repaired);
    } catch (_repairError) {
      // Ignore — try fallback
    }

    // Third attempt: find the largest valid JSON object within the string
    try {
      const extracted = ResponseParser.extractLargestJsonObject(json);
      if (extracted) {
        return JSON.parse(extracted);
      }
    } catch (_extractError) {
      // Ignore
    }

    throw new Error(`Failed to parse ${context} — JSON is malformed or truncated`);
  }

  /**
   * Repair truncated JSON by closing unclosed brackets and braces.
   * Handles the common case where maxTokens cuts off the response mid-JSON.
   */
  private static repairTruncatedJson(json: string): string {
    let repaired = json.trimEnd();

    // Remove incomplete trailing content (partial strings, keys, etc.)
    // Strip trailing incomplete string value
    repaired = repaired.replace(/,\s*"[^"]*$/, '');
    // Strip trailing comma
    repaired = repaired.replace(/,\s*$/, '');
    // Strip trailing colon (incomplete key-value)
    repaired = repaired.replace(/:\s*$/, ': null');
    // Strip incomplete key after comma
    repaired = repaired.replace(/,\s*"[^"]*"\s*$/, '');

    // Count open/close brackets
    let openBraces = 0;
    let openBrackets = 0;
    let inString = false;
    let escaped = false;

    for (const char of repaired) {
      if (escaped) {
        escaped = false;
        continue;
      }
      if (char === '\\' && inString) {
        escaped = true;
        continue;
      }
      if (char === '"') {
        inString = !inString;
        continue;
      }
      if (inString) continue;

      if (char === '{') openBraces++;
      else if (char === '}') openBraces--;
      else if (char === '[') openBrackets++;
      else if (char === ']') openBrackets--;
    }

    // If we ended inside a string, close it
    if (inString) {
      repaired += '"';
    }

    // Close unclosed arrays then objects
    while (openBrackets > 0) {
      repaired += ']';
      openBrackets--;
    }
    while (openBraces > 0) {
      repaired += '}';
      openBraces--;
    }

    return repaired;
  }

  /**
   * Try to find the largest balanced JSON object in the string.
   */
  private static extractLargestJsonObject(raw: string): string | null {
    const start = raw.indexOf('{');
    if (start === -1) return null;

    let depth = 0;
    let inString = false;
    let escaped = false;
    let lastValidEnd = -1;

    for (let i = start; i < raw.length; i++) {
      const char = raw[i];

      if (escaped) {
        escaped = false;
        continue;
      }
      if (char === '\\' && inString) {
        escaped = true;
        continue;
      }
      if (char === '"') {
        inString = !inString;
        continue;
      }
      if (inString) continue;

      if (char === '{') depth++;
      else if (char === '}') {
        depth--;
        if (depth === 0) {
          lastValidEnd = i;
          break;
        }
      }
    }

    if (lastValidEnd > start) {
      return raw.substring(start, lastValidEnd + 1);
    }

    return null;
  }

  /**
   * Extract JSON from a response section.
   * Looks for a ```json code block after the given section header.
   */
  private static extractJson(raw: string, sectionHeader: string): string | null {
    const sectionIdx = raw.indexOf(sectionHeader);
    if (sectionIdx === -1) return null;

    const afterSection = raw.slice(sectionIdx + sectionHeader.length);

    // Look for ```json ... ``` block
    const jsonBlockMatch = afterSection.match(/```json\s*\n([\s\S]*?)```/);
    if (jsonBlockMatch) {
      return jsonBlockMatch[1].trim();
    }

    // If no closing ```, the JSON may be truncated — take everything after ```json
    const openJsonBlock = afterSection.match(/```json\s*\n([\s\S]*)/);
    if (openJsonBlock) {
      return openJsonBlock[1].trim();
    }

    // Fallback: look for raw JSON object
    const jsonObjMatch = afterSection.match(/(\{[\s\S]*\})/);
    if (jsonObjMatch) {
      return jsonObjMatch[1].trim();
    }

    return null;
  }
}
