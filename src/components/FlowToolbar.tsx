'use client';

import React, { useState, useCallback } from 'react';
import {
  ZoomIn,
  ZoomOut,
  Maximize,
  RotateCcw,
  Search,
  Filter,
  Download,
  Map,
  Eye,
  EyeOff,
  RefreshCw,
  Settings,
  X,
  ArrowLeft,
  PanelLeftClose,
  PanelLeftOpen
} from 'lucide-react';

interface FlowToolbarProps {
  onZoomIn: () => void;
  onZoomOut: () => void;
  onFitView: () => void;
  onResetLayout: () => void;
  onExportImage: (format: 'png' | 'svg') => void;
  onToggleMinimap: () => void;
  onToggleCodePreview: () => void;
  onToggleLeftSidebar: () => void;
  onLayoutChange: (direction: 'TB' | 'LR' | 'BT' | 'RL') => void;
  onFilterChange: (filters: FilterOptions) => void;
  onSearchChange: (query: string) => void;
  onBackToAnalysis?: () => void;
  showMinimap: boolean;
  showCodePreview: boolean;
  isLeftSidebarVisible: boolean;
  layoutDirection: 'TB' | 'LR' | 'BT' | 'RL';
  filters: FilterOptions;
  isExporting?: boolean;
}

interface FilterOptions {
  showExported: boolean;
  showAsync: boolean;
  showMethods: boolean;
  hideIsolated: boolean;
  minComplexity: number;
  maxComplexity: number;
}

const FlowToolbar: React.FC<FlowToolbarProps> = ({
  onZoomIn,
  onZoomOut,
  onFitView,
  onResetLayout,
  onExportImage,
  onToggleMinimap,
  onToggleCodePreview,
  onToggleLeftSidebar,
  onLayoutChange,
  onFilterChange,
  onSearchChange,
  onBackToAnalysis,
  showMinimap,
  showCodePreview,
  isLeftSidebarVisible,
  layoutDirection,
  filters,
  isExporting = false
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [showLayoutControls, setShowLayoutControls] = useState(false);

  const handleSearchChange = useCallback((query: string) => {
    setSearchQuery(query);
    onSearchChange(query);
  }, [onSearchChange]);

  const handleFilterChange = useCallback((newFilters: Partial<FilterOptions>) => {
    onFilterChange({ ...filters, ...newFilters });
  }, [filters, onFilterChange]);

  const layoutOptions = [
    { value: 'TB', label: 'Top → Bottom', icon: '↓' },
    { value: 'LR', label: 'Left → Right', icon: '→' },
    { value: 'BT', label: 'Bottom → Top', icon: '↑' },
    { value: 'RL', label: 'Right → Left', icon: '←' }
  ] as const;

  return (
    <div className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 p-3">
      <div className="flex items-center justify-between flex-wrap gap-3">
        
        {/* Left Section - Back Button and Zoom Controls */}
        <div className="flex items-center space-x-2">
          {/* Back Button */}
          {onBackToAnalysis && (
            <button
              onClick={onBackToAnalysis}
              className="flex items-center space-x-2 px-3 py-2 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors"
              title="Back to Analysis"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="text-sm font-medium">Back</span>
            </button>
          )}
          
          <div className="flex items-center bg-gray-100 dark:bg-gray-800 rounded-lg overflow-hidden">
            <button
              onClick={onZoomOut}
              className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
              title="Zoom Out"
            >
              <ZoomOut className="w-4 h-4" />
            </button>
            <button
              onClick={onZoomIn}
              className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors border-l border-r border-gray-300 dark:border-gray-600"
              title="Zoom In"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
            <button
              onClick={onFitView}
              className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
              title="Fit to View"
            >
              <Maximize className="w-4 h-4" />
            </button>
          </div>

          <button
            onClick={onResetLayout}
            className="flex items-center space-x-2 px-3 py-2 bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded-lg hover:bg-blue-200 dark:hover:bg-blue-800 transition-colors"
            title="Reset Layout"
          >
            <RefreshCw className="w-4 h-4" />
            <span className="text-sm">Reset</span>
          </button>

          {/* Left Sidebar Toggle */}
          <button
            onClick={onToggleLeftSidebar}
            className="flex items-center space-x-2 px-3 py-2 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
            title={isLeftSidebarVisible ? "Hide Left Panel" : "Show Left Panel"}
          >
            {isLeftSidebarVisible ? (
              <PanelLeftClose className="w-4 h-4" />
            ) : (
              <PanelLeftOpen className="w-4 h-4" />
            )}
            <span className="text-sm">{isLeftSidebarVisible ? "Hide" : "Show"}</span>
          </button>
        </div>

        {/* Center Section - Search */}
        <div className="flex-1 max-w-md mx-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search functions..."
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            {searchQuery && (
              <button
                onClick={() => handleSearchChange('')}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Right Section - Controls and Options */}
        <div className="flex items-center space-x-2">
          
          {/* Layout Direction */}
          <div className="relative">
            <button
              onClick={() => setShowLayoutControls(!showLayoutControls)}
              className={`flex items-center space-x-2 px-3 py-2 rounded-lg transition-colors ${
                showLayoutControls
                  ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
              }`}
              title="Layout Direction"
            >
              <Settings className="w-4 h-4" />
              <span className="text-sm">{layoutDirection}</span>
            </button>
            
            {showLayoutControls && (
              <div className="absolute top-full right-0 mt-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-10 min-w-40">
                {layoutOptions.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => {
                      onLayoutChange(option.value);
                      setShowLayoutControls(false);
                    }}
                    className={`w-full px-3 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 first:rounded-t-lg last:rounded-b-lg flex items-center justify-between ${
                      layoutDirection === option.value
                        ? 'bg-blue-50 dark:bg-blue-900 text-blue-700 dark:text-blue-300'
                        : 'text-gray-700 dark:text-gray-300'
                    }`}
                  >
                    <span>{option.label}</span>
                    <span className="text-lg">{option.icon}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Filters */}
          <div className="relative">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center space-x-2 px-3 py-2 rounded-lg transition-colors ${
                showFilters
                  ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
              }`}
              title="Filters"
            >
              <Filter className="w-4 h-4" />
              <span className="text-sm">Filters</span>
            </button>
            
            {showFilters && (
              <div className="absolute top-full right-0 mt-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-10 p-4 w-64">
                <div className="space-y-3">
                  <h3 className="font-medium text-gray-900 dark:text-gray-100 text-sm">Filter Functions</h3>
                  
                  <div className="space-y-2">
                    <label className="flex items-center space-x-2 text-sm">
                      <input
                        type="checkbox"
                        checked={filters.showExported}
                        onChange={(e) => handleFilterChange({ showExported: e.target.checked })}
                        className="rounded"
                      />
                      <span className="text-gray-700 dark:text-gray-300">Show only exported</span>
                    </label>
                    
                    <label className="flex items-center space-x-2 text-sm">
                      <input
                        type="checkbox"
                        checked={filters.showAsync}
                        onChange={(e) => handleFilterChange({ showAsync: e.target.checked })}
                        className="rounded"
                      />
                      <span className="text-gray-700 dark:text-gray-300">Show only async</span>
                    </label>
                    
                    <label className="flex items-center space-x-2 text-sm">
                      <input
                        type="checkbox"
                        checked={filters.showMethods}
                        onChange={(e) => handleFilterChange({ showMethods: e.target.checked })}
                        className="rounded"
                      />
                      <span className="text-gray-700 dark:text-gray-300">Show only methods</span>
                    </label>
                    
                    <label className="flex items-center space-x-2 text-sm">
                      <input
                        type="checkbox"
                        checked={filters.hideIsolated}
                        onChange={(e) => handleFilterChange({ hideIsolated: e.target.checked })}
                        className="rounded"
                      />
                      <span className="text-gray-700 dark:text-gray-300">Hide isolated nodes</span>
                    </label>
                  </div>
                  
                  <div className="border-t border-gray-200 dark:border-gray-700 pt-3">
                    <label className="block text-sm text-gray-700 dark:text-gray-300 mb-2">
                      Complexity Range: {filters.minComplexity} - {filters.maxComplexity}
                    </label>
                    <div className="space-y-2">
                      <div>
                        <label className="text-xs text-gray-600 dark:text-gray-400">Min:</label>
                        <input
                          type="range"
                          min="1"
                          max="10"
                          value={filters.minComplexity}
                          onChange={(e) => handleFilterChange({ minComplexity: Number(e.target.value) })}
                          className="w-full"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-gray-600 dark:text-gray-400">Max:</label>
                        <input
                          type="range"
                          min="1"
                          max="10"
                          value={filters.maxComplexity}
                          onChange={(e) => handleFilterChange({ maxComplexity: Number(e.target.value) })}
                          className="w-full"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* View Options */}
          <div className="flex items-center space-x-1 bg-gray-100 dark:bg-gray-800 rounded-lg overflow-hidden">
            <button
              onClick={onToggleMinimap}
              className={`p-2 transition-colors ${
                showMinimap
                  ? 'bg-blue-500 text-white'
                  : 'hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300'
              }`}
              title={showMinimap ? 'Hide Minimap' : 'Show Minimap'}
            >
              <Map className="w-4 h-4" />
            </button>
            
            <button
              onClick={onToggleCodePreview}
              className={`p-2 transition-colors ${
                showCodePreview
                  ? 'bg-blue-500 text-white'
                  : 'hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300'
              }`}
              title={showCodePreview ? 'Hide Code Preview' : 'Show Code Preview'}
            >
              {showCodePreview ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>

          {/* Export */}
          <div className="flex items-center space-x-1">
            <button
              onClick={() => onExportImage('png')}
              disabled={isExporting}
              className="flex items-center space-x-2 px-3 py-2 bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 rounded-lg hover:bg-green-200 dark:hover:bg-green-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              title="Export as PNG"
            >
              <Download className="w-4 h-4" />
              <span className="text-sm">PNG</span>
            </button>
            
            <button
              onClick={() => onExportImage('svg')}
              disabled={isExporting}
              className="flex items-center space-x-2 px-3 py-2 bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 rounded-lg hover:bg-green-200 dark:hover:bg-green-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              title="Export as SVG"
            >
              <Download className="w-4 h-4" />
              <span className="text-sm">SVG</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FlowToolbar;