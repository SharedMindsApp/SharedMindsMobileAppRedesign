/**
 * Mind Mesh V2 Telemetry Module
 *
 * Privacy-preserving telemetry system for Regulation integration.
 *
 * Prime Rule: Mind Mesh emits behaviour. Regulation interprets patterns.
 *              Regulation never interprets meaning.
 */

export type {
  TelemetryEventType,
  TelemetryEvent,
  TelemetryEventRow,
  TelemetryEventInsert,
  DailyActivitySummary,
  WeeklyPatternSummary,
  AllowedTelemetryMeta,
  ContainerTypeMeta,
  RelationshipTypeMeta,
  DirectionMeta,
} from './types';

export {
  isAllowedEventType,
  isAllowedMetaField,
  validateTelemetryMeta,
  validateTelemetryEvent,
  isTelemetryEvent,
  isAllowedTelemetryMeta,
} from './types';

export {
  mapInteractionEventToTelemetry,
  batchMapInteractionEvents,
  createManualTelemetryEvent,
  createWorkspaceOpenedEvent,
  createWorkspaceClosedEvent,
  createFocusModeEnteredEvent,
  createFocusModeExitedEvent,
  assertNoForbiddenFields,
  assertCannotReconstructGraph,
} from './mapper';

export {
  emitTelemetryEvent,
  emitFromInteractionEvent,
  batchEmitFromInteractionEvents,
  createTelemetryListener,
  createBatchTelemetryListener,
  checkTelemetryHealth,
  countTelemetryEvents,
  deleteTelemetryForUser,
} from './emitter';

export {
  getDailyActivitySummary,
  getWeeklyPatternSummary,
  getEventCountsByType,
  getTotalEventCount,
  getUsageTimespan,
} from './aggregations';
