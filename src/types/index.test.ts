/**
 * Tests for TypeScript types and type guards
 */

import {
  FunctionData,
  FunctionCall,
  FunctionParameter,
  ParseError,
  isValidFunctionData,
  isValidFunctionCall,
  type URLValidationResult,
  type CodeFetchResult,
  type SupportedFileType,
  type AnalysisStatus,
} from './index';

describe('Type Guards', () => {
  describe('isValidFunctionData', () => {
    it('should return true for valid FunctionData object', () => {
      const validFunction: FunctionData = {
        name: 'testFunction',
        parameters: [
          { name: 'param1', type: 'string' },
          { name: 'param2', type: 'number', optional: true }
        ],
        returnType: 'void',
        location: {
          startLine: 1,
          endLine: 5,
          startColumn: 0,
          endColumn: 10
        }
      };

      expect(isValidFunctionData(validFunction)).toBe(true);
    });

    it('should return false for null or undefined', () => {
      expect(isValidFunctionData(null)).toBe(false);
      expect(isValidFunctionData(undefined)).toBe(false);
    });

    it('should return false for non-object values', () => {
      expect(isValidFunctionData('string')).toBe(false);
      expect(isValidFunctionData(123)).toBe(false);
      expect(isValidFunctionData([])).toBe(false);
    });

    it('should return false for objects missing required properties', () => {
      expect(isValidFunctionData({})).toBe(false);
      expect(isValidFunctionData({ name: 'test' })).toBe(false);
      expect(isValidFunctionData({ 
        name: 'test', 
        parameters: [] 
      })).toBe(false);
      expect(isValidFunctionData({ 
        name: 'test', 
        parameters: [], 
        returnType: 'void' 
      })).toBe(false);
    });

    it('should return false for objects with wrong property types', () => {
      expect(isValidFunctionData({
        name: 123, // should be string
        parameters: [],
        returnType: 'void',
        location: { startLine: 1, endLine: 2, startColumn: 0, endColumn: 5 }
      })).toBe(false);

      expect(isValidFunctionData({
        name: 'test',
        parameters: 'not-array', // should be array
        returnType: 'void',
        location: { startLine: 1, endLine: 2, startColumn: 0, endColumn: 5 }
      })).toBe(false);

      expect(isValidFunctionData({
        name: 'test',
        parameters: [],
        returnType: 123, // should be string
        location: { startLine: 1, endLine: 2, startColumn: 0, endColumn: 5 }
      })).toBe(false);
    });
  });

  describe('isValidFunctionCall', () => {
    it('should return true for valid FunctionCall object', () => {
      const validCall: FunctionCall = {
        caller: 'functionA',
        callee: 'functionB',
        lineNumber: 10,
        columnNumber: 5
      };

      expect(isValidFunctionCall(validCall)).toBe(true);
    });

    it('should return true for valid FunctionCall without optional columnNumber', () => {
      const validCall: FunctionCall = {
        caller: 'functionA',
        callee: 'functionB',
        lineNumber: 10
      };

      expect(isValidFunctionCall(validCall)).toBe(true);
    });

    it('should return false for null or undefined', () => {
      expect(isValidFunctionCall(null)).toBe(false);
      expect(isValidFunctionCall(undefined)).toBe(false);
    });

    it('should return false for non-object values', () => {
      expect(isValidFunctionCall('string')).toBe(false);
      expect(isValidFunctionCall(123)).toBe(false);
      expect(isValidFunctionCall([])).toBe(false);
    });

    it('should return false for objects missing required properties', () => {
      expect(isValidFunctionCall({})).toBe(false);
      expect(isValidFunctionCall({ caller: 'test' })).toBe(false);
      expect(isValidFunctionCall({ 
        caller: 'test', 
        callee: 'test2' 
      })).toBe(false);
    });

    it('should return false for objects with wrong property types', () => {
      expect(isValidFunctionCall({
        caller: 123, // should be string
        callee: 'test',
        lineNumber: 10
      })).toBe(false);

      expect(isValidFunctionCall({
        caller: 'test',
        callee: 123, // should be string
        lineNumber: 10
      })).toBe(false);

      expect(isValidFunctionCall({
        caller: 'test',
        callee: 'test2',
        lineNumber: 'ten' // should be number
      })).toBe(false);
    });
  });
});

describe('Type Definitions', () => {
  it('should allow valid FunctionParameter objects', () => {
    const param1: FunctionParameter = {
      name: 'arg1',
      type: 'string'
    };

    const param2: FunctionParameter = {
      name: 'arg2',
      type: 'number',
      optional: true,
      defaultValue: '0'
    };

    expect(param1.name).toBe('arg1');
    expect(param2.optional).toBe(true);
  });

  it('should allow valid ParseError objects', () => {
    const syntaxError: ParseError = {
      message: 'Unexpected token',
      line: 5,
      column: 10,
      type: 'syntax'
    };

    const networkError: ParseError = {
      message: 'Network timeout',
      type: 'network'
    };

    expect(syntaxError.type).toBe('syntax');
    expect(networkError.line).toBeUndefined();
  });

  it('should allow valid URLValidationResult objects', () => {
    const validResult: URLValidationResult = {
      isValid: true,
      normalizedUrl: 'https://example.com/file.ts'
    };

    const invalidResult: URLValidationResult = {
      isValid: false,
      error: 'Invalid URL format'
    };

    expect(validResult.isValid).toBe(true);
    expect(invalidResult.error).toBe('Invalid URL format');
  });

  it('should allow valid CodeFetchResult objects', () => {
    const successResult: CodeFetchResult = {
      success: true,
      content: 'function test() {}',
      url: 'https://example.com/test.ts',
      size: 1024
    };

    const errorResult: CodeFetchResult = {
      success: false,
      error: 'File not found',
      url: 'https://example.com/missing.ts'
    };

    expect(successResult.success).toBe(true);
    expect(errorResult.error).toBe('File not found');
  });

  it('should enforce SupportedFileType values', () => {
    const tsFile: SupportedFileType = '.ts';
    const tsxFile: SupportedFileType = '.tsx';

    expect(tsFile).toBe('.ts');
    expect(tsxFile).toBe('.tsx');
  });

  it('should enforce AnalysisStatus values', () => {
    const statuses: AnalysisStatus[] = [
      'idle',
      'validating', 
      'fetching',
      'parsing',
      'complete',
      'error'
    ];

    expect(statuses).toHaveLength(6);
    expect(statuses).toContain('idle');
    expect(statuses).toContain('complete');
  });
});