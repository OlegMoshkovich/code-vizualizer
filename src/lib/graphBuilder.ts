/**
 * Graph Builder Module
 * Converts parsed TypeScript code into React Flow graph format
 */

import type { Node, Edge } from '@xyflow/react';
import type { 
  FunctionData, 
  FunctionCall, 
  ParsedCodeResult, 
  GraphData 
} from '../types';
import { autoLayout } from './layoutEngine';

/**
 * Custom node types for the function graph
 */
export const NODE_TYPES = {
  FUNCTION: 'functionNode',
  CLASS_METHOD: 'classMethodNode',
  EXPORTED: 'exportedFunctionNode',
  ASYNC: 'asyncFunctionNode',
} as const;

/**
 * Edge types for different relationships
 */
export const EDGE_TYPES = {
  FUNCTION_CALL: 'functionCall',
  ASYNC_CALL: 'asyncCall',
  MULTIPLE_CALLS: 'multipleCalls',
} as const;

/**
 * Builds a complete React Flow graph from parsed code data
 * @param parsedData - Result from code parsing
 * @returns Graph data ready for React Flow
 */
export function buildReactFlowGraph(parsedData: ParsedCodeResult): GraphData {
  // Create nodes from functions
  const nodes = parsedData.functions.map(functionData => 
    createFunctionNode(functionData)
  );

  // Create edges from function calls
  const edges = createFunctionEdges(parsedData.calls);

  // Apply automatic layout
  const layoutedNodes = autoLayout(nodes, edges);

  return {
    nodes: layoutedNodes,
    edges,
  };
}

/**
 * Creates a React Flow node from function data
 * @param functionData - Function information from parser
 * @returns React Flow compatible node
 */
export function createFunctionNode(functionData: FunctionData): Node {
  // Determine node type based on function characteristics
  let nodeType = NODE_TYPES.FUNCTION;
  
  if (functionData.name.includes('.')) {
    nodeType = NODE_TYPES.CLASS_METHOD;
  } else if (functionData.exported) {
    nodeType = NODE_TYPES.EXPORTED;
  } else if (functionData.async) {
    nodeType = NODE_TYPES.ASYNC;
  }

  // Create unique node ID
  const nodeId = createNodeId(functionData.name);

  // Prepare node data
  const nodeData = {
    label: functionData.name,
    parameters: functionData.parameters,
    returnType: functionData.returnType,
    isAsync: functionData.async || false,
    isExported: functionData.exported || false,
    documentation: functionData.documentation,
    location: functionData.location,
    sourceCode: generateSourcePreview(functionData),
    
    // Additional metadata for styling and interaction
    complexity: calculateComplexity(functionData),
    category: categorizeFunction(functionData),
  };

  return {
    id: nodeId,
    type: nodeType,
    position: { x: 0, y: 0 }, // Will be set by layout engine
    data: nodeData,
    style: getNodeStyle(functionData),
    className: getNodeClassName(functionData),
  };
}

/**
 * Creates edges representing function call relationships
 * @param calls - Array of function calls from parser
 * @returns Array of React Flow compatible edges
 */
export function createFunctionEdges(calls: FunctionCall[]): Edge[] {
  // Group calls by caller-callee pairs to handle multiple calls
  const callGroups = groupCallsByRelationship(calls);
  
  return Array.from(callGroups.entries()).map(([relationship, callList]) => {
    const [caller, callee] = relationship.split(' -> ');
    const callCount = callList.length;
    
    // Determine edge type
    let edgeType = EDGE_TYPES.FUNCTION_CALL;
    const hasAsyncCall = callList.some(call => isAsyncCall(call));
    
    if (hasAsyncCall) {
      edgeType = EDGE_TYPES.ASYNC_CALL;
    } else if (callCount > 1) {
      edgeType = EDGE_TYPES.MULTIPLE_CALLS;
    }

    // Create edge
    const edge: Edge = {
      id: createEdgeId(caller, callee),
      source: createNodeId(caller),
      target: createNodeId(callee),
      type: getEdgeType(edgeType),
      animated: hasAsyncCall,
      style: getEdgeStyle(edgeType, callCount),
      label: callCount > 1 ? `${callCount}x` : undefined,
      data: {
        calls: callList,
        callCount,
        isAsync: hasAsyncCall,
      },
    };

    return edge;
  });
}

/**
 * Groups function calls by caller-callee relationship
 * @param calls - Array of function calls
 * @returns Map of relationship strings to call arrays
 */
function groupCallsByRelationship(calls: FunctionCall[]): Map<string, FunctionCall[]> {
  const groups = new Map<string, FunctionCall[]>();
  
  calls.forEach(call => {
    const key = `${call.caller} -> ${call.callee}`;
    if (!groups.has(key)) {
      groups.set(key, []);
    }
    groups.get(key)!.push(call);
  });
  
  return groups;
}

/**
 * Creates a unique node ID from function name
 * @param functionName - Name of the function
 * @returns Unique node identifier
 */
function createNodeId(functionName: string): string {
  // Replace dots and special characters to create valid DOM IDs
  return `node-${functionName.replace(/[^a-zA-Z0-9]/g, '_')}`;
}

/**
 * Creates a unique edge ID from source and target
 * @param source - Source function name
 * @param target - Target function name
 * @returns Unique edge identifier
 */
function createEdgeId(source: string, target: string): string {
  const sourceId = source.replace(/[^a-zA-Z0-9]/g, '_');
  const targetId = target.replace(/[^a-zA-Z0-9]/g, '_');
  return `edge-${sourceId}-to-${targetId}`;
}

/**
 * Generates a preview of the function's source code
 * @param functionData - Function data from parser
 * @returns Short preview string
 */
function generateSourcePreview(functionData: FunctionData): string {
  const { name, parameters, returnType, async: isAsync } = functionData;
  
  // Build parameter list
  const paramList = parameters
    .map(param => {
      let paramStr = param.name;
      if (param.optional) paramStr += '?';
      if (param.type !== 'any') paramStr += `: ${param.type}`;
      if (param.defaultValue) paramStr += ` = ${param.defaultValue}`;
      return paramStr;
    })
    .join(', ');

  // Build function signature
  const asyncPrefix = isAsync ? 'async ' : '';
  const returnTypeStr = returnType !== 'any' ? `: ${returnType}` : '';
  
  return `${asyncPrefix}function ${name}(${paramList})${returnTypeStr}`;
}

/**
 * Calculates complexity score for a function
 * @param functionData - Function data
 * @returns Complexity score (0-10)
 */
function calculateComplexity(functionData: FunctionData): number {
  let complexity = 1; // Base complexity
  
  // Add complexity for parameters
  complexity += functionData.parameters.length * 0.5;
  
  // Add complexity for complex return types
  if (functionData.returnType.includes('|') || functionData.returnType.includes('&')) {
    complexity += 1;
  }
  
  // Add complexity for async functions
  if (functionData.async) {
    complexity += 1;
  }
  
  // Add complexity for class methods
  if (functionData.name.includes('.')) {
    complexity += 0.5;
  }
  
  return Math.min(Math.ceil(complexity), 10);
}

/**
 * Categorizes function based on characteristics
 * @param functionData - Function data
 * @returns Category string
 */
function categorizeFunction(functionData: FunctionData): string {
  if (functionData.exported) return 'exported';
  if (functionData.async) return 'async';
  if (functionData.name.includes('.')) return 'method';
  if (functionData.parameters.length === 0) return 'simple';
  if (functionData.parameters.length > 3) return 'complex';
  return 'function';
}

/**
 * Gets styling for a node based on function characteristics
 * @param functionData - Function data
 * @returns Style object
 */
function getNodeStyle(functionData: FunctionData): React.CSSProperties {
  const baseStyle: React.CSSProperties = {
    background: '#ffffff',
    border: '2px solid #e2e8f0',
    borderRadius: '8px',
    fontSize: '14px',
    fontFamily: 'Inter, sans-serif',
    padding: '12px',
    minWidth: '200px',
  };

  // Style based on function type
  if (functionData.exported) {
    baseStyle.border = '2px solid #10b981';
    baseStyle.background = '#ecfdf5';
  } else if (functionData.async) {
    baseStyle.border = '2px solid #8b5cf6';
    baseStyle.background = '#f3e8ff';
  } else if (functionData.name.includes('.')) {
    baseStyle.border = '2px solid #f59e0b';
    baseStyle.background = '#fffbeb';
  }

  return baseStyle;
}

/**
 * Gets CSS class name for a node
 * @param functionData - Function data
 * @returns CSS class name
 */
function getNodeClassName(functionData: FunctionData): string {
  const classes = ['function-node'];
  
  if (functionData.exported) classes.push('exported');
  if (functionData.async) classes.push('async');
  if (functionData.name.includes('.')) classes.push('method');
  
  const complexity = calculateComplexity(functionData);
  if (complexity > 7) classes.push('high-complexity');
  else if (complexity > 4) classes.push('medium-complexity');
  else classes.push('low-complexity');
  
  return classes.join(' ');
}

/**
 * Gets React Flow edge type string
 * @param edgeType - Internal edge type
 * @returns React Flow edge type
 */
function getEdgeType(edgeType: string): string {
  switch (edgeType) {
    case EDGE_TYPES.ASYNC_CALL:
      return 'smoothstep';
    case EDGE_TYPES.MULTIPLE_CALLS:
      return 'step';
    default:
      return 'default';
  }
}

/**
 * Gets styling for an edge
 * @param edgeType - Type of edge
 * @param callCount - Number of calls
 * @returns Style object
 */
function getEdgeStyle(edgeType: string, callCount: number): React.CSSProperties {
  const baseStyle: React.CSSProperties = {
    strokeWidth: Math.min(2 + callCount * 0.5, 6),
  };

  switch (edgeType) {
    case EDGE_TYPES.ASYNC_CALL:
      return {
        ...baseStyle,
        stroke: '#8b5cf6',
        strokeDasharray: '5,5',
      };
    case EDGE_TYPES.MULTIPLE_CALLS:
      return {
        ...baseStyle,
        stroke: '#f59e0b',
      };
    default:
      return {
        ...baseStyle,
        stroke: '#6b7280',
      };
  }
}

/**
 * Checks if a function call is async (heuristic)
 * @param call - Function call data
 * @returns True if likely async
 */
function isAsyncCall(call: FunctionCall): boolean {
  // This is a heuristic - in a real implementation, you'd track this from the AST
  // For now, we can check if the called function name suggests async behavior
  const asyncPatterns = ['async', 'fetch', 'await', 'promise', 'then', 'catch'];
  return asyncPatterns.some(pattern => 
    call.callee.toLowerCase().includes(pattern)
  );
}

/**
 * Filters graph to show only specific types of functions
 * @param graphData - Complete graph data
 * @param filter - Filter criteria
 * @returns Filtered graph data
 */
export function filterGraph(
  graphData: GraphData, 
  filter: {
    showExported?: boolean;
    showMethods?: boolean;
    showAsync?: boolean;
    minComplexity?: number;
    maxComplexity?: number;
  }
): GraphData {
  const filteredNodes = graphData.nodes.filter(node => {
    const data = node.data;
    
    if (filter.showExported !== undefined && data.isExported !== filter.showExported) {
      return false;
    }
    
    if (filter.showMethods !== undefined) {
      const isMethod = data.label.includes('.');
      if (isMethod !== filter.showMethods) return false;
    }
    
    if (filter.showAsync !== undefined && data.isAsync !== filter.showAsync) {
      return false;
    }
    
    if (filter.minComplexity !== undefined && data.complexity < filter.minComplexity) {
      return false;
    }
    
    if (filter.maxComplexity !== undefined && data.complexity > filter.maxComplexity) {
      return false;
    }
    
    return true;
  });

  // Filter edges to only include those between remaining nodes
  const nodeIds = new Set(filteredNodes.map(node => node.id));
  const filteredEdges = graphData.edges.filter(edge => 
    nodeIds.has(edge.source) && nodeIds.has(edge.target)
  );

  return {
    nodes: filteredNodes,
    edges: filteredEdges,
  };
}

/**
 * Creates a simplified graph showing only main function relationships
 * @param graphData - Complete graph data
 * @returns Simplified graph data
 */
export function simplifyGraph(graphData: GraphData): GraphData {
  // Keep only exported functions and functions they call directly
  const exportedNodes = graphData.nodes.filter(node => node.data.isExported);
  const exportedNodeIds = new Set(exportedNodes.map(node => node.id));
  
  // Find all functions called by exported functions
  const calledByExported = new Set<string>();
  graphData.edges
    .filter(edge => exportedNodeIds.has(edge.source))
    .forEach(edge => calledByExported.add(edge.target));
  
  // Keep exported functions and their direct dependencies
  const relevantNodeIds = new Set([...exportedNodeIds, ...calledByExported]);
  const simplifiedNodes = graphData.nodes.filter(node => 
    relevantNodeIds.has(node.id)
  );
  
  const simplifiedEdges = graphData.edges.filter(edge =>
    relevantNodeIds.has(edge.source) && relevantNodeIds.has(edge.target)
  );

  return {
    nodes: simplifiedNodes,
    edges: simplifiedEdges,
  };
}