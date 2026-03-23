import { ReactNode, useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertCircle, ArrowLeft } from 'lucide-react';
import { useActiveDataContext } from '../../state/useActiveDataContext';
import { getMasterProjects } from '../../lib/guardrails';
import { useForegroundTriggers } from '../../contexts/ForegroundTriggersContext';

interface RequireActiveProjectADCProps {
  children: ReactNode;
}

export function RequireActiveProjectADC({ children }: RequireActiveProjectADCProps) {
  const navigate = useNavigate();
  const { activeProjectId } = useActiveDataContext();
  const { emitContextEvent } = useForegroundTriggers();
  const [checking, setChecking] = useState(true);
  const [projectExists, setProjectExists] = useState(false);
  const emittedRef = useRef<string | null>(null);

  useEffect(() => {
    console.log('[RequireActiveProjectADC] activeProjectId from ADC:', activeProjectId);
    async function checkProject() {
      if (!activeProjectId) {
        console.log('[RequireActiveProjectADC] No activeProjectId, showing warning');
        setChecking(false);
        setProjectExists(false);
        emittedRef.current = null;
        return;
      }

      try {
        const projects = await getMasterProjects();
        const exists = projects.some((p) => p.id === activeProjectId);
        setProjectExists(exists);

        if (exists && emittedRef.current !== activeProjectId) {
          emittedRef.current = activeProjectId;
          emitContextEvent('project_opened');
        }
      } catch (error) {
        console.error('Failed to verify project existence:', error);
        setProjectExists(false);
      } finally {
        setChecking(false);
      }
    }

    checkProject();
  }, [activeProjectId, emitContextEvent]);

  if (checking) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading project...</p>
        </div>
      </div>
    );
  }

  if (!activeProjectId || !projectExists) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50 p-8">
        <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8 border-2 border-amber-200">
          <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle size={32} className="text-amber-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 text-center mb-3">
            No Active Project Selected
          </h2>
          <p className="text-gray-600 text-center mb-6">
            {!activeProjectId
              ? 'Please select a project from the Dashboard to continue.'
              : 'The selected project is no longer available. Please select another project.'}
          </p>
          <button
            onClick={() => navigate('/guardrails/dashboard')}
            className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            <ArrowLeft size={20} />
            Go to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
