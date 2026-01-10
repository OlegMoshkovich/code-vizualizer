'use client';

import React, { useCallback, useRef, useState, useMemo, useEffect } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  useReactFlow,
  ReactFlowProvider,
  Node,
  Edge,
  ConnectionLineType,
  MarkerType
} from '@xyflow/react';
import html2canvas from 'html2canvas';

import FunctionNode from './FunctionNode';
import SectionHeader from './SectionHeader';
import FlowToolbar from './FlowToolbar';
import NodeDetailsPanel from './NodeDetailsPanel';
import StatsPanel from './StatsPanel';
import LayoutControls from './LayoutControls';

import { layoutNodes, createMatrixLayout } from '../lib/layoutEngine';
import type { GraphData } from '../types';

interface FlowVisualizerProps {
  data: GraphData;
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
  onBackToAnalysis?: () => void;
}

interface FilterOptions {
  showExported: boolean;
  showAsync: boolean;
  showMethods: boolean;
  hideIsolated: boolean;
  minComplexity: number;
  maxComplexity: number;
}

const nodeTypes = {
  function: FunctionNode,
  sectionHeader: SectionHeader,
};

const defaultEdgeOptions = {
  type: 'smoothstep',
  markerEnd: { type: MarkerType.ArrowClosed, width: 20, height: 20 },
  style: { strokeWidth: 2 },
};

// Helper function to apply the correct layout based on type
const applyLayoutByType = (
  nodes: Node[], 
  edges: Edge[], 
  layoutType: 'dagre' | 'force' | 'circular' | 'grid',
  layoutDirection: 'TB' | 'LR' | 'BT' | 'RL',
  spacing: { nodeSpacing: number; rankSeparation: number; edgeSeparation: number }
): Node[] => {
  switch (layoutType) {
    case 'grid':
      return createMatrixLayout(nodes, edges, 5); // 5 columns per row
    case 'dagre':
    default:
      return layoutNodes(nodes, edges, {
        direction: layoutDirection,
        nodeWidth: spacing.nodeSpacing,
        nodeHeight: 80,
        rankSep: spacing.rankSeparation,
        nodeSep: spacing.nodeSpacing,
      });
  }
};

const FlowVisualizerContent: React.FC<FlowVisualizerProps> = ({ data, metadata, onBackToAnalysis }) => {
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const { fitView, getViewport, setViewport } = useReactFlow();
  
  // State management
  const [nodes, setNodes, onNodesChange] = useNodesState([] as Node[]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([] as Edge[]);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [highlightedNodes, setHighlightedNodes] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showMinimap, setShowMinimap] = useState(true);
  const [showCodePreview, setShowCodePreview] = useState(false);
  const [showDetailsPanel, setShowDetailsPanel] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  
  // Layout state
  const [layoutDirection, setLayoutDirection] = useState<'TB' | 'LR' | 'BT' | 'RL'>('TB');
  const [layoutType, setLayoutType] = useState<'dagre' | 'force' | 'circular' | 'grid'>('grid');
  const [spacing, setSpacing] = useState({
    nodeSpacing: 100,
    rankSeparation: 150,
    edgeSeparation: 20,
  });
  const [autoLayout, setAutoLayout] = useState(true);
  
  // Filter state
  const [filters, setFilters] = useState<FilterOptions>({
    showExported: false,
    showAsync: false,
    showMethods: false,
    hideIsolated: false,
    minComplexity: 1,
    maxComplexity: 10,
  });

  // Initialize nodes and edges
  useEffect(() => {
    if (data.nodes && data.edges) {
      // Apply layout to initial data
      const layoutedNodes = applyLayoutByType(data.nodes, data.edges, layoutType, layoutDirection, spacing);
      
      setNodes(layoutedNodes);
      setEdges(data.edges);
      
      // Fit view after a short delay
      setTimeout(() => {
        fitView({ duration: 800 });
      }, 100);
    }
  }, [data, layoutType, layoutDirection, spacing, setNodes, setEdges, fitView]);

  // Apply filters
  const filteredData = useMemo(() => {
    let filteredNodes = nodes;
    let filteredEdges = edges;

    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filteredNodes = filteredNodes.filter(node =>
        (node.data as any).label?.toLowerCase().includes(query)
      );
    }

    // Apply type filters
    if (filters.showExported) {
      filteredNodes = filteredNodes.filter(node => (node.data as any).isExported);
    }
    
    if (filters.showAsync) {
      filteredNodes = filteredNodes.filter(node => (node.data as any).isAsync);
    }
    
    if (filters.showMethods) {
      filteredNodes = filteredNodes.filter(node => (node.data as any).category === 'method');
    }

    // Apply complexity filter
    filteredNodes = filteredNodes.filter(node => {
      const complexity = (node.data as any).complexity || 1;
      return complexity >= filters.minComplexity && complexity <= filters.maxComplexity;
    });

    // Filter edges to only include connections between visible nodes
    const nodeIds = new Set(filteredNodes.map(node => node.id));
    filteredEdges = filteredEdges.filter(edge =>
      nodeIds.has(edge.source) && nodeIds.has(edge.target)
    );

    // Hide isolated nodes if requested
    if (filters.hideIsolated) {
      const connectedNodeIds = new Set([
        ...filteredEdges.map(edge => edge.source),
        ...filteredEdges.map(edge => edge.target),
      ]);
      filteredNodes = filteredNodes.filter(node => connectedNodeIds.has(node.id));
    }

    return { nodes: filteredNodes, edges: filteredEdges };
  }, [nodes, edges, searchQuery, filters]);

  // Apply highlighting
  const displayData = useMemo(() => {
    const highlightedSet = new Set(highlightedNodes);
    
    const highlightedNodesData = filteredData.nodes.map(node => ({
      ...node,
      style: {
        ...node.style,
        opacity: highlightedNodes.length > 0 ? (highlightedSet.has(node.id) ? 1 : 0.3) : 1,
      },
    }));

    const highlightedEdgesData = filteredData.edges.map(edge => ({
      ...edge,
      style: {
        ...edge.style,
        opacity: highlightedNodes.length > 0 ? 
          (highlightedSet.has(edge.source) || highlightedSet.has(edge.target) ? 1 : 0.2) : 1,
      },
    }));

    return { nodes: highlightedNodesData, edges: highlightedEdgesData };
  }, [filteredData, highlightedNodes]);

  // Event handlers
  const handleNodeClick = useCallback((event: React.MouseEvent, node: Node) => {
    setSelectedNode(node);
    setShowDetailsPanel(true);
    // Automatically switch to code tab if the node has source code available
    setShowCodePreview((node.data as any)?.codePreview ? true : false);
  }, []);

  const handlePaneClick = useCallback(() => {
    setSelectedNode(null);
    setShowDetailsPanel(false);
    setHighlightedNodes([]);
  }, []);

  const handleHighlightConnections = useCallback((nodeId: string) => {
    const connectedNodes = new Set([nodeId]);
    
    // Add directly connected nodes
    edges.forEach(edge => {
      if (edge.source === nodeId) connectedNodes.add(edge.target);
      if (edge.target === nodeId) connectedNodes.add(edge.source);
    });
    
    setHighlightedNodes(Array.from(connectedNodes));
  }, [edges]);

  const handleNavigateToNode = useCallback((nodeId: string) => {
    const node = nodes.find(n => n.id === nodeId);
    if (node) {
      setSelectedNode(node);
      setViewport({ x: -node.position.x + 400, y: -node.position.y + 300, zoom: 1 });
    }
  }, [nodes, setViewport]);

  const handleZoomIn = useCallback(() => {
    const viewport = getViewport();
    setViewport({ ...viewport, zoom: Math.min(viewport.zoom * 1.2, 2) });
  }, [getViewport, setViewport]);

  const handleZoomOut = useCallback(() => {
    const viewport = getViewport();
    setViewport({ ...viewport, zoom: Math.max(viewport.zoom / 1.2, 0.1) });
  }, [getViewport, setViewport]);

  const handleFitView = useCallback(() => {
    fitView({ duration: 800, padding: 0.1 });
  }, [fitView]);

  const handleResetLayout = useCallback(() => {
    if (autoLayout) {
      const layoutedNodes = applyLayoutByType(nodes, edges, layoutType, layoutDirection, spacing);
      setNodes(layoutedNodes);
      setTimeout(() => fitView({ duration: 800 }), 100);
    }
  }, [nodes, edges, layoutType, layoutDirection, spacing, autoLayout, setNodes, fitView]);

  const handleApplyLayout = useCallback(() => {
    const layoutedNodes = applyLayoutByType(nodes, edges, layoutType, layoutDirection, spacing);
    setNodes(layoutedNodes);
    setTimeout(() => fitView({ duration: 800 }), 100);
  }, [nodes, edges, layoutType, layoutDirection, spacing, setNodes, fitView]);

  const handleExportImage = useCallback(async (format: 'png' | 'svg') => {
    if (!reactFlowWrapper.current) return;
    
    setIsExporting(true);
    try {
      if (format === 'png') {
        const canvas = await html2canvas(reactFlowWrapper.current, {
          backgroundColor: '#ffffff',
          scale: 2,
          useCORS: true,
        });
        
        const link = document.createElement('a');
        link.download = `function-graph-${Date.now()}.png`;
        link.href = canvas.toDataURL();
        link.click();
      }
      // SVG export would need additional implementation
    } catch (error) {
      console.error('Export failed:', error);
    } finally {
      setIsExporting(false);
    }
  }, []);

  return (
    <div className="h-screen bg-gray-50 dark:bg-gray-900">
      {/* Toolbar */}
      <FlowToolbar
        onZoomIn={handleZoomIn}
        onZoomOut={handleZoomOut}
        onFitView={handleFitView}
        onResetLayout={handleResetLayout}
        onExportImage={handleExportImage}
        onToggleMinimap={() => setShowMinimap(!showMinimap)}
        onToggleCodePreview={() => setShowCodePreview(!showCodePreview)}
        onLayoutChange={setLayoutDirection}
        onFilterChange={setFilters}
        onSearchChange={setSearchQuery}
        onBackToAnalysis={onBackToAnalysis}
        showMinimap={showMinimap}
        showCodePreview={showCodePreview}
        layoutDirection={layoutDirection}
        filters={filters}
        isExporting={isExporting}
      />

      <div className="flex h-full">
        {/* Left Sidebar - Controls and Stats */}
        <div className="w-80 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 overflow-y-auto">
          <div className="p-4 space-y-6">
            {/* Stats Panel */}
            <StatsPanel
              nodes={nodes}
              edges={edges}
              metadata={metadata}
              onHighlightNodes={setHighlightedNodes}
            />
            
            {/* Layout Controls */}
            <LayoutControls
              layoutType={layoutType}
              layoutDirection={layoutDirection}
              spacing={spacing}
              autoLayout={autoLayout}
              onLayoutTypeChange={setLayoutType}
              onLayoutDirectionChange={setLayoutDirection}
              onSpacingChange={setSpacing}
              onAutoLayoutToggle={setAutoLayout}
              onResetLayout={handleResetLayout}
              onApplyLayout={handleApplyLayout}
            />
          </div>
        </div>

        {/* Main Flow Area */}
        <div className="flex-1 relative" ref={reactFlowWrapper}>
          <ReactFlow
            nodes={displayData.nodes}
            edges={displayData.edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onNodeClick={handleNodeClick}
            onPaneClick={handlePaneClick}
            nodeTypes={nodeTypes}
            defaultEdgeOptions={defaultEdgeOptions}
            connectionLineType={ConnectionLineType.SmoothStep}
            fitView
            attributionPosition="bottom-left"
            className="bg-gray-50 dark:bg-gray-900"
          >
            <Background 
              color="#e2e8f0"
              size={2}
              gap={20}
              variant={"dots" as any}
            />
            
            <Controls 
              position="bottom-right"
              showInteractive={false}
              className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-lg"
            />
            
            {showMinimap && (
              <>
                <MiniMap
                  position="top-right"
                  className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg cursor-pointer hover:shadow-xl transition-shadow"
                  maskColor="rgba(59, 130, 246, 0.15)"
                  zoomable={true}
                  pannable={true}
                  nodeColor={(node) => {
                    // Color-code nodes by type for better navigation
                    const data = node.data as any;
                    if (data.isHeader) return 'transparent'; // Hide section headers in minimap
                    if (data.isAsync) return '#8b5cf6'; // Purple for async
                    if (data.isExported) return '#10b981'; // Green for exported
                    if (data.category === 'method') return '#3b82f6'; // Blue for methods
                    if (data.label && data.label.includes('useCallback')) return '#f59e0b'; // Orange for useCallback
                    if (data.label && data.label.includes('useEffect')) return '#ef4444'; // Red for useEffect
                    if (data.label && data.label.includes('onClick')) return '#06b6d4'; // Cyan for JSX handlers
                    return '#6b7280'; // Gray for regular functions
                  }}
                  nodeStrokeWidth={1}
                  nodeStrokeColor={(node) => {
                    // Add stroke for better visibility
                    const data = node.data as any;
                    if (data.isHeader) return 'transparent';
                    return '#ffffff';
                  }}
                  style={{
                    background: 'rgba(255, 255, 255, 0.95)',
                    border: '2px solid #e5e7eb',
                    borderRadius: '8px',
                    boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
                  }}
                />
                
                {/* Minimap Color Legend */}
                <div 
                  className="fixed top-4 right-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg text-xs z-20 pointer-events-none"
                  style={{ marginTop: '240px' }}
                >
                  <div className="p-2">
                    <div className="font-medium text-gray-700 dark:text-gray-300 mb-2">Function Types:</div>
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2">
                        <div className="w-3 h-3 rounded" style={{ backgroundColor: '#10b981' }}></div>
                        <span className="text-gray-600 dark:text-gray-400">Exported</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <div className="w-3 h-3 rounded" style={{ backgroundColor: '#8b5cf6' }}></div>
                        <span className="text-gray-600 dark:text-gray-400">Async</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <div className="w-3 h-3 rounded" style={{ backgroundColor: '#3b82f6' }}></div>
                        <span className="text-gray-600 dark:text-gray-400">Methods</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <div className="w-3 h-3 rounded" style={{ backgroundColor: '#f59e0b' }}></div>
                        <span className="text-gray-600 dark:text-gray-400">useCallback</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <div className="w-3 h-3 rounded" style={{ backgroundColor: '#ef4444' }}></div>
                        <span className="text-gray-600 dark:text-gray-400">useEffect</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <div className="w-3 h-3 rounded" style={{ backgroundColor: '#06b6d4' }}></div>
                        <span className="text-gray-600 dark:text-gray-400">JSX Handlers</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <div className="w-3 h-3 rounded" style={{ backgroundColor: '#6b7280' }}></div>
                        <span className="text-gray-600 dark:text-gray-400">Regular</span>
                      </div>
                    </div>
                  </div>
                </div>
              </>
            )}
          </ReactFlow>

          {/* Loading overlay */}
          {isExporting && (
            <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-xl">
                <div className="flex items-center space-x-3">
                  <div className="animate-spin h-6 w-6 border-2 border-blue-500 border-t-transparent rounded-full"></div>
                  <span className="text-gray-900 dark:text-gray-100">Exporting image...</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right Sidebar - Node Details */}
        {showDetailsPanel && selectedNode && (
          <NodeDetailsPanel
            selectedNode={selectedNode}
            onClose={() => setShowDetailsPanel(false)}
            onHighlightConnections={handleHighlightConnections}
            onNavigateToNode={handleNavigateToNode}
            allNodes={nodes}
            allEdges={edges}
          />
        )}
      </div>
    </div>
  );
};

// Main component with ReactFlowProvider
const FlowVisualizer: React.FC<FlowVisualizerProps> = (props) => {
  return (
    <ReactFlowProvider>
      <FlowVisualizerContent {...props} />
    </ReactFlowProvider>
  );
};

export default FlowVisualizer;