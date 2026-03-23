/**
 * Error Indicator
 * 
 * Visual indicator showing recent errors in the app.
 * Appears at the top of the screen when errors are present.
 */

import { useState, useEffect } from 'react';
import { AlertCircle, X, Bug } from 'lucide-react';
import { getRecentErrors, getErrorCounts, type ErrorLog } from '../../lib/errorLogger';
import { DebugPanel } from './DebugPanel';

const ERROR_THRESHOLD = 3; // Show indicator if 3+ errors in last hour
const RECENT_TIME_WINDOW = 60 * 60 * 1000; // 1 hour

export function ErrorIndicator() {
  const [errorCount, setErrorCount] = useState(0);
  const [showPanel, setShowPanel] = useState(false);
  const [shouldShow, setShouldShow] = useState(false);

  useEffect(() => {
    const checkErrors = () => {
      const errors = getRecentErrors(10);
      const recentErrors = errors.filter(
        error => Date.now() - error.timestamp < RECENT_TIME_WINDOW
      );
      const counts = getErrorCounts();
      
      setErrorCount(recentErrors.length);
      setShouldShow(recentErrors.length >= ERROR_THRESHOLD || counts.error > 0);
    };

    checkErrors();
    const interval = setInterval(checkErrors, 5000); // Check every 5 seconds
    return () => clearInterval(interval);
  }, []);

  if (!shouldShow) return null;

  return (
    <>
      <div className="fixed top-0 left-0 right-0 z-[999] bg-red-600 text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 py-2 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <AlertCircle size={20} className="flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold truncate">
                {errorCount > 0 
                  ? `${errorCount} recent error${errorCount !== 1 ? 's' : ''} detected`
                  : 'Errors detected'
                }
              </p>
              <p className="text-xs text-red-100">
                Tap to view details
              </p>
            </div>
          </div>
          <button
            onClick={() => setShowPanel(true)}
            className="flex items-center gap-2 px-3 py-1.5 bg-white/20 hover:bg-white/30 rounded-lg transition-colors text-sm font-medium min-h-[36px] sm:min-h-[44px] whitespace-nowrap"
            aria-label="View debug panel"
          >
            <Bug size={16} />
            Debug
          </button>
        </div>
      </div>
      
      <DebugPanel isOpen={showPanel} onClose={() => setShowPanel(false)} />
    </>
  );
}

