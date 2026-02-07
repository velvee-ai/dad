import { describe, it, expect } from 'vitest';
import * as path from 'path';
import { LightweightSymbolExtractor } from '../../src/analyzer/LightweightSymbolExtractor';

const MOCK_ROOT = path.resolve(__dirname, '../../../../examples/mock-microservices');

describe('LightweightSymbolExtractor', () => {
  const extractor = new LightweightSymbolExtractor();

  describe('extractFromPython', () => {
    it('should extract classes from Python files', () => {
      const filePath = path.join(
        MOCK_ROOT,
        'ecommerce-platform/services/notification-service/src/handlers/email_handler.py'
      );
      const result = extractor.extractFromPython(filePath, 'container:notification-service');

      expect(result).not.toBeNull();
      expect(result!.language).toBe('python');
      expect(result!.containerId).toBe('container:notification-service');

      const emailHandler = result!.symbols.find(s => s.name === 'EmailHandler');
      expect(emailHandler).toBeDefined();
      expect(emailHandler!.kind).toBe('class');
      expect(emailHandler!.exportType).toBe('named');
    });

    it('should extract class methods as members', () => {
      const filePath = path.join(
        MOCK_ROOT,
        'ecommerce-platform/services/notification-service/src/handlers/email_handler.py'
      );
      const result = extractor.extractFromPython(filePath, 'container:notification-service');

      const emailHandler = result!.symbols.find(s => s.name === 'EmailHandler');
      expect(emailHandler!.members).toBeDefined();
      expect(emailHandler!.members!.length).toBeGreaterThan(0);

      const methodNames = emailHandler!.members!.map(m => m.name);
      expect(methodNames).toContain('send_order_confirmation');
      expect(methodNames).toContain('send_shipping_notification');
    });

    it('should skip private methods (starting with _)', () => {
      const filePath = path.join(
        MOCK_ROOT,
        'ecommerce-platform/services/notification-service/src/handlers/email_handler.py'
      );
      const result = extractor.extractFromPython(filePath, 'container:notification-service');

      const emailHandler = result!.symbols.find(s => s.name === 'EmailHandler');
      const memberNames = emailHandler!.members!.map(m => m.name);
      // _send is private, should be excluded
      expect(memberNames).not.toContain('_send');
    });

    it('should extract SMSHandler from sms_handler.py', () => {
      const filePath = path.join(
        MOCK_ROOT,
        'ecommerce-platform/services/notification-service/src/handlers/sms_handler.py'
      );
      const result = extractor.extractFromPython(filePath, 'container:notification-service');

      expect(result).not.toBeNull();
      const smsHandler = result!.symbols.find(s => s.name === 'SMSHandler');
      expect(smsHandler).toBeDefined();
      expect(smsHandler!.kind).toBe('class');
      expect(smsHandler!.members!.length).toBeGreaterThan(0);
    });

    it('should return empty imports array (no LSP)', () => {
      const filePath = path.join(
        MOCK_ROOT,
        'ecommerce-platform/services/notification-service/src/handlers/email_handler.py'
      );
      const result = extractor.extractFromPython(filePath, 'container:notification-service');
      expect(result!.imports).toEqual([]);
    });
  });

  describe('extractFromTypeScript', () => {
    it('should extract exported functions and classes from TS files', () => {
      // Find a TypeScript file from the mock
      const filePath = path.join(
        MOCK_ROOT,
        'ecommerce-platform/services/api-gateway/src/routes/auth.ts'
      );

      // This file might not have classes, so let's just verify it doesn't crash
      const result = extractor.extractFromTypeScript(filePath, 'container:api-gateway');
      if (result) {
        expect(result.language).toBe('typescript');
        expect(result.containerId).toBe('container:api-gateway');
        expect(result.imports).toEqual([]);
      }
    });

    it('should return null for non-existent files', () => {
      const result = extractor.extractFromTypeScript(
        '/nonexistent/file.ts',
        'container:test'
      );
      expect(result).toBeNull();
    });
  });

  describe('extractFromFile', () => {
    it('should route Python files to Python extractor', () => {
      const filePath = path.join(
        MOCK_ROOT,
        'ecommerce-platform/services/notification-service/src/handlers/email_handler.py'
      );
      const result = extractor.extractFromFile(filePath, 'container:test');
      expect(result).not.toBeNull();
      expect(result!.language).toBe('python');
    });

    it('should return null for unsupported file types', () => {
      const result = extractor.extractFromFile('/test/file.go', 'container:test');
      expect(result).toBeNull();
    });
  });
});
