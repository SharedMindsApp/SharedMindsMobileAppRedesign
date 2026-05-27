/**
 * AdminChangelog — release notes viewer with per-version cards,
 * colour-coded categories, filters, and PDF export.
 *
 * Pipeline:
 *   CHANGELOG.md (imported via Vite ?raw at build time)
 *     ↓
 *   parseChangelog() → flat blocks
 *     ↓
 *   groupByVersion() → versioned entries with categorised sections
 *     ↓
 *   render: TOC sidebar + version cards
 *
 * PDF export uses window.print() + a print stylesheet. The
 * AdminLayout sidebar + this page's controls all carry `print:hidden`
 * so the print preview shows only the changelog content. Saves us
 * a 100KB+ PDF library dependency.
 */

import { useMemo, useState } from 'react';
import { FileText, Filter, Printer, Copy, Check, Sparkles, Wrench, RotateCcw, Plus } from 'lucide-react';
import changelogSource from '../../../CHANGELOG.md?raw';

// ── Markdown parsing ────────────────────────────────────────────────

interface ParsedBlock {
  kind: 'h1' | 'h2' | 'h3' | 'p' | 'ul';
  text?: string;
  items?: string[];
}

function parseChangelog(src: string): ParsedBlock[] {
  const blocks: ParsedBlock[] = [];
  const lines = src.split('\n');
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (line.startsWith('# '))  { blocks.push({ kind: 'h1', text: line.slice(2) }); i++; continue; }
    if (line.startsWith('## ')) { blocks.push({ kind: 'h2', text: line.slice(3) }); i++; continue; }
    if (line.startsWith('### ')){ blocks.push({ kind: 'h3', text: line.slice(4) }); i++; continue; }

    if (line.startsWith('- ')) {
      const items: string[] = [];
      while (i < lines.length && (lines[i].startsWith('- ') || lines[i].startsWith('  '))) {
        if (lines[i].startsWith('- ')) items.push(lines[i].slice(2));
        else items[items.length - 1] = (items[items.length - 1] || '') + ' ' + lines[i].trim();
        i++;
      }
      blocks.push({ kind: 'ul', items });
      continue;
    }

    if (line.trim() === '') { i++; continue; }

    const para: string[] = [];
    while (i < lines.length && lines[i].trim() !== '' && !lines[i].startsWith('#') && !lines[i].startsWith('- ')) {
      para.push(lines[i]); i++;
    }
    blocks.push({ kind: 'p', text: para.join(' ') });
  }
  return blocks;
}

// ── Group blocks into versions ─────────────────────────────────────

type CategoryKind = 'Added' | 'Changed' | 'Fixed' | 'Removed' | 'Other';

interface Category {
  kind: CategoryKind;
  label: string;  // The original heading (some versions use variants like "Added (earlier in the day, before the open-to-match push)")
  items: string[];
}

interface VersionEntry {
  title: string;       // e.g. "[v0.5.0] — 2026-05-27"
  versionLabel: string; // "v0.5.0"
  dateLabel: string;    // "2026-05-27"
  isUnreleased: boolean;
  preamble?: string;   // Optional paragraph between the h2 and the first h3
  categories: Category[];
}

function toCategoryKind(label: string): CategoryKind {
  const l = label.toLowerCase();
  if (l.startsWith('added')) return 'Added';
  if (l.startsWith('changed')) return 'Changed';
  if (l.startsWith('fixed')) return 'Fixed';
  if (l.startsWith('removed')) return 'Removed';
  return 'Other';
}

function parseVersionHeader(text: string): { versionLabel: string; dateLabel: string; isUnreleased: boolean } {
  // Possible shapes:
  //   "[Unreleased]"
  //   "[v0.5.0] — 2026-05-27"
  const isUnreleased = /\[unreleased\]/i.test(text);
  const m = text.match(/\[(v[\d.]+)\]\s*[—-]\s*([\d-]+)/);
  return {
    versionLabel: isUnreleased ? 'Unreleased' : (m?.[1] ?? text),
    dateLabel:    isUnreleased ? '' : (m?.[2] ?? ''),
    isUnreleased,
  };
}

function groupByVersion(blocks: ParsedBlock[]): VersionEntry[] {
  const versions: VersionEntry[] = [];
  let current: VersionEntry | null = null;
  let currentCategory: Category | null = null;

  for (const b of blocks) {
    if (b.kind === 'h1') continue; // The page renders its own title.

    if (b.kind === 'h2') {
      // Skip the legend paragraphs above the first version — they live in
      // the page chrome rather than a version card. We detect "real"
      // version headings by their bracket prefix.
      if (!/^\[/.test(b.text ?? '')) continue;
      const meta = parseVersionHeader(b.text ?? '');
      current = { ...meta, title: b.text ?? '', categories: [] };
      currentCategory = null;
      versions.push(current);
      continue;
    }

    if (b.kind === 'h3') {
      if (!current) continue;
      currentCategory = {
        kind: toCategoryKind(b.text ?? ''),
        label: b.text ?? '',
        items: [],
      };
      current.categories.push(currentCategory);
      continue;
    }

    if (b.kind === 'ul') {
      if (currentCategory) currentCategory.items.push(...(b.items ?? []));
      else if (current) {
        // Unattached bullets → put them in an "Other" bucket so they
        // still show up.
        currentCategory = { kind: 'Other', label: 'Notes', items: [...(b.items ?? [])] };
        current.categories.push(currentCategory);
      }
      continue;
    }

    if (b.kind === 'p') {
      if (current && current.categories.length === 0 && !current.preamble) {
        current.preamble = b.text;
      }
      // Otherwise it's the legend at the top — already filtered.
    }
  }

  return versions;
}

// ── Category styling ───────────────────────────────────────────────

const CATEGORY_STYLE: Record<CategoryKind, { bg: string; text: string; ring: string; Icon: typeof Sparkles }> = {
  Added:   { bg: 'bg-emerald-50', text: 'text-emerald-700', ring: 'ring-emerald-200', Icon: Plus },
  Changed: { bg: 'bg-amber-50',   text: 'text-amber-700',   ring: 'ring-amber-200',   Icon: Wrench },
  Fixed:   { bg: 'bg-blue-50',    text: 'text-blue-700',    ring: 'ring-blue-200',    Icon: Sparkles },
  Removed: { bg: 'bg-rose-50',    text: 'text-rose-700',    ring: 'ring-rose-200',    Icon: RotateCcw },
  Other:   { bg: 'bg-slate-50',   text: 'text-slate-700',   ring: 'ring-slate-200',   Icon: Sparkles },
};

const ALL_CATEGORIES: CategoryKind[] = ['Added', 'Changed', 'Fixed', 'Removed'];

// ── Inline markdown — code spans + bold ────────────────────────────

function renderInline(text: string): React.ReactNode[] {
  const nodes: React.ReactNode[] = [];
  const codeRegex = /`([^`]+)`/g;
  let lastIdx = 0;
  let match: RegExpExecArray | null;
  const parts: { text: string; isCode: boolean }[] = [];
  while ((match = codeRegex.exec(text)) !== null) {
    if (match.index > lastIdx) parts.push({ text: text.slice(lastIdx, match.index), isCode: false });
    parts.push({ text: match[1], isCode: true });
    lastIdx = match.index + match[0].length;
  }
  if (lastIdx < text.length) parts.push({ text: text.slice(lastIdx), isCode: false });

  const boldRegex = /\*\*([^*]+)\*\*/g;
  parts.forEach((p, i) => {
    if (p.isCode) {
      nodes.push(
        <code key={`c-${i}`} className="px-1 py-0.5 rounded bg-slate-100 text-slate-800 text-[12px] font-mono">
          {p.text}
        </code>
      );
      return;
    }
    let bLast = 0;
    let bm: RegExpExecArray | null;
    while ((bm = boldRegex.exec(p.text)) !== null) {
      if (bm.index > bLast) nodes.push(<span key={`t-${i}-${bLast}`}>{p.text.slice(bLast, bm.index)}</span>);
      nodes.push(<strong key={`b-${i}-${bm.index}`} className="font-bold text-slate-900">{bm[1]}</strong>);
      bLast = bm.index + bm[0].length;
    }
    if (bLast < p.text.length) nodes.push(<span key={`t-${i}-end`}>{p.text.slice(bLast)}</span>);
    boldRegex.lastIndex = 0;
  });
  return nodes;
}

// ── Per-version markdown re-serialisation (for Copy) ───────────────

function serialiseVersion(v: VersionEntry): string {
  const lines: string[] = [];
  lines.push(`## ${v.title}`);
  lines.push('');
  if (v.preamble) { lines.push(v.preamble); lines.push(''); }
  for (const c of v.categories) {
    lines.push(`### ${c.label}`);
    for (const it of c.items) lines.push(`- ${it}`);
    lines.push('');
  }
  return lines.join('\n').trim() + '\n';
}

// ── Component ──────────────────────────────────────────────────────

export function AdminChangelog() {
  const versions = useMemo(() => groupByVersion(parseChangelog(changelogSource)), []);
  // Filter chips — which categories to render. All on by default.
  const [activeKinds, setActiveKinds] = useState<Set<CategoryKind>>(
    new Set<CategoryKind>(ALL_CATEGORIES)
  );
  // Copy-to-clipboard feedback (which version just got copied).
  const [copiedVer, setCopiedVer] = useState<string | null>(null);

  function toggleKind(k: CategoryKind) {
    setActiveKinds((prev) => {
      const next = new Set(prev);
      if (next.has(k)) next.delete(k); else next.add(k);
      // Don't allow zero filters — fall back to "all"
      if (next.size === 0) ALL_CATEGORIES.forEach((c) => next.add(c));
      return next;
    });
  }

  async function copyMarkdown(v: VersionEntry) {
    try {
      await navigator.clipboard.writeText(serialiseVersion(v));
      setCopiedVer(v.versionLabel);
      setTimeout(() => setCopiedVer((c) => (c === v.versionLabel ? null : c)), 1800);
    } catch (e) {
      console.warn('[AdminChangelog] clipboard write failed:', e);
    }
  }

  function handlePrint() {
    // The PDF export path. We rely on `@media print` styles + the
    // `print:hidden` utilities elsewhere to strip the chrome. The
    // browser's print dialog handles the actual "Save as PDF" choice
    // — universally understood, zero deps, perfect fidelity to what
    // the user sees on screen.
    window.print();
  }

  const latest = versions.find((v) => !v.isUnreleased);
  const totals = useMemo(() => {
    if (!latest) return null;
    const counts: Record<CategoryKind, number> = { Added: 0, Changed: 0, Fixed: 0, Removed: 0, Other: 0 };
    for (const c of latest.categories) counts[c.kind] += c.items.length;
    return counts;
  }, [latest]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 print:py-0 print:px-0 print:max-w-none">
      {/* ── Header ──────────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-3 flex-wrap mb-6 print:mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 grid place-items-center print:hidden">
            <FileText size={20} />
          </div>
          <div>
            <h1 className="text-xl font-extrabold text-slate-900 leading-tight">Release notes</h1>
            <p className="text-xs text-slate-500 print:hidden">
              SharedMinds — every shipped version, grouped by feature theme
            </p>
            <p className="hidden print:block text-xs text-slate-500 mt-1">
              Source: <code className="font-mono text-[11px]">CHANGELOG.md</code> · Exported {new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 print:hidden">
          <button
            type="button"
            onClick={handlePrint}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-lg bg-blue-600 text-white hover:bg-blue-700 active:scale-95 transition-all shadow-sm"
            title="Open the browser print dialog — choose 'Save as PDF' as the destination"
          >
            <Printer size={13} />
            Export PDF
          </button>
        </div>
      </div>

      {/* ── Latest-version summary card — hidden on print to avoid duplicating
            the content with the version card below. Reads as a "what's new" hero. */}
      {latest && totals && (
        <div className="mb-8 print:hidden rounded-2xl border border-slate-200 bg-gradient-to-br from-blue-50/40 to-teal-50/40 p-5">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-[10px] font-extrabold uppercase tracking-widest text-blue-700 bg-blue-100 px-2 py-0.5 rounded-full">
              Latest
            </span>
            <h2 className="text-lg font-extrabold text-slate-900">{latest.versionLabel}</h2>
            <span className="text-xs text-slate-500">· {latest.dateLabel}</span>
          </div>
          {latest.preamble && (
            <p className="text-sm text-slate-700 leading-relaxed mb-3 max-w-3xl">
              {renderInline(latest.preamble)}
            </p>
          )}
          <div className="flex flex-wrap items-center gap-2">
            {ALL_CATEGORIES.map((k) => {
              const n = totals[k];
              if (n === 0) return null;
              const s = CATEGORY_STYLE[k];
              return (
                <span key={k} className={`inline-flex items-center gap-1.5 text-[11px] font-bold px-2 py-1 rounded-full ${s.bg} ${s.text} ring-1 ${s.ring}`}>
                  <s.Icon size={11} />
                  {n} {k.toLowerCase()}
                </span>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Filter chips ──────────────────────────────────────── */}
      <div className="flex items-center gap-2 mb-4 print:hidden flex-wrap">
        <Filter size={13} className="text-slate-400 shrink-0" />
        <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-500">Show:</span>
        {ALL_CATEGORIES.map((k) => {
          const on = activeKinds.has(k);
          const s = CATEGORY_STYLE[k];
          return (
            <button
              key={k}
              type="button"
              onClick={() => toggleKind(k)}
              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold transition-all active:scale-95 ${
                on
                  ? `${s.bg} ${s.text} ring-1 ${s.ring}`
                  : 'bg-slate-100 text-slate-400 ring-1 ring-transparent hover:text-slate-600'
              }`}
            >
              <s.Icon size={10} />
              {k}
            </button>
          );
        })}
      </div>

      {/* ── Body layout: sidebar TOC + version cards ─────────── */}
      <div className="flex gap-6 lg:gap-8">
        {/* TOC — desktop only, also hidden on print */}
        <aside className="hidden lg:block w-44 shrink-0 print:hidden">
          <div className="sticky top-6">
            <p className="text-[10px] font-extrabold uppercase tracking-widest text-slate-500 mb-2 px-3">Versions</p>
            <nav className="space-y-0.5">
              {versions.map((v) => (
                <a
                  key={v.versionLabel}
                  href={`#${v.versionLabel}`}
                  className="block px-3 py-1.5 rounded-lg text-sm font-semibold text-slate-700 hover:bg-slate-100 hover:text-slate-900 transition-colors"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span>{v.versionLabel}</span>
                    {v === latest && (
                      <span className="text-[9px] font-extrabold uppercase tracking-wider bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full">Latest</span>
                    )}
                  </div>
                  {v.dateLabel && <p className="text-[11px] text-slate-400 tabular-nums leading-none">{v.dateLabel}</p>}
                </a>
              ))}
            </nav>
          </div>
        </aside>

        {/* Main column */}
        <div className="flex-1 min-w-0 space-y-6 print:space-y-4">
          {versions.map((v) => {
            const visibleCategories = v.categories.filter((c) => activeKinds.has(c.kind));
            // If the user filtered everything out for this version, skip it
            // entirely rather than showing an empty card.
            if (!v.isUnreleased && visibleCategories.length === 0) return null;
            const copied = copiedVer === v.versionLabel;
            return (
              <article
                key={v.versionLabel}
                id={v.versionLabel}
                className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 print:border-0 print:rounded-none print:p-0 print:shadow-none scroll-mt-6"
              >
                {/* Version header */}
                <header className="flex items-start justify-between gap-3 mb-4 pb-4 border-b border-slate-100 print:border-slate-300">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h2 className="text-xl font-extrabold text-slate-900">{v.versionLabel}</h2>
                      {v.dateLabel && <span className="text-sm text-slate-500 tabular-nums">{v.dateLabel}</span>}
                      {v === latest && (
                        <span className="text-[10px] font-extrabold uppercase tracking-wider bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full print:hidden">
                          Latest
                        </span>
                      )}
                      {v.isUnreleased && (
                        <span className="text-[10px] font-extrabold uppercase tracking-wider bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full">
                          In progress
                        </span>
                      )}
                    </div>
                    {v.preamble && (
                      <p className="text-sm text-slate-600 leading-relaxed mt-2 max-w-3xl">
                        {renderInline(v.preamble)}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0 print:hidden">
                    <button
                      type="button"
                      onClick={() => copyMarkdown(v)}
                      title="Copy this version's markdown to the clipboard"
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 text-[11px] font-bold rounded-lg transition-all active:scale-95 ${
                        copied
                          ? 'bg-emerald-100 text-emerald-700'
                          : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                      }`}
                    >
                      {copied ? <Check size={11} /> : <Copy size={11} />}
                      {copied ? 'Copied' : 'Copy MD'}
                    </button>
                  </div>
                </header>

                {/* Categories */}
                {v.isUnreleased && v.categories.length === 0 ? (
                  <p className="text-sm text-slate-500 italic">No unreleased changes yet — entries you add to <code className="font-mono text-[12px] bg-slate-100 px-1 py-0.5 rounded">CHANGELOG.md</code> appear here.</p>
                ) : (
                  <div className="space-y-5">
                    {visibleCategories.map((c, idx) => {
                      const s = CATEGORY_STYLE[c.kind];
                      return (
                        <section key={idx}>
                          <div className="flex items-center gap-2 mb-2">
                            <span className={`inline-flex items-center gap-1 text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full ${s.bg} ${s.text} ring-1 ${s.ring}`}>
                              <s.Icon size={10} />
                              {c.kind}
                            </span>
                            {/* If the original heading had a qualifier (e.g.
                                "Added (earlier in the day…)"), surface it. */}
                            {c.label.toLowerCase() !== c.kind.toLowerCase() && c.kind !== 'Other' && (
                              <span className="text-[11px] text-slate-500">{c.label.replace(new RegExp(`^${c.kind}\\s*`, 'i'), '').replace(/^\(|\)$/g, '')}</span>
                            )}
                          </div>
                          <ul className="space-y-1.5 list-disc pl-5 marker:text-slate-300">
                            {c.items.map((it, j) => (
                              <li key={j} className="text-sm leading-relaxed text-slate-700 print:text-[13px]">
                                {renderInline(it)}
                              </li>
                            ))}
                          </ul>
                        </section>
                      );
                    })}
                  </div>
                )}
              </article>
            );
          })}
        </div>
      </div>

      {/* ── Print stylesheet ──────────────────────────────────────
          @media print rules that the Tailwind print: utilities can't
          fully express. Mostly tidying margins + ensuring colour pills
          render. */}
      <style>{`
        @media print {
          @page { margin: 16mm; }
          html, body { background: white !important; }
          /* Force backgrounds + colours to render in printed PDFs.
             Without this, browsers strip them by default. */
          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          article {
            page-break-inside: avoid;
          }
        }
      `}</style>
    </div>
  );
}
