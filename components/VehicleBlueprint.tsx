
import React from 'react';
import { BodyType } from '../shared/types.ts';

interface BlueprintProps {
  type: BodyType;
  className?: string;
}

/**
 * VehicleBlueprint
 * Renders high-fidelity technical line art for different vehicle classes.
 * Mobile-First: Scales based on container width.
 */
export const VehicleBlueprint: React.FC<BlueprintProps> = ({ type, className = "" }) => {
  const getPath = () => {
    switch (type) {
      case 'suv':
        return (
          <g fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 70h160l-10-25H50l-15 15H20v10z" />
            <circle cx="50" cy="75" r="10" />
            <circle cx="150" cy="75" r="10" />
            <path d="M50 45h80v15H40l10-15z" opacity="0.4" />
          </g>
        );
      case 'truck':
        return (
          <g fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M10 70h60V40h40l10 10h70v20h10" />
            <circle cx="45" cy="75" r="10" />
            <circle cx="155" cy="75" r="10" />
            <rect x="120" y="50" width="60" height="20" opacity="0.4" />
          </g>
        );
      case 'sedan':
      default:
        return (
          <g fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 70h170l-25-30H50L15 70z" />
            <circle cx="50" cy="75" r="10" />
            <circle cx="150" cy="75" r="10" />
            <path d="M55 45h90v15H45l10-15z" opacity="0.4" />
          </g>
        );
    }
  };

  return (
    <div className={`aspect-[16/9] w-full flex items-center justify-center bg-slate-50 rounded-3xl border border-slate-100 p-6 md:p-10 ${className}`}>
      <svg viewBox="0 0 200 100" className="w-full h-full text-slate-300 transition-colors duration-500 hover:text-blue-400">
        {getPath()}
        <text x="100" y="95" textAnchor="middle" className="text-[8px] fill-slate-400 font-black uppercase tracking-[0.3em]">
          {type} Technical Blueprint v1.0
        </text>
      </svg>
    </div>
  );
};
