/**
 * Daily Alignment Page
 * 
 * Phase 11: Standalone mobile-first page for Daily Alignment.
 * Full viewport experience, no dashboard chrome.
 */

import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Settings } from 'lucide-react';
import { DailyAlignmentPanel } from './DailyAlignmentPanel';
import { useAuth } from '../../contexts/AuthContext';
import { useEffect, useState } from 'react';

export function DailyAlignmentPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <p className="text-gray-600">Please log in to access Daily Alignment</p>
          <button
            onClick={() => navigate('/auth/login')}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  const today = new Date();
  const dateString = today.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50">
      {/* Top Bar - Mobile-First */}
      <div className="sticky top-0 z-40 bg-white/95 backdrop-blur-sm border-b border-gray-200 shadow-sm safe-top">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 sm:py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <button
                onClick={() => navigate('/dashboard')}
                className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors flex-shrink-0 min-w-[44px] min-h-[44px] flex items-center justify-center"
                aria-label="Back to Dashboard"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div className="flex-1 min-w-0">
                <h1 className="text-xl sm:text-2xl font-bold text-gray-900 truncate">
                  Daily Alignment
                </h1>
                <p className="text-xs sm:text-sm text-gray-600 truncate">{dateString}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content - Full Viewport */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 safe-bottom">
        <DailyAlignmentPanel userId={user.id} standalone={true} />
      </div>
    </div>
  );
}

