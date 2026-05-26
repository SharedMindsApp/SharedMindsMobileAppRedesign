// ShareChooserSheet
//
// Tiny picker that disambiguates the two sharing modes before opening
// the heavy sheet. They look the same from the outside ("share this
// project") but mean very different things:
//
//   • Coworker invite        → project_members row, full read/write.
//                              They help do the work.
//   • Accountability share   → read-only public token, no account.
//                              They just witness progress.
//
// Without this picker the "Share" button was ambiguous and users had
// no way to invite a coworker without digging into Edit → Members.

import { X, Users, Link2 } from 'lucide-react';

interface Props {
  onPickCoworker: () => void;
  onPickAccountability: () => void;
  onClose: () => void;
}

export function ShareChooserSheet({ onPickCoworker, onPickAccountability, onClose }: Props) {
  return (
    <div
      className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/20 backdrop-blur-md"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full sm:max-w-md bg-surface rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3 px-5 pt-5 pb-3">
          <div>
            <h2 className="text-lg font-extrabold stitch-text-primary leading-tight">
              Share this project
            </h2>
            <p className="text-xs stitch-text-secondary mt-0.5">
              Who are you bringing in?
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 w-8 h-8 rounded-full grid place-items-center stitch-text-secondary hover:bg-surface-container-low"
            aria-label="Close"
          >
            <X size={16} />
          </button>
        </div>

        {/* Options */}
        <div className="px-5 pb-5 space-y-2">
          {/* Coworker */}
          <button
            type="button"
            onClick={onPickCoworker}
            className="w-full text-left rounded-2xl bg-surface-container-low hover:bg-surface-container transition-colors p-4 flex items-start gap-3"
          >
            <div className="w-10 h-10 rounded-2xl bg-sky-50 ring-1 ring-sky-100 grid place-items-center shrink-0">
              <Users size={18} className="text-sky-600" strokeWidth={2.5} />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-extrabold stitch-text-primary">
                Invite a coworker
              </p>
              <p className="text-xs stitch-text-secondary leading-snug mt-0.5">
                They can edit tasks, log sessions, and help move the project
                forward. Requires a SharedMinds account.
              </p>
            </div>
          </button>

          {/* Accountability */}
          <button
            type="button"
            onClick={onPickAccountability}
            className="w-full text-left rounded-2xl bg-surface-container-low hover:bg-surface-container transition-colors p-4 flex items-start gap-3"
          >
            <div className="w-10 h-10 rounded-2xl bg-violet-50 ring-1 ring-violet-100 grid place-items-center shrink-0">
              <Link2 size={18} className="text-violet-600" strokeWidth={2.5} />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-extrabold stitch-text-primary">
                Share for accountability
              </p>
              <p className="text-xs stitch-text-secondary leading-snug mt-0.5">
                A read-only view of your progress for a partner, friend or
                parent. No account needed on their side.
              </p>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}
