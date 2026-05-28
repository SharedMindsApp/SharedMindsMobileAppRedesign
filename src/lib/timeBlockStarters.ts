/**
 * Time-block starter presets — curated weekly shapes a user can adopt as a
 * starting point. Each preset uses placeholder project *slots* (1–4) rather
 * than real projects; breaks have no slot. Adopting a starter maps each slot
 * to one of the user's real projects and clones it into an editable,
 * project-pinned template (see TimeBlockTemplateService.adoptStarter).
 *
 * day_of_week: 0 = Monday … 6 = Sunday (Monday-first).
 */

import type { BlockType } from '../core/services/TimeBlockService';

export interface StarterItem {
  dayOfWeek: number;        // 0=Mon … 6=Sun
  startTime: string;        // HH:MM
  durationMins: number;
  title: string;
  blockType: BlockType;
  /** 1–4 = project slot; null = break / general (no project). */
  slot: number | null;
}

export interface TimeBlockStarter {
  id: string;
  name: string;
  description: string;
  /** How many project slots this preset uses (1–4). */
  projectSlots: number;
  items: StarterItem[];
}

type DayItem = Omit<StarterItem, 'dayOfWeek'>;

/** Expand a single weekday's items across Mon–Fri (0–4). */
function weekdays(items: DayItem[]): StarterItem[] {
  const out: StarterItem[] = [];
  for (let day = 0; day <= 4; day++) {
    for (const it of items) out.push({ ...it, dayOfWeek: day });
  }
  return out;
}

const LUNCH: DayItem = { startTime: '12:30', durationMins: 60, title: 'Lunch',  blockType: 'break', slot: null };
const BREAK = (startTime: string): DayItem => ({ startTime, durationMins: 15, title: 'Break', blockType: 'break', slot: null });

export const TIME_BLOCK_STARTERS: TimeBlockStarter[] = [
  {
    id: 'deep-week',
    name: 'Deep-work week',
    description: 'One project, long focused blocks each weekday — with a lunch and two short breathers built in.',
    projectSlots: 1,
    items: weekdays([
      { startTime: '09:00', durationMins: 90, title: 'Deep work',      blockType: 'deep',  slot: 1 },
      BREAK('10:30'),
      { startTime: '11:00', durationMins: 90, title: 'Deep work',      blockType: 'deep',  slot: 1 },
      LUNCH,
      { startTime: '13:30', durationMins: 90, title: 'Focused work',   blockType: 'focus', slot: 1 },
      BREAK('15:00'),
      { startTime: '15:15', durationMins: 45, title: 'Admin / wrap-up', blockType: 'admin', slot: null },
    ]),
  },
  {
    id: 'two-project-split',
    name: 'Two-project split',
    description: 'Project 1 every morning, Project 2 every afternoon. Lunch + breaks between.',
    projectSlots: 2,
    items: weekdays([
      { startTime: '09:00', durationMins: 120, title: 'Project 1', blockType: 'deep',  slot: 1 },
      BREAK('11:00'),
      { startTime: '11:15', durationMins: 75,  title: 'Project 1', blockType: 'focus', slot: 1 },
      LUNCH,
      { startTime: '13:30', durationMins: 120, title: 'Project 2', blockType: 'deep',  slot: 2 },
      BREAK('15:30'),
      { startTime: '15:45', durationMins: 75,  title: 'Project 2', blockType: 'focus', slot: 2 },
    ]),
  },
  {
    id: 'balanced-9-5',
    name: 'Balanced 9–5',
    description: 'A steady working day: plan, deep work, lunch, focus, wrap-up — with breathers. One project.',
    projectSlots: 1,
    items: weekdays([
      { startTime: '09:00', durationMins: 30, title: 'Inbox / plan',  blockType: 'admin', slot: null },
      { startTime: '09:30', durationMins: 90, title: 'Deep work',     blockType: 'deep',  slot: 1 },
      BREAK('11:00'),
      { startTime: '11:15', durationMins: 75, title: 'Focused work',  blockType: 'focus', slot: 1 },
      LUNCH,
      { startTime: '13:30', durationMins: 90, title: 'Focused work',  blockType: 'focus', slot: 1 },
      BREAK('15:00'),
      { startTime: '15:15', durationMins: 45, title: 'Wrap-up',       blockType: 'admin', slot: null },
    ]),
  },
  {
    id: 'four-project-rotation',
    name: 'Four-project rotation',
    description: 'A different project each day Mon–Thu, with Friday for admin + catch-up. Lunch + breaks daily.',
    projectSlots: 4,
    items: [
      // Mon–Thu each dedicate the day to one project slot.
      ...[1, 2, 3, 4].flatMap((slot, day) => ([
        { dayOfWeek: day, startTime: '09:00', durationMins: 90,  title: `Project ${slot}`, blockType: 'deep'  as BlockType, slot },
        { dayOfWeek: day, ...BREAK('10:30') },
        { dayOfWeek: day, startTime: '11:00', durationMins: 90,  title: `Project ${slot}`, blockType: 'deep'  as BlockType, slot },
        { dayOfWeek: day, ...LUNCH },
        { dayOfWeek: day, startTime: '13:30', durationMins: 120, title: `Project ${slot}`, blockType: 'focus' as BlockType, slot },
        { dayOfWeek: day, ...BREAK('15:30') },
      ])),
      // Friday — admin + catch-up (no fixed project).
      { dayOfWeek: 4, startTime: '09:00', durationMins: 60, title: 'Weekly review',  blockType: 'admin',    slot: null },
      { dayOfWeek: 4, ...BREAK('10:00') },
      { dayOfWeek: 4, startTime: '10:15', durationMins: 90, title: 'Catch-up',       blockType: 'focus',    slot: null },
      { dayOfWeek: 4, ...LUNCH },
      { dayOfWeek: 4, startTime: '13:30', durationMins: 90, title: 'Admin / inbox',  blockType: 'admin',    slot: null },
    ] as StarterItem[],
  },
];

export function getStarter(id: string): TimeBlockStarter | undefined {
  return TIME_BLOCK_STARTERS.find((s) => s.id === id);
}
