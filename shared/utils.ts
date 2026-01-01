
/**
 * Utility functions for formatting and calculations.
 */

export const getEnv = (key: string): string | undefined => {
  try {
    const windowProcess = (window as any).process;
    if (windowProcess?.env?.[key]) return windowProcess.env[key];
    if (typeof process !== 'undefined' && process.env?.[key]) return process.env[key];
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

/** Structural VIN Validation (ISO 3779) */
export const isValidVIN = (vin: string): boolean => {
  const regex = /^[A-HJ-NPR-Z0-9]{17}$/;
  return regex.test(vin.toUpperCase());
};

/** Client-side image compression to stay within free-tier limits */
export const compressImage = async (file: File, maxWidth = 1200, quality = 0.7): Promise<Blob> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const scaleFactor = maxWidth / img.width;
        canvas.width = maxWidth;
        canvas.height = img.height * scaleFactor;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, canvas.width, canvas.height);
        canvas.toBlob((blob) => {
          if (blob) resolve(blob);
          else reject(new Error('Compression failed'));
        }, 'image/jpeg', quality);
      };
    };
    reader.onerror = (err) => reject(err);
  });
};
