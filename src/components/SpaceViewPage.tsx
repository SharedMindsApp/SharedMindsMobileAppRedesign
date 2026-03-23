/**
 * Phase 1: Critical Load Protection - Added timeout protection
 * Phase 2: Memory Leak Prevention - Using safe hooks for event listeners
 */

import { useEffect, useState, useCallback } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { FridgeCanvas } from './fridge-canvas/FridgeCanvas';
import { SpacesOSLauncher } from './spaces/SpacesOSLauncher';
import { getSpaceById, Household } from '../lib/household';
import { isStandaloneApp } from '../lib/appContext';
import { loadHouseholdWidgets } from '../lib/fridgeCanvas';
import { WidgetWithLayout } from '../lib/fridgeCanvasTypes';
import { useLoadingState } from '../hooks/useLoadingState';
import { TimeoutRecovery } from './common/TimeoutRecovery';
import { useSafeEventListener } from '../hooks/useSafeEventListener';
import { ErrorBoundary } from './common/ErrorBoundary';

export function SpaceViewPage() {
  const { spaceId } = useParams<{ spaceId: string }>();
  const [searchParams] = useSearchParams();
  const widgetParam = searchParams.get('widget');
  const [household, setHousehold] = useState<Household | null>(null);
  const { loading, timedOut, setLoading } = useLoadingState({
    timeoutMs: 12000, // 12 seconds for space load
  });
  const [error, setError] = useState<string | null>(null);
  const [widgets, setWidgets] = useState<WidgetWithLayout[]>([]);
  const [isMobile, setIsMobile] = useState(false);
  const navigate = useNavigate();

  // Phase 9A: Detect mobile/installed app
  // Phase 2: Use safe event listener for resize
  const checkMobile = useCallback(() => {
    const mobile = window.innerWidth < 768 || isStandaloneApp();
    setIsMobile(mobile);
  }, []);

  useEffect(() => {
    checkMobile();
  }, [checkMobile]);

  useSafeEventListener('resize', checkMobile, window);

  useEffect(() => {
    if (spaceId) {
      loadSpace();
    }
  }, [spaceId]);

  useEffect(() => {
    if (household) {
      loadWidgets();
    }
  }, [household]);

  const loadSpace = async () => {
    if (!spaceId) return;

    try {
      setLoading(true);
      const space = await getSpaceById(spaceId);
      if (!space) {
        setError('Space not found');
        return;
      }
      setHousehold(space);
    } catch (err) {
      console.error('Error loading space:', err);
      setError('Failed to load space');
    } finally {
      setLoading(false);
    }
  };

  const loadWidgets = async () => {
    if (!household) return;
    try {
      const loadedWidgets = await loadHouseholdWidgets(household.id);
      setWidgets(loadedWidgets);
    } catch (err) {
      console.error('Error loading widgets:', err);
    }
  };

  // Phase 1: Show timeout recovery if space load timed out
  if (timedOut) {
    return (
      <TimeoutRecovery
        message="Space is taking longer than expected to load. This may be due to a network issue."
        timeoutSeconds={12}
        onRetry={() => loadSpace()}
        onReload={() => window.location.reload()}
      />
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-amber-50 via-orange-50 to-rose-50">
        <div className="text-center">
          <Loader2 size={40} className="animate-spin text-amber-600 mx-auto mb-4" />
          <p className="text-gray-600 font-medium">Loading space...</p>
        </div>
      </div>
    );
  }

  if (error || !household) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-amber-50 via-orange-50 to-rose-50">
        <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-8 max-w-md w-full text-center">
          <p className="text-red-600 mb-4">{error || 'Space not found'}</p>
          <button
            onClick={() => navigate('/spaces/shared')}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Back to Shared Spaces
          </button>
        </div>
      </div>
    );
  }

  // Phase 9A: Check if user wants canvas view on mobile
  const viewParam = searchParams.get('view');
  const showCanvasOnMobile = viewParam === 'canvas' || widgetParam;

  // Phase 9A: On mobile/installed app, default to OS launcher UNLESS canvas view is requested
  // Phase 3: Enhanced Error Boundaries - Wrap SpacesOSLauncher with error boundary
  if (isMobile && household && !showCanvasOnMobile) {
    return (
      <ErrorBoundary
        context="Shared Space"
        fallbackRoute="/spaces/shared"
        errorMessage="An error occurred while loading the shared space."
        onRetry={loadWidgets}
        resetOnPropsChange={true}
      >
        <SpacesOSLauncher
          widgets={widgets}
          householdId={household.id}
          householdName={household.name}
          onWidgetsChange={loadWidgets}
        />
      </ErrorBoundary>
    );
  }

  // Phase 9A: Desktop - show canvas (mode toggle removed, desktop-only if needed)
  // On mobile with widget param or canvas view, also show canvas but with back button to launcher
  // Phase 3: Enhanced Error Boundaries - Wrap FridgeCanvas with error boundary
  return (
    <ErrorBoundary
      context="Shared Space Canvas"
      fallbackRoute="/spaces/shared"
      errorMessage="An error occurred while loading the canvas view."
      resetOnPropsChange={true}
    >
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-rose-50">
      {/* Main Canvas Area */}
      <FridgeCanvas householdId={household.id} />
      {/* AI chat widget disabled for shared spaces */}
    </div>
    </ErrorBoundary>
  );
}
