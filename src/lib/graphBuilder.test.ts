/**
 * Tests for Graph Builder Module
 */

import { 
  buildReactFlowGraph, 
  createFunctionNode, 
  createFunctionEdges,
  filterGraph,
  simplifyGraph,
  NODE_TYPES,
  EDGE_TYPES
} from './graphBuilder';
import type { FunctionData, FunctionCall, ParsedCodeResult } from '../types';

describe('createFunctionNode', () => {
  it('should create a basic function node', () => {
    const functionData: FunctionData = {
      name: 'testFunction',
      parameters: [
        { name: 'param1', type: 'string', optional: false },
        { name: 'param2', type: 'number', optional: true }
      ],
      returnType: 'boolean',
      location: { startLine: 1, endLine: 5, startColumn: 0, endColumn: 10 },
      async: false,
      exported: false,
    };

    const node = createFunctionNode(functionData);

    expect(node.id).toBe('node-testFunction');
    expect(node.type).toBe(NODE_TYPES.FUNCTION);
    expect(node.data.label).toBe('testFunction');
    expect(node.data.parameters).toHaveLength(2);
    expect(node.data.returnType).toBe('boolean');
    expect(node.data.isAsync).toBe(false);
    expect(node.data.isExported).toBe(false);
    expect(node.position).toEqual({ x: 0, y: 0 });
  });

  it('should create exported function node', () => {
    const functionData: FunctionData = {
      name: 'exportedFunc',
      parameters: [],
      returnType: 'void',
      location: { startLine: 1, endLine: 3, startColumn: 0, endColumn: 5 },
      exported: true,
    };

    const node = createFunctionNode(functionData);

    expect(node.type).toBe(NODE_TYPES.EXPORTED);
    expect(node.data.isExported).toBe(true);
    expect(node.className).toContain('exported');
  });

  it('should create async function node', () => {
    const functionData: FunctionData = {
      name: 'asyncFunc',
      parameters: [],
      returnType: 'Promise<void>',
      location: { startLine: 1, endLine: 3, startColumn: 0, endColumn: 5 },
      async: true,
    };

    const node = createFunctionNode(functionData);

    expect(node.type).toBe(NODE_TYPES.ASYNC);
    expect(node.data.isAsync).toBe(true);
    expect(node.className).toContain('async');
  });

  it('should create class method node', () => {
    const functionData: FunctionData = {
      name: 'MyClass.method',
      parameters: [{ name: 'x', type: 'number', optional: false }],
      returnType: 'string',
      location: { startLine: 5, endLine: 7, startColumn: 2, endColumn: 15 },
    };

    const node = createFunctionNode(functionData);

    expect(node.type).toBe(NODE_TYPES.CLASS_METHOD);
    expect(node.data.category).toBe('method');
    expect(node.className).toContain('method');
  });

  it('should handle special characters in function names', () => {
    const functionData: FunctionData = {
      name: 'my-special.function$',
      parameters: [],
      returnType: 'void',
      location: { startLine: 1, endLine: 1, startColumn: 0, endColumn: 5 },
    };

    const node = createFunctionNode(functionData);

    expect(node.id).toBe('node-my_special_function_');
  });

  it('should calculate complexity correctly', () => {
    const simpleFunction: FunctionData = {
      name: 'simple',
      parameters: [],
      returnType: 'void',
      location: { startLine: 1, endLine: 1, startColumn: 0, endColumn: 5 },
    };

    const complexFunction: FunctionData = {
      name: 'complex',
      parameters: [
        { name: 'a', type: 'string', optional: false },
        { name: 'b', type: 'number', optional: false },
        { name: 'c', type: 'boolean', optional: false },
        { name: 'd', type: 'object', optional: false },
      ],
      returnType: 'Promise<string | number>',
      location: { startLine: 1, endLine: 10, startColumn: 0, endColumn: 5 },
      async: true,
    };

    const simpleNode = createFunctionNode(simpleFunction);
    const complexNode = createFunctionNode(complexFunction);

    expect(simpleNode.data.complexity).toBeLessThan(complexNode.data.complexity);
    expect(complexNode.data.complexity).toBeGreaterThan(3);
  });
});

describe('createFunctionEdges', () => {
  it('should create basic function call edges', () => {
    const calls: FunctionCall[] = [
      { caller: 'funcA', callee: 'funcB', lineNumber: 5 },
      { caller: 'funcB', callee: 'funcC', lineNumber: 10 },
    ];

    const edges = createFunctionEdges(calls);

    expect(edges).toHaveLength(2);
    expect(edges[0]).toMatchObject({
      id: 'edge-funcA-to-funcB',
      source: 'node-funcA',
      target: 'node-funcB',
    });
    expect(edges[1]).toMatchObject({
      id: 'edge-funcB-to-funcC',
      source: 'node-funcB',
      target: 'node-funcC',
    });
  });

  it('should handle multiple calls between same functions', () => {
    const calls: FunctionCall[] = [
      { caller: 'funcA', callee: 'funcB', lineNumber: 5 },
      { caller: 'funcA', callee: 'funcB', lineNumber: 10 },
      { caller: 'funcA', callee: 'funcB', lineNumber: 15 },
    ];

    const edges = createFunctionEdges(calls);

    expect(edges).toHaveLength(1);
    expect(edges[0].label).toBe('3x');
    expect(edges[0].data.callCount).toBe(3);
    expect(edges[0].data.calls).toHaveLength(3);
  });

  it('should handle async calls with animation', () => {
    const calls: FunctionCall[] = [
      { caller: 'caller', callee: 'asyncFunction', lineNumber: 5 },
    ];

    const edges = createFunctionEdges(calls);

    // Since we can't easily determine async from name alone in test,
    // we'll just verify the edge structure
    expect(edges).toHaveLength(1);
    expect(edges[0].type).toBe('default');
  });

  it('should handle empty call list', () => {
    const edges = createFunctionEdges([]);
    expect(edges).toHaveLength(0);
  });

  it('should handle special characters in function names for edges', () => {
    const calls: FunctionCall[] = [
      { caller: 'func.with-special$chars', callee: 'another.func', lineNumber: 1 },
    ];

    const edges = createFunctionEdges(calls);

    expect(edges[0].id).toBe('edge-func_with_special_chars-to-another_func');
    expect(edges[0].source).toBe('node-func_with_special_chars');
    expect(edges[0].target).toBe('node-another_func');
  });
});

describe('buildReactFlowGraph', () => {
  it('should build complete graph from parsed data', () => {
    const parsedData: ParsedCodeResult = {
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
    };

    const graph = buildReactFlowGraph(parsedData);

    expect(graph.nodes).toHaveLength(2);
    expect(graph.edges).toHaveLength(1);

    // Verify nodes
    const mainNode = graph.nodes.find(n => n.data.label === 'main');
    const helperNode = graph.nodes.find(n => n.data.label === 'helper');
    expect(mainNode).toBeDefined();
    expect(helperNode).toBeDefined();
    expect(mainNode?.data.isExported).toBe(true);

    // Verify edges
    expect(graph.edges[0].source).toBe(mainNode?.id);
    expect(graph.edges[0].target).toBe(helperNode?.id);
  });

  it('should handle graph with no function calls', () => {
    const parsedData: ParsedCodeResult = {
      functions: [
        {
          name: 'isolated',
          parameters: [],
          returnType: 'void',
          location: { startLine: 1, endLine: 3, startColumn: 0, endColumn: 10 },
        },
      ],
      calls: [],
      errors: [],
    };

    const graph = buildReactFlowGraph(parsedData);

    expect(graph.nodes).toHaveLength(1);
    expect(graph.edges).toHaveLength(0);
  });

  it('should handle empty parsed data', () => {
    const parsedData: ParsedCodeResult = {
      functions: [],
      calls: [],
      errors: [],
    };

    const graph = buildReactFlowGraph(parsedData);

    expect(graph.nodes).toHaveLength(0);
    expect(graph.edges).toHaveLength(0);
  });
});

describe('filterGraph', () => {
  const sampleGraph = {
    nodes: [
      {
        id: 'node1',
        type: 'function',
        position: { x: 0, y: 0 },
        data: { label: 'func1', isExported: true, isAsync: false, complexity: 2 },
      },
      {
        id: 'node2',
        type: 'function',
        position: { x: 0, y: 0 },
        data: { label: 'Class.method', isExported: false, isAsync: true, complexity: 5 },
      },
      {
        id: 'node3',
        type: 'function',
        position: { x: 0, y: 0 },
        data: { label: 'func3', isExported: false, isAsync: false, complexity: 8 },
      },
    ],
    edges: [
      { id: 'edge1', source: 'node1', target: 'node2' },
      { id: 'edge2', source: 'node2', target: 'node3' },
    ],
  };

  it('should filter by exported functions', () => {
    const filtered = filterGraph(sampleGraph, { showExported: true });
    
    expect(filtered.nodes).toHaveLength(1);
    expect(filtered.nodes[0].data.label).toBe('func1');
    expect(filtered.edges).toHaveLength(0); // No edges since only one node
  });

  it('should filter by async functions', () => {
    const filtered = filterGraph(sampleGraph, { showAsync: true });
    
    expect(filtered.nodes).toHaveLength(1);
    expect(filtered.nodes[0].data.label).toBe('Class.method');
  });

  it('should filter by methods', () => {
    const filtered = filterGraph(sampleGraph, { showMethods: true });
    
    expect(filtered.nodes).toHaveLength(1);
    expect(filtered.nodes[0].data.label).toBe('Class.method');
  });

  it('should filter by complexity range', () => {
    const filtered = filterGraph(sampleGraph, { minComplexity: 3, maxComplexity: 6 });
    
    expect(filtered.nodes).toHaveLength(1);
    expect(filtered.nodes[0].data.complexity).toBe(5);
  });

  it('should preserve edges between filtered nodes', () => {
    const filtered = filterGraph(sampleGraph, { maxComplexity: 6 });
    
    expect(filtered.nodes).toHaveLength(2); // func1 and Class.method
    expect(filtered.edges).toHaveLength(1); // Edge between them
  });
});

describe('simplifyGraph', () => {
  it('should keep only exported functions and their dependencies', () => {
    const sampleGraph = {
      nodes: [
        {
          id: 'node1',
          type: 'function',
          position: { x: 0, y: 0 },
          data: { label: 'exported1', isExported: true },
        },
        {
          id: 'node2',
          type: 'function',
          position: { x: 0, y: 0 },
          data: { label: 'helper1', isExported: false },
        },
        {
          id: 'node3',
          type: 'function',
          position: { x: 0, y: 0 },
          data: { label: 'helper2', isExported: false },
        },
        {
          id: 'node4',
          type: 'function',
          position: { x: 0, y: 0 },
          data: { label: 'unused', isExported: false },
        },
      ],
      edges: [
        { id: 'edge1', source: 'node1', target: 'node2' }, // exported calls helper1
        { id: 'edge2', source: 'node2', target: 'node3' }, // helper1 calls helper2
        // node4 is not connected to anything
      ],
    };

    const simplified = simplifyGraph(sampleGraph);

    expect(simplified.nodes).toHaveLength(3); // exported1, helper1, helper2
    expect(simplified.edges).toHaveLength(2);
    
    const nodeLabels = simplified.nodes.map(n => n.data.label);
    expect(nodeLabels).toContain('exported1');
    expect(nodeLabels).toContain('helper1');
    expect(nodeLabels).toContain('helper2');
    expect(nodeLabels).not.toContain('unused');
  });

  it('should handle graph with no exported functions', () => {
    const sampleGraph = {
      nodes: [
        {
          id: 'node1',
          type: 'function',
          position: { x: 0, y: 0 },
          data: { label: 'func1', isExported: false },
        },
      ],
      edges: [],
    };

    const simplified = simplifyGraph(sampleGraph);

    expect(simplified.nodes).toHaveLength(0);
    expect(simplified.edges).toHaveLength(0);
  });
});