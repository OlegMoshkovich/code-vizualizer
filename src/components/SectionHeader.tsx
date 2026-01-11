'use client';

import React from 'react';
import { NodeProps } from '@xyflow/react';

interface SectionHeaderData extends Record<string, unknown> {
  label: string;
  type: string;
  count: number;
  isHeader: boolean;
}

interface SectionHeaderProps extends NodeProps {
  data: SectionHeaderData;
}

const SectionHeader: React.FC<SectionHeaderProps> = ({ data }) => {
  const { label, count } = data;

  return (
    <div className="w-full py-2 px-4 bg-transparent pointer-events-none">
      <div className="flex items-center justify-between border-b-2 border-gray-300 dark:border-gray-600 pb-2">
        <h3 className="text-lg font-bold text-gray-800 dark:text-gray-200 tracking-wide">
          {label}
        </h3>
        <span className="px-3 py-1 text-sm font-medium bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded-full">
          {count} function{count !== 1 ? 's' : ''}
        </span>
      </div>
    </div>
  );
};

export default SectionHeader;