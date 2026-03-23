/**
 * Smart Paste Parser
 * 
 * Parses pasted text into structured blocks using heuristics,
 * similar to Notion's paste behavior but more assistive.
 * Enhanced to support ChatGPT-compatible Markdown formatting.
 */

export interface ParsedBlock {
  type: 'heading' | 'paragraph' | 'list' | 'callout' | 'code' | 'divider' | 'quote';
  level?: number; // For headings (1-3)
  content: string;
  items?: string[]; // For lists
  calloutType?: 'info' | 'warning' | 'success' | 'error';
  language?: string; // For code blocks
  originalLine: string;
  hasInlineFormatting?: boolean; // True if contains **, *, `, ~~, etc.
}

export interface ParsedPaste {
  blocks: ParsedBlock[];
  confidence: 'high' | 'medium' | 'low';
  originalText: string;
}

/**
 * Parse pasted text into structured blocks
 */
export function parsePastedText(text: string): ParsedPaste {
  const lines = text.split('\n');
  const blocks: ParsedBlock[] = [];
  let inCodeBlock = false;
  let codeBlockLanguage: string | undefined = undefined;
  let codeBlockContent: string[] = [];
  let confidence: 'high' | 'medium' | 'low' = 'low';
  let structureIndicators = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    // Code blocks (```)
    if (trimmed.startsWith('```')) {
      if (inCodeBlock) {
        // End code block
        if (codeBlockContent.length > 0) {
          blocks.push({
            type: 'code',
            content: codeBlockContent.join('\n'),
            language: codeBlockLanguage,
            originalLine: line,
          });
          codeBlockContent = [];
          codeBlockLanguage = undefined;
          structureIndicators++;
        }
        inCodeBlock = false;
      } else {
        // Start code block - extract language from ```lang syntax
        const languageMatch = trimmed.match(/^```(\w+)?/);
        if (languageMatch && languageMatch[1]) {
          codeBlockLanguage = languageMatch[1];
        }
        inCodeBlock = true;
        structureIndicators++;
      }
      continue;
    }

    if (inCodeBlock) {
      codeBlockContent.push(line);
      continue;
    }

    // Dividers: --- on its own line
    if (trimmed === '---' || trimmed.match(/^[-]{3,}$/)) {
      blocks.push({
        type: 'divider',
        content: '',
        originalLine: line,
      });
      structureIndicators++;
      continue;
    }

    // Empty lines → section breaks (dividers)
    if (trimmed === '') {
      // Only add divider if not at start/end and previous block isn't already a divider
      if (blocks.length > 0 && blocks[blocks.length - 1].type !== 'divider') {
        blocks.push({
          type: 'divider',
          content: '',
          originalLine: line,
        });
      }
      continue;
    }

    // Headings: #, ##, ###
    if (trimmed.startsWith('###')) {
      blocks.push({
        type: 'heading',
        level: 3,
        content: trimmed.slice(3).trim(),
        originalLine: line,
      });
      structureIndicators += 2;
      continue;
    } else if (trimmed.startsWith('##')) {
      blocks.push({
        type: 'heading',
        level: 2,
        content: trimmed.slice(2).trim(),
        originalLine: line,
      });
      structureIndicators += 2;
      continue;
    } else if (trimmed.startsWith('#')) {
      blocks.push({
        type: 'heading',
        level: 1,
        content: trimmed.slice(1).trim(),
        originalLine: line,
      });
      structureIndicators += 2;
      continue;
    }

    // Short title-case lines → heading candidates
    if (trimmed.length < 60 && 
        trimmed.length > 0 && 
        /^[A-Z][a-z]+(\s+[A-Z][a-z]+)*$/.test(trimmed) &&
        !trimmed.endsWith('.') &&
        !trimmed.endsWith(',') &&
        !trimmed.endsWith(':')) {
      // Likely a heading
      blocks.push({
        type: 'heading',
        level: 2,
        content: trimmed,
        originalLine: line,
      });
      structureIndicators++;
      continue;
    }

    // Quotes/Callouts: > quoted text
    if (trimmed.startsWith('>')) {
      const quoteContent = trimmed.slice(1).trim();
      // Collect consecutive quote lines
      const quoteLines: string[] = [quoteContent];
      let j = i + 1;
      while (j < lines.length) {
        const nextLine = lines[j].trim();
        if (nextLine.startsWith('>')) {
          quoteLines.push(nextLine.slice(1).trim());
          j++;
        } else if (nextLine === '') {
          break;
        } else {
          break;
        }
      }
      
      blocks.push({
        type: 'quote',
        content: quoteLines.join('\n'),
        originalLine: line,
      });
      structureIndicators += 2;
      i = j - 1;
      continue;
    }

    // Callouts: Example:, Note:, Tip:, Warning:, Error:
    const calloutMatch = trimmed.match(/^(Example|Note|Tip|Warning|Error|Info|Important):\s*(.+)$/i);
    if (calloutMatch) {
      const [, type, content] = calloutMatch;
      let calloutType: 'info' | 'warning' | 'success' | 'error' = 'info';
      if (type.toLowerCase() === 'warning' || type.toLowerCase() === 'error') {
        calloutType = 'error';
      } else if (type.toLowerCase() === 'tip' || type.toLowerCase() === 'success') {
        calloutType = 'success';
      }
      
      blocks.push({
        type: 'callout',
        content: content.trim(),
        calloutType,
        originalLine: line,
      });
      structureIndicators += 2;
      continue;
    }

    // Lists: -, *, •, 1., 2., etc. (with nested list support via indentation)
    const listMatch = trimmed.match(/^(\s*)([-*•]|\d+\.)\s+(.+)$/);
    if (listMatch) {
      const [, indent, marker, item] = listMatch;
      const indentLevel = indent.length;
      const isChecklist = (trimmed.includes('[ ]') || trimmed.includes('[x]')) && marker === '-';
      
      // Collect consecutive list items at same or deeper indentation level
      const items: string[] = [item.trim()];
      let j = i + 1;
      while (j < lines.length) {
        const nextLine = lines[j];
        const nextTrimmed = nextLine.trim();
        if (nextTrimmed === '') {
          // Empty line ends the list
          break;
        }
        const nextMatch = nextLine.match(/^(\s*)([-*•]|\d+\.)\s+(.+)$/);
        if (nextMatch) {
          const [, nextIndent] = nextMatch;
          // Only include if at same or deeper indentation (nested lists)
          if (nextIndent.length >= indentLevel) {
            items.push(nextMatch[3].trim());
            j++;
          } else {
            // Less indentation means we're back to a parent list or out of list
            break;
          }
        } else {
          // Non-list line ends the list
          break;
        }
      }
      
      blocks.push({
        type: isChecklist ? 'list' : 'list',
        content: '',
        items,
        originalLine: line,
      });
      structureIndicators += 2;
      i = j - 1; // Skip processed lines
      continue;
    }

    // Regular paragraph
    // Collect consecutive non-empty lines into a paragraph
    const paragraphLines: string[] = [line];
    let j = i + 1;
    while (j < lines.length && lines[j].trim() !== '' && 
           !lines[j].trim().startsWith('#') &&
           !lines[j].trim().startsWith('>') &&
           !lines[j].trim().match(/^(\s*)([-*•]|\d+\.)\s+/) &&
           !lines[j].trim().match(/^[-]{3,}$/) &&
           !lines[j].trim().startsWith('```')) {
      paragraphLines.push(lines[j]);
      j++;
    }
    
    const paragraphText = paragraphLines.join('\n').trim();
    // Check for inline Markdown formatting (comprehensive detection for ChatGPT-style content)
    const hasInlineFormatting = /(\*\*[^*]+\*\*|__[^_]+__|(?<!\*)\*[^*\n]+\*(?!\*)|(?<!_)_[^_\n]+_(?!_)|`[^`]+`|~~[^~]+~~|\[.*\]\(.*\))/.test(paragraphText);
    
    blocks.push({
      type: 'paragraph',
      content: paragraphText,
      hasInlineFormatting,
      originalLine: line,
    });
    
    i = j - 1; // Skip processed lines
  }

  // Handle remaining code block
  if (inCodeBlock && codeBlockContent.length > 0) {
    blocks.push({
      type: 'code',
      content: codeBlockContent.join('\n'),
      language: codeBlockLanguage,
      originalLine: '',
    });
    structureIndicators++;
  }

  // Calculate confidence based on structure indicators
  if (structureIndicators >= blocks.length * 0.5) {
    confidence = 'high';
  } else if (structureIndicators >= blocks.length * 0.2) {
    confidence = 'medium';
  }

  return {
    blocks,
    confidence,
    originalText: text,
  };
}

/**
 * Convert parsed blocks to Workspace units structure
 */
export function convertBlocksToWorkspaceUnits(
  blocks: ParsedBlock[],
  startOrderIndex: number = 1
): Array<{
  type: 'text' | 'bullet' | 'checklist' | 'group' | 'callout' | 'code' | 'divider';
  content: any;
  order_index: number;
  parent_id?: string;
}> {
  const units: Array<{
    type: 'text' | 'bullet' | 'checklist' | 'group' | 'callout' | 'code' | 'divider';
    content: any;
    order_index: number;
    parent_id?: string;
  }> = [];
  
  let currentOrderIndex = startOrderIndex;
  const headingStack: Array<{ id: string; level: number }> = []; // Track heading hierarchy

  for (const block of blocks) {
    let parentId: string | undefined;
    
    // Find appropriate parent based on heading hierarchy
    if (block.type === 'heading') {
      // Pop headings that are at same or higher level
      while (headingStack.length > 0 && 
             headingStack[headingStack.length - 1].level >= (block.level || 1)) {
        headingStack.pop();
      }
      // Parent is the last heading in stack (if any)
      parentId = headingStack.length > 0 ? headingStack[headingStack.length - 1].id : undefined;
    } else {
      // Non-heading blocks nest under the most recent heading
      parentId = headingStack.length > 0 ? headingStack[headingStack.length - 1].id : undefined;
    }

    let unitType: 'text' | 'bullet' | 'checklist' | 'group' | 'callout' | 'code' | 'divider';
    let unitContent: any;

    switch (block.type) {
      case 'heading':
        unitType = 'group';
        unitContent = {
          title: block.content,
          summary: '',
        };
        // Add to heading stack (using order_index as temporary ID)
        headingStack.push({ id: `temp-${currentOrderIndex}`, level: block.level || 1 });
        break;
      
      case 'list':
        unitType = 'bullet';
        unitContent = {
          items: block.items || [],
          ordered: false,
        };
        break;
      
      case 'callout':
        unitType = 'callout';
        unitContent = {
          text: block.content,
          type: block.calloutType || 'info',
        };
        break;
      
      case 'code':
        unitType = 'code';
        unitContent = {
          code: block.content,
          language: block.language || '',
        };
        break;
      
      case 'divider':
        unitType = 'divider';
        unitContent = {
          style: 'solid' as const,
        };
        break;
      
      case 'quote':
        // Convert quotes to callouts
        unitType = 'callout';
        unitContent = {
          text: block.content,
          type: 'info' as const,
        };
        break;
      
      case 'paragraph':
      default:
        unitType = 'text';
        // Use markdown formatting if inline formatting detected
        const formatting = block.hasInlineFormatting ? 'markdown' : 'plain';
        unitContent = {
          text: block.content,
          formatting: formatting as 'markdown' | 'plain',
        };
        break;
    }

    units.push({
      type: unitType,
      content: unitContent,
      order_index: currentOrderIndex++,
      parent_id: parentId,
    });
  }

  // Replace temporary IDs with actual parent references
  // This is a simplified version - in a real implementation, we'd need to
  // track the actual unit IDs after creation
  return units;
}
