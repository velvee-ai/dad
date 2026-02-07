import * as path from 'path';
import type { AnalyzedFile, AnalyzedSymbol, ComponentGroup, ComponentRole } from '../types';
import { componentId, codeUnitId } from '../assembler/IdGenerator';

/** Directory patterns → component roles */
const DIRECTORY_ROLE_MAP: Array<{ pattern: RegExp; role: ComponentRole }> = [
  { pattern: /\bcontrollers?\b/i, role: 'controller' },
  { pattern: /\broutes?\b/i, role: 'route' },
  { pattern: /\bservices?\b/i, role: 'service' },
  { pattern: /\brepositories?\b|repos?\b/i, role: 'repository' },
  { pattern: /\bmiddleware\b/i, role: 'middleware' },
  { pattern: /\bhandlers?\b/i, role: 'handler' },
  { pattern: /\bmodels?\b|entities?\b/i, role: 'model' },
  { pattern: /\bevents?\b/i, role: 'event' },
  { pattern: /\butils?\b|\bhelpers?\b|\blib\b/i, role: 'utility' },
];

/**
 * Stage 3: Groups analyzed code units into architectural components.
 *
 * Grouping rules (in priority order):
 * 1. Directory pattern: Files in controllers/, services/, etc.
 * 2. Class-as-component: Each exported class becomes its own component
 * 3. File-as-component: Each file with exports becomes a component
 */
export class ComponentGrouper {
  /**
   * Group analyzed files for a single container into components.
   */
  group(files: AnalyzedFile[], containerId: string, containerTechnology: string): ComponentGroup[] {
    const groups: ComponentGroup[] = [];
    const groupedFiles = new Set<string>();

    // Rule 1: Directory-based grouping — one component per file
    for (const file of files) {
      if (groupedFiles.has(file.filePath)) continue;

      const dirRole = this.detectRoleFromPath(file.filePath);
      if (dirRole) {
        const group = this.createGroupFromFile(file, containerId, dirRole, containerTechnology);
        groups.push(group);
        groupedFiles.add(file.filePath);
      }
    }

    // Rule 2: Class-as-component for ungrouped files
    for (const file of files) {
      if (groupedFiles.has(file.filePath)) continue;

      const exportedClasses = file.symbols.filter(
        s => s.kind === 'class' && s.exportType !== 'none'
      );

      if (exportedClasses.length > 0) {
        for (const cls of exportedClasses) {
          const role = this.inferRoleFromName(cls.name);
          const group: ComponentGroup = {
            id: componentId(cls.name),
            name: this.formatClassName(cls.name),
            containerId,
            codeUnitIds: this.getCodeUnitIds(cls),
            sourceFiles: [file.filePath],
            technology: containerTechnology,
            role,
          };
          groups.push(group);
        }
        groupedFiles.add(file.filePath);
      }
    }

    // Rule 3: File-as-component for remaining files
    for (const file of files) {
      if (groupedFiles.has(file.filePath)) continue;

      const hasExports = file.symbols.some(s => s.exportType !== 'none');
      if (hasExports || file.symbols.length > 0) {
        const fileName = path.basename(file.filePath, path.extname(file.filePath));
        const role = this.inferRoleFromName(fileName);
        const group: ComponentGroup = {
          id: componentId(fileName),
          name: this.formatFileName(fileName),
          containerId,
          codeUnitIds: file.symbols.map(s => codeUnitId(s.name)),
          sourceFiles: [file.filePath],
          technology: containerTechnology,
          role,
        };
        groups.push(group);
        groupedFiles.add(file.filePath);
      }
    }

    return groups;
  }

  /**
   * Group files without full analysis (scanner-only mode).
   * Uses file paths + names to infer component structure.
   */
  groupFromPaths(
    sourceFiles: string[],
    containerId: string,
    containerTechnology: string
  ): ComponentGroup[] {
    const groups: ComponentGroup[] = [];
    const groupedFiles = new Set<string>();

    // Group by parent directory role
    // Normalise to forward slashes — fast-glob always returns '/' but path.dirname
    // on Windows may return '\\'
    const dirGroups = new Map<string, string[]>();
    for (const file of sourceFiles) {
      const normalised = file.replace(/\\/g, '/');
      // Skip index/entry files at root
      const dir = normalised.substring(0, normalised.lastIndexOf('/')) || '.';
      if (dir === '.' || dir === 'src') {
        continue;
      }

      if (!dirGroups.has(dir)) {
        dirGroups.set(dir, []);
      }
      dirGroups.get(dir)!.push(normalised);
    }

    for (const [dir, files] of dirGroups) {
      const role = this.detectRoleFromPath(dir + '/dummy');
      if (role) {
        for (const file of files) {
          const baseName = file.substring(file.lastIndexOf('/') + 1);
          const extIdx = baseName.lastIndexOf('.');
          const fileName = extIdx > 0 ? baseName.substring(0, extIdx) : baseName;
          const name = this.formatFileName(fileName);

          groups.push({
            id: componentId(fileName),
            name,
            containerId,
            codeUnitIds: [],
            sourceFiles: [file],
            technology: containerTechnology,
            role,
          });
          groupedFiles.add(file);
        }
      }
    }

    // Rule 2: For ungrouped files, try to infer role from file name
    for (const file of sourceFiles) {
      const normalised = file.replace(/\\/g, '/');
      if (groupedFiles.has(normalised)) continue;
      const dir = normalised.substring(0, normalised.lastIndexOf('/')) || '.';
      if (dir === '.' || dir === 'src') continue;

      const baseName = normalised.substring(normalised.lastIndexOf('/') + 1);
      const extIdx = baseName.lastIndexOf('.');
      const fileName = extIdx > 0 ? baseName.substring(0, extIdx) : baseName;
      const role = this.inferRoleFromName(fileName);
      if (role !== 'service') {
        // Only create a component if we can infer a meaningful role
        groups.push({
          id: componentId(fileName),
          name: this.formatFileName(fileName),
          containerId,
          codeUnitIds: [],
          sourceFiles: [normalised],
          technology: containerTechnology,
          role,
        });
      }
    }

    return groups;
  }

  private detectRoleFromPath(filePath: string): ComponentRole | null {
    for (const { pattern, role } of DIRECTORY_ROLE_MAP) {
      if (pattern.test(filePath)) {
        return role;
      }
    }
    return null;
  }

  private inferRoleFromName(name: string): ComponentRole {
    const lower = name.toLowerCase();
    if (lower.includes('controller')) return 'controller';
    if (lower.includes('service')) return 'service';
    if (lower.includes('repository') || lower.includes('repo')) return 'repository';
    if (lower.includes('middleware')) return 'middleware';
    if (lower.includes('handler')) return 'handler';
    if (lower.includes('model') || lower.includes('entity')) return 'model';
    if (lower.includes('route')) return 'route';
    if (lower.includes('event')) return 'event';
    if (lower.includes('util') || lower.includes('helper')) return 'utility';
    return 'service';
  }

  private createGroupFromFile(
    file: AnalyzedFile,
    containerId: string,
    role: ComponentRole,
    technology: string
  ): ComponentGroup {
    const fileName = path.basename(file.filePath, path.extname(file.filePath));
    return {
      id: componentId(fileName),
      name: this.formatFileName(fileName),
      containerId,
      codeUnitIds: file.symbols.map(s => codeUnitId(s.name)),
      sourceFiles: [file.filePath],
      technology,
      role,
    };
  }

  private getCodeUnitIds(symbol: AnalyzedSymbol): string[] {
    const ids = [codeUnitId(symbol.name)];
    if (symbol.members) {
      for (const member of symbol.members) {
        ids.push(codeUnitId(`${symbol.name}-${member.name}`));
      }
    }
    return ids;
  }

  private formatClassName(name: string): string {
    // PascalCase → spaced: "UserController" → "User Controller"
    return name.replace(/([a-z])([A-Z])/g, '$1 $2');
  }

  private formatFileName(name: string): string {
    // camelCase → spaced: "userController" → "User Controller"
    // snake_case → spaced: "email_handler" → "Email Handler"
    return name
      .replace(/([a-z])([A-Z])/g, '$1 $2')
      .replace(/[_-]+/g, ' ')
      .split(' ')
      .map(w => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ');
  }
}
