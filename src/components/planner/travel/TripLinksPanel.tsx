/**
 * Trip Links Panel
 * 
 * Displays and manages links between trips and other entities:
 * - Tags (via tag_links)
 * - Skills (via skill_entity_links)
 * - Future: Projects, Habits, Goals (via tags or dedicated linking table)
 */

import { useState, useEffect } from 'react';
import { useAuth } from '../../../contexts/AuthContext';
import { Plus, X, Tag as TagIcon, Award, Target, BookOpen, FolderKanban, Trash2, Loader2 } from 'lucide-react';
import { getTagsForEntity, type Tag } from '../../../lib/tags/tagService';
import { skillEntityLinksService, type SkillEntityLink } from '../../../lib/skillsService';
import { BottomSheet } from '../../shared/BottomSheet';
import { showToast } from '../../Toast';

interface TripLinksPanelProps {
  tripId: string;
  canManage: boolean;
}

export function TripLinksPanel({ tripId, canManage }: TripLinksPanelProps) {
  const { user } = useAuth();
  const [tags, setTags] = useState<Tag[]>([]);
  const [skills, setSkills] = useState<SkillEntityLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddTagModal, setShowAddTagModal] = useState(false);

  useEffect(() => {
    if (user && tripId) {
      loadLinks();
    }
  }, [user, tripId]);

  async function loadLinks() {
    if (!user) return;
    
    setLoading(true);
    try {
      const [tagsData, skillsData] = await Promise.all([
        getTagsForEntity('trip', tripId),
        skillEntityLinksService.getLinksForEntity(user.id, 'trip', tripId),
      ]);
      setTags(tagsData);
      setSkills(skillsData);
    } catch (error) {
      console.error('Error loading trip links:', error);
    } finally {
      setLoading(false);
    }
  }

  const handleRemoveTag = async (tagId: string) => {
    if (!user || !canManage) return;
    
    try {
      const { removeTagFromEntity } = await import('../../../lib/tags/tagService');
      await removeTagFromEntity(user.id, tagId, 'trip', tripId);
      showToast('success', 'Tag removed');
      await loadLinks();
    } catch (error) {
      console.error('Error removing tag:', error);
      showToast('error', 'Failed to remove tag');
    }
  };

  const handleRemoveSkill = async (linkId: string) => {
    if (!user || !canManage) return;
    
    try {
      await skillEntityLinksService.deleteLink(linkId);
      showToast('success', 'Skill link removed');
      await loadLinks();
    } catch (error) {
      console.error('Error removing skill link:', error);
      showToast('error', 'Failed to remove skill link');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-4">
        <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
      </div>
    );
  }

  const hasAnyLinks = tags.length > 0 || skills.length > 0;

  return (
    <div className="bg-slate-50 rounded-xl border border-slate-200 p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-slate-800">Links</h3>
        {canManage && (
          <button
            onClick={() => setShowAddTagModal(true)}
            className="flex items-center gap-1 px-3 py-1.5 text-xs bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus size={14} />
            Add Link
          </button>
        )}
      </div>

      {!hasAnyLinks && !canManage && (
        <p className="text-xs text-slate-500">No links yet</p>
      )}

      {!hasAnyLinks && canManage && (
        <p className="text-xs text-slate-500">
          Link this trip to tags, skills, or other entities for better organization.
        </p>
      )}

      {hasAnyLinks && (
        <div className="space-y-3">
          {/* Tags Section */}
          {tags.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <TagIcon size={14} className="text-slate-500" />
                <span className="text-xs font-medium text-slate-600">Tags</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {tags.map(tag => (
                  <span
                    key={tag.id}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-white border border-slate-200 rounded-lg text-xs text-slate-700"
                  >
                    {tag.icon && <span className="text-slate-500">{tag.icon}</span>}
                    <span>{tag.name}</span>
                    {canManage && (
                      <button
                        onClick={() => handleRemoveTag(tag.id)}
                        className="ml-1 p-0.5 hover:bg-slate-100 rounded transition-colors"
                        title="Remove tag"
                      >
                        <X size={12} className="text-slate-400 hover:text-red-600" />
                      </button>
                    )}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Skills Section */}
          {skills.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Award size={14} className="text-slate-500" />
                <span className="text-xs font-medium text-slate-600">Skills</span>
              </div>
              <div className="space-y-2">
                {skills.map(link => (
                  <div
                    key={link.id}
                    className="flex items-center justify-between p-2 bg-white border border-slate-200 rounded-lg"
                  >
                    <div className="flex items-center gap-2 flex-1">
                      <Award size={14} className="text-blue-600" />
                      <span className="text-xs text-slate-700">
                        Skill ID: {link.skill_id}
                        {link.link_notes && ` • ${link.link_notes}`}
                      </span>
                    </div>
                    {canManage && (
                      <button
                        onClick={() => handleRemoveSkill(link.id)}
                        className="p-1 text-slate-400 hover:text-red-600 transition-colors"
                        title="Remove skill link"
                      >
                        <Trash2 size={12} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Add Link Modal */}
      {showAddTagModal && (
        <AddLinkModal
          tripId={tripId}
          onClose={() => setShowAddTagModal(false)}
          onSuccess={loadLinks}
        />
      )}
    </div>
  );
}

// Add Link Modal
interface AddLinkModalProps {
  tripId: string;
  onClose: () => void;
  onSuccess: () => void;
}

function AddLinkModal({ tripId, onClose, onSuccess }: AddLinkModalProps) {
  const { user } = useAuth();
  const [linkType, setLinkType] = useState<'tag' | 'skill'>('tag');
  const [saving, setSaving] = useState(false);

  const handleAddTag = async () => {
    // For now, this is a placeholder - tag selection UI would go here
    // User can add tags via the tag management system
    showToast('info', 'Tag linking will be implemented via the tag system');
    onClose();
  };

  const handleAddSkill = async () => {
    // For now, this is a placeholder - skill selection UI would go here
    // User can add skill links via the skill link manager
    showToast('info', 'Skill linking will be implemented via the skill system');
    onClose();
  };

  return (
    <BottomSheet
      isOpen={true}
      onClose={onClose}
      title="Add Link"
      maxHeight="70vh"
    >
      <div className="p-4 space-y-6">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Link Type
          </label>
          <select
            value={linkType}
            onChange={(e) => setLinkType(e.target.value as 'tag' | 'skill')}
            className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="tag">Tag</option>
            <option value="skill">Skill</option>
          </select>
        </div>

        <div className="text-sm text-slate-600">
          {linkType === 'tag' && (
            <p>
              Add tags to this trip for better organization. Tags can be managed
              through the tag system.
            </p>
          )}
          {linkType === 'skill' && (
            <p>
              Link skills to this trip to track what skills are being used or
              developed during the trip.
            </p>
          )}
        </div>

        <div className="flex gap-4 pt-4">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 px-6 py-3 border-2 border-slate-300 text-slate-700 rounded-xl hover:bg-slate-50 transition-colors font-medium"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={linkType === 'tag' ? handleAddTag : handleAddSkill}
            disabled={saving}
            className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? 'Adding...' : 'Add Link'}
          </button>
        </div>
      </div>
    </BottomSheet>
  );
}
