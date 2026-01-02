
import React, { useState, useEffect } from 'react';
import { useAutoPalStore } from '../shared/store.ts';
import { fetchMarketplaceProducts, generateWhatsAppLink } from '../services/marketplaceService.ts';
import { MarketplaceProduct } from '../shared/types.ts';

const Marketplace: React.FC = () => {
  const { marketplace, setMarketplace, suggestedPartNames, vehicles } = useAutoPalStore();
  const [filter, setFilter] = useState('');
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

  const filteredItems = marketplace.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(filter.toLowerCase()) || item.category.toLowerCase().includes(filter.toLowerCase());
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
    <div className="animate-slide-up space-y-12">
      <header className="flex flex-col xl:flex-row xl:items-end justify-between gap-8">
        <div>
          <h2 className="text-4xl md:text-6xl font-black text-slate-900 tracking-tighter">Marketplace</h2>
          <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px] mt-4">Verified Supply Chain Network</p>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-4 w-full xl:w-auto">
          <div className="relative group flex-grow sm:w-80">
            <input 
              type="text" 
              placeholder="Search components..."
              className="w-full bg-white border border-slate-100 rounded-2xl py-5 pl-14 pr-6 text-sm font-bold focus:border-blue-600 outline-none transition-all shadow-sm hover:shadow-md"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
            />
            <span className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-300">🔍</span>
          </div>
        </div>
      </header>

      {suggestedPartNames.length > 0 && (
        <div className="bg-slate-900 card-radius p-8 md:p-14 text-white relative overflow-hidden shadow-3xl">
          <div className="absolute top-0 right-0 w-80 h-80 bg-blue-600/10 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/2"></div>
          <div className="relative z-10 flex flex-col md:flex-row items-center gap-10">
            <div className="w-16 h-16 bg-blue-600 rounded-[1.5rem] flex items-center justify-center text-2xl shadow-xl shadow-blue-500/20">✧</div>
            <div className="flex-1 text-center md:text-left">
              <h3 className="text-2xl md:text-3xl font-black tracking-tight mb-2">Predictive Procurement</h3>
              <p className="text-slate-400 text-sm md:text-base font-medium max-w-xl">
                AI has prioritized <span className="text-white font-black underline underline-offset-4 decoration-2">{suggestedPartNames.join(', ')}</span> matching your profile.
              </p>
            </div>
            <button 
              onClick={() => { setFilter(suggestedPartNames[0]); setActiveCategory('all'); }}
              className="bg-white text-slate-900 px-10 py-5 rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-xl hover:scale-105 transition-transform"
            >
              Apply Filter
            </button>
          </div>
        </div>
      )}

      {/* Category Pills */}
      <div className="flex gap-3 overflow-x-auto pb-6 scrollbar-hide -mx-4 px-4">
        {categories.map(cat => (
          <button 
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={`flex-shrink-0 px-8 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest border transition-all ${activeCategory === cat ? 'bg-slate-900 border-slate-900 text-white shadow-xl' : 'bg-white border-slate-100 text-slate-400 hover:border-slate-300'}`}
          >
            {cat}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {[1,2,3].map(i => <div key={i} className="h-96 bg-white card-radius animate-pulse"></div>)}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 md:gap-10">
          {sortedItems.length > 0 ? sortedItems.map((item, idx) => {
            const isSuggested = suggestedPartNames.some(s => item.name.toLowerCase().includes(s.toLowerCase()));
            const isMatch = activeVehicle && item.compatibility.some(c => item.name.toLowerCase().includes(activeVehicle.model.toLowerCase()) || c.toLowerCase().includes(activeVehicle.make.toLowerCase()));

            return (
              <div key={item.id} className={`bg-white card-radius p-8 md:p-10 border transition-all hover:shadow-2xl hover:translate-y-[-10px] flex flex-col group relative animate-slide-up`} style={{ animationDelay: `${idx * 0.05}s` }}>
                <div className="flex justify-between items-start mb-10">
                  <div className="flex flex-col gap-2">
                    <span className="bg-slate-50 text-slate-400 text-[8px] font-black px-4 py-1.5 rounded-lg uppercase tracking-widest border border-slate-100 self-start">
                      {item.category}
                    </span>
                    {isMatch && (
                       <span className="bg-blue-600 text-white text-[8px] font-black px-4 py-1.5 rounded-lg uppercase tracking-widest shadow-lg shadow-blue-500/20 self-start">
                        ✧ Engineering Match
                       </span>
                    )}
                  </div>
                  {item.isVerified && <div className="w-8 h-8 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center text-xs font-black shadow-inner">✓</div>}
                </div>
                
                <h3 className="text-3xl font-black text-slate-900 leading-tight mb-4 group-hover:text-blue-600 transition-colors">{item.name}</h3>
                <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mb-10 flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-200"></span>
                  {item.vendorName}
                </p>
                
                <div className="flex flex-wrap gap-2 mb-10">
                  {item.compatibility.slice(0, 3).map(car => (
                    <span key={car} className="text-[9px] font-bold text-slate-500 bg-slate-50 px-4 py-2 rounded-xl border border-slate-100">
                      {car}
                    </span>
                  ))}
                  {item.compatibility.length > 3 && <span className="text-[9px] font-bold text-slate-300 px-2 py-2">+{item.compatibility.length - 3}</span>}
                </div>

                <div className="mt-auto pt-10 border-t border-slate-50 flex items-center justify-between">
                  <div>
                    <div className="text-[8px] font-black text-slate-300 uppercase tracking-widest mb-1">Standard Price</div>
                    <div className="text-3xl font-black text-slate-900 tracking-tighter leading-none">₦{item.price.toLocaleString()}</div>
                  </div>
                  <button 
                    onClick={() => {
                      const vInfo = activeVehicle ? `${activeVehicle.year} ${activeVehicle.make} ${activeVehicle.model}` : 'Generic';
                      window.open(generateWhatsAppLink(item, vInfo), '_blank');
                    }}
                    className="bg-slate-900 text-white w-16 h-16 rounded-[1.5rem] flex items-center justify-center hover:bg-emerald-600 transition-all shadow-xl active:scale-90"
                  >
                    <svg viewBox="0 0 24 24" className="w-6 h-6 fill-current"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/></svg>
                  </button>
                </div>
              </div>
            );
          }) : (
            <div className="col-span-full py-40 text-center bg-white card-radius border-2 border-dashed border-slate-100">
              <div className="w-24 h-24 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-8 text-slate-200 text-3xl">📦</div>
              <h3 className="text-2xl font-black text-slate-900 mb-2 tracking-tight">Supply Chain Empty</h3>
              <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">No matches found for current filters</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default Marketplace;
