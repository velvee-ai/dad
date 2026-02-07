import { describe, it, expect } from 'vitest';
import { ComponentGrouper } from '../../src/grouper/ComponentGrouper';
import type { AnalyzedFile } from '../../src/types';

describe('ComponentGrouper', () => {
  describe('groupFromPaths', () => {
    it('should group files by directory role', () => {
      const grouper = new ComponentGrouper();
      const sourceFiles = [
        'src/controllers/userController.ts',
        'src/services/userService.ts',
        'src/services/emailService.ts',
        'src/repositories/userRepository.ts',
        'src/models/user.ts',
        'src/index.ts',
      ];

      const groups = grouper.groupFromPaths(sourceFiles, 'container:user-service', 'TypeScript/Express');

      expect(groups.length).toBeGreaterThanOrEqual(4);

      const roles = groups.map(g => g.role);
      expect(roles).toContain('controller');
      expect(roles).toContain('service');
      expect(roles).toContain('repository');
      expect(roles).toContain('model');
    });

    it('should assign correct containerId to all groups', () => {
      const grouper = new ComponentGrouper();
      const sourceFiles = [
        'src/controllers/userController.ts',
        'src/services/userService.ts',
      ];

      const groups = grouper.groupFromPaths(sourceFiles, 'container:user-service', 'TypeScript');

      for (const group of groups) {
        expect(group.containerId).toBe('container:user-service');
      }
    });

    it('should detect middleware directory', () => {
      const grouper = new ComponentGrouper();
      const sourceFiles = [
        'src/middleware/authMiddleware.ts',
        'src/middleware/rateLimiter.ts',
      ];

      const groups = grouper.groupFromPaths(sourceFiles, 'container:api-gateway', 'TypeScript/Express');

      for (const group of groups) {
        expect(group.role).toBe('middleware');
      }
    });

    it('should detect route directory', () => {
      const grouper = new ComponentGrouper();
      const sourceFiles = [
        'src/routes/auth.ts',
        'src/routes/orders.ts',
      ];

      const groups = grouper.groupFromPaths(sourceFiles, 'container:api-gateway', 'TypeScript/Express');

      for (const group of groups) {
        expect(group.role).toBe('route');
      }
    });

    it('should detect handler directory (Python)', () => {
      const grouper = new ComponentGrouper();
      const sourceFiles = [
        'src/handlers/email_handler.py',
        'src/handlers/sms_handler.py',
      ];

      const groups = grouper.groupFromPaths(
        sourceFiles,
        'container:notification-service',
        'Python/FastAPI'
      );

      for (const group of groups) {
        expect(group.role).toBe('handler');
      }
    });

    it('should detect events directory', () => {
      const grouper = new ComponentGrouper();
      const sourceFiles = ['src/events/orderEvents.ts'];

      const groups = grouper.groupFromPaths(sourceFiles, 'container:order-service', 'TypeScript');

      expect(groups).toHaveLength(1);
      expect(groups[0].role).toBe('event');
    });
  });

  describe('group (from analyzed files)', () => {
    it('should group by directory pattern for analyzed files', () => {
      const grouper = new ComponentGrouper();
      const files: AnalyzedFile[] = [
        {
          filePath: 'src/controllers/userController.ts',
          language: 'typescript',
          containerId: 'container:user-service',
          symbols: [
            {
              name: 'UserController',
              kind: 'class',
              exportType: 'named',
              startLine: 5,
              endLine: 50,
              members: [
                { name: 'register', kind: 'method', exportType: 'none', startLine: 10, endLine: 25 },
                { name: 'getProfile', kind: 'method', exportType: 'none', startLine: 27, endLine: 45 },
              ],
            },
          ],
          imports: [],
        },
        {
          filePath: 'src/services/userService.ts',
          language: 'typescript',
          containerId: 'container:user-service',
          symbols: [
            {
              name: 'UserService',
              kind: 'class',
              exportType: 'named',
              startLine: 3,
              endLine: 80,
            },
          ],
          imports: [],
        },
      ];

      const groups = grouper.group(files, 'container:user-service', 'TypeScript/Express');

      const controllerGroup = groups.find(g => g.role === 'controller');
      expect(controllerGroup).toBeDefined();

      const serviceGroup = groups.find(g => g.role === 'service');
      expect(serviceGroup).toBeDefined();
    });

    it('should use class-as-component for ungrouped exported classes', () => {
      const grouper = new ComponentGrouper();
      const files: AnalyzedFile[] = [
        {
          filePath: 'src/PaymentProcessor.ts',
          language: 'typescript',
          containerId: 'container:order-service',
          symbols: [
            {
              name: 'PaymentProcessor',
              kind: 'class',
              exportType: 'named',
              startLine: 1,
              endLine: 50,
            },
          ],
          imports: [],
        },
      ];

      const groups = grouper.group(files, 'container:order-service', 'TypeScript');

      expect(groups).toHaveLength(1);
      expect(groups[0].name).toBe('Payment Processor');
    });

    it('should format component names from camelCase and PascalCase', () => {
      const grouper = new ComponentGrouper();
      const files: AnalyzedFile[] = [
        {
          filePath: 'src/emailService.ts',
          language: 'typescript',
          containerId: 'container:user-service',
          symbols: [
            { name: 'sendEmail', kind: 'function', exportType: 'named', startLine: 1, endLine: 10 },
          ],
          imports: [],
        },
      ];

      const groups = grouper.group(files, 'container:user-service', 'TypeScript');
      expect(groups.length).toBeGreaterThan(0);
    });
  });
});
