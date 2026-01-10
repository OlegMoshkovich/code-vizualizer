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
  nodeWidth: 450,
  nodeHeight: 180,
  rankSep: 180, // Increased separation between ranks
  nodeSep: 120,  // Increased separation between nodes in same rank
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

  // Calculate width based on content - matching FunctionNode component logic
  let width = baseWidth;
  let height = baseHeight;

  // Factor in function name length (matching FunctionNode calculateNodeWidth)
  if ((data as any).label) {
    const labelWidth = Math.max((data as any).label.length * 12, 300);
    width = Math.max(width, labelWidth);
  }

  // Factor in parameters (matching FunctionNode logic)
  if ((data as any).parameters && Array.isArray((data as any).parameters)) {
    const paramCount = (data as any).parameters.length;
    
    if (paramCount > 0) {
      const longestParam = (data as any).parameters.reduce((longest: number, param: any) => {
        const paramText = `${param.name}${param.type}`;
        return paramText.length > longest ? paramText.length : longest;
      }, 0);

      // Adjust width for longest parameter (matching FunctionNode)
      const paramWidth = longestParam * 8 + 100;
      width = Math.max(width, paramWidth);
      
      // Adjust height for parameter count + fixed sections (header, returns, etc.)
      height = Math.max(height, 180 + paramCount * 30); // More generous height calculation
    }
  }

  // Factor in return type
  if ((data as any).returnType && (data as any).returnType !== 'any') {
    width = Math.max(width, (data as any).returnType.length * 12 + 120);
  }

  // Add extra space for badges (async, exported, complex)
  let badgeWidth = 0;
  if ((data as any).isAsync) {
    badgeWidth += 120; // Extra space for "async" badge
  }
  if ((data as any).isExported) {
    badgeWidth += 100; // Space for "export" badge  
  }
  if ((data as any).complexity && (data as any).complexity > 3) {
    badgeWidth += 100; // Space for "complex" badge
  }
  width += badgeWidth;

  // Extra width specifically for async functions to accommodate longer names
  const asyncExtraWidth = (data as any).isAsync ? 80 : 0;
  width += asyncExtraWidth;

  // Set much more generous limits (matching FunctionNode component)
  const maxWidth = (data as any).isAsync ? 800 : 700; // Higher max width for async functions
  width = Math.min(Math.max(width, 400), maxWidth); // Min 400px, variable max
  height = Math.min(Math.max(height, 180), 400); // Min 180px for clean appearance

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
 * Creates a matrix/grid layout with functions organized by type
 * @param nodes - Array of React Flow nodes
 * @param edges - Array of React Flow edges (not used for positioning but needed for consistency)
 * @param columnsPerRow - Number of columns per row (default: 5)
 * @returns Positioned nodes in organized matrix layout
 */
export function createMatrixLayout(nodes: Node[], edges: Edge[], columnsPerRow: number = 5): Node[] {
  if (nodes.length === 0) return nodes;

  const nodeWidth = 500; // Much larger width for clean appearance
  const nodeHeight = 250; // Much larger height for clean appearance
  const horizontalSpacing = 850; // Much larger spacing to prevent async function overlap
  const verticalSpacing = 350; // More generous spacing between rows
  const startX = 50; // Starting X position
  const startY = 50; // Starting Y position
  const groupSpacing = 100; // Extra space between different function groups

  // Generate a unique run ID for this layout execution
  const layoutId = Math.random().toString(36).substr(2, 9);

  // Organize nodes by function type with priority order
  const organizedGroups = organizeNodesByType(nodes);
  
  let currentY = startY;
  const positionedNodes: Node[] = [];

  // Position each group with section headers
  organizedGroups.forEach((group, groupIndex) => {
    if (groupIndex > 0) {
      currentY += groupSpacing; // Add extra space between groups
    }

    // Add a visual section header node (invisible but helps with organization)
    if (group.nodes.length > 0) {
      const headerNode: Node = {
        id: `section-header-${group.type}-${groupIndex}-${layoutId}`, // Make unique with layout ID
        type: 'sectionHeader',
        position: { x: startX, y: currentY - 50 },
        data: {
          label: group.title,
          type: group.type,
          count: group.nodes.length,
          isHeader: true
        },
        style: {
          width: columnsPerRow * horizontalSpacing - 50,
          height: 40,
          background: 'transparent',
          border: 'none',
        },
        draggable: false,
        selectable: false,
      };
      positionedNodes.push(headerNode);
    }

    group.nodes.forEach((node, index) => {
      const row = Math.floor(index / columnsPerRow);
      const col = index % columnsPerRow;
      
      const x = startX + col * horizontalSpacing;
      const y = currentY + row * verticalSpacing;

      // Calculate individual node size (especially important for async functions)
      const { width: calculatedWidth, height: calculatedHeight } = calculateNodeSize(node, {
        direction: 'TB',
        nodeWidth,
        nodeHeight,
        rankSep: 150,
        nodeSep: 80,
      });

      positionedNodes.push({
        ...node,
        position: { x, y },
        style: {
          ...node.style,
          width: calculatedWidth,
          height: calculatedHeight,
        },
      });
    });

    // Update currentY for next group (account for rows used by this group)
    const rowsUsed = Math.ceil(group.nodes.length / columnsPerRow);
    currentY += rowsUsed * verticalSpacing;
  });

  return positionedNodes;
}

/**
 * Organizes nodes by function type with logical grouping
 * @param nodes - Array of React Flow nodes
 * @returns Array of organized groups with metadata
 */
function organizeNodesByType(nodes: Node[]): Array<{ type: string; title: string; nodes: Node[] }> {
  // Define the priority order for function types
  const typeOrder = [
    'exported',     // Exported functions (public API)
    'async',        // Async functions  
    'method',       // Class methods
    'useCallback',  // React useCallback hooks
    'useEffect',    // React useEffect hooks
    'useMemo',      // React useMemo hooks
    'useState',     // React useState hooks
    'jsxHandler',   // JSX event handlers
    'function',     // Regular functions
    'other'         // Everything else
  ];

  // Group nodes by their primary type
  const groups: { [key: string]: Node[] } = {};
  
  nodes.forEach(node => {
    const data = node.data as any;
    let primaryType = 'other';

    // Determine primary type based on function characteristics
    if (data.isExported) {
      primaryType = 'exported';
    } else if (data.isAsync) {
      primaryType = 'async';
    } else if (data.category === 'method' || (data.label && data.label.includes('.'))) {
      primaryType = 'method';
    } else if (data.label && data.label.includes('(useCallback)')) {
      primaryType = 'useCallback';
    } else if (data.label && data.label.includes('(useEffect)')) {
      primaryType = 'useEffect';
    } else if (data.label && data.label.includes('(useMemo)')) {
      primaryType = 'useMemo';
    } else if (data.label && data.label.includes('(useState)')) {
      primaryType = 'useState';
    } else if (data.label && (data.label.includes('.onClick') || data.label.includes('handler') || data.label.includes('Handler'))) {
      primaryType = 'jsxHandler';
    } else if (data.category === 'function' || !data.category) {
      primaryType = 'function';
    }

    if (!groups[primaryType]) {
      groups[primaryType] = [];
    }
    groups[primaryType].push(node);
  });

  // Sort nodes within each group alphabetically
  Object.keys(groups).forEach(type => {
    groups[type].sort((a, b) => {
      const labelA = (a.data as any).label || '';
      const labelB = (b.data as any).label || '';
      return labelA.localeCompare(labelB);
    });
  });

  // Create organized result with titles and preserve order
  const organizedGroups: Array<{ type: string; title: string; nodes: Node[] }> = [];
  
  const typeTitles: { [key: string]: string } = {
    'exported': '📤 Exported Functions',
    'async': '⚡ Async Functions', 
    'method': '🏗️ Class Methods',
    'useCallback': '🔄 useCallback Hooks',
    'useEffect': '🎯 useEffect Hooks',
    'useMemo': '💾 useMemo Hooks',
    'useState': '📊 useState Hooks',
    'jsxHandler': '🖱️ JSX Event Handlers',
    'function': '⚙️ Regular Functions',
    'other': '📂 Other Functions'
  };

  typeOrder.forEach(type => {
    if (groups[type] && groups[type].length > 0) {
      organizedGroups.push({
        type,
        title: typeTitles[type] || '📂 Other Functions',
        nodes: groups[type]
      });
    }
  });

  return organizedGroups;
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

  // For multiple nodes, use matrix layout for compact view
  // This gives a clean grid with 5 functions per row
  return createMatrixLayout(nodes, edges, 5);
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