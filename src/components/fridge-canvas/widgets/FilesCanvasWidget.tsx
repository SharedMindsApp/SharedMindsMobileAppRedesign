import { FilesWidget } from '../../files/FilesWidget';
import type { FilesContent } from '../../../lib/fridgeCanvasTypes';

interface FilesCanvasWidgetProps {
  content: FilesContent;
  onUpdate?: (content: FilesContent) => void;
  onAddToCanvas?: () => void;
}

export function FilesCanvasWidget({ content, onAddToCanvas }: FilesCanvasWidgetProps) {
  return (
    <div className="h-full w-full">
      <FilesWidget
        spaceId={content.spaceId}
        spaceType={content.spaceType}
        onAddToCanvas={onAddToCanvas}
      />
    </div>
  );
}
