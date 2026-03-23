/**
 * Interventions Module
 *
 * Exports all intervention types, services, and utilities.
 *
 * Stage 3.1: Registry & control scaffolding
 * Stage 3.2: Manual invocation shell (user-invoked only)
 * Stage 3.3: Foreground context triggers (in-app only, user-defined only)
 * Stage 3.4: Trigger audit & debug panel (transparency only)
 * Stage 3.5: Governance & personal limits (user-defined meta-control)
 *
 * CRITICAL: NO background logic, NO time-based triggers, NO notifications.
 */

export * from './stage3_1-types';
export * from './stage3_1-validate';
export * from './stage3_1-service';
export * from './stage3_2-invocation';
export * from './stage3_3-types';
export * from './stage3_3-foreground-router';
export * from './stage3_4-audit-service';
export * from './stage3_5-types';
export * from './stage3_5-service';
