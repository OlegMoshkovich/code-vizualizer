'use client';

import React, { useState, useCallback, memo } from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { 
  ChevronDown, 
  ChevronRight, 
  FunctionSquare, 
  ArrowRight, 
  Settings, 
  FileText, 
  ExternalLink,
  Clipboard 
} from 'lucide-react';
import type { FunctionParameter } from '../types';

interface FunctionNodeData extends Record<string, unknown> {
  label: string;
  parameters?: FunctionParameter[];
  returnType?: string;
  isAsync?: boolean;
  isExported?: boolean;
  isDefaultExport?: boolean;
  complexity?: number;
  category?: 'function' | 'method' | 'arrow' | 'async';
  location?: {
    startLine: number;
    endLine: number;
    startColumn?: number;
    endColumn?: number;
  };
  codePreview?: string;
  documentation?: string;
  calls?: string[];
  calledBy?: string[];
}

interface FunctionNodeProps extends NodeProps {
  data: FunctionNodeData;
}

const FunctionNode: React.FC<FunctionNodeProps> = ({ 
  data, 
  selected = false,
  id 
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showCodePreview, setShowCodePreview] = useState(false);

  const {
    label,
    parameters = [],
    returnType = 'void',
    isAsync = false,
    isExported = false,
    isDefaultExport = false,
    complexity = 1,
    category = 'function',
    location,
    codePreview,
    documentation,
    calls = [],
    calledBy = []
  } = data;

  // Determine node colors based on function type and properties
  const getNodeColors = useCallback(() => {
    if (isAsync) {
      return {
        bg: 'bg-purple-50 dark:bg-purple-950',
        border: 'border-purple-200 dark:border-purple-800',
        header: 'bg-purple-100 dark:bg-purple-900',
        text: 'text-purple-900 dark:text-purple-100'
      };
    }
    
    if (isExported) {
      return {
        bg: 'bg-green-50 dark:bg-green-950',
        border: 'border-green-200 dark:border-green-800',
        header: 'bg-green-100 dark:bg-green-900',
        text: 'text-green-900 dark:text-green-100'
      };
    }
    
    if (category === 'method') {
      return {
        bg: 'bg-blue-50 dark:bg-blue-950',
        border: 'border-blue-200 dark:border-blue-800',
        header: 'bg-blue-100 dark:bg-blue-900',
        text: 'text-blue-900 dark:text-blue-100'
      };
    }
    
    return {
      bg: 'bg-gray-50 dark:bg-gray-950',
      border: 'border-gray-200 dark:border-gray-800',
      header: 'bg-gray-100 dark:bg-gray-900',
      text: 'text-gray-900 dark:text-gray-100'
    };
  }, [isAsync, isExported, category]);

  const colors = getNodeColors();

  // Get function icon based on type
  const getFunctionIcon = () => {
    switch (category) {
      case 'method':
        return <Settings className="w-4 h-4" />;
      case 'arrow':
        return <ArrowRight className="w-4 h-4" />;
      default:
        return <FunctionSquare className="w-4 h-4" />;
    }
  };

  // Handle copy function signature
  const handleCopySignature = () => {
    const signature = `${isAsync ? 'async ' : ''}function ${label}(${parameters.map(p => 
      `${p.name}${p.optional ? '?' : ''}: ${p.type}`
    ).join(', ')}): ${returnType}`;
    navigator.clipboard.writeText(signature);
  };

  // Calculate node width based on content
  const calculateNodeWidth = () => {
    const labelWidth = Math.max(label.length * 8, 160);
    const paramWidth = parameters.length > 0 
      ? Math.max(...parameters.map(p => (p.name + p.type).length * 6)) + 40
      : 0;
    return Math.min(Math.max(labelWidth, paramWidth, 200), 400);
  };

  const nodeWidth = calculateNodeWidth();

  return (
    <div 
      className={`
        ${colors.bg} ${colors.border} ${colors.text}
        border-2 rounded-lg shadow-lg hover:shadow-xl
        transition-all duration-200 ease-in-out
        ${selected ? 'ring-2 ring-blue-500 ring-offset-2' : ''}
        min-w-48 max-w-96
      `}
      style={{ width: nodeWidth }}
    >
      {/* Top Handle - Functions that call this one */}
      <Handle
        type="target"
        position={Position.Top}
        className="!w-3 !h-3 !bg-blue-500 !border-2 !border-white"
        style={{ top: -6 }}
      />
      
      {/* Left Handles - Parameters */}
      {parameters.map((param, index) => (
        <Handle
          key={`param-${index}`}
          type="target"
          position={Position.Left}
          id={`param-${index}`}
          className="!w-2 !h-2 !bg-green-500 !border !border-white"
          style={{ 
            top: 80 + index * 25,
            left: -4
          }}
        />
      ))}

      {/* Header Section */}
      <div className={`${colors.header} px-3 py-2 rounded-t-lg flex items-center justify-between`}>
        <div className="flex items-center space-x-2 flex-1 min-w-0">
          {getFunctionIcon()}
          <span className="font-semibold text-sm truncate">{label}</span>
        </div>
        
        <div className="flex items-center space-x-1 ml-2">
          {/* Badges */}
          {isAsync && (
            <span className="px-2 py-1 text-xs bg-purple-600 text-white rounded">
              async
            </span>
          )}
          {isExported && (
            <span className="px-2 py-1 text-xs bg-green-600 text-white rounded">
              {isDefaultExport ? 'default' : 'export'}
            </span>
          )}
          {complexity && complexity > 3 && (
            <span className="px-2 py-1 text-xs bg-orange-600 text-white rounded">
              complex
            </span>
          )}
          
          {/* Expand/Collapse button */}
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1 hover:bg-black hover:bg-opacity-10 rounded"
          >
            {isExpanded ? (
              <ChevronDown className="w-4 h-4" />
            ) : (
              <ChevronRight className="w-4 h-4" />
            )}
          </button>
        </div>
      </div>

      {/* Parameters Section */}
      {parameters.length > 0 && (
        <div className="px-3 py-2 border-b border-gray-200 dark:border-gray-700">
          <div className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
            Parameters:
          </div>
          <div className="space-y-1">
            {parameters.slice(0, isExpanded ? parameters.length : 3).map((param, index) => (
              <div key={index} className="flex items-center text-xs">
                <span className="font-mono text-blue-600 dark:text-blue-400">
                  {param.name}
                </span>
                {param.optional && (
                  <span className="text-orange-500 ml-1">?</span>
                )}
                <span className="mx-1 text-gray-500">:</span>
                <span className="font-mono text-purple-600 dark:text-purple-400 truncate">
                  {param.type}
                </span>
                {param.defaultValue && (
                  <span className="ml-1 text-gray-500 text-xs">
                    = {param.defaultValue}
                  </span>
                )}
              </div>
            ))}
            {!isExpanded && parameters.length > 3 && (
              <div className="text-xs text-gray-500">
                ... and {parameters.length - 3} more
              </div>
            )}
          </div>
        </div>
      )}

      {/* Return Type Section */}
      <div className="px-3 py-2 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center text-xs">
          <span className="font-medium text-gray-600 dark:text-gray-400 mr-2">
            Returns:
          </span>
          <span className="font-mono text-green-600 dark:text-green-400">
            {returnType}
          </span>
        </div>
      </div>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="px-3 py-2 space-y-2">
          {/* Location Info */}
          {location && (
            <div className="text-xs text-gray-600 dark:text-gray-400">
              Lines: {location.startLine}-{location.endLine}
            </div>
          )}
          
          {/* Documentation */}
          {documentation && (
            <div className="text-xs text-gray-700 dark:text-gray-300 italic">
              {documentation}
            </div>
          )}
          
          {/* Code Preview Toggle */}
          {codePreview && (
            <div>
              <button
                onClick={() => setShowCodePreview(!showCodePreview)}
                className="flex items-center text-xs text-blue-600 dark:text-blue-400 hover:underline"
              >
                <FileText className="w-3 h-3 mr-1" />
                {showCodePreview ? 'Hide' : 'Show'} Code
              </button>
              
              {showCodePreview && (
                <div className="mt-2 p-2 bg-gray-900 dark:bg-gray-800 rounded text-xs">
                  <pre className="text-gray-100 overflow-x-auto">
                    <code>{codePreview}</code>
                  </pre>
                </div>
              )}
            </div>
          )}
          
          {/* Function Stats */}
          <div className="flex justify-between text-xs text-gray-600 dark:text-gray-400">
            <span>Calls: {calls.length}</span>
            <span>Called by: {calledBy.length}</span>
          </div>
          
          {/* Actions */}
          <div className="flex items-center justify-between pt-2">
            <button
              onClick={handleCopySignature}
              className="flex items-center text-xs text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100"
            >
              <Clipboard className="w-3 h-3 mr-1" />
              Copy Signature
            </button>
            
            <button className="flex items-center text-xs text-blue-600 dark:text-blue-400 hover:underline">
              <ExternalLink className="w-3 h-3 mr-1" />
              View Source
            </button>
          </div>
        </div>
      )}

      {/* Right Handle - Return value */}
      <Handle
        type="source"
        position={Position.Right}
        className="!w-3 !h-3 !bg-green-500 !border-2 !border-white"
        style={{ right: -6 }}
      />
      
      {/* Bottom Handle - Functions this one calls */}
      <Handle
        type="source"
        position={Position.Bottom}
        className="!w-3 !h-3 !bg-orange-500 !border-2 !border-white"
        style={{ bottom: -6 }}
      />
    </div>
  );
};

export default memo(FunctionNode);