
import React, { useState, useEffect } from 'react';
import { useAutoPalStore } from '../shared/store.ts';
import { fetchMarketplaceProducts, generateWhatsAppLink } from '../services/marketplaceService.ts';
import { MarketplaceProduct } from '../shared/types.ts';

const Marketplace: React.FC = () => {
  const { user, marketplace, setMarketplace, suggestedPartNames, marketplaceFilter, setMarketplaceFilter, vehicles } = useAutoPalStore();
  const [filter, setFilter] = useState(marketplaceFilter);
  const [loading, setLoading] = useState(false);
  const [activeCategory, setActiveCategory] = useState<string>('all');

  const tier = user?.tier || 'free';
  const activeVehicle = vehicles[0];

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

  useEffect(() => {
    if (marketplaceFilter) {
      setFilter(marketplaceFilter);
    }
  }, [marketplaceFilter]);

  const filteredItems = marketplace.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(filter.toLowerCase()) || 
                          item.category.toLowerCase().includes(filter.toLowerCase());
    const matchesCategory = activeCategory === 'all' || item.category === activeCategory;
    return matchesSearch && matchesCategory;
  });

  const sortedItems = [...filteredItems].sort((a, b) => {
    const aSuggested = suggestedPartNames.some(s => a.name.toLowerCase().includes(s.toLowerCase()));
    const bSuggested = suggestedPartNames.some(s => b.name.toLowerCase().includes(s.toLowerCase()));
    if (aSuggested && !bSuggested) return -1;
    if (!aSuggested && bSuggested) return 1;
    return 0;
  });

  const categories = ['all', 'engine', 'brakes', 'fluids', 'suspension', 'tires'];

  return (
    <div className="animate-slide-up space-y-8 sm:space-y-12 lg:space-y-16">
      <header className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 sm:gap-8 px-2">
        <div>
          <h2 className="text-4xl sm:text-6xl lg:text-7xl font-black text-slate-900 tracking-tighter">Marketplace</h2>
          <p className="text-slate-400 font-bold uppercase tracking-widest text-[9px] sm:text-[10px] mt-2 sm:mt-4">Supply Chain Intelligence v1.4</p>
        </div>
        
        <div className="relative group w-full lg:w-96">
          <input 
            type="text" 
            placeholder="Search components..."
            className="w-full bg-white border border-slate-100 rounded-xl sm:rounded-2xl py-4 sm:py-5 pl-12 sm:pl-14 pr-6 text-sm font-bold focus:border-blue-600 outline-none transition-all shadow-sm"
            value={filter}
            onChange={(e) => {
              setFilter(e.target.value);
              setMarketplaceFilter(e.target.value);
            }}
          />
          <span className="absolute left-5 sm:left-6 top-1/2 -translate-y-1/2 text-slate-300 text-sm">🔍</span>
        </div>
      </header>

      {/* Category Pills */}
      <div className="flex gap-2 sm:gap-3 overflow-x-auto pb-4 scrollbar-hide -mx-4 px-4 sm:mx-0 sm:px-0">
        {categories.map(cat => (
          <button 
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={`flex-shrink-0 px-6 sm:px-8 py-3 sm:py-4 rounded-xl sm:rounded-2xl text-[9px] sm:text-[10px] font-black uppercase tracking-widest border transition-all ${activeCategory === cat ? 'bg-slate-900 border-slate-900 text-white shadow-xl' : 'bg-white border-slate-100 text-slate-400 hover:border-slate-300'}`}
          >
            {cat}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 sm:gap-8 md:gap-10">
        {sortedItems.map((item) => {
          const isMatch = activeVehicle && item.compatibility.some(c => item.name.toLowerCase().includes(activeVehicle.model.toLowerCase()) || c.toLowerCase().includes(activeVehicle.make.toLowerCase()));
          const isLocked = item.isPremium && tier === 'free';

          return (
            <div key={item.id} className="bg-white card-radius p-6 sm:p-8 border transition-all hover:shadow-2xl flex flex-col group relative">
              {isLocked && (
                <div className="absolute inset-0 z-20 bg-slate-950/5 backdrop-blur-[2px] rounded-[2.5rem] flex flex-col items-center justify-center p-6 text-center animate-in fade-in duration-300">
                   <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-xl shadow-xl mb-4 border border-slate-100">🔒</div>
                   <p className="text-[10px] font-black uppercase tracking-widest text-slate-900 mb-2">Performance Upgrade</p>
                   <p className="text-[8px] text-slate-500 font-bold uppercase tracking-widest leading-relaxed">Available for Standard & Premium Pilots</p>
                </div>
              )}
              
              <div className="flex justify-between items-start mb-6">
                <span className="bg-slate-50 text-slate-400 text-[7px] font-black px-3 py-1 rounded-lg uppercase tracking-widest border border-slate-100">
                  {item.isPremium && '✨ '} {item.category}
                </span>
                {isMatch && <span className="bg-blue-600 text-white text-[7px] font-black px-2.5 py-1 rounded-lg uppercase tracking-widest">Match</span>}
              </div>
              <h3 className={`text-xl font-black text-slate-900 mb-3 group-hover:text-blue-600 transition-colors ${isLocked ? 'opacity-40' : ''}`}>{item.name}</h3>
              <p className={`text-slate-400 text-[9px] font-black uppercase tracking-widest mb-6 ${isLocked ? 'opacity-40' : ''}`}>{item.vendorName}</p>
              
              <div className="mt-auto pt-6 border-t border-slate-50 flex items-center justify-between">
                <div className={isLocked ? 'opacity-40' : ''}>
                  <div className="text-[7px] font-black text-slate-300 uppercase tracking-widest mb-1">Price</div>
                  <div className="text-xl font-black text-slate-900 leading-none">₦{item.price.toLocaleString()}</div>
                </div>
                <button 
                  disabled={isLocked}
                  onClick={() => window.open(generateWhatsAppLink(item, activeVehicle ? `${activeVehicle.year} ${activeVehicle.make} ${activeVehicle.model}` : 'Generic'), '_blank')}
                  className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${isLocked ? 'bg-slate-100 text-slate-300' : 'bg-slate-900 text-white hover:bg-emerald-600'}`}
                >
                  {isLocked ? '🔒' : '🛒'}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default Marketplace;
