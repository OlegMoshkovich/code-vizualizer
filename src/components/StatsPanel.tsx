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
  Award,
  Clipboard
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

// Helper functions for advanced analysis
const findDuplicateNames = (nodes: Node[]) => {
  const nameCount: Record<string, Node[]> = {};
  nodes.forEach(node => {
    const name = (node.data as any).label || '';
    const cleanName = name.split('(')[0].trim(); // Remove parameters from name
    if (!nameCount[cleanName]) nameCount[cleanName] = [];
    nameCount[cleanName].push(node);
  });
  
  return Object.entries(nameCount)
    .filter(([, nodesList]) => nodesList.length > 1)
    .map(([name, nodesList]) => ({ name, count: nodesList.length, nodes: nodesList }));
};

const findSimilarFunctions = (nodes: Node[]) => {
  const similarGroups: Array<{ similarity: number; nodes: Node[] }> = [];
  
  for (let i = 0; i < nodes.length; i++) {
    for (let j = i + 1; j < nodes.length; j++) {
      const node1 = nodes[i];
      const node2 = nodes[j];
      
      const params1 = (node1.data as any).parameters || [];
      const params2 = (node2.data as any).parameters || [];
      const name1 = (node1.data as any).label || '';
      const name2 = (node2.data as any).label || '';
      
      // Check parameter similarity
      const paramSimilarity = calculateParameterSimilarity(params1, params2);
      const nameSimilarity = calculateNameSimilarity(name1, name2);
      
      const overallSimilarity = (paramSimilarity + nameSimilarity) / 2;
      
      if (overallSimilarity > 0.7) {
        similarGroups.push({ similarity: overallSimilarity, nodes: [node1, node2] });
      }
    }
  }
  
  return similarGroups;
};

const calculateParameterSimilarity = (params1: any[], params2: any[]) => {
  if (params1.length === 0 && params2.length === 0) return 1;
  if (params1.length === 0 || params2.length === 0) return 0;
  
  const maxLength = Math.max(params1.length, params2.length);
  const minLength = Math.min(params1.length, params2.length);
  
  // Basic similarity based on parameter count and types
  const lengthSimilarity = minLength / maxLength;
  
  let typeSimilarity = 0;
  for (let i = 0; i < minLength; i++) {
    if (params1[i]?.type === params2[i]?.type) {
      typeSimilarity += 1;
    }
  }
  typeSimilarity /= minLength;
  
  return (lengthSimilarity + typeSimilarity) / 2;
};

const calculateNameSimilarity = (name1: string, name2: string) => {
  // Simple string similarity using longest common subsequence
  const lcs = (s1: string, s2: string): number => {
    const dp: number[][] = Array(s1.length + 1).fill(null).map(() => Array(s2.length + 1).fill(0));
    
    for (let i = 1; i <= s1.length; i++) {
      for (let j = 1; j <= s2.length; j++) {
        if (s1[i - 1] === s2[j - 1]) {
          dp[i][j] = dp[i - 1][j - 1] + 1;
        } else {
          dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
        }
      }
    }
    return dp[s1.length][s2.length];
  };
  
  const maxLength = Math.max(name1.length, name2.length);
  return maxLength > 0 ? lcs(name1, name2) / maxLength : 0;
};

const calculateEfficiencyScore = (metrics: {
  totalFunctions: number;
  isolated: number;
  complex: number;
  duplicates: number;
  longParams: number;
  deepNested: number;
  deadCode: number;
}) => {
  if (metrics.totalFunctions === 0) return 100;
  
  let score = 100;
  
  // Deduct points for various issues
  score -= (metrics.isolated / metrics.totalFunctions) * 20; // Isolated functions
  score -= (metrics.complex / metrics.totalFunctions) * 15; // Complex functions
  score -= (metrics.duplicates / metrics.totalFunctions) * 25; // Duplicate names
  score -= (metrics.longParams / metrics.totalFunctions) * 10; // Long parameter lists
  score -= (metrics.deepNested / metrics.totalFunctions) * 15; // Deeply nested functions
  score -= (metrics.deadCode / metrics.totalFunctions) * 30; // Dead code
  
  return Math.max(0, Math.round(score));
};

// Generate Claude Code prompts for fixing issues
const generateClaudePrompts = (stats: any, nodes: Node[], edges: Edge[]) => {
  const prompts: Array<{ title: string; prompt: string; priority: 'high' | 'medium' | 'low' }> = [];

  // Dead code removal with improved detection
  if (stats.potentialDeadCode > 0) {
    const deadCodeFunctions = nodes
      .filter(node => {
        const isIsolated = !edges.some(edge => edge.source === node.id || edge.target === node.id);
        const isExported = (node.data as any).isExported;
        const label = (node.data as any).label || '';
        const functionName = label.split('(')[0].trim();
        
        // Use the same improved logic as in stats calculation
        if (isExported) return false;
        
        const isEntryPoint = /^(main|index|App|_app|_document)$/i.test(functionName) ||
                            label.includes('main') || label.includes('index') || label.includes('App');
        if (isEntryPoint) return false;
        
        const isReactHook = /^use[A-Z]/.test(functionName) || label.includes('(useCallback)') || 
                           label.includes('(useEffect)') || label.includes('(useMemo)');
        if (isReactHook) return false;
        
        const isEventHandler = /^(on[A-Z]|handle[A-Z])/.test(functionName) ||
                              functionName.includes('Handler') || functionName.includes('Callback');
        if (isEventHandler) return false;
        
        const isRenderFunction = /^(render[A-Z]|get[A-Z]|create[A-Z])/.test(functionName);
        if (isRenderFunction) return false;
        
        return isIsolated;
      })
      .map(node => (node.data as any).label)
      .join(', ');

    prompts.push({
      title: "Remove Potential Dead Code",
      priority: 'medium', // Reduced from high since detection is more conservative
      prompt: `I have ${stats.potentialDeadCode} functions that appear to be potential dead code after filtering out React hooks, event handlers, and common patterns: ${deadCodeFunctions}. 

Please carefully analyze these functions and determine if they can be safely removed. The analysis has already excluded:
- React hooks (useCallback, useEffect, etc.)
- Event handlers (onClick, onChange, etc.)
- Render functions and component helpers
- Entry points and exported functions
- Common utility functions

Before removing any code, please:

1. Search for dynamic references (string-based calls, reflection)
2. Check if they're used in JSX as event handlers or props
3. Verify they're not imported and used in other files
4. Ensure they're not part of a public API or interface
5. Look for references in comments or documentation

Can you help me safely identify and remove any truly unused functions?`
    });
  }

  // Duplicate function names
  if (stats.duplicateNames.length > 0) {
    const duplicatesList = stats.duplicateNames
      .map((dup: { name: string; count: number }) => `"${dup.name}" (appears ${dup.count} times)`)
      .join(', ');

    prompts.push({
      title: "Fix Duplicate Function Names",
      priority: 'medium',
      prompt: `I have functions with duplicate names that could cause confusion: ${duplicatesList}. Please help me:

1. Analyze each duplicate function to understand their different purposes
2. Rename them with more descriptive, specific names
3. Ensure the new names clearly indicate their functionality
4. Update all call sites to use the new names
5. Add JSDoc comments to clarify their purposes

Can you help me resolve these naming conflicts?`
    });
  }

  // Long parameter lists
  if (stats.longParameterFunctions > 0) {
    prompts.push({
      title: "Refactor Long Parameter Lists",
      priority: 'medium',
      prompt: `I have ${stats.longParameterFunctions} functions with more than 5 parameters, which makes them hard to use and test. Please help me refactor these functions by:

1. Identifying functions with long parameter lists
2. Grouping related parameters into configuration objects
3. Using the options pattern or builder pattern where appropriate
4. Creating interfaces/types for the parameter objects
5. Updating all call sites to use the new parameter structure

Can you help me refactor these functions to be more maintainable?`
    });
  }

  // High complexity functions
  if (stats.complex > 0) {
    prompts.push({
      title: "Reduce Function Complexity",
      priority: 'high',
      prompt: `I have ${stats.complex} functions with high complexity that should be simplified. Please help me:

1. Identify the most complex functions in my codebase
2. Break them down into smaller, single-responsibility functions
3. Extract reusable logic into utility functions
4. Reduce nested conditionals and loops
5. Apply the Single Responsibility Principle
6. Add clear documentation for the refactored functions

Can you help me refactor these complex functions to improve maintainability?`
    });
  }

  // Circular dependencies
  if (stats.hasCircularDeps) {
    prompts.push({
      title: "Fix Circular Dependencies",
      priority: 'high',
      prompt: `My codebase has circular dependencies which can cause runtime issues and make testing difficult. Please help me:

1. Identify all circular dependency chains in the code
2. Analyze the dependencies to understand the relationships
3. Refactor the code to break the circular dependencies using:
   - Dependency injection
   - Interface segregation
   - Moving shared dependencies to a common module
   - Extracting abstractions
4. Ensure the refactored code maintains the same functionality
5. Add documentation explaining the new architecture

This is critical for code stability. Can you help me resolve these circular dependencies?`
    });
  }

  // Similar functions (refactoring opportunities)
  if (stats.similarFunctions > 0) {
    prompts.push({
      title: "Refactor Similar Functions",
      priority: 'low',
      prompt: `I found ${stats.similarFunctions} sets of similar functions that could potentially be refactored to reduce code duplication. Please help me:

1. Analyze the similar functions to identify common patterns
2. Extract shared logic into reusable utility functions
3. Create generic functions with parameters for variations
4. Use higher-order functions or composition patterns where appropriate
5. Maintain backward compatibility for existing call sites
6. Add comprehensive tests for the refactored code

Can you help me reduce code duplication and improve maintainability?`
    });
  }

  // Overall architecture improvement
  if (stats.efficiencyScore < 70) {
    prompts.push({
      title: "Improve Overall Code Architecture",
      priority: 'medium',
      prompt: `My codebase has an efficiency score of ${stats.efficiencyScore}%, indicating room for architectural improvements. Please help me:

1. Review the overall code organization and structure
2. Identify opportunities for better separation of concerns
3. Suggest design patterns that could improve the architecture
4. Recommend ways to improve code reusability and maintainability
5. Propose a refactoring plan with prioritized steps
6. Suggest coding standards and best practices to follow

Can you provide a comprehensive code quality improvement plan?`
    });
  }

  return prompts.sort((a, b) => {
    const priorityOrder = { high: 3, medium: 2, low: 1 };
    return priorityOrder[b.priority] - priorityOrder[a.priority];
  });
};

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
    
    // Advanced efficiency analysis
    const duplicateNames = findDuplicateNames(nodes);
    const longParameterFunctions = nodes.filter(node => ((node.data as any).parameters?.length || 0) > 5);
    const deeplyNestedFunctions = nodes.filter(node => {
      const complexity = (node.data as any).complexity || 0;
      return complexity > 5;
    });
    
    // Performance analysis
    const syncInAsyncContext = nodes.filter(node => {
      const label = (node.data as any).label || '';
      const isAsync = (node.data as any).isAsync;
      // Check for potential sync operations in async functions
      return isAsync && (label.includes('sync') || label.includes('Sync'));
    });
    
    // Memory efficiency analysis
    const possibleMemoryLeaks = edges.filter(edge => {
      const sourceNode = nodes.find(n => n.id === edge.source);
      const targetNode = nodes.find(n => n.id === edge.target);
      // Look for event listeners that might not be cleaned up
      const sourceLabel = (sourceNode?.data as any)?.label || '';
      const targetLabel = (targetNode?.data as any)?.label || '';
      return sourceLabel.includes('addEventListener') && !targetLabel.includes('removeEventListener');
    });
    
    // Code reuse opportunities
    const similarFunctions = findSimilarFunctions(nodes);
    
    // Improved dead code detection with better heuristics
    const potentialDeadCode = nodes.filter(node => {
      const isIsolated = connectionCounts.find(c => c.nodeId === node.id)?.total === 0;
      const isExported = (node.data as any).isExported;
      const label = (node.data as any).label || '';
      const functionName = label.split('(')[0].trim();
      
      // Skip if exported
      if (isExported) return false;
      
      // Skip entry points
      const isEntryPoint = /^(main|index|App|_app|_document)$/i.test(functionName) ||
                          label.includes('main') || 
                          label.includes('index') ||
                          label.includes('App');
      if (isEntryPoint) return false;
      
      // Skip React hooks (they are used by React internally)
      const isReactHook = /^use[A-Z]/.test(functionName) ||
                         label.includes('(useCallback)') ||
                         label.includes('(useEffect)') ||
                         label.includes('(useMemo)') ||
                         label.includes('(useState)') ||
                         label.includes('(useReducer)') ||
                         label.includes('(useContext)') ||
                         label.includes('(useRef)');
      if (isReactHook) return false;
      
      // Skip event handlers (commonly passed as props/callbacks)
      const isEventHandler = /^(on[A-Z]|handle[A-Z])/.test(functionName) ||
                            functionName.includes('Handler') ||
                            functionName.includes('Callback') ||
                            functionName.includes('onClick') ||
                            functionName.includes('onChange') ||
                            functionName.includes('onSubmit') ||
                            functionName.includes('onLoad');
      if (isEventHandler) return false;
      
      // Skip render functions and component helpers
      const isRenderFunction = /^(render[A-Z]|get[A-Z]|create[A-Z])/.test(functionName) ||
                              functionName.includes('Component') ||
                              functionName.includes('Element') ||
                              label.includes('JSX');
      if (isRenderFunction) return false;
      
      // Skip utility functions commonly used in JSX or as callbacks
      const isUtilityFunction = /^(format|parse|validate|transform|convert|map|filter|reduce)/.test(functionName.toLowerCase());
      if (isUtilityFunction) return false;
      
      // Skip functions that look like they might be used as callbacks
      // (functions with common callback patterns)
      const isLikelyCallback = functionName.length <= 20 && // Short functions often callbacks
                              (/^[a-z]/.test(functionName) || // camelCase functions
                               functionName.includes('_') ||  // snake_case functions
                               /[A-Z]$/.test(functionName));  // functions ending in caps
      if (isLikelyCallback && functionName.length <= 15) return false;
      
      // Skip lifecycle methods and setup functions
      const isLifecycleOrSetup = /^(init|setup|mount|unmount|destroy|cleanup|dispose)/.test(functionName.toLowerCase()) ||
                                functionName.includes('componentDidMount') ||
                                functionName.includes('componentWillUnmount');
      if (isLifecycleOrSetup) return false;
      
      // Skip test functions
      const isTestFunction = /^(test|describe|it|expect|before|after)/.test(functionName.toLowerCase()) ||
                            functionName.includes('Test') ||
                            functionName.includes('Spec');
      if (isTestFunction) return false;
      
      // Skip configuration or constant functions
      const isConfigFunction = /^(config|constant|default|initial)/.test(functionName.toLowerCase()) ||
                              functionName.includes('Config') ||
                              functionName.includes('Constant') ||
                              functionName.includes('Default');
      if (isConfigFunction) return false;
      
      // Only flag as potential dead code if it's truly isolated AND doesn't match common patterns
      return isIsolated;
    });
    
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
      maxCallDepth,
      // Efficiency metrics
      duplicateNames,
      longParameterFunctions: longParameterFunctions.length,
      deeplyNestedFunctions: deeplyNestedFunctions.length,
      syncInAsyncContext: syncInAsyncContext.length,
      possibleMemoryLeaks: possibleMemoryLeaks.length,
      similarFunctions: similarFunctions.length,
      potentialDeadCode: potentialDeadCode.length,
      // Efficiency score (0-100)
      efficiencyScore: calculateEfficiencyScore({
        totalFunctions,
        isolated,
        complex,
        duplicates: duplicateNames.length,
        longParams: longParameterFunctions.length,
        deepNested: deeplyNestedFunctions.length,
        deadCode: potentialDeadCode.length
      })
    };
  }, [nodes, edges]);
  
  // Generate Claude Code prompts based on the analysis
  const claudePrompts = useMemo(() => {
    return generateClaudePrompts(stats, nodes, edges);
  }, [stats, nodes, edges]);
  
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
      blue: 'bg-gray-50 dark:bg-gray-900 text-black dark:text-white border-gray-300 dark:border-gray-600',
      green: 'bg-gray-100 dark:bg-gray-800 text-black dark:text-white border-gray-400 dark:border-gray-500',
      purple: 'bg-white dark:bg-black text-black dark:text-white border-gray-500 dark:border-gray-400',
      orange: 'bg-gray-200 dark:bg-gray-700 text-black dark:text-white border-gray-600 dark:border-gray-300',
      red: 'bg-gray-300 dark:bg-gray-600 text-black dark:text-white border-gray-700 dark:border-gray-200',
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
          <div className="p-2 bg-gray-100 dark:bg-gray-800 rounded-lg">
            <BarChart3 className="w-5 h-5 text-black dark:text-white" />
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
            className="flex items-center space-x-2 px-3 py-2 text-sm text-black dark:text-white hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
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

      {/* Code Efficiency Analysis */}
      <div className="border-t border-gray-200 dark:border-gray-700 pt-4 mb-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
          Code Efficiency Analysis
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
          <StatCard
            title="Efficiency Score"
            value={`${stats.efficiencyScore}%`}
            icon={TrendingUp}
            color={stats.efficiencyScore >= 80 ? 'green' : stats.efficiencyScore >= 60 ? 'orange' : 'red'}
            description="Overall code quality rating"
          />
          
          <StatCard
            title="Duplicate Names"
            value={stats.duplicateNames.length}
            icon={FileText}
            color="orange"
            description="Functions with same names"
            clickable={stats.duplicateNames.length > 0}
            onClick={() => {
              if (stats.duplicateNames.length > 0) {
                const duplicateNodeIds = stats.duplicateNames.flatMap(dup => dup.nodes.map(node => node.id));
                onHighlightNodes(duplicateNodeIds);
              }
            }}
          />
          
          <StatCard
            title="Long Parameter Lists"
            value={stats.longParameterFunctions}
            icon={Users}
            color="orange"
            description="Functions with &gt;5 parameters"
          />
          
          <StatCard
            title="Deeply Nested"
            value={stats.deeplyNestedFunctions}
            icon={GitBranch}
            color="red"
            description="High complexity functions"
          />
          
          <StatCard
            title="Potential Dead Code"
            value={stats.potentialDeadCode}
            icon={AlertCircle}
            color="gray"
            description="Potential unused code (filtered)"
            clickable={stats.potentialDeadCode > 0}
            onClick={() => {
              const deadCodeNodes = nodes
                .filter(node => {
                  const isIsolated = !edges.some(edge => edge.source === node.id || edge.target === node.id);
                  const isExported = (node.data as any).isExported;
                  const label = (node.data as any).label || '';
                  const functionName = label.split('(')[0].trim();
                  
                  // Use the same improved logic
                  if (isExported) return false;
                  
                  const isEntryPoint = /^(main|index|App|_app|_document)$/i.test(functionName) ||
                                      label.includes('main') || label.includes('index') || label.includes('App');
                  if (isEntryPoint) return false;
                  
                  const isReactHook = /^use[A-Z]/.test(functionName) || label.includes('(useCallback)') ||
                                     label.includes('(useEffect)') || label.includes('(useMemo)');
                  if (isReactHook) return false;
                  
                  const isEventHandler = /^(on[A-Z]|handle[A-Z])/.test(functionName) ||
                                        functionName.includes('Handler') || functionName.includes('Callback');
                  if (isEventHandler) return false;
                  
                  const isRenderFunction = /^(render[A-Z]|get[A-Z]|create[A-Z])/.test(functionName);
                  if (isRenderFunction) return false;
                  
                  return isIsolated;
                })
                .map(node => node.id);
              onHighlightNodes(deadCodeNodes);
            }}
          />
          
          <StatCard
            title="Similar Functions"
            value={stats.similarFunctions}
            icon={Target}
            color="purple"
            description="Potential refactoring opportunities"
          />
        </div>
      </div>

      {/* Enhanced Issues & Recommendations */}
      {(stats.hasCircularDeps || stats.isolated > 0 || stats.complex > 0 || 
        stats.duplicateNames.length > 0 || stats.potentialDeadCode > 0 || 
        stats.longParameterFunctions > 0 || stats.similarFunctions > 0) && (
        <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3 flex items-center">
            <AlertCircle className="w-4 h-4 text-orange-500 mr-2" />
            Issues & Recommendations
          </h3>
          
          <div className="space-y-3">
            {/* Critical Issues */}
            {stats.hasCircularDeps && (
              <div className="p-3 bg-gray-300 dark:bg-gray-600 border border-gray-400 dark:border-gray-500 rounded-lg">
                <div className="flex items-start space-x-2 text-sm text-black dark:text-white">
                  <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  <div>
                    <div className="font-medium">Circular Dependencies Detected</div>
                    <div className="text-xs mt-1 text-gray-700 dark:text-gray-300">
                      Critical: This can cause infinite loops and make testing difficult. Consider using dependency injection or refactoring to break cycles.
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            {/* Dead Code Issues */}
            {stats.potentialDeadCode > 0 && (
              <div className="p-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg">
                <div className="flex items-start space-x-2 text-sm text-gray-700 dark:text-gray-300">
                  <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  <div>
                    <div className="font-medium">{stats.potentialDeadCode} Potential Dead Code Functions</div>
                    <div className="text-xs mt-1 text-gray-600 dark:text-gray-400">
                      These functions appear unused after filtering out React hooks, event handlers, and common patterns. Requires manual verification before removal.
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            {/* Duplicate Names */}
            {stats.duplicateNames.length > 0 && (
              <div className="p-3 bg-gray-200 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg">
                <div className="flex items-start space-x-2 text-sm text-orange-700 dark:text-orange-300">
                  <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  <div>
                    <div className="font-medium">{stats.duplicateNames.length} Functions with Duplicate Names</div>
                    <div className="text-xs mt-1 text-gray-700 dark:text-gray-300">
                      This can cause confusion and bugs. Consider using more descriptive names or namespacing.
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            {/* Parameter Issues */}
            {stats.longParameterFunctions > 0 && (
              <div className="p-3 bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg">
                <div className="flex items-start space-x-2 text-sm text-yellow-700 dark:text-yellow-300">
                  <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  <div>
                    <div className="font-medium">{stats.longParameterFunctions} Functions with Long Parameter Lists</div>
                    <div className="text-xs mt-1 text-gray-700 dark:text-gray-300">
                      Functions with &gt;5 parameters are hard to use and test. Consider using objects or the builder pattern.
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            {/* Complexity Issues */}
            {stats.complex > 0 && (
              <div className="p-3 bg-white dark:bg-black border border-gray-400 dark:border-gray-500 rounded-lg">
                <div className="flex items-start space-x-2 text-sm text-purple-700 dark:text-purple-300">
                  <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  <div>
                    <div className="font-medium">{stats.complex} High Complexity Functions</div>
                    <div className="text-xs mt-1 text-gray-700 dark:text-gray-300">
                      Complex functions are harder to understand and maintain. Consider breaking them into smaller functions.
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            {/* Refactoring Opportunities */}
            {stats.similarFunctions > 0 && (
              <div className="p-3 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg">
                <div className="flex items-start space-x-2 text-sm text-blue-700 dark:text-blue-300">
                  <TrendingUp className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  <div>
                    <div className="font-medium">{stats.similarFunctions} Potential Refactoring Opportunities</div>
                    <div className="text-xs mt-1 text-gray-700 dark:text-gray-300">
                      Similar functions detected. Consider extracting common logic to reduce duplication.
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            {/* General Performance */}
            {stats.isolated > 0 && (
              <div className="p-3 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg">
                <div className="flex items-start space-x-2 text-sm text-indigo-700 dark:text-indigo-300">
                  <Clock className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  <div>
                    <div className="font-medium">Code Organization Recommendation</div>
                    <div className="text-xs mt-1 text-gray-700 dark:text-gray-300">
                      {stats.isolated} isolated functions could be grouped into modules or utilities for better organization.
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Claude Code Improvement Prompts */}
      {claudePrompts.length > 0 && (
        <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center">
            <TrendingUp className="w-5 h-5 text-blue-500 mr-2" />
            Claude Code Improvement Prompts
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            Copy these prompts to use with Claude Code for automated code improvements:
          </p>
          
          <div className="space-y-4">
            {claudePrompts.map((prompt, index) => (
              <div key={index} className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center space-x-2">
                    <div className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${
                      prompt.priority === 'high' 
                        ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300'
                        : prompt.priority === 'medium'
                        ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300'
                        : 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300'
                    }`}>
                      {prompt.priority.toUpperCase()} PRIORITY
                    </div>
                    <h4 className="font-medium text-gray-900 dark:text-gray-100">
                      {prompt.title}
                    </h4>
                  </div>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(prompt.prompt);
                      // Could add a toast notification here
                    }}
                    className="flex items-center space-x-1 px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                    title="Copy prompt to clipboard"
                  >
                    <Clipboard className="w-3 h-3" />
                    <span>Copy</span>
                  </button>
                </div>
                
                <div className="bg-white dark:bg-gray-900 rounded p-3 text-sm font-mono text-gray-800 dark:text-gray-200 border border-gray-200 dark:border-gray-700">
                  <pre className="whitespace-pre-wrap">{prompt.prompt}</pre>
                </div>
                
                <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                  💡 Copy this prompt and paste it into Claude Code to get automated assistance with this improvement.
                </div>
              </div>
            ))}
          </div>
          
          {claudePrompts.length > 0 && (
            <div className="mt-6 p-4 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg">
              <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-2 flex items-center">
                <Award className="w-4 h-4 mr-2" />
                How to Use These Prompts
              </h4>
              <div className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
                <p>1. <strong>Copy</strong> the prompt by clicking the "Copy" button</p>
                <p>2. <strong>Open Claude Code</strong> in your terminal or IDE</p>
                <p>3. <strong>Paste the prompt</strong> and let Claude analyze your codebase</p>
                <p>4. <strong>Review and apply</strong> the suggested improvements</p>
                <p>5. <strong>Re-run analysis</strong> to see your improved efficiency score!</p>
              </div>
            </div>
          )}
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