'use client';

import React, { useState } from 'react';
import {
  Settings,
  ArrowDown,
  ArrowRight,
  ArrowUp,
  ArrowLeft,
  RotateCcw,
  Grid3x3,
  GitBranch,
  Circle,
  Zap,
  ChevronDown,
  ChevronRight
} from 'lucide-react';

interface LayoutControlsProps {
  layoutType: 'dagre' | 'force' | 'circular' | 'grid';
  layoutDirection: 'TB' | 'LR' | 'BT' | 'RL';
  spacing: {
    nodeSpacing: number;
    rankSeparation: number;
    edgeSeparation: number;
  };
  autoLayout: boolean;
  onLayoutTypeChange: (type: 'dagre' | 'force' | 'circular' | 'grid') => void;
  onLayoutDirectionChange: (direction: 'TB' | 'LR' | 'BT' | 'RL') => void;
  onSpacingChange: (spacing: { nodeSpacing: number; rankSeparation: number; edgeSeparation: number }) => void;
  onAutoLayoutToggle: (enabled: boolean) => void;
  onResetLayout: () => void;
  onApplyLayout: () => void;
}

const LayoutControls: React.FC<LayoutControlsProps> = ({
  layoutType,
  layoutDirection,
  spacing,
  autoLayout,
  onLayoutTypeChange,
  onLayoutDirectionChange,
  onSpacingChange,
  onAutoLayoutToggle,
  onResetLayout,
  onApplyLayout
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const layoutTypes = [
    {
      id: 'dagre',
      label: 'Hierarchical',
      description: 'Organized tree-like structure',
      icon: GitBranch,
      color: 'blue'
    },
    {
      id: 'force',
      label: 'Force-Directed',
      description: 'Organic, physics-based layout',
      icon: Zap,
      color: 'purple'
    },
    {
      id: 'circular',
      label: 'Circular',
      description: 'Nodes arranged in a circle',
      icon: Circle,
      color: 'green'
    },
    {
      id: 'grid',
      label: 'Grid',
      description: 'Regular grid arrangement',
      icon: Grid3x3,
      color: 'orange'
    }
  ] as const;

  const directions = [
    { id: 'TB', label: 'Top → Bottom', icon: ArrowDown },
    { id: 'LR', label: 'Left → Right', icon: ArrowRight },
    { id: 'BT', label: 'Bottom → Top', icon: ArrowUp },
    { id: 'RL', label: 'Right → Left', icon: ArrowLeft }
  ] as const;

  const getColorClasses = (color: string, isSelected: boolean) => {
    const colors = {
      blue: isSelected 
        ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 border-blue-300 dark:border-blue-700'
        : 'hover:bg-blue-50 dark:hover:bg-blue-950 border-gray-200 dark:border-gray-700',
      purple: isSelected
        ? 'bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300 border-purple-300 dark:border-purple-700'
        : 'hover:bg-purple-50 dark:hover:bg-purple-950 border-gray-200 dark:border-gray-700',
      green: isSelected
        ? 'bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 border-green-300 dark:border-green-700'
        : 'hover:bg-green-50 dark:hover:bg-green-950 border-gray-200 dark:border-gray-700',
      orange: isSelected
        ? 'bg-orange-100 dark:bg-orange-900 text-orange-700 dark:text-orange-300 border-orange-300 dark:border-orange-700'
        : 'hover:bg-orange-50 dark:hover:bg-orange-950 border-gray-200 dark:border-gray-700'
    };
    return colors[color as keyof typeof colors] || colors.blue;
  };

  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg">
      
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
            <Settings className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-gray-100">Layout Controls</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">Adjust graph layout and positioning</p>
          </div>
        </div>
        
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
        >
          {isExpanded ? (
            <ChevronDown className="w-4 h-4 text-gray-600 dark:text-gray-400" />
          ) : (
            <ChevronRight className="w-4 h-4 text-gray-600 dark:text-gray-400" />
          )}
        </button>
      </div>

      {isExpanded && (
        <div className="p-4 space-y-6">
          
          {/* Layout Algorithm */}
          <div>
            <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3">
              Layout Algorithm
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {layoutTypes.map((type) => (
                <button
                  key={type.id}
                  onClick={() => onLayoutTypeChange(type.id)}
                  className={`
                    flex items-start space-x-3 p-3 border rounded-lg transition-all duration-200
                    ${getColorClasses(type.color, layoutType === type.id)}
                    ${layoutType === type.id ? 'shadow-sm' : 'hover:shadow-sm'}
                  `}
                >
                  <div className="mt-1">
                    <type.icon className="w-5 h-5" />
                  </div>
                  <div className="text-left flex-1 min-w-0">
                    <div className="font-medium text-sm">{type.label}</div>
                    <div className="text-xs opacity-75 mt-1">{type.description}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Layout Direction (only for dagre) */}
          {layoutType === 'dagre' && (
            <div>
              <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3">
                Direction
              </h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {directions.map((direction) => (
                  <button
                    key={direction.id}
                    onClick={() => onLayoutDirectionChange(direction.id)}
                    className={`
                      flex items-center justify-center space-x-2 p-3 border rounded-lg transition-all duration-200
                      ${layoutDirection === direction.id
                        ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 border-blue-300 dark:border-blue-700'
                        : 'hover:bg-gray-50 dark:hover:bg-gray-800 border-gray-200 dark:border-gray-700'
                      }
                    `}
                  >
                    <direction.icon className="w-4 h-4" />
                    <span className="text-sm font-medium hidden md:inline">
                      {direction.label.split(' → ').join('→')}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Spacing Controls */}
          <div>
            <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-4">
              Spacing & Separation
            </h4>
            <div className="space-y-4">
              
              {/* Node Spacing */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="text-sm text-gray-700 dark:text-gray-300">
                    Node Spacing
                  </label>
                  <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                    {spacing.nodeSpacing}px
                  </span>
                </div>
                <input
                  type="range"
                  min="20"
                  max="200"
                  step="10"
                  value={spacing.nodeSpacing}
                  onChange={(e) => onSpacingChange({
                    ...spacing,
                    nodeSpacing: Number(e.target.value)
                  })}
                  className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer slider"
                />
              </div>

              {/* Rank Separation */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="text-sm text-gray-700 dark:text-gray-300">
                    Rank Separation
                  </label>
                  <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                    {spacing.rankSeparation}px
                  </span>
                </div>
                <input
                  type="range"
                  min="30"
                  max="300"
                  step="15"
                  value={spacing.rankSeparation}
                  onChange={(e) => onSpacingChange({
                    ...spacing,
                    rankSeparation: Number(e.target.value)
                  })}
                  className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer slider"
                />
              </div>

              {/* Edge Separation */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="text-sm text-gray-700 dark:text-gray-300">
                    Edge Separation
                  </label>
                  <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                    {spacing.edgeSeparation}px
                  </span>
                </div>
                <input
                  type="range"
                  min="10"
                  max="100"
                  step="5"
                  value={spacing.edgeSeparation}
                  onChange={(e) => onSpacingChange({
                    ...spacing,
                    edgeSeparation: Number(e.target.value)
                  })}
                  className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer slider"
                />
              </div>
            </div>
          </div>

          {/* Auto Layout Toggle */}
          <div>
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                  Auto Layout
                </h4>
                <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                  Automatically apply layout when graph changes
                </p>
              </div>
              
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={autoLayout}
                  onChange={(e) => onAutoLayoutToggle(e.target.checked)}
                  className="sr-only"
                />
                <div className={`
                  w-11 h-6 rounded-full transition-colors duration-200 ease-in-out
                  ${autoLayout 
                    ? 'bg-blue-600 dark:bg-blue-500' 
                    : 'bg-gray-300 dark:bg-gray-600'
                  }
                `}>
                  <div className={`
                    w-5 h-5 bg-white rounded-full shadow-md transform transition-transform duration-200 ease-in-out
                    ${autoLayout ? 'translate-x-5' : 'translate-x-0.5'}
                  `} style={{ marginTop: '2px' }} />
                </div>
              </label>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
            <div className="flex items-center space-x-3">
              <button
                onClick={onApplyLayout}
                className="flex-1 flex items-center justify-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <GitBranch className="w-4 h-4" />
                <span>Apply Layout</span>
              </button>
              
              <button
                onClick={onResetLayout}
                className="flex items-center justify-center space-x-2 px-4 py-2 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Reset</span>
              </button>
            </div>
          </div>

          {/* Presets */}
          <div>
            <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3">
              Quick Presets
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              <button
                onClick={() => {
                  onLayoutTypeChange('dagre');
                  onLayoutDirectionChange('TB');
                  onSpacingChange({ nodeSpacing: 100, rankSeparation: 150, edgeSeparation: 20 });
                }}
                className="px-3 py-2 text-sm bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
              >
                Compact Vertical
              </button>
              
              <button
                onClick={() => {
                  onLayoutTypeChange('dagre');
                  onLayoutDirectionChange('LR');
                  onSpacingChange({ nodeSpacing: 150, rankSeparation: 200, edgeSeparation: 30 });
                }}
                className="px-3 py-2 text-sm bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
              >
                Wide Horizontal
              </button>
              
              <button
                onClick={() => {
                  onLayoutTypeChange('force');
                  onSpacingChange({ nodeSpacing: 80, rankSeparation: 100, edgeSeparation: 15 });
                }}
                className="px-3 py-2 text-sm bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
              >
                Organic Flow
              </button>
              
              <button
                onClick={() => {
                  onLayoutTypeChange('circular');
                  onSpacingChange({ nodeSpacing: 120, rankSeparation: 180, edgeSeparation: 25 });
                }}
                className="px-3 py-2 text-sm bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
              >
                Circular View
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LayoutControls;