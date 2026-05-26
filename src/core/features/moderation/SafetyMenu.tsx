/**
 * SafetyMenu — small "…" trigger that opens a popover with Block + Report.
 *
 * Used on PersonCard, PersonDetailSheet, message-thread headers, etc. The
 * existing ReportModal handles flag submission; this just exposes the
 * actions in a consistent place across the app.
 *
 * Compact by design: this is a safety lever, not a primary action, so it
 * lives off to the side rather than competing with Connect / Message.
 */

import { useState } from 'react';
import { MoreHorizontal, Flag, UserX, Loader2 } from 'lucide-react';
import { blockUser } from '../../services/ModerationService';
import { ReportModal } from './ReportModal';
import { showToast } from '../../../components/Toast';

interface Props {
  targetUserId:   string;
  targetUserName: string;
  /** Where the user was when they opened the menu — captured into the
   *  flag's content_snapshot so admins know the context. */
  contextUrl?:    string;
  onBlocked?:     () => void;
  /** When set, the report is treated as fired inside an active session
   *  and the ReportModal will capture a video frame + chat transcript
   *  as evidence. Plumbed through to ReportModal.sessionContext. */
  sessionContext?: {
    dailyParticipantId?: string;
    focusSessionId?:     string;
  };
}

export function SafetyMenu({ targetUserId, targetUserName, contextUrl, onBlocked, sessionContext }: Props) {
  const [open, setOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [confirmBlock, setConfirmBlock] = useState(false);
  const [blocking, setBlocking] = useState(false);

  async function handleBlock() {
    if (blocking) return;
    setBlocking(true);
    try {
      await blockUser(targetUserId);
      setConfirmBlock(false);
      setOpen(false);
      onBlocked?.();
    } catch (err) {
      console.error('[SafetyMenu] block failed:', err);
      showToast('error', 'Could not block this user. Please try again.');
    } finally {
      setBlocking(false);
    }
  }

  return (
    <>
      <div className="relative">
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); setOpen((v) => !v); }}
          title="More options"
          aria-label="More options"
          className="w-9 h-9 rounded-full flex items-center justify-center bg-white/80 sm:bg-transparent hover:bg-surface-container-low stitch-text-secondary transition-colors"
        >
          <MoreHorizontal size={16} />
        </button>

        {open && (
          <>
            {/* Click-out scrim */}
            <button
              type="button"
              aria-hidden="true"
              tabIndex={-1}
              onClick={() => setOpen(false)}
              className="fixed inset-0 z-40"
            />
            <div className="absolute right-0 top-8 z-50 w-44 rounded-xl bg-white shadow-lg ring-1 ring-surface-container py-1 overflow-hidden">
              <MenuItem
                icon={<Flag size={12} />}
                label="Report"
                onClick={() => { setOpen(false); setReportOpen(true); }}
              />
              <MenuItem
                icon={<UserX size={12} />}
                label="Block"
                onClick={() => { setOpen(false); setConfirmBlock(true); }}
                tone="danger"
              />
            </div>
          </>
        )}
      </div>

      {/* ── Confirm block ─────────────────────────────────────────── */}
      {confirmBlock && (
        <div
          className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/50"
          onClick={() => !blocking && setConfirmBlock(false)}
        >
          <div
            className="w-full sm:max-w-sm bg-white rounded-t-3xl sm:rounded-2xl p-5 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-rose-50 flex items-center justify-center shrink-0">
                <UserX size={18} className="text-rose-600" />
              </div>
              <div>
                <p className="text-base font-bold stitch-text-primary leading-tight">
                  Block {targetUserName}?
                </p>
                <p className="text-xs stitch-text-secondary mt-0.5">
                  They won't see you, message you, or appear in your feed.
                </p>
              </div>
            </div>
            <p className="text-[11px] stitch-text-secondary leading-relaxed mb-4">
              You can unblock them later from Settings. Blocking is private —
              the other person isn't notified.
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setConfirmBlock(false)}
                disabled={blocking}
                className="flex-1 py-2.5 rounded-xl bg-surface-container-low stitch-text-primary text-sm font-bold hover:bg-surface-container transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleBlock}
                disabled={blocking}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-sm font-bold transition-colors active:scale-95 disabled:opacity-60 flex items-center justify-center gap-1.5"
              >
                {blocking && <Loader2 size={12} className="animate-spin" />}
                Block
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Report modal ─────────────────────────────────────────── */}
      {reportOpen && (
        <ReportModal
          contentType="user"
          contentId={targetUserId}
          flaggedUserId={targetUserId}
          contentSnapshot={contextUrl}
          sessionContext={sessionContext}
          onClose={() => setReportOpen(false)}
        />
      )}
    </>
  );
}

function MenuItem({
  icon, label, onClick, tone,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  tone?: 'danger';
}) {
  const colour = tone === 'danger' ? 'text-rose-700 hover:bg-rose-50' : 'stitch-text-primary hover:bg-surface-container-low';
  return (
    <button
      type="button"
      onClick={onClick}
      // py-2.5 keeps each menu item ≥ 36px tall — comfortable to tap on
      // touch devices without making the dropdown feel oversized on desktop.
      className={`w-full flex items-center gap-2 px-3 py-2.5 text-xs font-bold text-left transition-colors ${colour}`}
    >
      {icon}
      {label}
    </button>
  );
}
