import { ReminderWidgetCore } from '../../shared/ReminderWidgetCore';
import { ReminderContent, WidgetViewMode } from '../../../lib/fridgeCanvasTypes';

interface ReminderWidgetProps {
  content: ReminderContent;
  viewMode: WidgetViewMode;
  onContentChange?: (content: ReminderContent) => void;
}

export function ReminderWidget({ content, viewMode, onContentChange }: ReminderWidgetProps) {
  return (
    <ReminderWidgetCore
      mode="fridge"
      viewMode={viewMode}
      content={content}
      onContentChange={onContentChange}
    />
  );
}
