
import { MarketplaceProduct } from '../shared/types.ts';

/**
 * Marketplace Service
 * Curates parts from verified Nigerian vendors (Lagos, Abuja, PH).
 */

import { MarketplaceProduct } from '../shared/types.ts';

/**
 * Marketplace Service
 * Curates genuine OEM and aftermarket automotive components from verified Nigerian vendors across Lagos, Abuja, and Port Harcourt.
 */

const MOCK_PARTS: MarketplaceProduct[] = [
  {
    id: 'p1',
    name: 'Ceramic Brake Pads (Front Axle Set)',
    category: 'brakes',
    price: 24500,
    vendorName: 'Autozuby Parts Ladipo',
    location: 'Ladipo Market, Lagos',
    phone: '2348035550192',
    isVerified: true,
    inStock: true,
    compatibility: ['Toyota Camry', 'Toyota Corolla', 'Honda Civic', 'Honda Accord', 'Lexus ES350']
  },
  {
    id: 'p2',
    name: '0W-20 Full Synthetic Engine Oil (5L)',
    category: 'fluids',
    price: 48000,
    vendorName: 'Lubricant Hub Central',
    location: 'Garki 2, Abuja',
    phone: '2348123450911',
    isVerified: true,
    inStock: true,
    compatibility: ['Toyota', 'Honda', 'Lexus', 'Mazda', 'Nissan', 'Hyundai', 'Kia']
  },
  {
    id: 'p3',
    name: 'Laser Iridium Spark Plugs (Set of 4)',
    category: 'engine',
    price: 38000,
    vendorName: 'Genuine Spares Garki',
    location: 'Apo Mechanic Village, Abuja',
    phone: '2348098765432',
    isVerified: true,
    inStock: true,
    compatibility: ['Toyota Camry', 'Toyota Avalon', 'Toyota RAV4', 'Lexus ES350', 'Honda CR-V']
  },
  {
    id: 'p4',
    name: 'High-Flow Engine Air Filter',
    category: 'engine',
    price: 9500,
    vendorName: 'QuickParts Port Harcourt',
    location: 'Trans-Amadi, Port Harcourt',
    phone: '2348021112233',
    isVerified: true,
    inStock: true,
    compatibility: ['Toyota Corolla', 'Toyota RAV4', 'Toyota Yaris', 'Honda Civic']
  },
  {
    id: 'p5',
    name: 'Front Shock Absorber Strut Pair',
    category: 'suspension',
    price: 135000,
    vendorName: 'Ladipo Master Parts',
    location: 'Mushin / Ladipo, Lagos',
    phone: '2348149998877',
    isVerified: true,
    inStock: true,
    compatibility: ['Lexus RX350', 'Toyota Highlander', 'Toyota Prado', 'Ford Explorer']
  },
  {
    id: 'p6',
    name: 'Heavy-Duty Alternator (130A)',
    category: 'electrical',
    price: 68000,
    vendorName: 'ElectroAuto Ikeja',
    location: 'Ikeja Computer Village / Auto Hub, Lagos',
    phone: '2348076543210',
    isVerified: true,
    inStock: true,
    compatibility: ['Toyota Sienna', 'Toyota Camry', 'Honda Pilot', 'Nissan Pathfinder']
  },
  {
    id: 'p7',
    name: 'All-Terrain 265/65 R17 Radial Tire',
    category: 'tires',
    price: 92000,
    vendorName: 'MaxTread Tyres Lekki',
    location: 'Lekki Phase 1, Lagos',
    phone: '2348034445566',
    isVerified: true,
    inStock: true,
    compatibility: ['Toyota Prado', 'Toyota Hilux', 'Mitsubishi Pajero', 'Ford Ranger']
  },
  {
    id: 'p8',
    name: 'DOT 4 Synthetic Brake Fluid (1L)',
    category: 'fluids',
    price: 7500,
    vendorName: 'Lubricant Hub Central',
    location: 'Garki 2, Abuja',
    phone: '2348123450911',
    isVerified: true,
    inStock: true,
    compatibility: ['Toyota', 'Honda', 'Mercedes-Benz', 'BMW', 'Lexus', 'Volkswagen']
  },
  {
    id: 'p9',
    name: 'Poly-V Serpentine Fan Belt',
    category: 'engine',
    price: 16500,
    vendorName: 'Autozuby Parts Ladipo',
    location: 'Ladipo Market, Lagos',
    phone: '2348035550192',
    isVerified: true,
    inStock: true,
    compatibility: ['Toyota Corolla', 'Toyota Matrix', 'Honda Accord', 'Honda Civic']
  },
  {
    id: 'p10',
    name: 'Front Lower Control Arm with Bushings',
    category: 'suspension',
    price: 46000,
    vendorName: 'Ladipo Master Parts',
    location: 'Mushin / Ladipo, Lagos',
    phone: '2348149998877',
    isVerified: true,
    inStock: true,
    compatibility: ['Toyota Camry', 'Toyota Avalon', 'Lexus ES300', 'Honda Accord']
  }
];

export const fetchMarketplaceProducts = async (): Promise<MarketplaceProduct[]> => {
  return new Promise((resolve) => {
    setTimeout(() => resolve(MOCK_PARTS), 300);
  });
};

export const generateWhatsAppLink = (product: MarketplaceProduct, vehicleInfo: string): string => {
  const phone = product.phone || '2348035550192';
  const message = `Hello ${product.vendorName}, I found the "${product.name}" (₦${product.price.toLocaleString()}) on AutoPal NG.\n\nMy Vehicle: ${vehicleInfo}\nLocation: ${product.location || 'Nigeria'}\n\nPlease confirm availability and delivery terms.`;
  return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
};

