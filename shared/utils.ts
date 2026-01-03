
/**
 * Utility functions for formatting and calculations.
 */

/**
 * Robust environment variable retriever.
 * Checks multiple common locations where bundlers and platforms (Vercel, Vite, Node)
 * store environment variables.
 */
export const getEnv = (key: string): string | undefined => {
  const viteKey = `VITE_${key}`;
  
  // 1. Try static process.env (Standard Node/Webpack/Vercel)
  try {
    if (typeof process !== 'undefined' && process.env) {
      if (process.env[viteKey]) return process.env[viteKey];
      if (process.env[key]) return process.env[key];
    }
  } catch (e) {}

  // 2. Try import.meta.env (Vite/ESM Standard)
  try {
    // @ts-ignore
    const metaEnv = import.meta.env;
    if (metaEnv) {
      if (metaEnv[viteKey]) return metaEnv[viteKey];
      if (metaEnv[key]) return metaEnv[key];
    }
  } catch (e) {}

  // 3. Try window properties or shim (Setup in index.html)
  try {
    const winProcess = (window as any).process;
    if (winProcess?.env) {
      if (winProcess.env[viteKey]) return winProcess.env[viteKey];
      if (winProcess.env[key]) return winProcess.env[key];
    }
  } catch (e) {}
  
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

export const isValidVIN = (vin: string): boolean => {
  const regex = /^[A-HJ-NPR-Z0-9]{17}$/;
  return regex.test(vin.toUpperCase());
};

/**
 * Aggressive Image Compression for $70 budget.
 * Targets <150KB files to stay within Supabase Free Tier.
 */
export const compressImage = async (
  file: File | Blob, 
  maxWidth = 1024, 
  quality = 0.6
): Promise<Blob> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const scaleFactor = Math.min(1, maxWidth / img.width);
        canvas.width = img.width * scaleFactor;
        canvas.height = img.height * scaleFactor;
        const ctx = canvas.getContext('2d');
        if (!ctx) return reject(new Error('Canvas Context Missing'));
        
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        canvas.toBlob((blob) => {
          if (blob) resolve(blob);
          else reject(new Error('Compression failed'));
        }, 'image/jpeg', quality);
      };
    };
    reader.onerror = (err) => reject(err);
  });
};
