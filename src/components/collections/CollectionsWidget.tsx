import { useState, useEffect } from 'react';
import {
  Folder,
  Plus,
  Search,
  ChevronRight,
  ChevronDown,
  ChevronLeft,
  MoreVertical,
  Edit3,
  Trash2,
  Link as LinkIcon,
  FileText,
  ExternalLink,
} from 'lucide-react';

import {
  getCollectionsForSpace,
  buildCollectionTree,
  deleteCollection,
  getCollectionReferences,
  removeReferenceFromCollection,
} from '../../lib/collectionsService';

import type {
  CollectionTreeNode,
  CollectionReferenceWithTags,
  SpaceType,
} from '../../lib/collectionsTypes';

import { COLLECTION_COLORS } from '../../lib/collectionsTypes';
import { formatFileSize } from '../../lib/filesService';

import { CreateCollectionModal } from './CreateCollectionModal';
import { EditCollectionModal } from './EditCollectionModal';
import { AddToCollectionModal } from './AddToCollectionModal';

import { useUIPreferences } from '../../contexts/UIPreferencesContext';

interface CollectionsWidgetProps {
  spaceId: string | null;
  spaceType: SpaceType;
}

export function CollectionsWidget({ spaceId, spaceType }: CollectionsWidgetProps) {
  const { appTheme } = useUIPreferences();
  const isNeonMode = appTheme === 'neon-dark';

  const [tree, setTree] = useState<CollectionTreeNode[]>([]);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [selectedCollection, setSelectedCollection] =
    useState<CollectionTreeNode | null>(null);
  const [references, setReferences] = useState<CollectionReferenceWithTags[]>([]);
  const [loading, setLoading] = useState(true);

  const [searchTerm, setSearchTerm] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingCollection, setEditingCollection] =
    useState<CollectionTreeNode | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);

  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  useEffect(() => {
    loadCollections();
  }, [spaceId, spaceType]);

  useEffect(() => {
    if (selectedCollection) {
      loadReferences(selectedCollection.id);
    }
  }, [selectedCollection]);

  async function loadCollections() {
    setLoading(true);
    try {
      const collections = await getCollectionsForSpace(spaceId, spaceType);
      const treeData = await buildCollectionTree(collections);
      setTree(treeData);
    } finally {
      setLoading(false);
    }
  }

  async function loadReferences(collectionId: string) {
    const refs = await getCollectionReferences(collectionId);
    setReferences(refs);
  }

  function toggleExpanded(id: string) {
    setExpandedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  async function handleDelete(collection: CollectionTreeNode) {
    if (!confirm(`Delete "${collection.name}"?`)) return;
    await deleteCollection(collection.id);
    await loadCollections();
    if (selectedCollection?.id === collection.id) {
      setSelectedCollection(null);
      setReferences([]);
    }
  }

  async function handleRemoveReference(referenceId: string) {
    if (!confirm('Remove item from collection?')) return;
    await removeReferenceFromCollection(referenceId);
    await loadReferences(selectedCollection!.id);
  }

  function renderCollectionTree(nodes: CollectionTreeNode[], depth = 0) {
    return nodes.map(node => {
      const isExpanded = expandedIds.has(node.id);
      const isSelected = selectedCollection?.id === node.id;
      const hasChildren = node.children.length > 0;
      const colors =
        COLLECTION_COLORS[node.color as keyof typeof COLLECTION_COLORS] ||
        COLLECTION_COLORS.blue;

      return (
        <div key={node.id}>
          <div
            className={`flex items-center gap-2 px-3 py-2 rounded-xl cursor-pointer transition-all
              ${isSelected
                ? isNeonMode
                  ? 'bg-cyan-500/10 ring-1 ring-cyan-400/30'
                  : `${colors.bg}`
                : 'hover:bg-white/5'}
            `}
            style={{ paddingLeft: `${12 + depth * 18}px` }}
          >
            {hasChildren ? (
              <button
                onClick={e => {
                  e.stopPropagation();
                  toggleExpanded(node.id);
                }}
                className="p-1 rounded-md hover:bg-white/10"
              >
                {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
              </button>
            ) : (
              <div className="w-5" />
            )}

            <button
              onClick={() => setSelectedCollection(node)}
              className="flex items-center gap-2 flex-1 min-w-0"
            >
              <Folder size={16} className={colors.icon} />
              {!isSidebarCollapsed && (
                <span className="truncate text-sm font-medium">
                  {node.name}
                </span>
              )}
            </button>

            {!isSidebarCollapsed && (
              <div className="relative group">
                <button className="p-1 rounded-md opacity-0 group-hover:opacity-100 hover:bg-white/10">
                  <MoreVertical size={14} />
                </button>
                <div className="absolute right-0 mt-1 hidden group-hover:block z-10 bg-black/70 backdrop-blur-xl border border-white/10 rounded-lg w-36">
                  <button
                    onClick={() => setEditingCollection(node)}
                    className="w-full px-3 py-2 text-sm flex items-center gap-2 hover:bg-white/10"
                  >
                    <Edit3 size={14} /> Edit
                  </button>
                  <button
                    onClick={() => handleDelete(node)}
                    className="w-full px-3 py-2 text-sm flex items-center gap-2 text-red-400 hover:bg-red-500/10"
                  >
                    <Trash2 size={14} /> Delete
                  </button>
                </div>
              </div>
            )}
          </div>

          {isExpanded && hasChildren && renderCollectionTree(node.children, depth + 1)}
        </div>
      );
    });
  }

  function renderReference(ref: CollectionReferenceWithTags) {
    const glassCard = isNeonMode
      ? 'bg-white/5 backdrop-blur-md border border-white/10'
      : 'bg-white border border-gray-200';

    if (ref.entity_type === 'link') {
      return (
        <div key={ref.id} className={`group p-4 rounded-xl ${glassCard}`}>
          <a
            href={ref.link_url || '#'}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 font-semibold"
          >
            <LinkIcon size={16} />
            <span className="truncate">{ref.link_title}</span>
            <ExternalLink size={12} className="opacity-60" />
          </a>
          {ref.link_description && (
            <p className="text-sm opacity-70 mt-1 line-clamp-2">
              {ref.link_description}
            </p>
          )}
          <button
            onClick={() => handleRemoveReference(ref.id)}
            className="mt-3 text-xs text-red-400 hover:underline"
          >
            Remove
          </button>
        </div>
      );
    }

    if (ref.entity_type === 'file') {
      return (
        <div key={ref.id} className={`group p-4 rounded-xl ${glassCard}`}>
          <div className="flex items-center gap-3">
            <FileText size={18} />
            <div>
              <p className="font-semibold truncate">{ref.file_name}</p>
              {ref.file_size && (
                <p className="text-xs opacity-60">
                  {formatFileSize(ref.file_size)}
                </p>
              )}
            </div>
          </div>
          <button
            onClick={() => handleRemoveReference(ref.id)}
            className="mt-3 text-xs text-red-400 hover:underline"
          >
            Remove
          </button>
        </div>
      );
    }

    return null;
  }

  if (loading) {
    return <div className="flex items-center justify-center h-full">Loading…</div>;
  }

  return (
    <div className={`flex h-full ${isNeonMode ? 'neon-dark-widget' : ''}`}>
      {/* Sidebar */}
      <aside
        className={`transition-all duration-300 ${
          isSidebarCollapsed ? 'w-16' : 'w-80'
        } flex flex-col border-r ${isNeonMode ? 'border-white/10' : 'border-gray-200'}`}
      >
        <div className="flex items-center justify-between p-4">
          {!isSidebarCollapsed && <h3 className="font-bold">Collections</h3>}
          <div className="flex items-center gap-2">
            {isSidebarCollapsed && (
              <button
                onClick={() => setShowCreateModal(true)}
                className="p-2 rounded-lg bg-cyan-500/20 text-cyan-200 hover:bg-cyan-500/30 transition-colors"
                title="New Collection"
              >
                <Plus size={16} />
              </button>
            )}
            <button
              onClick={() => setIsSidebarCollapsed(v => !v)}
              className="p-1 rounded-md hover:bg-white/10"
            >
              <ChevronLeft
                size={16}
                className={`transition-transform ${
                  isSidebarCollapsed ? 'rotate-180' : ''
                }`}
              />
            </button>
          </div>
        </div>

        {!isSidebarCollapsed && (
          <div className="px-4 pb-3 space-y-3">
            <button
              onClick={() => setShowCreateModal(true)}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-cyan-500/20 text-cyan-200 hover:bg-cyan-500/30 transition-colors"
            >
              <Plus size={16} />
              <span className="text-sm font-medium">New Collection</span>
            </button>
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 opacity-50" />
              <input
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                placeholder="Search…"
                className="w-full pl-9 pr-3 py-2 rounded-lg bg-white/10 border border-white/10 text-sm"
              />
            </div>
          </div>
        )}

        <div className="flex-1 overflow-y-auto px-2">
          {tree.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full px-4 py-8 text-center opacity-60">
              {!isSidebarCollapsed && (
                <>
                  <Folder size={32} className="mb-3 opacity-40" />
                  <p className="text-sm">No collections yet</p>
                  <p className="text-xs mt-1">Create one to get started</p>
                </>
              )}
            </div>
          ) : (
            renderCollectionTree(tree)
          )}
        </div>
      </aside>

      {/* Main Panel */}
      <main className="flex-1 flex flex-col p-6">
        {selectedCollection ? (
          <>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold truncate">
                {selectedCollection.name}
              </h2>
              <button
                onClick={() => setShowAddModal(true)}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-cyan-500/20 text-cyan-200 hover:bg-cyan-500/30 transition-colors"
              >
                <Plus size={16} />
                <span>Add Item</span>
              </button>
            </div>

            <div className="grid gap-3 max-w-4xl">
              {references.length === 0 ? (
                <p className="opacity-60">No items yet.</p>
              ) : (
                references.map(renderReference)
              )}
            </div>
          </>
        ) : (
          <div className="flex items-center justify-center h-full opacity-60">
            Select a collection
          </div>
        )}
      </main>

      {/* Modals */}
      {showCreateModal && (
        <CreateCollectionModal
          spaceId={spaceId}
          spaceType={spaceType}
          parentId={selectedCollection?.id ?? null}
          onClose={() => setShowCreateModal(false)}
          onSuccess={loadCollections}
        />
      )}

      {editingCollection && (
        <EditCollectionModal
          collection={editingCollection}
          onClose={() => setEditingCollection(null)}
          onSuccess={loadCollections}
        />
      )}

      {showAddModal && selectedCollection && (
        <AddToCollectionModal
          collectionId={selectedCollection.id}
          spaceId={spaceId}
          spaceType={spaceType}
          onClose={() => setShowAddModal(false)}
          onSuccess={() => loadReferences(selectedCollection.id)}
        />
      )}
    </div>
  );
}
