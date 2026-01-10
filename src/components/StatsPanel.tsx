'use client';

import React, { useMemo } from 'react';
import {
  BarChart3,
  Users,
  Zap,
  FileText,
  TrendingUp,
  AlertCircle,
  ExternalLink,
  Database,
  Clock,
  Target,
  GitBranch,
  Award
} from 'lucide-react';
import type { Node, Edge } from '@xyflow/react';

interface StatsPanelProps {
  nodes: Node[];
  edges: Edge[];
  metadata?: {
    fileName?: string;
    fileSize?: number;
    totalFunctions?: number;
    totalCalls?: number;
    imports?: string[];
    exports?: string[];
    parseTime?: number;
    url?: string;
  };
  onHighlightNodes: (nodeIds: string[]) => void;
}

const StatsPanel: React.FC<StatsPanelProps> = ({
  nodes,
  edges,
  metadata,
  onHighlightNodes
}) => {
  
  // Calculate comprehensive statistics
  const stats = useMemo(() => {
    const totalFunctions = nodes.length;
    const totalCalls = edges.length;
    
    // Function type breakdown
    const exported = nodes.filter(node => (node.data as any).isExported).length;
    const async = nodes.filter(node => (node.data as any).isAsync).length;
    const methods = nodes.filter(node => (node.data as any).category === 'method').length;
    const complex = nodes.filter(node => ((node.data as any).complexity || 0) > 3).length;
    
    // Connection analysis
    const connectionCounts = nodes.map(node => {
      const inbound = edges.filter(edge => edge.target === node.id).length;
      const outbound = edges.filter(edge => edge.source === node.id).length;
      return { nodeId: node.id, total: inbound + outbound, inbound, outbound };
    });
    
    const isolated = connectionCounts.filter(c => c.total === 0).length;
    const mostConnected = connectionCounts.reduce(
      (max, current) => current.total > max.total ? current : max,
      { nodeId: '', total: 0, inbound: 0, outbound: 0 }
    );
    
    // Calculate average parameters per function
    const avgParams = totalFunctions > 0 
      ? nodes.reduce((sum, node) => sum + ((node.data as any).parameters?.length || 0), 0) / totalFunctions
      : 0;
    
    // Find circular dependencies (simplified detection)
    const hasCircularDeps = edges.some(edge => 
      edges.some(otherEdge => 
        edge.source === otherEdge.target && edge.target === otherEdge.source
      )
    );
    
    // Calculate call chain depth (simplified BFS)
    const calculateMaxDepth = () => {
      if (totalFunctions === 0) return 0;
      
      let maxDepth = 0;
      nodes.forEach(startNode => {
        const visited = new Set<string>();
        const queue: Array<{ nodeId: string; depth: number }> = [{ nodeId: startNode.id, depth: 0 }];
        
        while (queue.length > 0) {
          const { nodeId, depth } = queue.shift()!;
          
          if (visited.has(nodeId)) continue;
          visited.add(nodeId);
          
          maxDepth = Math.max(maxDepth, depth);
          
          // Add connected nodes to queue
          edges
            .filter(edge => edge.source === nodeId)
            .forEach(edge => {
              if (!visited.has(edge.target)) {
                queue.push({ nodeId: edge.target, depth: depth + 1 });
              }
            });
        }
      });
      
      return maxDepth;
    };
    
    const maxCallDepth = calculateMaxDepth();
    
    return {
      totalFunctions,
      totalCalls,
      exported,
      async,
      methods,
      complex,
      isolated,
      avgParams: Math.round(avgParams * 10) / 10,
      mostConnected,
      hasCircularDeps,
      maxCallDepth
    };
  }, [nodes, edges]);
  
  // Helper function to get node by ID
  const getNodeById = (nodeId: string) => nodes.find(node => node.id === nodeId);
  const mostConnectedNode = getNodeById(stats.mostConnected.nodeId);
  
  // Stat card component
  const StatCard: React.FC<{
    title: string;
    value: string | number;
    icon: React.ComponentType<any>;
    color: 'blue' | 'green' | 'purple' | 'orange' | 'red' | 'gray';
    description?: string;
    clickable?: boolean;
    onClick?: () => void;
  }> = ({ title, value, icon: Icon, color, description, clickable, onClick }) => {
    const colorClasses = {
      blue: 'bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800',
      green: 'bg-green-50 dark:bg-green-950 text-green-600 dark:text-green-400 border-green-200 dark:border-green-800',
      purple: 'bg-purple-50 dark:bg-purple-950 text-purple-600 dark:text-purple-400 border-purple-200 dark:border-purple-800',
      orange: 'bg-orange-50 dark:bg-orange-950 text-orange-600 dark:text-orange-400 border-orange-200 dark:border-orange-800',
      red: 'bg-red-50 dark:bg-red-950 text-red-600 dark:text-red-400 border-red-200 dark:border-red-800',
      gray: 'bg-gray-50 dark:bg-gray-950 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-800'
    };
    
    return (
      <div
        className={`
          ${colorClasses[color]} border rounded-lg p-4 transition-all duration-200
          ${clickable ? 'cursor-pointer hover:shadow-md transform hover:scale-105' : ''}
        `}
        onClick={onClick}
      >
        <div className="w-full">
          <div className="text-lg font-bold truncate">{value}</div>
          <div className="text-xs font-medium truncate">{title}</div>
          {description && (
            <div className="text-xs opacity-75 mt-1 truncate">{description}</div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-6">
      
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
            <BarChart3 className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              Code Analysis
            </h2>
            {metadata?.fileName && (
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {metadata.fileName}
              </p>
            )}
          </div>
        </div>
        
        {metadata?.url && (
          <button
            onClick={() => window.open(metadata.url, '_blank')}
            className="flex items-center space-x-2 px-3 py-2 text-sm text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950 rounded-lg transition-colors"
          >
            <ExternalLink className="w-4 h-4" />
            <span>View Source</span>
          </button>
        )}
      </div>

      {/* Main Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        <StatCard
          title="Total Functions"
          value={stats.totalFunctions}
          icon={FileText}
          color="blue"
          description="All function definitions found"
        />
        
        <StatCard
          title="Function Calls"
          value={stats.totalCalls}
          icon={GitBranch}
          color="green"
          description="Dependencies between functions"
        />
        
        <StatCard
          title="Exported Functions"
          value={stats.exported}
          icon={ExternalLink}
          color="purple"
          description={`${Math.round((stats.exported / stats.totalFunctions) * 100)}% of total`}
          clickable
          onClick={() => {
            const exportedNodes = nodes.filter(node => (node.data as any).isExported).map(node => node.id);
            onHighlightNodes(exportedNodes);
          }}
        />
        
        <StatCard
          title="Async Functions"
          value={stats.async}
          icon={Zap}
          color="orange"
          description={`${Math.round((stats.async / stats.totalFunctions) * 100)}% of total`}
          clickable
          onClick={() => {
            const asyncNodes = nodes.filter(node => (node.data as any).isAsync).map(node => node.id);
            onHighlightNodes(asyncNodes);
          }}
        />
        
        <StatCard
          title="Class Methods"
          value={stats.methods}
          icon={Users}
          color="blue"
          description={`${Math.round((stats.methods / stats.totalFunctions) * 100)}% of total`}
          clickable
          onClick={() => {
            const methodNodes = nodes.filter(node => (node.data as any).category === 'method').map(node => node.id);
            onHighlightNodes(methodNodes);
          }}
        />
        
        <StatCard
          title="Isolated Functions"
          value={stats.isolated}
          icon={Target}
          color="gray"
          description="Functions with no connections"
          clickable
          onClick={() => {
            const isolatedNodes = nodes
              .filter(node => {
                const hasConnections = edges.some(edge => edge.source === node.id || edge.target === node.id);
                return !hasConnections;
              })
              .map(node => node.id);
            onHighlightNodes(isolatedNodes);
          }}
        />
      </div>

      {/* Secondary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <StatCard
          title="Avg Parameters"
          value={stats.avgParams}
          icon={Database}
          color="purple"
          description="Average parameters per function"
        />
        
        <StatCard
          title="Max Call Depth"
          value={stats.maxCallDepth}
          icon={TrendingUp}
          color="blue"
          description="Longest call chain"
        />
        
        <StatCard
          title="Complex Functions"
          value={stats.complex}
          icon={AlertCircle}
          color="orange"
          description="Functions with high complexity"
          clickable
          onClick={() => {
            const complexNodes = nodes.filter(node => ((node.data as any).complexity || 0) > 3).map(node => node.id);
            onHighlightNodes(complexNodes);
          }}
        />
        
        {mostConnectedNode && (
          <StatCard
            title="Most Connected"
            value={(mostConnectedNode.data as any).label}
            icon={Award}
            color="green"
            description={`${stats.mostConnected.total} connections`}
            clickable
            onClick={() => onHighlightNodes([mostConnectedNode.id])}
          />
        )}
      </div>

      {/* Warnings and Issues */}
      {(stats.hasCircularDeps || stats.isolated > 0 || stats.complex > 0) && (
        <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3 flex items-center">
            <AlertCircle className="w-4 h-4 text-orange-500 mr-2" />
            Issues & Recommendations
          </h3>
          
          <div className="space-y-2">
            {stats.hasCircularDeps && (
              <div className="flex items-center space-x-2 text-sm text-red-600 dark:text-red-400">
                <AlertCircle className="w-4 h-4" />
                <span>Circular dependencies detected - consider refactoring</span>
              </div>
            )}
            
            {stats.isolated > 0 && (
              <div className="flex items-center space-x-2 text-sm text-orange-600 dark:text-orange-400">
                <AlertCircle className="w-4 h-4" />
                <span>{stats.isolated} isolated functions found - may be unused</span>
              </div>
            )}
            
            {stats.complex > 0 && (
              <div className="flex items-center space-x-2 text-sm text-yellow-600 dark:text-yellow-400">
                <AlertCircle className="w-4 h-4" />
                <span>{stats.complex} functions have high complexity - consider simplifying</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* File Metadata */}
      {metadata && (
        <div className="border-t border-gray-200 dark:border-gray-700 pt-4 mt-4">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3">
            File Information
          </h3>
          
          <div className="grid grid-cols-2 gap-4 text-sm">
            {metadata.fileSize && (
              <div>
                <span className="text-gray-600 dark:text-gray-400">Size:</span>
                <span className="ml-2 font-medium">{Math.round(metadata.fileSize / 1024)} KB</span>
              </div>
            )}
            
            {metadata.imports && (
              <div>
                <span className="text-gray-600 dark:text-gray-400">Imports:</span>
                <span className="ml-2 font-medium">{metadata.imports.length}</span>
              </div>
            )}
            
            {metadata.exports && (
              <div>
                <span className="text-gray-600 dark:text-gray-400">Exports:</span>
                <span className="ml-2 font-medium">{metadata.exports.length}</span>
              </div>
            )}
            
            {metadata.parseTime && (
              <div>
                <span className="text-gray-600 dark:text-gray-400">Parse Time:</span>
                <span className="ml-2 font-medium">{metadata.parseTime}ms</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default StatsPanel;