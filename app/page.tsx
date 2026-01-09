'use client';

import { useState, useCallback } from 'react';
import URLInput from '../src/components/URLInput';
import { CodeFetchResult, AnalysisStatus, GraphData } from '../src/types';

interface ParseResult {
  nodes: GraphData['nodes'];
  edges: GraphData['edges'];
  metadata: {
    fileName: string;
    totalFunctions: number;
    totalCalls: number;
    imports: string[];
    exports: string[];
    fileSize?: number;
    parseTime: number;
  };
}

export default function Home() {
  const [analysisResult, setAnalysisResult] = useState<CodeFetchResult | null>(null);
  const [parseResult, setParseResult] = useState<ParseResult | null>(null);
  const [analysisStatus, setAnalysisStatus] = useState<AnalysisStatus>('idle');
  const [parseError, setParseError] = useState<string | null>(null);

  const handleAnalyze = useCallback(async (result: CodeFetchResult) => {
    setAnalysisResult(result);
    setParseResult(null);
    setParseError(null);

    if (result.success && result.content) {
      // Call the parse API
      try {
        setAnalysisStatus('parsing');
        
        const response = await fetch('/api/parse-code', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            url: result.url,
          }),
        });

        const parseData = await response.json();

        if (parseData.success) {
          setParseResult(parseData.data);
          setAnalysisStatus('complete');
        } else {
          setParseError(parseData.error);
          setAnalysisStatus('error');
        }
      } catch (error) {
        setParseError(error instanceof Error ? error.message : 'Failed to parse code');
        setAnalysisStatus('error');
      }
    }
  }, []);

  const handleStatusChange = useCallback((status: AnalysisStatus) => {
    setAnalysisStatus(status);
  }, []);

  const handleReset = useCallback(() => {
    setAnalysisResult(null);
    setParseResult(null);
    setParseError(null);
    setAnalysisStatus('idle');
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <header className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            TypeScript Function Visualizer
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Paste a URL to a TypeScript file to visualize its function relationships as an interactive graph
          </p>
        </header>

        {/* Instructions */}
        <div className="max-w-4xl mx-auto mb-8">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">How it works:</h2>
            <ol className="list-decimal list-inside space-y-2 text-gray-700">
              <li>Paste a URL to a TypeScript (.ts) or TSX (.tsx) file</li>
              <li>Click &ldquo;Analyze&rdquo; to fetch and parse the code</li>
              <li>View the generated function graph (coming in Phase 3)</li>
            </ol>
          </div>
        </div>

        {/* URL Input */}
        <div className="max-w-4xl mx-auto mb-8">
          <URLInput
            onAnalyze={handleAnalyze}
            onStatusChange={handleStatusChange}
          />
        </div>

        {/* Results Section */}
        {analysisResult && (
          <div className="max-w-4xl mx-auto">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900">Analysis Results</h2>
                <button
                  onClick={handleReset}
                  className="text-sm bg-gray-100 hover:bg-gray-200 px-3 py-1 rounded-md transition-colors"
                >
                  Analyze New File
                </button>
              </div>
              
              {analysisResult.success ? (
                <div className="space-y-4">
                  <div className="flex items-center space-x-2 text-green-600">
                    <span className="text-green-500">✓</span>
                    <span className="font-medium">Code fetched successfully</span>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                    <div className="bg-gray-50 p-3 rounded-lg">
                      <span className="font-medium text-gray-700">Source:</span>
                      <p className="text-gray-600 break-all">{analysisResult.url}</p>
                    </div>
                    <div className="bg-gray-50 p-3 rounded-lg">
                      <span className="font-medium text-gray-700">Size:</span>
                      <p className="text-gray-600">
                        {analysisResult.size ? `${Math.round(analysisResult.size / 1024)} KB` : 'Unknown'}
                      </p>
                    </div>
                    <div className="bg-gray-50 p-3 rounded-lg">
                      <span className="font-medium text-gray-700">Status:</span>
                      <p className="text-gray-600 capitalize">{analysisStatus}</p>
                    </div>
                  </div>

                  {/* Code Preview */}
                  {analysisResult.content && (
                    <div className="mt-6">
                      <h3 className="font-medium text-gray-900 mb-2">Code Preview:</h3>
                      <div className="bg-gray-900 rounded-lg p-4 overflow-auto max-h-96">
                        <pre className="text-sm text-gray-100 overflow-x-auto">
                          <code>{analysisResult.content.slice(0, 2000)}</code>
                          {analysisResult.content.length > 2000 && (
                            <span className="text-gray-400">... (truncated)</span>
                          )}
                        </pre>
                      </div>
                    </div>
                  )}

                  {/* Parsing Results */}
                  {analysisStatus === 'parsing' && (
                    <div className="mt-6 p-4 bg-blue-50 rounded-lg">
                      <div className="flex items-center space-x-2">
                        <div className="animate-spin h-5 w-5 border-2 border-blue-500 border-t-transparent rounded-full"></div>
                        <span className="font-medium text-blue-700">Parsing TypeScript code...</span>
                      </div>
                    </div>
                  )}

                  {parseError && (
                    <div className="mt-6 p-4 bg-red-50 rounded-lg">
                      <div className="flex items-center space-x-2 text-red-600">
                        <span className="text-red-500">✗</span>
                        <span className="font-medium">Parsing failed</span>
                      </div>
                      <p className="text-red-600 text-sm mt-2">{parseError}</p>
                    </div>
                  )}

                  {parseResult && (
                    <div className="mt-6 space-y-6">
                      {/* Parse Metadata */}
                      <div>
                        <h3 className="font-medium text-gray-900 mb-4">Parse Results:</h3>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                          <div className="bg-green-50 p-3 rounded-lg">
                            <span className="font-medium text-green-700">Functions:</span>
                            <p className="text-green-600 text-lg font-bold">{parseResult.metadata.totalFunctions}</p>
                          </div>
                          <div className="bg-blue-50 p-3 rounded-lg">
                            <span className="font-medium text-blue-700">Calls:</span>
                            <p className="text-blue-600 text-lg font-bold">{parseResult.metadata.totalCalls}</p>
                          </div>
                          <div className="bg-purple-50 p-3 rounded-lg">
                            <span className="font-medium text-purple-700">Imports:</span>
                            <p className="text-purple-600 text-lg font-bold">{parseResult.metadata.imports.length}</p>
                          </div>
                          <div className="bg-orange-50 p-3 rounded-lg">
                            <span className="font-medium text-orange-700">Exports:</span>
                            <p className="text-orange-600 text-lg font-bold">{parseResult.metadata.exports.length}</p>
                          </div>
                        </div>
                      </div>

                      {/* Function List */}
                      {parseResult.nodes.length > 0 && (
                        <div>
                          <h3 className="font-medium text-gray-900 mb-4">Functions Found:</h3>
                          <div className="bg-white border rounded-lg overflow-hidden">
                            <div className="max-h-64 overflow-y-auto">
                              {parseResult.nodes.map((node, index) => (
                                <div key={node.id} className={`p-3 border-b last:border-b-0 ${index % 2 === 0 ? 'bg-gray-50' : 'bg-white'}`}>
                                  <div className="flex items-center justify-between">
                                    <div className="flex-1">
                                      <h4 className="font-medium text-gray-900">{node.data.label}</h4>
                                      {node.data.parameters && node.data.parameters.length > 0 && (
                                        <p className="text-sm text-gray-600">
                                          Parameters: {node.data.parameters.map((p: any) => `${p.name}: ${p.type}`).join(', ')}
                                        </p>
                                      )}
                                      <p className="text-sm text-gray-600">Returns: {node.data.returnType}</p>
                                    </div>
                                    <div className="flex space-x-1">
                                      {node.data.isAsync && (
                                        <span className="px-2 py-1 bg-purple-100 text-purple-600 text-xs rounded">async</span>
                                      )}
                                      {node.data.isExported && (
                                        <span className="px-2 py-1 bg-green-100 text-green-600 text-xs rounded">exported</span>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Function Calls */}
                      {parseResult.edges.length > 0 && (
                        <div>
                          <h3 className="font-medium text-gray-900 mb-4">Function Calls:</h3>
                          <div className="bg-white border rounded-lg overflow-hidden">
                            <div className="max-h-48 overflow-y-auto">
                              {parseResult.edges.map((edge, index) => (
                                <div key={edge.id} className={`p-3 border-b last:border-b-0 ${index % 2 === 0 ? 'bg-gray-50' : 'bg-white'}`}>
                                  <div className="flex items-center justify-between">
                                    <div>
                                      <p className="font-medium text-gray-900">
                                        {parseResult.nodes.find(n => n.id === edge.source)?.data.label} 
                                        <span className="mx-2 text-gray-400">→</span>
                                        {parseResult.nodes.find(n => n.id === edge.target)?.data.label}
                                      </p>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                      {edge.label && (
                                        <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded">{edge.label}</span>
                                      )}
                                      {edge.animated && (
                                        <span className="px-2 py-1 bg-purple-100 text-purple-600 text-xs rounded">async</span>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      )}

                      {/* JSON Preview */}
                      <details className="border rounded-lg">
                        <summary className="p-4 bg-gray-50 cursor-pointer font-medium">
                          View Raw Graph Data (JSON)
                        </summary>
                        <div className="p-4 bg-gray-900 rounded-b-lg">
                          <pre className="text-sm text-gray-100 overflow-x-auto">
                            <code>{JSON.stringify({ nodes: parseResult.nodes, edges: parseResult.edges }, null, 2)}</code>
                          </pre>
                        </div>
                      </details>

                      {/* Visualization Placeholder */}
                      <div className="p-8 bg-gradient-to-br from-blue-50 to-purple-50 rounded-lg border-2 border-dashed border-blue-300 text-center">
                        <div className="text-blue-600">
                          <svg className="mx-auto h-12 w-12 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                          </svg>
                          <h3 className="text-lg font-medium text-blue-900 mb-2">Interactive Graph Visualization</h3>
                          <p className="text-blue-700">
                            Coming in Phase 3: Visual graph with {parseResult.nodes.length} nodes and {parseResult.edges.length} relationships
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="flex items-center space-x-2 text-red-600">
                    <span className="text-red-500">✗</span>
                    <span className="font-medium">Analysis failed</span>
                  </div>
                  <p className="text-red-600 text-sm">{analysisResult.error}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Footer */}
        <footer className="max-w-4xl mx-auto mt-12 text-center text-gray-500 text-sm">
          <p>Phase 2: Code Parsing & Analysis - TypeScript Function Extraction Complete</p>
        </footer>
      </div>
    </div>
  );
}
