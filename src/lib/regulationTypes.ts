export type StrictnessLevel = 1 | 2 | 3 | 4 | 5;

export type RegulationEventType =
  | 'deadline_missed'
  | 'task_ignored'
  | 'session_drift'
  | 'offshoot_overuse'
  | 'side_project_overuse'
  | 'rule_completed'
  | 'focus_completed'
  | 'consistency_win'
  | 'task_completed'
  | 'milestone_hit'
  | 'session_abandoned'
  | 'level_escalated'
  | 'level_deescalated'
  | 'trust_increased'
  | 'trust_decreased'
  | 'override_used';

export interface RegulationState {
  id: string;
  user_id: string;
  master_project_id: string | null;
  current_level: StrictnessLevel;
  trust_score: number;
  rule_break_count: number;
  last_rule_break_at: string | null;
  consecutive_wins: number;
  consecutive_losses: number;
  drift_events_last_7d: number;
  focus_interruptions_last_7d: number;
  missed_deadlines_last_7d: number;
  offshoot_creation_rate_7d: number;
  side_project_switches_7d: number;
  tasks_completed_7d: number;
  focus_sessions_completed_7d: number;
  last_level_change_at: string | null;
  last_calculated_at: string;
  created_at: string;
  updated_at: string;
}

export interface RegulationEvent {
  id: string;
  user_id: string;
  master_project_id: string | null;
  event_type: RegulationEventType;
  severity: number;
  impact_on_trust: number;
  metadata: Record<string, any>;
  created_at: string;
}

export interface StrictnessLevelConfig {
  level: StrictnessLevel;
  name: string;
  description: string;
  trustScoreRange: [number, number];
  color: string;
  icon: string;
  behaviors: {
    roadmap: string[];
    taskFlow: string[];
    mindMesh: string[];
    offshoots: string[];
    sideProjects: string[];
    focus: string[];
  };
  escalationMessage: string;
  deescalationMessage: string;
  mainMessage: string;
}

export interface RegulationRule {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  sensitivity: number;
}

export interface RegulationNotification {
  type: 'info' | 'warning' | 'celebration' | 'escalation' | 'deescalation';
  level: StrictnessLevel;
  message: string;
  action?: string;
  dismissible: boolean;
}

export interface BehaviorEnforcement {
  canCreateOffshootIdea: boolean;
  canSwitchToSideProject: boolean;
  canAccessMindMesh: boolean;
  canAddNewTask: boolean;
  canAddNewTrack: boolean;
  canSkipTask: boolean;
  offshotsPerDayLimit: number | null;
  tasksRequiredToUnlock: number;
  showSimplifiedRoadmap: boolean;
  requireRealityCheck: boolean;
  warningMessage: string | null;
}

export interface TrustImpact {
  positive: {
    taskCompleted: number;
    focusSessionCompleted: number;
    milestoneHit: number;
    consistencyWin: number;
    returningAfterInactivity: number;
  };
  negative: {
    taskIgnored: number;
    sessionDrift: number;
    deadlineMissed: number;
    sessionAbandoned: number;
    offshootOveruse: number;
    sideProjectOveruse: number;
  };
}

export interface EscalationRules {
  ruleBreakThreshold: number;
  driftEventsThreshold: number;
  missedDeadlinesThreshold: number;
  consecutiveLossesThreshold: number;
  dayWindow: number;
}

export interface DeescalationRules {
  consecutiveWinsThreshold: number;
  trustScoreIncrease: number;
  focusSessionsRequired: number;
  tasksCompletedRequired: number;
}
