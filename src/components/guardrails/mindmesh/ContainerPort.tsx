import { useState } from 'react';
import type { PortDefinition, PortType } from '../../../lib/mindmesh-v2/containerCapabilities';

interface ContainerPortProps {
  port: PortDefinition;
  containerId: string;
  containerWidth: number;
  containerHeight: number;
  isConnectionMode: boolean;
  isSourcePort: boolean;
  isValidTarget: boolean;
  isAvailable: boolean;
  canEdit: boolean;
  scale: number;
  isContainerSelected: boolean;
  onPortClick: (containerId: string, portType: PortType, portId: string) => void;
  onPortDoubleClick: (containerId: string, portType: PortType, portId: string) => void;
}

export function ContainerPort({
  port,
  containerId,
  containerWidth,
  containerHeight,
  isConnectionMode,
  isSourcePort,
  isValidTarget,
  isAvailable,
  canEdit,
  scale,
  isContainerSelected,
  onPortClick,
  onPortDoubleClick,
}: ContainerPortProps) {
  const [isHovered, setIsHovered] = useState(false);

  // Calculate port size based on zoom level
  // Base size is 12px at scale 1.0
  // Scales down to 3px minimum (dots when very zoomed out)
  // Scales up to 16px maximum (not too large when zoomed in)
  const calculatePortSize = (zoomScale: number) => {
    const baseSize = 12;
    const scaledSize = baseSize * zoomScale;
    const minSize = 3;
    const maxSize = 16;
    return Math.max(minSize, Math.min(maxSize, scaledSize));
  };

  const portSize = calculatePortSize(scale);
  const glowSize = Math.max(12, portSize * 1.8);

  const getPortPosition = () => {
    // Determine if this is a top or bottom port based on ID
    const isTopPort = port.id.includes('top');
    const isBottomPort = port.id.includes('bottom');

    switch (port.position) {
      case 'left':
        // Two left ports: top and bottom
        if (isTopPort) {
          return {
            left: -portSize / 2,
            top: '20%',
            transform: 'translateY(-50%)',
          };
        } else if (isBottomPort) {
          return {
            left: -portSize / 2,
            bottom: '20%',
            transform: 'translateY(50%)',
          };
        }
        // Fallback for ports without top/bottom in ID
        return {
          left: -portSize / 2,
          top: '50%',
          transform: 'translateY(-50%)',
        };
      case 'right':
        // Two right ports: top and bottom
        if (isTopPort) {
          return {
            right: -portSize / 2,
            top: '20%',
            transform: 'translateY(-50%)',
          };
        } else if (isBottomPort) {
          return {
            right: -portSize / 2,
            bottom: '20%',
            transform: 'translateY(50%)',
          };
        }
        // Fallback for ports without top/bottom in ID
        return {
          right: -portSize / 2,
          top: '50%',
          transform: 'translateY(-50%)',
        };
      case 'top':
        return {
          left: containerWidth / 2 - portSize / 2,
          top: -portSize / 2,
        };
      case 'bottom':
        return {
          left: containerWidth / 2 - portSize / 2,
          bottom: -portSize / 2,
        };
    }
  };

  const position = getPortPosition();

  // Ports are ALWAYS visible (like ComfyUI) so connections can be seen
  const isVisible = true;

  // Use the port's own color from definition
  let portBgColor = port.color;
  let portBorderColor = port.color;
  let portOpacity = 0.5; // Default 50% opacity
  let portScale = 1;

  // Determine if we should show the glow effect
  // In connection mode: glow if available (no connection)
  // When container selected: always glow
  const shouldGlow = isConnectionMode
    ? isAvailable && !isSourcePort
    : isContainerSelected;

  // Base opacity rules:
  // - Connection mode: 100% opacity for all ports
  // - Selected container: 100% opacity for container's ports
  // - Default: 50% opacity
  if (isConnectionMode) {
    portOpacity = 1.0;
  } else if (isContainerSelected) {
    portOpacity = 1.0;
  } else {
    portOpacity = 0.5;
  }

  // Enhanced states during interaction
  if (isSourcePort) {
    portOpacity = 1;
    portScale = 1.4;
    portBorderColor = '#FFFFFF';
  } else if (isValidTarget && isConnectionMode) {
    portOpacity = 1;
    portScale = 1.3;
    portBorderColor = '#FFFFFF';
  } else if (shouldGlow && isHovered) {
    portScale = 1.2;
    portBorderColor = '#FFFFFF';
  } else if (shouldGlow) {
    portScale = 1.1;
  } else if (isConnectionMode && !isAvailable) {
    // In connection mode but port has connection - 100% opacity, no glow (already handled above)
    portOpacity = 1.0;
  }

  return (
    <div
      className={`absolute transition-all duration-200 ${
        isVisible ? 'opacity-100' : 'opacity-0 pointer-events-none'
      }`}
      style={{
        ...position,
        zIndex: 100,
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Animated glow effect for available ports in connection mode */}
      {shouldGlow && (
        <div
          className="absolute animate-pulse"
          style={{
            width: `${glowSize}px`,
            height: `${glowSize}px`,
            left: '50%',
            top: '50%',
            transform: 'translate(-50%, -50%)',
            borderRadius: '50%',
            background: `radial-gradient(circle, ${port.color}60 0%, ${port.color}30 40%, transparent 70%)`,
            pointerEvents: 'none',
          }}
        />
      )}

      <button
        className="rounded-full border transition-all duration-200 hover:shadow-lg relative"
        style={{
          width: `${portSize}px`,
          height: `${portSize}px`,
          borderColor: portBorderColor,
          borderWidth: `${Math.max(1, portSize * 0.15)}px`,
          backgroundColor: portBgColor,
          opacity: portOpacity,
          transform: `scale(${portScale})`,
          cursor: canEdit ? 'pointer' : 'default',
          boxShadow: shouldGlow
            ? `0 0 ${portSize * 0.6}px ${portSize * 0.25}px ${port.color}80, 0 0 ${portSize * 0.25}px rgba(255,255,255,0.8)`
            : isSourcePort || (isValidTarget && isConnectionMode)
            ? `0 ${portSize * 0.25}px ${portSize * 0.6}px rgba(0,0,0,0.3), 0 0 0 ${Math.max(1, portSize * 0.15)}px white`
            : `0 ${portSize * 0.15}px ${portSize * 0.3}px rgba(0,0,0,0.2)`,
        }}
        onClick={(e) => {
          e.stopPropagation();
          if (canEdit && isConnectionMode) {
            onPortClick(containerId, port.type, port.id);
          }
        }}
        onDoubleClick={(e) => {
          e.stopPropagation();
          if (canEdit) {
            onPortDoubleClick(containerId, port.type, port.id);
          }
        }}
        onMouseDown={(e) => {
          e.stopPropagation();
        }}
        title={`${port.label} (${port.type}) - Double-click to create connection`}
      />

      {/* Port label on hover - only show when ports are reasonably sized */}
      {isHovered && (isConnectionMode || shouldGlow) && scale > 0.4 && (
        <div
          className="absolute whitespace-nowrap bg-gray-900 text-white rounded shadow-lg pointer-events-none"
          style={{
            fontSize: `${Math.max(9, 11 * scale)}px`,
            padding: `${Math.max(2, 4 * scale)}px ${Math.max(4, 8 * scale)}px`,
            left: port.position === 'left' ? portSize + Math.max(2, 4 * scale) : port.position === 'right' ? undefined : '50%',
            right: port.position === 'right' ? portSize + Math.max(2, 4 * scale) : undefined,
            top: port.position === 'top' ? undefined : port.position === 'bottom' ? portSize + Math.max(2, 4 * scale) : '50%',
            bottom: port.position === 'top' ? portSize + Math.max(2, 4 * scale) : undefined,
            transform:
              port.position === 'left' || port.position === 'right'
                ? 'translateY(-50%)'
                : port.position === 'top' || port.position === 'bottom'
                ? 'translateX(-50%)'
                : undefined,
          }}
        >
          {port.label}
        </div>
      )}
    </div>
  );
}
