export interface RegulationPlaybook {
  id: string;
  user_id: string;
  signal_key: string;
  notes: string | null;
  helps: string[];
  doesnt_help: string | null;
  created_at: string;
  updated_at: string;
}

export interface QuickPin {
  id: string;
  user_id: string;
  signal_instance_id: string | null;
  signal_key: string;
  reason_tags: string[];
  note: string | null;
  created_at: string;
}

export interface CreatePlaybookInput {
  signal_key: string;
  notes?: string;
  helps?: string[];
  doesnt_help?: string;
}

export interface UpdatePlaybookInput {
  notes?: string;
  helps?: string[];
  doesnt_help?: string;
}

export interface CreateQuickPinInput {
  signal_key: string;
  signal_instance_id?: string;
  reason_tags?: string[];
  note?: string;
}

export const REASON_TAG_OPTIONS = [
  'Too many options',
  'Unclear next step',
  'Low energy',
  'Just exploring',
  'Context changed',
  'Not sure',
] as const;

export const HELPS_OPTIONS = [
  'Focus reset',
  'Pause scope',
  "Capture ideas, don't act",
  'Take a break',
  'Switch to admin / low-energy tasks',
  'Something else',
] as const;
