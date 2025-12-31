
import React, { useState } from 'react';
import { useAutoPalStore } from '../shared/store.ts';
import { getAdvancedDiagnostic, decodeVIN } from '../services/geminiService.ts';
import { AIResponse, Vehicle } from '../shared/types.ts';

const Dashboard: React.FC = () => {
  const { vehicles, tasks, user, setTier, addVehicle } = useAutoPalStore();
  const [activeVehicleId, setActiveVehicleId] = useState<string | null>(vehicles[0]?.id || null);
  const [aiAdvice, setAiAdvice] = useState<AIResponse | null>(null);
  const [isAskingAI, setIsAskingAI] = useState(false);
  const [symptom, setSymptom] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [newVin, setNewVin] = useState('');
  const [isDecoding, setIsDecoding] = useState(false);

  const activeVehicle = vehicles.find(v => v.id === activeVehicleId);

  const handleAskAI = async () => {
    if (!activeVehicle) return;
    setIsAskingAI(true);
    try {
      const advice = await getAdvancedDiagnostic(
        activeVehicle,
        symptom,
        user?.tier === 'premium'
      );
      setAiAdvice(advice);
    } catch (error) {
      console.error("AI Service Error:", error);
    } finally {
      setIsAskingAI(false);
    }
  };

  const handleAddVehicle = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsDecoding(true);
    try {
      const decoded = await decodeVIN(newVin);
      const vehicle: Vehicle = {
        id: Math.random().toString(36).substr(2, 9),
        make: decoded.make || 'Unknown',
        model: decoded.model || 'Model',
        year: decoded.year || 2024,
        vin: newVin,
        mileage: 0,
        healthScore: 100,
        nextServiceMileage: 5000
      };
      addVehicle(vehicle);
      setActiveVehicleId(vehicle.id);
      setShowAddModal(false);
      setNewVin('');
    } catch (err) {
      alert("Failed to decode VIN. Adding as generic vehicle.");
      const vehicle: Vehicle = {
        id: Math.random().toString(36).substr(2, 9),
        make: 'Unknown',
        model: 'Vehicle',
        year: 2024,
        vin: newVin,
        mileage: 0,
        healthScore: 100
      };
      addVehicle(vehicle);
      setShowAddModal(false);
    } finally {
      setIsDecoding(false);
    }
  };

  const handleUpgrade = () => {
    const handler = (window as any).PaystackPop.setup({
      key: process.env.PAYSTACK_PUBLIC_KEY || 'pk_test_placeholder',
      email: user?.email,
      amount: 500000, 
      currency: "NGN",
      callback: (response: any) => {
        setTier('premium');
        alert('Payment successful! You are now a Premium member.');
      },
    });
    handler.openIframe();
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-slide-in">
      <header className="mb-8 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Garage Control</h1>
          <p className="text-slate-500 font-medium">Intelligent monitoring for your Nigerian fleet.</p>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={() => setShowAddModal(true)}
            className="bg-white border border-slate-200 text-slate-900 px-6 py-2.5 rounded-xl font-bold hover:bg-slate-50 transition-all flex items-center gap-2"
          >
            <span>+</span> Add Vehicle
          </button>
          {user?.tier !== 'premium' && (
            <button 
              onClick={handleUpgrade}
              className="bg-orange-600 text-white px-6 py-2.5 rounded-xl font-bold hover:shadow-lg transition-all"
            >
              Upgrade to Premium
            </button>
          )}
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          {/* Vehicle Selector */}
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
            {vehicles.map(v => (
              <button 
                key={v.id}
                onClick={() => setActiveVehicleId(v.id)}
                className={`flex-shrink-0 px-6 py-3 rounded-2xl font-bold text-sm transition-all border ${activeVehicleId === v.id ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300'}`}
              >
                {v.make} {v.model}
              </button>
            ))}
          </div>

          {activeVehicle ? (
            <div className="bg-white rounded-3xl shadow-sm border border-slate-200 p-8 relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-600"></div>
              <div className="flex justify-between items-start mb-8">
                <div>
                  <h2 className="text-3xl font-black text-slate-900 leading-none mb-2">{activeVehicle.year} {activeVehicle.make} {activeVehicle.model}</h2>
                  <p className="text-slate-400 font-mono text-xs uppercase tracking-widest bg-slate-50 px-3 py-1 rounded-full inline-block border border-slate-100">VIN: {activeVehicle.vin}</p>
                </div>
                <div className="flex flex-col items-end">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Health Index</span>
                  <div className={`text-5xl font-black tracking-tighter ${activeVehicle.healthScore > 80 ? 'text-emerald-500' : activeVehicle.healthScore > 50 ? 'text-amber-500' : 'text-rose-500'}`}>
                    {activeVehicle.healthScore}%
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {[
                  { label: 'Current Odo', value: `${activeVehicle.mileage.toLocaleString()} km` },
                  { label: 'Next Service', value: `${activeVehicle.nextServiceMileage?.toLocaleString() || 'N/A'} km` },
                  { label: 'Fuel Avg', value: '12.4 km/L' },
                  { label: 'Status', value: activeVehicle.healthScore > 80 ? 'Optimal' : 'Needs Care', color: activeVehicle.healthScore > 80 ? 'text-emerald-600' : 'text-amber-600' }
                ].map((stat, i) => (
                  <div key={i} className="bg-slate-50/50 p-5 rounded-2xl border border-slate-100">
                    <div className="text-[10px] font-black text-slate-400 uppercase mb-1 tracking-widest">{stat.label}</div>
                    <div className={`text-lg font-black text-slate-900 ${stat.color || ''}`}>{stat.value}</div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-3xl p-16 text-center border-2 border-dashed border-slate-200">
              <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-400 text-2xl">🚗</div>
              <h3 className="text-xl font-bold text-slate-900">Your garage is empty</h3>
              <p className="text-slate-500 mb-6">Add your first vehicle to start monitoring its health.</p>
              <button onClick={() => setShowAddModal(true)} className="bg-blue-600 text-white px-8 py-3 rounded-xl font-bold shadow-lg shadow-blue-500/20 hover:bg-blue-700 transition">Add My Car</button>
            </div>
          )}

          <div className="bg-white rounded-3xl shadow-sm border border-slate-200 p-8">
            <div className="flex justify-between items-center mb-8">
              <h3 className="text-xl font-bold text-slate-900">Maintenance Radar</h3>
              <span className="bg-slate-900 text-white text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-widest">{tasks.filter(t => t.vehicleId === activeVehicleId).length} Tasks</span>
            </div>
            <div className="space-y-4">
              {tasks.filter(t => t.vehicleId === activeVehicleId).map(task => (
                <div key={task.id} className="group flex items-center justify-between p-5 border border-slate-50 rounded-2xl hover:bg-slate-50 hover:border-blue-100 transition-all cursor-default">
                  <div className="flex items-center gap-5">
                    <div className={`w-1.5 h-12 rounded-full ${task.priority === 'high' ? 'bg-rose-500' : task.priority === 'medium' ? 'bg-amber-500' : 'bg-blue-500'}`} />
                    <div>
                      <div className="font-bold text-slate-900 group-hover:text-blue-600 transition text-lg">{task.title}</div>
                      <div className="text-xs text-slate-500 font-bold uppercase tracking-widest">Due at {task.dueMileage?.toLocaleString()} km • {task.priority} priority</div>
                    </div>
                  </div>
                  <button className="bg-white border border-slate-200 text-[10px] font-black uppercase px-4 py-2 rounded-xl hover:bg-slate-900 hover:text-white transition shadow-sm">Log Service</button>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* AI Sidebar */}
        <div className="space-y-8">
          <div className="bg-[#0f172a] text-white rounded-[2rem] shadow-2xl p-8 border border-slate-800 relative overflow-hidden">
            <div className="absolute -right-10 -top-10 w-40 h-40 bg-blue-500/10 rounded-full blur-3xl animate-pulse"></div>
            <h3 className="text-2xl font-black mb-2 flex items-center gap-3">
              <span className="text-blue-400">✧</span> AI Tech Support
            </h3>
            <p className="text-slate-400 text-sm mb-8 leading-relaxed font-medium">Expert diagnostics tuned for Nigerian driving conditions.</p>
            
            <textarea
              className="w-full bg-slate-900/50 border border-slate-800 rounded-2xl p-5 text-sm placeholder-slate-600 focus:ring-2 focus:ring-blue-500 focus:outline-none mb-4 transition-all resize-none font-medium text-slate-200"
              rows={4}
              placeholder="Describe what's happening... (e.g. 'Blue smoke from exhaust on cold start')"
              value={symptom}
              onChange={(e) => setSymptom(e.target.value)}
            />
            
            <button
              onClick={handleAskAI}
              disabled={isAskingAI || !symptom || !activeVehicle}
              className={`w-full py-5 rounded-2xl font-black uppercase tracking-widest transition-all shadow-xl ${isAskingAI ? 'bg-slate-800 cursor-not-allowed text-slate-500' : 'bg-blue-600 text-white hover:bg-blue-500 hover:scale-[1.02] active:scale-[0.98]'}`}
            >
              {isAskingAI ? 'Analyzing Systems...' : 'Run Diagnostics'}
            </button>

            {aiAdvice && (
              <div className="mt-8 animate-slide-in bg-white/5 rounded-3xl p-6 border border-white/10 backdrop-blur-md">
                <div className="flex justify-between items-center mb-4">
                  <div className={`text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full ${aiAdvice.severity === 'critical' ? 'bg-rose-500/20 text-rose-400' : 'bg-emerald-500/20 text-emerald-400'}`}>
                    {aiAdvice.severity} Alert
                  </div>
                  <span className="text-[10px] font-bold text-slate-500">Just Now</span>
                </div>
                <p className="text-sm text-slate-200 font-bold mb-6 leading-relaxed">"{aiAdvice.advice}"</p>
                <div className="space-y-3 mb-6">
                  {aiAdvice.recommendations.map((rec, i) => (
                    <div key={i} className="flex gap-4 text-xs text-slate-400 font-medium">
                      <span className="text-blue-500 font-black">→</span> {rec}
                    </div>
                  ))}
                </div>
                {aiAdvice.marketInsight && (
                  <div className="pt-6 border-t border-white/10">
                    <div className="text-[10px] font-black text-blue-400 uppercase mb-2 tracking-widest">Nigeria Market Intel</div>
                    <p className="text-[11px] text-slate-500 leading-relaxed italic">{aiAdvice.marketInsight}</p>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="bg-white rounded-[2rem] shadow-sm border border-slate-200 p-8">
            <h3 className="text-xl font-bold text-slate-900 mb-6">Ownership Vault</h3>
            <div className="space-y-4">
              {[
                { label: 'Vehicle Registration', exp: 'Jan 2025', icon: '📄', color: 'blue' },
                { label: 'Insurance Policy', exp: 'N/A', icon: '🛡️', color: 'slate', empty: true }
              ].map((doc, i) => (
                <div key={i} className={`flex items-center gap-5 p-5 rounded-2xl border ${doc.empty ? 'bg-slate-50/50 border-dashed border-slate-200' : 'bg-slate-50 border-slate-100'}`}>
                  <div className={`w-12 h-12 flex items-center justify-center rounded-2xl text-xl ${doc.empty ? 'bg-slate-100 text-slate-400' : 'bg-blue-600 text-white font-bold shadow-lg shadow-blue-500/20'}`}>
                    {doc.empty ? '+' : doc.icon}
                  </div>
                  <div className="flex-1">
                    <div className={`text-sm font-black ${doc.empty ? 'text-slate-400' : 'text-slate-900'}`}>{doc.label}</div>
                    <div className="text-[10px] text-slate-400 font-black uppercase tracking-widest">{doc.empty ? 'Missing' : `Expires: ${doc.exp}`}</div>
                  </div>
                  {!doc.empty && <button className="text-[10px] font-black text-blue-600 hover:text-blue-800 uppercase tracking-widest">View</button>}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Add Vehicle Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl p-10 animate-slide-in relative">
            <button onClick={() => setShowAddModal(false)} className="absolute top-8 right-8 text-slate-400 hover:text-slate-900 font-black text-xl">×</button>
            <div className="mb-8">
              <h2 className="text-2xl font-black text-slate-900 mb-2">New Garage Entry</h2>
              <p className="text-slate-500 text-sm font-medium">Enter your VIN for automatic identification.</p>
            </div>
            <form onSubmit={handleAddVehicle} className="space-y-6">
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Vehicle Identification Number (VIN)</label>
                <input 
                  type="text" 
                  required
                  placeholder="17-Digit VIN Number"
                  className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-blue-500/10 outline-none transition-all font-mono text-lg uppercase"
                  value={newVin}
                  onChange={(e) => setNewVin(e.target.value.toUpperCase())}
                />
              </div>
              <button 
                disabled={isDecoding || newVin.length < 10}
                className="w-full bg-slate-900 text-white py-5 rounded-2xl font-black uppercase tracking-widest hover:bg-slate-800 transition shadow-xl disabled:opacity-50"
              >
                {isDecoding ? 'Decoding Identity...' : 'Register Vehicle'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
