/**
 * QuickStartTemplates — six tappable tiles that kill the blank-page problem.
 *
 * Each tile is a common founder/creator focus pattern. Tap one and we open
 * DeclareSessionModal with the goal and duration pre-filled, so the user is
 * one extra confirm away from starting. This is the highest-leverage piece
 * of furniture on the home page for activation: it replaces "what should I
 * focus on?" hesitation with "oh that's me, let's go."
 *
 * Templates are intentionally generic across creative work types — none of
 * them are dev-coded, none assume a specific tool.
 */

import {
  Mail, PenLine, Phone, Brain, Layers, Sparkles,
} from 'lucide-react';

type Template = {
  id: string;
  icon: typeof Mail;
  label: string;
  goal: string;
  duration: 25 | 50 | 90;
  tone: 'cyan' | 'violet' | 'amber' | 'emerald' | 'rose' | 'blue';
};

const TEMPLATES: Template[] = [
  { id: 'inbox',    icon: Mail,     label: 'Inbox zero',   goal: 'Process inbox to zero',                  duration: 25, tone: 'cyan' },
  { id: 'write',    icon: PenLine,  label: 'Write',        goal: 'Write 500 focused words',                duration: 50, tone: 'violet' },
  { id: 'call',     icon: Phone,    label: 'Sales call',   goal: 'Prep + make one sales call',             duration: 25, tone: 'rose' },
  { id: 'deep',     icon: Brain,    label: 'Deep work',    goal: 'Deep work on the hardest thing',         duration: 90, tone: 'amber' },
  { id: 'admin',    icon: Layers,   label: 'Admin pile',   goal: 'Knock out the admin pile',               duration: 25, tone: 'emerald' },
  { id: 'thinking', icon: Sparkles, label: 'Strategy',     goal: 'Think clearly about one big question',   duration: 90, tone: 'blue' },
];

const TONE_STYLES: Record<Template['tone'], { bg: string; iconBg: string; iconText: string; ring: string }> = {
  cyan:    { bg: 'bg-cyan-50',    iconBg: 'bg-cyan-100',    iconText: 'text-cyan-700',    ring: 'hover:ring-cyan-300/60' },
  violet:  { bg: 'bg-violet-50',  iconBg: 'bg-violet-100',  iconText: 'text-violet-700',  ring: 'hover:ring-violet-300/60' },
  amber:   { bg: 'bg-amber-50',   iconBg: 'bg-amber-100',   iconText: 'text-amber-700',   ring: 'hover:ring-amber-300/60' },
  emerald: { bg: 'bg-emerald-50', iconBg: 'bg-emerald-100', iconText: 'text-emerald-700', ring: 'hover:ring-emerald-300/60' },
  rose:    { bg: 'bg-rose-50',    iconBg: 'bg-rose-100',    iconText: 'text-rose-700',    ring: 'hover:ring-rose-300/60' },
  blue:    { bg: 'bg-blue-50',    iconBg: 'bg-blue-100',    iconText: 'text-blue-700',    ring: 'hover:ring-blue-300/60' },
};

export function QuickStartTemplates({
  onPick,
}: {
  onPick: (goal: string, duration: 25 | 50 | 90) => void;
}) {
  return (
    <section>
      <div className="flex items-center justify-between mb-3">
        <p className="text-[10px] font-bold stitch-text-secondary tracking-widest uppercase">
          Start in one tap
        </p>
        <p className="text-[10px] stitch-text-secondary">
          Pick a pattern, jump in.
        </p>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
        {TEMPLATES.map((t) => {
          const Icon = t.icon;
          const style = TONE_STYLES[t.tone];
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => onPick(t.goal, t.duration)}
              className={`group flex items-center gap-3 ${style.bg} rounded-2xl p-3 text-left transition-all hover:-translate-y-0.5 hover:shadow-md active:scale-[0.98] ring-1 ring-transparent ${style.ring}`}
            >
              <div className={`w-9 h-9 rounded-xl ${style.iconBg} flex items-center justify-center shrink-0`}>
                <Icon size={16} className={style.iconText} strokeWidth={2} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold stitch-text-primary leading-tight truncate">
                  {t.label}
                </p>
                <p className="text-[10px] font-semibold stitch-text-secondary mt-0.5">
                  {t.duration} min
                </p>
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
}
