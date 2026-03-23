/**
 * PlannerQuickViewDrawer - Mobile Quick View Panel
 * 
 * Right-side drawer panel for mobile that shows Updates and Analytics
 * (same content as desktop sidecar, optimized for mobile)
 */

import { useState, useEffect, useRef } from 'react';
import { X, Target, Activity, Calendar, TrendingUp, BarChart3, Bell, CheckCircle2, Clock } from 'lucide-react';

interface PlannerQuickViewDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  activeTab?: 'notifications' | 'analytics';
}

export function PlannerQuickViewDrawer({
  isOpen,
  onClose,
  activeTab: initialTab = 'notifications',
}: PlannerQuickViewDrawerProps) {
  const [activeTab, setActiveTab] = useState<'notifications' | 'analytics'>(initialTab);
  const drawerRef = useRef<HTMLDivElement>(null);

  // Handle swipe to close
  const [swipeStart, setSwipeStart] = useState<number | null>(null);
  const [swipeOffset, setSwipeOffset] = useState(0);

  // Update tab when prop changes
  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

  const handleTouchStart = (e: React.TouchEvent) => {
    setSwipeStart(e.touches[0].clientX);
    setSwipeOffset(0);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (swipeStart === null) return;
    const currentX = e.touches[0].clientX;
    const deltaX = currentX - swipeStart;

    // Only allow swipe right (to close)
    if (deltaX > 0) {
      setSwipeOffset(deltaX);
    }
  };

  const handleTouchEnd = () => {
    if (swipeStart === null) return;
    const swipeDistance = swipeOffset;
    setSwipeStart(null);
    setSwipeOffset(0);

    if (swipeDistance > 50) {
      // If swiped more than 50px, close
      onClose();
    }
  };

  // Prevent body scroll when drawer is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  // Keyboard accessibility (Escape key to close)
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  return (
    <div
      className={`
        fixed inset-0 bg-black/40 z-40 md:hidden
        transition-opacity duration-300 ease-out
        ${isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}
      `}
      onClick={onClose}
    >
      <div
        ref={drawerRef}
        className={`
          fixed top-0 right-0 h-full w-[85vw] max-w-sm
          bg-white shadow-2xl z-50
          flex flex-col
          md:hidden
          transition-transform duration-300 ease-out
          safe-top safe-bottom
        `}
        style={{
          transform: isOpen
            ? `translateX(${Math.max(0, swipeOffset)}px)`
            : 'translateX(100%)',
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        role="dialog"
        aria-modal="true"
        aria-label="Quick View"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Quick View</h2>
          <button
            onClick={onClose}
            className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg hover:bg-gray-100 active:bg-gray-200 transition-colors"
            aria-label="Close"
          >
            <X size={20} className="text-gray-700" />
          </button>
        </div>

        {/* Tab Header */}
        <div className="flex border-b border-gray-200 bg-white/40 backdrop-blur-sm">
          <button
            onClick={() => setActiveTab('notifications')}
            className={`flex-1 px-4 py-3 text-xs font-semibold transition-colors flex items-center justify-center gap-2 min-h-[44px] ${
              activeTab === 'notifications'
                ? 'text-blue-600 bg-blue-50/50 border-b-2 border-blue-600'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50/50'
            }`}
          >
            <Bell className="w-3.5 h-3.5" />
            <span>Updates</span>
          </button>
          <button
            onClick={() => setActiveTab('analytics')}
            className={`flex-1 px-4 py-3 text-xs font-semibold transition-colors flex items-center justify-center gap-2 min-h-[44px] ${
              activeTab === 'analytics'
                ? 'text-blue-600 bg-blue-50/50 border-b-2 border-blue-600'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50/50'
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5" />
            <span>Analytics</span>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {activeTab === 'notifications' && (
            <>
              {/* Today's Focus */}
              <div className="bg-white/80 backdrop-blur-sm rounded-xl p-4 border border-gray-200/50 shadow-sm">
                <div className="flex items-center gap-2 mb-3">
                  <Target className="w-4 h-4 text-blue-600" />
                  <h4 className="text-xs font-semibold text-gray-700">Today's Focus</h4>
                </div>
                <div className="space-y-2 text-sm text-gray-700">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                    <span>Review weekly goals</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-green-500"></div>
                    <span>Update budget tracker</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-amber-500"></div>
                    <span>Plan next trip</span>
                  </div>
                </div>
              </div>

              {/* Live Activity Feed */}
              <div className="bg-white/80 backdrop-blur-sm rounded-xl p-4 border border-gray-200/50 shadow-sm">
                <div className="flex items-center gap-2 mb-3">
                  <Activity className="w-4 h-4 text-green-600" />
                  <h4 className="text-xs font-semibold text-gray-700">Live Feed</h4>
                </div>
                <div className="space-y-3 text-xs">
                  <div className="flex items-start gap-2 pb-2 border-b border-gray-100">
                    <div className="w-1.5 h-1.5 rounded-full bg-green-500 mt-1.5 flex-shrink-0"></div>
                    <div className="flex-1 min-w-0">
                      <div className="text-gray-900 font-medium">Added goal: "Learn Spanish"</div>
                      <div className="text-gray-500 text-[10px] mt-0.5">2 minutes ago</div>
                    </div>
                  </div>
                  <div className="flex items-start gap-2 pb-2 border-b border-gray-100">
                    <div className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-1.5 flex-shrink-0"></div>
                    <div className="flex-1 min-w-0">
                      <div className="text-gray-900 font-medium">Completed: "Morning Run"</div>
                      <div className="text-gray-500 text-[10px] mt-0.5">15 minutes ago</div>
                    </div>
                  </div>
                  <div className="flex items-start gap-2 pb-2 border-b border-gray-100">
                    <div className="w-1.5 h-1.5 rounded-full bg-purple-500 mt-1.5 flex-shrink-0"></div>
                    <div className="flex-1 min-w-0">
                      <div className="text-gray-900 font-medium">Updated: Budget Tracker</div>
                      <div className="text-gray-500 text-[10px] mt-0.5">1 hour ago</div>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-1.5 flex-shrink-0"></div>
                    <div className="flex-1 min-w-0">
                      <div className="text-gray-900 font-medium">New event: "Team Meeting"</div>
                      <div className="text-gray-500 text-[10px] mt-0.5">2 hours ago</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Quick Calendar */}
              <div className="bg-white/80 backdrop-blur-sm rounded-xl p-4 border border-gray-200/50 shadow-sm">
                <div className="flex items-center gap-2 mb-3">
                  <Calendar className="w-4 h-4 text-purple-600" />
                  <h4 className="text-xs font-semibold text-gray-700">This Month</h4>
                </div>
                <div className="grid grid-cols-7 gap-1 text-center">
                  {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, i) => (
                    <div key={i} className="text-[10px] text-gray-500 font-medium py-1">
                      {day}
                    </div>
                  ))}
                  {Array.from({ length: 28 }).map((_, i) => {
                    const today = new Date();
                    const isToday = i + 1 === today.getDate();
                    return (
                      <div
                        key={i}
                        className={`text-[10px] py-1 rounded ${
                          isToday
                            ? 'bg-blue-500 text-white font-bold'
                            : 'text-gray-600 hover:bg-gray-100'
                        }`}
                      >
                        {i + 1}
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          )}

          {activeTab === 'analytics' && (
            <>
              {/* Weekly Stats */}
              <div className="bg-white/80 backdrop-blur-sm rounded-xl p-4 border border-gray-200/50 shadow-sm">
                <div className="flex items-center gap-2 mb-3">
                  <TrendingUp className="w-4 h-4 text-blue-600" />
                  <h4 className="text-xs font-semibold text-gray-700">This Week</h4>
                </div>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-600">Goals Completed</span>
                    <span className="text-sm font-bold text-gray-900">3/5</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div className="bg-green-500 h-2 rounded-full" style={{ width: '60%' }}></div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-600">Tasks Done</span>
                    <span className="text-sm font-bold text-gray-900">12/15</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div className="bg-blue-500 h-2 rounded-full" style={{ width: '80%' }}></div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-600">Habits Tracked</span>
                    <span className="text-sm font-bold text-gray-900">18/21</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div className="bg-purple-500 h-2 rounded-full" style={{ width: '86%' }}></div>
                  </div>
                </div>
              </div>

              {/* Monthly Overview */}
              <div className="bg-white/80 backdrop-blur-sm rounded-xl p-4 border border-gray-200/50 shadow-sm">
                <div className="flex items-center gap-2 mb-3">
                  <BarChart3 className="w-4 h-4 text-purple-600" />
                  <h4 className="text-xs font-semibold text-gray-700">This Month</h4>
                </div>
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-2 bg-blue-50/50 rounded-lg">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-blue-600" />
                      <span className="text-xs text-gray-700">Goals</span>
                    </div>
                    <span className="text-sm font-bold text-blue-600">12</span>
                  </div>
                  <div className="flex items-center justify-between p-2 bg-green-50/50 rounded-lg">
                    <div className="flex items-center gap-2">
                      <Clock className="w-3.5 h-3.5 text-green-600" />
                      <span className="text-xs text-gray-700">Events</span>
                    </div>
                    <span className="text-sm font-bold text-green-600">28</span>
                  </div>
                  <div className="flex items-center justify-between p-2 bg-purple-50/50 rounded-lg">
                    <div className="flex items-center gap-2">
                      <Target className="w-3.5 h-3.5 text-purple-600" />
                      <span className="text-xs text-gray-700">Habits</span>
                    </div>
                    <span className="text-sm font-bold text-purple-600">21</span>
                  </div>
                  <div className="flex items-center justify-between p-2 bg-amber-50/50 rounded-lg">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-3.5 h-3.5 text-amber-600" />
                      <span className="text-xs text-gray-700">Journal Entries</span>
                    </div>
                    <span className="text-sm font-bold text-amber-600">8</span>
                  </div>
                </div>
              </div>

              {/* Streaks & Consistency */}
              <div className="bg-white/80 backdrop-blur-sm rounded-xl p-4 border border-gray-200/50 shadow-sm">
                <div className="flex items-center gap-2 mb-3">
                  <Activity className="w-4 h-4 text-green-600" />
                  <h4 className="text-xs font-semibold text-gray-700">Streaks</h4>
                </div>
                <div className="space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Daily Planning</span>
                    <span className="font-bold text-gray-900">7 days</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Habit Tracking</span>
                    <span className="font-bold text-gray-900">12 days</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Journal Writing</span>
                    <span className="font-bold text-gray-900">5 days</span>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
