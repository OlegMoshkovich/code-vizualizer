/**
 * Graph Layout Engine
 * Uses Dagre to automatically position nodes in the graph
 */

import dagre from 'dagre';
import type { Node, Edge } from '@xyflow/react';

export type LayoutDirection = 'TB' | 'BT' | 'LR' | 'RL';

export interface LayoutOptions {
  direction: LayoutDirection;
  nodeWidth: number;
  nodeHeight: number;
  rankSep: number;
  nodeSep: number;
}

export const DEFAULT_LAYOUT_OPTIONS: LayoutOptions = {
  direction: 'TB', // Top to Bottom
  nodeWidth: 250,
  nodeHeight: 100,
  rankSep: 100, // Separation between ranks
  nodeSep: 50,  // Separation between nodes in same rank
};

/**
 * Applies automatic layout to nodes using Dagre algorithm
 * @param nodes - Array of React Flow nodes
 * @param edges - Array of React Flow edges
 * @param options - Layout configuration options
 * @returns Array of positioned nodes
 */
export function layoutNodes(
  nodes: Node[],
  edges: Edge[],
  options: Partial<LayoutOptions> = {}
): Node[] {
  const layoutOpts = { ...DEFAULT_LAYOUT_OPTIONS, ...options };
  
  // Create new directed graph
  const graph = new dagre.graphlib.Graph();
  
  // Configure graph
  graph.setDefaultEdgeLabel(() => ({}));
  graph.setGraph({
    rankdir: layoutOpts.direction,
    ranksep: layoutOpts.rankSep,
    nodesep: layoutOpts.nodeSep,
    marginx: 20,
    marginy: 20,
  });

  // Add nodes to graph
  nodes.forEach(node => {
    // Calculate node size based on content
    const { width, height } = calculateNodeSize(node, layoutOpts);
    
    graph.setNode(node.id, {
      width,
      height,
    });
  });

  // Add edges to graph
  edges.forEach(edge => {
    graph.setEdge(edge.source, edge.target);
  });

  // Run layout algorithm
  dagre.layout(graph);

  // Apply calculated positions to nodes
  const layoutedNodes = nodes.map(node => {
    const nodeWithPosition = graph.node(node.id);
    
    return {
      ...node,
      position: {
        x: nodeWithPosition.x - nodeWithPosition.width / 2,
        y: nodeWithPosition.y - nodeWithPosition.height / 2,
      },
      style: {
        ...node.style,
        width: nodeWithPosition.width,
        height: nodeWithPosition.height,
      },
    };
  });

  return layoutedNodes;
}

/**
 * Calculates optimal node size based on content
 * @param node - React Flow node
 * @param options - Layout options
 * @returns Width and height for the node
 */
function calculateNodeSize(node: Node, options: LayoutOptions): { width: number; height: number } {
  const baseWidth = options.nodeWidth;
  const baseHeight = options.nodeHeight;
  
  // Get node data for size calculation
  const data = node.data;
  if (!data) {
    return { width: baseWidth, height: baseHeight };
  }

  // Calculate width based on content
  let width = baseWidth;
  let height = baseHeight;

  // Factor in function name length
  if ((data as any).label) {
    const nameLength = (data as any).label.length;
    width = Math.max(width, nameLength * 8 + 40); // Rough character width estimation
  }

  // Factor in parameters
  if ((data as any).parameters && Array.isArray((data as any).parameters)) {
    const paramCount = (data as any).parameters.length;
    const longestParam = (data as any).parameters.reduce((longest: number, param: any) => {
      const paramText = `${param.name}: ${param.type}`;
      return paramText.length > longest ? paramText.length : longest;
    }, 0);

    // Adjust width for longest parameter
    width = Math.max(width, longestParam * 7 + 40);
    
    // Adjust height for parameter count
    if (paramCount > 0) {
      height = Math.max(height, 60 + paramCount * 20);
    }
  }

  // Factor in return type
  if ((data as any).returnType && (data as any).returnType !== 'any') {
    width = Math.max(width, (data as any).returnType.length * 8 + 80);
  }

  // Add extra space for async functions
  if ((data as any).isAsync) {
    width += 60; // Space for "async" label
  }

  // Add extra space for exported functions
  if ((data as any).isExported) {
    width += 60; // Space for "export" label
  }

  // Set reasonable limits
  width = Math.min(Math.max(width, 150), 400);
  height = Math.min(Math.max(height, 80), 300);

  return { width, height };
}

/**
 * Creates a hierarchical layout optimized for function call relationships
 * @param nodes - Array of React Flow nodes
 * @param edges - Array of React Flow edges
 * @returns Positioned nodes with hierarchical structure
 */
export function createHierarchicalLayout(nodes: Node[], edges: Edge[]): Node[] {
  return layoutNodes(nodes, edges, {
    direction: 'TB',
    rankSep: 120,
    nodeSep: 80,
  });
}

/**
 * Creates a compact horizontal layout
 * @param nodes - Array of React Flow nodes
 * @param edges - Array of React Flow edges
 * @returns Positioned nodes in horizontal layout
 */
export function createHorizontalLayout(nodes: Node[], edges: Edge[]): Node[] {
  return layoutNodes(nodes, edges, {
    direction: 'LR',
    rankSep: 150,
    nodeSep: 100,
  });
}

/**
 * Creates a circular-like layout for small graphs
 * @param nodes - Array of React Flow nodes
 * @param edges - Array of React Flow edges
 * @returns Positioned nodes in circular arrangement
 */
export function createCircularLayout(nodes: Node[], edges: Edge[]): Node[] {
  if (nodes.length <= 1) {
    return nodes.map(node => ({
      ...node,
      position: { x: 0, y: 0 },
    }));
  }

  if (nodes.length <= 6) {
    // Small number of nodes - arrange in circle
    const centerX = 200;
    const centerY = 200;
    const radius = Math.max(100, nodes.length * 30);

    return nodes.map((node, index) => {
      const angle = (2 * Math.PI * index) / nodes.length;
      const x = centerX + radius * Math.cos(angle) - 125; // Offset for node width
      const y = centerY + radius * Math.sin(angle) - 50;  // Offset for node height

      return {
        ...node,
        position: { x, y },
      };
    });
  }

  // Fall back to hierarchical for larger graphs
  return createHierarchicalLayout(nodes, edges);
}

/**
 * Automatically selects the best layout based on graph characteristics
 * @param nodes - Array of React Flow nodes
 * @param edges - Array of React Flow edges
 * @returns Positioned nodes with optimal layout
 */
export function autoLayout(nodes: Node[], edges: Edge[]): Node[] {
  const nodeCount = nodes.length;
  const edgeCount = edges.length;
  
  // No nodes
  if (nodeCount === 0) {
    return nodes;
  }

  // Single node
  if (nodeCount === 1) {
    return [{
      ...nodes[0],
      position: { x: 200, y: 200 },
    }];
  }

  // Small graphs - circular layout
  if (nodeCount <= 6 && edgeCount <= 8) {
    return createCircularLayout(nodes, edges);
  }

  // Wide graphs - prefer horizontal layout
  const avgConnectionsPerNode = edgeCount / nodeCount;
  if (avgConnectionsPerNode < 1.5 && nodeCount > 8) {
    return createHorizontalLayout(nodes, edges);
  }

  // Default to hierarchical
  return createHierarchicalLayout(nodes, edges);
}

/**
 * Calculates the bounds of the laid out graph
 * @param nodes - Array of positioned nodes
 * @returns Bounding box of the graph
 */
export function calculateGraphBounds(nodes: Node[]): {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  width: number;
  height: number;
} {
  if (nodes.length === 0) {
    return { minX: 0, minY: 0, maxX: 0, maxY: 0, width: 0, height: 0 };
  }

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  nodes.forEach(node => {
    const { x, y } = node.position;
    const width = Number(node.style?.width) || DEFAULT_LAYOUT_OPTIONS.nodeWidth;
    const height = Number(node.style?.height) || DEFAULT_LAYOUT_OPTIONS.nodeHeight;

    minX = Math.min(minX, x);
    minY = Math.min(minY, y);
    maxX = Math.max(maxX, x + width);
    maxY = Math.max(maxY, y + height);
  });

  return {
    minX,
    minY,
    maxX,
    maxY,
    width: maxX - minX,
    height: maxY - minY,
  };
}

/**
 * Centers the graph within a given viewport
 * @param nodes - Array of positioned nodes
 * @param viewportWidth - Target viewport width
 * @param viewportHeight - Target viewport height
 * @returns Centered nodes
 */
export function centerGraph(
  nodes: Node[],
  viewportWidth: number,
  viewportHeight: number
): Node[] {
  if (nodes.length === 0) return nodes;

  const bounds = calculateGraphBounds(nodes);
  const offsetX = (viewportWidth - bounds.width) / 2 - bounds.minX;
  const offsetY = (viewportHeight - bounds.height) / 2 - bounds.minY;

  return nodes.map(node => ({
    ...node,
    position: {
      x: node.position.x + offsetX,
      y: node.position.y + offsetY,
    },
  }));
}