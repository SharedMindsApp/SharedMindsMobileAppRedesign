import { CalendarWidgetCore } from '../../shared/CalendarWidgetCore';
import type { WidgetViewMode, WidgetRenderMode } from '../../../lib/fridgeCanvasTypes';

interface CalendarCanvasWidgetProps {
  householdId: string;
  viewMode: WidgetViewMode;
  onViewModeChange?: (mode: WidgetViewMode) => void;
  onNewEvent?: () => void;
  mode?: WidgetRenderMode; // Allow override for app mode
}

export function CalendarCanvasWidget({ 
  householdId, 
  viewMode, 
  onViewModeChange, 
  onNewEvent,
  mode = 'fridge' // Default to fridge widget mode
}: CalendarCanvasWidgetProps) {
  return (
    <CalendarWidgetCore
      mode={mode}
      householdId={householdId}
      viewMode={viewMode}
      onViewModeChange={onViewModeChange}
      onNewEvent={onNewEvent}
    />
  );
}
