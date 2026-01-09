/**
 * TypeScript Code Parser Module
 * Parses TypeScript code to extract function definitions and relationships
 */

import { parse } from '@babel/parser';
import traverse from '@babel/traverse';
import * as t from '@babel/types';
import type { 
  FunctionData, 
  FunctionCall, 
  ParsedCodeResult, 
  ParseError, 
  FunctionParameter 
} from '../types';

/**
 * Configuration for Babel parser
 */
const PARSER_CONFIG = {
  sourceType: 'module' as const,
  plugins: [
    'typescript',
    'jsx', 
    'decorators-legacy',
    'classProperties',
    'asyncGenerators',
    'functionBind',
    'exportDefaultFrom',
    'exportNamespaceFrom',
    'dynamicImport',
    'nullishCoalescingOperator',
    'optionalChaining'
  ],
  strictMode: false,
  allowImportExportEverywhere: true,
  allowReturnOutsideFunction: true,
  allowUndeclaredExports: true,
};

/**
 * Parses TypeScript code and extracts function information and relationships
 * @param code - TypeScript source code string
 * @returns Parsed code result with functions, calls, and any errors
 */
export async function parseTypeScriptCode(code: string): Promise<ParsedCodeResult> {
  const result: ParsedCodeResult = {
    functions: [],
    calls: [],
    errors: [],
  };

  try {
    // Validate input
    if (!code || typeof code !== 'string') {
      result.errors.push({
        type: 'validation',
        message: 'No code provided for parsing',
      });
      return result;
    }

    if (code.length > 500 * 1024) { // 500KB limit
      result.errors.push({
        type: 'validation',
        message: 'File too large for parsing (max 500KB)',
      });
      return result;
    }

    // Parse code into AST with fallback strategies
    let ast;
    try {
      // First attempt: Full TypeScript + JSX
      ast = parse(code, PARSER_CONFIG as any);
    } catch (firstError) {
      try {
        // Second attempt: TypeScript only (no JSX)
        ast = parse(code, {
          ...PARSER_CONFIG,
          plugins: PARSER_CONFIG.plugins.filter(p => p !== 'jsx'),
        } as any);
      } catch (secondError) {
        // Third attempt: Minimal configuration
        ast = parse(code, {
          sourceType: 'module',
          plugins: ['typescript'],
          strictMode: false,
          allowImportExportEverywhere: true,
          allowReturnOutsideFunction: true,
          allowUndeclaredExports: true,
        } as any);
      }
    }
    
    // Extract functions
    const functions = extractFunctions(ast, code);
    result.functions = functions;

    // Extract function calls
    const functionNames = functions.map(f => f.name);
    result.calls = extractFunctionCalls(ast, functionNames);

    // Extract imports and exports for context
    const { imports, exports } = extractImportsAndExports(ast);
    
    // Add metadata
    (result as any).metadata = {
      totalFunctions: functions.length,
      totalCalls: result.calls.length,
      imports,
      exports,
    };

  } catch (error) {
    const parseError: ParseError = {
      type: 'syntax',
      message: 'Failed to parse TypeScript code with all fallback strategies',
    };

    if (error instanceof Error) {
      // Clean up the error message for better readability
      let cleanMessage = error.message;
      
      // Handle common JSX/TSX parsing errors
      if (cleanMessage.includes('Unexpected token')) {
        if (cleanMessage.includes('<')) {
          cleanMessage = 'JSX/TSX syntax detected but parsing failed. The file may contain invalid JSX syntax or unsupported React patterns.';
        } else {
          cleanMessage = `Syntax error: ${cleanMessage}`;
        }
      }
      
      parseError.message = cleanMessage;
      
      // Extract line/column info from Babel parse errors
      const match = error.message.match(/\((\d+):(\d+)\)/);
      if (match) {
        parseError.line = parseInt(match[1], 10);
        parseError.column = parseInt(match[2], 10);
      }
    }

    result.errors.push(parseError);
  }

  return result;
}

/**
 * Extracts all function definitions from the AST
 * @param ast - Babel AST
 * @param sourceCode - Original source code for location mapping
 * @returns Array of function data
 */
export function extractFunctions(ast: t.Node, sourceCode: string): FunctionData[] {
  const functions: FunctionData[] = [];
  const lines = sourceCode.split('\n');

  traverse(ast, {
    // Function declarations: function foo() {}
    FunctionDeclaration(path) {
      const node = path.node;
      if (!node.id) return;

      const functionData = createFunctionData(
        node.id.name,
        node.params,
        node.returnType as any,
        node.loc || null,
        {
          async: node.async,
          exported: isExported(path),
          documentation: extractJSDoc(path, lines),
        }
      );

      functions.push(functionData);
    },

    // Variable declarations with function expressions: const foo = function() {}
    VariableDeclarator(path) {
      const node = path.node;
      if (!t.isIdentifier(node.id)) return;

      let functionNode: t.Function | null = null;
      let isAsync = false;

      if (t.isFunctionExpression(node.init)) {
        functionNode = node.init;
        isAsync = node.init.async;
      } else if (t.isArrowFunctionExpression(node.init)) {
        functionNode = node.init;
        isAsync = node.init.async;
      }

      if (functionNode) {
        const functionData = createFunctionData(
          node.id.name,
          functionNode.params,
          functionNode.returnType as any,
          node.loc || null,
          {
            async: isAsync,
            exported: isExported(path.parent),
            documentation: extractJSDoc(path, lines),
          }
        );

        functions.push(functionData);
      }
    },

    // Class methods: class X { method() {} }
    ClassMethod(path) {
      const node = path.node;
      if (!t.isIdentifier(node.key)) return;

      const className = getClassName(path);
      const methodName = className ? `${className}.${node.key.name}` : node.key.name;

      const functionData = createFunctionData(
        methodName,
        node.params,
        node.returnType as any,
        node.loc || null,
        {
          async: node.async,
          exported: isClassExported(path),
          documentation: extractJSDoc(path, lines),
        }
      );

      functions.push(functionData);
    },

    // Object methods: const obj = { method() {} }
    ObjectMethod(path) {
      const node = path.node;
      if (!t.isIdentifier(node.key)) return;

      const objectName = getObjectName(path);
      const methodName = objectName ? `${objectName}.${node.key.name}` : node.key.name;

      const functionData = createFunctionData(
        methodName,
        node.params,
        node.returnType as any,
        node.loc || null,
        {
          async: node.async,
          exported: false, // Object methods are typically not directly exported
          documentation: extractJSDoc(path, lines),
        }
      );

      functions.push(functionData);
    },

    // Call expressions with function arguments: useCallback(() => {}, [])
    CallExpression(path) {
      const node = path.node;
      
      // Check if this is a React hook or similar function call that takes a function as first argument
      const hookNames = ['useCallback', 'useMemo', 'useEffect', 'useLayoutEffect', 'useState', 'useReducer'];
      const isHook = t.isIdentifier(node.callee) && hookNames.includes(node.callee.name);
      
      // Also check for general function calls that take function arguments
      const isGenericCall = t.isIdentifier(node.callee) || t.isMemberExpression(node.callee);
      
      if ((isHook || isGenericCall) && node.arguments.length > 0) {
        const firstArg = node.arguments[0];
        
        // Check if first argument is an arrow function or function expression
        if (t.isArrowFunctionExpression(firstArg) || t.isFunctionExpression(firstArg)) {
          let functionName = '';
          
          // Try to get a meaningful name for the function
          if (isHook && t.isIdentifier(node.callee)) {
            // For hooks, use the hook name + a counter or context
            const parent = path.parent;
            if (t.isVariableDeclarator(parent) && t.isIdentifier(parent.id)) {
              functionName = `${parent.id.name} (${node.callee.name})`;
            } else {
              functionName = `anonymous (${node.callee.name})`;
            }
          } else if (t.isIdentifier(node.callee)) {
            functionName = `callback (${node.callee.name})`;
          } else if (t.isMemberExpression(node.callee)) {
            const objectName = t.isIdentifier(node.callee.object) ? node.callee.object.name : 'object';
            const propertyName = t.isIdentifier(node.callee.property) ? node.callee.property.name : 'method';
            functionName = `callback (${objectName}.${propertyName})`;
          } else {
            functionName = 'anonymous callback';
          }

          const functionData = createFunctionData(
            functionName,
            firstArg.params,
            firstArg.returnType as any,
            firstArg.loc || null,
            {
              async: firstArg.async,
              exported: false, // Callback functions are typically not exported
              documentation: extractJSDoc(path, lines),
            }
          );

          functions.push(functionData);
        }
      }
    },

    // JSX Expression containers with functions: <button onClick={() => {}}>
    JSXExpressionContainer(path) {
      const node = path.node;
      const expression = node.expression;
      
      // Check if the expression is a function
      if (t.isArrowFunctionExpression(expression) || t.isFunctionExpression(expression)) {
        let functionName = 'JSX event handler';
        
        // Try to get context from the JSX attribute
        const parent = path.parent;
        if (t.isJSXAttribute(parent) && t.isJSXIdentifier(parent.name)) {
          functionName = `${parent.name.name} handler`;
        }
        
        // Try to get the element name for more context
        const jsxElement = path.findParent(p => t.isJSXElement(p.node) || t.isJSXFragment(p.node));
        if (jsxElement && t.isJSXElement(jsxElement.node)) {
          const opening = jsxElement.node.openingElement;
          if (t.isJSXIdentifier(opening.name)) {
            const elementName = opening.name.name;
            if (t.isJSXAttribute(parent) && t.isJSXIdentifier(parent.name)) {
              functionName = `${elementName}.${parent.name.name}`;
            }
          }
        }

        const functionData = createFunctionData(
          functionName,
          expression.params,
          expression.returnType as any,
          expression.loc || null,
          {
            async: expression.async,
            exported: false, // JSX handlers are not exported
            documentation: '', // JSX handlers typically don't have JSDoc
          }
        );

        functions.push(functionData);
      }
    },
  });

  return functions;
}

/**
 * Extracts function call relationships from the AST
 * @param ast - Babel AST
 * @param functionNames - Names of functions defined in this file
 * @returns Array of function calls
 */
export function extractFunctionCalls(ast: t.Node, functionNames: string[]): FunctionCall[] {
  const calls: FunctionCall[] = [];
  let currentFunction: string | null = null;

  traverse(ast, {
    // Track which function we're currently inside
    'FunctionDeclaration|FunctionExpression|ArrowFunctionExpression|ClassMethod|ObjectMethod': {
      enter(path) {
        const name = getFunctionName(path.node, path);
        if (name) {
          currentFunction = name;
        }
      },
      exit() {
        currentFunction = null;
      },
    },

    // Track function calls
    CallExpression(path) {
      if (!currentFunction) return;

      const callee = path.node.callee;
      let calledFunction: string | null = null;

      if (t.isIdentifier(callee)) {
        // Direct function call: foo()
        calledFunction = callee.name;
      } else if (t.isMemberExpression(callee)) {
        // Method call: obj.method() or this.method()
        if (t.isIdentifier(callee.property)) {
          if (t.isThisExpression(callee.object)) {
            // this.method() - look for method in same class
            const className = getClassName(path);
            if (className) {
              calledFunction = `${className}.${callee.property.name}`;
            }
          } else if (t.isIdentifier(callee.object)) {
            // obj.method()
            calledFunction = `${callee.object.name}.${callee.property.name}`;
          }
        }
      }

      // Only track calls to functions defined in this file
      if (calledFunction && functionNames.includes(calledFunction)) {
        calls.push({
          caller: currentFunction,
          callee: calledFunction,
          lineNumber: path.node.loc?.start.line || 0,
          columnNumber: path.node.loc?.start.column,
        });
      }
    },
  });

  return calls;
}

/**
 * Extracts import and export information from the AST
 * @param ast - Babel AST
 * @returns Object with imports and exports arrays
 */
export function extractImportsAndExports(ast: t.Node): { imports: string[]; exports: string[] } {
  const imports: string[] = [];
  const exports: string[] = [];

  traverse(ast, {
    ImportDeclaration(path) {
      const source = path.node.source.value;
      imports.push(source);
    },

    ExportNamedDeclaration(path) {
      if (path.node.declaration) {
        if (t.isFunctionDeclaration(path.node.declaration) && path.node.declaration.id) {
          exports.push(path.node.declaration.id.name);
        } else if (t.isVariableDeclaration(path.node.declaration)) {
          path.node.declaration.declarations.forEach(declarator => {
            if (t.isIdentifier(declarator.id)) {
              exports.push(declarator.id.name);
            }
          });
        }
      }

      // Named exports: export { foo, bar }
      if (path.node.specifiers) {
        path.node.specifiers.forEach(spec => {
          if (t.isExportSpecifier(spec) && t.isIdentifier(spec.exported)) {
            exports.push(spec.exported.name);
          }
        });
      }
    },

    ExportDefaultDeclaration(path) {
      if (t.isFunctionDeclaration(path.node.declaration) && path.node.declaration.id) {
        exports.push(path.node.declaration.id.name);
      } else {
        exports.push('default');
      }
    },
  });

  return { imports, exports };
}

/**
 * Creates a FunctionData object from AST information
 */
function createFunctionData(
  name: string,
  params: t.Function['params'],
  returnType: t.TypeAnnotation | t.TSTypeAnnotation | null | undefined,
  loc: t.SourceLocation | null,
  options: {
    async?: boolean;
    exported?: boolean;
    documentation?: string;
  } = {}
): FunctionData {
  return {
    name,
    parameters: extractParameters(params),
    returnType: extractReturnType(returnType),
    location: {
      startLine: loc?.start.line || 0,
      endLine: loc?.end.line || 0,
      startColumn: loc?.start.column || 0,
      endColumn: loc?.end.column || 0,
    },
    async: options.async || false,
    exported: options.exported || false,
    documentation: options.documentation,
  };
}

/**
 * Extracts parameter information from function parameters
 */
function extractParameters(params: t.Function['params']): FunctionParameter[] {
  return params.map((param, index) => {
    if (t.isIdentifier(param)) {
      return {
        name: param.name,
        type: extractTypeAnnotation(param.typeAnnotation as any),
        optional: param.optional || false,
      };
    }

    if (t.isAssignmentPattern(param)) {
      // Parameter with default value
      const left = param.left;
      if (t.isIdentifier(left)) {
        return {
          name: left.name,
          type: extractTypeAnnotation(left.typeAnnotation as any),
          optional: true,
          defaultValue: generateCodeFromNode(param.right),
        };
      }
    }

    if (t.isRestElement(param)) {
      // Rest parameter (...args)
      const argument = param.argument;
      if (t.isIdentifier(argument)) {
        return {
          name: `...${argument.name}`,
          type: extractTypeAnnotation(argument.typeAnnotation as any),
          optional: false,
        };
      }
    }

    // Fallback for complex patterns
    return {
      name: `param${index}`,
      type: 'any',
      optional: false,
    };
  });
}

/**
 * Extracts type annotation from TypeScript type information
 */
function extractTypeAnnotation(typeAnnotation: t.TypeAnnotation | t.TSTypeAnnotation | null | undefined): string {
  if (!typeAnnotation) return 'any';

  if (t.isTSTypeAnnotation(typeAnnotation)) {
    return generateTypeFromTSType(typeAnnotation.typeAnnotation);
  }

  if (t.isTypeAnnotation(typeAnnotation)) {
    // Flow types (less common, but handled for completeness)
    return 'any';
  }

  return 'any';
}

/**
 * Generates string representation of TypeScript type
 */
function generateTypeFromTSType(tsType: t.TSType): string {
  if (t.isTSStringKeyword(tsType)) return 'string';
  if (t.isTSNumberKeyword(tsType)) return 'number';
  if (t.isTSBooleanKeyword(tsType)) return 'boolean';
  if (t.isTSVoidKeyword(tsType)) return 'void';
  if (t.isTSAnyKeyword(tsType)) return 'any';
  if (t.isTSUnknownKeyword(tsType)) return 'unknown';
  if (t.isTSNullKeyword(tsType)) return 'null';
  if (t.isTSUndefinedKeyword(tsType)) return 'undefined';

  if (t.isTSTypeReference(tsType) && t.isIdentifier(tsType.typeName)) {
    return tsType.typeName.name;
  }

  if (t.isTSArrayType(tsType)) {
    const elementType = generateTypeFromTSType(tsType.elementType);
    return `${elementType}[]`;
  }

  if (t.isTSUnionType(tsType)) {
    const types = tsType.types.map(type => generateTypeFromTSType(type));
    return types.join(' | ');
  }

  // Fallback for complex types
  return 'any';
}

/**
 * Extracts return type from function
 */
function extractReturnType(returnType: t.TypeAnnotation | t.TSTypeAnnotation | null | undefined): string {
  if (!returnType) return 'any';

  if (t.isTSTypeAnnotation(returnType)) {
    return generateTypeFromTSType(returnType.typeAnnotation);
  }

  return 'any';
}

/**
 * Extracts JSDoc documentation from comments
 */
function extractJSDoc(path: any, lines: string[]): string | undefined {
  const node = path.node;
  if (!node.leadingComments) return undefined;

  const jsDocComment = node.leadingComments.find(
    (comment: any) => comment.type === 'CommentBlock' && comment.value.startsWith('*')
  );

  if (jsDocComment) {
    return jsDocComment.value
      .split('\n')
      .map((line: string) => line.replace(/^\s*\*\s?/, '').trim())
      .filter((line: string) => line.length > 0)
      .join(' ');
  }

  return undefined;
}

/**
 * Gets the name of a function from various AST node types
 */
function getFunctionName(node: t.Node, path: any): string | null {
  if (t.isFunctionDeclaration(node) && node.id) {
    return node.id.name;
  }

  if (t.isClassMethod(node) && t.isIdentifier(node.key)) {
    const className = getClassName(path);
    return className ? `${className}.${node.key.name}` : node.key.name;
  }

  if (t.isObjectMethod(node) && t.isIdentifier(node.key)) {
    const objectName = getObjectName(path);
    return objectName ? `${objectName}.${node.key.name}` : node.key.name;
  }

  // For function expressions and arrow functions, try to get name from parent
  const parent = path.parent;
  if (t.isVariableDeclarator(parent) && t.isIdentifier(parent.id)) {
    return parent.id.name;
  }

  return null;
}

/**
 * Gets the class name for a method
 */
function getClassName(path: any): string | null {
  let currentPath = path;
  while (currentPath) {
    if (t.isClassDeclaration(currentPath.node) && currentPath.node.id) {
      return currentPath.node.id.name;
    }
    // Check if we're in a ClassExpression as well
    if (t.isClassExpression(currentPath.node) && currentPath.node.id) {
      return currentPath.node.id.name;
    }
    currentPath = currentPath.parentPath; // Use parentPath instead of parent
  }
  return null;
}

/**
 * Gets the object name for an object method
 */
function getObjectName(path: any): string | null {
  const parent = path.parent;
  if (t.isObjectExpression(parent)) {
    const grandParent = path.parentPath.parent;
    if (t.isVariableDeclarator(grandParent) && t.isIdentifier(grandParent.id)) {
      return grandParent.id.name;
    }
  }
  return null;
}

/**
 * Checks if a function/class is exported
 */
function isExported(pathOrNode: any): boolean {
  if (!pathOrNode) return false;

  // Check if current node is an export declaration
  if (t.isExportNamedDeclaration(pathOrNode) || t.isExportDefaultDeclaration(pathOrNode)) {
    return true;
  }

  // For path objects, check parent
  if (pathOrNode.parent) {
    return t.isExportNamedDeclaration(pathOrNode.parent) || t.isExportDefaultDeclaration(pathOrNode.parent);
  }

  return false;
}

/**
 * Checks if a class is exported (for determining if methods are exported)
 */
function isClassExported(path: any): boolean {
  let currentPath = path;
  while (currentPath) {
    if (t.isClassDeclaration(currentPath.node)) {
      return isExported(currentPath);
    }
    currentPath = currentPath.parent;
  }
  return false;
}

/**
 * Generates code string from AST node (for default values)
 */
function generateCodeFromNode(node: t.Node): string {
  if (t.isStringLiteral(node)) return `"${node.value}"`;
  if (t.isNumericLiteral(node)) return String(node.value);
  if (t.isBooleanLiteral(node)) return String(node.value);
  if (t.isNullLiteral(node)) return 'null';
  if (t.isIdentifier(node)) return node.name;

  // Fallback for complex expressions
  return 'unknown';
}