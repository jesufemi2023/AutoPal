
import React, { useMemo } from 'react';
import { UnifiedAIDossier, Vehicle, MaintenanceTask, ServiceLog, FuelLog } from '../../shared/types.ts';
import { calculateIntelligentHealth } from '../../services/maintenanceLogic.ts';

interface Props {
  vehicle: Vehicle;
  tasks: MaintenanceTask[];
  logs: ServiceLog[];
  fuelLogs: FuelLog[];
  dossier?: UnifiedAIDossier | null;
}

export const VitalityDashboard: React.FC<Props> = ({ vehicle, tasks, logs, fuelLogs, dossier }) => {
  const healthData = useMemo(() => calculateIntelligentHealth(vehicle, tasks, fuelLogs, logs), [vehicle, tasks, fuelLogs, logs]);

  const vitalityScore = dossier ? dossier.health.vitalityScore : healthData.total;
  const disciplineScore = dossier ? dossier.health.disciplineScore : healthData.breakdown.provenance;
  const metabolicState = dossier ? dossier.insights.metabolicState : `Metabolic Score: ${healthData.breakdown.metabolic}%`;
  const trustPremium = dossier ? dossier.insights.trustPremium : `Trust Score: ${healthData.breakdown.provenance}%`;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 w-full">
      <div className="bg-slate-900 p-8 rounded-[2rem] text-white space-y-6">
        <div className="flex justify-between items-center">
          <h4 className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Vitality Score</h4>
          <span className="text-2xl font-black text-emerald-400">{vitalityScore}%</span>
        </div>
        <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
          <div className="h-full bg-emerald-500" style={{ width: `${vitalityScore}%` }}></div>
        </div>
        <p className="text-[10px] text-slate-400 leading-relaxed font-medium">"{metabolicState}"</p>
      </div>

      <div className="bg-white p-8 rounded-[2rem] border border-slate-100 space-y-6">
        <div className="flex justify-between items-center">
          <h4 className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Discipline Score</h4>
          <span className="text-2xl font-black text-blue-600">{disciplineScore}%</span>
        </div>
        <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
          <div className="h-full bg-blue-600" style={{ width: `${disciplineScore}%` }}></div>
        </div>
        <p className="text-[10px] text-slate-500 leading-relaxed font-medium">{trustPremium}</p>
      </div>
    </div>
  );
};
