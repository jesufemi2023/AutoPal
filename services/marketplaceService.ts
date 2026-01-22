
import { MarketplaceProduct } from '../shared/types.ts';

/**
 * Marketplace Service
 * Curates parts from verified Nigerian vendors (Lagos, Abuja, PH).
 */

const MOCK_PARTS: MarketplaceProduct[] = [
  {
    id: 'p1',
    name: 'Semi-Metallic Brake Pads (Front)',
    category: 'brakes',
    price: 18500,
    vendorName: 'Autozuby Parts Lagos',
    isVerified: true,
    compatibility: ['Honda Civic', 'Toyota Corolla', 'Toyota Camry']
  },
  {
    id: 'p2',
    name: '0W-20 Full Synthetic Oil (5L)',
    category: 'fluids',
    price: 45000,
    vendorName: 'Lubricant Hub Abuja',
    isVerified: true,
    compatibility: ['Toyota', 'Honda', 'Lexus', 'Mazda']
  },
  {
    id: 'p3',
    name: 'Iridium Spark Plugs (Set of 4)',
    category: 'engine',
    price: 32000,
    vendorName: 'Genuine Spares Garki',
    isVerified: true,
    compatibility: ['Toyota Camry', 'Toyota Avalon', 'Lexus ES350']
  },
  {
    id: 'p4',
    name: 'Engine Air Filter',
    category: 'engine',
    price: 8500,
    vendorName: 'QuickParts Port Harcourt',
    isVerified: false,
    compatibility: ['Toyota Corolla', 'Toyota Rav4']
  },
  {
    id: 'p5',
    name: 'Front Shock Absorber Pair',
    category: 'suspension',
    price: 120000,
    vendorName: 'Ladipo Master Parts',
    isVerified: true,
    compatibility: ['Lexus RX350', 'Toyota Highlander']
  }
];

export const fetchMarketplaceProducts = async (): Promise<MarketplaceProduct[]> => {
  // Simulate API delay
  return new Promise((resolve) => {
    setTimeout(() => resolve(MOCK_PARTS), 600);
  });
};

export const generateWhatsAppLink = (product: MarketplaceProduct, vehicleInfo: string) => {
  const message = `Hello ${product.vendorName}, I'm interested in the ${product.name} (₦${product.price.toLocaleString()}) advertised on AutoPal NG. \n\nMy Vehicle: ${vehicleInfo}. \nIs this compatible and available?`;
  return `https://wa.me/2340000000000?text=${encodeURIComponent(message)}`;
};
