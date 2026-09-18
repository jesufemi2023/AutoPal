import React, { useState, useEffect } from 'react';
import { signIn, signUp, signInWithGoogle, sendPasswordResetEmail, updatePassword, signOut } from '../auth/authService.ts';
import { useAutoPalStore } from '../shared/store.ts';
import { Car, ChevronLeft, Eye, EyeOff, ShieldCheck, CheckCircle2, Sparkles, Lock, ArrowRight } from 'lucide-react';

type AuthMode = 'login' | 'signup' | 'forgot' | 'reset';

const AuthScreen: React.FC = () => {
  const isRecovering = useAutoPalStore(s => s.isRecovering);
  const setRecovering = useAutoPalStore(s => s.setRecovering);
  const setCurrentView = useAutoPalStore(s => s.setCurrentView);
  
  const [mode, setMode] = useState<AuthMode>(isRecovering ? 'reset' : 'login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    if (isRecovering) {
      setMode('reset');
    } else {
      setMode('login');
    }
  }, [isRecovering]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccessMessage(null);

    try {
      if (mode === 'login') {
        await signIn(email, password);
      } else if (mode === 'signup') {
        await signUp(email, password);
        setSuccessMessage(`Confirmation email sent to ${email}. Please check your inbox.`);
      } else if (mode === 'forgot') {
        await sendPasswordResetEmail(email);
        setSuccessMessage(`Password reset link dispatched to ${email}.`);
      } else if (mode === 'reset') {
        await updatePassword(password);
        setSuccessMessage('Security credentials updated successfully.');
        await signOut();
        setTimeout(() => {
          setRecovering(false);
          setMode('login');
          window.location.reload();
        }, 2000);
      }
    } catch (err: any) {
      setError(err.message || 'Authentication operation failed. Please verify credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#090d16] text-slate-100 flex items-center justify-center p-4 sm:p-6 relative overflow-hidden bg-cad-grid-dark">
      
      {/* Background Ambience */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-600/10 rounded-full blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-emerald-600/10 rounded-full blur-[120px] pointer-events-none"></div>

      <div className="max-w-4xl w-full bg-slate-900/90 border border-slate-800 rounded-3xl shadow-2xl backdrop-blur-2xl overflow-hidden grid lg:grid-cols-12 relative animate-slide-up">
        
        {/* Left / Top Industrial Perks Banner (Desktop Column) */}
        <div className="lg:col-span-5 bg-gradient-to-b from-slate-950 to-slate-900 p-8 sm:p-10 border-b lg:border-b-0 lg:border-r border-slate-800/80 flex flex-col justify-between space-y-8">
          
          <div className="space-y-6">
            <button 
              onClick={() => setCurrentView('landing')}
              className="inline-flex items-center gap-2 text-slate-400 hover:text-white transition-colors text-xs font-mono font-bold uppercase tracking-wider group"
            >
              <ChevronLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
              <span>Back to Overview</span>
            </button>

            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-blue-600/30 border border-blue-400/30">
                <Car size={24} strokeWidth={2.5} />
              </div>
              <div>
                <span className="font-black text-xl tracking-tight text-white uppercase block leading-none">
                  AutoPal <span className="text-blue-400">NG</span>
                </span>
                <span className="text-[9px] font-mono text-slate-400 uppercase tracking-widest">
                  Garage Command Deck
                </span>
              </div>
            </div>

            <div className="space-y-2 pt-2">
              <h2 className="text-xl font-black text-white uppercase tracking-tight">
                {mode === 'signup' ? 'Initialize Your Garage' : 'Welcome Back, Commander'}
              </h2>
              <p className="text-slate-400 text-xs leading-relaxed">
                Connect to Nigeria's premier vehicle intelligence and resale value preservation network.
              </p>
            </div>

            {/* Feature Perks List */}
            <div className="space-y-3.5 pt-4 border-t border-slate-800">
              <div className="flex items-center gap-3 text-xs text-slate-300">
                <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />
                <span>1 Free Vehicle Slot with Full Telemetry</span>
              </div>
              <div className="flex items-center gap-3 text-xs text-slate-300">
                <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />
                <span>Gemini Neural Mechanical Diagnostics</span>
              </div>
              <div className="flex items-center gap-3 text-xs text-slate-300">
                <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />
                <span>Automated Maintenance Schedule & Wear Alerts</span>
              </div>
              <div className="flex items-center gap-3 text-xs text-slate-300">
                <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />
                <span>Verified Digital Resale Dossier Export</span>
              </div>
            </div>
          </div>

          {/* Security Assurance Footer */}
          <div className="pt-6 border-t border-slate-800/80 flex items-center gap-2.5 text-[10px] font-mono text-slate-400 uppercase">
            <Lock size={12} className="text-blue-400" />
            <span>Bank-Grade 256-Bit Encrypted Data</span>
          </div>

        </div>

        {/* Right Form Column */}
        <div className="lg:col-span-7 p-8 sm:p-12 flex flex-col justify-center space-y-6">
          
          {/* Mode Switch Tabs */}
          {mode !== 'reset' && (
            <div className="flex bg-slate-950 p-1.5 rounded-xl border border-slate-800">
              <button
                type="button"
                onClick={() => { setMode('login'); setError(null); setSuccessMessage(null); }}
                className={`flex-1 py-2.5 rounded-lg text-xs font-black uppercase tracking-wider transition-all ${
                  mode === 'login' 
                    ? 'bg-blue-600 text-white shadow-md' 
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => { setMode('signup'); setError(null); setSuccessMessage(null); }}
                className={`flex-1 py-2.5 rounded-lg text-xs font-black uppercase tracking-wider transition-all ${
                  mode === 'signup' 
                    ? 'bg-blue-600 text-white shadow-md' 
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Create Account
              </button>
            </div>
          )}

          <div className="space-y-1">
            <h3 className="text-2xl font-black text-white uppercase tracking-tight">
              {mode === 'login' && 'Access Your Account'}
              {mode === 'signup' && 'Create Your Free Garage'}
              {mode === 'forgot' && 'Reset Security Credentials'}
              {mode === 'reset' && 'Update Password'}
            </h3>
            <p className="text-slate-400 text-xs font-medium">
              {mode === 'login' && 'Enter your verified credentials to enter your vehicle dashboard.'}
              {mode === 'signup' && 'Get started in 30 seconds. No credit card required.'}
              {mode === 'forgot' && 'Enter your registered email to receive a recovery link.'}
              {mode === 'reset' && 'Enter your new secure password below.'}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            
            {mode !== 'reset' && (
              <div className="space-y-1.5">
                <label className="text-[10px] font-mono font-bold text-slate-300 uppercase tracking-wider">
                  Email Address
                </label>
                <input 
                  type="email" 
                  required
                  placeholder="name@example.com"
                  className="w-full px-4 py-3.5 bg-slate-950 border border-slate-800 rounded-xl focus:border-blue-500 focus:bg-slate-950/80 outline-none transition text-sm font-medium text-white placeholder:text-slate-600"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            )}

            {(mode === 'login' || mode === 'signup' || mode === 'reset') && (
              <div className="space-y-1.5">
                <div className="flex justify-between items-center">
                  <label className="text-[10px] font-mono font-bold text-slate-300 uppercase tracking-wider">
                    Password
                  </label>
                  {mode === 'login' && (
                    <button 
                      type="button" 
                      onClick={() => setMode('forgot')} 
                      className="text-[10px] font-mono text-blue-400 hover:text-blue-300 transition-colors"
                    >
                      Forgot Password?
                    </button>
                  )}
                </div>
                <div className="relative">
                  <input 
                    type={showPassword ? 'text' : 'password'} 
                    required
                    placeholder="••••••••••••"
                    className="w-full px-4 py-3.5 bg-slate-950 border border-slate-800 rounded-xl focus:border-blue-500 focus:bg-slate-950/80 outline-none transition text-sm font-medium text-white placeholder:text-slate-600 pr-12"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-colors"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>
            )}

            {error && (
              <div className="p-3.5 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-400 text-xs font-mono leading-tight">
                {error}
              </div>
            )}

            {successMessage && (
              <div className="p-3.5 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-400 text-xs font-mono leading-tight">
                {successMessage}
              </div>
            )}

            <button 
              disabled={loading}
              className="w-full bg-blue-600 text-white py-4 rounded-xl font-black uppercase tracking-wider text-xs hover:bg-blue-500 transition-all disabled:opacity-50 shadow-lg shadow-blue-600/30 active:scale-95 flex items-center justify-center gap-2 border border-blue-400/30 mt-2"
            >
              {loading ? (
                <div className="flex items-center gap-2 font-mono">
                  <div className="w-3.5 h-3.5 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
                  <span>Processing...</span>
                </div>
              ) : (
                <>
                  <span>
                    {mode === 'login' ? 'Enter Garage' : 
                     mode === 'signup' ? 'Create Free Account' : 
                     mode === 'forgot' ? 'Send Recovery Link' : 'Update Password'}
                  </span>
                  <ArrowRight size={16} />
                </>
              )}
            </button>

          </form>

          {/* Social Sign In Option */}
          {mode !== 'reset' && (
            <div className="space-y-4 pt-2">
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-slate-800"></div>
                </div>
                <div className="relative flex justify-center text-[10px] font-mono uppercase tracking-wider">
                  <span className="bg-slate-900 px-3 text-slate-500">Or continue with</span>
                </div>
              </div>

              <button 
                type="button"
                onClick={() => signInWithGoogle()}
                className="w-full py-3.5 bg-slate-950 border border-slate-800 hover:border-slate-700 rounded-xl font-bold text-xs text-slate-200 flex items-center justify-center gap-3 transition-all hover:bg-slate-800/50 active:scale-95"
              >
                <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" className="w-4 h-4" />
                <span>Google Single Sign-On</span>
              </button>
            </div>
          )}

          {/* Bottom Switcher */}
          {mode === 'forgot' && (
            <div className="text-center pt-2">
              <button 
                onClick={() => setMode('login')} 
                className="text-xs font-mono text-slate-400 hover:text-white transition-colors"
              >
                Remembered password? <span className="text-blue-400 font-bold">Sign In</span>
              </button>
            </div>
          )}

        </div>

      </div>

    </div>
  );
};

export default AuthScreen;
