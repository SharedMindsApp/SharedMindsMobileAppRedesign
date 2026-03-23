import type { ReactNode } from 'react';

/* ═══════════════════════════════════════════════════════════════════
   SharedMinds "Cognitive Sanctuary" Component Library
   ─────────────────────────────────────────────────────────────────
   Design tokens reference (from Stitch DESIGN.md):
   ● Surface hierarchy: surface → surface-container-low → surface-container → white
   ● No hard 1px borders. Boundaries via tonal shifts + ambient shadow.
   ● Typography: Manrope (headlines), Plus Jakarta Sans (body)
   ● Primary accent: #005bc4 → #4388fd gradient
   ● Corner radii: 1.75rem (cards), 2rem (nested), 3rem (containers)

   THEMING: All colors use CSS classes that resolve to --bg-*, --text-*,
   --accent* CSS variables. Never use hardcoded hex in inline styles for
   colors. This enables dark and neon-dark theme support.
   ═══════════════════════════════════════════════════════════════════ */

/* ── Types ────────────────────────────────────────────────────── */

type Highlight = {
  label: string;
  value: string;
  detail?: string;
};

type Tone = 'emerald' | 'sky' | 'amber' | 'rose' | 'primary' | 'neutral';

const toneClassMap: Record<Tone, string> = {
  primary: 'stitch-pill-tone--primary',
  emerald: 'stitch-pill-tone--emerald',
  sky: 'stitch-pill-tone--sky',
  amber: 'stitch-pill-tone--amber',
  rose: 'stitch-pill-tone--rose',
  neutral: 'stitch-pill-tone--neutral',
};

/* ── PageGreeting ─────────────────────────────────────────────
   Replaces CorePageHeader. A warm, personal greeting with
   optional subtitle. No intro paragraphs, no stat grids.
   ─────────────────────────────────────────────────────────── */

type PageGreetingProps = {
  greeting: string;
  subtitle?: string;
  actions?: ReactNode;
};

export function PageGreeting({ greeting, subtitle, actions }: PageGreetingProps) {
  return (
    <section className="flex items-start justify-between gap-4">
      <div>
        <h1 className="stitch-headline text-xl sm:text-2xl md:text-3xl font-extrabold tracking-tight">
          {greeting}
        </h1>
        {subtitle && (
          <p className="mt-1.5 text-sm sm:text-base stitch-text-secondary">
            {subtitle}
          </p>
        )}
      </div>
      {actions ? <div className="shrink-0">{actions}</div> : null}
    </section>
  );
}

/* ── SurfaceCard ──────────────────────────────────────────────
   The primary card primitive. Tonal layering with no hard borders.
   White on surface background creates natural lift.
   ─────────────────────────────────────────────────────────── */

type SurfaceCardProps = {
  children: ReactNode;
  className?: string;
  variant?: 'default' | 'nested' | 'accent' | 'highlight';
  padding?: 'sm' | 'md' | 'lg';
  onClick?: () => void;
};

export function SurfaceCard({
  children,
  className = '',
  variant = 'default',
  padding = 'md',
  onClick,
}: SurfaceCardProps) {
  const padMap = { sm: 'p-2.5 sm:p-3 md:p-4', md: 'p-3 sm:p-4 md:p-5', lg: 'p-4 sm:p-5 md:p-6' };

  const variantClass: Record<string, string> = {
    default: 'stitch-card',
    nested: 'stitch-card--nested',
    accent: 'stitch-card--accent',
    highlight: 'stitch-card--highlight',
  };

  return (
    <div
      className={`${variantClass[variant]} ${padMap[padding]} ${onClick ? 'cursor-pointer stitch-card--clickable' : ''} ${className}`}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
    >
      {children}
    </div>
  );
}

/* ── SectionHeader ────────────────────────────────────────────
   Small label + title for card sections. Uses Manrope for title.
   ─────────────────────────────────────────────────────────── */

type SectionHeaderProps = {
  overline?: string;
  title: string;
  subtitle?: string;
  actions?: ReactNode;
};

export function SectionHeader({ overline, title, subtitle, actions }: SectionHeaderProps) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div>
        {overline && (
          <p className="stitch-overline text-[11px] font-bold uppercase tracking-[0.16em] mb-1.5">
            {overline}
          </p>
        )}
        <h2 className="stitch-headline text-lg font-bold tracking-tight">
          {title}
        </h2>
        {subtitle && (
          <p className="mt-1 text-sm stitch-text-secondary">
            {subtitle}
          </p>
        )}
      </div>
      {actions ? <div className="shrink-0">{actions}</div> : null}
    </div>
  );
}

/* ── PillButton ───────────────────────────────────────────────
   Tappable chip for brain states, filters, tags. Supports
   selected state with primary gradient fill.
   ─────────────────────────────────────────────────────────── */

type PillButtonProps = {
  children: ReactNode;
  selected?: boolean;
  onClick?: () => void;
  tone?: Tone;
  size?: 'sm' | 'md';
};

export function PillButton({
  children,
  selected = false,
  onClick,
  tone,
  size = 'md',
}: PillButtonProps) {
  const sizeClass = size === 'sm' ? 'px-3 py-1.5 text-xs' : 'px-4 py-2 text-sm';

  if (selected) {
    return (
      <button
        type="button"
        onClick={onClick}
        className={`stitch-pill--selected inline-flex items-center gap-2 rounded-full font-semibold text-white transition-all duration-200 active:scale-95 ${sizeClass}`}
      >
        {children}
      </button>
    );
  }

  const toneClass = tone ? toneClassMap[tone] : '';

  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-2 rounded-full font-semibold transition-all duration-200 active:scale-95 ${sizeClass} ${
        toneClass || 'stitch-pill--default'
      }`}
    >
      {children}
    </button>
  );
}

/* ── GradientButton ───────────────────────────────────────────
   Primary CTA with signature gradient. 56px min height for
   primary actions, full-rounded.
   ─────────────────────────────────────────────────────────── */

type GradientButtonProps = {
  children: ReactNode;
  onClick?: () => void;
  fullWidth?: boolean;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'primary' | 'secondary' | 'ghost';
  disabled?: boolean;
};

export function GradientButton({
  children,
  onClick,
  fullWidth = false,
  size = 'md',
  variant = 'primary',
  disabled = false,
}: GradientButtonProps) {
  const sizeMap = {
    sm: 'px-4 py-2 text-sm min-h-[36px]',
    md: 'px-5 py-2.5 text-sm min-h-[44px]',
    lg: 'px-6 py-3 text-base min-h-[56px]',
  };

  const base = `rounded-full font-semibold transition-all duration-200 ${sizeMap[size]} ${fullWidth ? 'w-full' : ''} ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`;

  if (variant === 'ghost') {
    return (
      <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        className={`${base} stitch-btn--ghost ${disabled ? '' : 'stitch-btn--ghost-hover'}`}
      >
        {children}
      </button>
    );
  }

  if (variant === 'secondary') {
    return (
      <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        className={`${base} stitch-btn--secondary ${disabled ? '' : 'stitch-btn--secondary-hover'}`}
      >
        {children}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`${base} stitch-btn--primary text-white ${disabled ? '' : 'hover:shadow-[0_6px_20px_rgba(0,91,196,0.35)] hover:-translate-y-px active:scale-[0.98]'}`}
    >
      {children}
    </button>
  );
}

/* ── InputWell ────────────────────────────────────────────────
   Container-style input. No underlines or visible borders.
   Sits in a tonal "well" that clarifies on focus.
   ─────────────────────────────────────────────────────────── */

type InputWellProps = {
  value: string;
  onChange: (value: string) => void;
  onSubmit?: () => void;
  placeholder?: string;
  multiline?: boolean;
  rows?: number;
};

export function InputWell({
  value,
  onChange,
  onSubmit,
  placeholder,
  multiline = false,
  rows = 4,
}: InputWellProps) {
  const sharedClasses =
    'stitch-input-well w-full rounded-[2rem] px-5 py-3.5 text-sm outline-none transition-all duration-200';

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !multiline && onSubmit) {
      e.preventDefault();
      onSubmit();
    }
  };

  if (multiline) {
    return (
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        rows={rows}
        className={`${sharedClasses} resize-y min-h-[7rem] stitch-input-well--focus`}
      />
    );
  }

  return (
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onKeyDown={handleKeyDown}
      placeholder={placeholder}
      className={`${sharedClasses} stitch-input-well--focus`}
    />
  );
}

/* ── ProgressOrbit ────────────────────────────────────────────
   Circular progress indicator. Replaces flat stat numbers
   with a gamified but non-anxious visual.
   ─────────────────────────────────────────────────────────── */

type ProgressOrbitProps = {
  value: number; // 0-100
  size?: number;
  strokeWidth?: number;
  children?: ReactNode;
};

export function ProgressOrbit({
  value,
  size = 100,
  strokeWidth = 6,
  children,
}: ProgressOrbitProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (Math.min(Math.max(value, 0), 100) / 100) * circumference;

  return (
    <div className="progress-orbit" style={{ width: size, height: size }}>
      <svg
        className="progress-orbit__ring"
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
      >
        <circle
          className="progress-orbit__track"
          cx={size / 2}
          cy={size / 2}
          r={radius}
        />
        <circle
          className="progress-orbit__fill"
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
        />
      </svg>
      {children && (
        <div className="absolute inset-0 flex items-center justify-center">
          {children}
        </div>
      )}
    </div>
  );
}

/* ── TimelineEntry ────────────────────────────────────────────
   Single entry in an activity log timeline.
   ─────────────────────────────────────────────────────────── */

type TimelineEntryProps = {
  time: string;
  title: string;
  subtitle?: string;
  isLast?: boolean;
};

export function TimelineEntry({ time, title, subtitle, isLast = false }: TimelineEntryProps) {
  return (
    <div className="flex items-start gap-4 relative">
      <div className="w-14 sm:w-20 text-right pt-1 shrink-0">
        <span className="text-xs font-mono font-bold stitch-text-secondary">
          {time}
        </span>
      </div>
      <div className="relative flex flex-col items-center">
        <div className="stitch-timeline-dot w-3 h-3 rounded-full mt-1.5 shrink-0" />
        {!isLast && (
          <div className="stitch-timeline-line w-[2px] flex-1 mt-1" style={{ minHeight: '24px' }} />
        )}
      </div>
      <div className="flex-1 pb-4">
        <p className="text-sm font-semibold stitch-text-primary">
          {title}
        </p>
        {subtitle && (
          <p className="text-xs mt-0.5 stitch-text-secondary">
            {subtitle}
          </p>
        )}
      </div>
    </div>
  );
}

/* ── CheckableItem ────────────────────────────────────────────
   A tappable row for tasks, responsibilities, rituals.
   Toggles between done/not-done with tonal feedback.
   ─────────────────────────────────────────────────────────── */

type CheckableItemProps = {
  label: string;
  checked?: boolean;
  onToggle?: () => void;
  meta?: string;
  energyLabel?: string;
};

export function CheckableItem({ label, checked = false, onToggle, meta, energyLabel }: CheckableItemProps) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={`w-full flex items-center justify-between gap-3 p-4 rounded-xl text-left transition-all duration-200 ${
        checked
          ? 'stitch-checkable--done'
          : 'stitch-checkable--open'
      }`}
    >
      <div className="flex items-center gap-3 min-w-0">
        <div
          className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${
            checked ? 'stitch-check-circle--done' : 'stitch-check-circle--open'
          }`}
        >
          {checked && (
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path d="M2.5 6L5 8.5L9.5 4" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
        </div>
        <div className="min-w-0">
          <p className={`text-sm font-semibold truncate ${checked ? 'line-through opacity-70' : 'stitch-text-primary'}`}>
            {label}
          </p>
          {meta && (
            <p className="text-xs mt-0.5 stitch-text-secondary">
              {meta}
            </p>
          )}
        </div>
      </div>
      {energyLabel && (
        <span className="stitch-energy-badge text-[10px] font-bold uppercase tracking-wider shrink-0 px-2 py-1 rounded-full">
          {energyLabel}
        </span>
      )}
    </button>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   BACKWARD COMPATIBILITY — Legacy exports
   These wrap the new components so existing pages don't break.
   They will be phased out as pages are rewritten.
   ═══════════════════════════════════════════════════════════════════ */

type PageHeaderProps = {
  eyebrow: string;
  title: string;
  intro: string;
  highlights?: Highlight[];
  actions?: ReactNode;
};

/**
 * @deprecated Use PageGreeting + SurfaceCard instead
 */
export function CorePageHeader({
  eyebrow,
  title,
  intro,
  highlights = [],
  actions,
}: PageHeaderProps) {
  return (
    <SurfaceCard padding="lg">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        <div className="max-w-3xl">
          <p className="stitch-overline text-[11px] font-bold uppercase tracking-[0.16em]">
            {eyebrow}
          </p>
          <h1 className="stitch-headline mt-3 text-[1.9rem] font-extrabold tracking-tight sm:text-[2.35rem]">
            {title}
          </h1>
          <p className="mt-3 text-sm leading-6 sm:text-[0.95rem] sm:leading-7 stitch-text-secondary">
            {intro}
          </p>
        </div>
        {actions ? <div className="shrink-0">{actions}</div> : null}
      </div>

      {highlights.length > 0 && (
        <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {highlights.map((h) => (
            <div key={h.label} className="stitch-card--nested rounded-[2rem] p-4">
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] stitch-text-secondary">
                {h.label}
              </p>
              <p className="mt-2 text-base font-bold stitch-text-primary">
                {h.value}
              </p>
              {h.detail && (
                <p className="mt-1 text-xs leading-5 stitch-text-tertiary">
                  {h.detail}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </SurfaceCard>
  );
}

type SectionCardProps = {
  title: string;
  description?: string;
  items: string[];
  tone?: Tone;
};

/**
 * @deprecated Use SurfaceCard + PillButton + list instead
 */
export function CoreSectionCard({
  title,
  description,
  items,
  tone = 'sky',
}: SectionCardProps) {
  return (
    <SurfaceCard>
      <PillButton tone={tone} size="sm">
        {title}
      </PillButton>
      {description && (
        <p className="mt-4 text-sm leading-6 stitch-text-secondary">
          {description}
        </p>
      )}
      <ul className="mt-4 space-y-3">
        {items.map((item) => (
          <li
            key={item}
            className="flex gap-3 stitch-card--nested rounded-xl px-4 py-3 text-sm leading-6"
          >
            <span className="stitch-list-dot mt-[0.45rem] h-2 w-2 rounded-full shrink-0" />
            <span className="stitch-text-primary">{item}</span>
          </li>
        ))}
      </ul>
    </SurfaceCard>
  );
}

type CoreDetailCardProps = {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
};

/**
 * @deprecated Use SurfaceCard + SectionHeader instead
 */
export function CoreDetailCard({
  eyebrow,
  title,
  description,
  actions,
  children,
}: CoreDetailCardProps) {
  return (
    <SurfaceCard>
      <SectionHeader
        overline={eyebrow}
        title={title}
        subtitle={description}
        actions={actions}
      />
      <div className="mt-4">{children}</div>
    </SurfaceCard>
  );
}
