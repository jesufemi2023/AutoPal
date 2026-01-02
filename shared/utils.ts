
/**
 * Utility functions for formatting and calculations.
 */

/**
 * Robust environment variable retriever.
 * Checks window.process.env shim (configured in index.html), 
 * native process.env, and global scope.
 */
export const getEnv = (key: string): string | undefined => {
  try {
    if (window.process?.env?.[key]) return window.process.env[key];
    if (typeof process !== 'undefined' && process.env?.[key]) return process.env[key];
    if ((window as any)[key]) return (window as any)[key];
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
 * 
 * Note: Default parameters are used instead of importing from configService
 * to prevent circular module dependencies that cause initialization errors.
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
