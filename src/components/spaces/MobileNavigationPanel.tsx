/**
 * Mobile Navigation Panel
 * 
 * Full-screen navigation panel for mobile SpacesOSLauncher.
 * Allows users to navigate to different sections of the app.
 */

import { useNavigate, useLocation } from 'react-router-dom';
import {
  X,
  Home,
  Users,
  Calendar,
  Target,
  Zap,
  MessageCircle,
  FileText,
  Settings,
  User,
  Shield,
  LayoutGrid,
  Activity,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

interface MobileNavigationPanelProps {
  isOpen: boolean;
  onClose: () => void;
  currentSpaceName?: string;
}

interface NavItem {
  label: string;
  path: string;
  icon: any;
  description?: string;
  requiresAdmin?: boolean;
  isSpecial?: boolean; // Special styling for certain items
}

export function MobileNavigationPanel({ isOpen, onClose, currentSpaceName }: MobileNavigationPanelProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAdmin } = useAuth();

  const navItems: NavItem[] = [
    {
      label: 'Dashboard',
      path: '/dashboard',
      icon: Home,
      description: 'Your home dashboard',
    },
    {
      label: 'Spaces',
      path: '/spaces',
      icon: Users,
      description: 'All your spaces',
    },
    {
      label: 'Personal Space',
      path: '/spaces/personal',
      icon: User,
      description: 'Your private space',
      isSpecial: true,
    },
    {
      label: 'Shared Spaces',
      path: '/spaces/shared',
      icon: Users,
      description: 'Shared family spaces',
    },
    {
      label: 'Planner',
      path: '/planner',
      icon: Calendar,
      description: 'Calendar and planning',
    },
    {
      label: 'Guardrails',
      path: '/guardrails',
      icon: Target,
      description: 'Project management',
    },
    {
      label: 'Regulation',
      path: '/regulation',
      icon: Zap,
      description: 'Daily alignment',
    },
    {
      label: 'Tracker Studio',
      path: '/tracker-studio',
      icon: Activity,
      description: 'Track anything you want',
    },
    {
      label: 'Messages',
      path: '/messages',
      icon: MessageCircle,
      description: 'Household messages',
    },
    {
      label: 'Settings',
      path: '/settings',
      icon: Settings,
      description: 'Account settings',
    },
  ];

  // Add admin item if user is admin
  if (isAdmin) {
    navItems.push({
      label: 'Admin',
      path: '/admin',
      icon: Shield,
      description: 'Administration',
      requiresAdmin: true,
    });
  }

  const handleNavigate = (path: string) => {
    navigate(path);
    onClose();
  };

  const isActive = (path: string) => {
    if (path === '/spaces') {
      return location.pathname.startsWith('/spaces') && 
             !location.pathname.startsWith('/spaces/personal') &&
             !location.pathname.startsWith('/spaces/shared');
    }
    if (path === '/planner') {
      return location.pathname.startsWith('/planner');
    }
    if (path === '/guardrails') {
      return location.pathname.startsWith('/guardrails');
    }
    if (path === '/regulation') {
      return location.pathname.startsWith('/regulation');
    }
    if (path === '/messages') {
      return location.pathname.startsWith('/messages');
    }
    return location.pathname === path;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-white flex flex-col safe-top safe-bottom" style={{ zIndex: 400 }}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-4 border-b border-gray-200 bg-white sticky top-0 z-10">
        <div className="flex-1">
          <h2 className="text-xl font-semibold text-gray-900">Navigation</h2>
          {currentSpaceName && (
            <p className="text-sm text-gray-500 mt-0.5">Currently in {currentSpaceName}</p>
          )}
        </div>
        <button
          onClick={onClose}
          className="p-2 hover:bg-gray-100 active:bg-gray-200 rounded-full transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center ml-2"
          aria-label="Close"
        >
          <X size={24} className="text-gray-600" />
        </button>
      </div>

      {/* Navigation List */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        <div className="space-y-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.path);
            
            return (
              <button
                key={item.path}
                onClick={() => handleNavigate(item.path)}
                className={`w-full text-left px-4 py-4 rounded-xl transition-colors min-h-[64px] flex items-center gap-4 ${
                  active
                    ? item.isSpecial
                      ? 'bg-violet-50 border-2 border-violet-200'
                      : 'bg-blue-50 border-2 border-blue-200'
                    : 'bg-gray-50 hover:bg-gray-100 active:bg-gray-200 border-2 border-transparent'
                }`}
              >
                <div
                  className={`p-3 rounded-xl flex-shrink-0 ${
                    active
                      ? item.isSpecial
                        ? 'bg-violet-100'
                        : 'bg-blue-100'
                      : 'bg-white'
                  }`}
                >
                  <Icon
                    size={24}
                    className={
                      active
                        ? item.isSpecial
                          ? 'text-violet-600'
                          : 'text-blue-600'
                        : 'text-gray-600'
                    }
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <p
                    className={`font-semibold text-base ${
                      active
                        ? item.isSpecial
                          ? 'text-violet-900'
                          : 'text-blue-900'
                        : 'text-gray-900'
                    }`}
                  >
                    {item.label}
                  </p>
                  {item.description && (
                    <p className="text-sm text-gray-600 mt-0.5">{item.description}</p>
                  )}
                </div>
                {active && (
                  <div
                    className={`w-2 h-2 rounded-full flex-shrink-0 ${
                      item.isSpecial ? 'bg-violet-600' : 'bg-blue-600'
                    }`}
                  />
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
