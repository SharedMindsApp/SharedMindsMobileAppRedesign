import { supabase } from '../supabase';
import type {
  PersonalLink,
  PersonalSpaceType,
  GuardrailsSourceType,
  ConsumptionQuery,
} from './consumptionTypes';
import type { RoadmapItem } from '../guardrails/coreTypes';
import { getRoadmapItem } from '../guardrails/roadmapService';
import {
  getPersonalLinksForUser,
  getVisibleLinksForSpace,
  trackConsumption,
} from './consumptionService';
import {
  deriveCalendarState,
  deriveTaskState,
  deriveHabitState,
  deriveGoalState,
  deriveNoteState,
  canSpaceConsumeSource,
} from './interpretationRules';
import { filterLinksByVisibility, getDefaultVisibilityFilter } from './visibilityService';

export interface ConsumedItem {
  link: PersonalLink;
  sourceData: RoadmapItem | null;
  derivedState: any;
  isValid: boolean;
}

export async function getConsumedItemsForCalendar(userId: string): Promise<ConsumedItem[]> {
  const links = await getVisibleLinksForSpace(userId, 'calendar');
  const items: ConsumedItem[] = [];

  for (const link of links) {
    await trackConsumption(link.id);

    if (link.sourceType !== 'roadmap_item') continue;

    const sourceItem = await getRoadmapItem(link.sourceId);
    if (!sourceItem) {
      items.push({
        link,
        sourceData: null,
        derivedState: null,
        isValid: false,
      });
      continue;
    }

    if (!canSpaceConsumeSource('calendar', 'roadmap_item', sourceItem.type)) {
      items.push({
        link,
        sourceData: sourceItem,
        derivedState: null,
        isValid: false,
      });
      continue;
    }

    const derivedState = deriveCalendarState(sourceItem);

    items.push({
      link,
      sourceData: sourceItem,
      derivedState,
      isValid: true,
    });
  }

  return items;
}

export async function getConsumedItemsForTasks(userId: string): Promise<ConsumedItem[]> {
  const links = await getVisibleLinksForSpace(userId, 'tasks');
  const items: ConsumedItem[] = [];

  for (const link of links) {
    await trackConsumption(link.id);

    if (link.sourceType !== 'roadmap_item') continue;

    const sourceItem = await getRoadmapItem(link.sourceId);
    if (!sourceItem) {
      items.push({
        link,
        sourceData: null,
        derivedState: null,
        isValid: false,
      });
      continue;
    }

    if (!canSpaceConsumeSource('tasks', 'roadmap_item', sourceItem.type)) {
      items.push({
        link,
        sourceData: sourceItem,
        derivedState: null,
        isValid: false,
      });
      continue;
    }

    const derivedState = deriveTaskState(sourceItem);

    items.push({
      link,
      sourceData: sourceItem,
      derivedState,
      isValid: true,
    });
  }

  return items;
}

export async function getConsumedItemsForHabits(userId: string): Promise<ConsumedItem[]> {
  const links = await getVisibleLinksForSpace(userId, 'habits');
  const items: ConsumedItem[] = [];

  for (const link of links) {
    await trackConsumption(link.id);

    if (link.sourceType !== 'roadmap_item') continue;

    const sourceItem = await getRoadmapItem(link.sourceId);
    if (!sourceItem) {
      items.push({
        link,
        sourceData: null,
        derivedState: null,
        isValid: false,
      });
      continue;
    }

    if (!canSpaceConsumeSource('habits', 'roadmap_item', sourceItem.type)) {
      items.push({
        link,
        sourceData: sourceItem,
        derivedState: null,
        isValid: false,
      });
      continue;
    }

    const derivedState = deriveHabitState(sourceItem, link.derivedMetadata);

    items.push({
      link,
      sourceData: sourceItem,
      derivedState,
      isValid: true,
    });
  }

  return items;
}

export async function getConsumedItemsForGoals(userId: string): Promise<ConsumedItem[]> {
  const links = await getVisibleLinksForSpace(userId, 'goals');
  const items: ConsumedItem[] = [];

  for (const link of links) {
    await trackConsumption(link.id);

    if (link.sourceType === 'roadmap_item') {
      const sourceItem = await getRoadmapItem(link.sourceId);
      if (!sourceItem) {
        items.push({
          link,
          sourceData: null,
          derivedState: null,
          isValid: false,
        });
        continue;
      }

      if (!canSpaceConsumeSource('goals', 'roadmap_item', sourceItem.type)) {
        items.push({
          link,
          sourceData: sourceItem,
          derivedState: null,
          isValid: false,
        });
        continue;
      }

      const derivedState = deriveGoalState(sourceItem, link.derivedMetadata);

      items.push({
        link,
        sourceData: sourceItem,
        derivedState,
        isValid: true,
      });
    } else if (link.sourceType === 'track') {
      items.push({
        link,
        sourceData: null,
        derivedState: link.derivedMetadata,
        isValid: true,
      });
    }
  }

  return items;
}

export async function getConsumedItemsForNotes(userId: string): Promise<ConsumedItem[]> {
  const links = await getVisibleLinksForSpace(userId, 'notes');
  const items: ConsumedItem[] = [];

  for (const link of links) {
    await trackConsumption(link.id);

    if (link.sourceType !== 'roadmap_item') continue;

    const sourceItem = await getRoadmapItem(link.sourceId);
    if (!sourceItem) {
      items.push({
        link,
        sourceData: null,
        derivedState: null,
        isValid: false,
      });
      continue;
    }

    if (!canSpaceConsumeSource('notes', 'roadmap_item', sourceItem.type)) {
      items.push({
        link,
        sourceData: sourceItem,
        derivedState: null,
        isValid: false,
      });
      continue;
    }

    const derivedState = deriveNoteState(sourceItem, link.derivedMetadata);

    items.push({
      link,
      sourceData: sourceItem,
      derivedState,
      isValid: true,
    });
  }

  return items;
}

export async function getConsumedItemsForSpace(
  userId: string,
  spaceType: PersonalSpaceType
): Promise<ConsumedItem[]> {
  switch (spaceType) {
    case 'calendar':
      return getConsumedItemsForCalendar(userId);
    case 'tasks':
      return getConsumedItemsForTasks(userId);
    case 'habits':
      return getConsumedItemsForHabits(userId);
    case 'goals':
      return getConsumedItemsForGoals(userId);
    case 'notes':
      return getConsumedItemsForNotes(userId);
    default:
      return [];
  }
}

export async function getGuardrailsItemsInCalendar(userId: string): Promise<RoadmapItem[]> {
  const consumedItems = await getConsumedItemsForCalendar(userId);
  return consumedItems
    .filter((item) => item.isValid && item.sourceData !== null)
    .map((item) => item.sourceData!);
}

export async function getGuardrailsItemsInTasks(userId: string): Promise<RoadmapItem[]> {
  const consumedItems = await getConsumedItemsForTasks(userId);
  return consumedItems
    .filter((item) => item.isValid && item.sourceData !== null)
    .map((item) => item.sourceData!);
}

export async function getGuardrailsItemsInHabits(userId: string): Promise<RoadmapItem[]> {
  const consumedItems = await getConsumedItemsForHabits(userId);
  return consumedItems
    .filter((item) => item.isValid && item.sourceData !== null)
    .map((item) => item.sourceData!);
}

export async function getGuardrailsItemsInGoals(userId: string): Promise<RoadmapItem[]> {
  const consumedItems = await getConsumedItemsForGoals(userId);
  return consumedItems
    .filter((item) => item.isValid && item.sourceData !== null && item.sourceData)
    .map((item) => item.sourceData!);
}

export async function getGuardrailsItemsInNotes(userId: string): Promise<RoadmapItem[]> {
  const consumedItems = await getConsumedItemsForNotes(userId);
  return consumedItems
    .filter((item) => item.isValid && item.sourceData !== null)
    .map((item) => item.sourceData!);
}

export async function getInvalidLinks(userId: string): Promise<PersonalLink[]> {
  const links = await getPersonalLinksForUser(userId);
  const invalidLinks: PersonalLink[] = [];

  for (const link of links) {
    if (link.sourceType === 'roadmap_item') {
      const sourceItem = await getRoadmapItem(link.sourceId);
      if (!sourceItem) {
        invalidLinks.push(link);
      }
    }
  }

  return invalidLinks;
}

export async function getRoadmapItemLinksForSpace(
  userId: string,
  spaceType: PersonalSpaceType
): Promise<PersonalLink[]> {
  const links = await getPersonalLinksForUser(userId, {
    spaceType,
    sourceType: 'roadmap_item',
  });

  return links;
}

export function groupConsumedItemsByStatus(items: ConsumedItem[]): Record<string, ConsumedItem[]> {
  const grouped: Record<string, ConsumedItem[]> = {
    not_started: [],
    in_progress: [],
    completed: [],
    blocked: [],
    other: [],
  };

  for (const item of items) {
    if (!item.isValid || !item.derivedState) {
      grouped.other.push(item);
      continue;
    }

    const status = item.derivedState.sourceStatus || 'other';
    if (status in grouped) {
      grouped[status].push(item);
    } else {
      grouped.other.push(item);
    }
  }

  return grouped;
}

export function filterValidItems(items: ConsumedItem[]): ConsumedItem[] {
  return items.filter((item) => item.isValid);
}

export function filterInvalidItems(items: ConsumedItem[]): ConsumedItem[] {
  return items.filter((item) => !item.isValid);
}

export function getOverdueItems(items: ConsumedItem[]): ConsumedItem[] {
  return items.filter(
    (item) => item.isValid && item.derivedState?.deadlineState === 'overdue'
  );
}

export function getDueSoonItems(items: ConsumedItem[]): ConsumedItem[] {
  return items.filter(
    (item) => item.isValid && item.derivedState?.deadlineState === 'due_soon'
  );
}

export function getCompletedItems(items: ConsumedItem[]): ConsumedItem[] {
  return items.filter((item) => item.isValid && item.derivedState?.isCompleted === true);
}
