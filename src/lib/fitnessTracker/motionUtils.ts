/**
 * Motion Utilities for Fitness Tracker
 * 
 * Consistent animation timing, easing, and motion helpers
 * for premium, subtle micro-interactions
 */

// Animation durations (ms)
export const motion = {
  fast: 150,
  normal: 250,
  slow: 350,
  spring: { type: 'spring', stiffness: 300, damping: 30 },
};

// Easing functions
export const easing = {
  easeOut: 'cubic-bezier(0.16, 1, 0.3, 1)',
  easeInOut: 'cubic-bezier(0.4, 0, 0.2, 1)',
  easeOutCubic: 'cubic-bezier(0.33, 1, 0.68, 1)',
};

// Stagger delays for list animations
export const stagger = {
  container: 50,
  item: 30,
};

// Spring configs for specific interactions
export const springs = {
  card: { type: 'spring', stiffness: 280, damping: 25 },
  modal: { type: 'spring', stiffness: 300, damping: 30 },
  button: { type: 'spring', stiffness: 400, damping: 25 },
  sheet: { type: 'spring', stiffness: 350, damping: 30 },
};

// Transform presets
export const transforms = {
  scaleIn: { scale: 0.96, opacity: 0 },
  scaleOut: { scale: 1.04, opacity: 0 },
  slideUp: { y: 20, opacity: 0 },
  slideDown: { y: -20, opacity: 0 },
  slideLeft: { x: 20, opacity: 0 },
  slideRight: { x: -20, opacity: 0 },
};

// Haptic feedback patterns (if available)
export const haptics = {
  light: 'light',
  medium: 'medium',
  heavy: 'heavy',
  success: 'success',
  warning: 'warning',
  error: 'error',
};

/**
 * Trigger haptic feedback if available
 */
export function triggerHaptic(type: keyof typeof haptics = 'light') {
  if (typeof window !== 'undefined' && 'vibrate' in navigator) {
    const patterns: Record<string, number | number[]> = {
      light: 10,
      medium: 20,
      heavy: 30,
      success: [10, 50, 10],
      warning: [20, 100, 20],
      error: [30, 100, 30, 100, 30],
    };
    navigator.vibrate(patterns[type] || 10);
  }
}

/**
 * Check if user prefers reduced motion
 */
export function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * Get animation config respecting reduced motion
 */
export function getMotionConfig(defaultConfig: any) {
  if (prefersReducedMotion()) {
    return { duration: 0, ease: 'linear' };
  }
  return defaultConfig;
}

/**
 * Parallax offset calculator for depth effects
 */
export function calculateParallax(scrollY: number, speed: number = 0.5): number {
  return scrollY * speed;
}
