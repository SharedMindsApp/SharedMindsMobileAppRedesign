/**
 * Workspace Types
 * 
 * Type definitions for the Workspace system - a structured thinking and
 * reference surface within Spaces.
 */

export type WorkspaceUnitType =
  | 'text'
  | 'bullet'
  | 'checklist'
  | 'group'
  | 'callout'
  | 'reference'
  | 'code'
  | 'divider';

export type WorkspaceReferenceType =
  | 'planner_event'
  | 'guardrails_task'
  | 'guardrails_roadmap'
  | 'goal'
  | 'workspace' // Legacy, use 'page' instead
  | 'page'
  | 'widget'
  | 'url';

export type WorkspaceCalloutType =
  | 'info'
  | 'warning'
  | 'success'
  | 'error';

// Content structures for each unit type
export interface TextUnitContent {
  text: string;
  formatting?: 'markdown' | 'plain';
}

export interface BulletUnitContent {
  items: string[];
  ordered: boolean;
}

export interface ChecklistUnitContent {
  items: Array<{
    text: string;
    completed: boolean;
  }>;
}

export interface GroupUnitContent {
  title?: string;
  summary?: string;
}

export interface CalloutUnitContent {
  text: string;
  type: WorkspaceCalloutType;
}

export interface ReferenceUnitContent {
  reference_type: WorkspaceReferenceType;
  reference_id?: string;
  reference_url?: string;
  display_text: string;
  preview?: Record<string, any>;
}

export interface CodeUnitContent {
  code: string;
  language?: string;
}

export interface DividerUnitContent {
  style?: 'solid' | 'dashed' | 'dotted';
}

export type WorkspaceUnitContent =
  | TextUnitContent
  | BulletUnitContent
  | ChecklistUnitContent
  | GroupUnitContent
  | CalloutUnitContent
  | ReferenceUnitContent
  | CodeUnitContent
  | DividerUnitContent;

// Database entities
export interface Page {
  id: string;
  space_id: string;
  parent_page_id?: string;
  title: string;
  order_index: number;
  created_by: string;
  created_at: string;
  updated_at: string;
  archived_at?: string;
  // Computed fields (not in DB)
  children?: Page[];
}

// Legacy Workspace interface (kept for backward compatibility during migration)
export interface Workspace {
  id: string;
  space_id: string;
  title?: string;
  created_by: string;
  created_at: string;
  updated_at: string;
  archived_at?: string;
}

export interface WorkspaceUnit {
  id: string;
  page_id: string; // Changed from workspace_id
  parent_id?: string; // Renamed from parent_unit_id for clarity
  type: WorkspaceUnitType;
  content: WorkspaceUnitContent;
  order_index: number;
  is_collapsed: boolean;
  is_completed: boolean;
  created_at: string;
  updated_at: string;
  deleted_at?: string;
  // Computed fields (not in DB)
  children?: WorkspaceUnit[];
}

export interface WorkspaceReference {
  id: string;
  workspace_unit_id: string;
  reference_type: WorkspaceReferenceType;
  reference_id?: string;
  reference_url?: string;
  display_text: string;
  preview_data?: Record<string, any>;
  created_at: string;
}

// Helper type guards
export function isTextUnit(unit: WorkspaceUnit): unit is WorkspaceUnit & { content: TextUnitContent } {
  return unit.type === 'text';
}

export function isBulletUnit(unit: WorkspaceUnit): unit is WorkspaceUnit & { content: BulletUnitContent } {
  return unit.type === 'bullet';
}

export function isChecklistUnit(unit: WorkspaceUnit): unit is WorkspaceUnit & { content: ChecklistUnitContent } {
  return unit.type === 'checklist';
}

export function isGroupUnit(unit: WorkspaceUnit): unit is WorkspaceUnit & { content: GroupUnitContent } {
  return unit.type === 'group';
}

export function isCalloutUnit(unit: WorkspaceUnit): unit is WorkspaceUnit & { content: CalloutUnitContent } {
  return unit.type === 'callout';
}

export function isReferenceUnit(unit: WorkspaceUnit): unit is WorkspaceUnit & { content: ReferenceUnitContent } {
  return unit.type === 'reference';
}

export function isCodeUnit(unit: WorkspaceUnit): unit is WorkspaceUnit & { content: CodeUnitContent } {
  return unit.type === 'code';
}

export function isDividerUnit(unit: WorkspaceUnit): unit is WorkspaceUnit & { content: DividerUnitContent } {
  return unit.type === 'divider';
}
