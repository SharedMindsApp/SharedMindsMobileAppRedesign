import { ReactNode, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  Home,
  FileText,
  BarChart3,
  ScrollText,
  Settings,
  LogOut,
  Brain,
  ArrowLeft,
  Layers,
  Cpu,
  Sun,
  Moon,
  Zap,
  Check,
  Menu,
  X,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useUIPreferences } from '../../contexts/UIPreferencesContext';
import type { AppTheme } from '../../lib/uiPreferencesTypes';
import { ViewAsSelector } from './ViewAsSelector';

interface AdminLayoutProps {
  children: ReactNode;
}

export function AdminLayout({ children }: AdminLayoutProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { signOut, profile } = useAuth();
  const { config, updatePreferences } = useUIPreferences();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth/login');
  };

  const handleThemeChange = (theme: AppTheme) => {
    updatePreferences({ appTheme: theme });
  };

  const navItems = [
    { path: '/admin', icon: LayoutDashboard, label: 'Dashboard' },
    { path: '/admin/users', icon: Users, label: 'Users' },
    { path: '/admin/households', icon: Home, label: 'Households' },
    { path: '/admin/reports', icon: FileText, label: 'Reports' },
    { path: '/admin/analytics', icon: BarChart3, label: 'Analytics' },
    { path: '/admin/logs', icon: ScrollText, label: 'Activity Logs' },
    { path: '/admin/guardrails/project-types', icon: Layers, label: 'Guardrails Metadata' },
    { path: '/admin/ai-providers', icon: Cpu, label: 'AI Providers' },
    { path: '/admin/ai-routing', icon: Cpu, label: 'AI Routing' },
    { path: '/admin/settings', icon: Settings, label: 'Settings' },
  ];

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Mobile Menu Button */}
      <button
        onClick={() => setMobileMenuOpen(true)}
        className="lg:hidden fixed top-4 left-4 z-30 p-2 bg-white rounded-lg shadow-lg border border-gray-200"
      >
        <Menu size={24} className="text-gray-700" />
      </button>

      {/* Backdrop for mobile */}
      {mobileMenuOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/50 z-40"
          onClick={() => setMobileMenuOpen(false)}
        ></div>
      )}

      <aside className={`w-64 bg-white border-r border-gray-200 flex flex-col
        ${mobileMenuOpen ? 'fixed inset-y-0 left-0 z-50' : 'hidden'} lg:flex`}>
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-teal-500 flex items-center justify-center">
                <Brain size={24} className="text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">SharedMinds</h1>
                <p className="text-xs text-gray-500">Admin Panel</p>
              </div>
            </div>
            {/* Mobile close button */}
            <button
              onClick={() => setMobileMenuOpen(false)}
              className="lg:hidden p-2 hover:bg-gray-100 rounded-lg transition-colors"
              title="Close menu"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          <Link
            to="/dashboard"
            onClick={() => setMobileMenuOpen(false)}
            className="flex items-center gap-3 px-4 py-3 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors mb-4 border-b border-gray-200 pb-4"
          >
            <ArrowLeft size={20} />
            <span>Back to App</span>
          </Link>

          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path ||
              (item.path.includes('/guardrails') && location.pathname.startsWith('/admin/guardrails'));

            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setMobileMenuOpen(false)}
                className={`
                  flex items-center gap-3 px-4 py-3 rounded-lg transition-colors
                  ${isActive
                    ? 'bg-blue-50 text-blue-700 font-medium'
                    : 'text-gray-700 hover:bg-gray-50'
                  }
                `}
              >
                <Icon size={20} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-gray-200 space-y-4">
          <ViewAsSelector />

          <div className="p-3 bg-gray-50 rounded-lg">
            <p className="text-sm font-medium text-gray-900">{profile?.full_name}</p>
            <p className="text-xs text-gray-500">{profile?.email}</p>
            <div className="mt-2">
              <span className="inline-block px-2 py-1 text-xs font-semibold bg-blue-100 text-blue-700 rounded">
                {profile?.role?.toUpperCase()}
              </span>
            </div>
          </div>

          <div className="space-y-1">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider px-2 mb-2">Theme</p>
            <button
              onClick={() => handleThemeChange('light')}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-lg transition-colors ${
                config.appTheme === 'light'
                  ? 'bg-blue-50 text-blue-700'
                  : 'text-gray-700 hover:bg-gray-50'
              }`}
            >
              <div className="flex items-center gap-2">
                <Sun size={16} />
                <span className="text-sm">Light</span>
              </div>
              {config.appTheme === 'light' && <Check size={16} />}
            </button>
            <button
              onClick={() => handleThemeChange('dark')}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-lg transition-colors ${
                config.appTheme === 'dark'
                  ? 'bg-blue-50 text-blue-700'
                  : 'text-gray-700 hover:bg-gray-50'
              }`}
            >
              <div className="flex items-center gap-2">
                <Moon size={16} />
                <span className="text-sm">Dark</span>
              </div>
              {config.appTheme === 'dark' && <Check size={16} />}
            </button>
            <button
              onClick={() => handleThemeChange('neon-dark')}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-lg transition-colors ${
                config.appTheme === 'neon-dark'
                  ? 'bg-blue-50 text-blue-700'
                  : 'text-gray-700 hover:bg-gray-50'
              }`}
            >
              <div className="flex items-center gap-2">
                <Zap size={16} />
                <span className="text-sm">Neon Dark</span>
              </div>
              {config.appTheme === 'neon-dark' && <Check size={16} />}
            </button>
          </div>

          <button
            onClick={() => {
              setMobileMenuOpen(false);
              handleSignOut();
            }}
            className="w-full flex items-center gap-3 px-4 py-3 text-gray-700 hover:bg-gray-50 rounded-lg transition-colors"
          >
            <LogOut size={20} />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      <main className="flex-1 overflow-auto">
        <div className="p-4 md:p-8 pt-16 lg:pt-8">
          {children}
        </div>
      </main>
    </div>
  );
}
