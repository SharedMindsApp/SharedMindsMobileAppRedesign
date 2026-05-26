/**
 * TaskEditModal — edit a task's title, project, weekly intention, and energy.
 *
 * Lightweight modal that opens from the hover-reveal pencil icon on a task row.
 * Optimistic save through CoreDataContext.updateTaskAsync.
 *
 * Why edit IN PLACE matters: ADHD users often capture tasks fast without
 * deciding where they belong yet. Letting them re-file later (into a project
 * or attach to a weekly intention) is what makes that fast-capture feel safe.
 */

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Zap, Leaf, Coffee, Target, Loader2, Plus, FolderOpen } from 'lucide-react';
import { useCoreData, type CoreTask } from '../../data/CoreDataContext';
import { ProjectService } from '../../services/ProjectService';
import { supabase } from '../../../lib/supabase';
import {
  ReflectionService, mondayOf,
  type ReflectionWithIntentions,
} from '../../services/ReflectionService';

const PROJECT_HEX: Record<string, string> = {
  cyan: '#22d3ee', blue: '#3b82f6', violet: '#8b5cf6',
  emerald: '#10b981', amber: '#f59e0b', rose: '#f43f5e',
};
function projectChipHex(token: string | null): string {
  if (!token) return '#94a3b8';
  return PROJECT_HEX[token] ?? token;
}

const ENERGY_OPTIONS: Array<{ id: CoreTask['energy']; label: string; icon: typeof Zap; tone: string }> = [
  { id: 'deep',   label: 'High',   icon: Zap,    tone: 'text-red-600 bg-red-50 ring-red-200' },
  { id: 'medium', label: 'Medium', icon: Leaf,   tone: 'text-emerald-700 bg-emerald-50 ring-emerald-200' },
  { id: 'light',  label: 'Low',    icon: Coffee, tone: 'text-amber-700 bg-amber-50 ring-amber-200' },
];

export function TaskEditModal({
  task,
  onClose,
}: {
  task: CoreTask;
  onClose: () => void;
}) {
  const { state: { projects, activeSpaceId }, updateTaskAsync, refreshProjects } = useCoreData();
  const [title, setTitle] = useState(task.title);
  const [projectId, setProjectId] = useState<string | null>(task.projectId);
  const [intentionId, setIntentionId] = useState<string | null>(task.weeklyIntentionId ?? null);
  const [energy, setEnergy] = useState<CoreTask['energy']>(task.energy);
  const [intentions, setIntentions] = useState<ReflectionWithIntentions['intentions']>([]);
  const [saving, setSaving] = useState(false);

  // Inline project creation (no projects yet, or "+ New" tapped)
  const [showNewProject, setShowNewProject] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [creatingProject, setCreatingProject] = useState(false);

  // Fetch this week's intentions so the user can pick one
  useEffect(() => {
    ReflectionService.getReflectionByWeek(mondayOf())
      .then((r) => setIntentions(r?.intentions ?? []))
      .catch(() => setIntentions([]));
  }, []);

  async function handleCreateProject() {
    const name = newProjectName.trim();
    if (!name || creatingProject) return;
    setCreatingProject(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');
      if (!activeSpaceId) throw new Error('Personal space not ready');

      const created = await ProjectService.createProject({
        space_id: activeSpaceId,
        created_by: user.id,
        title: name,
        status: 'active',
        color: 'violet',
      });
      // Refresh the projects list in context so the new project appears
      await refreshProjects();
      // Auto-select it for the task
      setProjectId(created.id);
      setShowNewProject(false);
      setNewProjectName('');
    } catch (err) {
      console.error('[TaskEditModal] create project failed:', err);
    } finally {
      setCreatingProject(false);
    }
  }

  async function handleSave() {
    if (saving) return;
    const trimmed = title.trim();
    if (!trimmed) return;
    setSaving(true);
    try {
      await updateTaskAsync(task.id, {
        title: trimmed !== task.title ? trimmed : undefined,
        projectId: projectId !== task.projectId ? projectId : undefined,
        weeklyIntentionId:
          intentionId !== (task.weeklyIntentionId ?? null) ? intentionId : undefined,
        energy: energy !== task.energy ? energy : undefined,
      });
      onClose();
    } catch (err) {
      console.error('[TaskEditModal] save failed:', err);
      setSaving(false);
    }
  }

  return createPortal(
    <div
      className="fixed inset-0 z-[70] bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4"
      onClick={onClose}
    >
      <div
        className="w-full sm:max-w-md bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-3 shrink-0">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest stitch-text-secondary">Edit task</p>
            <h2 className="text-base font-bold stitch-text-primary mt-0.5">Tweak the details</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="w-8 h-8 rounded-full flex items-center justify-center stitch-text-secondary hover:bg-surface-container transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="px-5 pb-2 space-y-4 overflow-y-auto">
          {/* Title */}
          <div>
            <label className="text-[10px] font-bold uppercase tracking-widest stitch-text-secondary mb-1.5 block">
              Title
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleSave(); }}
              maxLength={200}
              autoFocus
              className="w-full px-3 py-2.5 rounded-xl bg-surface-container-low text-sm stitch-text-primary outline-none focus:ring-2 focus:ring-primary/30"
              placeholder="What's the task?"
            />
          </div>

          {/* Project */}
          <div>
            <label className="text-[10px] font-bold uppercase tracking-widest stitch-text-secondary mb-1.5 block">
              <FolderOpen size={10} className="inline-block mr-1 -mt-0.5" />
              Project
            </label>

            {/* Pills row */}
            <div className="flex flex-wrap gap-1.5">
              <PillButton
                label="Inbox · no project"
                selected={projectId === null}
                onClick={() => setProjectId(null)}
              />
              {projects.map((p) => (
                <PillButton
                  key={p.id}
                  label={p.name}
                  color={p.color}
                  selected={projectId === p.id}
                  onClick={() => setProjectId(p.id)}
                />
              ))}
              {/* Inline + New project chip */}
              {!showNewProject && (
                <button
                  type="button"
                  onClick={() => setShowNewProject(true)}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-bold bg-primary/10 text-primary hover:bg-primary/20 transition-colors active:scale-95"
                >
                  <Plus size={11} strokeWidth={2.5} /> New project
                </button>
              )}
            </div>

            {/* Empty-state hint when no projects exist yet */}
            {projects.length === 0 && !showNewProject && (
              <p className="text-[10px] stitch-text-secondary mt-1.5 leading-relaxed">
                You don't have any projects yet. Tap <strong className="stitch-text-primary">+ New project</strong> to create one — or leave this task in your inbox.
              </p>
            )}

            {/* Inline new-project input */}
            {showNewProject && (
              <div className="mt-2 flex items-center gap-2 px-3 py-2 rounded-xl bg-surface-container-low ring-1 ring-primary/20">
                <Plus size={12} className="text-primary shrink-0" />
                <input
                  type="text"
                  value={newProjectName}
                  onChange={(e) => setNewProjectName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') { e.preventDefault(); handleCreateProject(); }
                    if (e.key === 'Escape') { setShowNewProject(false); setNewProjectName(''); }
                  }}
                  autoFocus
                  placeholder="Project name (e.g. Ship pitch deck)"
                  maxLength={80}
                  className="flex-1 bg-transparent text-sm stitch-text-primary placeholder:stitch-text-secondary outline-none min-w-0"
                />
                {newProjectName.trim() && (
                  <button
                    type="button"
                    onClick={handleCreateProject}
                    disabled={creatingProject}
                    className="shrink-0 inline-flex items-center gap-1 text-[11px] font-bold text-white bg-primary hover:opacity-90 px-2.5 py-1 rounded-full transition-opacity disabled:opacity-50"
                  >
                    {creatingProject ? <Loader2 size={11} className="animate-spin" /> : 'Create'}
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => { setShowNewProject(false); setNewProjectName(''); }}
                  className="shrink-0 w-5 h-5 rounded-full flex items-center justify-center stitch-text-secondary hover:bg-surface-container transition-colors"
                  aria-label="Cancel"
                >
                  <X size={12} />
                </button>
              </div>
            )}
          </div>

          {/* Weekly intention */}
          {intentions.length > 0 && (
            <div>
              <label className="text-[10px] font-bold uppercase tracking-widest stitch-text-secondary mb-1.5 block">
                <Target size={10} className="inline-block mr-1 -mt-0.5" />
                Weekly intention
              </label>
              <div className="flex flex-wrap gap-1.5">
                <PillButton
                  label="None"
                  selected={intentionId === null}
                  onClick={() => setIntentionId(null)}
                />
                {intentions.map((it) => (
                  <PillButton
                    key={it.id}
                    label={it.title}
                    selected={intentionId === it.id}
                    onClick={() => setIntentionId(it.id)}
                    tint="violet"
                  />
                ))}
              </div>
              <p className="text-[10px] stitch-text-secondary mt-1.5 leading-relaxed">
                Linking auto-completes the intention when this task is done.
              </p>
            </div>
          )}

          {/* Energy */}
          <div>
            <label className="text-[10px] font-bold uppercase tracking-widest stitch-text-secondary mb-1.5 block">
              Energy required
            </label>
            <div className="grid grid-cols-3 gap-1.5">
              {ENERGY_OPTIONS.map((opt) => {
                const Icon = opt.icon;
                const sel = energy === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setEnergy(opt.id)}
                    className={`flex flex-col items-center gap-1 py-2.5 rounded-xl transition-all active:scale-95 ${
                      sel
                        ? `${opt.tone} ring-2 shadow-sm`
                        : 'bg-surface-container-low stitch-text-secondary ring-1 ring-surface-container hover:bg-surface-container'
                    }`}
                  >
                    <Icon size={14} />
                    <span className="text-xs font-bold">{opt.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer actions */}
        <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-surface-container shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-full text-sm font-semibold stitch-text-secondary hover:bg-surface-container transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving || !title.trim()}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-bold bg-primary text-white hover:opacity-90 transition-opacity disabled:opacity-50 active:scale-95"
          >
            {saving ? <Loader2 size={13} className="animate-spin" /> : null}
            Save
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

function PillButton({
  label, color = null, selected, onClick, tint = 'primary',
}: {
  label: string;
  color?: string | null;
  selected: boolean;
  onClick: () => void;
  tint?: 'primary' | 'violet';
}) {
  const selectedClasses =
    tint === 'violet'
      ? 'bg-violet-500 text-white shadow-sm'
      : 'bg-primary text-white shadow-sm';
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all active:scale-95 ${
        selected
          ? selectedClasses
          : 'bg-surface-container-low stitch-text-primary hover:bg-surface-container'
      }`}
    >
      {color && (
        <span
          className="w-1.5 h-1.5 rounded-full shrink-0"
          style={{ backgroundColor: projectChipHex(color) }}
        />
      )}
      <span className="truncate max-w-[160px]">{label}</span>
    </button>
  );
}
