import type {
  PersonalLink,
  PersonalVisibilityState,
  PersonalSpaceType,
} from './consumptionTypes';
import {
  getPersonalLinkById,
  updateVisibilityState as updateVisibilityStateInDb,
  getPersonalLinksForUser,
} from './consumptionService';

export interface VisibilityFilter {
  includeVisible?: boolean;
  includeHidden?: boolean;
  includeMuted?: boolean;
  includePinned?: boolean;
}

export interface VisibilityUpdate {
  linkId: string;
  newState: PersonalVisibilityState;
  reason?: string;
}

export async function hideLink(linkId: string): Promise<void> {
  await updateVisibilityStateInDb(linkId, 'hidden');
}

export async function showLink(linkId: string): Promise<void> {
  await updateVisibilityStateInDb(linkId, 'visible');
}

export async function muteLink(linkId: string): Promise<void> {
  await updateVisibilityStateInDb(linkId, 'muted');
}

export async function unmuteLink(linkId: string): Promise<void> {
  await updateVisibilityStateInDb(linkId, 'visible');
}

export async function pinLink(linkId: string): Promise<void> {
  await updateVisibilityStateInDb(linkId, 'pinned');
}

export async function unpinLink(linkId: string): Promise<void> {
  await updateVisibilityStateInDb(linkId, 'visible');
}

export function filterLinksByVisibility(
  links: PersonalLink[],
  filter: VisibilityFilter = {}
): PersonalLink[] {
  const {
    includeVisible = true,
    includeHidden = false,
    includeMuted = false,
    includePinned = true,
  } = filter;

  return links.filter((link) => {
    switch (link.visibilityState) {
      case 'visible':
        return includeVisible;
      case 'hidden':
        return includeHidden;
      case 'muted':
        return includeMuted;
      case 'pinned':
        return includePinned;
      default:
        return false;
    }
  });
}

export function getDefaultVisibilityFilter(): VisibilityFilter {
  return {
    includeVisible: true,
    includeHidden: false,
    includeMuted: false,
    includePinned: true,
  };
}

export function getVisibilityStates(link: PersonalLink): {
  isVisible: boolean;
  isHidden: boolean;
  isMuted: boolean;
  isPinned: boolean;
} {
  return {
    isVisible: link.visibilityState === 'visible',
    isHidden: link.visibilityState === 'hidden',
    isMuted: link.visibilityState === 'muted',
    isPinned: link.visibilityState === 'pinned',
  };
}

export async function bulkUpdateVisibility(updates: VisibilityUpdate[]): Promise<void> {
  const promises = updates.map((update) =>
    updateVisibilityStateInDb(update.linkId, update.newState)
  );

  await Promise.all(promises);
}

export async function hideAllCompletedForSpace(
  userId: string,
  spaceType: PersonalSpaceType
): Promise<void> {
  const links = await getPersonalLinksForUser(userId, { spaceType });

  const completedLinks = links.filter((link) => {
    const derivedState = link.derivedMetadata;
    return derivedState?.isCompleted === true;
  });

  await bulkUpdateVisibility(
    completedLinks.map((link) => ({
      linkId: link.id,
      newState: 'hidden',
      reason: 'auto-hide completed',
    }))
  );
}

export async function unhideAllForSpace(
  userId: string,
  spaceType: PersonalSpaceType
): Promise<void> {
  const links = await getPersonalLinksForUser(userId, {
    spaceType,
    visibilityState: ['hidden'],
  });

  await bulkUpdateVisibility(
    links.map((link) => ({
      linkId: link.id,
      newState: 'visible',
    }))
  );
}

export function sortLinksByVisibility(links: PersonalLink[]): PersonalLink[] {
  const visibilityOrder: Record<PersonalVisibilityState, number> = {
    pinned: 1,
    visible: 2,
    muted: 3,
    hidden: 4,
  };

  return [...links].sort((a, b) => {
    const orderA = visibilityOrder[a.visibilityState] || 99;
    const orderB = visibilityOrder[b.visibilityState] || 99;
    return orderA - orderB;
  });
}

export function getVisibilitySummary(links: PersonalLink[]): Record<PersonalVisibilityState, number> {
  const summary: Record<PersonalVisibilityState, number> = {
    visible: 0,
    hidden: 0,
    muted: 0,
    pinned: 0,
  };

  for (const link of links) {
    summary[link.visibilityState]++;
  }

  return summary;
}

export function shouldAutoHideBasedOnStatus(link: PersonalLink): boolean {
  const derivedState = link.derivedMetadata;

  if (derivedState?.sourceStatus === 'completed') {
    return true;
  }

  if (derivedState?.sourceStatus === 'cancelled') {
    return true;
  }

  if (derivedState?.sourceStatus === 'archived') {
    return true;
  }

  return false;
}

export function shouldShowOverdueWarning(link: PersonalLink): boolean {
  const derivedState = link.derivedMetadata;
  return derivedState?.isOverdue === true && link.visibilityState !== 'hidden';
}

export function getPinnedCount(links: PersonalLink[]): number {
  return links.filter((link) => link.visibilityState === 'pinned').length;
}

export function getHiddenCount(links: PersonalLink[]): number {
  return links.filter(
    (link) => link.visibilityState === 'hidden' || link.visibilityState === 'muted'
  ).length;
}
