'use client';

import { useState } from 'react';
import URLInput from '../src/components/URLInput';
import { CodeFetchResult, AnalysisStatus } from '../src/types';

export default function Home() {
  const [analysisResult, setAnalysisResult] = useState<CodeFetchResult | null>(null);
  const [analysisStatus, setAnalysisStatus] = useState<AnalysisStatus>('idle');

  const handleAnalyze = (result: CodeFetchResult) => {
    setAnalysisResult(result);
  };

  const handleStatusChange = (status: AnalysisStatus) => {
    setAnalysisStatus(status);
  };

  const handleReset = () => {
    setAnalysisResult(null);
    setAnalysisStatus('idle');
  };

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

                  {/* Placeholder for Visualization */}
                  <div className="mt-6 p-8 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300 text-center">
                    <div className="text-gray-500">
                      <svg className="mx-auto h-12 w-12 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                      </svg>
                      <h3 className="text-lg font-medium text-gray-900 mb-2">Function Visualization</h3>
                      <p className="text-gray-600">
                        Code parsing and graph visualization will be implemented in Phase 2 & 3
                      </p>
                    </div>
                  </div>
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
          <p>Phase 1: Basic Setup & Foundation - URL Input and Code Fetching</p>
        </footer>
      </div>
    </div>
  );
}
