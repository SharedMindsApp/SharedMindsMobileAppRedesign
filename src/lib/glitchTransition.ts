export async function triggerGlitchTransition(duration: number = 600): Promise<void> {
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  if (prefersReducedMotion) {
    return;
  }

  const root = document.documentElement;
  const transitionClass = 'theme-transitioning';

  root.classList.add(transitionClass);

  const overlay = document.createElement('div');
  overlay.className = 'theme-glitch-overlay';
  document.body.appendChild(overlay);

  await new Promise(resolve => setTimeout(resolve, duration));

  root.classList.remove(transitionClass);
  overlay.remove();
}
