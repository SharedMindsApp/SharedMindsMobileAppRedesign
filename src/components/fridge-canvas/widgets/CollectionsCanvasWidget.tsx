import { CollectionsWidget } from '../../collections/CollectionsWidget';
import type { SpaceType } from '../../../lib/collectionsTypes';

interface CollectionsCanvasWidgetProps {
  spaceId: string | null;
  spaceType: 'personal' | 'shared';
}

export function CollectionsCanvasWidget({ spaceId, spaceType }: CollectionsCanvasWidgetProps) {
  return (
    <div className="h-full w-full">
      <CollectionsWidget spaceId={spaceId} spaceType={spaceType as SpaceType} />
    </div>
  );
}