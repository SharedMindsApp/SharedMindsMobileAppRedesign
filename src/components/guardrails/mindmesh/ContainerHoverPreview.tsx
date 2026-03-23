/**
 * Container Hover Preview
 *
 * Shows basic container information on hover.
 * Appears near the cursor without blocking interaction.
 */

import type { MindMeshContainer } from '../../../hooks/useMindMesh';
import { inferContainerType, getVisualTreatment } from '../../../lib/mindmesh-v2/containerCapabilities';

interface ContainerHoverPreviewProps {
  container: MindMeshContainer;
  position: { x: number; y: number };
  title: string;
  sourceLabel: string;
  sourceIcon: string;
}

export function ContainerHoverPreview({
  container,
  position,
  title,
  sourceLabel,
  sourceIcon,
}: ContainerHoverPreviewProps) {
  const isGhost = container.state === 'ghost';
  const containerType = inferContainerType(container.entity_type, container.metadata);
  const visualTreatment = getVisualTreatment(containerType);

  return (
    <div
      className="fixed z-[1000] pointer-events-none"
      style={{
        left: position.x + 20,
        top: position.y - 10,
      }}
    >
      <div
        className="border-2 rounded-lg shadow-lg p-3 max-w-xs"
        style={{
          backgroundColor: visualTreatment.backgroundColor,
          borderColor: visualTreatment.borderColor,
        }}
      >
        <div className="flex items-center gap-2 mb-1.5">
          <span className="text-base">{visualTreatment.badgeIcon}</span>
          <span
            className="text-xs font-medium"
            style={{ color: visualTreatment.primaryColor }}
          >
            {visualTreatment.badgeLabel}
          </span>
          {isGhost && (
            <div className="ml-auto px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-600">
              Ghost
            </div>
          )}
        </div>

        <div className="text-sm font-medium text-gray-900 line-clamp-2">
          {title}
        </div>

        {isGhost && (
          <div className="mt-2 text-xs text-gray-500 border-t border-gray-200 pt-2">
            Exists in Guardrails but not yet active in Mind Mesh
          </div>
        )}
      </div>
    </div>
  );
}
