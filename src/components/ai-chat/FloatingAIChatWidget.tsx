import { useState, useEffect, useCallback, useRef } from 'react';
import { MessageSquare, X, Maximize2, Minimize2, Lock, Unlock } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useActiveProject } from '../../contexts/ActiveProjectContext';
import { useAIChatWidget } from '../../contexts/AIChatWidgetContext';
import { useADCSubscription, useADCState } from '../../contexts/ActiveDataContext';
import { supabase } from '../../lib/supabase';
import type { MasterProject } from '../../lib/guardrailsTypes';
import { ChatWidgetHeader } from './ChatWidgetHeader';
import { ChatWidgetConversationList } from './ChatWidgetConversationList';
import { ChatWidgetMessageList } from './ChatWidgetMessageList';
import { ChatWidgetComposer } from './ChatWidgetComposer';
import type { WidgetState, WidgetConfig, CurrentSurface } from '../../lib/aiChatWidgetTypes';
import {
  getStoredWidgetConfig,
  saveWidgetConfig,
  WIDGET_DIMENSIONS,
  formatSurfaceLabel,
  getSurfaceDescription,
} from '../../lib/aiChatWidgetTypes';
import type { ChatSurfaceType } from '../../lib/guardrails/ai/aiChatSurfaceTypes';
import { conversationService } from '../../lib/guardrails/ai/conversationService';

export function FloatingAIChatWidget() {
  const { user } = useAuth();
  const { activeProject: legacyActiveProject } = useActiveProject();
  const adcState = useADCState();
  const { setWidgetState: setContextWidgetState } = useAIChatWidget();

  const [adcProject, setAdcProject] = useState<MasterProject | null>(null);

  const [config, setConfig] = useState<WidgetConfig>(() => {
    const stored = getStoredWidgetConfig();
    // Clamp position to viewport on initial load
    const clampedX = Math.max(0, Math.min(stored.position.x, window.innerWidth - WIDGET_DIMENSIONS.floating.width));
    const clampedY = Math.max(0, Math.min(stored.position.y, window.innerHeight - 200));

    // Reset to safe default if completely off-screen
    if (stored.position.x < -WIDGET_DIMENSIONS.floating.width ||
        stored.position.y < -200 ||
        stored.position.x > window.innerWidth ||
        stored.position.y > window.innerHeight) {
      return {
        ...stored,
        position: { x: window.innerWidth - WIDGET_DIMENSIONS.floating.width - 24, y: window.innerHeight - 600 }
      };
    }

    return {
      ...stored,
      position: { x: clampedX, y: clampedY }
    };
  });

  const [activeConversationId, setActiveConversationId] = useState<string | null>(
    config.lastActiveConversationId
  );
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [systemMessage, setSystemMessage] = useState<string | null>(null);

  const widgetRef = useRef<HTMLDivElement>(null);

  const activeProject = adcProject || legacyActiveProject;
  const previousProjectIdRef = useRef<string | null>(activeProject?.id || null);

  useEffect(() => {
    async function fetchAdcProject() {
      if (!adcState.activeProjectId) {
        setAdcProject(null);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('master_projects')
          .select('*')
          .eq('id', adcState.activeProjectId)
          .maybeSingle();

        if (error) {
          console.error('[AI WIDGET] Failed to fetch ADC project:', error);
          return;
        }

        if (data) {
          setAdcProject(data as MasterProject);
        }
      } catch (error) {
        console.error('[AI WIDGET] Error fetching ADC project:', error);
      }
    }

    fetchAdcProject();
  }, [adcState.activeProjectId]);

  useADCSubscription('projectChanged', ({ projectId }) => {
    // Project changed via ADC
  });

  const currentSurface: CurrentSurface = {
    surfaceType: activeProject ? 'project' : 'personal',
    masterProjectId: activeProject?.id || null,
    label: formatSurfaceLabel(
      activeProject ? 'project' : 'personal',
      activeProject?.name
    ),
    description: getSurfaceDescription(activeProject ? 'project' : 'personal'),
  };

  const surfaceKey = `${currentSurface.surfaceType}:${currentSurface.masterProjectId ?? 'none'}`;

  const updateConfig = useCallback((updates: Partial<WidgetConfig>) => {
    setConfig((prev) => {
      const updated = { ...prev, ...updates };
      saveWidgetConfig(updated);
      return updated;
    });
  }, []);

  const setState = useCallback(
    (state: WidgetState) => {
      updateConfig({ state });
      setContextWidgetState(state);
    },
    [updateConfig, setContextWidgetState]
  );

  useEffect(() => {
    setContextWidgetState(config.state);
  }, [config.state, setContextWidgetState]);

  // Detect and handle active project changes
  useEffect(() => {
    const currentProjectId = activeProject?.id || null;
    const previousProjectId = previousProjectIdRef.current;

    // Check if project actually changed (not just initial mount)
    if (previousProjectId !== currentProjectId && previousProjectIdRef.current !== undefined) {
      // Start transition
      setIsTransitioning(true);

      // Clear active conversation immediately
      setActiveConversationId(null);

      // Safety check: ensure conversation was cleared
      if (activeConversationId) {
        console.warn('[AI WIDGET SAFETY] Cleared conversation during project switch:', activeConversationId);
      }

      // Generate system message
      const projectName = activeProject?.name || 'Personal Space';
      const surfaceType = activeProject ? 'project' : 'personal';
      const message = activeProject
        ? `Switched to project: ${projectName}\nThis chat is now scoped to this project only.`
        : `Switched to Personal Space\nThis chat is now scoped to your personal context.`;

      setSystemMessage(message);

      // Clear system message after 5 seconds
      const messageTimer = setTimeout(() => {
        setSystemMessage(null);
      }, 5000);

      // End transition after next render cycle
      const transitionTimer = setTimeout(() => {
        setIsTransitioning(false);
      }, 100);

      // Update ref for next comparison
      previousProjectIdRef.current = currentProjectId;

      return () => {
        clearTimeout(messageTimer);
        clearTimeout(transitionTimer);
      };
    } else {
      // Initial mount - just update the ref
      previousProjectIdRef.current = currentProjectId;
    }
  }, [activeProject?.id, activeProject?.name, activeConversationId]);

  // Safety guard: validate conversation belongs to current surface
  useEffect(() => {
    if (!activeConversationId || isTransitioning) return;

    // This is a runtime invariant check
    // In normal operation, the project change handler should have already cleared the conversation
    // This is a defensive check in case of race conditions or unexpected state
    async function validateConversation() {
      try {
        const conversations = await conversationService.listConversations(
          { user_id: user!.id },
          user!.id
        );

        const conversation = conversations.find((c) => c.id === activeConversationId);

        if (conversation) {
          const conversationProjectId = conversation.master_project_id;
          const currentProjectId = currentSurface.masterProjectId;

          // Check if conversation's surface matches current surface
          if (conversationProjectId !== currentProjectId) {
            console.error('[AI WIDGET SAFETY] Surface mismatch detected!', {
              conversationProjectId,
              currentProjectId,
              conversationId: activeConversationId
            });

            // Clear the mismatched conversation
            setActiveConversationId(null);

            // Show a safety message
            setSystemMessage(
              '⚠️ Safety check triggered\nCleared conversation from different project to prevent context bleed.'
            );

            setTimeout(() => setSystemMessage(null), 5000);
          }
        }
      } catch (error) {
        console.error('[AI WIDGET SAFETY] Failed to validate conversation:', error);
      }
    }

    validateConversation();
  }, [activeConversationId, currentSurface.masterProjectId, isTransitioning, user]);

  const handleMinimize = useCallback(() => {
    setState('minimized');
  }, [setState]);

  const handleMaximize = useCallback(() => {
    if (config.state === 'docked') {
      setState('floating');
    } else {
      setState('docked');
    }
  }, [config.state, setState]);

  const handleClose = useCallback(() => {
    setState('hidden');
  }, [setState]);

  const handleNewChat = useCallback(async () => {
    if (!user) return;

    try {
      const result = await conversationService.createConversation(
        {
          user_id: user.id,
          master_project_id: currentSurface.masterProjectId,
          title: 'New Conversation',
        },
        user.id,
        currentSurface.surfaceType,
        false
      );

      if (result.id) {
        setActiveConversationId(result.id);
      }
    } catch (error) {
      console.error('Failed to create conversation:', error);
      alert('Failed to create conversation: ' + (error as Error).message);
    }
  }, [user, currentSurface]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (config.state !== 'floating') return;

    const rect = widgetRef.current?.getBoundingClientRect();
    if (!rect) return;

    setIsDragging(true);
    setDragOffset({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
  }, [config.state]);

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isDragging) return;

      const newX = Math.max(
        0,
        Math.min(e.clientX - dragOffset.x, window.innerWidth - WIDGET_DIMENSIONS.floating.width)
      );
      const newY = Math.max(
        0,
        Math.min(e.clientY - dragOffset.y, window.innerHeight - 200)
      );

      updateConfig({ position: { x: newX, y: newY } });
    },
    [isDragging, dragOffset, updateConfig]
  );

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleResizeMouseDown = useCallback((e: React.MouseEvent) => {
    if (config.state !== 'floating') return;
    e.stopPropagation();
    setIsResizing(true);
  }, [config.state]);

  const handleResizeMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isResizing) return;

      const rect = widgetRef.current?.getBoundingClientRect();
      if (!rect) return;

      const newHeight = Math.max(
        WIDGET_DIMENSIONS.floating.minHeight,
        Math.min(e.clientY - rect.top, WIDGET_DIMENSIONS.floating.maxHeight)
      );

      updateConfig({ size: { height: newHeight } });
    },
    [isResizing, updateConfig]
  );

  const handleResizeMouseUp = useCallback(() => {
    setIsResizing(false);
  }, []);

  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, handleMouseMove, handleMouseUp]);

  useEffect(() => {
    if (isResizing) {
      document.addEventListener('mousemove', handleResizeMouseMove);
      document.addEventListener('mouseup', handleResizeMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleResizeMouseMove);
        document.removeEventListener('mouseup', handleResizeMouseUp);
      };
    }
  }, [isResizing, handleResizeMouseMove, handleResizeMouseUp]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setState(config.state === 'hidden' ? 'floating' : 'hidden');
      }
      if (e.key === 'Escape' && config.state !== 'hidden' && config.state !== 'minimized') {
        handleMinimize();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [config.state, setState, handleMinimize]);

  useEffect(() => {
    setActiveConversationId(null);
  }, [currentSurface.surfaceType, currentSurface.masterProjectId]);

  useEffect(() => {
    const handleOpenAIChat = (e: CustomEvent) => {
      const { conversationId, surfaceType, masterProjectId } = e.detail;

      // Only open if we're on the correct surface
      if (surfaceType === currentSurface.surfaceType &&
          masterProjectId === currentSurface.masterProjectId) {
        setActiveConversationId(conversationId);

        // Open widget if hidden or minimized
        if (config.state === 'hidden' || config.state === 'minimized') {
          setState('floating');
        }
      }
    };

    window.addEventListener('open-ai-chat', handleOpenAIChat as EventListener);
    return () => window.removeEventListener('open-ai-chat', handleOpenAIChat as EventListener);
  }, [currentSurface, config.state, setState]);

  // Debug badge if no user (temporary for debugging)
  if (!user) {
    return (
      <div className="fixed bottom-6 right-6 z-[9999] bg-red-600 text-white px-3 py-2 rounded-lg shadow-lg text-xs font-mono">
        AI Widget mounted but no user
      </div>
    );
  }

  if (config.state === 'hidden') {
    return (
      <button
        onClick={() => setState('floating')}
        className="fixed bottom-6 right-6 w-14 h-14 bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-lg flex items-center justify-center transition-all z-[9999]"
        aria-label="Open AI Chat"
        title="Open AI Chat (⌘K / Ctrl+K)"
      >
        <MessageSquare className="w-6 h-6" />
      </button>
    );
  }

  if (config.state === 'minimized') {
    return (
      <button
        onClick={() => setState('floating')}
        className="fixed bottom-6 right-6 w-16 h-16 bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-lg flex flex-col items-center justify-center transition-all z-[9999]"
        aria-label="Open AI Chat"
        title="Open AI Chat"
      >
        <MessageSquare className="w-6 h-6" />
        <span className="text-xs mt-1">AI</span>
      </button>
    );
  }

  if (config.state === 'docked') {
    return (
      <div
        className="fixed right-0 top-0 h-screen bg-white border-l border-gray-200 shadow-2xl flex flex-col z-[9999]"
        style={{ width: WIDGET_DIMENSIONS.docked.width }}
        role="dialog"
        aria-label="AI Chat Widget"
      >
        <div key={surfaceKey} className="flex flex-col h-full">
          <ChatWidgetHeader
            currentSurface={currentSurface}
            onClose={handleClose}
            onMinimize={handleMinimize}
            onMaximize={handleMaximize}
            isDocked={true}
            onMouseDown={() => {}}
            onNewChat={handleNewChat}
          />

          <div className="flex-1 flex flex-col overflow-hidden">
            <div className="flex-1 overflow-hidden">
              {activeConversationId ? (
                <ChatWidgetMessageList
                  conversationId={activeConversationId}
                  userId={user.id}
                  currentSurface={currentSurface}
                />
              ) : (
                <ChatWidgetConversationList
                  userId={user.id}
                  currentSurface={currentSurface}
                  onSelectConversation={setActiveConversationId}
                  onCreateConversation={setActiveConversationId}
                />
              )}
            </div>

            {systemMessage && (
              <div className="px-4 py-3 bg-blue-50 border-t border-blue-100">
                <div className="flex items-start gap-2">
                  <div className="text-blue-600 text-lg flex-shrink-0">🔄</div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-medium text-blue-900 whitespace-pre-line">
                      {systemMessage}
                    </div>
                  </div>
                </div>
              </div>
            )}

            <ChatWidgetComposer
              conversationId={activeConversationId}
              userId={user.id}
              currentSurface={currentSurface}
              onConversationCreated={setActiveConversationId}
              disabled={isTransitioning}
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={widgetRef}
      className="fixed bg-white rounded-lg shadow-2xl border border-gray-200 flex flex-col z-[9999]"
      style={{
        left: config.position.x,
        top: config.position.y,
        width: WIDGET_DIMENSIONS.floating.width,
        height: config.size.height,
      }}
      role="dialog"
      aria-label="AI Chat Widget"
    >
      <div key={surfaceKey} className="flex flex-col h-full">
        <ChatWidgetHeader
          currentSurface={currentSurface}
          onClose={handleClose}
          onMinimize={handleMinimize}
          onMaximize={handleMaximize}
          isDocked={false}
          onMouseDown={handleMouseDown}
          onNewChat={handleNewChat}
        />

        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 overflow-hidden">
            {activeConversationId ? (
              <ChatWidgetMessageList
                conversationId={activeConversationId}
                userId={user.id}
                currentSurface={currentSurface}
              />
            ) : (
              <ChatWidgetConversationList
                userId={user.id}
                currentSurface={currentSurface}
                onSelectConversation={setActiveConversationId}
                onCreateConversation={setActiveConversationId}
              />
            )}
          </div>

          {systemMessage && (
            <div className="px-4 py-3 bg-blue-50 border-t border-blue-100">
              <div className="flex items-start gap-2">
                <div className="text-blue-600 text-lg flex-shrink-0">🔄</div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-medium text-blue-900 whitespace-pre-line">
                    {systemMessage}
                  </div>
                </div>
              </div>
            </div>
          )}

          <ChatWidgetComposer
            conversationId={activeConversationId}
            userId={user.id}
            currentSurface={currentSurface}
            onConversationCreated={setActiveConversationId}
            disabled={isTransitioning}
          />
        </div>
      </div>

      {config.state === 'floating' && (
        <div
          className="absolute bottom-0 left-0 right-0 h-2 cursor-ns-resize hover:bg-blue-100"
          onMouseDown={handleResizeMouseDown}
          aria-label="Resize widget"
        />
      )}
    </div>
  );
}
