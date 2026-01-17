/**
 * Utility functions for formatting and calculations.
 */

/**
 * Robust environment variable retriever.
 */
export const getEnv = (key: string): string | undefined => {
  const viteKey = `VITE_${key}`;
  
  try {
    if (typeof process !== 'undefined' && process.env) {
      if (process.env[viteKey]) return process.env[viteKey];
      if (process.env[key]) return process.env[key];
    }
  } catch (e) {}

  try {
    // @ts-ignore
    const metaEnv = import.meta.env;
    if (metaEnv) {
      if (metaEnv[viteKey]) return metaEnv[viteKey];
      if (metaEnv[key]) return metaEnv[key];
    }
  } catch (e) {}

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
 * Conversion utility: KM/L to MPG (US)
 * Factor: 1 KM/L = 2.35215 MPG
 */
export const kmlToMpg = (kml: number | null): number | null => {
  if (kml === null) return null;
  return kml * 2.35215;
};

/**
 * Aggressive Image Compression
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

/**
 * Professional CSV Export Utility
 */
export const exportToCSV = (data: any[], filename: string) => {
  if (!data || !data.length) return;
  const headers = Object.keys(data[0]).join(',');
  const rows = data.map(row => 
    Object.values(row).map(val => {
      let clean = String(val).replace(/"/g, '""');
      if (clean.includes(',')) clean = `"${clean}"`;
      return clean;
    }).join(',')
  );
  
  const csvContent = [headers, ...rows].join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

/**
 * Professional PDF Trigger Utility
 * Uses window.print with custom report styling
 */
export const triggerProfessionalPrint = (reportId: string) => {
  const content = document.getElementById(reportId);
  if (!content) return;
  
  const originalDisplay = content.style.display;
  content.style.display = 'block';
  
  // Create a temporary print stylesheet
  const style = document.createElement('style');
  style.innerHTML = `
    @media print {
      body * { visibility: hidden; }
      #${reportId}, #${reportId} * { visibility: visible; }
      #${reportId} { 
        position: absolute; 
        left: 0; 
        top: 0; 
        width: 100%; 
        background: white !important; 
        color: black !important;
        padding: 40px !important;
      }
      .no-print { display: none !important; }
    }
  `;
  document.head.appendChild(style);
  
  window.print();
  
  document.head.removeChild(style);
  content.style.display = originalDisplay;
};