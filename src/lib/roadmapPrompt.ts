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
 * Format the AI is told to return — a [x]/[ ] box carries what's already done
 * so the sense of progress survives the round-trip:
 *   M: [x] <milestone title> | <weight 0-100>
 *   P: [ ] <phase title> | <weight 0-100>
 *   P: [x] <phase title> | <weight 0-100>
 *   ...
 * (weights optional — we even-split if missing or invalid.)
 */

export interface ParsedPhase { title: string; weight_pct: number; done: boolean; }
export interface ParsedMilestone { title: string; weight_pct: number; done: boolean; phases: ParsedPhase[]; }

interface DraftPhase { title: string; weight_pct: number; already_done?: boolean; }
interface DraftMilestone { title: string; weight_pct: number; already_done?: boolean; phases: DraftPhase[]; }

export function buildRoadmapValidationPrompt(args: {
  projectName: string;
  brainDump?: string | null;
  milestones: DraftMilestone[];
  /** Overall self-reported progress, so the AI can mark completed items to
   *  match — fixes "70% done but nothing ticked". */
  startedStatus?: 'not_started' | 'in_progress' | null;
  completionPct?: number | null;
}): string {
  const subject = args.projectName.trim() || '[PROJECT NAME]';
  const ctx = args.brainDump?.trim()
    ? `\n\nContext on the project:\n${args.brainDump.trim()}`
    : '';

  const box = (done?: boolean) => (done ? '[x]' : '[ ]');
  const draft = args.milestones
    .filter((m) => m.title.trim())
    .map((m) => {
      const head = `M: ${box(m.already_done)} ${m.title.trim()} | ${Math.round(m.weight_pct)}`;
      const ph = m.phases
        .filter((p) => p.title.trim())
        .map((p) => `P: ${box(p.already_done)} ${p.title.trim()} | ${Math.round(p.weight_pct)}`)
        .join('\n');
      return ph ? `${head}\n${ph}` : head;
    })
    .join('\n');

  // Progress line: tell the AI roughly how far along the project is so the
  // completed [x] items it returns reflect that — not a blank slate.
  const progress = (() => {
    if (args.startedStatus === 'not_started') {
      return "I haven't started yet — nothing is done.";
    }
    if (typeof args.completionPct === 'number' && args.completionPct > 0) {
      return `I'm already roughly ${Math.round(args.completionPct)}% of the way through this project overall.`;
    }
    if (args.startedStatus === 'in_progress') {
      return "I'm already partway through this project.";
    }
    return null;
  })();

  const progressLine = progress ? `\n\n${progress}` : '';

  // Two modes: with a draft → review/correct; without → write from scratch.
  const task = draft
    ? `Here's my current draft roadmap — milestones (major destinations, weighted as % of the whole project) and phases (the work inside each milestone, weighted as % within that milestone). A [x] means I've already completed it; [ ] means not yet:

${draft}

Please review it as a thoughtful collaborator who knows this work:
- Are these the right milestones, in a sensible order? Add, remove, merge, or rename as needed.
- Are the phases under each one complete and concrete? Fix gaps.
- Mark what's actually done with [x] and what's still to do with [ ] — keep my existing ticks unless they're clearly wrong, and make the completed items reflect my real progress.
- Sanity-check the weights (milestone weights should total ~100; phase weights within each milestone should total ~100).`
    : `Please draft a complete roadmap for this project: a handful of milestones (major destinations) and the phases (the work) inside each one.
- Order the milestones sensibly from the start of the project through to "done".
- Mark each milestone/phase I've already completed with [x] and the rest with [ ], so the roadmap reflects where I actually am.
- Give each milestone a weight as % of the whole project (they should total ~100).
- Give each phase a weight as % within its milestone (each milestone's phases should total ~100).`;

  return `I'm planning a project called "${subject}".${ctx}${progressLine}

${task}

Return ONLY the roadmap, nothing else, in EXACTLY this line format (no headings, no extra bullets, no commentary). Put [x] for done or [ ] for not-done right after M:/P:, and a weight 0-100 after a pipe:

M: [ ] <milestone title> | <weight 0-100>
P: [x] <phase title> | <weight 0-100>
P: [ ] <phase title> | <weight 0-100>
M: [ ] <milestone title> | <weight 0-100>
P: [ ] <phase title> | <weight 0-100>

Use "M:" for each milestone and "P:" for each phase beneath it. If I'm already partway through, the [x] items together should roughly match my stated progress.`;
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
      const { done, rest } = extractDone(m[1]);
      const { title, weight } = splitTitleWeight(rest);
      if (title) milestones.push({ title, weight_pct: weight ?? 0, done, phases: [] });
    } else if (p && milestones.length > 0) {
      const { done, rest } = extractDone(p[1]);
      const { title, weight } = splitTitleWeight(rest);
      if (title) milestones[milestones.length - 1].phases.push({ title, weight_pct: weight ?? 0, done });
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

/** Pull a leading checkbox ("[x]" done / "[ ]" not) off the front of a line. */
function extractDone(s: string): { done: boolean; rest: string } {
  const m = /^\[\s*([xX✓✔yY])?\s*\]\s*/.exec(s);
  if (m) return { done: !!m[1], rest: s.slice(m[0].length) };
  return { done: false, rest: s };
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
