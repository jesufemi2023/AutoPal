
/**
 * Utility functions for formatting and calculations.
 */

/**
 * Safely get an environment variable from either window.process.env or process.env
 */
export const getEnv = (key: string): string | undefined => {
  try {
    // Priority 1: Browser shim (for previews/local)
    if ((window as any).process?.env?.[key]) {
      return (window as any).process.env[key];
    }
    // Priority 2: Standard Node-style process (for build/Vercel environments)
    if (typeof process !== 'undefined' && process.env?.[key]) {
      return process.env[key];
    }
  } catch (e) {
    console.warn(`Error accessing env var ${key}:`, e);
  }
  return undefined;
};

export const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
  }).format(amount);
};

export const formatDate = (date: string) => {
  return new Date(date).toLocaleDateString();
};
