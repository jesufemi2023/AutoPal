
import React, { useState, useEffect } from 'react';
import { signIn, signUp, signInWithGoogle, sendPasswordResetEmail, updatePassword, signOut } from '../auth/authService.ts';
import { useAutoPalStore } from '../shared/store.ts';
import { Car, ChevronLeft } from 'lucide-react';

type AuthMode = 'login' | 'signup' | 'forgot' | 'reset';

const AuthScreen: React.FC = () => {
  const isRecovering = useAutoPalStore(s => s.isRecovering);
  const setRecovering = useAutoPalStore(s => s.setRecovering);
  const setCurrentView = useAutoPalStore(s => s.setCurrentView);
  
  const [mode, setMode] = useState<AuthMode>(isRecovering ? 'reset' : 'login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
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
        setSuccessMessage(`Confirmation email sent to ${email}.`);
      } else if (mode === 'forgot') {
        await sendPasswordResetEmail(email);
        setSuccessMessage(`Reset link sent to ${email}.`);
      } else if (mode === 'reset') {
        await updatePassword(password);
        setSuccessMessage('Password updated successfully!');
        await signOut();
        setTimeout(() => {
          setRecovering(false);
          setMode('login');
          window.location.reload();
        }, 2000);
      }
    } catch (err: any) {
      setError(err.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-500/5 blur-[120px] rounded-full pointer-events-none"></div>
      <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] bg-slate-500/5 blur-[120px] rounded-full pointer-events-none"></div>

      <div className="max-w-md w-full bg-white rounded-[2.5rem] shadow-[0_20px_50px_rgba(0,0,0,0.05)] p-8 sm:p-12 border border-slate-100 relative overflow-hidden animate-slide-up">
        <div className="absolute top-0 right-0 p-8 opacity-[0.02] select-none pointer-events-none">
          <Car size={140} />
        </div>

        <div className="text-center mb-10">
          <button 
            onClick={() => setCurrentView('landing')}
            className="group flex flex-col items-center mx-auto mb-8 outline-none rounded-3xl p-3 transition-all hover:bg-slate-50"
            title="Go back to Home Page"
          >
            {/* LOGO UNIFORMITY: STANDARD SLATE COMMAND LOGO */}
            <div className="w-16 h-16 bg-gradient-to-br from-slate-800 to-slate-950 rounded-2xl flex items-center justify-center text-white mb-3 shadow-xl group-hover:scale-110 transition-all duration-500 relative">
               <Car size={32} strokeWidth={2.5} />
               <div className="absolute -top-12 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-[9px] font-black uppercase tracking-widest px-3 py-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none shadow-xl">
                 Go Home
               </div>
            </div>
            <div className="flex items-center gap-2 text-slate-400 group-hover:text-blue-600 transition-colors">
              <ChevronLeft size={10} className="group-hover:-translate-x-1 transition-transform" />
              <span className="text-[9px] font-black uppercase tracking-[0.2em]">Return to Homepage</span>
            </div>
          </button>

          <h1 className="text-3xl font-black text-slate-900 tracking-tighter uppercase mb-2">
            {mode === 'login' && 'Welcome Back'}
            {mode === 'signup' && 'Join AutoPal'}
            {mode === 'forgot' && 'Reset Password'}
            {mode === 'reset' && 'Secure Update'}
          </h1>
          <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest leading-relaxed">
            Manage your vehicle history with AI precision
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {mode !== 'reset' && (
            <div className="space-y-2">
              <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Email Address</label>
              <input 
                type="email" 
                required
                placeholder="you@example.com"
                className="w-full px-6 py-4 bg-slate-50 border-2 border-transparent rounded-2xl focus:border-blue-500 focus:bg-white outline-none transition text-sm font-bold shadow-inner"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
          )}
          
          {(mode === 'login' || mode === 'signup' || mode === 'reset') && (
            <div className="space-y-2">
              <div className="flex justify-between items-center mb-1 ml-1">
                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest">
                  Password
                </label>
                {mode === 'login' && (
                  <button type="button" onClick={() => setMode('forgot')} className="text-[9px] font-black text-blue-600 hover:underline uppercase tracking-wider">Forgot?</button>
                )}
              </div>
              <input 
                type="password" 
                required
                placeholder="••••••••"
                className="w-full px-6 py-4 bg-slate-50 border-2 border-transparent rounded-2xl focus:border-blue-500 focus:bg-white outline-none transition text-sm font-bold shadow-inner"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          )}

          {error && <div className="p-4 bg-rose-50 border border-rose-100 rounded-xl text-rose-600 text-[10px] font-black uppercase tracking-widest leading-tight text-center">{error}</div>}
          {successMessage && <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-xl text-emerald-600 text-[10px] font-black uppercase tracking-widest leading-tight text-center">{successMessage}</div>}

          <button 
            disabled={loading}
            className="w-full bg-slate-900 text-white py-5 rounded-2xl font-black uppercase tracking-[0.2em] text-[11px] hover:bg-blue-600 transition-all disabled:opacity-50 shadow-xl shadow-slate-900/10 active:scale-95"
          >
            {loading ? (
              <div className="flex items-center justify-center gap-2">
                <div className="w-3 h-3 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
                <span>Processing...</span>
              </div>
            ) : (
              mode === 'login' ? 'Sign In' : 
              mode === 'signup' ? 'Create Account' : 
              mode === 'forgot' ? 'Send Reset Link' : 'Update Password'
            )}
          </button>
        </form>

        {mode !== 'reset' && (
          <div className="relative my-8">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-100"></div>
            </div>
            <div className="relative flex justify-center text-[9px] font-black uppercase tracking-widest">
              <span className="bg-white px-4 text-slate-300">Or continue with</span>
            </div>
          </div>
        )}

        {mode !== 'reset' && (
          <button 
            type="button"
            onClick={() => signInWithGoogle()}
            className="w-full py-4 border-2 border-slate-100 rounded-2xl font-black uppercase tracking-widest text-[10px] text-slate-600 flex items-center justify-center gap-3 hover:bg-slate-50 hover:border-slate-200 transition active:scale-95"
          >
            <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" className="w-4 h-4" />
            Google Login
          </button>
        )}

        <div className="mt-10 text-center space-y-4">
           {mode === 'login' && (
             <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
               New to AutoPal? <button onClick={() => setMode('signup')} className="text-blue-600 font-black hover:underline">Create Account</button>
             </p>
           )}
           {(mode === 'signup' || mode === 'forgot') && (
             <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
               Have an account? <button onClick={() => setMode('login')} className="text-blue-600 font-black hover:underline">Sign In</button>
             </p>
           )}
           
           <button 
             onClick={() => setCurrentView('landing')} 
             className="text-[9px] font-black uppercase tracking-widest text-slate-300 hover:text-slate-900 transition-colors pt-4 flex items-center justify-center gap-2 mx-auto border-t border-slate-50 w-full"
           >
             Exit back to Welcome Page
           </button>
        </div>
      </div>
    </div>
  );
};

export default AuthScreen;
