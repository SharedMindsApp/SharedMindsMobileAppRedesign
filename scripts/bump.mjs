#!/usr/bin/env node
/**
 * Release bump script.
 *
 * Usage:
 *   node scripts/bump.mjs <patch|minor|major>
 *   npm run bump:patch
 *   npm run bump:minor
 *   npm run bump:major
 *
 * What it does:
 *   1. Verifies the working tree is clean (no surprises in the bump commit).
 *   2. Reads CHANGELOG.md's `[Unreleased]` section.
 *   3. Refuses to bump if Unreleased is empty (placeholder text only) —
 *      you'd be cutting an empty release.
 *   4. Computes the next semver based on the bump type.
 *   5. Rewrites CHANGELOG.md: `[Unreleased]` becomes `[vN.N.N] — YYYY-MM-DD`
 *      with the existing entries, and a fresh empty `[Unreleased]`
 *      template gets placed above it.
 *   6. Bumps `version` in package.json.
 *   7. Stages + commits + tags `vN.N.N`.
 *   8. Prints push instructions.
 *
 * Flags:
 *   --dry-run     Show what would change, write nothing.
 *   --no-tag      Skip git tag creation (rare — for testing).
 *   --allow-dirty Bypass the clean-tree check (rare — for testing).
 *
 * Design notes:
 *   - Zero new dependencies. Pure Node + git CLI.
 *   - We do NOT push automatically — leaves the user in control of
 *     when the tag goes public.
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = dirname(__dirname); // scripts/ → repo root
const PKG_PATH = join(ROOT, 'package.json');
const CHANGELOG_PATH = join(ROOT, 'CHANGELOG.md');

// ── Args ───────────────────────────────────────────────────────────

const args = process.argv.slice(2);
const bumpType = args.find((a) => ['patch', 'minor', 'major'].includes(a));
const dryRun = args.includes('--dry-run');
const noTag = args.includes('--no-tag');
const allowDirty = args.includes('--allow-dirty');

if (!bumpType) {
  console.error('Usage: node scripts/bump.mjs <patch|minor|major> [--dry-run] [--no-tag] [--allow-dirty]');
  process.exit(1);
}

// ── Helpers ────────────────────────────────────────────────────────

function sh(cmd) {
  return execSync(cmd, { cwd: ROOT, encoding: 'utf8' }).trim();
}

function fail(msg) {
  console.error(`✗ ${msg}`);
  process.exit(1);
}

function todayIso() {
  // YYYY-MM-DD in the local timezone — matches the date format used
  // by the existing CHANGELOG entries.
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

// ── 1. Clean working tree check ────────────────────────────────────

if (!allowDirty) {
  const status = sh('git status --porcelain');
  if (status) {
    console.error('Working tree is dirty. Commit or stash changes first, or pass --allow-dirty.');
    console.error('Uncommitted files:\n' + status);
    process.exit(1);
  }
}

// ── 2. Read + bump version ─────────────────────────────────────────

const pkg = JSON.parse(readFileSync(PKG_PATH, 'utf8'));
const current = pkg.version;
const semver = current.match(/^(\d+)\.(\d+)\.(\d+)$/);
if (!semver) fail(`package.json version "${current}" is not semver (X.Y.Z)`);

const [, majS, minS, patS] = semver;
const maj = Number(majS), min = Number(minS), pat = Number(patS);
const next =
  bumpType === 'major' ? `${maj + 1}.0.0` :
  bumpType === 'minor' ? `${maj}.${min + 1}.0` :
                         `${maj}.${min}.${pat + 1}`;

// ── 3. Parse + rewrite CHANGELOG.md ────────────────────────────────

const original = readFileSync(CHANGELOG_PATH, 'utf8');

// Match `## [Unreleased]` and everything up to the next `## [` block.
// Multiline + non-greedy. Captured group 1 = the body between heading
// and next section.
const unreleasedRe = /## \[Unreleased\]\s*\n([\s\S]*?)(?=\n## \[|\n## v\d|$)/;
const m = original.match(unreleasedRe);
if (!m) fail('No `## [Unreleased]` section found in CHANGELOG.md');

const body = (m[1] || '').trim();
const placeholderRe = /^_Nothing yet\._?\s*$/;
if (!body || placeholderRe.test(body)) {
  fail(
    'The [Unreleased] section is empty. Add entries (Added / Changed / Fixed)\n' +
    'before bumping the version. Nothing to release otherwise.'
  );
}

const today = todayIso();
const replacement =
  `## [Unreleased]\n\n_Nothing yet._\n\n\n## [v${next}] — ${today}\n\n${body}\n`;

const updatedChangelog = original.replace(unreleasedRe, replacement);

if (updatedChangelog === original) {
  fail('Failed to rewrite CHANGELOG.md — regex matched but replacement was a no-op.');
}

// ── 4. Dry run? Print diff + exit ──────────────────────────────────

if (dryRun) {
  console.log(`▶ Would bump v${current} → v${next}`);
  console.log(`▶ Would stamp [Unreleased] as [v${next}] — ${today}`);
  console.log('▶ Would commit "chore(release): v' + next + '"');
  if (!noTag) console.log('▶ Would tag v' + next);
  console.log('\n--- New CHANGELOG section preview ---');
  // Show just the new version block (next ~30 lines after the Unreleased
  // placeholder) so the user sees what's about to be cut.
  const preview = replacement.split('\n').slice(0, 30).join('\n');
  console.log(preview);
  console.log('--- end preview ---');
  process.exit(0);
}

// ── 5. Write files ─────────────────────────────────────────────────

writeFileSync(CHANGELOG_PATH, updatedChangelog);

// Preserve package.json indentation style — most npm tools use 2-space
// pretty JSON with a trailing newline. The original file already does.
pkg.version = next;
writeFileSync(PKG_PATH, JSON.stringify(pkg, null, 2) + '\n');

// ── 6. Stage, commit, tag ──────────────────────────────────────────

try {
  sh('git add CHANGELOG.md package.json');
  sh(`git commit -m "chore(release): v${next}"`);
  if (!noTag) {
    sh(`git tag -a v${next} -m "v${next}"`);
  }
} catch (err) {
  console.error('Git commit / tag step failed. The file changes are written;');
  console.error('you may want to inspect, then commit + tag manually.');
  console.error(err.message);
  process.exit(1);
}

// ── 7. Done — instructions ────────────────────────────────────────

console.log(`✓ Bumped v${current} → v${next}`);
console.log('');
console.log('Next steps:');
console.log('  git push origin main');
if (!noTag) console.log(`  git push origin v${next}`);
console.log('');
console.log('Tip: `git push origin main --follow-tags` pushes both at once.');
