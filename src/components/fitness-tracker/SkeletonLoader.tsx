/**
 * Skeleton Loader Component
 * 
 * Animated skeleton loaders for premium loading states
 */

import { useEffect, useState } from 'react';

type SkeletonLoaderProps = {
  width?: string | number;
  height?: string | number;
  className?: string;
  variant?: 'text' | 'card' | 'circle';
  count?: number;
};

export function SkeletonLoader({
  width = '100%',
  height = 20,
  className = '',
  variant = 'text',
  count = 1,
}: SkeletonLoaderProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const baseClasses = 'bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 bg-[length:200%_100%] animate-shimmer rounded';
  
  const variantClasses = {
    text: 'h-4',
    card: 'h-24',
    circle: 'rounded-full',
  };

  const style = mounted
    ? {
        width: typeof width === 'number' ? `${width}px` : width,
        height: typeof height === 'number' ? `${height}px` : height,
      }
    : {};

  if (count > 1) {
    return (
      <div className={`space-y-3 ${className}`}>
        {Array.from({ length: count }).map((_, i) => (
          <div
            key={i}
            className={`${baseClasses} ${variantClasses[variant]}`}
            style={variant === 'text' ? {} : style}
          />
        ))}
      </div>
    );
  }

  return (
    <div
      className={`${baseClasses} ${variantClasses[variant]} ${className}`}
      style={style}
    />
  );
}
