'use client';

import React, { useState, useCallback } from 'react';
import {
  X,
  Clipboard,
  ExternalLink,
  FileText,
  FunctionSquare,
  ArrowRight,
  Settings,
  ChevronDown,
  ChevronRight,
  Users,
  PhoneCall,
  MapPin,
  Code2,
  Info
} from 'lucide-react';
import type { Node } from '@xyflow/react';

interface NodeDetailsPanelProps {
  selectedNode: Node | null;
  onClose: () => void;
  onHighlightConnections: (nodeId: string) => void;
  onNavigateToNode: (nodeId: string) => void;
  allNodes: Node[];
  allEdges: any[];
}

const NodeDetailsPanel: React.FC<NodeDetailsPanelProps> = ({
  selectedNode,
  onClose,
  onHighlightConnections,
  onNavigateToNode,
  allNodes,
  allEdges
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'code' | 'connections'>('overview');
  const [codeExpanded, setCodeExpanded] = useState(false);

  const handleCopySignature = useCallback(() => {
    if (!selectedNode?.data) return;
    
    const { label, parameters = [], returnType = 'void', isAsync } = selectedNode.data as any;
    const signature = `${isAsync ? 'async ' : ''}function ${label}(${
      parameters.map((p: any) => `${p.name}${p.optional ? '?' : ''}: ${p.type}`).join(', ')
    }): ${returnType}`;
    
    navigator.clipboard.writeText(signature);
  }, [selectedNode]);

  const handleCopyCode = useCallback(() => {
    if (!selectedNode?.data?.codePreview) return;
    navigator.clipboard.writeText((selectedNode.data as any).codePreview);
  }, [selectedNode]);

  // Find connections for the selected node
  const getConnections = useCallback(() => {
    if (!selectedNode) return { callers: [], callees: [] };
    
    const callers = allEdges
      .filter(edge => edge.target === selectedNode.id)
      .map(edge => allNodes.find(node => node.id === edge.source))
      .filter((node): node is Node => Boolean(node));
      
    const callees = allEdges
      .filter(edge => edge.source === selectedNode.id)
      .map(edge => allNodes.find(node => node.id === edge.target))
      .filter((node): node is Node => Boolean(node));
      
    return { callers, callees };
  }, [selectedNode, allNodes, allEdges]);

  if (!selectedNode) return null;

  const data = selectedNode.data as any;
  const { callers, callees } = getConnections();

  const getFunctionIcon = (category?: string) => {
    switch (category) {
      case 'method':
        return <Settings className="w-4 h-4" />;
      case 'arrow':
        return <ArrowRight className="w-4 h-4" />;
      default:
        return <FunctionSquare className="w-4 h-4" />;
    }
  };

  const tabs = [
    { id: 'overview', label: 'Overview', icon: Info },
    { id: 'code', label: 'Code', icon: Code2 },
    { id: 'connections', label: 'Connections', icon: Users }
  ] as const;

  return (
    <div className="fixed right-0 top-0 h-full w-96 bg-white dark:bg-gray-900 border-l border-gray-200 dark:border-gray-700 shadow-2xl z-50 overflow-hidden flex flex-col">
      
      {/* Header */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
              {getFunctionIcon(data.category)}
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 truncate">
                {data.label}
              </h2>
              <div className="flex items-center space-x-2 mt-1">
                {data.isAsync && (
                  <span className="px-2 py-1 text-xs bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300 rounded">
                    async
                  </span>
                )}
                {data.isExported && (
                  <span className="px-2 py-1 text-xs bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 rounded">
                    {data.isDefaultExport ? 'default export' : 'exported'}
                  </span>
                )}
                {data.complexity > 3 && (
                  <span className="px-2 py-1 text-xs bg-orange-100 dark:bg-orange-900 text-orange-700 dark:text-orange-300 rounded">
                    complex
                  </span>
                )}
              </div>
            </div>
          </div>
          
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center space-x-2 px-4 py-3 text-sm font-medium transition-colors ${
              activeTab === tab.id
                ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400 bg-white dark:bg-gray-900'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        
        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            
            {/* Function Signature */}
            <div>
              <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3">
                Function Signature
              </h3>
              <div className="bg-gray-900 dark:bg-gray-800 rounded-lg p-3">
                <pre className="text-sm text-gray-100 overflow-x-auto">
                  <code>
                    {data.isAsync && <span className="text-purple-400">async </span>}
                    <span className="text-blue-400">function</span>{' '}
                    <span className="text-yellow-400">{data.label}</span>
                    <span className="text-gray-300">(</span>
                    {data.parameters?.map((param: any, index: number) => (
                      <span key={index}>
                        {index > 0 && <span className="text-gray-300">, </span>}
                        <span className="text-green-400">{param.name}</span>
                        {param.optional && <span className="text-orange-400">?</span>}
                        <span className="text-gray-300">: </span>
                        <span className="text-cyan-400">{param.type}</span>
                        {param.defaultValue && (
                          <>
                            <span className="text-gray-300"> = </span>
                            <span className="text-yellow-400">{param.defaultValue}</span>
                          </>
                        )}
                      </span>
                    ))}
                    <span className="text-gray-300">): </span>
                    <span className="text-cyan-400">{data.returnType}</span>
                  </code>
                </pre>
              </div>
              
              <div className="flex items-center space-x-2 mt-3">
                <button
                  onClick={handleCopySignature}
                  className="flex items-center space-x-2 px-3 py-2 bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded-lg hover:bg-blue-200 dark:hover:bg-blue-800 transition-colors text-sm"
                >
                  <Clipboard className="w-4 h-4" />
                  <span>Copy Signature</span>
                </button>
                
                <button
                  onClick={() => onHighlightConnections(selectedNode.id)}
                  className="flex items-center space-x-2 px-3 py-2 bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300 rounded-lg hover:bg-purple-200 dark:hover:bg-purple-800 transition-colors text-sm"
                >
                  <MapPin className="w-4 h-4" />
                  <span>Highlight</span>
                </button>
              </div>
            </div>

            {/* Parameters */}
            {data.parameters && data.parameters.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3">
                  Parameters ({data.parameters.length})
                </h3>
                <div className="space-y-2">
                  {data.parameters.map((param: any, index: number) => (
                    <div key={index} className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3">
                      <div className="flex items-center space-x-2">
                        <code className="text-sm font-medium text-blue-600 dark:text-blue-400">
                          {param.name}
                        </code>
                        {param.optional && (
                          <span className="text-xs bg-orange-100 dark:bg-orange-900 text-orange-700 dark:text-orange-300 px-2 py-1 rounded">
                            optional
                          </span>
                        )}
                      </div>
                      <div className="mt-1 text-xs text-gray-600 dark:text-gray-400">
                        Type: <code className="text-purple-600 dark:text-purple-400">{param.type}</code>
                      </div>
                      {param.defaultValue && (
                        <div className="mt-1 text-xs text-gray-600 dark:text-gray-400">
                          Default: <code className="text-yellow-600 dark:text-yellow-400">{param.defaultValue}</code>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Documentation */}
            {data.documentation && (
              <div>
                <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3">
                  Documentation
                </h3>
                <div className="bg-blue-50 dark:bg-blue-950 rounded-lg p-3">
                  <p className="text-sm text-blue-900 dark:text-blue-100">
                    {data.documentation}
                  </p>
                </div>
              </div>
            )}

            {/* Location */}
            {data.location && (
              <div>
                <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3">
                  Source Location
                </h3>
                <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3">
                  <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400">
                    <MapPin className="w-4 h-4" />
                    <span>
                      Lines {data.location.startLine}-{data.location.endLine}
                      {data.location.startColumn && (
                        <>, Columns {data.location.startColumn}-{data.location.endColumn}</>
                      )}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Stats */}
            <div>
              <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3">
                Statistics
              </h3>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-green-50 dark:bg-green-950 rounded-lg p-3">
                  <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                    {callees.length}
                  </div>
                  <div className="text-xs text-green-700 dark:text-green-300">
                    Functions Called
                  </div>
                </div>
                <div className="bg-blue-50 dark:bg-blue-950 rounded-lg p-3">
                  <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                    {callers.length}
                  </div>
                  <div className="text-xs text-blue-700 dark:text-blue-300">
                    Called By
                  </div>
                </div>
                {data.complexity && (
                  <div className="bg-orange-50 dark:bg-orange-950 rounded-lg p-3">
                    <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                      {data.complexity}
                    </div>
                    <div className="text-xs text-orange-700 dark:text-orange-300">
                      Complexity
                    </div>
                  </div>
                )}
                <div className="bg-purple-50 dark:bg-purple-950 rounded-lg p-3">
                  <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                    {data.parameters?.length || 0}
                  </div>
                  <div className="text-xs text-purple-700 dark:text-purple-300">
                    Parameters
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Code Tab */}
        {activeTab === 'code' && (
          <div className="space-y-4">
            {data.codePreview ? (
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                    Source Code
                  </h3>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => setCodeExpanded(!codeExpanded)}
                      className="flex items-center space-x-1 px-2 py-1 text-xs bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                    >
                      {codeExpanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                      <span>{codeExpanded ? 'Collapse' : 'Expand'}</span>
                    </button>
                    
                    <button
                      onClick={handleCopyCode}
                      className="flex items-center space-x-1 px-2 py-1 text-xs bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded hover:bg-blue-200 dark:hover:bg-blue-800 transition-colors"
                    >
                      <Clipboard className="w-3 h-3" />
                      <span>Copy</span>
                    </button>
                  </div>
                </div>
                
                <div className="bg-gray-900 dark:bg-gray-800 rounded-lg overflow-hidden">
                  <pre className={`text-sm text-gray-100 p-4 overflow-auto ${
                    codeExpanded ? 'max-h-none' : 'max-h-48'
                  }`}>
                    <code>{data.codePreview}</code>
                  </pre>
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                <FileText className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>No code preview available</p>
              </div>
            )}
          </div>
        )}

        {/* Connections Tab */}
        {activeTab === 'connections' && (
          <div className="space-y-6">
            
            {/* Functions this one calls */}
            <div>
              <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3">
                Calls ({callees.length})
              </h3>
              {callees.length > 0 ? (
                <div className="space-y-2">
                  {callees.map((node) => (
                    <div
                      key={node.id}
                      className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors cursor-pointer"
                      onClick={() => onNavigateToNode(node.id)}
                    >
                      <div className="flex items-center space-x-3">
                        <div className="p-1 bg-green-100 dark:bg-green-900 rounded">
                          {getFunctionIcon((node.data as any).category)}
                        </div>
                        <div>
                          <div className="font-medium text-sm text-gray-900 dark:text-gray-100">
                            {(node.data as any).label}
                          </div>
                          <div className="text-xs text-gray-600 dark:text-gray-400">
                            Returns: {(node.data as any).returnType || 'void'}
                          </div>
                        </div>
                      </div>
                      
                      <ExternalLink className="w-4 h-4 text-gray-400" />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6 text-gray-500 dark:text-gray-400">
                  <PhoneCall className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">This function doesn't call any other functions</p>
                </div>
              )}
            </div>

            {/* Functions that call this one */}
            <div>
              <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3">
                Called By ({callers.length})
              </h3>
              {callers.length > 0 ? (
                <div className="space-y-2">
                  {callers.map((node) => (
                    <div
                      key={node.id}
                      className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors cursor-pointer"
                      onClick={() => onNavigateToNode(node.id)}
                    >
                      <div className="flex items-center space-x-3">
                        <div className="p-1 bg-blue-100 dark:bg-blue-900 rounded">
                          {getFunctionIcon((node.data as any).category)}
                        </div>
                        <div>
                          <div className="font-medium text-sm text-gray-900 dark:text-gray-100">
                            {(node.data as any).label}
                          </div>
                          <div className="text-xs text-gray-600 dark:text-gray-400">
                            Returns: {(node.data as any).returnType || 'void'}
                          </div>
                        </div>
                      </div>
                      
                      <ExternalLink className="w-4 h-4 text-gray-400" />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6 text-gray-500 dark:text-gray-400">
                  <Users className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">This function is not called by any other functions</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default NodeDetailsPanel;