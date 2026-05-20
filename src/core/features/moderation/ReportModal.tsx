/**
 * ReportModal — bottom-sheet report UI.
 *
 * Used across chat, DMs, community posts, and sessions.
 * Steps: reason picker → optional notes → confirmation.
 *
 * Usage:
 *   <ReportModal
 *     contentType="chat"
 *     contentId={msg.id}
 *     flaggedUserId={msg.user_id}
 *     contentSnapshot={msg.content}
 *     onClose={() => setReportTarget(null)}
 *   />
 */

import { useState } from 'react';
import { X, Flag, AlertTriangle, MessageSquareWarning, Ban, ShieldAlert, HelpCircle, ChevronRight, CheckCircle2, Loader2, UserX } from 'lucide-react';
import {
  flagContent, blockUser,
  FLAG_REASON_LABELS, CONTENT_TYPE_LABELS,
  type ContentType, type FlagReason,
} from '../../services/ModerationService';

interface ReportModalProps {
  contentType:      ContentType;
  contentId:        string;
  flaggedUserId:    string;
  contentSnapshot?: string;
  onClose:          () => void;
}

type Step = 'reason' | 'notes' | 'done';

const REASON_OPTIONS: { value: FlagReason; icon: typeof Flag; description: string }[] = [
  { value: 'harassment',     icon: MessageSquareWarning, description: 'Targeting, threatening, or bullying someone' },
  { value: 'hate_speech',    icon: Ban,                  description: 'Content that dehumanises based on identity' },
  { value: 'spam',           icon: AlertTriangle,        description: 'Repetitive, unsolicited, or off-topic content' },
  { value: 'inappropriate',  icon: ShieldAlert,          description: 'Explicit, graphic, or adult content' },
  { value: 'safety_concern', icon: AlertTriangle,        description: 'Content suggesting risk of harm to self or others' },
  { value: 'other',          icon: HelpCircle,           description: 'Something else — please add details below' },
];

export function ReportModal({
  contentType, contentId, flaggedUserId, contentSnapshot, onClose,
}: ReportModalProps) {
  const [step, setStep] = useState<Step>('reason');
  const [reason, setReason] = useState<FlagReason | null>(null);
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [alsoBlock, setAlsoBlock] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit() {
    if (!reason) return;
    setSubmitting(true);
    setError(null);
    try {
      await flagContent({
        contentType,
        contentId,
        flaggedUserId,
        reason,
        notes: notes.trim() || undefined,
        contentSnapshot,
      });
      if (alsoBlock) {
        await blockUser(flaggedUserId).catch(() => {}); // non-fatal
      }
      setStep('done');
    } catch (e: any) {
      setError(e?.message ?? 'Could not submit report. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center bg-black/50"
      onClick={onClose}
    >
      <div
        className="w-full sm:max-w-sm bg-surface rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col max-h-[85vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1 sm:hidden">
          <div className="w-10 h-1 rounded-full bg-surface-container" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-4 pb-3 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-red-50 flex items-center justify-center">
              <Flag size={17} className="text-red-600" />
            </div>
            <div>
              <h2 className="text-base font-extrabold stitch-text-primary leading-tight">
                {step === 'done' ? 'Report submitted' : 'Report content'}
              </h2>
              <p className="text-xs stitch-text-secondary">
                {CONTENT_TYPE_LABELS[contentType]}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full bg-surface-container-low hover:bg-surface-container"
          >
            <X size={15} className="stitch-text-secondary" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 pb-6">

          {/* ── Step: reason ── */}
          {step === 'reason' && (
            <div className="space-y-2">
              <p className="text-xs stitch-text-secondary mb-3">
                What's the problem with this content?
              </p>
              {REASON_OPTIONS.map(({ value, icon: Icon, description }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => { setReason(value); setStep('notes'); }}
                  className="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl bg-surface-container-low hover:bg-surface-container active:scale-[0.99] transition-all text-left ring-1 ring-surface-container/60"
                >
                  <Icon size={16} className="stitch-text-secondary shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold stitch-text-primary">{FLAG_REASON_LABELS[value]}</p>
                    <p className="text-[11px] stitch-text-secondary leading-snug">{description}</p>
                  </div>
                  <ChevronRight size={14} className="stitch-text-secondary shrink-0" />
                </button>
              ))}
            </div>
          )}

          {/* ── Step: notes + confirm ── */}
          {step === 'notes' && reason && (
            <div className="space-y-4">
              {/* Selected reason recap */}
              <div className="flex items-center gap-2 px-3 py-2 bg-red-50 rounded-xl">
                <Flag size={13} className="text-red-600 shrink-0" />
                <span className="text-xs font-bold text-red-700">{FLAG_REASON_LABELS[reason]}</span>
                <button
                  type="button"
                  onClick={() => setStep('reason')}
                  className="ml-auto text-[10px] text-red-500 hover:text-red-700 font-semibold"
                >
                  Change
                </button>
              </div>

              {/* Content preview */}
              {contentSnapshot && (
                <div className="px-3 py-2.5 bg-surface-container-low rounded-xl">
                  <p className="text-[10px] font-bold stitch-text-secondary uppercase tracking-wider mb-1">Content being reported</p>
                  <p className="text-xs stitch-text-primary leading-snug line-clamp-3">
                    "{contentSnapshot}"
                  </p>
                </div>
              )}

              {/* Notes */}
              <div>
                <label className="text-[10px] font-bold stitch-text-secondary uppercase tracking-wider mb-1.5 block">
                  Additional context <span className="font-normal normal-case">(optional)</span>
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value.slice(0, 500))}
                  placeholder="Add any details that might help our moderation team…"
                  rows={3}
                  className="w-full px-3 py-2.5 bg-surface-container-low rounded-xl text-sm stitch-text-primary placeholder:stitch-text-secondary outline-none focus:ring-2 focus:ring-primary/20 resize-none"
                />
                <p className="text-[10px] stitch-text-secondary text-right mt-0.5">{notes.length}/500</p>
              </div>

              {/* Block option */}
              <button
                type="button"
                onClick={() => setAlsoBlock((v) => !v)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-all ring-1 ${
                  alsoBlock
                    ? 'bg-rose-50 ring-rose-200 text-rose-700'
                    : 'bg-surface-container-low ring-surface-container/60 stitch-text-primary'
                }`}
              >
                <UserX size={15} className="shrink-0" />
                <div className="flex-1">
                  <p className="text-sm font-semibold">Also block this person</p>
                  <p className="text-[11px] opacity-70">They won't be able to message you or see you in community feeds</p>
                </div>
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                  alsoBlock ? 'bg-rose-600 border-rose-600' : 'border-surface-container'
                }`}>
                  {alsoBlock && <CheckCircle2 size={12} className="text-white" />}
                </div>
              </button>

              {error && (
                <p className="text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>
              )}

              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setStep('reason')}
                  className="flex-1 py-3 rounded-xl text-sm font-semibold bg-surface-container-low stitch-text-primary hover:bg-surface-container transition-colors"
                >
                  Back
                </button>
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={submitting}
                  className="flex-1 py-3 rounded-xl text-sm font-bold bg-red-600 text-white hover:bg-red-700 disabled:opacity-60 transition-colors flex items-center justify-center gap-2"
                >
                  {submitting
                    ? <><Loader2 size={14} className="animate-spin" /> Sending…</>
                    : 'Submit report'}
                </button>
              </div>
            </div>
          )}

          {/* ── Step: done ── */}
          {step === 'done' && (
            <div className="flex flex-col items-center text-center py-6 space-y-4">
              <div className="w-16 h-16 rounded-full bg-emerald-50 flex items-center justify-center">
                <CheckCircle2 size={32} className="text-emerald-500" />
              </div>
              <div>
                <p className="text-base font-extrabold stitch-text-primary mb-1">
                  Thank you for reporting
                </p>
                <p className="text-sm stitch-text-secondary leading-relaxed max-w-[280px]">
                  Our moderation team will review this within 24 hours.
                  {alsoBlock && ' The user has been blocked.'}
                </p>
              </div>
              <p className="text-xs stitch-text-secondary max-w-[260px] leading-relaxed">
                SharedMinds keeps a full record of all reports to ensure
                community safety and meet our legal obligations.
              </p>
              <button
                type="button"
                onClick={onClose}
                className="mt-2 px-6 py-2.5 rounded-full bg-surface-container stitch-text-primary text-sm font-semibold hover:bg-surface-container-low"
              >
                Done
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
