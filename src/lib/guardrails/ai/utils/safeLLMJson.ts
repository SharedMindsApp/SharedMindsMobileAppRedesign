export function sanitizeJSON(text: string): string {
  let sanitized = text.trim();

  const jsonMatch = sanitized.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    sanitized = jsonMatch[0];
  }

  const codeBlockMatch = sanitized.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (codeBlockMatch) {
    sanitized = codeBlockMatch[1].trim();
  }

  sanitized = sanitized.replace(/,\s*([}\]])/g, '$1');

  sanitized = sanitized.replace(/([{,]\s*)(\w+):/g, '$1"$2":');

  sanitized = sanitized.replace(/:\s*'([^']*)'/g, ': "$1"');

  sanitized = sanitized.replace(/\\([^"\\\/bfnrtu])/g, '\\\\$1');

  sanitized = sanitized.replace(/\t/g, '\\t');
  sanitized = sanitized.replace(/\r/g, '\\r');

  return sanitized;
}

export function parseLLMJSON<T = any>(text: string): T {
  const sanitized = sanitizeJSON(text);

  try {
    return JSON.parse(sanitized) as T;
  } catch (firstError) {
    try {
      const doubleEscaped = sanitized.replace(/\\/g, '\\\\');
      return JSON.parse(doubleEscaped) as T;
    } catch (secondError) {
      try {
        const withoutNewlines = sanitized.replace(/\n/g, ' ').replace(/\r/g, '');
        return JSON.parse(withoutNewlines) as T;
      } catch (thirdError) {
        throw new Error(
          `Failed to parse JSON after multiple sanitization attempts. Original error: ${
            firstError instanceof Error ? firstError.message : String(firstError)
          }. Sanitized text: ${sanitized.substring(0, 500)}...`
        );
      }
    }
  }
}

export function validateRoadmapStructure(data: any): boolean {
  if (!data || typeof data !== 'object') {
    return false;
  }

  if (!Array.isArray(data.roadmap)) {
    return false;
  }

  for (const section of data.roadmap) {
    if (!section.track || typeof section.track !== 'string') {
      return false;
    }

    if (!Array.isArray(section.items)) {
      return false;
    }

    for (const item of section.items) {
      if (!item.title || typeof item.title !== 'string') {
        return false;
      }

      if (!item.description || typeof item.description !== 'string') {
        return false;
      }

      if (item.estimated_hours !== undefined && typeof item.estimated_hours !== 'number') {
        return false;
      }
    }
  }

  return true;
}
