
import React, { useState, useEffect } from 'react';
import { useAutoPalStore } from '../shared/store.ts';
import { fetchMarketplaceProducts, generateWhatsAppLink } from '../services/marketplaceService.ts';
import { MarketplaceProduct } from '../shared/types.ts';

const Marketplace: React.FC = () => {
  const { marketplace, setMarketplace, suggestedPartNames, vehicles } = useAutoPalStore();
  const [filter, setFilter] = useState('');
  const [loading, setLoading] = useState(false);
  const [activeCategory, setActiveCategory] = useState<string>('all');

  const activeVehicle = vehicles[0]; // Primary vehicle context

  useEffect(() => {
    const loadMarketplace = async () => {
      setLoading(true);
      try {
        const products = await fetchMarketplaceProducts();
        setMarketplace(products);
      } catch (e) {
        console.error("Marketplace Load Failed", e);
      } finally {
        setLoading(false);
      }
    };
    loadMarketplace();
  }, [setMarketplace]);

  const filteredItems = marketplace.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(filter.toLowerCase()) ||
                         item.category.toLowerCase().includes(filter.toLowerCase());
    const matchesCategory = activeCategory === 'all' || item.category === activeCategory;
    return matchesSearch && matchesCategory;
  });

  // Sort: AI recommendations first
  const sortedItems = [...filteredItems].sort((a, b) => {
    const aSuggested = suggestedPartNames.some(s => a.name.toLowerCase().includes(s.toLowerCase()));
    const bSuggested = suggestedPartNames.some(s => b.name.toLowerCase().includes(s.toLowerCase()));
    if (aSuggested && !bSuggested) return -1;
    if (!aSuggested && bSuggested) return 1;
    return 0;
  });

  const categories = ['all', 'engine', 'brakes', 'fluids', 'suspension', 'tires'];

  return (
    <div className="animate-slide-in space-y-10">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h2 className="text-4xl md:text-5xl font-black text-slate-900 tracking-tight">Marketplace</h2>
          <p className="text-slate-500 font-semibold mt-1">Verified spares from local Nigerian hubs</p>
        </div>
        
        <div className="relative group w-full md:w-96">
          <input 
            type="text" 
            placeholder="Search for parts..."
            className="w-full bg-white border-2 border-slate-100 rounded-2xl py-5 pl-14 pr-6 text-sm font-bold focus:border-blue-600 outline-none transition-all shadow-sm group-hover:shadow-md"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          />
          <span className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-blue-600 transition-colors">🔍</span>
        </div>
      </header>

      {/* Suggested Context Banner */}
      {suggestedPartNames.length > 0 && (
        <div className="bg-blue-600 rounded-[2.5rem] p-8 md:p-12 text-white relative overflow-hidden shadow-2xl shadow-blue-500/20">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl"></div>
          <div className="relative z-10 flex flex-col md:flex-row items-center gap-8">
            <div className="w-16 h-16 bg-white/10 backdrop-blur rounded-2xl flex items-center justify-center text-2xl">✧</div>
            <div className="flex-1 text-center md:text-left">
              <h3 className="text-2xl font-black tracking-tight mb-2">Predictive Sourcing Active</h3>
              <p className="text-blue-100 font-medium leading-relaxed">
                Based on your recent diagnostics, we've prioritized <span className="text-white font-black underline underline-offset-4 decoration-2">{suggestedPartNames.join(', ')}</span> that fit your {activeVehicle?.year} {activeVehicle?.model}.
              </p>
            </div>
            <button 
              onClick={() => {
                setFilter(suggestedPartNames[0]);
                setActiveCategory('all');
              }}
              className="bg-white text-blue-600 px-8 py-4 rounded-xl font-black uppercase tracking-widest text-[10px] shadow-xl hover:scale-105 transition-transform"
            >
              Filter Suggested
            </button>
          </div>
        </div>
      )}

      {/* Category Pills */}
      <div className="flex gap-3 overflow-x-auto pb-4 scrollbar-hide -mx-4 px-4">
        {categories.map(cat => (
          <button 
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={`flex-shrink-0 px-6 py-3 rounded-full text-xs font-black uppercase tracking-widest border-2 transition-all ${activeCategory === cat ? 'bg-slate-900 border-slate-900 text-white shadow-lg' : 'bg-white border-slate-100 text-slate-400 hover:border-slate-200'}`}
          >
            {cat}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {[1,2,3].map(i => <div key={i} className="h-96 bg-slate-100 rounded-[2.5rem] animate-pulse"></div>)}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {sortedItems.length > 0 ? sortedItems.map(item => {
            const isSuggested = suggestedPartNames.some(s => item.name.toLowerCase().includes(s.toLowerCase()));
            const isMatch = activeVehicle && item.compatibility.some(c => 
              item.name.toLowerCase().includes(activeVehicle.model.toLowerCase()) || 
              c.toLowerCase().includes(activeVehicle.make.toLowerCase())
            );

            return (
              <div key={item.id} className={`bg-white rounded-[2.5rem] p-8 border-2 transition-all hover:shadow-2xl hover:translate-y-[-8px] flex flex-col group ${isSuggested ? 'border-blue-600/30' : 'border-slate-50'}`}>
                <div className="flex justify-between items-start mb-6">
                  <div className="flex gap-2">
                    <span className="bg-slate-100 text-slate-500 text-[9px] font-black px-3 py-1.5 rounded-lg uppercase tracking-widest">
                      {item.category}
                    </span>
                    {isMatch && (
                       <span className="bg-blue-600 text-white text-[9px] font-black px-3 py-1.5 rounded-lg uppercase tracking-widest shadow-lg shadow-blue-500/20">
                        ✧ AI Match
                       </span>
                    )}
                  </div>
                  {item.isVerified && <div className="w-5 h-5 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center text-[10px]">✓</div>}
                </div>
                
                <h3 className="text-2xl font-black text-slate-900 leading-tight mb-2 group-hover:text-blue-600 transition-colors">{item.name}</h3>
                <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mb-6">Dealer: {item.vendorName}</p>
                
                <div className="space-y-4 mb-8">
                  <div className="flex flex-wrap gap-2">
                    {item.compatibility.map(car => (
                      <span key={car} className="text-[10px] font-bold text-slate-400 bg-slate-50 px-3 py-1 rounded-md">
                        {car}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="mt-auto pt-8 border-t border-slate-50 flex items-center justify-between">
                  <div className="flex flex-col">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Price (NGN)</span>
                    <span className="text-3xl font-black text-slate-900 tracking-tighter">₦{item.price.toLocaleString()}</span>
                  </div>
                  <button 
                    onClick={() => {
                      const vInfo = activeVehicle ? `${activeVehicle.year} ${activeVehicle.make} ${activeVehicle.model}` : 'Unknown';
                      window.open(generateWhatsAppLink(item, vInfo), '_blank');
                    }}
                    className="bg-slate-900 text-white w-14 h-14 rounded-2xl flex items-center justify-center hover:bg-emerald-600 transition-all shadow-xl active:scale-90"
                    title="Order via WhatsApp"
                  >
                    <svg viewBox="0 0 24 24" className="w-6 h-6 fill-current">
                       <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
                    </svg>
                  </button>
                </div>
              </div>
            );
          }) : (
            <div className="col-span-full py-40 text-center bg-white rounded-[4rem] border-2 border-dashed border-slate-100 shadow-sm">
              <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6 text-slate-300">📦</div>
              <h3 className="text-2xl font-black text-slate-900 mb-2">No Parts Found</h3>
              <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">Try adjusting your search filters or car model</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default Marketplace;
