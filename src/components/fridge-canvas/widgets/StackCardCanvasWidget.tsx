import { StackCardsWidget } from '../../spaces/StackCardsWidget';
import type { StackCardContent } from '../../../lib/fridgeCanvasTypes';

interface StackCardCanvasWidgetProps {
  content: StackCardContent;
  onUpdate?: (content: StackCardContent) => void;
}

export function StackCardCanvasWidget({ content, onUpdate }: StackCardCanvasWidgetProps) {
  if (!content.stackId) {
    return (
      <div className="flex items-center justify-center p-4 text-gray-500 text-sm">
        Stack not initialized
      </div>
    );
  }

  function handleDelete() {
    // Widget deletion is handled by parent component
  }

  return (
    <div className="h-full w-full">
      <StackCardsWidget
        stackId={content.stackId}
        onDelete={handleDelete}
      />
    </div>
  );
}
