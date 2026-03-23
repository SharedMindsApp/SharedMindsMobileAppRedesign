/**
 * Granular Calendar Sync Settings
 * 
 * Phase 1: Architecture-only exports.
 * 
 * This module provides:
 * - Types for granular sync settings
 * - Pure resolver function (no side effects)
 * - CRUD service functions (not wired in yet)
 * 
 * IMPORTANT: These are NOT used by existing sync logic yet.
 * This is foundation work for future phases.
 */

export * from './types';
export * from './syncSettingsResolver';
export * from './syncSettingsService';
