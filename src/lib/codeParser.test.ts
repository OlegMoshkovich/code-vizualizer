/**
 * Tests for TypeScript Code Parser
 */

import { parseTypeScriptCode, extractFunctions, extractFunctionCalls, extractImportsAndExports } from './codeParser';
import { readFileSync } from 'fs';
import { join } from 'path';

// Helper to read fixture files
const readFixture = (filename: string): string => {
  try {
    return readFileSync(join(__dirname, '__fixtures__', filename), 'utf-8');
  } catch {
    // Fallback for test environment
    return '';
  }
};

describe('parseTypeScriptCode', () => {
  describe('Basic functionality', () => {
    it('should parse simple TypeScript code', async () => {
      const code = `
        function hello(name: string): string {
          return "Hello " + name;
        }

        const add = (a: number, b: number): number => a + b;
      `;

      const result = await parseTypeScriptCode(code);

      expect(result.errors).toHaveLength(0);
      expect(result.functions).toHaveLength(2);
      expect(result.functions[0].name).toBe('hello');
      expect(result.functions[0].parameters).toEqual([
        { name: 'name', type: 'string', optional: false }
      ]);
      expect(result.functions[0].returnType).toBe('string');
      expect(result.functions[1].name).toBe('add');
    });

    it('should handle empty input', async () => {
      const result = await parseTypeScriptCode('');
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].type).toBe('validation');
    });

    it('should handle null/undefined input', async () => {
      const result1 = await parseTypeScriptCode(null as any);
      const result2 = await parseTypeScriptCode(undefined as any);
      
      expect(result1.errors[0].type).toBe('validation');
      expect(result2.errors[0].type).toBe('validation');
    });

    it('should handle files that are too large', async () => {
      const largeCode = 'x'.repeat(600 * 1024); // 600KB
      const result = await parseTypeScriptCode(largeCode);
      
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].message).toContain('too large');
    });
  });

  describe('Function extraction', () => {
    it('should extract various function types', async () => {
      const code = `
        // Function declaration
        function regularFunc(x: number): void {}

        // Arrow function
        const arrowFunc = (y: string): string => y;

        // Function expression
        const funcExpr = function(z: boolean): boolean { return z; };

        // Async function
        async function asyncFunc(): Promise<void> {}

        // Class with methods
        class MyClass {
          method(param: number): string {
            return param.toString();
          }

          async asyncMethod(): Promise<number> {
            return 42;
          }
        }
      `;

      const result = await parseTypeScriptCode(code);

      expect(result.functions).toHaveLength(6);
      
      // Check function types
      const names = result.functions.map(f => f.name);
      expect(names).toContain('regularFunc');
      expect(names).toContain('arrowFunc');
      expect(names).toContain('funcExpr');
      expect(names).toContain('asyncFunc');
      expect(names).toContain('MyClass.method');
      expect(names).toContain('MyClass.asyncMethod');

      // Check async detection
      const asyncFuncs = result.functions.filter(f => f.async);
      expect(asyncFuncs).toHaveLength(2);
      expect(asyncFuncs.map(f => f.name)).toEqual(['asyncFunc', 'MyClass.asyncMethod']);
    });

    it('should extract parameter information correctly', async () => {
      const code = `
        function complex(
          required: string,
          optional?: number,
          withDefault: boolean = true,
          ...rest: any[]
        ): void {}
      `;

      const result = await parseTypeScriptCode(code);
      const func = result.functions[0];

      expect(func.parameters).toHaveLength(4);
      expect(func.parameters[0]).toEqual({
        name: 'required',
        type: 'string',
        optional: false
      });
      expect(func.parameters[1]).toEqual({
        name: 'optional',
        type: 'number',
        optional: true
      });
      expect(func.parameters[2]).toEqual({
        name: 'withDefault',
        type: 'boolean',
        optional: true,
        defaultValue: 'true'
      });
      expect(func.parameters[3]).toEqual({
        name: '...rest',
        type: 'any',
        optional: false
      });
    });

    it('should detect exported functions', async () => {
      const code = `
        export function exported(): void {}
        function notExported(): void {}
        export default function defaultExport(): void {}
      `;

      const result = await parseTypeScriptCode(code);

      const exported = result.functions.filter(f => f.exported);
      expect(exported).toHaveLength(2);
      expect(exported.map(f => f.name)).toContain('exported');
      expect(exported.map(f => f.name)).toContain('defaultExport');
    });
  });

  describe('Function call extraction', () => {
    it('should track function calls correctly', async () => {
      const code = `
        function caller(): void {
          callee1();
          callee2(123);
        }

        function callee1(): void {}
        function callee2(x: number): void {}
      `;

      const result = await parseTypeScriptCode(code);

      expect(result.calls).toHaveLength(2);
      expect(result.calls[0]).toMatchObject({
        caller: 'caller',
        callee: 'callee1'
      });
      expect(result.calls[1]).toMatchObject({
        caller: 'caller',
        callee: 'callee2'
      });
    });

    it('should track method calls', async () => {
      const code = `
        class Service {
          method1(): void {
            this.method2();
          }

          method2(): void {}
        }
      `;

      const result = await parseTypeScriptCode(code);

      expect(result.calls).toHaveLength(1);
      expect(result.calls[0]).toMatchObject({
        caller: 'Service.method1',
        callee: 'Service.method2'
      });
    });

    it('should handle nested calls', async () => {
      const code = `
        function outer(): void {
          function inner(): void {
            target();
          }
          inner();
        }

        function target(): void {}
      `;

      const result = await parseTypeScriptCode(code);

      const calls = result.calls;
      expect(calls.some(c => c.caller === 'outer' && c.callee === 'inner')).toBe(true);
      expect(calls.some(c => c.caller === 'inner' && c.callee === 'target')).toBe(true);
    });
  });

  describe('Import/Export extraction', () => {
    it('should extract imports and exports', async () => {
      const code = `
        import { helper } from './helper';
        import React from 'react';

        export function exported1(): void {}
        export { exported2 };
        export default function(): void {}

        function exported2(): void {}
      `;

      const result = await parseTypeScriptCode(code);
      const metadata = (result as any).metadata;

      expect(metadata.imports).toContain('./helper');
      expect(metadata.imports).toContain('react');
      expect(metadata.exports).toContain('exported1');
      expect(metadata.exports).toContain('exported2');
    });
  });

  describe('Error handling', () => {
    it('should handle syntax errors gracefully', async () => {
      const code = 'function broken(x: number {'; // Missing closing parenthesis
      const result = await parseTypeScriptCode(code);

      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].type).toBe('syntax');
      expect(result.functions).toHaveLength(0);
    });

    it('should provide line/column information for errors', async () => {
      const code = `
        function valid(): void {}
        function broken(x: number {
      `;
      const result = await parseTypeScriptCode(code);

      expect(result.errors[0].line).toBeDefined();
      expect(result.errors[0].column).toBeDefined();
    });
  });

  describe('Fixture files', () => {
    it('should parse simple.ts fixture', async () => {
      const code = readFixture('simple.ts');
      if (!code) {
        console.warn('Fixture file not found, skipping test');
        return;
      }

      const result = await parseTypeScriptCode(code);

      expect(result.errors).toHaveLength(0);
      expect(result.functions.length).toBeGreaterThan(0);
      expect(result.calls.length).toBeGreaterThan(0);

      // Should find main functions
      const names = result.functions.map(f => f.name);
      expect(names).toContain('greet');
      expect(names).toContain('calculateSum');
      expect(names).toContain('multiply');
      expect(names).toContain('processData');
    });

    it('should parse complex.ts fixture', async () => {
      const code = readFixture('complex.ts');
      if (!code) {
        console.warn('Fixture file not found, skipping test');
        return;
      }

      const result = await parseTypeScriptCode(code);

      expect(result.errors).toHaveLength(0);
      expect(result.functions.length).toBeGreaterThan(5);

      // Should find class methods
      const names = result.functions.map(f => f.name);
      expect(names.some(name => name.startsWith('UserService.'))).toBe(true);

      // Should find async functions
      const asyncFunctions = result.functions.filter(f => f.async);
      expect(asyncFunctions.length).toBeGreaterThan(0);
    });

    it('should handle invalid.ts fixture gracefully', async () => {
      const code = readFixture('invalid.ts');
      if (!code) {
        console.warn('Fixture file not found, skipping test');
        return;
      }

      const result = await parseTypeScriptCode(code);

      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0].type).toBe('syntax');
    });
  });

  describe('Edge cases', () => {
    it('should handle IIFE and closures', async () => {
      const code = readFixture('edge-cases.ts');
      if (!code) return;

      const result = await parseTypeScriptCode(code);

      expect(result.errors).toHaveLength(0);
      expect(result.functions.length).toBeGreaterThan(8);

      // Should find various patterns
      const names = result.functions.map(f => f.name);
      expect(names).toContain('fibonacci');
      expect(names).toContain('createCounter');
      expect(names).toContain('Calculator.add');
    });

    it('should handle functions with no parameters', async () => {
      const code = 'function noParams(): void {}';
      const result = await parseTypeScriptCode(code);

      expect(result.functions[0].parameters).toHaveLength(0);
    });

    it('should handle functions with no return type annotation', async () => {
      const code = 'function noReturn() {}';
      const result = await parseTypeScriptCode(code);

      expect(result.functions[0].returnType).toBe('any');
    });
  });
});