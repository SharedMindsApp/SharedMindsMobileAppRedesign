export type DailyAlignmentStatus = 'pending' | 'completed' | 'dismissed' | 'hidden';

export type AlignmentBlockItemType = 'task' | 'subtrack' | 'track' | 'project';

export type CalendarViewMode = 'day' | 'week' | 'month';

export interface DailyAlignment {
  id: string;
  user_id: string;
  date: string;
  status: DailyAlignmentStatus;
  completed_at: string | null;
  dismissed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface DailyAlignmentBlock {
  id: string;
  alignment_id: string;
  item_type: AlignmentBlockItemType;
  item_id: string;
  item_title: string;
  start_time: string;
  duration_minutes: number;
  order_index: number;
  created_at: string;
  updated_at: string;
}

export interface DailyAlignmentMicrotask {
  id: string;
  block_id: string;
  description: string;
  is_completed: boolean;
  completed_at: string | null;
  order_index: number;
  created_at: string;
  updated_at: string;
}

export interface AlignmentBlockWithMicrotasks extends DailyAlignmentBlock {
  microtasks: DailyAlignmentMicrotask[];
}

export interface DailyAlignmentWithBlocks extends DailyAlignment {
  blocks: AlignmentBlockWithMicrotasks[];
}

export type DurationOption = 15 | 30 | 60 | 240 | 480;

export interface DurationChoice {
  label: string;
  minutes: DurationOption;
  segments: number;
}

export const DURATION_OPTIONS: DurationChoice[] = [
  { label: '15 min', minutes: 15, segments: 1 },
  { label: '30 min', minutes: 30, segments: 2 },
  { label: '1 hour', minutes: 60, segments: 4 },
  { label: 'Half day', minutes: 240, segments: 16 },
  { label: 'All day', minutes: 480, segments: 32 },
];

export interface WorkItem {
  id: string;
  type: AlignmentBlockItemType;
  title: string;
  projectName?: string;
  trackName?: string;
}

export interface BlockedTime {
  start_time: string;
  end_time: string;
  label: string;
}

export interface DailyAlignmentSettings {
  id: string;
  user_id: string;
  work_start_time: string;
  work_end_time: string;
  lunch_break_start: string | null;
  lunch_break_duration: number;
  enable_morning_break: boolean;
  morning_break_start: string | null;
  morning_break_duration: number;
  enable_afternoon_break: boolean;
  afternoon_break_start: string | null;
  afternoon_break_duration: number;
  blocked_times: BlockedTime[];
  created_at: string;
  updated_at: string;
}

export interface ProjectWithTracks {
  id: string;
  name: string;
  tracks: TrackWithSubtracks[];
}

export interface TrackWithSubtracks {
  id: string;
  name: string;
  projectId: string;
  projectName: string;
  subtracks: SubtrackItem[];
  tasks: TaskItem[];
}

export interface SubtrackItem {
  id: string;
  name: string;
  trackId: string;
  trackName: string;
  projectName: string;
}

export interface TaskItem {
  id: string;
  title: string;
  trackId?: string;
  trackName?: string;
  projectName?: string;
}

export interface HourSegmentation {
  hour: number;
  segments: {
    start: number;
    duration: number;
    filled: boolean;
    blockId?: string;
  }[];
  availableMinutes: number;
  totalMinutes: number;
}
