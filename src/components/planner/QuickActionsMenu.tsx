/**
 * Quick Actions Menu - Context-Aware Action Menu
 * 
 * Provides quick access to common actions based on current route context.
 * Fully customizable via planner settings.
 */

import { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Calendar,
  Plus,
  Target,
  FileText,
  Clock,
  CheckSquare,
  MessageSquare,
  DollarSign,
  Home,
  BookOpen,
  Plane,
  Heart,
  Users,
  Briefcase,
  GraduationCap,
  PiggyBank,
  Eye,
  Lightbulb,
  UtensilsCrossed,
  Sparkles,
  X,
} from 'lucide-react';
import type { QuickActionConfig } from '../../lib/plannerTypes';

type QuickActionsMenuProps = {
  isOpen: boolean;
  onClose: () => void;
  actions: QuickActionConfig[];
  position: { x: number; y: number };
};

export function QuickActionsMenu({ isOpen, onClose, actions, position }: QuickActionsMenuProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu when clicking outside
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen, onClose]);

  // Icon mapping
  const iconMap: Record<string, any> = {
    Calendar,
    Plus,
    Target,
    FileText,
    Clock,
    CheckSquare,
    MessageSquare,
    DollarSign,
    Home,
    BookOpen,
    Plane,
    Heart,
    Users,
    Briefcase,
    GraduationCap,
    PiggyBank,
    Eye,
    Lightbulb,
    UtensilsCrossed,
    Sparkles,
  };

  // Filter actions based on context (if route matches)
  const visibleActions = actions.filter((action) => {
    if (!action.contextRoutes || action.contextRoutes.length === 0) return true;
    return action.contextRoutes.some((route) => location.pathname.startsWith(route));
  });

  if (!isOpen) return null;

  // If no visible actions, show a message
  if (visibleActions.length === 0) {
    return (
      <>
        <div
          className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40"
          onClick={onClose}
        />
        <div
          className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-80 bg-white rounded-xl shadow-2xl border border-gray-200 p-4 z-50"
        >
          <div className="text-center py-4">
            <p className="text-sm text-gray-600">No quick actions available</p>
            <p className="text-xs text-gray-500 mt-1">Configure actions in Planner Settings</p>
          </div>
        </div>
      </>
    );
  }

  // Calculate menu position (above the button, aligned to left)
  // On mobile, use bottom sheet style for better UX
  const isMobile = window.innerWidth < 768;
  
  // Mobile: Bottom sheet style
  if (isMobile) {
    return (
      <>
        {/* Backdrop */}
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40"
          onClick={onClose}
        />

        {/* Bottom Sheet Menu */}
        <div
          ref={menuRef}
          className="fixed bottom-0 left-0 right-0 bg-white rounded-t-2xl shadow-2xl border-t border-gray-200 z-50 safe-bottom max-h-[70vh] flex flex-col"
          style={{
            animation: 'slideUp 0.3s ease-out',
            paddingBottom: '80px', // Space for pill navigation (56px height + 16px margin + 8px padding)
          }}
        >
          <style>{`
            @keyframes slideUp {
              from {
                transform: translateY(100%);
              }
              to {
                transform: translateY(0);
              }
            }
          `}</style>
          
          {/* Handle */}
          <div className="flex justify-center pt-3 pb-2">
            <div className="w-12 h-1 bg-gray-300 rounded-full"></div>
          </div>

          {/* Header */}
          <div className="px-4 py-2.5 border-b border-gray-100 flex items-center justify-between">
            <h3 className="text-sm font-bold text-gray-900">Quick Actions</h3>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 rounded-lg transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Actions List */}
          <div className="flex-1 overflow-y-auto py-2">
            {visibleActions.map((action) => {
              const Icon = iconMap[action.icon] || Plus;
              return (
                <button
                  key={action.id}
                  onClick={() => {
                    if (action.type === 'navigate') {
                      navigate(action.path || '#');
                    } else if (action.type === 'callback' && action.callback) {
                      action.callback();
                    }
                    onClose();
                  }}
                  className="w-full px-4 py-2.5 text-left flex items-center gap-2.5 hover:bg-gray-50 active:bg-gray-100 transition-colors min-h-[52px]"
                >
                  <div className={`p-2 rounded-lg ${action.color || 'bg-blue-100'} flex-shrink-0`}>
                    <Icon className={`w-4 h-4 ${action.iconColor || 'text-blue-600'}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-gray-900">{action.label}</div>
                    {action.description && (
                      <div className="text-xs text-gray-500 mt-0.5 line-clamp-1">{action.description}</div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </>
    );
  }

  // Desktop: Floating menu above button
  const menuStyle: React.CSSProperties = {
    position: 'fixed',
    bottom: `${window.innerHeight - position.y + 80}px`,
    left: `${position.x}px`,
    transform: 'translateX(0)',
    zIndex: 50,
    maxWidth: '280px',
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40"
        onClick={onClose}
      />

      {/* Desktop Menu */}
      <div
        ref={menuRef}
        style={menuStyle}
        className="bg-white rounded-xl shadow-2xl border border-gray-200 py-2 min-w-[200px] z-50"
      >
        <div className="px-3 py-2 border-b border-gray-100 flex items-center justify-between">
          <h3 className="text-sm font-bold text-gray-700">Quick Actions</h3>
          <button
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-gray-600 rounded transition-colors min-w-[32px] min-h-[32px] flex items-center justify-center"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="py-1 max-h-[400px] overflow-y-auto">
          {visibleActions.map((action) => {
            const Icon = iconMap[action.icon] || Plus;
            return (
              <button
                key={action.id}
                onClick={() => {
                  if (action.type === 'navigate') {
                    navigate(action.path || '#');
                  } else if (action.type === 'callback' && action.callback) {
                    action.callback();
                  }
                  onClose();
                }}
                className="w-full px-4 py-2.5 text-left flex items-center gap-3 hover:bg-gray-50 active:bg-gray-100 transition-colors group min-h-[44px]"
              >
                <div className={`p-2 rounded-lg ${action.color || 'bg-blue-100'} group-hover:scale-110 transition-transform flex-shrink-0`}>
                  <Icon className={`w-4 h-4 ${action.iconColor || 'text-blue-600'}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-gray-900">{action.label}</div>
                  {action.description && (
                    <div className="text-xs text-gray-500 mt-0.5">{action.description}</div>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </>
  );
}

