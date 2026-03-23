/**
 * Diagnostic helper to catch initialization errors
 * Logs critical errors to console and localStorage for debugging
 */

export function logInitError(phase: string, error: unknown) {
  const errorMessage = error instanceof Error ? error.message : String(error);
  const errorStack = error instanceof Error ? error.stack : undefined;
  
  const diagnostic = {
    phase,
    message: errorMessage,
    stack: errorStack,
    timestamp: new Date().toISOString(),
    url: window.location.href,
    userAgent: navigator.userAgent,
  };
  
  console.error(`[InitDiagnostic] ${phase}:`, diagnostic);
  
  // Store in localStorage for debugging
  try {
    const existing = localStorage.getItem('app-init-errors');
    const errors = existing ? JSON.parse(existing) : [];
    errors.push(diagnostic);
    // Keep only last 5 errors
    if (errors.length > 5) {
      errors.shift();
    }
    localStorage.setItem('app-init-errors', JSON.stringify(errors));
  } catch (e) {
    // Ignore localStorage errors
  }
}

export function checkCriticalImports() {
  const checks: Array<{ name: string; check: () => boolean }> = [
    {
      name: 'React',
      check: () => typeof window !== 'undefined' && 'React' in window,
    },
    {
      name: 'DOM ready',
      check: () => document.readyState === 'complete' || document.readyState === 'interactive',
    },
    {
      name: 'Root element',
      check: () => !!document.getElementById('root'),
    },
  ];
  
  const results = checks.map(check => ({
    ...check,
    passed: check.check(),
  }));
  
  const failed = results.filter(r => !r.passed);
  if (failed.length > 0) {
    console.warn('[InitDiagnostic] Failed checks:', failed);
    return false;
  }
  
  return true;
}
