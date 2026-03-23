/**
 * Phase 3: Enhanced Error Boundaries
 * 
 * Reusable error boundary component with context-aware recovery UI.
 * Provides granular error isolation for major feature areas.
 */

import { Component, ReactNode, ErrorInfo } from 'react';
import { AlertCircle, RefreshCw, Home, ArrowLeft } from 'lucide-react';
import { logError } from '../../lib/errorLogger';
import { useNavigate } from 'react-router-dom';

export interface ErrorBoundaryProps {
  children: ReactNode;
  /**
   * Context name for error reporting (e.g., "Spaces", "Planner", "MindMesh")
   */
  context?: string;
  /**
   * Custom fallback UI component
   */
  fallback?: (error: Error, errorInfo: ErrorInfo, resetError: () => void) => ReactNode;
  /**
   * Route to navigate to on "Go Back" action
   */
  fallbackRoute?: string;
  /**
   * Custom error message to display
   */
  errorMessage?: string;
  /**
   * Whether to show error details in production
   */
  showDetails?: boolean;
  /**
   * Callback when error is caught
   */
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  /**
   * Callback for retry action
   */
  onRetry?: () => void;
  /**
   * Whether to reset error state on props change
   */
  resetOnPropsChange?: boolean;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  errorCode: string | null;
}

/**
 * Reusable error boundary component with context-aware recovery UI.
 * 
 * @example
 * ```tsx
 * <ErrorBoundary context="Spaces" fallbackRoute="/spaces">
 *   <SpacesOSLauncher {...props} />
 * </ErrorBoundary>
 * ```
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorCode: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    // Detect specific error types
    let errorCode = 'UNKNOWN_ERROR';
    
    if (error.message.includes('ChunkLoadError') || error.message.includes('Loading chunk')) {
      errorCode = 'CHUNK_LOAD_ERROR';
    } else if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
      errorCode = 'NETWORK_ERROR';
    } else if (error.message.includes('hydration')) {
      errorCode = 'HYDRATION_ERROR';
    } else if (error.message.includes('service worker') || error.message.includes('ServiceWorker')) {
      errorCode = 'SERVICE_WORKER_ERROR';
    } else if (error.message.includes('Cannot read property') || error.message.includes('undefined')) {
      errorCode = 'NULL_REFERENCE_ERROR';
    } else if (error.message.includes('Maximum update depth exceeded')) {
      errorCode = 'INFINITE_UPDATE_ERROR';
    }

    return {
      hasError: true,
      error,
      errorCode,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({
      error,
      errorInfo,
    });

    const context = this.props.context || 'Unknown';
    
    // Log error with context
    logError(
      `Error Boundary [${context}]: ${error.message}`,
      error,
      {
        component: 'ErrorBoundary',
        context,
        action: 'componentDidCatch',
        errorCode: this.state.errorCode || 'UNKNOWN_ERROR',
        componentStack: errorInfo.componentStack,
        userAgent: navigator.userAgent,
        url: window.location.href,
        timestamp: new Date().toISOString(),
      }
    );

    // Call custom error handler if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    // Developer logging in development
    if (import.meta.env.DEV) {
      console.error(`[ErrorBoundary:${context}] Error caught:`, error);
      console.error(`[ErrorBoundary:${context}] Component stack:`, errorInfo.componentStack);
    }
  }

  componentDidUpdate(prevProps: ErrorBoundaryProps) {
    // Reset error state if props changed and resetOnPropsChange is true
    if (this.props.resetOnPropsChange && prevProps.children !== this.props.children) {
      if (this.state.hasError) {
        this.resetError();
      }
    }
  }

  resetError = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      errorCode: null,
    });
  };

  handleRetry = () => {
    if (this.props.onRetry) {
      this.props.onRetry();
    }
    this.resetError();
  };

  handleGoBack = () => {
    if (this.props.fallbackRoute) {
      window.location.href = this.props.fallbackRoute;
    } else {
      window.history.back();
    }
  };

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      // Use custom fallback if provided
      if (this.props.fallback && this.state.error && this.state.errorInfo) {
        return this.props.fallback(this.state.error, this.state.errorInfo, this.resetError);
      }

      const context = this.props.context || 'Feature';
      const errorMessage = this.props.errorMessage || `${context} encountered an error.`;
      const showDetails = this.props.showDetails ?? import.meta.env.DEV;

      return (
        <div className="min-h-[60vh] flex items-center justify-center p-4 bg-gradient-to-br from-red-50 via-rose-50 to-pink-50">
          <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-6 text-center">
            <AlertCircle size={48} className="text-red-500 mx-auto mb-4" />
            <h1 className="text-xl font-bold text-gray-900 mb-2">
              {context} Error
            </h1>
            <p className="text-gray-600 mb-2">
              {errorMessage}
            </p>
            {this.state.errorCode && (
              <p className="text-xs text-gray-500 mb-2">
                Error code: {this.state.errorCode}
              </p>
            )}
            {showDetails && this.state.error && (
              <div className="mb-6 p-3 bg-gray-50 rounded-lg text-left">
                <p className="text-xs text-gray-400 font-mono break-all mb-2">
                  {this.state.error.message}
                </p>
                {this.state.errorInfo?.componentStack && (
                  <details className="text-xs text-gray-400 font-mono">
                    <summary className="cursor-pointer mb-2">Component Stack</summary>
                    <pre className="whitespace-pre-wrap break-all text-xs">
                      {this.state.errorInfo.componentStack}
                    </pre>
                  </details>
                )}
              </div>
            )}
            <div className="flex flex-col gap-3">
              <button
                onClick={this.handleRetry}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium flex items-center justify-center gap-2"
              >
                <RefreshCw size={18} />
                Try Again
              </button>
              {this.props.fallbackRoute && (
                <button
                  onClick={this.handleGoBack}
                  className="px-6 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium flex items-center justify-center gap-2"
                >
                  <ArrowLeft size={18} />
                  Go Back
                </button>
              )}
              <button
                onClick={this.handleReload}
                className="px-6 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium"
              >
                Reload Page
              </button>
            </div>
            <div className="mt-6 pt-6 border-t border-gray-200">
              <p className="text-xs text-gray-500">
                If this problem persists, try reloading the page or clearing your browser cache.
              </p>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

/**
 * Hook-based error boundary wrapper for functional components.
 * Note: This is a workaround - React error boundaries must be class components.
 * For functional components, use the ErrorBoundary component directly.
 */
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  errorBoundaryProps?: Omit<ErrorBoundaryProps, 'children'>
) {
  return function WrappedComponent(props: P) {
    return (
      <ErrorBoundary {...errorBoundaryProps}>
        <Component {...props} />
      </ErrorBoundary>
    );
  };
}