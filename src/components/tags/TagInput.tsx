/**
 * TagInput Component
 * 
 * Inline tag input with @ symbol support.
 * Users type @ to start a tag, space to finish it.
 * Tags are displayed inline and can be removed.
 * 
 * Features:
 * - @ symbol triggers tag creation
 * - Space finishes the current tag
 * - Tags displayed as inline chips
 * - Remove tags by clicking X
 * - Mobile-friendly
 */

import { useState, useRef, useEffect, useCallback } from 'react';
import { X, Tag as TagIcon } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import {
  createTag,
  getUserTags,
  addTagToEntity,
  removeTagFromEntity,
  getTagsForEntity,
  type EntityType,
} from '../../lib/tags/tagService';

interface TagInputProps {
  userId: string;
  entityType: EntityType;
  entityId: string | null; // null for new entities (tags will be linked after creation)
  onTagsChange?: (tagNames: string[]) => void; // Callback with tag names for new entities
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

interface TagChip {
  name: string;
  id: string | null; // null for unsaved tags, tag ID for saved tags
}

export function TagInput({
  userId,
  entityType,
  entityId,
  onTagsChange,
  placeholder = 'Add tags with @ (e.g., @work @urgent)',
  disabled = false,
  className = '',
}: TagInputProps) {
  const { user } = useAuth();
  const [inputValue, setInputValue] = useState('');
  const [tags, setTags] = useState<TagChip[]>([]);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Load existing tags if entity exists
  useEffect(() => {
    if (entityId && user) {
      loadExistingTags();
    }
  }, [entityId, user]);

  const loadExistingTags = async () => {
    if (!entityId || !user) return;

    try {
      setLoading(true);
      const existingTags = await getTagsForEntity(entityType, entityId);
      setTags(existingTags.map(tag => ({ name: tag.name, id: tag.id })));
      
      // Notify parent of tag names
      if (onTagsChange) {
        onTagsChange(existingTags.map(tag => tag.name));
      }
    } catch (err) {
      console.error('[TagInput] Error loading tags:', err);
    } finally {
      setLoading(false);
    }
  };

  // Handle input changes - detect @ symbol and space
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (disabled) return;

    const value = e.target.value;
    const cursorPos = e.target.selectionStart || 0;

    // Check if user just typed a space
    if (value.endsWith(' ') && !inputValue.endsWith(' ')) {
      // Check if there's a tag starting with @ before the space
      const lastAtSymbol = value.lastIndexOf('@', cursorPos - 1);
      if (lastAtSymbol >= 0) {
        const tagText = value.slice(lastAtSymbol + 1, cursorPos - 1).trim();
        
        if (tagText && !tagText.includes(' ') && !tagText.includes('@')) {
          // Valid tag - create it
          handleCreateTag(tagText);
          // Remove the tag text from input (keep everything before @)
          const beforeTag = value.slice(0, lastAtSymbol);
          setInputValue(beforeTag);
          return;
        }
      }
    }

    // Check for multiple @ symbols (user wants to start another tag)
    const atCount = (value.match(/@/g) || []).length;
    const prevAtCount = (inputValue.match(/@/g) || []).length;
    
    if (atCount > prevAtCount && inputValue.length > 0) {
      // User typed another @, finish previous tag if exists
      const lastAtSymbol = inputValue.lastIndexOf('@');
      if (lastAtSymbol >= 0) {
        const tagText = inputValue.slice(lastAtSymbol + 1).trim();
        if (tagText && !tagText.includes(' ') && !tagText.includes('@')) {
          handleCreateTag(tagText);
          setInputValue('@');
          return;
        }
      }
    }

    setInputValue(value);
  };

  // Create a tag (either new or find existing)
  const handleCreateTag = async (tagName: string) => {
    if (!tagName.trim() || !user) return;

    // Normalize tag name (lowercase, no spaces)
    const normalizedName = tagName.trim().toLowerCase().replace(/\s+/g, '');

    // Check if tag already added
    if (tags.some(t => t.name.toLowerCase() === normalizedName)) {
      return;
    }

    try {
      // Try to find existing tag or create new one
      const userTags = await getUserTags(userId);
      const existingTag = userTags.find(t => t.name.toLowerCase() === normalizedName);

      let tagId: string;

      if (existingTag) {
        tagId = existingTag.id;
      } else {
        // Create new tag
        const newTag = await createTag(userId, {
          name: normalizedName,
        });
        tagId = newTag.id;
      }

      // Add tag to local state
      const newTagChip: TagChip = {
        name: normalizedName,
        id: tagId,
      };

      const updatedTags = [...tags, newTagChip];
      setTags(updatedTags);

      // If entity exists, link the tag immediately
      if (entityId) {
        try {
          await addTagToEntity(userId, tagId, entityType, entityId);
        } catch (err) {
          console.error('[TagInput] Error linking tag:', err);
        }
      }

      // Notify parent of tag names
      if (onTagsChange) {
        onTagsChange(updatedTags.map(t => t.name));
      }
    } catch (err) {
      console.error('[TagInput] Error creating tag:', err);
    }
  };

  // Remove a tag
  const handleRemoveTag = async (tagName: string, tagId: string | null) => {
    if (!user) return;

    // Remove from local state
    const updatedTags = tags.filter(t => t.name !== tagName);
    setTags(updatedTags);

    // If entity exists and tag has ID, unlink it
    if (entityId && tagId) {
      try {
        await removeTagFromEntity(userId, tagId, entityType, entityId);
      } catch (err) {
        console.error('[TagInput] Error unlinking tag:', err);
      }
    }

    // Notify parent of tag names
    if (onTagsChange) {
      onTagsChange(updatedTags.map(t => t.name));
    }
  };

  // Handle keydown for better UX
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (disabled) return;

    // Backspace at start of input removes last tag
    if (e.key === 'Backspace' && inputValue === '' && tags.length > 0) {
      const lastTag = tags[tags.length - 1];
      handleRemoveTag(lastTag.name, lastTag.id);
      e.preventDefault();
    }

    // Enter creates tag if there's text after @
    if (e.key === 'Enter') {
      e.preventDefault();
      const lastAtSymbol = inputValue.lastIndexOf('@');
      if (lastAtSymbol >= 0) {
        const tagText = inputValue.slice(lastAtSymbol + 1).trim();
        if (tagText && !tagText.includes(' ') && !tagText.includes('@')) {
          handleCreateTag(tagText);
          setInputValue('');
        }
      }
    }
  };

  return (
    <div className={`space-y-2 ${className}`}>
      {/* Tags Display */}
      {tags.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {tags.map((tag) => (
            <div
              key={tag.name}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-blue-50 border border-blue-200 rounded-lg text-sm"
            >
              <TagIcon className="w-3.5 h-3.5 text-blue-600" />
              <span className="text-blue-900 font-medium">{tag.name}</span>
              {!disabled && (
                <button
                  type="button"
                  onClick={() => handleRemoveTag(tag.name, tag.id)}
                  className="p-0.5 hover:bg-blue-100 rounded transition-colors min-w-[20px] min-h-[20px] flex items-center justify-center"
                  aria-label={`Remove tag ${tag.name}`}
                >
                  <X className="w-3.5 h-3.5 text-blue-600" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Input */}
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled || loading}
          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
        />
        {loading && (
          <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
            <div className="w-4 h-4 border-2 border-gray-300 border-t-blue-600 rounded-full animate-spin" />
          </div>
        )}
      </div>

      {/* Help text */}
      {!disabled && (
        <p className="text-xs text-gray-500">
          Type <span className="font-mono font-medium">@</span> to start a tag, space to finish it
        </p>
      )}
    </div>
  );
}
