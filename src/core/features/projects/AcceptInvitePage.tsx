/**
 * AcceptInvitePage — landing page for /invite/:token links.
 *
 * Renders a preview of the target project, then a "Join" button that calls
 * the SECURITY DEFINER RPC. On success, navigates to the project detail
 * page. If unauth, redirects to login and bounces back.
 */

import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Loader2, Target, Users, ArrowRight, AlertTriangle } from 'lucide-react';
import { ProjectService, type Project, type ProjectInvite } from '../../services/ProjectService';
import { useAuth } from '../../auth/AuthProvider';
import { useCoreData } from '../../data/CoreDataContext';
import { projectColorMeta } from './ProjectsPage';

export function AcceptInvitePage() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const { refreshProjects } = useCoreData();

  const [invite, setInvite] = useState<ProjectInvite | null>(null);
  const [project, setProject] = useState<Project | null>(null);
  const [resolveError, setResolveError] = useState<string | null>(null);
  const [resolving, setResolving] = useState(true);
  const [accepting, setAccepting] = useState(false);
  const [acceptError, setAcceptError] = useState<string | null>(null);

  // Resolve invite by token
  useEffect(() => {
    if (!token) return;
    setResolving(true);
    setResolveError(null);
    ProjectService.getInviteByToken(token)
      .then((res) => {
        if (!res) {
          setResolveError('This invite is invalid, expired, or already accepted.');
        } else {
          setInvite(res.invite);
          setProject(res.project);
        }
      })
      .catch((e) => setResolveError(e?.message ?? 'Could not resolve invite'))
      .finally(() => setResolving(false));
  }, [token]);

  async function handleAccept() {
    if (!token) return;
    if (!user) {
      // Stash the token so the auth flow can return here after login
      try { sessionStorage.setItem('pending-invite-token', token); } catch { /* ignore */ }
      navigate('/auth/login');
      return;
    }
    setAccepting(true);
    setAcceptError(null);
    try {
      const projectId = await ProjectService.acceptInvite(token);
      await refreshProjects();
      navigate(`/projects/${projectId}`);
    } catch (e: any) {
      setAcceptError(e?.message ?? 'Could not accept invite.');
      setAccepting(false);
    }
  }

  if (loading || resolving) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center stitch-text-secondary">
        <Loader2 size={20} className="animate-spin" />
      </div>
    );
  }

  if (resolveError || !invite || !project) {
    return (
      <div className="max-w-md mx-auto pt-16 px-5 text-center">
        <div className="w-16 h-16 rounded-[1.5rem] bg-rose-100 flex items-center justify-center mx-auto mb-5">
          <AlertTriangle size={26} className="text-rose-500" />
        </div>
        <h1 className="stitch-headline text-xl font-extrabold mb-2">Invite unavailable</h1>
        <p className="text-sm stitch-text-secondary leading-relaxed mb-6">
          {resolveError ?? 'This link doesn’t resolve to an active invite. Ask the host to send a fresh one.'}
        </p>
        <button
          type="button"
          onClick={() => navigate('/sessions')}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-surface-container-low stitch-text-primary text-sm font-bold hover:bg-surface-container transition-colors"
        >
          Back to SharedMinds
        </button>
      </div>
    );
  }

  const color = projectColorMeta(project.color);

  return (
    <div className="max-w-md mx-auto pt-12 px-5">
      <div className="text-center mb-7">
        <span
          className="inline-block w-12 h-12 rounded-2xl ring-2 ring-white shadow-md mb-4"
          style={{ backgroundColor: color.hex }}
        />
        <p className="text-[10px] font-bold stitch-text-secondary tracking-widest uppercase mb-2">
          You've been invited to join
        </p>
        <h1 className="stitch-headline text-2xl sm:text-3xl font-extrabold tracking-tight mb-2">
          {project.title}
        </h1>
        {project.description && (
          <p className="text-sm stitch-text-secondary leading-relaxed">
            {project.description}
          </p>
        )}
      </div>

      <div className="rounded-2xl bg-surface-container-low p-4 mb-6 space-y-2.5">
        <div className="flex items-center gap-2 text-sm stitch-text-primary">
          <Target size={14} className="text-primary shrink-0" />
          <span>Pin sessions to chip away at it together</span>
        </div>
        <div className="flex items-center gap-2 text-sm stitch-text-primary">
          <Users size={14} className="text-primary shrink-0" />
          <span>See each other's progress in real time</span>
        </div>
      </div>

      {acceptError && (
        <p className="mb-3 text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2">{acceptError}</p>
      )}

      <button
        type="button"
        onClick={handleAccept}
        disabled={accepting}
        className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl stitch-btn--primary text-white text-base font-bold shadow-lg shadow-primary/20 active:scale-[0.98] disabled:opacity-60"
      >
        {accepting ? (
          <Loader2 size={16} className="animate-spin" />
        ) : (
          <>
            {user ? 'Join project' : 'Sign in & join'}
            <ArrowRight size={16} />
          </>
        )}
      </button>

      <button
        type="button"
        onClick={() => navigate('/sessions')}
        className="w-full mt-3 py-2.5 text-xs stitch-text-secondary hover:stitch-text-primary"
      >
        Not now
      </button>
    </div>
  );
}
