/**
 * Page View Component
 * 
 * Full-page view for a single Page, displaying its Workspace content.
 * This is the main view when navigating to /spaces/:spaceId/pages/:pageId
 */

import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { WorkspaceWidget } from '../fridge-canvas/widgets/WorkspaceWidget';
import { PagesNavigation } from './PagesNavigation';
import { getPage } from '../../lib/workspace/pageService';
import type { Page } from '../../lib/workspace/types';
import { showToast } from '../Toast';

export function PageView() {
  const { spaceId, pageId } = useParams<{ spaceId: string; pageId: string }>();
  const navigate = useNavigate();
  const [page, setPage] = useState<Page | null>(null);
  const [loading, setLoading] = useState(true);
  const [showSidebar, setShowSidebar] = useState(true);

  useEffect(() => {
    if (pageId && spaceId) {
      loadPage();
    }
  }, [pageId, spaceId]);

  const loadPage = async () => {
    if (!pageId) return;

    try {
      setLoading(true);
      const loadedPage = await getPage(pageId);
      if (!loadedPage) {
        showToast('error', 'Page not found');
        if (spaceId) {
          navigate(`/spaces/${spaceId}`);
        }
        return;
      }
      setPage(loadedPage);
    } catch (error) {
      console.error('Error loading page:', error);
      showToast('error', 'Failed to load page');
      if (spaceId) {
        navigate(`/spaces/${spaceId}`);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    if (spaceId) {
      navigate(`/spaces/${spaceId}`);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen-safe bg-gray-50 safe-top safe-bottom flex items-center justify-center">
        <div className="text-center">
          <Loader2 size={40} className="animate-spin text-slate-600 mx-auto mb-4" />
          <p className="text-gray-600 font-medium">Loading page...</p>
        </div>
      </div>
    );
  }

  if (!page) {
    return (
      <div className="min-h-screen-safe bg-gray-50 safe-top safe-bottom flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <p className="text-gray-600 font-medium mb-1">Page not found</p>
          <p className="text-sm text-gray-500 mb-4">
            The page you're looking for doesn't exist or has been archived.
          </p>
          <button
            onClick={handleBack}
            className="px-4 py-2 bg-slate-600 text-white rounded-lg hover:bg-slate-700 transition-colors inline-flex items-center gap-2"
          >
            <ArrowLeft size={18} />
            Back to Space
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen-safe bg-gray-50 safe-top safe-bottom flex">
      {/* Pages Navigation Sidebar */}
      {spaceId && (
        <div className={`${showSidebar ? 'w-64' : 'w-0'} transition-all duration-200 overflow-hidden border-r border-gray-200 bg-white`}>
          <PagesNavigation
            spaceId={spaceId}
            currentPageId={pageId}
            onPageSelect={(selectedPageId) => {
              navigate(`/spaces/${spaceId}/pages/${selectedPageId}`);
            }}
          />
        </div>
      )}

      {/* Main Content - Page-level scrolling, not editor-level */}
      <div className="flex-1 flex flex-col min-w-0 min-h-0">
        {/* Header with toggle */}
        <div className="sticky top-0 z-10 bg-white border-b border-gray-200 safe-top flex-shrink-0">
          <div className="px-4 py-3 flex items-center gap-3">
            <button
              onClick={handleBack}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              title="Back to space"
            >
              <ArrowLeft size={20} className="text-gray-600" />
            </button>
            {spaceId && (
              <button
                onClick={() => setShowSidebar(!showSidebar)}
                className="px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                {showSidebar ? 'Hide' : 'Show'} Pages
              </button>
            )}
            <div className="flex-1 min-w-0">
              <h1 className="text-lg font-bold text-gray-900 truncate">
                {page.title}
              </h1>
            </div>
          </div>
        </div>

        {/* Workspace Content - NO overflow here, page container scrolls */}
        <div className="flex-1 min-h-0">
          <WorkspaceWidget
            pageId={page.id}
            viewMode="large"
          />
        </div>
      </div>
    </div>
  );
}
