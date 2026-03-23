import { useState, useEffect } from 'react';
import { X, Copy, Share2, Trash2, Check, Calendar, Users } from 'lucide-react';
import {
  createTemplateShareLink,
  revokeTemplateShareLink,
  listTemplateShareLinks,
  type TrackerTemplateLink,
  type CreateTemplateLinkInput,
} from '../../lib/trackerStudio/trackerTemplateLinkService';
import type { TrackerTemplate } from '../../lib/trackerStudio/types';

type TemplateShareLinkModalProps = {
  template: TrackerTemplate;
  isOpen: boolean;
  onClose: () => void;
};

export function TemplateShareLinkModal({
  template,
  isOpen,
  onClose,
}: TemplateShareLinkModalProps) {
  const [links, setLinks] = useState<TrackerTemplateLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [copiedToken, setCopiedToken] = useState<string | null>(null);
  
  // New link form
  const [expiresInDays, setExpiresInDays] = useState<number | ''>('');
  const [maxUses, setMaxUses] = useState<number | ''>('');

  useEffect(() => {
    if (isOpen) {
      loadLinks();
    }
  }, [isOpen, template.id]);

  const loadLinks = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await listTemplateShareLinks(template.id);
      setLinks(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load share links');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateLink = async () => {
    try {
      setCreating(true);
      setError(null);

      const input: CreateTemplateLinkInput = {
        templateId: template.id,
        expiresAt: expiresInDays ? 
          new Date(Date.now() + (expiresInDays as number) * 24 * 60 * 60 * 1000).toISOString() : 
          null,
        maxUses: maxUses || null,
      };

      const newLink = await createTemplateShareLink(input);
      
      // Reload links
      await loadLinks();
      
      // Reset form
      setExpiresInDays('');
      setMaxUses('');
      
      // Copy link to clipboard
      const shareUrl = `${window.location.origin}/tracker-studio/templates/import/${newLink.shareToken}`;
      await navigator.clipboard.writeText(shareUrl);
      setCopiedToken(newLink.shareToken);
      setTimeout(() => setCopiedToken(null), 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create share link');
    } finally {
      setCreating(false);
    }
  };

  const handleRevoke = async (linkId: string) => {
    if (!confirm('Are you sure you want to revoke this share link?')) {
      return;
    }

    try {
      await revokeTemplateShareLink(linkId);
      await loadLinks();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to revoke link');
    }
  };

  const handleCopyLink = async (token: string) => {
    const shareUrl = `${window.location.origin}/tracker-studio/templates/import/${token}`;
    await navigator.clipboard.writeText(shareUrl);
    setCopiedToken(token);
    setTimeout(() => setCopiedToken(null), 2000);
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Never';
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const isLinkActive = (link: TrackerTemplateLink) => {
    if (link.revokedAt) return false;
    if (link.expiresAt && new Date(link.expiresAt) < new Date()) return false;
    if (link.maxUses !== null && link.useCount >= link.maxUses) return false;
    return true;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-start justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Share Template</h2>
            <p className="text-sm text-gray-600 mt-1">{template.name}</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-red-800 text-sm">{error}</p>
            </div>
          )}

          {/* Create New Link */}
          <div className="border border-gray-200 rounded-lg p-4 space-y-4">
            <h3 className="text-sm font-medium text-gray-900">Create Share Link</h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="expires-in" className="block text-sm font-medium text-gray-700 mb-1">
                  Expires In (days)
                </label>
                <div className="relative">
                  <Calendar size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    id="expires-in"
                    type="number"
                    min="1"
                    value={expiresInDays}
                    onChange={(e) => setExpiresInDays(e.target.value ? parseInt(e.target.value) : '')}
                    placeholder="Never"
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">Leave empty for no expiry</p>
              </div>

              <div>
                <label htmlFor="max-uses" className="block text-sm font-medium text-gray-700 mb-1">
                  Max Uses
                </label>
                <div className="relative">
                  <Users size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    id="max-uses"
                    type="number"
                    min="1"
                    value={maxUses}
                    onChange={(e) => setMaxUses(e.target.value ? parseInt(e.target.value) : '')}
                    placeholder="Unlimited"
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">Leave empty for unlimited</p>
              </div>
            </div>

            <button
              onClick={handleCreateLink}
              disabled={creating}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
            >
              <Share2 size={18} />
              {creating ? 'Creating...' : 'Create Link'}
            </button>
          </div>

          {/* Existing Links */}
          <div>
            <h3 className="text-sm font-medium text-gray-900 mb-3">Share Links</h3>
            {loading ? (
              <div className="text-center py-4">
                <p className="text-gray-600 text-sm">Loading...</p>
              </div>
            ) : links.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-4">
                No share links created yet
              </p>
            ) : (
              <div className="space-y-2">
                {links.map((link) => {
                  const shareUrl = `${window.location.origin}/tracker-studio/templates/import/${link.shareToken}`;
                  const isActive = isLinkActive(link);
                  
                  return (
                    <div
                      key={link.id}
                      className={`p-4 border rounded-lg ${
                        isActive ? 'border-gray-200' : 'border-gray-300 bg-gray-50'
                      }`}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className={`text-xs font-medium px-2 py-1 rounded ${
                              isActive ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-700'
                            }`}>
                              {isActive ? 'Active' : 'Inactive'}
                            </span>
                            {link.revokedAt && (
                              <span className="text-xs text-red-600">Revoked</span>
                            )}
                            {link.expiresAt && new Date(link.expiresAt) < new Date() && (
                              <span className="text-xs text-red-600">Expired</span>
                            )}
                            {link.maxUses !== null && link.useCount >= link.maxUses && (
                              <span className="text-xs text-red-600">Max uses reached</span>
                            )}
                          </div>
                          <div className="text-xs text-gray-500 space-y-1">
                            <p>Uses: {link.useCount}{link.maxUses ? ` / ${link.maxUses}` : ''}</p>
                            <p>Expires: {formatDate(link.expiresAt)}</p>
                            <p>Created: {formatDate(link.createdAt)}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 ml-4">
                          <button
                            onClick={() => handleCopyLink(link.shareToken)}
                            className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded transition-colors"
                            title="Copy link"
                          >
                            {copiedToken === link.shareToken ? (
                              <Check size={18} className="text-green-600" />
                            ) : (
                              <Copy size={18} />
                            )}
                          </button>
                          {!link.revokedAt && (
                            <button
                              onClick={() => handleRevoke(link.id)}
                              className="p-2 text-red-600 hover:text-red-700 hover:bg-red-50 rounded transition-colors"
                              title="Revoke link"
                            >
                              <Trash2 size={18} />
                            </button>
                          )}
                        </div>
                      </div>
                      <div className="mt-2 p-2 bg-gray-50 rounded text-xs font-mono text-gray-700 break-all">
                        {shareUrl}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
