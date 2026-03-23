import type { ChatSurfaceType } from './guardrails/ai/aiChatSurfaceTypes';
import type { AIConversation, AIChatMessage } from './guardrails/ai/aiChatTypes';

export type WidgetState = 'hidden' | 'minimized' | 'floating' | 'docked';

export interface WidgetPosition {
  x: number;
  y: number;
}

export interface WidgetSize {
  height: number;
}

export interface WidgetConfig {
  state: WidgetState;
  position: WidgetPosition;
  size: WidgetSize;
  lastActiveConversationId: string | null;
}

export interface CurrentSurface {
  surfaceType: ChatSurfaceType;
  masterProjectId: string | null;
  label: string;
  description: string;
}

export interface ConversationListItem extends AIConversation {
  message_count: number;
  last_message_at: string | null;
  is_ephemeral: boolean;
  expires_at: string | null;
}

export interface MessageWithDraft extends AIChatMessage {
  draft?: {
    id: string;
    title: string;
    description: string | null;
    status: string;
    entity_type: string;
    created_at: string;
  };
}

export const DEFAULT_WIDGET_CONFIG: WidgetConfig = {
  state: 'minimized',
  position: { x: window.innerWidth - 420, y: window.innerHeight - 600 },
  size: { height: 500 },
  lastActiveConversationId: null,
};

export const WIDGET_DIMENSIONS = {
  minimized: { width: 64, height: 64 },
  floating: { width: 400, minHeight: 300, maxHeight: 800 },
  docked: { width: 450, height: '100vh' },
} as const;

export const LOCAL_STORAGE_KEYS = {
  widgetConfig: 'ai_chat_widget_config',
  widgetState: 'ai_chat_widget_state',
} as const;

export function getStoredWidgetConfig(): WidgetConfig {
  try {
    const stored = localStorage.getItem(LOCAL_STORAGE_KEYS.widgetConfig);
    if (stored) {
      return { ...DEFAULT_WIDGET_CONFIG, ...JSON.parse(stored) };
    }
  } catch (error) {
    console.error('Failed to load widget config:', error);
  }
  return DEFAULT_WIDGET_CONFIG;
}

export function saveWidgetConfig(config: Partial<WidgetConfig>): void {
  try {
    const current = getStoredWidgetConfig();
    const updated = { ...current, ...config };
    localStorage.setItem(LOCAL_STORAGE_KEYS.widgetConfig, JSON.stringify(updated));
  } catch (error) {
    console.error('Failed to save widget config:', error);
  }
}

export function getTimeUntilExpiry(expiresAt: string | null): string | null {
  if (!expiresAt) return null;

  const now = new Date();
  const expiry = new Date(expiresAt);
  const diffMs = expiry.getTime() - now.getTime();

  if (diffMs <= 0) return 'Expired';

  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

  if (diffHours > 0) {
    return `${diffHours}h ${diffMinutes}m remaining`;
  }
  return `${diffMinutes}m remaining`;
}

export function isConversationExpiringSoon(expiresAt: string | null): boolean {
  if (!expiresAt) return false;

  const now = new Date();
  const expiry = new Date(expiresAt);
  const diffMs = expiry.getTime() - now.getTime();
  const diffHours = diffMs / (1000 * 60 * 60);

  return diffHours <= 2 && diffHours > 0;
}

export function formatSurfaceLabel(surfaceType: ChatSurfaceType, projectName?: string): string {
  switch (surfaceType) {
    case 'project':
      return projectName || 'Project';
    case 'personal':
      return 'Personal Spaces';
    case 'shared':
      return 'Shared Spaces';
    default:
      return 'Unknown';
  }
}

export function getSurfaceDescription(surfaceType: ChatSurfaceType): string {
  switch (surfaceType) {
    case 'project':
      return 'Scoped to this project only';
    case 'personal':
      return 'Personal consumption data (read-only)';
    case 'shared':
      return 'Shared spaces collaboration';
    default:
      return '';
  }
}

export function getSurfaceIcon(surfaceType: ChatSurfaceType): string {
  switch (surfaceType) {
    case 'project':
      return '📁';
    case 'personal':
      return '👤';
    case 'shared':
      return '👥';
    default:
      return '💬';
  }
}
