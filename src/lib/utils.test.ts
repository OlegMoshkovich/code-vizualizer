/**
 * Tests for utility functions
 */

import axios from 'axios';
import { 
  validateURL, 
  fetchCodeFromURL, 
  getFilenameFromURL, 
  isGitHubURL, 
  isGistURL 
} from './utils';

// Mock axios
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

// Mock axios.isAxiosError function
(axios.isAxiosError as jest.Mock) = jest.fn();

describe('validateURL', () => {
  describe('Basic URL validation', () => {
    it('should return invalid for empty or null URLs', () => {
      expect(validateURL('')).toEqual({ isValid: false, error: 'URL is required' });
      expect(validateURL('   ')).toEqual({ isValid: false, error: 'URL cannot be empty' });
      expect(validateURL(null as unknown as string)).toEqual({ isValid: false, error: 'URL is required' });
      expect(validateURL(undefined as unknown as string)).toEqual({ isValid: false, error: 'URL is required' });
    });

    it('should return invalid for malformed URLs', () => {
      expect(validateURL('not-a-url')).toEqual({ isValid: false, error: 'Invalid URL format' });
      expect(validateURL('http://')).toEqual({ isValid: false, error: 'Invalid URL format' });
      expect(validateURL('://example.com')).toEqual({ isValid: false, error: 'Invalid URL format' });
    });

    it('should return invalid for non-HTTP protocols', () => {
      expect(validateURL('ftp://example.com/file.ts')).toEqual({ 
        isValid: false, 
        error: 'Only HTTP and HTTPS URLs are supported' 
      });
      expect(validateURL('file://local/file.ts')).toEqual({ 
        isValid: false, 
        error: 'Only HTTP and HTTPS URLs are supported' 
      });
    });

    it('should return invalid for unsupported file types', () => {
      expect(validateURL('https://example.com/file.js')).toEqual({ 
        isValid: false, 
        error: 'Unsupported file type. Supported types: .ts, .tsx' 
      });
      expect(validateURL('https://example.com/file.txt')).toEqual({ 
        isValid: false, 
        error: 'Unsupported file type. Supported types: .ts, .tsx' 
      });
    });

    it('should return valid for supported TypeScript files', () => {
      expect(validateURL('https://example.com/file.ts')).toEqual({ 
        isValid: true,
        normalizedUrl: 'https://example.com/file.ts'
      });
      expect(validateURL('https://example.com/component.tsx')).toEqual({ 
        isValid: true,
        normalizedUrl: 'https://example.com/component.tsx'
      });
    });
  });

  describe('GitHub URL normalization', () => {
    it('should normalize GitHub blob URLs to raw URLs', () => {
      const githubUrl = 'https://github.com/user/repo/blob/main/src/file.ts';
      const expected = 'https://raw.githubusercontent.com/user/repo/main/src/file.ts';
      
      expect(validateURL(githubUrl)).toEqual({
        isValid: true,
        normalizedUrl: expected
      });
    });

    it('should normalize GitHub blob URLs with nested paths', () => {
      const githubUrl = 'https://github.com/user/repo/blob/main/src/components/Button.tsx';
      const expected = 'https://raw.githubusercontent.com/user/repo/main/src/components/Button.tsx';
      
      expect(validateURL(githubUrl)).toEqual({
        isValid: true,
        normalizedUrl: expected
      });
    });

    it('should leave raw GitHub URLs unchanged', () => {
      const rawUrl = 'https://raw.githubusercontent.com/user/repo/main/file.ts';
      
      expect(validateURL(rawUrl)).toEqual({
        isValid: true,
        normalizedUrl: rawUrl
      });
    });

    it('should handle GitHub URLs with different branches', () => {
      const githubUrl = 'https://github.com/user/repo/blob/develop/src/utils.ts';
      const expected = 'https://raw.githubusercontent.com/user/repo/develop/src/utils.ts';
      
      expect(validateURL(githubUrl)).toEqual({
        isValid: true,
        normalizedUrl: expected
      });
    });
  });

  describe('Gist URL normalization', () => {
    it('should normalize Gist URLs to raw format', () => {
      const gistUrl = 'https://gist.github.com/user/gist-id/file.ts';
      const expected = 'https://gist.githubusercontent.com/user/gist-id/raw';
      
      expect(validateURL(gistUrl)).toEqual({
        isValid: true,
        normalizedUrl: expected
      });
    });

    it('should leave raw Gist URLs unchanged', () => {
      const rawGistUrl = 'https://gist.githubusercontent.com/user/gist-id/raw/file.ts';
      
      expect(validateURL(rawGistUrl)).toEqual({
        isValid: true,
        normalizedUrl: rawGistUrl
      });
    });
  });
});

describe('fetchCodeFromURL', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (axios.isAxiosError as jest.Mock).mockReturnValue(false);
  });

  it('should successfully fetch TypeScript code', async () => {
    const mockContent = 'function hello(): string { return "world"; }';
    mockedAxios.get.mockResolvedValueOnce({
      data: mockContent,
      headers: { 'content-type': 'text/plain', 'content-length': '42' }
    });

    const result = await fetchCodeFromURL('https://example.com/test.ts');

    expect(result).toEqual({
      success: true,
      content: mockContent,
      url: 'https://example.com/test.ts',
      size: 42
    });
  });

  it('should handle invalid URLs', async () => {
    const result = await fetchCodeFromURL('invalid-url');

    expect(result).toEqual({
      success: false,
      error: 'Invalid URL format',
      url: 'invalid-url'
    });
  });

  it('should handle network errors', async () => {
    const mockError = new Error('Network Error') as Error & { code?: string };
    mockError.code = 'ENOTFOUND';
    
    (axios.isAxiosError as jest.Mock).mockReturnValueOnce(true);
    mockedAxios.get.mockRejectedValueOnce(mockError);

    const result = await fetchCodeFromURL('https://nonexistent.com/test.ts');

    expect(result.success).toBe(false);
    expect(result.error).toContain('Unable to reach the URL');
  });

  it('should handle timeout errors', async () => {
    const mockError = new Error('Timeout Error') as Error & { code?: string };
    mockError.code = 'ETIMEDOUT';
    
    (axios.isAxiosError as jest.Mock).mockReturnValueOnce(true);
    mockedAxios.get.mockRejectedValueOnce(mockError);

    const result = await fetchCodeFromURL('https://example.com/test.ts');

    expect(result.success).toBe(false);
    expect(result.error).toContain('Request timed out');
  });

  it('should handle HTTP error codes', async () => {
    const errorCodes = [
      { status: 404, expectedMessage: 'File not found (404)' },
      { status: 403, expectedMessage: 'Access forbidden (403)' },
      { status: 401, expectedMessage: 'Authentication required (401)' },
      { status: 500, expectedMessage: 'Server error (500)' }
    ];

    for (const { status, expectedMessage } of errorCodes) {
      const mockError = new Error('HTTP Error') as Error & { response?: { status: number } };
      mockError.response = { status };
      
      (axios.isAxiosError as jest.Mock).mockReturnValueOnce(true);
      mockedAxios.get.mockRejectedValueOnce(mockError);

      const result = await fetchCodeFromURL('https://example.com/test.ts');

      expect(result.success).toBe(false);
      expect(result.error).toContain(expectedMessage);
    }
  });

  it('should reject files that are too large', async () => {
    mockedAxios.get.mockResolvedValueOnce({
      data: 'content',
      headers: { 'content-length': '600000' } // 600KB > 500KB limit
    });

    const result = await fetchCodeFromURL('https://example.com/large-file.ts');

    expect(result.success).toBe(false);
    expect(result.error).toContain('File too large');
    expect(result.size).toBe(600000);
  });

  it('should reject non-text content types', async () => {
    mockedAxios.get.mockResolvedValueOnce({
      data: 'content',
      headers: { 'content-type': 'application/pdf' }
    });

    const result = await fetchCodeFromURL('https://example.com/test.ts');

    expect(result.success).toBe(false);
    expect(result.error).toBe('URL does not point to a text file');
  });

  it('should accept various text content types', async () => {
    const validContentTypes = [
      'text/plain',
      'text/typescript',
      'application/typescript',
      'application/javascript',
      'text/javascript'
    ];

    for (const contentType of validContentTypes) {
      mockedAxios.get.mockResolvedValueOnce({
        data: 'function test() {}',
        headers: { 'content-type': contentType }
      });

      const result = await fetchCodeFromURL('https://example.com/test.ts');

      expect(result.success).toBe(true);
    }
  });

  it('should reject empty content', async () => {
    mockedAxios.get.mockResolvedValueOnce({
      data: '',
      headers: { 'content-type': 'text/plain' }
    });

    const result = await fetchCodeFromURL('https://example.com/test.ts');

    expect(result.success).toBe(false);
    expect(result.error).toContain('No content received from URL');
  });

  it('should reject non-TypeScript-like content', async () => {
    mockedAxios.get.mockResolvedValueOnce({
      data: 'This is just plain text with no code patterns.',
      headers: { 'content-type': 'text/plain' }
    });

    const result = await fetchCodeFromURL('https://example.com/test.ts');

    expect(result.success).toBe(false);
    expect(result.error).toContain('Content does not appear to be TypeScript code');
  });

  it('should accept TypeScript-like content patterns', async () => {
    const validContents = [
      'function test() {}',
      'const value = 42;',
      'let x: number = 5;',
      'interface User { name: string; }',
      'type MyType = string | number;',
      'class MyClass {}',
      'import React from "react";',
      'export default function Component() {}',
      'const arrow = () => {};',
      'function typed(param: string): void {}'
    ];

    for (const content of validContents) {
      mockedAxios.get.mockResolvedValueOnce({
        data: content,
        headers: { 'content-type': 'text/plain' }
      });

      const result = await fetchCodeFromURL('https://example.com/test.ts');

      expect(result.success).toBe(true);
      expect(result.content).toBe(content);
    }
  });
});

describe('getFilenameFromURL', () => {
  it('should extract filename from valid URLs', () => {
    expect(getFilenameFromURL('https://example.com/test.ts')).toBe('test.ts');
    expect(getFilenameFromURL('https://github.com/user/repo/blob/main/src/utils.tsx')).toBe('utils.tsx');
    expect(getFilenameFromURL('https://example.com/path/to/file.ts')).toBe('file.ts');
  });

  it('should handle URLs without filename', () => {
    expect(getFilenameFromURL('https://example.com/')).toBe('unknown.ts');
    expect(getFilenameFromURL('https://example.com')).toBe('unknown.ts');
  });

  it('should handle invalid URLs', () => {
    expect(getFilenameFromURL('not-a-url')).toBe('unknown.ts');
    expect(getFilenameFromURL('')).toBe('unknown.ts');
  });
});

describe('isGitHubURL', () => {
  it('should return true for GitHub URLs', () => {
    expect(isGitHubURL('https://github.com/user/repo')).toBe(true);
    expect(isGitHubURL('https://github.com/user/repo/blob/main/file.ts')).toBe(true);
    expect(isGitHubURL('https://raw.githubusercontent.com/user/repo/main/file.ts')).toBe(true);
  });

  it('should return false for non-GitHub URLs', () => {
    expect(isGitHubURL('https://example.com/file.ts')).toBe(false);
    expect(isGitHubURL('https://gitlab.com/user/repo')).toBe(false);
    expect(isGitHubURL('invalid-url')).toBe(false);
  });
});

describe('isGistURL', () => {
  it('should return true for Gist URLs', () => {
    expect(isGistURL('https://gist.github.com/user/gist-id')).toBe(true);
    expect(isGistURL('https://gist.githubusercontent.com/user/gist-id/raw')).toBe(true);
  });

  it('should return false for non-Gist URLs', () => {
    expect(isGistURL('https://github.com/user/repo')).toBe(false);
    expect(isGistURL('https://example.com/file.ts')).toBe(false);
    expect(isGistURL('invalid-url')).toBe(false);
  });
});

// Test axios mock setup
describe('Axios Mock Setup', () => {
  it('should properly mock axios for testing', () => {
    expect(jest.isMockFunction(mockedAxios.get)).toBe(true);
  });
});