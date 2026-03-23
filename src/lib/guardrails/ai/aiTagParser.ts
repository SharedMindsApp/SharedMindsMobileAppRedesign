export interface ParsedTag {
  rawTag: string;
  normalizedTag: string;
  startPosition: number;
  endPosition: number;
}

export interface TagParseResult {
  originalText: string;
  parsedTags: ParsedTag[];
  textWithoutTags: string;
}

const TAG_REGEX = /@([a-zA-Z0-9]+)/g;
const MAX_TAGS_PER_PROMPT = 5;

export function parseTagsFromText(text: string): TagParseResult {
  const parsedTags: ParsedTag[] = [];
  const matches = text.matchAll(TAG_REGEX);

  for (const match of matches) {
    if (parsedTags.length >= MAX_TAGS_PER_PROMPT) {
      console.warn(`Maximum tag limit (${MAX_TAGS_PER_PROMPT}) reached, ignoring additional tags`);
      break;
    }

    const rawTag = match[1];
    const normalizedTag = normalizeTagName(rawTag);

    parsedTags.push({
      rawTag,
      normalizedTag,
      startPosition: match.index!,
      endPosition: match.index! + match[0].length,
    });
  }

  const textWithoutTags = text.replace(TAG_REGEX, '').trim();

  return {
    originalText: text,
    parsedTags,
    textWithoutTags,
  };
}

export function normalizeTagName(tagName: string): string {
  return tagName
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
    .trim();
}

export function normalizeEntityName(entityName: string): string {
  return entityName
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
    .trim();
}

export function extractUniqueNormalizedTags(text: string): string[] {
  const result = parseTagsFromText(text);
  const uniqueTags = new Set(result.parsedTags.map(t => t.normalizedTag));
  return Array.from(uniqueTags);
}

export function hasValidTags(text: string): boolean {
  const result = parseTagsFromText(text);
  return result.parsedTags.length > 0;
}

export function getTagCount(text: string): number {
  const result = parseTagsFromText(text);
  return result.parsedTags.length;
}

export function validateTagLimits(text: string): { valid: boolean; warnings: string[] } {
  const warnings: string[] = [];
  const tagCount = getTagCount(text);

  if (tagCount > MAX_TAGS_PER_PROMPT) {
    warnings.push(`Too many tags: ${tagCount} exceeds limit of ${MAX_TAGS_PER_PROMPT}`);
  }

  if (tagCount === 0) {
    warnings.push('No valid tags found in text');
  }

  return {
    valid: tagCount > 0 && tagCount <= MAX_TAGS_PER_PROMPT,
    warnings,
  };
}

export const TAG_PARSING_EXAMPLES = {
  SIMPLE: {
    input: 'Help me plan @marketingplan',
    output: { rawTag: 'marketingplan', normalizedTag: 'marketingplan' },
  },
  WITH_SPACES: {
    input: 'Check my @rachelsweddingday event',
    output: { rawTag: 'rachelsweddingday', normalizedTag: 'rachelsweddingday' },
    note: "User types entity name without spaces (Rachel's Wedding Day → @rachelsweddingday)",
  },
  CASE_INSENSITIVE: {
    input: 'Compare @MarketingPlan and @marketingplan',
    output: { normalizedTag: 'marketingplan', note: 'Both resolve to same normalized form' },
  },
  MULTIPLE_TAGS: {
    input: 'Coordinate @johndoe on @projectalpha for @calendar integration',
    output: { parsedTags: ['johndoe', 'projectalpha', 'calendar'] },
  },
  MAX_LIMIT: {
    input: '@one @two @three @four @five @six',
    output: { parsedTags: ['one', 'two', 'three', 'four', 'five'], ignored: ['six'] },
    note: 'Max 5 tags per prompt',
  },
};

export const TAG_PARSING_RULES = {
  PREFIX: 'Tags must start with @',
  NO_SPACES: 'Tags cannot contain spaces (user types continuous string)',
  ALPHANUMERIC: 'Tags can only contain letters and numbers',
  CASE_INSENSITIVE: 'Tags are normalized to lowercase',
  MAX_TAGS: `Maximum ${MAX_TAGS_PER_PROMPT} tags per prompt`,
  NO_MUTATION: 'Original prompt text is never mutated',
  DETERMINISTIC: 'Same input = same parsing result',
};

export const TAG_PARSING_NOTES = {
  USER_EXPERIENCE: 'Users type entity names without spaces, case does not matter',
  NORMALIZATION: 'All punctuation and symbols are removed during normalization',
  PRESERVATION: 'Original text is preserved for AI context',
  LIMITS: 'Hard limit prevents token overflow from excessive tags',
  VALIDATION: 'Tag limits are enforced before resolution',
};
