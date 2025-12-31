
import React, { useState } from 'react';
import { useAutoPalStore } from '../shared/store.ts';

const Marketplace: React.FC = () => {
  const { marketplace } = useAutoPalStore();
  const [filter, setFilter] = useState('');

  const filteredItems = marketplace.filter(item => 
    item.name.toLowerCase().includes(filter.toLowerCase()) ||
    item.category.toLowerCase().includes(filter.toLowerCase())
  );

  return (
    <div className="animate-slide-in">
      <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold">Parts Marketplace</h2>
          <p className="text-gray-500">Curated spares from verified Nigerian vendors.</p>
        </div>
        <div className="relative">
          <input 
            type="text" 
            placeholder="Search parts (e.g. Brake pads)..."
            className="w-full md:w-80 pl-10 pr-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          />
          <span className="absolute left-3 top-2.5 text-gray-400">🔍</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredItems.length > 0 ? filteredItems.map(item => (
          <div key={item.id} className="bg-white rounded-2xl border border-gray-100 p-5 hover:shadow-md transition group">
            <div className="flex justify-between items-start mb-4">
              <span className="bg-blue-50 text-blue-700 text-xs font-bold px-2 py-1 rounded-md uppercase tracking-wide">
                {item.category}
              </span>
              {item.isVerified && (
                <span className="text-xs font-medium text-green-600 flex items-center gap-1">
                  <span className="bg-green-100 p-0.5 rounded-full text-[10px]">✓</span> Verified
                </span>
              )}
            </div>
            
            <h3 className="text-lg font-bold text-gray-900 group-hover:text-blue-600 transition mb-1">{item.name}</h3>
            <p className="text-sm text-gray-500 mb-4">Vendor: {item.vendorName}</p>
            
            <div className="flex flex-wrap gap-2 mb-6">
              {item.compatibility.map(car => (
                <span key={car} className="text-[10px] bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                  {car}
                </span>
              ))}
            </div>

            <div className="flex items-center justify-between mt-auto">
              <div className="text-xl font-bold text-gray-900">₦{item.price.toLocaleString()}</div>
              <button 
                className="bg-gray-900 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-blue-600 transition"
                onClick={() => alert(`Redirecting to ${item.vendorName} on WhatsApp...`)}
              >
                Buy Now
              </button>
            </div>
          </div>
        )) : (
          <div className="col-span-full py-20 text-center bg-white rounded-3xl border border-dashed border-slate-200">
            <p className="text-slate-400 font-medium">No parts found matching "{filter}"</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Marketplace;
