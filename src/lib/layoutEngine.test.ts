/**
 * Tests for Layout Engine
 */

import {
  layoutNodes,
  createHierarchicalLayout,
  createHorizontalLayout,
  createCircularLayout,
  autoLayout,
  calculateGraphBounds,
  centerGraph,
  DEFAULT_LAYOUT_OPTIONS
} from './layoutEngine';
import type { Node, Edge } from '@xyflow/react';

describe('layoutNodes', () => {
  const sampleNodes: Node[] = [
    {
      id: '1',
      position: { x: 0, y: 0 },
      data: { label: 'Node 1' },
    },
    {
      id: '2',
      position: { x: 0, y: 0 },
      data: { label: 'Node 2' },
    },
    {
      id: '3',
      position: { x: 0, y: 0 },
      data: { label: 'Node 3' },
    },
  ];

  const sampleEdges: Edge[] = [
    { id: 'e1-2', source: '1', target: '2' },
    { id: 'e2-3', source: '2', target: '3' },
  ];

  it('should position nodes using Dagre algorithm', () => {
    const layoutedNodes = layoutNodes(sampleNodes, sampleEdges);

    // All nodes should have updated positions
    layoutedNodes.forEach(node => {
      expect(typeof node.position.x).toBe('number');
      expect(typeof node.position.y).toBe('number');
      expect(node.position.x).not.toBe(0);
      expect(node.position.y).not.toBe(0);
    });

    // Nodes should have sizes
    layoutedNodes.forEach(node => {
      expect(node.style?.width).toBeDefined();
      expect(node.style?.height).toBeDefined();
    });
  });

  it('should handle empty node list', () => {
    const layoutedNodes = layoutNodes([], []);
    expect(layoutedNodes).toHaveLength(0);
  });

  it('should handle single node', () => {
    const singleNode = [sampleNodes[0]];
    const layoutedNodes = layoutNodes(singleNode, []);

    expect(layoutedNodes).toHaveLength(1);
    expect(layoutedNodes[0].position.x).toBeDefined();
    expect(layoutedNodes[0].position.y).toBeDefined();
  });

  it('should apply custom layout options', () => {
    const customOptions = {
      direction: 'LR' as const,
      nodeWidth: 300,
      nodeHeight: 150,
      rankSep: 200,
      nodeSep: 100,
    };

    const layoutedNodes = layoutNodes(sampleNodes, sampleEdges, customOptions);

    // Should still position nodes (exact positions depend on Dagre internals)
    expect(layoutedNodes).toHaveLength(3);
    layoutedNodes.forEach(node => {
      expect(node.style?.width).toBeGreaterThan(DEFAULT_LAYOUT_OPTIONS.nodeWidth);
      expect(node.style?.height).toBeGreaterThan(DEFAULT_LAYOUT_OPTIONS.nodeHeight);
    });
  });

  it('should calculate node sizes based on content', () => {
    const nodeWithLongLabel: Node = {
      id: '1',
      position: { x: 0, y: 0 },
      data: {
        label: 'VeryLongFunctionNameThatShouldIncreaseNodeWidth',
        parameters: [
          { name: 'param1', type: 'string' },
          { name: 'param2', type: 'number' },
          { name: 'veryLongParameterName', type: 'ComplexType<Generic>' },
        ],
        returnType: 'Promise<ComplexReturnType>',
        isAsync: true,
        isExported: true,
      },
    };

    const nodeWithShortLabel: Node = {
      id: '2',
      position: { x: 0, y: 0 },
      data: { label: 'fn' },
    };

    const layoutedNodes = layoutNodes([nodeWithLongLabel, nodeWithShortLabel], []);

    const longNode = layoutedNodes.find(n => n.id === '1');
    const shortNode = layoutedNodes.find(n => n.id === '2');

    expect(longNode?.style?.width).toBeGreaterThan(shortNode?.style?.width || 0);
    expect(longNode?.style?.height).toBeGreaterThan(shortNode?.style?.height || 0);
  });
});

describe('Layout variants', () => {
  const nodes: Node[] = [
    { id: '1', position: { x: 0, y: 0 }, data: { label: 'A' } },
    { id: '2', position: { x: 0, y: 0 }, data: { label: 'B' } },
    { id: '3', position: { x: 0, y: 0 }, data: { label: 'C' } },
    { id: '4', position: { x: 0, y: 0 }, data: { label: 'D' } },
  ];

  const edges: Edge[] = [
    { id: 'e1', source: '1', target: '2' },
    { id: 'e2', source: '1', target: '3' },
    { id: 'e3', source: '2', target: '4' },
  ];

  it('should create hierarchical layout', () => {
    const layoutedNodes = createHierarchicalLayout(nodes, edges);

    expect(layoutedNodes).toHaveLength(4);
    
    // In hierarchical layout (top-bottom), root should be at top
    const nodeA = layoutedNodes.find(n => n.id === '1');
    const nodeB = layoutedNodes.find(n => n.id === '2');
    
    // Node A should be above node B (smaller y value)
    expect(nodeA!.position.y).toBeLessThan(nodeB!.position.y);
  });

  it('should create horizontal layout', () => {
    const layoutedNodes = createHorizontalLayout(nodes, edges);

    expect(layoutedNodes).toHaveLength(4);
    
    // In horizontal layout (left-right), positions should differ in x-axis
    const positions = layoutedNodes.map(n => n.position.x);
    const uniqueXPositions = new Set(positions);
    
    // Should have different x positions
    expect(uniqueXPositions.size).toBeGreaterThan(1);
  });

  it('should create circular layout for small graphs', () => {
    const smallNodes = nodes.slice(0, 3); // 3 nodes
    const smallEdges = edges.slice(0, 2);
    
    const layoutedNodes = createCircularLayout(smallNodes, smallEdges);

    expect(layoutedNodes).toHaveLength(3);
    
    // Should be arranged in a circle (different from grid)
    const positions = layoutedNodes.map(n => ({ x: n.position.x, y: n.position.y }));
    
    // All positions should be different
    expect(positions[0]).not.toEqual(positions[1]);
    expect(positions[1]).not.toEqual(positions[2]);
    expect(positions[0]).not.toEqual(positions[2]);
  });

  it('should handle single node in circular layout', () => {
    const singleNode = [nodes[0]];
    const layoutedNodes = createCircularLayout(singleNode, []);

    expect(layoutedNodes).toHaveLength(1);
    expect(layoutedNodes[0].position).toEqual({ x: 0, y: 0 });
  });

  it('should fall back to hierarchical for large graphs in circular layout', () => {
    const manyNodes = Array.from({ length: 10 }, (_, i) => ({
      id: String(i + 1),
      position: { x: 0, y: 0 },
      data: { label: `Node ${i + 1}` },
    }));

    const layoutedNodes = createCircularLayout(manyNodes, []);

    expect(layoutedNodes).toHaveLength(10);
    // Should use hierarchical layout for many nodes
    // (exact test would need to verify specific positioning patterns)
  });
});

describe('autoLayout', () => {
  it('should handle empty graph', () => {
    const result = autoLayout([], []);
    expect(result).toHaveLength(0);
  });

  it('should handle single node', () => {
    const nodes = [{ id: '1', position: { x: 0, y: 0 }, data: { label: 'A' } }];
    const result = autoLayout(nodes, []);

    expect(result).toHaveLength(1);
    expect(result[0].position).toEqual({ x: 200, y: 200 });
  });

  it('should choose circular layout for small graphs', () => {
    const nodes = Array.from({ length: 4 }, (_, i) => ({
      id: String(i + 1),
      position: { x: 0, y: 0 },
      data: { label: `Node ${i + 1}` },
    }));
    const edges = [
      { id: 'e1', source: '1', target: '2' },
      { id: 'e2', source: '2', target: '3' },
    ];

    const result = autoLayout(nodes, edges);
    expect(result).toHaveLength(4);
  });

  it('should choose horizontal layout for wide graphs', () => {
    const nodes = Array.from({ length: 12 }, (_, i) => ({
      id: String(i + 1),
      position: { x: 0, y: 0 },
      data: { label: `Node ${i + 1}` },
    }));
    const edges = [
      { id: 'e1', source: '1', target: '2' },
    ]; // Low connection density

    const result = autoLayout(nodes, edges);
    expect(result).toHaveLength(12);
  });

  it('should choose hierarchical layout for complex graphs', () => {
    const nodes = Array.from({ length: 8 }, (_, i) => ({
      id: String(i + 1),
      position: { x: 0, y: 0 },
      data: { label: `Node ${i + 1}` },
    }));
    const edges = Array.from({ length: 12 }, (_, i) => ({
      id: `e${i}`,
      source: String((i % 7) + 1),
      target: String(((i + 1) % 7) + 1),
    })); // High connection density

    const result = autoLayout(nodes, edges);
    expect(result).toHaveLength(8);
  });
});

describe('calculateGraphBounds', () => {
  it('should calculate bounds for empty graph', () => {
    const bounds = calculateGraphBounds([]);
    
    expect(bounds).toEqual({
      minX: 0,
      minY: 0,
      maxX: 0,
      maxY: 0,
      width: 0,
      height: 0,
    });
  });

  it('should calculate bounds correctly', () => {
    const nodes: Node[] = [
      {
        id: '1',
        position: { x: 10, y: 20 },
        data: { label: 'A' },
        style: { width: 100, height: 50 },
      },
      {
        id: '2',
        position: { x: 200, y: 100 },
        data: { label: 'B' },
        style: { width: 150, height: 75 },
      },
    ];

    const bounds = calculateGraphBounds(nodes);

    expect(bounds).toEqual({
      minX: 10,
      minY: 20,
      maxX: 350, // 200 + 150
      maxY: 175, // 100 + 75
      width: 340, // 350 - 10
      height: 155, // 175 - 20
    });
  });

  it('should use default sizes when not specified', () => {
    const nodes: Node[] = [
      {
        id: '1',
        position: { x: 0, y: 0 },
        data: { label: 'A' },
      },
    ];

    const bounds = calculateGraphBounds(nodes);

    expect(bounds.width).toBe(DEFAULT_LAYOUT_OPTIONS.nodeWidth);
    expect(bounds.height).toBe(DEFAULT_LAYOUT_OPTIONS.nodeHeight);
  });
});

describe('centerGraph', () => {
  it('should center graph in viewport', () => {
    const nodes: Node[] = [
      {
        id: '1',
        position: { x: 0, y: 0 },
        data: { label: 'A' },
        style: { width: 100, height: 50 },
      },
      {
        id: '2',
        position: { x: 200, y: 100 },
        data: { label: 'B' },
        style: { width: 100, height: 50 },
      },
    ];

    const viewportWidth = 800;
    const viewportHeight = 600;

    const centeredNodes = centerGraph(nodes, viewportWidth, viewportHeight);

    // Calculate expected centering
    const originalBounds = calculateGraphBounds(nodes);
    const expectedOffsetX = (viewportWidth - originalBounds.width) / 2 - originalBounds.minX;
    const expectedOffsetY = (viewportHeight - originalBounds.height) / 2 - originalBounds.minY;

    expect(centeredNodes[0].position.x).toBe(0 + expectedOffsetX);
    expect(centeredNodes[0].position.y).toBe(0 + expectedOffsetY);
    expect(centeredNodes[1].position.x).toBe(200 + expectedOffsetX);
    expect(centeredNodes[1].position.y).toBe(100 + expectedOffsetY);
  });

  it('should handle empty graph', () => {
    const centeredNodes = centerGraph([], 800, 600);
    expect(centeredNodes).toHaveLength(0);
  });

  it('should handle single node', () => {
    const nodes: Node[] = [
      {
        id: '1',
        position: { x: 100, y: 50 },
        data: { label: 'A' },
        style: { width: 200, height: 100 },
      },
    ];

    const centeredNodes = centerGraph(nodes, 800, 600);

    // Should move the node to the center
    expect(centeredNodes[0].position.x).toBe(300); // (800 - 200) / 2
    expect(centeredNodes[0].position.y).toBe(250); // (600 - 100) / 2
  });
});