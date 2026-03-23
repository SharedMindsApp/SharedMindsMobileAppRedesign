/**
 * Phase 8: Top-Level Error Boundary for App Shell
 * 
 * Catches chunk load errors, PWA hydration errors, and routing failures.
 * Provides branded error screen with recovery options.
 */

import { Component, ReactNode, ErrorInfo } from 'react';
import { AlertCircle, RefreshCw, RotateCcw } from 'lucide-react';
import { logError } from '../lib/errorLogger';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  errorCode: string | null;
}

export class AppErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorCode: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    // Phase 8: Detect specific error types
    let errorCode = 'UNKNOWN_ERROR';
    
    if (error.message.includes('ChunkLoadError') || error.message.includes('Loading chunk')) {
      errorCode = 'CHUNK_LOAD_ERROR';
    } else if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
      errorCode = 'NETWORK_ERROR';
    } else if (error.message.includes('hydration')) {
      errorCode = 'HYDRATION_ERROR';
    } else if (error.message.includes('service worker') || error.message.includes('ServiceWorker')) {
      errorCode = 'SERVICE_WORKER_ERROR';
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

    // Phase 11: Comprehensive error logging for mobile debugging
    logError(
      `App Error Boundary: ${error.message}`,
      error,
      {
        component: 'AppErrorBoundary',
        action: 'componentDidCatch',
        errorCode: this.state.errorCode || 'UNKNOWN_ERROR',
        componentStack: errorInfo.componentStack,
        userAgent: navigator.userAgent,
        url: window.location.href,
        timestamp: new Date().toISOString(),
      }
    );

    // Phase 8: Developer logging (no user-facing technical details)
    if (import.meta.env.DEV) {
      console.error('[AppErrorBoundary] Error caught:', error);
      console.error('[AppErrorBoundary] Component stack:', errorInfo.componentStack);
    }
  }

  handleRetry = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      errorCode: null,
    });
    window.location.reload();
  };

  handleReset = async () => {
    try {
      // FIXED: Use hardReset utility for comprehensive reset
      const { hardReset } = await import('../lib/hardReset');
      await hardReset({
        clearAuth: false, // Don't clear auth on error boundary reset
        clearLocalStorage: true,
        clearSessionStorage: true,
        clearServiceWorkers: true,
        clearCaches: true,
        redirectTo: undefined, // Reload current page
        reload: true,
      });
    } catch (resetError) {
      console.error('[AppErrorBoundary] Error resetting app:', resetError);
      // If reset fails, still try to reload
      try {
        window.location.reload();
      } catch {
        // Can't do anything more
      }
    }
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="fixed inset-0 bg-gradient-to-br from-red-50 via-rose-50 to-pink-50 flex items-center justify-center p-4 z-50">
          <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-6 text-center">
            <AlertCircle size={48} className="text-red-500 mx-auto mb-4" />
            <h1 className="text-xl font-bold text-gray-900 mb-2">
              Something Went Wrong
            </h1>
            <p className="text-gray-600 mb-2">
              Something went wrong while loading the app.
            </p>
            {this.state.errorCode && (
              <p className="text-xs text-gray-500 mb-2">
                Error code: {this.state.errorCode}
              </p>
            )}
            {this.state.error && (
              <p className="text-xs text-gray-400 mb-6 font-mono break-all px-2">
                {this.state.error.message}
              </p>
            )}
            <div className="flex flex-col gap-3">
              <button
                onClick={this.handleRetry}
                className="px-6 py-3 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors font-medium flex items-center justify-center gap-2"
              >
                <RefreshCw size={18} />
                Retry
              </button>
              <button
                onClick={this.handleReset}
                className="px-6 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium flex items-center justify-center gap-2"
              >
                <RotateCcw size={18} />
                Reset App
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}


