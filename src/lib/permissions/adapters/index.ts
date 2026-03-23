/**
 * Permission Adapters
 * 
 * Register all adapters here so they can be used by the SharingDrawer.
 */

import { adapterRegistry } from '../adapter';
import { TripAdapter } from './tripAdapter';
import { GuardrailsProjectAdapter } from './guardrailsProjectAdapter';
import { CalendarEventAdapter } from './calendarEventAdapter';

// Register adapters
adapterRegistry.register('trip', (entityId: string) => new TripAdapter(entityId));
adapterRegistry.register('project', (entityId: string) => new GuardrailsProjectAdapter(entityId));
adapterRegistry.register('calendar_event', (entityId: string) => new CalendarEventAdapter(entityId));

export { TripAdapter, GuardrailsProjectAdapter, CalendarEventAdapter };

