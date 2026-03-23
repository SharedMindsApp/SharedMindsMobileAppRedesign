/**
 * TagPicker Component
 * 
 * Shared component for selecting and managing tags on entities.
 * Supports:
 * - Search existing tags
 * - Create new tag inline
 * - Color + icon optional
 * - Multi-select
 * - Keyboard-friendly
 * - Permission-aware (read-only disables)
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { X, Plus, Search, Tag as TagIcon } from 'lucide-react';
import {
  getUserTags,
  getTagsForEntity,
  addTagsToEntity,
  removeTagsFromEntity,
  createTag,
  type Tag,
  type EntityType,
} from '../../lib/tags/tagService';
import { FEATURE_CONTEXT_TAGGING } from '../../lib/featureFlags';
import type { PermissionFlags } from '../../lib/permissions/types';
import { ColorPicker } from './ColorPicker';
import { getCategoryColor } from '../../lib/tags/categoryColorSettings';

// ============================================================================
// Types
// ============================================================================

export interface TagPickerProps {
  userId: string;
  entityType: EntityType;
  entityId: string;
  permissions: PermissionFlags;
  compact?: boolean;
  onTagsChanged?: () => void;
}

// ============================================================================
// Component
// ============================================================================

export function TagPicker({
  userId,
  entityType,
  entityId,
  permissions,
  compact = false,
  onTagsChanged,
}: TagPickerProps) {
  const [allTags, setAllTags] = useState<Tag[]>([]);
  const [entityTags, setEntityTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newTagName, setNewTagName] = useState('');
  const [newTagColor, setNewTagColor] = useState<string>('');
  const [defaultColor, setDefaultColor] = useState<string>('gray');
  const [creating, setCreating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Permission checks
  const canView = permissions.can_view;
  const canEdit = permissions.can_edit;
  const canManage = permissions.can_manage;

  const loadTags = useCallback(async () => {
    try {
      setLoading(true);
      const [userTags, currentTags] = await Promise.all([
        getUserTags(userId),
        getTagsForEntity(entityType, entityId),
      ]);
      setAllTags(userTags);
      setEntityTags(currentTags);
    } catch (err) {
      console.error('[TagPicker] Error loading tags:', err);
    } finally {
      setLoading(false);
    }
  }, [userId, entityType, entityId]);

  useEffect(() => {
    if (canView && FEATURE_CONTEXT_TAGGING) {
      loadTags();
      // Load default color for category
      getCategoryColor(userId, entityType).then(color => {
        setDefaultColor(color);
        if (!newTagColor) {
          setNewTagColor(color);
        }
      }).catch(err => {
        console.error('[TagPicker] Error loading category color:', err);
      });
    }
  }, [canView, loadTags, userId, entityType]);

  // Feature flag check (after hooks)
  if (!FEATURE_CONTEXT_TAGGING) {
    return null;
  }

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        searchInputRef.current &&
        !searchInputRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
        setSearchQuery('');
        setShowCreateForm(false);
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  const handleToggleTag = async (tag: Tag) => {
    if (!canEdit || saving) return;

    const isTagged = entityTags.some(t => t.id === tag.id);

    try {
      setSaving(true);
      if (isTagged) {
        await removeTagsFromEntity(userId, [tag.id], entityType, entityId);
        setEntityTags(prev => prev.filter(t => t.id !== tag.id));
      } else {
        await addTagsToEntity(userId, [tag.id], entityType, entityId);
        setEntityTags(prev => [...prev, tag]);
      }
      onTagsChanged?.();
    } catch (err) {
      console.error('[TagPicker] Error toggling tag:', err);
      alert('Failed to update tags');
    } finally {
      setSaving(false);
    }
  };

  const handleCreateTag = async () => {
    if (!canManage || !newTagName.trim() || creating) return;

    try {
      setCreating(true);
      const category = entityType;
      const color = newTagColor || defaultColor;
      
      const newTag = await createTag(userId, {
        name: newTagName.trim(),
        color: color,
      });
      
      // Update category if column exists
      try {
        const { supabase } = await import('../../lib/supabase');
        await supabase
          .from('tags')
          .update({ category })
          .eq('id', newTag.id)
          .eq('owner_id', userId);
      } catch (err) {
        // Category column might not exist yet, ignore
      }
      
      // Add to all tags list
      setAllTags(prev => [...prev, newTag].sort((a, b) => a.name.localeCompare(b.name)));
      
      // Auto-select the new tag
      await addTagsToEntity(userId, [newTag.id], entityType, entityId);
      setEntityTags(prev => [...prev, newTag]);
      
      // Reset form
      setNewTagName('');
      setNewTagColor(defaultColor);
      setShowCreateForm(false);
      onTagsChanged?.();
    } catch (err: any) {
      console.error('[TagPicker] Error creating tag:', err);
      alert(err.message || 'Failed to create tag');
    } finally {
      setCreating(false);
    }
  };

  const handleRemoveTag = async (tag: Tag) => {
    if (!canEdit || saving) return;

    try {
      setSaving(true);
      await removeTagsFromEntity(userId, [tag.id], entityType, entityId);
      setEntityTags(prev => prev.filter(t => t.id !== tag.id));
      onTagsChanged?.();
    } catch (err) {
      console.error('[TagPicker] Error removing tag:', err);
      alert('Failed to remove tag');
    } finally {
      setSaving(false);
    }
  };

  // Filter tags based on search
  const filteredTags = allTags.filter(tag =>
    tag.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Available tags (not already applied)
  const availableTags = filteredTags.filter(
    tag => !entityTags.some(et => et.id === tag.id)
  );

  if (!canView) {
    return null;
  }

  if (compact) {
    // Compact view: show tags as chips, or "Add Tag" button if no tags and can edit
    return (
      <div className="flex flex-wrap gap-1.5 items-center relative" onClick={(e) => e.stopPropagation()}>
        {entityTags.map(tag => (
          <span
            key={tag.id}
            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
              tag.color
                ? `bg-${tag.color}-100 text-${tag.color}-700`
                : 'bg-gray-100 text-gray-700'
            }`}
          >
            {tag.icon && <TagIcon size={12} />}
            {tag.name}
            {canEdit && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleRemoveTag(tag);
                }}
                className="ml-1 hover:opacity-70"
                disabled={saving}
              >
                <X size={12} />
              </button>
            )}
          </span>
        ))}
        {canEdit && (
          <div className="relative inline-block">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setIsOpen(!isOpen);
                if (!isOpen) {
                  setTimeout(() => searchInputRef.current?.focus(), 0);
                }
              }}
              className="inline-flex items-center gap-1 px-2 py-0.5 text-xs border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50"
              disabled={loading || saving}
              title="Add tag"
            >
              <Plus size={12} />
              <span>Tag</span>
            </button>
            {/* Compact dropdown */}
            {isOpen && (
              <div
                ref={dropdownRef}
                className="absolute z-50 mt-1 w-64 bg-white border border-gray-200 rounded-lg shadow-lg left-0"
              >
            {/* Search */}
            <div className="p-2 border-b border-gray-200">
              <div className="relative">
                <Search size={16} className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search tags..."
                  className="w-full pl-8 pr-3 py-1.5 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>

            {/* Create New Tag Form */}
            {showCreateForm ? (
              <div className="p-3 border-b border-gray-200 space-y-2">
                <input
                  type="text"
                  value={newTagName}
                  onChange={(e) => setNewTagName(e.target.value)}
                  placeholder="Tag name"
                  className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleCreateTag();
                    } else if (e.key === 'Escape') {
                      setShowCreateForm(false);
                      setNewTagName('');
                      setNewTagColor('');
                    }
                  }}
                  autoFocus
                />
                <div>
                  <label className="block text-xs text-gray-600 mb-1">Color</label>
                  <ColorPicker
                    value={newTagColor}
                    onChange={setNewTagColor}
                    defaultColor={defaultColor}
                    compact={compact}
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={handleCreateTag}
                    disabled={!newTagName.trim() || creating}
                    className="flex-1 px-3 py-1.5 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                  >
                    {creating ? 'Creating...' : 'Create'}
                  </button>
                  <button
                    onClick={() => {
                      setShowCreateForm(false);
                      setNewTagName('');
                      setNewTagColor('');
                    }}
                    className="px-3 py-1.5 text-sm border border-gray-300 rounded hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div className="p-2">
                <button
                  onClick={() => setShowCreateForm(true)}
                  className="w-full flex items-center gap-2 px-2 py-1.5 text-sm text-gray-700 hover:bg-gray-50 rounded"
                >
                  <Plus size={16} />
                  <span>Create new tag</span>
                </button>
              </div>
            )}

            {/* Available Tags List */}
            <div className="max-h-48 overflow-y-auto">
              {loading ? (
                <div className="p-3 text-sm text-gray-500">Loading tags...</div>
              ) : availableTags.length === 0 ? (
                <div className="p-3 text-sm text-gray-500">
                  {searchQuery ? 'No tags found' : 'No tags available'}
                </div>
              ) : (
                <div className="p-1">
                  {availableTags.map(tag => {
                    // Get color hex from ColorPicker presets or use the color value directly
                    const PRESET_COLORS: Record<string, string> = {
                      blue: '#3B82F6',
                      green: '#10B981',
                      purple: '#8B5CF6',
                      orange: '#F97316',
                      red: '#EF4444',
                      yellow: '#FBBF24',
                      pink: '#EC4899',
                      indigo: '#6366F1',
                      cyan: '#06B6D4',
                      teal: '#14B8A6',
                      gray: '#6B7280',
                      slate: '#64748B',
                    };
                    
                    const colorHex = tag.color && tag.color.startsWith('#') 
                      ? tag.color 
                      : PRESET_COLORS[tag.color || 'gray'] || '#6B7280';
                    
                    return (
                      <button
                        key={tag.id}
                        onClick={() => handleToggleTag(tag)}
                        className="w-full text-left px-2 py-1.5 text-sm hover:bg-gray-50 rounded flex items-center gap-2"
                        disabled={saving}
                      >
                        <div
                          className="w-3 h-3 rounded-full border border-gray-300 flex-shrink-0"
                          style={{ backgroundColor: colorHex }}
                          title={`Tag color: ${tag.color || 'gray'}`}
                        />
                        {tag.icon && <TagIcon size={14} />}
                        <span>{tag.name}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  // Full view: tags + picker
  return (
    <div className="space-y-2" onClick={(e) => e.stopPropagation()}>
      {/* Current Tags */}
      {entityTags.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {entityTags.map(tag => (
            <span
              key={tag.id}
              className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                tag.color
                  ? `bg-${tag.color}-100 text-${tag.color}-700`
                  : 'bg-gray-100 text-gray-700'
              }`}
            >
              {tag.icon && <TagIcon size={12} />}
              {tag.name}
              {canEdit && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRemoveTag(tag);
                  }}
                  className="ml-1 hover:opacity-70"
                  disabled={saving}
                  aria-label={`Remove tag ${tag.name}`}
                >
                  <X size={12} />
                </button>
              )}
            </span>
          ))}
        </div>
      )}

      {/* Tag Picker */}
      {canEdit && (
        <div className="relative" onClick={(e) => e.stopPropagation()}>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setIsOpen(!isOpen);
              if (!isOpen) {
                setTimeout(() => searchInputRef.current?.focus(), 0);
              }
            }}
            className="flex items-center gap-2 px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={loading || saving}
          >
            <TagIcon size={16} />
            <span>Add Tag</span>
          </button>

          {isOpen && (
            <div
              ref={dropdownRef}
              className="absolute z-50 mt-1 w-64 bg-white border border-gray-200 rounded-lg shadow-lg"
            >
              {/* Search */}
              <div className="p-2 border-b border-gray-200">
                <div className="relative">
                  <Search size={16} className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    ref={searchInputRef}
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search tags..."
                    className="w-full pl-8 pr-3 py-1.5 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>

              {/* Create New Tag Form */}
              {showCreateForm ? (
                <div className="p-3 border-b border-gray-200 space-y-2">
                  <input
                    type="text"
                    value={newTagName}
                    onChange={(e) => setNewTagName(e.target.value)}
                    placeholder="Tag name"
                    className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        handleCreateTag();
                      } else if (e.key === 'Escape') {
                        setShowCreateForm(false);
                        setNewTagName('');
                        setNewTagColor('');
                      }
                    }}
                    autoFocus
                  />
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">Color</label>
                    <ColorPicker
                      value={newTagColor}
                      onChange={setNewTagColor}
                      defaultColor={defaultColor}
                      compact={compact}
                    />
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={handleCreateTag}
                      disabled={!newTagName.trim() || creating}
                      className="flex-1 px-3 py-1.5 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                    >
                      {creating ? 'Creating...' : 'Create'}
                    </button>
                    <button
                      onClick={() => {
                        setShowCreateForm(false);
                        setNewTagName('');
                        setNewTagColor('');
                      }}
                      className="px-3 py-1.5 text-sm border border-gray-300 rounded hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div className="p-2">
                  <button
                    onClick={() => setShowCreateForm(true)}
                    className="w-full flex items-center gap-2 px-2 py-1.5 text-sm text-gray-700 hover:bg-gray-50 rounded"
                  >
                    <Plus size={16} />
                    <span>Create new tag</span>
                  </button>
                </div>
              )}

              {/* Available Tags List */}
              <div className="max-h-48 overflow-y-auto">
                {loading ? (
                  <div className="p-3 text-sm text-gray-500">Loading tags...</div>
                ) : availableTags.length === 0 ? (
                  <div className="p-3 text-sm text-gray-500">
                    {searchQuery ? 'No tags found' : 'No tags available'}
                  </div>
                ) : (
                  <div className="p-1">
                    {availableTags.map(tag => {
                      // Get color hex from ColorPicker presets or use the color value directly
                      const PRESET_COLORS: Record<string, string> = {
                        blue: '#3B82F6',
                        green: '#10B981',
                        purple: '#8B5CF6',
                        orange: '#F97316',
                        red: '#EF4444',
                        yellow: '#FBBF24',
                        pink: '#EC4899',
                        indigo: '#6366F1',
                        cyan: '#06B6D4',
                        teal: '#14B8A6',
                        gray: '#6B7280',
                        slate: '#64748B',
                      };
                      
                      const colorHex = tag.color && tag.color.startsWith('#') 
                        ? tag.color 
                        : PRESET_COLORS[tag.color || 'gray'] || '#6B7280';
                      
                      return (
                        <button
                          key={tag.id}
                          onClick={() => handleToggleTag(tag)}
                          className="w-full text-left px-2 py-1.5 text-sm hover:bg-gray-50 rounded flex items-center gap-2"
                          disabled={saving}
                        >
                          <div
                            className="w-3 h-3 rounded-full border border-gray-300 flex-shrink-0"
                            style={{ backgroundColor: colorHex }}
                            title={`Tag color: ${tag.color || 'gray'}`}
                          />
                          {tag.icon && <TagIcon size={14} />}
                          <span>{tag.name}</span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Read-only banner */}
      {!canEdit && entityTags.length === 0 && (
        <p className="text-xs text-gray-500">No tags (read-only)</p>
      )}
    </div>
  );
}

