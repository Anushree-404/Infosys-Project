'use client';
import React from 'react';

const colorMap: Record<string, string> = {
  ACTIVE: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  INACTIVE: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400',
  FALLOW: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  FAULTY: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  MAINTENANCE: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  GROWING: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  PLANNED: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  HARVESTED: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  FAILED: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
};

interface Props { status: string; size?: 'sm' | 'md'; }

export const StatusBadge: React.FC<Props> = ({ status, size = 'sm' }) => (
  <span className={`inline-flex items-center rounded-full font-medium ${size === 'sm' ? 'text-xs px-2 py-0.5' : 'text-sm px-3 py-1'} ${colorMap[status] ?? 'bg-gray-100 text-gray-600'}`}>
    {status}
  </span>
);
export default StatusBadge;
