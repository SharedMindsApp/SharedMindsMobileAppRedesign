import { GoalWidgetCore } from '../../shared/GoalWidgetCore';
import { GoalContent, WidgetViewMode } from '../../../lib/fridgeCanvasTypes';

interface GoalCanvasWidgetProps {
  content: GoalContent;
  viewMode: WidgetViewMode;
  onContentChange?: (content: GoalContent) => void;
}

export function GoalCanvasWidget({ content, viewMode, onContentChange }: GoalCanvasWidgetProps) {
  return (
    <GoalWidgetCore
      mode="fridge"
      viewMode={viewMode}
      content={content}
      onContentChange={onContentChange}
    />
  );
}
