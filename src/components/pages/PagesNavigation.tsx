/**
 * Pages Navigation Component
 * 
 * Hierarchical page navigation sidebar, similar to Notion.
 * Displays pages as a collapsible tree structure.
 */

import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { 
  FileText, 
  ChevronRight, 
  ChevronDown, 
  Plus, 
  MoreVertical,
  Edit2,
  Trash2,
  FolderPlus
} from 'lucide-react';
import type { Page } from '../../lib/workspace/types';
import {
  getPagesBySpaceId,
  buildPageTree,
  createPage,
  updatePage,
  archivePage,
} from '../../lib/workspace/pageService';
import { showToast } from '../Toast';

interface PagesNavigationProps {
  spaceId: string;
  currentPageId?: string;
  onPageSelect?: (pageId: string) => void;
}

export function PagesNavigation({ spaceId, currentPageId, onPageSelect }: PagesNavigationProps) {
  const navigate = useNavigate();
  const [pages, setPages] = useState<Page[]>([]);
  const [pageTree, setPageTree] = useState<Page[]>([]);
  const [collapsedPages, setCollapsedPages] = useState<Set<string>>(new Set());
  const [showPageMenu, setShowPageMenu] = useState<string | null>(null);
  const [editingPageId, setEditingPageId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPages();
  }, [spaceId]);

  const loadPages = async () => {
    try {
      setLoading(true);
      const allPages = await getPagesBySpaceId(spaceId);
      setPages(allPages);
      const tree = buildPageTree(allPages);
      setPageTree(tree);
    } catch (error) {
      console.error('Error loading pages:', error);
      showToast('error', 'Failed to load pages');
    } finally {
      setLoading(false);
    }
  };

  const handlePageClick = (pageId: string) => {
    if (onPageSelect) {
      onPageSelect(pageId);
    } else {
      navigate(`/spaces/${spaceId}/pages/${pageId}`);
    }
  };

  const handleToggleCollapse = (pageId: string) => {
    setCollapsedPages(prev => {
      const next = new Set(prev);
      if (next.has(pageId)) {
        next.delete(pageId);
      } else {
        next.add(pageId);
      }
      return next;
    });
  };

  const handleCreatePage = async (parentPageId?: string) => {
    try {
      const newPage = await createPage({
        space_id: spaceId,
        parent_page_id: parentPageId,
        title: 'Untitled Page',
      });
      if (newPage) {
        await loadPages();
        // Navigate to new page
        handlePageClick(newPage.id);
        // Start editing title
        setEditingPageId(newPage.id);
        setEditTitle(newPage.title);
      }
    } catch (error) {
      console.error('Error creating page:', error);
      showToast('error', 'Failed to create page');
    }
    setShowPageMenu(null);
  };

  const handleRenamePage = (pageId: string) => {
    const page = pages.find(p => p.id === pageId);
    if (page) {
      setEditingPageId(pageId);
      setEditTitle(page.title);
    }
    setShowPageMenu(null);
  };

  const handleSaveTitle = async (pageId: string) => {
    try {
      await updatePage(pageId, { title: editTitle.trim() || 'Untitled Page' });
      await loadPages();
      setEditingPageId(null);
      setEditTitle('');
    } catch (error) {
      console.error('Error updating page:', error);
      showToast('error', 'Failed to update page');
    }
  };

  const handleArchivePage = async (pageId: string) => {
    if (!window.confirm('Are you sure you want to archive this page?')) return;
    
    try {
      await archivePage(pageId);
      await loadPages();
      // Navigate away if current page was archived
      if (currentPageId === pageId) {
        navigate(`/spaces/${spaceId}`);
      }
    } catch (error) {
      console.error('Error archiving page:', error);
      showToast('error', 'Failed to archive page');
    }
    setShowPageMenu(null);
  };

  const renderPageItem = (page: Page, level: number = 0) => {
    const isCollapsed = collapsedPages.has(page.id);
    const hasChildren = page.children && page.children.length > 0;
    const isActive = currentPageId === page.id;
    const isEditing = editingPageId === page.id;

    return (
      <div key={page.id} className="select-none">
        <div
          className={`
            group flex items-center gap-1 px-2 py-1.5 rounded-md cursor-pointer
            ${isActive ? 'bg-blue-100 text-blue-900' : 'hover:bg-gray-100 text-gray-700'}
            transition-colors
          `}
          style={{ paddingLeft: `${8 + level * 16}px` }}
        >
          {/* Collapse/Expand Button */}
          {hasChildren ? (
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleToggleCollapse(page.id);
              }}
              className="p-0.5 hover:bg-gray-200 rounded flex-shrink-0"
            >
              {isCollapsed ? (
                <ChevronRight size={14} />
              ) : (
                <ChevronDown size={14} />
              )}
            </button>
          ) : (
            <div className="w-5" /> // Spacer
          )}

          {/* Page Icon */}
          <FileText size={16} className="flex-shrink-0 text-gray-500" />

          {/* Page Title */}
          {isEditing ? (
            <input
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              onBlur={() => handleSaveTitle(page.id)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleSaveTitle(page.id);
                } else if (e.key === 'Escape') {
                  setEditingPageId(null);
                  setEditTitle('');
                }
              }}
              autoFocus
              className="flex-1 px-1 py-0.5 text-sm border border-blue-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
              onClick={(e) => e.stopPropagation()}
            />
          ) : (
            <span
              className="flex-1 text-sm truncate"
              onClick={() => handlePageClick(page.id)}
            >
              {page.title}
            </span>
          )}

          {/* Actions Menu */}
          <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-0.5">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowPageMenu(showPageMenu === page.id ? null : page.id);
              }}
              className="p-1 hover:bg-gray-200 rounded"
            >
              <MoreVertical size={14} />
            </button>
          </div>

          {/* Page Menu */}
          {showPageMenu === page.id && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setShowPageMenu(null)}
              />
              <div className="absolute left-full ml-1 top-0 bg-white border border-gray-200 rounded-lg shadow-lg z-50 min-w-[180px]">
                <button
                  onClick={() => handleCreatePage(page.id)}
                  className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
                >
                  <FolderPlus size={14} />
                  Add Sub-page
                </button>
                <button
                  onClick={() => handleRenamePage(page.id)}
                  className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
                >
                  <Edit2 size={14} />
                  Rename
                </button>
                <div className="border-t border-gray-200 my-1" />
                <button
                  onClick={() => handleArchivePage(page.id)}
                  className="w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                >
                  <Trash2 size={14} />
                  Archive
                </button>
              </div>
            </>
          )}
        </div>

        {/* Children */}
        {hasChildren && !isCollapsed && (
          <div>
            {page.children!.map(child => renderPageItem(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="p-4 text-sm text-gray-500">Loading pages...</div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-white border-r border-gray-200">
      {/* Header */}
      <div className="p-3 border-b border-gray-200 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-gray-900">Pages</h2>
        <button
          onClick={() => handleCreatePage()}
          className="p-1 hover:bg-gray-100 rounded"
          title="Create page"
        >
          <Plus size={16} />
        </button>
      </div>

      {/* Pages List */}
      <div className="flex-1 overflow-y-auto p-2">
        {pageTree.length === 0 ? (
          <div className="text-center py-8 text-sm text-gray-500">
            <FileText size={32} className="mx-auto mb-2 text-gray-300" />
            <p>No pages yet</p>
            <button
              onClick={() => handleCreatePage()}
              className="mt-2 text-blue-600 hover:text-blue-700"
            >
              Create your first page
            </button>
          </div>
        ) : (
          <div>
            {pageTree.map(page => renderPageItem(page))}
          </div>
        )}
      </div>
    </div>
  );
}
