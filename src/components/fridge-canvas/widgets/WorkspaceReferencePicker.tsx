/**
 * Workspace Reference Picker
 * 
 * Modal component for selecting items to reference in workspace units
 */

import { useState, useEffect } from 'react';
import { X, Search, Calendar, CheckSquare, Target, FileText, Link as LinkIcon, Layers } from 'lucide-react';
import type { WorkspaceReferenceType } from '../../../lib/workspace/types';
import { searchReferenceableItems } from '../../../lib/workspace/referenceService';
import { useAuth } from '../../../contexts/AuthContext';

interface WorkspaceReferencePickerProps {
  isOpen: boolean;
  referenceType: WorkspaceReferenceType;
  onSelect: (item: { id: string; title: string; subtitle?: string }) => void;
  onClose: () => void;
  onUrlSelect?: (url: string) => void;
}

export function WorkspaceReferencePicker({
  isOpen,
  referenceType,
  onSelect,
  onClose,
  onUrlSelect,
}: WorkspaceReferencePickerProps) {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [items, setItems] = useState<Array<{ id: string; title: string; subtitle?: string; metadata?: any }>>([]);
  const [loading, setLoading] = useState(false);
  const [urlInput, setUrlInput] = useState('');
  const [showUrlInput, setShowUrlInput] = useState(false);

  useEffect(() => {
    if (isOpen && user) {
      loadItems();
    }
  }, [isOpen, referenceType, user]);

  const loadItems = async () => {
    if (!user) return;

    setLoading(true);
    try {
      const results = await searchReferenceableItems(referenceType, user.id, searchQuery);
      setItems(results);
    } catch (error) {
      console.error('Failed to load referenceable items:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      const debounceTimer = setTimeout(() => {
        if (user) {
          loadItems();
        }
      }, 300);

      return () => clearTimeout(debounceTimer);
    }
  }, [searchQuery, isOpen, referenceType, user]);

  const handleSelect = (item: { id: string; title: string; subtitle?: string }) => {
    onSelect(item);
    setSearchQuery('');
    setItems([]);
  };

  const handleUrlSubmit = () => {
    if (urlInput.trim() && onUrlSelect) {
      onUrlSelect(urlInput.trim());
      setUrlInput('');
      setShowUrlInput(false);
    }
  };

  if (!isOpen) return null;

  const getTypeIcon = () => {
    switch (referenceType) {
      case 'planner_event':
        return <Calendar size={20} className="text-blue-600" />;
      case 'guardrails_task':
        return <CheckSquare size={20} className="text-purple-600" />;
      case 'guardrails_roadmap':
        return <Target size={20} className="text-indigo-600" />;
      case 'goal':
        return <Target size={20} className="text-green-600" />;
      case 'workspace':
        return <FileText size={20} className="text-slate-600" />;
      case 'widget':
        return <Layers size={20} className="text-amber-600" />;
      case 'url':
        return <LinkIcon size={20} className="text-gray-600" />;
      default:
        return <LinkIcon size={20} className="text-gray-600" />;
    }
  };

  const getTypeLabel = () => {
    switch (referenceType) {
      case 'planner_event':
        return 'Planner Event';
      case 'guardrails_task':
        return 'Guardrails Task';
      case 'guardrails_roadmap':
        return 'Roadmap Item';
      case 'goal':
        return 'Goal';
      case 'workspace':
        return 'Workspace';
      case 'widget':
        return 'Widget';
      case 'url':
        return 'External URL';
      default:
        return 'Reference';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 safe-top safe-bottom">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4 max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <div className="flex items-center gap-3">
            {getTypeIcon()}
            <h2 className="text-lg font-semibold text-gray-900">Select {getTypeLabel()}</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded transition-colors"
          >
            <X size={20} className="text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden flex flex-col">
          {referenceType === 'url' ? (
            <div className="p-4">
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Enter URL
                </label>
                <div className="flex gap-2">
                  <input
                    type="url"
                    value={urlInput}
                    onChange={(e) => setUrlInput(e.target.value)}
                    placeholder="https://example.com"
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-500"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        handleUrlSubmit();
                      }
                    }}
                  />
                  <button
                    onClick={handleUrlSubmit}
                    disabled={!urlInput.trim()}
                    className="px-4 py-2 bg-slate-600 text-white rounded-lg hover:bg-slate-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Add
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <>
              {/* Search */}
              <div className="p-4 border-b border-gray-200">
                <div className="relative">
                  <Search size={18} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder={`Search ${getTypeLabel().toLowerCase()}s...`}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-500"
                  />
                </div>
              </div>

              {/* Results */}
              <div className="flex-1 overflow-y-auto p-2">
                {loading ? (
                  <div className="text-center py-8">
                    <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-slate-600"></div>
                    <p className="mt-2 text-sm text-gray-600">Loading...</p>
                  </div>
                ) : items.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-gray-600">No {getTypeLabel().toLowerCase()}s found</p>
                    {searchQuery && (
                      <p className="text-sm text-gray-500 mt-1">Try a different search term</p>
                    )}
                  </div>
                ) : (
                  <div className="space-y-1">
                    {items.map((item) => (
                      <button
                        key={item.id}
                        onClick={() => handleSelect(item)}
                        className="w-full text-left px-3 py-2 rounded-lg hover:bg-gray-100 transition-colors"
                      >
                        <div className="font-medium text-gray-900">{item.title}</div>
                        {item.subtitle && (
                          <div className="text-sm text-gray-500">{item.subtitle}</div>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
