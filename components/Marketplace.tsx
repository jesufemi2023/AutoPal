import React, { useState, useEffect } from 'react';
import { useAutoPalStore } from '../shared/store.ts';
import { fetchMarketplaceProducts, generateWhatsAppLink } from '../services/marketplaceService.ts';
import { MarketplaceProduct } from '../shared/types.ts';
import { Search, ShoppingBag, ShieldCheck, MapPin, Sparkles, ExternalLink, Filter, CheckCircle2 } from 'lucide-react';

const Marketplace: React.FC = () => {
  const { marketplace, setMarketplace, suggestedPartNames, marketplaceFilter, setMarketplaceFilter, vehicles } = useAutoPalStore();
  const [filter, setFilter] = useState(marketplaceFilter);
  const [loading, setLoading] = useState(false);
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const activeVehicle = vehicles[0];
  const vehicleString = activeVehicle 
    ? `${activeVehicle.year} ${activeVehicle.make} ${activeVehicle.model} (${activeVehicle.mileage.toLocaleString()}km)`
    : 'Nigerian Vehicle Fleet';

  useEffect(() => {
    const loadMarketplace = async () => {
      setLoading(true);
      try {
        const products = await fetchMarketplaceProducts();
        setMarketplace(products);
      } catch (e) {
        console.error("Marketplace Error", e);
      } finally {
        setLoading(false);
      }
    };
    loadMarketplace();
  }, [setMarketplace]);

  // Sync internal filter with store filter
  useEffect(() => {
    if (marketplaceFilter) {
      setFilter(marketplaceFilter);
    }
  }, [marketplaceFilter]);

  const filteredItems = marketplace.filter(item => {
    const term = filter.trim().toLowerCase();
    const matchesSearch = !term || 
                          item.name.toLowerCase().includes(term) || 
                          item.category.toLowerCase().includes(term) ||
                          item.vendorName.toLowerCase().includes(term) ||
                          (item.location && item.location.toLowerCase().includes(term));
    const matchesCategory = activeCategory === 'all' || item.category === activeCategory;
    return matchesSearch && matchesCategory;
  });

  const sortedItems = [...filteredItems].sort((a, b) => {
    const aSuggested = suggestedPartNames.some(s => a.name.toLowerCase().includes(s.toLowerCase()) || s.toLowerCase().includes(a.name.toLowerCase()));
    const bSuggested = suggestedPartNames.some(s => b.name.toLowerCase().includes(s.toLowerCase()) || s.toLowerCase().includes(b.name.toLowerCase()));
    if (aSuggested && !bSuggested) return -1;
    if (!aSuggested && bSuggested) return 1;
    return 0;
  });

  const categories = [
    { id: 'all', label: 'All Components' },
    { id: 'brakes', label: 'Brakes & Pads' },
    { id: 'fluids', label: 'Oils & Fluids' },
    { id: 'engine', label: 'Engine & Ignition' },
    { id: 'suspension', label: 'Suspension' },
    { id: 'electrical', label: 'Electrical & AC' },
    { id: 'tires', label: 'Tires & Wheels' }
  ];

  return (
    <div className="relative animate-slide-up space-y-8 sm:space-y-12 lg:space-y-14 min-h-[60vh] pb-16">
      {/* Header Banner */}
      <header className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 sm:gap-8 px-1">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-50 text-emerald-700 rounded-full text-[9px] font-black uppercase tracking-widest border border-emerald-200 mb-3">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            Verified Supply Chain Network
          </div>
          <h2 className="text-3xl sm:text-5xl lg:text-6xl font-black text-slate-900 tracking-tighter">Auto Parts Marketplace</h2>
          <p className="text-slate-500 font-bold text-xs sm:text-sm mt-1 sm:mt-2">
            Direct routing to verified auto spares vendors in Lagos (Ladipo), Abuja (Apo), & Port Harcourt.
          </p>
        </div>

        {/* Search Bar */}
        <div className="relative group w-full lg:w-96">
          <input 
            type="text" 
            placeholder="Search parts, brands, vendors..."
            className="w-full bg-white border border-slate-200 rounded-2xl py-4 sm:py-5 pl-12 sm:pl-14 pr-10 text-sm font-bold focus:border-blue-600 focus:ring-4 focus:ring-blue-50 outline-none transition-all shadow-sm"
            value={filter}
            onChange={(e) => {
              setFilter(e.target.value);
              setMarketplaceFilter(e.target.value);
            }}
          />
          <Search size={18} className="absolute left-5 sm:left-6 top-1/2 -translate-y-1/2 text-slate-400" />
          {filter && (
            <button 
              onClick={() => { setFilter(''); setMarketplaceFilter(''); }}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 font-black text-xs px-2 py-1"
            >
              ✕
            </button>
          )}
        </div>
      </header>

      {/* Active Vehicle & AI Task Filter Callout */}
      {activeVehicle && (
        <div className="bg-slate-900 text-white p-5 sm:p-6 rounded-3xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xl">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-blue-600/30 border border-blue-500/40 flex items-center justify-center text-blue-400 shrink-0">
              <Sparkles size={22} />
            </div>
            <div>
              <div className="text-[8px] font-black uppercase tracking-[0.25em] text-blue-400">Current Digital Twin Match</div>
              <div className="text-base sm:text-lg font-black text-white tracking-tight">
                {activeVehicle.year} {activeVehicle.make} {activeVehicle.model}
              </div>
              <div className="text-[10px] text-slate-400 font-mono">Telemetry: {activeVehicle.mileage.toLocaleString()} KM</div>
            </div>
          </div>

          {marketplaceFilter ? (
            <div className="flex items-center gap-3 w-full sm:w-auto bg-white/10 px-4 py-2.5 rounded-2xl border border-white/10 justify-between sm:justify-start">
              <span className="text-[10px] font-bold text-blue-300">
                Filtered: <strong className="text-white">{marketplaceFilter}</strong>
              </span>
              <button 
                onClick={() => { setFilter(''); setMarketplaceFilter(''); }}
                className="text-[9px] font-black uppercase tracking-wider bg-rose-500/20 hover:bg-rose-500/40 text-rose-300 px-2 py-1 rounded-lg transition-colors"
              >
                Clear Filter
              </button>
            </div>
          ) : (
            <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
              Compatibility tags dynamically verified
            </div>
          )}
        </div>
      )}

      {/* Category Pills */}
      <div className="flex gap-2 sm:gap-3 overflow-x-auto pb-2 scrollbar-hide -mx-2 px-2">
        {categories.map(cat => (
          <button 
            key={cat.id}
            onClick={() => setActiveCategory(cat.id)}
            className={`flex-shrink-0 px-5 sm:px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-wider border transition-all ${
              activeCategory === cat.id 
                ? 'bg-slate-900 border-slate-900 text-white shadow-lg' 
                : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300 hover:text-slate-800'
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Parts Listing Grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {[1, 2, 3, 4, 5, 6].map(n => (
            <div key={n} className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm animate-pulse space-y-4">
              <div className="h-4 bg-slate-100 rounded w-1/3"></div>
              <div className="h-6 bg-slate-100 rounded w-3/4"></div>
              <div className="h-4 bg-slate-100 rounded w-1/2"></div>
              <div className="h-10 bg-slate-100 rounded mt-6"></div>
            </div>
          ))}
        </div>
      ) : sortedItems.length === 0 ? (
        <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center max-w-lg mx-auto space-y-4">
          <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center text-2xl mx-auto text-slate-400">
            🔍
          </div>
          <h3 className="text-xl font-black text-slate-900">No components match "{filter}"</h3>
          <p className="text-xs text-slate-500">
            Try adjusting your search terms or select "All Components" to browse our supplier inventory.
          </p>
          <button 
            onClick={() => { setFilter(''); setMarketplaceFilter(''); setActiveCategory('all'); }}
            className="px-6 py-3 bg-slate-900 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-blue-600 transition-colors"
          >
            Reset Filters
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 sm:gap-8">
          {sortedItems.map((item) => {
            const isMatch = activeVehicle && item.compatibility.some(c => 
              item.name.toLowerCase().includes(activeVehicle.model.toLowerCase()) || 
              c.toLowerCase().includes(activeVehicle.make.toLowerCase()) ||
              c.toLowerCase().includes(activeVehicle.model.toLowerCase())
            );

            const isSuggested = suggestedPartNames.some(s => 
              item.name.toLowerCase().includes(s.toLowerCase()) || 
              s.toLowerCase().includes(item.name.toLowerCase())
            );

            const waLink = generateWhatsAppLink(item, vehicleString);

            return (
              <div 
                key={item.id} 
                className={`bg-white rounded-3xl p-6 sm:p-7 border transition-all duration-300 hover:shadow-xl hover:border-blue-200 flex flex-col justify-between group relative ${
                  isSuggested ? 'ring-2 ring-blue-500/40 border-blue-200' : 'border-slate-100 shadow-sm'
                }`}
              >
                {/* Card Top Badges */}
                <div className="space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="bg-slate-100 text-slate-600 text-[8px] font-black px-3 py-1 rounded-lg uppercase tracking-wider">
                      {item.category}
                    </span>
                    
                    <div className="flex items-center gap-1.5">
                      {isSuggested && (
                        <span className="bg-blue-600 text-white text-[8px] font-black px-2.5 py-1 rounded-lg uppercase tracking-widest flex items-center gap-1 shadow-sm">
                          <Sparkles size={10} />
                          AI Diagnosed
                        </span>
                      )}
                      {isMatch && !isSuggested && (
                        <span className="bg-emerald-600 text-white text-[8px] font-black px-2.5 py-1 rounded-lg uppercase tracking-widest">
                          Vehicle Fit
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Component Title */}
                  <div>
                    <h3 className="text-lg font-black text-slate-900 group-hover:text-blue-600 transition-colors leading-snug">
                      {item.name}
                    </h3>
                    
                    <div className="flex items-center gap-1.5 mt-2 text-slate-500 text-[10px] font-bold">
                      <ShieldCheck size={14} className={item.isVerified ? 'text-emerald-500' : 'text-slate-400'} />
                      <span className="text-slate-700 font-extrabold">{item.vendorName}</span>
                    </div>

                    {item.location && (
                      <div className="flex items-center gap-1.5 mt-1 text-slate-400 text-[9px] font-bold">
                        <MapPin size={12} className="text-slate-400 shrink-0" />
                        <span>{item.location}</span>
                      </div>
                    )}
                  </div>

                  {/* Compatibility Snippet */}
                  <div className="pt-2">
                    <div className="text-[7px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Compatible Fleets:</div>
                    <div className="flex flex-wrap gap-1">
                      {item.compatibility.slice(0, 3).map((comp, i) => (
                        <span key={i} className="text-[8px] bg-slate-50 text-slate-500 border border-slate-100 px-2 py-0.5 rounded font-mono">
                          {comp}
                        </span>
                      ))}
                      {item.compatibility.length > 3 && (
                        <span className="text-[8px] text-slate-400 font-mono px-1">
                          +{item.compatibility.length - 3} more
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Card Bottom: Price & WhatsApp Action */}
                <div className="mt-6 pt-5 border-t border-slate-100 flex items-center justify-between gap-4">
                  <div>
                    <div className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Price</div>
                    <div className="text-xl font-black text-slate-900 font-mono">
                      ₦{item.price.toLocaleString()}
                    </div>
                  </div>

                  <a
                    href={waLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="bg-[#25D366] hover:bg-[#1EBE5D] text-white px-4 py-3 rounded-2xl flex items-center gap-2 font-black text-[10px] uppercase tracking-wider shadow-md hover:shadow-lg transition-all active:scale-95 group/btn"
                    title={`Contact ${item.vendorName} via WhatsApp`}
                  >
                    <span className="font-bold">WhatsApp</span>
                    <ExternalLink size={12} className="opacity-80 group-hover/btn:translate-x-0.5 transition-transform" />
                  </a>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default Marketplace;
