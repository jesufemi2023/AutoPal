
import React, { useState, useEffect } from 'react';

interface OdometerInputProps {
  value: number;
  onSave: (val: number) => void;
  onCancel: () => void;
}

export const OdometerInput: React.FC<OdometerInputProps> = ({ value, onSave, onCancel }) => {
  const [localVal, setLocalVal] = useState(value.toString());

  const handleUpdate = () => {
    const num = parseInt(localVal);
    if (!isNaN(num) && num >= value) {
      onSave(num);
    }
  };

  return (
    <div className="bg-slate-900 p-8 rounded-[2.5rem] border border-slate-800 shadow-2xl animate-slide-in">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-white text-[10px] font-black uppercase tracking-widest opacity-60">Update Odometer</h3>
        <button onClick={onCancel} className="text-slate-500 text-xl font-black">×</button>
      </div>
      
      <div className="relative group mb-6">
        <div className="absolute inset-y-0 left-6 flex items-center pointer-events-none">
          <span className="text-slate-600 font-mono font-black text-xl">KM</span>
        </div>
        <input 
          type="number"
          autoFocus
          value={localVal}
          onChange={(e) => setLocalVal(e.target.value)}
          className="w-full bg-slate-950 border-2 border-slate-800 rounded-2xl py-8 pl-20 pr-8 text-4xl font-mono font-black text-blue-500 focus:border-blue-600 outline-none transition-all tracking-tighter"
        />
        <div className="absolute inset-0 rounded-2xl pointer-events-none border border-white/5 bg-gradient-to-b from-white/5 to-transparent"></div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <button 
          onClick={onCancel}
          className="py-4 rounded-xl font-black text-[10px] uppercase tracking-widest text-slate-400 hover:text-white transition-colors"
        >
          Discard
        </button>
        <button 
          onClick={handleUpdate}
          className="bg-blue-600 py-4 rounded-xl font-black text-[10px] uppercase tracking-widest text-white shadow-lg shadow-blue-500/20 active:scale-95 transition-all"
        >
          Confirm Entry
        </button>
      </div>
    </div>
  );
};
