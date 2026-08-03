'use client';

/**
 * Loading Spinner Component
 */

import React from 'react';
import { cn } from '@/utils/cn';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  text?: string;
}

const sizeStyles = {
  sm: 'w-4 h-4 border-2',
  md: 'w-8 h-8 border-3',
  lg: 'w-12 h-12 border-4',
  xl: 'w-16 h-16 border-4',
};

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size = 'md',
  className,
  text,
}) => {
  return (
    <div className="flex flex-col items-center justify-center gap-3">
      <div
        className={cn(
          'rounded-full border-primary-200 border-t-primary-600 animate-spin',
          sizeStyles[size],
          className
        )}
        role="status"
        aria-label="Loading"
      />
      {text && <p className="text-sm text-gray-500 dark:text-gray-400">{text}</p>}
    </div>
  );
};

/**
 * Full page loading screen
 */
export const PageLoader: React.FC<{ text?: string }> = ({ text = 'Loading...' }) => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 to-white dark:from-gray-900 dark:to-gray-800">
      <div className="text-center">
        {/* Logo */}
        <div className="text-4xl mb-6 animate-bounce-soft">🌱</div>
        <LoadingSpinner size="lg" />
        <p className="mt-4 text-gray-600 dark:text-gray-400 font-medium">{text}</p>
      </div>
    </div>
  );
};

export default LoadingSpinner;
