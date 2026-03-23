/**
 * App Update Banner
 * 
 * In-app update notification banner for PWA users.
 * Shows when a new version is available and allows one-tap updates.
 * Mobile-only: Only shown on mobile devices (< 768px) as replacement for App Store updates.
 */

import { useState, useEffect } from 'react';
import { RefreshCw, X } from 'lucide-react';
import { useAppUpdate } from '../../hooks/useAppUpdate';

export function AppUpdateBanner() {
  const { updateAvailable, updateReady, dismissed, isOnline, applyUpdate, dismissUpdate } = useAppUpdate();
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Mobile-only: Don't show on desktop
  if (!isMobile) return null;

  // Don't render if no update available or dismissed
  if (!updateAvailable || dismissed) return null;

  // Don't show during initial app load or when page is hidden
  if (document.visibilityState === 'hidden') return null;

  // Don't show on auth/login pages
  const isAuthPage = window.location.pathname.startsWith('/auth/') || 
                     window.location.pathname.startsWith('/login') ||
                     window.location.pathname.startsWith('/signup');
  if (isAuthPage) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-[100] safe-bottom">
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg border-t border-blue-500">
        <div className="max-w-7xl mx-auto px-4 py-3 sm:px-6 sm:py-4">
          <div className="flex items-center justify-between gap-4">
            {/* Icon and Message */}
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <div className="flex-shrink-0">
                <RefreshCw size={20} className="text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm sm:text-base font-semibold text-white">
                  A new version of SharedMinds is available
                </p>
                <p className="text-xs sm:text-sm text-blue-100 mt-0.5">
                  Update now for the latest features and fixes
                </p>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 flex-shrink-0">
              {!isOnline && (
                <span className="text-xs text-blue-200 px-2 py-1">
                  Update available when online
                </span>
              )}
              {isOnline && (
                <>
                  <button
                    onClick={dismissUpdate}
                    className="px-3 py-1.5 text-sm font-medium text-white/90 hover:text-white hover:bg-white/10 rounded-lg transition-colors min-h-[36px] sm:min-h-[44px]"
                    aria-label="Dismiss"
                  >
                    Later
                  </button>
                  <button
                    onClick={applyUpdate}
                    disabled={!updateReady && !isOnline}
                    className="px-4 py-1.5 sm:px-6 sm:py-2 text-sm sm:text-base font-semibold bg-white text-blue-600 rounded-lg hover:bg-blue-50 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed min-h-[36px] sm:min-h-[44px] flex items-center justify-center gap-2 shadow-sm"
                    aria-label="Update now"
                  >
                    {updateReady ? (
                      <>
                        <RefreshCw size={16} />
                        Update now
                      </>
                    ) : (
                      'Update now'
                    )}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

