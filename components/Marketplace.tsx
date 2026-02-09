
import React, { useState, useEffect } from 'react';
import { useAutoPalStore } from '../shared/store.ts';
import { fetchMarketplaceProducts, generateWhatsAppLink } from '../services/marketplaceService.ts';
import { MarketplaceProduct } from '../shared/types.ts';

const Marketplace: React.FC = () => {
  const { marketplace, setMarketplace, suggestedPartNames, marketplaceFilter, setMarketplaceFilter, vehicles } = useAutoPalStore();
  const [filter, setFilter] = useState(marketplaceFilter);
  const [loading, setLoading] = useState(false);
  const [activeCategory, setActiveCategory] = useState<string>('all');

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

  // Sync internal filter with store filter
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
    <div className="relative animate-slide-up space-y-8 sm:space-y-12 lg:space-y-16 min-h-[60vh]">
      {/* Background content (Grayscale & Blurred) */}
      <div className="grayscale blur-sm pointer-events-none opacity-40 select-none space-y-12">
        <header className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 sm:gap-8 px-2">
          <div>
            <h2 className="text-4xl sm:text-6xl lg:text-7xl font-black text-slate-900 tracking-tighter">Find Part</h2>
            <p className="text-slate-400 font-bold uppercase tracking-widest text-[9px] sm:text-[10px] mt-2 sm:mt-4">Supply Chain v1.3</p>
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

        {marketplaceFilter && (
          <div className="flex justify-between items-center bg-blue-50 p-4 rounded-2xl border border-blue-100">
            <p className="text-[10px] font-black uppercase tracking-widest text-blue-600">
              Filtered for Task: <span className="text-blue-800">{marketplaceFilter}</span>
            </p>
            <button onClick={() => {setFilter(''); setMarketplaceFilter('');}} className="text-blue-600 text-[10px] font-black">CLEAR X</button>
          </div>
        )}

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
          {sortedItems.map((item, idx) => {
            const isMatch = activeVehicle && item.compatibility.some(c => item.name.toLowerCase().includes(activeVehicle.model.toLowerCase()) || c.toLowerCase().includes(activeVehicle.make.toLowerCase()));
            return (
              <div key={item.id} className="bg-white card-radius p-6 sm:p-8 border transition-all hover:shadow-2xl flex flex-col group relative">
                <div className="flex justify-between items-start mb-6">
                  <span className="bg-slate-50 text-slate-400 text-[7px] font-black px-3 py-1 rounded-lg uppercase tracking-widest border border-slate-100">{item.category}</span>
                  {isMatch && <span className="bg-blue-600 text-white text-[7px] font-black px-2.5 py-1 rounded-lg uppercase tracking-widest">Match</span>}
                </div>
                <h3 className="text-xl font-black text-slate-900 mb-3 group-hover:text-blue-600 transition-colors">{item.name}</h3>
                <p className="text-slate-400 text-[9px] font-black uppercase tracking-widest mb-6">{item.vendorName}</p>
                <div className="mt-auto pt-6 border-t border-slate-50 flex items-center justify-between">
                  <div>
                    <div className="text-[7px] font-black text-slate-300 uppercase tracking-widest mb-1">Price</div>
                    <div className="text-xl font-black text-slate-900 leading-none">₦{item.price.toLocaleString()}</div>
                  </div>
                  <button 
                    disabled
                    className="bg-slate-900 text-white w-10 h-10 rounded-xl flex items-center justify-center transition-all opacity-20"
                  >
                    🛒
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* COMING SOON OVERLAY */}
      <div className="absolute inset-0 z-50 flex items-center justify-center p-6">
        <div className="bg-slate-900 text-white rounded-[3rem] p-10 sm:p-16 shadow-4xl text-center space-y-8 border-4 border-blue-600/30 max-w-lg w-full animate-in zoom-in-95 duration-500">
           <div className="w-20 h-20 bg-blue-600 rounded-[2rem] flex items-center justify-center text-3xl mx-auto shadow-2xl shadow-blue-600/40 animate-pulse">🛒</div>
           <div className="space-y-4">
              <h3 className="text-3xl sm:text-4xl font-black uppercase tracking-tighter leading-none">Find Parts <br/><span className="text-blue-500">Coming Soon</span></h3>
              <p className="text-slate-400 text-xs sm:text-sm font-bold uppercase tracking-widest leading-relaxed">
                Our automated parts sourcing system is currently in closed testing with nationwide suppliers.
              </p>
           </div>
           <div className="pt-4">
             <div className="inline-flex items-center gap-2 px-5 py-2 bg-white/5 rounded-full border border-white/10 text-[9px] font-black uppercase tracking-widest text-slate-500">
                System Status: Calibrating
             </div>
           </div>
        </div>
      </div>
    </div>
  );
};

export default Marketplace;
