import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useActiveProject } from '../../contexts/ActiveProjectContext';

interface RequireActiveProjectProps {
  children: React.ReactNode;
}

export function RequireActiveProject({ children }: RequireActiveProjectProps) {
  const navigate = useNavigate();
  const { activeProjectId } = useActiveProject();

  useEffect(() => {
    if (!activeProjectId) {
      navigate('/guardrails/dashboard?needsProject=1');
    }
  }, [activeProjectId, navigate]);

  if (!activeProjectId) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50">
        <div className="text-center max-w-md">
          <div className="mb-4">
            <svg className="w-16 h-16 mx-auto text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            No Active Project Selected
          </h2>
          <p className="text-gray-600 mb-6">
            This section requires an active project to be selected. Redirecting to dashboard...
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
