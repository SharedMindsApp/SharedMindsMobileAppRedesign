/**
 * ProjectEditorModal — create or edit a project.
 *
 * Sectioned bottom sheet (mobile) / centered modal (desktop):
 *   1. Basics — title + "what does done look like?"
 *   2. Colour — labeled swatches with a clear checkmark on the selected one
 *   3. Members — preview avatars + invite (existing projects only)
 *   4. Danger zone — archive (existing projects only)
 *
 * The earlier layout mashed all sections into one scroll with no visual
 * grouping; the new one uses subtle ring-1 cards per section so the
 * heaviest action (archive) is clearly separated from the save flow.
 */

import { useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Archive, Loader2, Target, UserPlus, Check, AlertTriangle, Trash2, ImageIcon, Upload, Link2 } from 'lucide-react';
import { useAuth } from '../../auth/AuthProvider';
import { useCoreData } from '../../data/CoreDataContext';
import { ProjectService, type Project, type ProjectMemberWithProfile } from '../../services/ProjectService';
import { InputWell } from '../../ui/CorePage';
import { PROJECT_COLORS } from './ProjectsPage';
import { InviteCollaboratorSheet } from './InviteCollaboratorSheet';
import { ShareForAccountabilitySheet } from './ShareForAccountabilitySheet';
import { CoverPositioner } from './CoverPositioner';
import { DeleteProjectConfirm } from './DeleteProjectConfirm';

const COLOR_LABELS: Record<string, string> = {
  cyan:    'Cyan',
  blue:    'Blue',
  violet:  'Violet',
  emerald: 'Emerald',
  amber:   'Amber',
  rose:    'Rose',
  indigo:  'Indigo',
  sky:     'Sky',
  teal:    'Teal',
  lime:    'Lime',
  orange:  'Orange',
  fuchsia: 'Fuchsia',
};

type Props = {
  /** Pass a project to edit; omit to create. */
  project?: Project;
  /** Existing members to preview (passed from ProjectDetailPage to avoid a
   *  duplicate fetch). Only used when editing. */
  members?: ProjectMemberWithProfile[];
  onClose: () => void;
  onSaved?: (project: Project) => void;
  onArchived?: () => void;
  /** Fires after a successful hard delete. Defaults to onArchived so
   *  existing callers naturally navigate away. */
  onDeleted?: () => void;
};

export function ProjectEditorModal({ project, members = [], onClose, onSaved, onArchived, onDeleted }: Props) {
  const { user } = useAuth();
  const { state: { spaces, projects }, refreshProjects } = useCoreData();
  const isNew = !project;
  // Colours used by the user's OTHER active projects — flag duplicates.
  const takenColours = new Set(
    projects.filter((p) => p.status === 'active' && p.id !== project?.id && p.color).map((p) => p.color as string),
  );

  const [title, setTitle] = useState(project?.title ?? '');
  const [description, setDescription] = useState(project?.description ?? '');
  const [color, setColor] = useState<string>(project?.color ?? 'blue');
  /** Live cover URL — starts from the project's stored value, updates
   *  on successful upload or remove. Drives the in-modal preview AND
   *  what the hero/cards render after save. */
  const [coverUrl, setCoverUrl] = useState<string | null>(project?.cover_image_url ?? null);
  const [coverUploading, setCoverUploading] = useState(false);
  // Focal point + zoom for the cover image. Stored as integers (0-100 for
  // position, 100-300 for zoom) to match the DB constraints exactly.
  const [coverX, setCoverX] = useState<number>(project?.cover_x ?? 50);
  const [coverY, setCoverY] = useState<number>(project?.cover_y ?? 50);
  const [coverZoom, setCoverZoom] = useState<number>(project?.cover_zoom ?? 100);
  const [coverFit, setCoverFit] = useState<'cover' | 'contain'>(project?.cover_fit ?? 'cover');
  const [coverBgColor, setCoverBgColor] = useState<string | null>(project?.cover_bg_color ?? null);
  const [coverTextColor, setCoverTextColor] = useState<'light' | 'dark'>(project?.cover_text_color ?? 'light');
  const coverInputRef = useRef<HTMLInputElement>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /** Upload only works for existing projects (we need the id for the
   *  storage path and the RLS policy). For new projects, the user can
   *  save first and then come back to add a cover. */
  async function handleCoverFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ''; // reset so the same file can be re-picked
    if (!file || !project) return;
    setCoverUploading(true);
    setError(null);
    try {
      const url = await ProjectService.uploadProjectCover(project.id, file);
      setCoverUrl(url);
      await refreshProjects();
    } catch (err: any) {
      setError(err?.message ?? 'Could not upload cover.');
    } finally {
      setCoverUploading(false);
    }
  }

  async function handleRemoveCover() {
    if (!project) return;
    setCoverUploading(true);
    setError(null);
    try {
      await ProjectService.removeProjectCover(project.id);
      setCoverUrl(null);
      await refreshProjects();
    } catch (err: any) {
      setError(err?.message ?? 'Could not remove cover.');
    } finally {
      setCoverUploading(false);
    }
  }
  const [inviteOpen, setInviteOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);

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
          cover_x: coverX,
          cover_y: coverY,
          cover_zoom: coverZoom,
          cover_fit: coverFit,
          cover_bg_color: coverBgColor,
          cover_text_color: coverTextColor,
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

  /** Hard delete — destructive. Two confirms: a high-level intent check
   *  then a "type the name" gate so it can't be a fat-finger mistake.
   *  Cascades to milestones, phases, tasks, members, notes, etc.
   *
   *  RLS only allows project owners to delete (see
   *  projects_delete_if_owner policy), so non-owners get a clear error. */
  /**
   * Delete is gated through DeleteProjectConfirm — a proper themed
   * modal (centered card on desktop, bottom-sheet on mobile) that
   * prompts the user to type the project name. Native confirm/prompt
   * are unstyled and got blocked on iOS Safari.
   */
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  function handleDelete() {
    if (!project) return;
    setShowDeleteConfirm(true);
  }
  // The actual deletion runs from inside the confirm modal's onConfirm.
  // Kept as a separate function so the older error-path branches below
  // remain valid (they're now dead but easier to leave intact).
  async function performDelete() {
    if (!project) return;
    setSubmitting(true);
    setError(null);
    try {
      await ProjectService.deleteProject(project.id);
      await refreshProjects();
      (onDeleted ?? onArchived)?.();
      onClose();
    } catch (e: any) {
      setError(e?.message ?? 'Could not delete.');
      setSubmitting(false);
      // Re-throw so the confirm modal stays open with its own error UI
      throw e;
    }
  }

  return createPortal(
    <>
    <div className="fixed inset-0 z-[90] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/20 backdrop-blur-md" onClick={onClose}>
      <div
        className="w-full sm:max-w-2xl lg:max-w-3xl bg-surface rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header — adds a left colour stripe matching the project's colour
            so the user has constant visual confirmation of what they're
            editing, plus the same close affordance as before. */}
        <div className="shrink-0 flex items-stretch border-b border-surface-container/50">
          <div className="w-1.5" style={{ backgroundColor: PROJECT_COLORS[color]?.hex }} />
          <div className="flex-1 flex items-center justify-between px-5 pt-4 pb-3">
            <div className="flex items-center gap-3">
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center"
                style={{ backgroundColor: (PROJECT_COLORS[color]?.hex ?? '#3b82f6') + '20' }}
              >
                <Target size={18} style={{ color: PROJECT_COLORS[color]?.hex }} />
              </div>
              <div>
                <h2 className="stitch-headline text-base font-extrabold leading-tight">
                  {isNew ? 'New project' : 'Edit project'}
                </h2>
                <p className="text-xs stitch-text-secondary">
                  {isNew ? "What's the macro goal?" : 'Refine title, scope, colour, sharing.'}
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
        </div>

        {/* Body — 4 sectioned cards, each ring-1 boxed for visual grouping */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">

          {/* 1. Basics */}
          <section className="rounded-2xl ring-1 ring-surface-container p-4 space-y-3">
            <SectionHeading icon={<Target size={11} />} label="Basics" />
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
          </section>

          {/* 2. Colour — bigger swatches in a 6-up grid, label below each,
              a check mark on the selected one for unambiguous state. */}
          {/* ── Cover image (existing projects only — upload needs an id) ── */}
          {!isNew && (
            <section className="rounded-2xl ring-1 ring-surface-container p-4">
              <SectionHeading
                icon={<ImageIcon size={11} className="stitch-text-secondary" />}
                label="Cover image"
              />
              <p className="text-[11px] stitch-text-secondary leading-snug mt-1 mb-3">
                Optional banner shown at the top of the project page and on cards. Falls back to the colour gradient if no image.
              </p>

              {coverUrl ? (
                // ── With cover: draggable preview + zoom slider + actions ──
                <div className="space-y-2">
                  <CoverPositioner
                    url={coverUrl}
                    x={coverX}
                    y={coverY}
                    zoom={coverZoom}
                    fit={coverFit}
                    bgColor={coverBgColor}
                    textColor={coverTextColor}
                    onChange={(next) => {
                      setCoverX(next.x);
                      setCoverY(next.y);
                      setCoverZoom(next.zoom);
                      setCoverFit(next.fit);
                      setCoverBgColor(next.bgColor);
                      setCoverTextColor(next.textColor);
                    }}
                  />
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => coverInputRef.current?.click()}
                      disabled={coverUploading}
                      className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-surface-container-low stitch-text-primary hover:bg-surface-container active:scale-[0.98] transition-all disabled:opacity-50"
                    >
                      {coverUploading
                        ? <><Loader2 size={12} className="animate-spin" /> Uploading…</>
                        : <><Upload size={12} /> Replace</>
                      }
                    </button>
                    <button
                      type="button"
                      onClick={handleRemoveCover}
                      disabled={coverUploading}
                      className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-rose-700 bg-white ring-1 ring-rose-200 hover:bg-rose-50 active:scale-[0.98] transition-all disabled:opacity-50"
                    >
                      <X size={12} /> Remove
                    </button>
                  </div>
                </div>
              ) : (
                // ── No cover: dashed dropzone-style upload button ──
                <button
                  type="button"
                  onClick={() => coverInputRef.current?.click()}
                  disabled={coverUploading}
                  className="w-full aspect-[16/9] rounded-xl border-2 border-dashed border-surface-container-high hover:border-primary/40 hover:bg-primary/5 flex flex-col items-center justify-center gap-2 transition-colors disabled:opacity-50"
                >
                  {coverUploading ? (
                    <Loader2 size={20} className="animate-spin stitch-text-secondary" />
                  ) : (
                    <>
                      <ImageIcon size={20} className="stitch-text-secondary" />
                      <span className="text-xs font-semibold stitch-text-primary">Upload cover image</span>
                      <span className="text-[10px] stitch-text-secondary">JPEG/PNG/WebP · up to 4 MB</span>
                    </>
                  )}
                </button>
              )}

              <input
                ref={coverInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={handleCoverFile}
                className="hidden"
              />
            </section>
          )}

          <section className="rounded-2xl ring-1 ring-surface-container p-4">
            <SectionHeading icon={<span className="text-[10px]">🎨</span>} label="Colour" />
            <div className="grid grid-cols-6 gap-2 mt-3">
              {Object.entries(PROJECT_COLORS).map(([key, meta]) => {
                const selected = color === key;
                const taken = takenColours.has(key);
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setColor(key)}
                    className="flex flex-col items-center gap-1 active:scale-90 transition-transform"
                    aria-label={COLOR_LABELS[key] ?? key}
                    aria-pressed={selected}
                    title={taken ? `${COLOR_LABELS[key] ?? key} · used by another project` : undefined}
                  >
                    <div
                      className={`relative w-11 h-11 rounded-2xl flex items-center justify-center transition-shadow ${
                        selected
                          ? 'ring-2 ring-offset-2 ring-offset-surface shadow-md ' + meta.ring
                          : taken ? 'shadow-sm opacity-55' : 'shadow-sm'
                      }`}
                      style={{ backgroundColor: meta.hex }}
                    >
                      {selected && <Check size={18} className="text-white" strokeWidth={3} />}
                      {taken && !selected && (
                        <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-white ring-1 ring-slate-300 grid place-items-center">
                          <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                        </span>
                      )}
                    </div>
                    <span className={`text-[10px] font-bold ${
                      selected ? meta.textDark : 'stitch-text-secondary'
                    }`}>
                      {COLOR_LABELS[key] ?? key}
                    </span>
                  </button>
                );
              })}
            </div>
            {takenColours.has(color) && (
              <p className="text-[11px] text-amber-700 mt-2 leading-snug">
                Another project already uses this colour.
              </p>
            )}
          </section>

          {/* 3. Members (existing projects only) — preview avatar stack +
              invite button. Doesn't try to be a full management surface;
              that lives in the upcoming Settings drawer. */}
          {!isNew && (
            <section className="rounded-2xl ring-1 ring-surface-container p-4">
              <SectionHeading icon={<UserPlus size={11} />} label={`Members · ${members.length || 1}`} />
              <div className="flex items-center gap-3 mt-3">
                {members.length > 0 ? (
                  <div className="flex -space-x-2 shrink-0">
                    {members.slice(0, 5).map((m) => (
                      m.avatar_url ? (
                        <img
                          key={m.id}
                          src={m.avatar_url}
                          alt={m.display_name}
                          title={m.display_name + (m.role === 'owner' ? ' (owner)' : '')}
                          className="w-9 h-9 rounded-full object-cover border-2 border-surface"
                        />
                      ) : (
                        <div
                          key={m.id}
                          title={m.display_name + (m.role === 'owner' ? ' (owner)' : '')}
                          className="w-9 h-9 rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center text-xs font-bold text-white border-2 border-surface"
                        >
                          {m.display_name.charAt(0).toUpperCase()}
                        </div>
                      )
                    ))}
                    {members.length > 5 && (
                      <div className="w-9 h-9 rounded-full bg-surface-container flex items-center justify-center text-[10px] font-bold stitch-text-secondary border-2 border-surface">
                        +{members.length - 5}
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-xs stitch-text-secondary italic">Just you for now.</p>
                )}
                <button
                  type="button"
                  onClick={() => setInviteOpen(true)}
                  className="ml-auto inline-flex items-center gap-1.5 px-3 py-2 rounded-full bg-surface-container-low stitch-text-primary text-xs font-bold hover:bg-surface-container transition-colors"
                >
                  <UserPlus size={12} />
                  Invite
                </button>
              </div>
            </section>
          )}

          {/* 3b. Share for accountability (existing projects only) — generate a
              read-only public link recipients can view without an account. */}
          {!isNew && (
            <section className="rounded-2xl ring-1 ring-violet-100 bg-violet-50/40 p-4">
              <SectionHeading icon={<Link2 size={11} className="text-violet-600" />} label="Share for accountability" />
              <div className="flex items-center justify-between gap-3 mt-3">
                <p className="text-[11px] stitch-text-secondary leading-snug min-w-0">
                  Give a partner, friend, or family member a read-only view of
                  your progress — no account needed.
                </p>
                <button
                  type="button"
                  onClick={() => setShareOpen(true)}
                  className="shrink-0 inline-flex items-center gap-1.5 px-3 py-2 rounded-full bg-violet-600 text-white text-xs font-bold hover:bg-violet-700 transition-colors"
                >
                  <Link2 size={12} />
                  Manage links
                </button>
              </div>
            </section>
          )}

          {/* 4. Danger zone (existing projects only) — clearly separated by
              ring colour + label. Archive = soft delete (recoverable from
              backend), Delete = permanent cascade through milestones, phases,
              tasks, notes, members. Delete uses two confirms (intent + name)
              and is gated by RLS to project owners only. */}
          {!isNew && (
            <section className="rounded-2xl ring-1 ring-rose-200/50 p-4 bg-rose-50/30">
              <SectionHeading
                icon={<AlertTriangle size={11} className="text-rose-600" />}
                label="Danger zone"
                tone="danger"
              />

              {/* Archive — softer option, hides from list, reversible from DB */}
              <div className="flex items-center justify-between gap-3 mt-3">
                <div className="min-w-0">
                  <p className="text-sm font-bold stitch-text-primary">Archive this project</p>
                  <p className="text-[11px] stitch-text-secondary leading-snug mt-0.5">
                    Hides it from your list. Past sessions and tasks stay accessible.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleArchive}
                  disabled={submitting}
                  className="shrink-0 inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-rose-700 bg-white ring-1 ring-rose-200 hover:bg-rose-50 transition-colors disabled:opacity-50"
                >
                  <Archive size={12} /> Archive
                </button>
              </div>

              {/* Divider between soft + hard delete */}
              <div className="border-t border-rose-200/60 my-3" />

              {/* Delete — permanent, two-step confirm */}
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-bold text-rose-700">Delete permanently</p>
                  <p className="text-[11px] stitch-text-secondary leading-snug mt-0.5">
                    Removes the project, milestones, phases, tasks, notes, and members. No undo.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={submitting}
                  className="shrink-0 inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 active:scale-95 transition-all disabled:opacity-50"
                >
                  <Trash2 size={12} /> Delete
                </button>
              </div>
            </section>
          )}

          {error && (
            <p className="text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>
          )}
        </div>

        {/* Footer — single Save action, no competing Archive button. The
            danger zone owns destructive actions; this row is pure commit. */}
        <div className="shrink-0 px-5 pt-3 pb-5 border-t border-surface-container/50 flex items-center gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="px-4 py-2.5 rounded-xl text-sm font-bold bg-surface-container-low stitch-text-primary hover:bg-surface-container transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
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
            {submitting ? <Loader2 size={14} className="animate-spin" /> : (isNew ? 'Create project' : 'Save changes')}
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

    {shareOpen && project && (
      <ShareForAccountabilitySheet
        projectId={project.id}
        projectTitle={project.title}
        onClose={() => setShareOpen(false)}
      />
    )}

    {showDeleteConfirm && project && (
      <DeleteProjectConfirm
        projectName={project.title}
        detail="This removes the project, its milestones, phases, tasks, notes, and member list — everything except sessions you've already had (those keep an unlinked record)."
        onConfirm={performDelete}
        onClose={() => setShowDeleteConfirm(false)}
      />
    )}
    </>,
    document.body,
  );
}

// ── Helpers ─────────────────────────────────────────────────────────────

function SectionHeading({
  icon, label, tone,
}: {
  icon: React.ReactNode;
  label: string;
  tone?: 'danger';
}) {
  const tint = tone === 'danger' ? 'text-rose-700' : 'stitch-text-secondary';
  return (
    <div className={`flex items-center gap-1.5 ${tint}`}>
      <span className="opacity-80">{icon}</span>
      <p className="text-[10px] font-bold tracking-widest uppercase">{label}</p>
    </div>
  );
}
