import * as path from 'path';
import type { AnalyzedFile, AnalyzedSymbol, ComponentGroup, ComponentRole } from '../types';
import { componentId, slugify } from '../assembler/IdGenerator';
import { codeUnitId } from '../assembler/IdGenerator';

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

    // Rule 1: Directory-based grouping
    for (const file of files) {
      if (groupedFiles.has(file.filePath)) continue;

      const dirRole = this.detectRoleFromPath(file.filePath);
      if (dirRole) {
        const existing = groups.find(
          g => g.containerId === containerId && g.role === dirRole && this.sameDirGroup(g, file)
        );

        if (existing) {
          this.addFileToGroup(existing, file);
          groupedFiles.add(file.filePath);
        } else {
          const group = this.createGroupFromFile(file, containerId, dirRole, containerTechnology);
          groups.push(group);
          groupedFiles.add(file.filePath);
        }
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
    const dirGroups = new Map<string, string[]>();
    for (const file of sourceFiles) {
      // Skip index/entry files at root
      const dir = path.dirname(file);
      if (dir === '.' || dir === 'src') {
        continue;
      }

      const key = dir;
      if (!dirGroups.has(key)) {
        dirGroups.set(key, []);
      }
      dirGroups.get(key)!.push(file);
    }

    for (const [dir, files] of dirGroups) {
      const role = this.detectRoleFromPath(dir + '/dummy');
      if (role) {
        for (const file of files) {
          const fileName = path.basename(file, path.extname(file));
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

  private sameDirGroup(group: ComponentGroup, file: AnalyzedFile): boolean {
    if (group.sourceFiles.length === 0) return false;
    const existingDir = path.dirname(group.sourceFiles[0]);
    const newDir = path.dirname(file.filePath);
    return existingDir === newDir;
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

  private addFileToGroup(group: ComponentGroup, file: AnalyzedFile): void {
    group.sourceFiles.push(file.filePath);
    for (const sym of file.symbols) {
      group.codeUnitIds.push(codeUnitId(sym.name));
    }
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
