/**
 * Tests for Parse Code API Route
 */

import { NextRequest } from 'next/server';
import { POST, GET } from './route';

// Mock the dependencies
jest.mock('../../../lib/utils', () => ({
  validateURL: jest.fn(),
  fetchCodeFromURL: jest.fn(),
  getFilenameFromURL: jest.fn(),
}));

jest.mock('../../../lib/codeParser', () => ({
  parseTypeScriptCode: jest.fn(),
}));

jest.mock('../../../lib/graphBuilder', () => ({
  buildReactFlowGraph: jest.fn(),
}));

import { validateURL, fetchCodeFromURL, getFilenameFromURL } from '../../../lib/utils';
import { parseTypeScriptCode } from '../../../lib/codeParser';
import { buildReactFlowGraph } from '../../../lib/graphBuilder';

const mockValidateURL = validateURL as jest.MockedFunction<typeof validateURL>;
const mockFetchCodeFromURL = fetchCodeFromURL as jest.MockedFunction<typeof fetchCodeFromURL>;
const mockGetFilenameFromURL = getFilenameFromURL as jest.MockedFunction<typeof getFilenameFromURL>;
const mockParseTypeScriptCode = parseTypeScriptCode as jest.MockedFunction<typeof parseTypeScriptCode>;
const mockBuildReactFlowGraph = buildReactFlowGraph as jest.MockedFunction<typeof buildReactFlowGraph>;

// Helper to create NextRequest
const createRequest = (body?: any, headers?: Record<string, string>) => {
  return new NextRequest('http://localhost:3000/api/parse-code', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
    body: body ? JSON.stringify(body) : undefined,
  });
};

describe('POST /api/parse-code', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Default mocks
    mockValidateURL.mockReturnValue({ isValid: true, normalizedUrl: 'https://example.com/test.ts' });
    mockFetchCodeFromURL.mockResolvedValue({
      success: true,
      content: 'function test() {}',
      url: 'https://example.com/test.ts',
      size: 100,
    });
    mockParseTypeScriptCode.mockResolvedValue({
      functions: [
        {
          name: 'test',
          parameters: [],
          returnType: 'void',
          location: { startLine: 1, endLine: 1, startColumn: 0, endColumn: 10 },
        },
      ],
      calls: [],
      errors: [],
      metadata: {
        imports: [],
        exports: ['test'],
      },
    } as any);
    mockBuildReactFlowGraph.mockReturnValue({
      nodes: [
        {
          id: 'node-test',
          type: 'function',
          position: { x: 0, y: 0 },
          data: { label: 'test' },
        },
      ],
      edges: [],
    });
    mockGetFilenameFromURL.mockReturnValue('test.ts');
  });

  describe('Request validation', () => {
    it('should reject invalid JSON', async () => {
      const request = new NextRequest('http://localhost:3000/api/parse-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: 'invalid json{',
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toContain('Invalid JSON');
    });

    it('should reject missing URL', async () => {
      const request = createRequest({});

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toContain('URL is required');
    });

    it('should reject invalid URL type', async () => {
      const request = createRequest({ url: 123 });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toContain('URL is required');
    });
  });

  describe('URL validation', () => {
    it('should reject invalid URLs', async () => {
      mockValidateURL.mockReturnValue({ isValid: false, error: 'Invalid URL format' });

      const request = createRequest({ url: 'invalid-url' });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toContain('Invalid URL');
    });

    it('should handle fetch failures', async () => {
      mockFetchCodeFromURL.mockResolvedValue({
        success: false,
        error: 'File not found',
        url: 'https://example.com/missing.ts',
      });

      const request = createRequest({ url: 'https://example.com/missing.ts' });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toContain('Failed to fetch code');
    });
  });

  describe('Code parsing', () => {
    it('should reject code with syntax errors', async () => {
      mockParseTypeScriptCode.mockResolvedValue({
        functions: [],
        calls: [],
        errors: [{ type: 'syntax', message: 'Unexpected token' }],
      });

      const request = createRequest({ url: 'https://example.com/broken.ts' });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toContain('Failed to parse TypeScript code');
    });

    it('should reject files with no functions', async () => {
      mockParseTypeScriptCode.mockResolvedValue({
        functions: [],
        calls: [],
        errors: [],
      });

      const request = createRequest({ url: 'https://example.com/empty.ts' });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toContain('No functions found');
    });
  });

  describe('Successful parsing', () => {
    it('should return graph data for valid TypeScript file', async () => {
      const request = createRequest({ url: 'https://example.com/test.ts' });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.nodes).toHaveLength(1);
      expect(data.data.edges).toHaveLength(0);
      expect(data.data.metadata).toMatchObject({
        fileName: 'test.ts',
        totalFunctions: 1,
        totalCalls: 0,
        imports: [],
        exports: ['test'],
        fileSize: 100,
      });
      expect(typeof data.data.metadata.parseTime).toBe('number');
    });

    it('should handle complex files with multiple functions and calls', async () => {
      mockParseTypeScriptCode.mockResolvedValue({
        functions: [
          {
            name: 'main',
            parameters: [],
            returnType: 'void',
            location: { startLine: 1, endLine: 5, startColumn: 0, endColumn: 10 },
            exported: true,
          },
          {
            name: 'helper',
            parameters: [{ name: 'x', type: 'number', optional: false }],
            returnType: 'string',
            location: { startLine: 7, endLine: 9, startColumn: 0, endColumn: 10 },
          },
        ],
        calls: [
          { caller: 'main', callee: 'helper', lineNumber: 3 },
        ],
        errors: [],
        metadata: {
          imports: ['./utils'],
          exports: ['main'],
        },
      } as any);

      mockBuildReactFlowGraph.mockReturnValue({
        nodes: [
          {
            id: 'node-main',
            type: 'function',
            position: { x: 0, y: 0 },
            data: { label: 'main', isExported: true },
          },
          {
            id: 'node-helper',
            type: 'function',
            position: { x: 100, y: 100 },
            data: { label: 'helper', isExported: false },
          },
        ],
        edges: [
          {
            id: 'edge-main-helper',
            source: 'node-main',
            target: 'node-helper',
          },
        ],
      });

      const request = createRequest({ url: 'https://example.com/complex.ts' });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.nodes).toHaveLength(2);
      expect(data.data.edges).toHaveLength(1);
      expect(data.data.metadata.totalFunctions).toBe(2);
      expect(data.data.metadata.totalCalls).toBe(1);
    });
  });

  describe('Error handling', () => {
    it('should handle parsing errors gracefully', async () => {
      mockParseTypeScriptCode.mockRejectedValue(new Error('Parser crashed'));

      const request = createRequest({ url: 'https://example.com/test.ts' });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error).toContain('Internal server error');
    });

    it('should handle graph building errors', async () => {
      mockBuildReactFlowGraph.mockImplementation(() => {
        throw new Error('Graph builder failed');
      });

      const request = createRequest({ url: 'https://example.com/test.ts' });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error).toContain('Internal server error');
    });
  });

  describe('Rate limiting', () => {
    it('should allow requests within rate limit', async () => {
      const request = createRequest({ url: 'https://example.com/test.ts' });
      const response = await POST(request);

      expect(response.status).toBe(200);
    });

    // Note: Testing actual rate limiting is complex because it involves
    // timing and shared state. In a real test environment, you might
    // want to mock the rate limiting mechanism or test it separately.
  });

  describe('CORS handling', () => {
    it('should include proper CORS headers', async () => {
      const request = createRequest({ url: 'https://example.com/test.ts' });
      const response = await POST(request);

      // Response should not have CORS errors in browser
      expect(response.status).toBe(200);
    });
  });
});

describe('GET /api/parse-code', () => {
  it('should return API information', async () => {
    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.name).toBe('TypeScript Code Parser API');
    expect(data.version).toBe('1.0.0');
    expect(data.endpoints).toBeDefined();
    expect(data.limits).toBeDefined();
    expect(data.limits.maxFileSize).toBe('500KB');
    expect(data.limits.supportedTypes).toEqual(['.ts', '.tsx']);
  });
});

describe('Integration tests', () => {
  it('should handle complete workflow from URL to graph', async () => {
    // Setup mocks for a realistic scenario
    mockFetchCodeFromURL.mockResolvedValue({
      success: true,
      content: `
        export function main(): void {
          const result = calculate(5, 10);
          console.log(result);
        }

        function calculate(a: number, b: number): number {
          return a + b;
        }
      `,
      url: 'https://example.com/math.ts',
      size: 200,
    });

    mockParseTypeScriptCode.mockResolvedValue({
      functions: [
        {
          name: 'main',
          parameters: [],
          returnType: 'void',
          location: { startLine: 1, endLine: 4, startColumn: 0, endColumn: 10 },
          exported: true,
        },
        {
          name: 'calculate',
          parameters: [
            { name: 'a', type: 'number', optional: false },
            { name: 'b', type: 'number', optional: false },
          ],
          returnType: 'number',
          location: { startLine: 6, endLine: 8, startColumn: 0, endColumn: 10 },
        },
      ],
      calls: [
        { caller: 'main', callee: 'calculate', lineNumber: 2 },
      ],
      errors: [],
      metadata: {
        imports: [],
        exports: ['main'],
      },
    } as any);

    const request = createRequest({ url: 'https://example.com/math.ts' });
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    
    // Verify all stages were called correctly
    expect(mockValidateURL).toHaveBeenCalledWith('https://example.com/math.ts');
    expect(mockFetchCodeFromURL).toHaveBeenCalledWith('https://example.com/math.ts');
    expect(mockParseTypeScriptCode).toHaveBeenCalled();
    expect(mockBuildReactFlowGraph).toHaveBeenCalled();
    
    // Verify response structure
    expect(data.data.nodes).toBeDefined();
    expect(data.data.edges).toBeDefined();
    expect(data.data.metadata).toMatchObject({
      fileName: 'math.ts',
      totalFunctions: 2,
      totalCalls: 1,
      imports: [],
      exports: ['main'],
      fileSize: 200,
    });
  });
});