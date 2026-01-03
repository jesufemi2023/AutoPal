
/**
 * Utility functions for formatting and calculations.
 */

/**
 * Robust environment variable retriever.
 * We use literal static references (e.g., process.env.VITE_API_KEY) 
 * so that bundlers like Vite/Vercel can perform string replacement during build.
 */
export const getEnv = (key: string): string | undefined => {
  // Static mapping is required for many bundlers to perform replacement
  const staticEnv: Record<string, string | undefined> = {
    'API_KEY': process.env.VITE_API_KEY || process.env.API_KEY,
    'SUPABASE_URL': process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL,
    'SUPABASE_ANON_KEY': process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY,
    'MOCK_AI': process.env.VITE_MOCK_AI || process.env.MOCK_AI,
    'REGIONAL_CONTEXT': process.env.VITE_REGIONAL_CONTEXT || process.env.REGIONAL_CONTEXT,
  };

  if (staticEnv[key]) return staticEnv[key];

  try {
    // Fallback for runtime injection or shim
    if (window.process?.env?.[key]) return window.process.env[key];
    if (window.process?.env?.[`VITE_${key}`]) return window.process.env[`VITE_${key}`];
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
