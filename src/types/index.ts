/**
 * Core types for TypeScript function visualization
 */

import { Node, Edge } from '@xyflow/react';

/**
 * Represents a parameter of a function
 */
export interface FunctionParameter {
  name: string;
  type: string;
  optional?: boolean;
  defaultValue?: string;
}

/**
 * Represents a function found in the TypeScript code
 */
export interface FunctionData {
  /** Function name */
  name: string;
  /** Function parameters with their types */
  parameters: FunctionParameter[];
  /** Return type of the function */
  returnType: string;
  /** Location in the source file */
  location: {
    startLine: number;
    endLine: number;
    startColumn: number;
    endColumn: number;
  };
  /** Whether this is an exported function */
  exported?: boolean;
  /** Whether this is an async function */
  async?: boolean;
  /** JSDoc comment if present */
  documentation?: string;
  /** Original source code of the function */
  sourceCode?: string;
}

/**
 * Represents a function call relationship
 */
export interface FunctionCall {
  /** Name of the function making the call */
  caller: string;
  /** Name of the function being called */
  callee: string;
  /** Line number where the call occurs */
  lineNumber: number;
  /** Column number where the call occurs */
  columnNumber?: number;
}

/**
 * React Flow compatible graph data
 */
export interface GraphData {
  /** Nodes representing functions */
  nodes: Node[];
  /** Edges representing function calls */
  edges: Edge[];
}

/**
 * Error that occurred during parsing
 */
export interface ParseError {
  message: string;
  line?: number;
  column?: number;
  type: 'syntax' | 'analysis' | 'network' | 'validation';
}

/**
 * Result of parsing TypeScript code
 */
export interface ParsedCodeResult {
  /** Successfully parsed functions */
  functions: FunctionData[];
  /** Function call relationships */
  calls: FunctionCall[];
  /** Any errors that occurred during parsing */
  errors: ParseError[];
  /** Source file URL */
  sourceUrl?: string;
  /** Original source code */
  sourceCode?: string;
}

/**
 * URL validation result
 */
export interface URLValidationResult {
  isValid: boolean;
  error?: string;
  normalizedUrl?: string;
}

/**
 * Fetch response for code content
 */
export interface CodeFetchResult {
  success: boolean;
  content?: string;
  error?: string;
  url: string;
  size?: number;
}

/**
 * Supported file types
 */
export type SupportedFileType = '.ts' | '.tsx';

/**
 * Analysis status
 */
export type AnalysisStatus = 'idle' | 'validating' | 'fetching' | 'parsing' | 'complete' | 'error';

/**
 * Type guards for runtime type checking
 */
export const isValidFunctionData = (obj: unknown): obj is FunctionData => {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'name' in obj &&
    'parameters' in obj &&
    'returnType' in obj &&
    'location' in obj &&
    typeof (obj as FunctionData).name === 'string' &&
    Array.isArray((obj as FunctionData).parameters) &&
    typeof (obj as FunctionData).returnType === 'string'
  );
};

export const isValidFunctionCall = (obj: unknown): obj is FunctionCall => {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'caller' in obj &&
    'callee' in obj &&
    'lineNumber' in obj &&
    typeof (obj as FunctionCall).caller === 'string' &&
    typeof (obj as FunctionCall).callee === 'string' &&
    typeof (obj as FunctionCall).lineNumber === 'number'
  );
};