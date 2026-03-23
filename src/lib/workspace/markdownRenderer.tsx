/**
 * Simple Markdown Renderer for Workspace Text Units
 * 
 * Provides basic markdown rendering without external dependencies.
 * Supports: bold, italic, inline code, links, headers, lists, code blocks
 */

import React from 'react';

export function renderMarkdown(text: string): React.ReactNode {
  if (!text) return null;

  const lines = text.split('\n');
  const elements: React.ReactNode[] = [];
  let inCodeBlock = false;
  let codeBlockContent: string[] = [];
  let codeBlockLanguage = '';

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Code blocks
    if (line.trim().startsWith('```')) {
      if (inCodeBlock) {
        // End code block
        elements.push(
          <pre key={`code-${i}`} className="bg-gray-900 text-gray-100 p-3 rounded-lg overflow-x-auto my-2 text-sm">
            <code>{codeBlockContent.join('\n')}</code>
          </pre>
        );
        codeBlockContent = [];
        inCodeBlock = false;
        codeBlockLanguage = '';
      } else {
        // Start code block
        codeBlockLanguage = line.trim().slice(3).trim();
        inCodeBlock = true;
      }
      continue;
    }

    if (inCodeBlock) {
      codeBlockContent.push(line);
      continue;
    }

    // Headers
    if (line.startsWith('# ')) {
      elements.push(<h1 key={i} className="text-2xl font-bold mt-4 mb-2">{renderInlineMarkdown(line.slice(2))}</h1>);
      continue;
    }
    if (line.startsWith('## ')) {
      elements.push(<h2 key={i} className="text-xl font-bold mt-3 mb-2">{renderInlineMarkdown(line.slice(3))}</h2>);
      continue;
    }
    if (line.startsWith('### ')) {
      elements.push(<h3 key={i} className="text-lg font-bold mt-2 mb-1">{renderInlineMarkdown(line.slice(4))}</h3>);
      continue;
    }

    // Lists
    if (line.trim().startsWith('- ') || line.trim().startsWith('* ')) {
      const listItems: string[] = [line.trim().slice(2)];
      let j = i + 1;
      while (j < lines.length && (lines[j].trim().startsWith('- ') || lines[j].trim().startsWith('* ') || lines[j].trim() === '')) {
        if (lines[j].trim()) {
          listItems.push(lines[j].trim().slice(2));
        }
        j++;
      }
      elements.push(
        <ul key={i} className="list-disc list-inside space-y-1 my-2 ml-4">
          {listItems.map((item, idx) => (
            <li key={idx}>{renderInlineMarkdown(item)}</li>
          ))}
        </ul>
      );
      i = j - 1;
      continue;
    }

    // Empty lines
    if (line.trim() === '') {
      elements.push(<br key={i} />);
      continue;
    }

    // Regular paragraph
    elements.push(<p key={i} className="my-1">{renderInlineMarkdown(line)}</p>);
  }

  // Handle remaining code block
  if (inCodeBlock && codeBlockContent.length > 0) {
    elements.push(
      <pre key="code-final" className="bg-gray-900 text-gray-100 p-3 rounded-lg overflow-x-auto my-2 text-sm">
        <code>{codeBlockContent.join('\n')}</code>
      </pre>
    );
  }

  return <div className="prose prose-sm max-w-none">{elements}</div>;
}

function renderInlineMarkdown(text: string): React.ReactNode {
  const parts: React.ReactNode[] = [];
  let currentIndex = 0;

  // Pattern for bold **text** or __text__ (process first to avoid conflicts)
  const boldPattern = /(\*\*|__)(.+?)\1/g;
  // Pattern for strikethrough ~~text~~
  const strikethroughPattern = /~~(.+?)~~/g;
  // Pattern for inline code `code` (process before italic to avoid conflicts)
  const codePattern = /`(.+?)`/g;
  // Pattern for italic *text* or _text_ (but not ** or __)
  // Simple approach: match *text* or _text_ that aren't part of bold
  const italicPattern = /\*([^*\n]+?)\*|_([^_\n]+?)_/g;
  // Pattern for links [text](url)
  const linkPattern = /\[([^\]]+)\]\(([^)]+)\)/g;

  // Find all matches
  const matches: Array<{ start: number; end: number; type: 'bold' | 'italic' | 'strikethrough' | 'code' | 'link'; content: string; url?: string }> = [];

  let match;
  while ((match = boldPattern.exec(text)) !== null) {
    matches.push({
      start: match.index,
      end: match.index + match[0].length,
      type: 'bold',
      content: match[2],
    });
  }

  while ((match = strikethroughPattern.exec(text)) !== null) {
    // Skip if it's part of another match
    const isOverlapping = matches.some(m => m.start <= match!.index && match!.index < m.end);
    if (!isOverlapping) {
      matches.push({
        start: match.index,
        end: match.index + match[0].length,
        type: 'strikethrough',
        content: match[1],
      });
    }
  }

  while ((match = codePattern.exec(text)) !== null) {
    // Skip if it's part of another match
    const isOverlapping = matches.some(m => m.start <= match!.index && match!.index < m.end);
    if (!isOverlapping) {
      matches.push({
        start: match.index,
        end: match.index + match[0].length,
        type: 'code',
        content: match[1],
      });
    }
  }

  // Process italic after bold/code to avoid conflicts
  while ((match = italicPattern.exec(text)) !== null) {
    const matchStart = match.index;
    const matchEnd = match.index + match[0].length;
    const content = match[1] || match[2]; // Handle both * and _ patterns
    
    // Skip if it's part of a bold, strikethrough, or code match
    const isOverlapping = matches.some(m => 
      (m.start <= matchStart && matchStart < m.end) || 
      (m.start < matchEnd && matchEnd <= m.end) ||
      (matchStart <= m.start && m.end <= matchEnd)
    );
    if (!isOverlapping) {
      matches.push({
        start: matchStart,
        end: matchEnd,
        type: 'italic',
        content: content,
      });
    }
  }

  while ((match = linkPattern.exec(text)) !== null) {
    matches.push({
      start: match.index,
      end: match.index + match[0].length,
      type: 'link',
      content: match[1],
      url: match[2],
    });
  }

  // Sort matches by start position
  matches.sort((a, b) => a.start - b.start);

  // Build React elements
  for (const match of matches) {
    // Add text before match
    if (match.start > currentIndex) {
      parts.push(text.slice(currentIndex, match.start));
    }

    // Add matched element
    if (match.type === 'bold') {
      parts.push(<strong key={`bold-${match.start}`}>{match.content}</strong>);
    } else if (match.type === 'italic') {
      parts.push(<em key={`italic-${match.start}`}>{match.content}</em>);
    } else if (match.type === 'strikethrough') {
      parts.push(<del key={`strikethrough-${match.start}`} className="line-through">{match.content}</del>);
    } else if (match.type === 'code') {
      parts.push(<code key={`code-${match.start}`} className="bg-gray-100 px-1 rounded text-sm font-mono">{match.content}</code>);
    } else if (match.type === 'link') {
      parts.push(
        <a
          key={`link-${match.start}`}
          href={match.url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-600 hover:underline"
        >
          {match.content}
        </a>
      );
    }

    currentIndex = match.end;
  }

  // Add remaining text
  if (currentIndex < text.length) {
    parts.push(text.slice(currentIndex));
  }

  return parts.length > 0 ? <>{parts}</> : text;
}
