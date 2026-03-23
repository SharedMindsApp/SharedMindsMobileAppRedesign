import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { triggerGlitchTransition } from '../lib/glitchTransition';
import { isStandaloneApp } from '../lib/appContext';

export function RouteGlitchEffect() {
  const location = useLocation();
  const previousPathRef = useRef(location.pathname);
  const isFirstRenderRef = useRef(true);

  // Check if we're on a Spaces route (mobile OS launcher)
  const isSpacesRoute = (pathname: string) => {
    return pathname.startsWith('/spaces/') || pathname === '/spaces';
  };

  // Check if we're on mobile/installed app
  const isMobile = () => {
    return window.innerWidth < 768 || isStandaloneApp();
  };

  useEffect(() => {
    if (isFirstRenderRef.current) {
      isFirstRenderRef.current = false;
      return;
    }

    if (previousPathRef.current !== location.pathname) {
      const previousIsSpaces = isSpacesRoute(previousPathRef.current);
      const currentIsSpaces = isSpacesRoute(location.pathname);
      const isMobileDevice = isMobile();

      // Skip glitch effect for Spaces routes on mobile (OS launcher should feel native)
      if (isMobileDevice && (previousIsSpaces || currentIsSpaces)) {
        previousPathRef.current = location.pathname;
        return;
      }

      // Trigger glitch for other routes
      triggerGlitchTransition(400);
      previousPathRef.current = location.pathname;
    }
  }, [location.pathname]);

  return null;
}
