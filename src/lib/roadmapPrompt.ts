/**
 * roadmapPrompt — "validate my roadmap with your own AI" helper.
 *
 * After the in-app AI suggests milestones + phases, the user can take a richer
 * second opinion from an assistant that already knows their project deeply
 * (their ChatGPT/Claude with the full history). We build a prompt that hands
 * over the current draft and asks for corrections — returned in a STRICT,
 * line-based format we can paste back and parse reliably (free-form prose is
 * too fragile to re-import).
 *
 * Format the AI is told to return:
 *   M: <milestone title> | <weight 0-100>
 *   P: <phase title> | <weight 0-100>
 *   P: <phase title> | <weight 0-100>
 *   M: <milestone title> | <weight 0-100>
 *   ...
 * (weights optional — we even-split if missing or invalid.)
 */

export interface ParsedPhase { title: string; weight_pct: number; }
export interface ParsedMilestone { title: string; weight_pct: number; phases: ParsedPhase[]; }

interface DraftMilestone { title: string; weight_pct: number; phases: { title: string; weight_pct: number }[]; }

export function buildRoadmapValidationPrompt(args: {
  projectName: string;
  brainDump?: string | null;
  milestones: DraftMilestone[];
}): string {
  const subject = args.projectName.trim() || '[PROJECT NAME]';
  const ctx = args.brainDump?.trim()
    ? `\n\nContext on the project:\n${args.brainDump.trim()}`
    : '';

  const draft = args.milestones
    .filter((m) => m.title.trim())
    .map((m) => {
      const head = `M: ${m.title.trim()} | ${Math.round(m.weight_pct)}`;
      const ph = m.phases
        .filter((p) => p.title.trim())
        .map((p) => `P: ${p.title.trim()} | ${Math.round(p.weight_pct)}`)
        .join('\n');
      return ph ? `${head}\n${ph}` : head;
    })
    .join('\n');

  return `I'm planning a project called "${subject}".${ctx}

Here's my current draft roadmap — milestones (major destinations, weighted as % of the whole project) and phases (the work inside each milestone, weighted as % within that milestone):

${draft || '(no milestones drafted yet)'}

Please review it as a thoughtful collaborator who knows this work:
- Are these the right milestones, in a sensible order? Add, remove, merge, or rename as needed.
- Are the phases under each one complete and concrete? Fix gaps.
- Sanity-check the weights (milestone weights should total ~100; phase weights within each milestone should total ~100).

Return ONLY the corrected roadmap, nothing else, in EXACTLY this line format (no headings, no bullets, no commentary):

M: <milestone title> | <weight 0-100>
P: <phase title> | <weight 0-100>
P: <phase title> | <weight 0-100>
M: <milestone title> | <weight 0-100>
P: <phase title> | <weight 0-100>

Use "M:" for each milestone and "P:" for each phase beneath it.`;
}

/** Even-split helper: distribute 100 across n items (last absorbs rounding). */
function evenSplit(n: number): number[] {
  if (n <= 0) return [];
  const base = Math.floor(100 / n);
  const out = Array(n).fill(base);
  out[n - 1] += 100 - base * n;
  return out;
}

/**
 * Parse an AI reply in the M:/P: format back into milestones + phases.
 * Forgiving: strips markdown bullets/asterisks, ignores junk lines, and
 * fills in even weights when they're missing or don't parse. Returns [] if
 * nothing usable was found (caller keeps the existing draft + shows an error).
 */
export function parseRoadmapReply(text: string): ParsedMilestone[] {
  const milestones: ParsedMilestone[] = [];
  const lines = text.split('\n');

  for (const raw of lines) {
    // Strip leading markdown noise: "- ", "* ", "1. ", backticks, bold.
    const line = raw.replace(/\*\*/g, '').replace(/^[\s>`]*(?:[-*]\s*|\d+\.\s*)?/, '').trim();
    if (!line) continue;

    const m = /^M:\s*(.+)$/i.exec(line);
    const p = /^P:\s*(.+)$/i.exec(line);
    if (m) {
      const { title, weight } = splitTitleWeight(m[1]);
      if (title) milestones.push({ title, weight_pct: weight ?? 0, phases: [] });
    } else if (p && milestones.length > 0) {
      const { title, weight } = splitTitleWeight(p[1]);
      if (title) milestones[milestones.length - 1].phases.push({ title, weight_pct: weight ?? 0 });
    }
  }

  if (milestones.length === 0) return [];

  // Normalise weights: any milestone/phase set whose weights are all-zero or
  // clearly broken gets an even split so the sliders land somewhere sensible.
  const mWeights = milestones.map((x) => x.weight_pct);
  if (mWeights.every((w) => !w)) {
    const split = evenSplit(milestones.length);
    milestones.forEach((x, i) => { x.weight_pct = split[i]; });
  }
  for (const ms of milestones) {
    const pw = ms.phases.map((x) => x.weight_pct);
    if (ms.phases.length > 0 && pw.every((w) => !w)) {
      const split = evenSplit(ms.phases.length);
      ms.phases.forEach((x, i) => { x.weight_pct = split[i]; });
    }
  }
  return milestones;
}

function splitTitleWeight(s: string): { title: string; weight: number | null } {
  // "Title | 30"  or  "Title (30%)"  or  "Title — 30%"  or just "Title"
  const pipe = s.split('|');
  if (pipe.length >= 2) {
    const w = parseInt(pipe[1].replace(/[^\d]/g, ''), 10);
    return { title: pipe[0].trim(), weight: Number.isFinite(w) ? clamp(w) : null };
  }
  const paren = /\((\d{1,3})\s*%?\)\s*$/.exec(s);
  if (paren) {
    return { title: s.slice(0, paren.index).trim(), weight: clamp(parseInt(paren[1], 10)) };
  }
  return { title: s.trim(), weight: null };
}

function clamp(n: number): number {
  return Math.max(0, Math.min(100, n));
}
