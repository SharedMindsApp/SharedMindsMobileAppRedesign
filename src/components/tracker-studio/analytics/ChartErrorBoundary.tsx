/**
 * Chart Error Boundary Component
 * 
 * Catches errors in chart rendering and displays a user-friendly message.
 */

import { Component, ReactNode } from 'react';
import { AlertCircle } from 'lucide-react';

interface Props {
  children: ReactNode;
  chartName?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ChartErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: any) {
    console.error('Chart error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="bg-white rounded-lg border border-gray-200 p-4 sm:p-6">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <h3 className="text-sm font-semibold text-red-900 mb-1">
                  Chart Error
                </h3>
                <p className="text-red-700 text-sm mb-3">
                  {this.props.chartName 
                    ? `Unable to display ${this.props.chartName}.`
                    : 'Unable to display this chart.'}
                  {this.state.error && (
                    <span className="block mt-1 text-xs">
                      {this.state.error.message}
                    </span>
                  )}
                </p>
                <button
                  onClick={() => this.setState({ hasError: false, error: null })}
                  className="px-3 py-1.5 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-medium"
                >
                  Try Again
                </button>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
