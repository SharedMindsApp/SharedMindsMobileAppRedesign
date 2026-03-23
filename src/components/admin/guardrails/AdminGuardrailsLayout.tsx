import { useState, useEffect } from 'react';
import { Link, Outlet, useLocation, Navigate } from 'react-router-dom';
import { Settings, Tag, FileText, Layers, Link2, ArrowLeft } from 'lucide-react';
import { isCurrentUserAdmin } from '../../../lib/admin/adminUtils';

export function AdminGuardrailsLayout() {
  const location = useLocation();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);

  useEffect(() => {
    async function checkAdmin() {
      const adminStatus = await isCurrentUserAdmin();
      setIsAdmin(adminStatus);
    }
    checkAdmin();
  }, []);

  if (isAdmin === null) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!isAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  const navItems = [
    { path: '/admin/guardrails/project-types', label: 'Project Types', icon: Settings },
    { path: '/admin/guardrails/templates', label: 'Track Templates', icon: Layers },
    { path: '/admin/guardrails/subtracks', label: 'Sub-Track Templates', icon: FileText },
    { path: '/admin/guardrails/tags', label: 'Tags', icon: Tag },
    { path: '/admin/guardrails/template-tags', label: 'Template → Tag Mapping', icon: Link2 },
    { path: '/admin/guardrails/project-type-tags', label: 'Project Type → Tag Mapping', icon: Link2 },
    { path: '/admin/guardrails/template-subtracks', label: 'Template → Sub-Tracks Mapping', icon: Link2 },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <Link
                to="/dashboard"
                className="flex items-center space-x-2 text-gray-600 hover:text-gray-900"
              >
                <ArrowLeft className="w-5 h-5" />
                <span>Back to Dashboard</span>
              </Link>
              <div className="h-6 w-px bg-gray-300" />
              <h1 className="text-xl font-bold text-gray-900">Guardrails Admin Console</h1>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex gap-6">
          <nav className="w-64 flex-shrink-0">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.path;

                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`
                      flex items-center space-x-3 px-4 py-3 border-b border-gray-100 last:border-b-0
                      ${isActive ? 'bg-blue-50 text-blue-600 font-medium' : 'text-gray-700 hover:bg-gray-50'}
                    `}
                  >
                    <Icon className="w-5 h-5" />
                    <span className="text-sm">{item.label}</span>
                  </Link>
                );
              })}
            </div>
          </nav>

          <main className="flex-1">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  );
}
