/**
 * Stage 3 Error Boundary
 *
 * Catches and handles all React errors within Stage 3 intervention system.
 * Provides calm, neutral messaging with recovery options.
 *
 * CRITICAL: No stack traces in user view. No telemetry.
 */

import { Component, ReactNode } from 'react';
import { AlertTriangle, ArrowLeft, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallbackRoute?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
  showDetails: boolean;
}

export class Stage3ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      showDetails: false,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    this.setState({
      error,
      errorInfo,
    });

    // Development-only logging
    if (import.meta.env.DEV) {
      console.error('[Stage3ErrorBoundary] Error caught:', error);
      console.error('[Stage3ErrorBoundary] Component stack:', errorInfo.componentStack);
    }
  }

  handleRetry = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      showDetails: false,
    });
  };

  handleGoBack = () => {
    const fallback = this.props.fallbackRoute || '/interventions';
    window.location.href = fallback;
  };

  toggleDetails = () => {
    this.setState((prev) => ({ showDetails: !prev.showDetails }));
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
          <div className="max-w-2xl w-full">
            <div className="bg-white border border-gray-200 rounded-lg p-8">
              <div className="flex items-start gap-4 mb-6">
                <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <AlertTriangle className="w-6 h-6 text-gray-600" />
                </div>
                <div>
                  <h1 className="text-2xl font-semibold text-gray-900 mb-2">
                    This screen couldn't load correctly
                  </h1>
                  <p className="text-gray-600">
                    Nothing has been changed. Your interventions are safe.
                  </p>
                </div>
              </div>

              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-6">
                <p className="text-sm text-gray-700">
                  This is a display issue only. Your data and settings are intact.
                  You can try reloading this screen or go back to continue.
                </p>
              </div>

              <div className="flex gap-3 mb-4">
                <button
                  onClick={this.handleRetry}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <RefreshCw className="w-4 h-4" />
                  Try Again
                </button>
                <button
                  onClick={this.handleGoBack}
                  className="flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Go Back
                </button>
              </div>

              {import.meta.env.DEV && (
                <div className="mt-6 pt-6 border-t border-gray-200">
                  <button
                    onClick={this.toggleDetails}
                    className="text-sm text-gray-500 hover:text-gray-700 underline"
                  >
                    {this.state.showDetails ? 'Hide' : 'Show'} developer details
                  </button>

                  {this.state.showDetails && this.state.error && (
                    <div className="mt-4 p-4 bg-gray-900 rounded-lg">
                      <p className="text-xs text-red-400 font-mono mb-2">
                        {this.state.error.name}: {this.state.error.message}
                      </p>
                      {this.state.error.stack && (
                        <pre className="text-xs text-gray-300 font-mono overflow-auto max-h-64">
                          {this.state.error.stack}
                        </pre>
                      )}
                      {this.state.errorInfo?.componentStack && (
                        <pre className="text-xs text-gray-400 font-mono overflow-auto max-h-64 mt-2">
                          {this.state.errorInfo.componentStack}
                        </pre>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
