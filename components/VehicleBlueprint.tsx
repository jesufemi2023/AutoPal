
import React from 'react';
import { BodyType } from '../shared/types.ts';

interface BlueprintProps {
  type: BodyType;
  className?: string;
}

/**
 * VehicleBlueprint
 * Renders high-fidelity technical line art for different vehicle classes.
 * Cost: $0 (No API calls, purely local SVGs).
 */
export const VehicleBlueprint: React.FC<BlueprintProps> = ({ type, className = "" }) => {
  const renderPath = () => {
    switch (type) {
      case 'suv':
        return <path d="M10 80h180l10-20H60l-10 20zm20-20l15-30h100l15 30H30z" stroke="currentColor" strokeWidth="2" fill="none" />;
      case 'truck':
        return <path d="M10 80h150V40h-40l-20 20H10v20zm150-40h40v40h-40z" stroke="currentColor" strokeWidth="2" fill="none" />;
      case 'sedan':
      default:
        return <path d="M10 80h180l-20-30H40L10 80zm30 0c0 5 5 10 10 10s10-5 10-10H40zm110 0c0 5 5 10 10 10s10-5 10-10h-20z" stroke="currentColor" strokeWidth="2" fill="none" />;
    }
  };

  return (
    <div className={`aspect-[16/9] w-full flex items-center justify-center bg-slate-50 rounded-3xl border border-slate-100 p-8 ${className}`}>
      <svg viewBox="0 0 200 100" className="w-full h-full text-slate-200 drop-shadow-sm">
        {renderPath()}
        <text x="100" y="95" textAnchor="middle" className="text-[10px] fill-slate-300 font-black uppercase tracking-widest">{type} BLUEPRINT</text>
      </svg>
    </div>
  );
};
