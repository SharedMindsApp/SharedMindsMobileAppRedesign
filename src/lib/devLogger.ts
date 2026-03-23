const isDevelopment = import.meta.env.DEV;

const isDebugEnabled = isDevelopment && localStorage.getItem('ENABLE_DEBUG_LOGS') === 'true';

export const devLog = {
  log: (...args: unknown[]) => {
    if (isDebugEnabled) {
      console.log(...args);
    }
  },
  warn: (...args: unknown[]) => {
    if (isDevelopment) {
      console.warn(...args);
    }
  },
  error: (...args: unknown[]) => {
    console.error(...args);
  },
  info: (...args: unknown[]) => {
    if (isDebugEnabled) {
      console.info(...args);
    }
  },
};

if (isDevelopment && !isDebugEnabled) {
  console.log(
    '%c[Dev Logger] Debug logs are disabled. To enable, run: localStorage.setItem("ENABLE_DEBUG_LOGS", "true") and reload.',
    'color: #888; font-style: italic;'
  );
}
