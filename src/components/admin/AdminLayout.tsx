import { ReactNode, useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  BarChart3,
  ScrollText,
  Settings,
  LogOut,
  Brain,
  ArrowLeft,
  Menu,
  X,
  CalendarRange,
  ShieldCheck,
  ShieldAlert,
  FileText,
  Flame,
} from 'lucide-react';
import { getOpenFlagCount } from '../../core/services/ModerationService';
import { useAuth } from '../../core/auth/AuthProvider';
import { useUIPreferences } from '../../contexts/UIPreferencesContext';
import { ViewAsSelector } from './ViewAsSelector';

interface AdminLayoutProps {
  children: ReactNode;
}

export function AdminLayout({ children }: AdminLayoutProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { signOut, profile, refreshProfile } = useAuth();

  // Always refresh the user's profile when entering the admin panel.
  // Avoids stale role badges (e.g. user was just promoted to admin elsewhere).
  useEffect(() => {
    refreshProfile().catch(() => {});
  }, [refreshProfile]);
  const { config } = useUIPreferences();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [openFlagCount, setOpenFlagCount] = useState(0);

  useEffect(() => {
    getOpenFlagCount().then(setOpenFlagCount).catch(() => {});
    const interval = setInterval(() => {
      getOpenFlagCount().then(setOpenFlagCount).catch(() => {});
    }, 60_000);
    return () => clearInterval(interval);
  }, []);

  const handleSignOut = async () => {
    await signOut();
    navigate('/home');
  };

  const navItems = [
    { path: '/admin',                     icon: LayoutDashboard, label: 'Dashboard',          badge: 0 },
    { path: '/admin/users',               icon: Users,           label: 'Users',              badge: 0 },
    { path: '/admin/moderation',          icon: ShieldCheck,     label: 'Moderation',         badge: openFlagCount },
    { path: '/admin/safety',              icon: ShieldAlert,     label: 'Safety Escalation',  badge: 0 },
    { path: '/admin/recurring-sessions',  icon: CalendarRange,   label: 'Recurring Sessions', badge: 0 },
    { path: '/admin/analytics',           icon: BarChart3,       label: 'Analytics',          badge: 0 },
    { path: '/admin/heatmaps',            icon: Flame,           label: 'Heatmaps',           badge: 0 },
    { path: '/admin/logs',                icon: ScrollText,      label: 'Activity Logs',      badge: 0 },
    { path: '/admin/changelog',           icon: FileText,        label: 'Release notes',      badge: 0 },
    { path: '/admin/settings',            icon: Settings,        label: 'Settings',           badge: 0 },
  ];

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Mobile Menu Button */}
      <button
        onClick={() => setMobileMenuOpen(true)}
        className="lg:hidden fixed top-4 left-4 z-30 p-2 bg-white rounded-lg shadow-lg border border-gray-200 print:hidden"
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

      <aside className={`w-64 bg-white border-r border-gray-200 flex flex-col print:hidden
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
            const isActive = location.pathname === item.path;

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
                <span className="flex-1">{item.label}</span>
                {item.badge > 0 && (
                  <span className="w-5 h-5 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">
                    {item.badge > 9 ? '9+' : item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-gray-200 space-y-4">
          <ViewAsSelector />

          <div className="p-3 bg-gray-50 rounded-lg">
            <p className="text-sm font-medium text-gray-900">{profile?.display_name}</p>
            <p className="text-xs text-gray-500 truncate">{profile?.id ? `ID: ${profile.id.slice(0, 8)}…` : ''}</p>
            <div className="mt-2">
              <span className={`inline-block px-2 py-1 text-xs font-semibold rounded ${
                profile?.role === 'admin'
                  ? 'bg-violet-100 text-violet-700'
                  : profile?.role === 'premium'
                  ? 'bg-teal-100 text-teal-700'
                  : 'bg-gray-100 text-gray-600'
              }`}>
                {(profile?.role ?? 'free').toUpperCase()}
              </span>
            </div>
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
