/**
 * Utility functions for formatting and calculations.
 */

/**
 * Safely get an environment variable from either window.process.env or process.env
 */
export const getEnv = (key: string): string | undefined => {
  try {
    // 1. Check window.process shim (highest priority for browser runtime)
    const windowProcess = (window as any).process;
    if (windowProcess?.env?.[key]) {
      return windowProcess.env[key];
    }
    
    // 2. Fallback to standard process.env (for Vercel build/injection)
    if (typeof process !== 'undefined' && process.env && process.env[key]) {
      return process.env[key];
    }
  } catch (e) {
    // Silent catch for restricted environments
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