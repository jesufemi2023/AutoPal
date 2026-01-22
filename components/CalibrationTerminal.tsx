import React, { useState } from 'react';
import { supabase } from '../auth/supabaseClient.ts';
import { useAutoPalStore } from '../shared/store.ts';

export const CalibrationTerminal: React.FC = () => {
  const { user, vehicles, activeVehicleId } = useAutoPalStore();
  const [isOpen, setIsOpen] = useState(false);
  const [isTransmitting, setIsTransmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  
  const [rating, setRating] = useState(8);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [comment, setComment] = useState('');

  const activeVehicle = vehicles.find(v => v.id === activeVehicleId);

  const modules = ["AI Mechanic", "Fuel Tracking", "Design", "Speed", "Reports", "Other"];

  const toggleTag = (tag: string) => {
    setSelectedTags(prev => prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]);
  };

  const handleTransmit = async () => {
    if (!comment.trim() && selectedTags.length === 0) {
      alert("Please select a category or leave a quick note so we know how to help.");
      return;
    }

    setIsTransmitting(true);
    try {
      if (!supabase) throw new Error("Cloud link offline");
      
      const { error } = await supabase.from('system_calibration').insert([{
        user_id: user?.id,
        user_email: user?.email,
        rating: rating,
        tags: selectedTags,
        comment: comment,
        vehicle_context: activeVehicle ? `${activeVehicle.year} ${activeVehicle.make} ${activeVehicle.model}` : 'Garage Home'
      }]);

      if (error) throw error;
      
      setIsSuccess(true);
      setTimeout(() => {
        setIsOpen(false);
        setIsSuccess(false);
        setComment('');
        setSelectedTags([]);
        setRating(8);
      }, 2000);
    } catch (e) {
      alert("Failed to send. Please check your internet connection.");
    } finally {
      setIsTransmitting(false);
    }
  };

  const getEmoji = (val: number) => {
    if (val <= 3) return "😞";
    if (val <= 6) return "😐";
    if (val <= 8) return "😊";
    return "🤩";
  };

  if (!isOpen) {
    return (
      <button 
        onClick={() => setIsOpen(true)}
        className="fixed bottom-8 right-8 z-[200] px-6 py-4 bg-slate-900 border border-white/10 rounded-2xl flex items-center gap-3 text-white shadow-2xl hover:bg-blue-600 transition-all active:scale-95 group overflow-hidden"
        title="Send Feedback"
      >
        <span className="text-xl group-hover:scale-110 transition-transform">💬</span>
        <span className="text-[10px] font-black uppercase tracking-widest hidden sm:inline">User Feedback</span>
        <div className="absolute inset-0 bg-blue-500/10 rounded-2xl animate-pulse pointer-events-none"></div>
      </button>
    );
  }

  return (
    <div className="fixed inset-0 z-[1000] flex items-end justify-center sm:items-center p-4 sm:p-10 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-300">
      <div className="w-full max-w-lg bg-slate-900 border border-white/10 rounded-[2.5rem] shadow-3xl overflow-hidden animate-in slide-in-from-bottom-10 duration-500">
        {isSuccess ? (
          <div className="p-16 text-center space-y-6">
            <div className="w-20 h-20 bg-emerald-600 rounded-full flex items-center justify-center text-white text-3xl mx-auto shadow-2xl border-4 border-white/10">✓</div>
            <div className="space-y-2">
              <h3 className="text-white text-2xl font-black uppercase tracking-tighter leading-none">Thank You!</h3>
              <p className="text-slate-500 text-[9px] font-black uppercase tracking-[0.3em]">We appreciate your help in making AutoPal better.</p>
            </div>
          </div>
        ) : (
          <div className="p-8 sm:p-10 space-y-10">
            <header className="flex justify-between items-start">
              <div>
                <h3 className="text-white text-2xl font-black tracking-tighter uppercase leading-none">User <span className="text-blue-500">Feedback</span></h3>
                <p className="text-slate-500 text-[8px] font-black uppercase tracking-[0.3em] mt-2">Help us improve your experience</p>
              </div>
              <button onClick={() => setIsOpen(false)} className="text-slate-500 hover:text-white text-2xl px-2">×</button>
            </header>

            <div className="space-y-8">
              <div className="space-y-4">
                <div className="flex justify-between items-center px-1">
                   <label className="text-slate-400 text-[10px] font-black uppercase tracking-widest">How are we doing?</label>
                   <span className="text-2xl">{getEmoji(rating)}</span>
                </div>
                <input 
                  type="range" min="1" max="10" step="1" 
                  value={rating} onChange={(e) => setRating(parseInt(e.target.value))}
                  className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-500"
                />
                <div className="flex justify-between text-[7px] font-black text-slate-600 uppercase tracking-widest px-1">
                   <span>Needs Work</span>
                   <span>Excellent</span>
                </div>
              </div>

              <div className="space-y-4">
                <label className="text-slate-400 text-[10px] font-black uppercase tracking-widest ml-1">What are you giving feedback on?</label>
                <div className="flex flex-wrap gap-2">
                  {modules.map(mod => (
                    <button 
                      key={mod} 
                      onClick={() => toggleTag(mod)}
                      className={`px-4 py-2.5 rounded-xl text-[8px] font-black uppercase tracking-widest border transition-all ${selectedTags.includes(mod) ? 'bg-blue-600 border-blue-600 text-white shadow-lg' : 'bg-slate-800 border-slate-700 text-slate-500 hover:bg-slate-700'}`}
                    >
                      {mod}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                <label className="text-slate-400 text-[10px] font-black uppercase tracking-widest ml-1">Any suggestions or issues?</label>
                <textarea 
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="Tell us more about your experience..."
                  className="w-full bg-slate-950 border border-white/5 rounded-2xl p-6 text-[11px] font-medium text-slate-200 outline-none focus:border-blue-600 h-28 resize-none placeholder:text-slate-700 shadow-inner"
                />
              </div>
            </div>

            <button 
              onClick={handleTransmit}
              disabled={isTransmitting}
              className="w-full bg-white text-slate-900 py-6 rounded-2xl font-black uppercase tracking-[0.3em] text-[10px] shadow-3xl hover:bg-blue-600 hover:text-white transition-all active:scale-95 flex items-center justify-center gap-4"
            >
              {isTransmitting ? (
                <div className="w-5 h-5 border-4 border-slate-900/20 border-t-slate-900 rounded-full animate-spin"></div>
              ) : "Send Feedback"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};