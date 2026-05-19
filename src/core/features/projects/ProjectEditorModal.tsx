/**
 * ProjectEditorModal — create or edit a project.
 *
 * Fields kept deliberately minimal: title (required), description ("what
 * does done look like?"), color. For an existing project we also surface
 * an archive button + an Invite section trigger.
 */

import { useState } from 'react';
import { X, Archive, Loader2, Target, UserPlus } from 'lucide-react';
import { useAuth } from '../../auth/AuthProvider';
import { useCoreData } from '../../data/CoreDataContext';
import { ProjectService, type Project } from '../../services/ProjectService';
import { InputWell } from '../../ui/CorePage';
import { PROJECT_COLORS } from './ProjectsPage';
import { InviteCollaboratorSheet } from './InviteCollaboratorSheet';

type Props = {
  /** Pass a project to edit; omit to create. */
  project?: Project;
  onClose: () => void;
  onSaved?: (project: Project) => void;
  onArchived?: () => void;
};

export function ProjectEditorModal({ project, onClose, onSaved, onArchived }: Props) {
  const { user } = useAuth();
  const { state: { spaces }, refreshProjects } = useCoreData();
  const isNew = !project;

  const [title, setTitle] = useState(project?.title ?? '');
  const [description, setDescription] = useState(project?.description ?? '');
  const [color, setColor] = useState<string>(project?.color ?? 'blue');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [inviteOpen, setInviteOpen] = useState(false);

  const canSubmit = title.trim().length > 0 && !submitting;

  async function handleSave() {
    if (!canSubmit) return;
    setSubmitting(true);
    setError(null);
    try {
      let saved: Project;
      if (isNew) {
        // Personal space — first space the user owns
        const personalSpace = spaces.find((s) => s.type === 'personal');
        if (!user || !personalSpace) {
          throw new Error('Personal space not ready yet. Try refreshing.');
        }
        saved = await ProjectService.createProject({
          space_id: personalSpace.id,
          created_by: user.id,
          title: title.trim(),
          description: description.trim() || null,
          color,
          status: 'active',
        });
      } else {
        saved = await ProjectService.updateProject(project!.id, {
          title: title.trim(),
          description: description.trim() || null,
          color,
        });
      }
      await refreshProjects();
      onSaved?.(saved);
    } catch (e: any) {
      setError(e?.message ?? 'Could not save project.');
      setSubmitting(false);
    }
  }

  async function handleArchive() {
    if (!project) return;
    if (!confirm(`Archive "${project.title}"? You can’t un-archive from the UI yet, but past sessions and tasks stay accessible.`)) return;
    setSubmitting(true);
    setError(null);
    try {
      await ProjectService.archiveProject(project.id);
      await refreshProjects();
      onArchived?.();
      onClose();
    } catch (e: any) {
      setError(e?.message ?? 'Could not archive.');
      setSubmitting(false);
    }
  }

  return (
    <>
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/40" onClick={onClose}>
      <div
        className="w-full sm:max-w-md bg-surface rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="shrink-0 flex items-center justify-between px-5 pt-4 pb-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl stitch-card--accent flex items-center justify-center">
              <Target size={18} className="text-white" />
            </div>
            <div>
              <h2 className="stitch-headline text-base font-extrabold leading-tight">
                {isNew ? 'New project' : 'Edit project'}
              </h2>
              <p className="text-xs stitch-text-secondary">
                What's the macro goal?
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full bg-surface-container-low hover:bg-surface-container transition-colors"
          >
            <X size={15} className="stitch-text-secondary" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 pb-3 space-y-4">
          {/* Title */}
          <div>
            <label className="text-[10px] font-bold stitch-text-secondary tracking-widest uppercase mb-1.5 block">
              Title
            </label>
            <InputWell
              value={title}
              onChange={setTitle}
              placeholder="e.g. Ship pitch deck v1"
            />
          </div>

          {/* Description */}
          <div>
            <label className="text-[10px] font-bold stitch-text-secondary tracking-widest uppercase mb-1.5 block">
              What does done look like? <span className="opacity-60 normal-case font-medium">(optional)</span>
            </label>
            <InputWell
              value={description}
              onChange={setDescription}
              placeholder="A 15-slide deck ready to send to investors"
              multiline
              rows={3}
            />
          </div>

          {/* Color */}
          <div>
            <label className="text-[10px] font-bold stitch-text-secondary tracking-widest uppercase mb-1.5 block">
              Color
            </label>
            <div className="flex items-center gap-2">
              {Object.entries(PROJECT_COLORS).map(([key, meta]) => {
                const selected = color === key;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setColor(key)}
                    className={`w-8 h-8 rounded-full transition-all active:scale-90 ${
                      selected ? 'ring-2 ring-offset-2 ring-offset-surface' + ' ' + meta.ring : ''
                    }`}
                    style={{ backgroundColor: meta.hex }}
                    aria-label={key}
                  />
                );
              })}
            </div>
          </div>

          {/* Invite section — existing projects only */}
          {!isNew && (
            <button
              type="button"
              onClick={() => setInviteOpen(true)}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-surface-container-low stitch-text-primary text-sm font-bold hover:bg-surface-container transition-colors"
            >
              <UserPlus size={14} />
              Invite collaborator
            </button>
          )}

          {error && (
            <p className="text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>
          )}
        </div>

        {/* Footer */}
        <div className="shrink-0 px-5 pt-3 pb-5 border-t border-surface-container/50 flex items-center gap-2">
          {!isNew && (
            <button
              type="button"
              onClick={handleArchive}
              disabled={submitting}
              className="px-3 py-2.5 rounded-xl text-xs font-bold text-rose-700 hover:bg-rose-50 transition-colors disabled:opacity-50"
            >
              <span className="inline-flex items-center gap-1.5">
                <Archive size={12} /> Archive
              </span>
            </button>
          )}
          <button
            type="button"
            onClick={handleSave}
            disabled={!canSubmit}
            className={`ml-auto flex items-center justify-center gap-2 py-2.5 px-5 rounded-xl text-sm font-bold transition-all ${
              canSubmit
                ? 'stitch-btn--primary text-white shadow-lg shadow-primary/20 active:scale-[0.98]'
                : 'bg-surface-container-low stitch-text-secondary cursor-not-allowed'
            }`}
          >
            {submitting ? <Loader2 size={14} className="animate-spin" /> : (isNew ? 'Create' : 'Save')}
          </button>
        </div>
      </div>
    </div>

    {inviteOpen && project && (
      <InviteCollaboratorSheet
        project={project}
        onClose={() => setInviteOpen(false)}
      />
    )}
    </>
  );
}
