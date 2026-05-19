/**
 * Placeholder for the pre-pivot recipe AI service.
 *
 * The legacy file integrated with the household / AI-routing infrastructure
 * which has been archived. Some active pantry code still imports
 * `getHouseholdIdFromSpaceId` so we keep that single export as a no-op —
 * returning null is the same as "no household scoping" for current pantry
 * features (admin/founder personal use only).
 *
 * Full original 1300-line file is preserved in the sibling legacy repo.
 */

export async function getHouseholdIdFromSpaceId(_spaceId: string | null | undefined): Promise<string | null> {
  return null;
}
