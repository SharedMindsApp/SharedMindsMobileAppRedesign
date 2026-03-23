/**
 * Skeleton Components for Progressive Loading
 * 
 * Provides skeleton placeholders that render immediately while data loads.
 * Critical for perceived performance - users see structure before content.
 */

// Simple className utility
function cn(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(' ');
}

interface SkeletonProps {
  className?: string;
  variant?: 'text' | 'rectangular' | 'circular' | 'card';
  width?: string | number;
  height?: string | number;
  lines?: number;
}

/**
 * Base skeleton with shimmer animation
 */
export function Skeleton({ 
  className, 
  variant = 'rectangular',
  width,
  height,
}: SkeletonProps) {
  const baseClasses = 'animate-pulse bg-gray-200 dark:bg-gray-700 rounded';
  
  const variantClasses = {
    text: 'h-4',
    rectangular: 'h-4 w-full',
    circular: 'rounded-full',
    card: 'h-32 w-full rounded-lg',
  };

  const style: React.CSSProperties = {};
  if (width) style.width = typeof width === 'number' ? `${width}px` : width;
  if (height) style.height = typeof height === 'number' ? `${height}px` : height;

  return (
    <div
      className={cn(baseClasses, variantClasses[variant], className)}
      style={style}
    />
  );
}

/**
 * Multi-line text skeleton
 */
export function SkeletonText({ 
  lines = 3, 
  className,
  lineHeight = 'h-4',
}: { 
  lines?: number; 
  className?: string;
  lineHeight?: string;
}) {
  return (
    <div className={cn('space-y-2', className)}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          variant="text"
          width={i === lines - 1 ? '75%' : '100%'}
          className={lineHeight}
        />
      ))}
    </div>
  );
}

/**
 * Card skeleton for dashboard items
 */
export function SkeletonCard({ className }: { className?: string }) {
  return (
    <div className={cn('bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm border border-gray-200 dark:border-gray-700', className)}>
      <Skeleton variant="rectangular" className="h-6 w-3/4 mb-3" />
      <SkeletonText lines={2} className="mb-2" />
      <Skeleton variant="rectangular" className="h-8 w-1/2" />
    </div>
  );
}

/**
 * Dashboard section skeleton
 */
export function DashboardSkeleton({ sections = 3 }: { sections?: number }) {
  return (
    <div className="space-y-6 p-4 sm:p-6">
      {/* Header skeleton */}
      <div className="space-y-2">
        <Skeleton variant="rectangular" className="h-8 w-1/3" />
        <Skeleton variant="rectangular" className="h-4 w-1/2" />
      </div>
      
      {/* Section skeletons */}
      {Array.from({ length: sections }).map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  );
}

/**
 * Meal planner skeleton
 */
export function MealPlannerSkeleton() {
  return (
    <div className="space-y-4 p-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Skeleton variant="rectangular" className="h-6 w-32" />
        <Skeleton variant="circular" className="h-10 w-10" />
      </div>
      
      {/* Day cards */}
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="bg-white rounded-lg p-4 border border-gray-200">
          <Skeleton variant="rectangular" className="h-5 w-24 mb-3" />
          <div className="space-y-2">
            <Skeleton variant="rectangular" className="h-16 w-full" />
            <Skeleton variant="rectangular" className="h-16 w-full" />
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * List skeleton for recipe/search results
 */
export function ListSkeleton({ items = 5 }: { items?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: items }).map((_, i) => (
        <div key={i} className="flex gap-3 p-3 bg-white rounded-lg border border-gray-200">
          <Skeleton variant="rectangular" className="h-16 w-16 rounded flex-shrink-0" />
          <div className="flex-1 space-y-2">
            <Skeleton variant="rectangular" className="h-5 w-3/4" />
            <Skeleton variant="rectangular" className="h-4 w-1/2" />
            <Skeleton variant="rectangular" className="h-4 w-2/3" />
          </div>
        </div>
      ))}
    </div>
  );
}
