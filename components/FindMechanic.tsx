import React, { useState } from 'react';
import { User, MapPin, Star, ShieldCheck, Search, Phone, ExternalLink, Wrench, Clock } from 'lucide-react';
import { useAutoPalStore } from '../shared/store.ts';

interface Mechanic {
  id: string;
  name: string;
  city: 'Lagos' | 'Abuja' | 'Port Harcourt' | 'Ibadan';
  address: string;
  phone: string;
  whatsapp: string;
  rating: number;
  reviewCount: number;
  verified: boolean;
  specialties: string[];
  hours: string;
}

const MECHANICS_DIRECTORY: Mechanic[] = [
  {
    id: 'm1',
    name: 'Lagos Auto Masters & Diagnostic Lab',
    city: 'Lagos',
    address: 'Plot 14, Commercial Avenue, Ikeja, Lagos',
    phone: '+234 803 123 4567',
    whatsapp: '2348031234567',
    rating: 4.9,
    reviewCount: 142,
    verified: true,
    specialties: ['Toyota & Lexus', 'OBD-II Scanning', 'Engine Overhaul', 'Hybrid Vitals'],
    hours: 'Mon - Sat: 8:00 AM - 6:00 PM'
  },
  {
    id: 'm2',
    name: 'Precision German Works Lekki',
    city: 'Lagos',
    address: 'Admiralty Way, Lekki Phase 1, Lagos',
    phone: '+234 814 987 6543',
    whatsapp: '2348149876543',
    rating: 4.8,
    reviewCount: 98,
    verified: true,
    specialties: ['Mercedes-Benz', 'BMW', 'Audi', 'Air Suspension', 'ECU Coding'],
    hours: 'Mon - Sat: 8:30 AM - 6:30 PM'
  },
  {
    id: 'm3',
    name: 'Capital Spanners & Transmission Hub',
    city: 'Abuja',
    address: 'Apo Mechanic Village, Zone B, Abuja',
    phone: '+234 809 333 4444',
    whatsapp: '2348093334444',
    rating: 4.9,
    reviewCount: 175,
    verified: true,
    specialties: ['Gearbox & Transmission', 'Brake Systems', 'Japanese Fleets', 'Suspension'],
    hours: 'Mon - Sat: 8:00 AM - 6:00 PM'
  },
  {
    id: 'm4',
    name: 'Central Auto Precision Garki',
    city: 'Abuja',
    address: 'Area 10, Garki, Abuja FCT',
    phone: '+234 802 555 7788',
    whatsapp: '2348025557788',
    rating: 4.7,
    reviewCount: 84,
    verified: true,
    specialties: ['Electrical Diagnostics', 'AC & Climate Control', 'Fuel Injection Systems'],
    hours: 'Mon - Sat: 9:00 AM - 5:30 PM'
  },
  {
    id: 'm5',
    name: 'Trans-Amadi Elite Mechanics',
    city: 'Port Harcourt',
    address: 'Trans-Amadi Industrial Layout, Port Harcourt',
    phone: '+234 805 111 2233',
    whatsapp: '2348051112233',
    rating: 4.8,
    reviewCount: 110,
    verified: true,
    specialties: ['Heavy Duty 4x4', 'Prado / Hilux', 'Diesel Engines', 'Suspension Lift'],
    hours: 'Mon - Sat: 8:00 AM - 5:30 PM'
  },
  {
    id: 'm6',
    name: 'Oluyole Autocare Center',
    city: 'Ibadan',
    address: 'Ring Road, Near Challenge Junction, Ibadan',
    phone: '+234 807 444 8899',
    whatsapp: '2348074448899',
    rating: 4.6,
    reviewCount: 67,
    verified: true,
    specialties: ['Routine Servicing', 'Braking & Clutch', 'Radiator & Cooling Systems'],
    hours: 'Mon - Sat: 8:30 AM - 6:00 PM'
  }
];

const FindMechanic: React.FC = () => {
  const { vehicles } = useAutoPalStore();
  const [search, setSearch] = useState('');
  const [selectedCity, setSelectedCity] = useState<string>('All');

  const activeVehicle = vehicles[0];
  const vehicleText = activeVehicle 
    ? `${activeVehicle.year} ${activeVehicle.make} ${activeVehicle.model} (${activeVehicle.mileage.toLocaleString()}km)`
    : 'Automotive Asset';

  const filtered = MECHANICS_DIRECTORY.filter(mech => {
    const term = search.toLowerCase().trim();
    const matchesSearch = !term || 
      mech.name.toLowerCase().includes(term) ||
      mech.address.toLowerCase().includes(term) ||
      mech.specialties.some(s => s.toLowerCase().includes(term));
    const matchesCity = selectedCity === 'All' || mech.city === selectedCity;
    return matchesSearch && matchesCity;
  });

  const cities = ['All', 'Lagos', 'Abuja', 'Port Harcourt', 'Ibadan'];

  return (
    <div className="relative animate-slide-up space-y-8 sm:space-y-12 lg:space-y-14 min-h-[60vh] pb-16">
      {/* Header Banner */}
      <header className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 sm:gap-8 px-1">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-[9px] font-black uppercase tracking-widest border border-blue-200 mb-3">
            <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></span>
            Vetted AutoPal Workshop Network
          </div>
          <h2 className="text-3xl sm:text-5xl lg:text-6xl font-black text-slate-900 tracking-tighter">Find Verified Mechanic</h2>
          <p className="text-slate-500 font-bold text-xs sm:text-sm mt-1 sm:mt-2">
            Connect directly with verified Nigerian automotive diagnostic technicians and workshops.
          </p>
        </div>

        {/* Search */}
        <div className="relative group w-full lg:w-96">
          <input 
            type="text" 
            placeholder="Search city, workshop, specialty..."
            className="w-full bg-white border border-slate-200 rounded-2xl py-4 sm:py-5 pl-12 sm:pl-14 pr-10 text-sm font-bold focus:border-blue-600 focus:ring-4 focus:ring-blue-50 outline-none transition-all shadow-sm"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <Search size={18} className="absolute left-5 sm:left-6 top-1/2 -translate-y-1/2 text-slate-400" />
          {search && (
            <button 
              onClick={() => setSearch('')}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 font-black text-xs px-2 py-1"
            >
              ✕
            </button>
          )}
        </div>
      </header>

      {/* City Filters */}
      <div className="flex gap-2 sm:gap-3 overflow-x-auto pb-2 scrollbar-hide -mx-2 px-2">
        {cities.map(city => (
          <button 
            key={city}
            onClick={() => setSelectedCity(city)}
            className={`flex-shrink-0 px-5 sm:px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-wider border transition-all ${
              selectedCity === city 
                ? 'bg-slate-900 border-slate-900 text-white shadow-lg' 
                : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300 hover:text-slate-800'
            }`}
          >
            {city}
          </button>
        ))}
      </div>

      {/* Mechanics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
        {filtered.map((mech) => {
          const waMessage = `Hello ${mech.name}, I am contacting you through AutoPal NG regarding my vehicle: ${vehicleText}.\nI would like to schedule a diagnostic inspection or service. Are you available?`;
          const waUrl = `https://wa.me/${mech.whatsapp}?text=${encodeURIComponent(waMessage)}`;

          return (
            <div 
              key={mech.id} 
              className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-100 hover:border-blue-200 shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col justify-between space-y-6 group"
            >
              <div className="space-y-4">
                {/* Header */}
                <div className="flex justify-between items-start gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 shrink-0">
                    <Wrench size={22} />
                  </div>
                  
                  <div className="flex items-center gap-1 bg-amber-50 border border-amber-200/60 px-3 py-1 rounded-full text-amber-700 text-xs font-black">
                    <Star size={13} className="fill-amber-400 text-amber-400" />
                    <span>{mech.rating}</span>
                    <span className="text-[9px] text-amber-600/70">({mech.reviewCount})</span>
                  </div>
                </div>

                {/* Name & Verification */}
                <div>
                  <div className="flex items-center gap-1.5 mb-1">
                    <h3 className="text-xl font-black text-slate-900 leading-snug group-hover:text-blue-600 transition-colors">
                      {mech.name}
                    </h3>
                  </div>

                  <div className="flex items-center gap-1.5 text-emerald-600 text-[10px] font-extrabold uppercase tracking-wider mb-2">
                    <ShieldCheck size={14} className="text-emerald-500" />
                    <span>AutoPal Certified Workshop</span>
                  </div>

                  <p className="text-slate-500 text-xs flex items-start gap-1.5 mt-2">
                    <MapPin size={14} className="text-slate-400 shrink-0 mt-0.5" />
                    <span>{mech.address}</span>
                  </p>
                </div>

                {/* Hours */}
                <div className="flex items-center gap-1.5 text-slate-400 text-[10px] font-mono">
                  <Clock size={12} className="text-slate-400 shrink-0" />
                  <span>{mech.hours}</span>
                </div>

                {/* Specialties */}
                <div>
                  <div className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-2">Specializations:</div>
                  <div className="flex flex-wrap gap-1.5">
                    {mech.specialties.map((spec, i) => (
                      <span key={i} className="text-[9px] bg-slate-50 border border-slate-200/60 text-slate-600 px-2.5 py-1 rounded-lg font-bold">
                        {spec}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Actions: WhatsApp & Call */}
              <div className="pt-4 border-t border-slate-100 flex items-center gap-3">
                <a
                  href={waUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 bg-[#25D366] hover:bg-[#1EBE5D] text-white py-3.5 px-4 rounded-2xl flex items-center justify-center gap-2 font-black text-[10px] uppercase tracking-wider shadow-md hover:shadow-lg transition-all active:scale-95"
                >
                  <span>Chat on WhatsApp</span>
                  <ExternalLink size={12} />
                </a>

                <a
                  href={`tel:${mech.phone.replace(/\s+/g, '')}`}
                  className="w-11 h-11 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center transition-colors active:scale-90 shrink-0"
                  title={`Call ${mech.phone}`}
                >
                  <Phone size={16} />
                </a>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default FindMechanic;
