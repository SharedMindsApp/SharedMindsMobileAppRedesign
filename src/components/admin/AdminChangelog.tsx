/**
 * AdminChangelog — renders /CHANGELOG.md inside the admin panel.
 *
 * Vite's `?raw` suffix imports the file content as a string at build
 * time — no runtime fetch, no public-folder copy, no markdown lib
 * dependency. We parse a small subset of markdown inline:
 *   - `## ` + `### ` headers
 *   - Bullet lists (`-` lines)
 *   - Inline `code spans` and **bold** runs
 *
 * Anything fancier (images, tables, links) isn't used in our CHANGELOG.
 * If it ever is, swap to `react-markdown` — but for now this keeps the
 * admin chunk lean.
 */

import { useMemo } from 'react';
import { ScrollText } from 'lucide-react';
// Vite-native: the ?raw suffix imports the file as a string. Path is
// relative to this file (admin/ → components/ → src/ → repo root).
import changelogSource from '../../../CHANGELOG.md?raw';

interface Block {
  kind: 'h1' | 'h2' | 'h3' | 'p' | 'ul' | 'rule';
  text?: string;
  items?: string[];
}

/** Parse markdown into a flat list of blocks. Stateless enough that we
 *  memoise once per import; CHANGELOG.md is a build-time constant. */
function parseChangelog(src: string): Block[] {
  const blocks: Block[] = [];
  const lines = src.split('\n');
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];

    // Headers
    if (line.startsWith('# ')) {
      blocks.push({ kind: 'h1', text: line.slice(2) });
      i++; continue;
    }
    if (line.startsWith('## ')) {
      blocks.push({ kind: 'h2', text: line.slice(3) });
      i++; continue;
    }
    if (line.startsWith('### ')) {
      blocks.push({ kind: 'h3', text: line.slice(4) });
      i++; continue;
    }

    // Bullet list — consume contiguous `- ` lines (allowing 2-space
    // continuation indents for wrapped items)
    if (line.startsWith('- ')) {
      const items: string[] = [];
      while (i < lines.length && (lines[i].startsWith('- ') || lines[i].startsWith('  '))) {
        if (lines[i].startsWith('- ')) {
          items.push(lines[i].slice(2));
        } else {
          // Continuation of prior item
          items[items.length - 1] = (items[items.length - 1] || '') + ' ' + lines[i].trim();
        }
        i++;
      }
      blocks.push({ kind: 'ul', items });
      continue;
    }

    // Blank line → block separator (no-op; markdown groups are explicit)
    if (line.trim() === '') {
      i++; continue;
    }

    // Anything else: treat as a paragraph. Coalesce contiguous non-blank
    // non-header lines into one paragraph.
    const para: string[] = [];
    while (
      i < lines.length
      && lines[i].trim() !== ''
      && !lines[i].startsWith('#')
      && !lines[i].startsWith('- ')
    ) {
      para.push(lines[i]);
      i++;
    }
    blocks.push({ kind: 'p', text: para.join(' ') });
  }
  return blocks;
}

/** Render inline `code` and **bold** runs inside a string. Order matters:
 *  process backtick spans first (they're literal — won't contain markdown
 *  inside), then bold. Returns a flat React.ReactNode[]. */
function renderInline(text: string): React.ReactNode[] {
  const nodes: React.ReactNode[] = [];
  const codeRegex = /`([^`]+)`/g;
  let lastIdx = 0;
  let match: RegExpExecArray | null;
  // Split on code spans first
  const codeParts: { text: string; isCode: boolean }[] = [];
  while ((match = codeRegex.exec(text)) !== null) {
    if (match.index > lastIdx) {
      codeParts.push({ text: text.slice(lastIdx, match.index), isCode: false });
    }
    codeParts.push({ text: match[1], isCode: true });
    lastIdx = match.index + match[0].length;
  }
  if (lastIdx < text.length) {
    codeParts.push({ text: text.slice(lastIdx), isCode: false });
  }
  // Within non-code parts, parse **bold**
  const boldRegex = /\*\*([^*]+)\*\*/g;
  codeParts.forEach((part, idx) => {
    if (part.isCode) {
      nodes.push(
        <code key={`c-${idx}`} className="px-1 py-0.5 rounded bg-slate-100 text-slate-800 text-[12px] font-mono">
          {part.text}
        </code>
      );
      return;
    }
    let boldLast = 0;
    let bMatch: RegExpExecArray | null;
    while ((bMatch = boldRegex.exec(part.text)) !== null) {
      if (bMatch.index > boldLast) {
        nodes.push(<span key={`t-${idx}-${boldLast}`}>{part.text.slice(boldLast, bMatch.index)}</span>);
      }
      nodes.push(<strong key={`b-${idx}-${bMatch.index}`} className="font-bold text-slate-900">{bMatch[1]}</strong>);
      boldLast = bMatch.index + bMatch[0].length;
    }
    if (boldLast < part.text.length) {
      nodes.push(<span key={`t-${idx}-end`}>{part.text.slice(boldLast)}</span>);
    }
    boldRegex.lastIndex = 0;
  });
  return nodes;
}

export function AdminChangelog() {
  const blocks = useMemo(() => parseChangelog(changelogSource), []);

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
      {/* Header — matches the visual weight of other admin pages */}
      <div className="flex items-center gap-3 mb-2">
        <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 grid place-items-center">
          <ScrollText size={20} />
        </div>
        <div>
          <h1 className="text-xl font-bold text-slate-900 leading-tight">Release notes</h1>
          <p className="text-xs text-slate-500">What's shipped, by version. Source: <code className="px-1 py-0.5 rounded bg-slate-100 text-[11px] font-mono">CHANGELOG.md</code></p>
        </div>
      </div>

      {/* Body */}
      <article className="mt-6 space-y-4">
        {blocks.map((b, idx) => {
          if (b.kind === 'h1') {
            // We render our own header above, so skip the markdown h1
            return null;
          }
          if (b.kind === 'h2') {
            return (
              <h2
                key={idx}
                className="text-lg font-extrabold text-slate-900 mt-8 pt-4 border-t border-slate-200 first:border-t-0 first:pt-0 first:mt-2"
              >
                {renderInline(b.text ?? '')}
              </h2>
            );
          }
          if (b.kind === 'h3') {
            return (
              <h3
                key={idx}
                className="text-[11px] font-extrabold uppercase tracking-widest text-slate-500 mt-4"
              >
                {renderInline(b.text ?? '')}
              </h3>
            );
          }
          if (b.kind === 'p') {
            return (
              <p key={idx} className="text-sm leading-relaxed text-slate-700">
                {renderInline(b.text ?? '')}
              </p>
            );
          }
          if (b.kind === 'ul') {
            return (
              <ul key={idx} className="space-y-1.5 list-disc pl-5 marker:text-slate-300">
                {(b.items ?? []).map((item, j) => (
                  <li key={j} className="text-sm leading-relaxed text-slate-700">
                    {renderInline(item)}
                  </li>
                ))}
              </ul>
            );
          }
          return null;
        })}
      </article>
    </div>
  );
}
