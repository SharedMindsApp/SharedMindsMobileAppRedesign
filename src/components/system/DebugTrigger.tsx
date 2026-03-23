/**
 * Debug Trigger
 * 
 * Hidden trigger to open debug panel (shake gesture or tap corner)
 */

import { useState, useEffect } from 'react';
import { Bug } from 'lucide-react';
import { DebugPanel } from './DebugPanel';

// Shake detection threshold
const SHAKE_THRESHOLD = 15;
const SHAKE_TIMEOUT = 3000;

export function DebugTrigger() {
  const [showPanel, setShowPanel] = useState(false);
  const [tapCount, setTapCount] = useState(0);
  const [lastTap, setLastTap] = useState(0);
  const [isShaking, setIsShaking] = useState(false);

  // Shake detection
  useEffect(() => {
    let lastX = 0;
    let lastY = 0;
    let lastZ = 0;
    let lastTime = 0;
    let shakeTimeout: NodeJS.Timeout | null = null;

    const handleDeviceMotion = (event: DeviceMotionEvent) => {
      if (!event.acceleration) return;

      const { x, y, z } = event.acceleration;
      if (x === null || y === null || z === null) return;

      const currentTime = Date.now();
      
      if (lastTime !== 0) {
        const timeDelta = currentTime - lastTime;
        if (timeDelta > 100) { // Sample every 100ms
          const deltaX = Math.abs(x - lastX);
          const deltaY = Math.abs(y - lastY);
          const deltaZ = Math.abs(z - lastZ);
          
          const acceleration = Math.sqrt(deltaX * deltaX + deltaY * deltaY + deltaZ * deltaZ);
          
          if (acceleration > SHAKE_THRESHOLD) {
            setIsShaking(true);
            
            if (shakeTimeout) {
              clearTimeout(shakeTimeout);
            }
            
            shakeTimeout = setTimeout(() => {
              setIsShaking(false);
              setShowPanel(true);
            }, 500); // Require sustained shake for 500ms
          }
          
          lastTime = currentTime;
          lastX = x;
          lastY = y;
          lastZ = z;
        }
      } else {
        lastTime = currentTime;
        lastX = x;
        lastY = y;
        lastZ = z;
      }
    };

    // Request permission for device motion (iOS 13+)
    if (typeof (DeviceMotionEvent as any).requestPermission === 'function') {
      (DeviceMotionEvent as any).requestPermission()
        .then((permission: string) => {
          if (permission === 'granted') {
            window.addEventListener('devicemotion', handleDeviceMotion);
          }
        })
        .catch(() => {
          // Permission denied or not available
        });
    } else {
      // Android or older iOS
      window.addEventListener('devicemotion', handleDeviceMotion);
    }

    return () => {
      window.removeEventListener('devicemotion', handleDeviceMotion);
      if (shakeTimeout) {
        clearTimeout(shakeTimeout);
      }
    };
  }, []);

  // Triple tap detection (tap bottom-right corner)
  const handleTap = () => {
    const now = Date.now();
    
    if (now - lastTap < 500) {
      // Within 500ms of last tap
      setTapCount(prev => {
        const newCount = prev + 1;
        if (newCount >= 3) {
          setShowPanel(true);
          return 0;
        }
        return newCount;
      });
    } else {
      // Reset tap count
      setTapCount(1);
    }
    
    setLastTap(now);
    
    // Reset tap count after timeout
    setTimeout(() => {
      setTapCount(0);
    }, 500);
  };

  return (
    <>
      {/* Hidden debug button - tap bottom-right corner 3 times */}
      {/* Only show on mobile or in dev mode */}
      {(typeof window !== 'undefined' && window.innerWidth < 768) || import.meta.env.DEV ? (
        <button
          onClick={handleTap}
          className="fixed bottom-4 right-4 w-12 h-12 bg-blue-600/20 hover:bg-blue-600/30 rounded-full flex items-center justify-center z-[1000] transition-colors min-h-[44px] min-w-[44px]"
          aria-label="Debug Panel (tap 3 times)"
          style={{
            opacity: tapCount > 0 ? 0.8 : 0.2,
          }}
        >
          <Bug size={24} className="text-blue-600" />
        </button>
      ) : null}

      {/* Shake indicator (for testing) */}
      {isShaking && import.meta.env.DEV && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 bg-yellow-500 text-white px-4 py-2 rounded-lg text-sm font-medium z-[1001]">
          Shake detected!
        </div>
      )}

      <DebugPanel isOpen={showPanel} onClose={() => setShowPanel(false)} />
    </>
  );
}

