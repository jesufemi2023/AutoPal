import React, { useState, useEffect } from 'react';
import { signIn, signUp, signInWithGoogle, sendPasswordResetEmail, updatePassword, signOut } from '../auth/authService.ts';
import { useAutoPalStore } from '../shared/store.ts';
import { Car } from 'lucide-react';

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
      setError(err.message || 'Auth failure');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-[2.5rem] shadow-2xl p-8 sm:p-12 border border-slate-100 relative overflow-hidden">
        <div className="absolute top-0 right-0 p-8 opacity-[0.03] select-none pointer-events-none">
          <Car size={120} />
        </div>

        <div className="text-center mb-10">
          <button 
            onClick={() => setCurrentView('landing')}
            className="w-16 h-16 bg-gradient-to-br from-slate-800 to-slate-950 rounded-2xl flex items-center justify-center text-white mx-auto mb-6 shadow-xl shadow-slate-900/20 hover:scale-105 transition-transform active:scale-95"
            title="Return to Home"
          >
            <Car size={32} strokeWidth={2.5} />
          </button>
          <h1 className="text-3xl font-black text-slate-900 tracking-tighter uppercase mb-1">
            {mode === 'login' && 'Welcome Back'}
            {mode === 'signup' && 'Create Account'}
            {mode === 'forgot' && 'Reset Password'}
            {mode === 'reset' && 'Secure Update'}
          </h1>
          <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest">
            AutoPal NG Vehicle Intelligence
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {mode !== 'reset' && (
            <div>
              <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Email Address</label>
              <input 
                type="email" 
                required
                placeholder="you@example.com"
                className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none transition text-sm font-bold"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
          )}
          
          {(mode === 'login' || mode === 'signup' || mode === 'reset') && (
            <div>
              <div className="flex justify-between items-center mb-1.5 ml-1">
                <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest">
                  Password
                </label>
                {mode === 'login' && (
                  <button type="button" onClick={() => setMode('forgot')} className="text-[9px] font-black text-blue-600 hover:underline uppercase tracking-wider">Forgot Password?</button>
                )}
              </div>
              <input 
                type="password" 
                required
                placeholder="••••••••"
                className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none transition text-sm font-bold"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          )}

          {error && <div className="p-4 bg-rose-50 border border-rose-100 rounded-xl text-rose-600 text-[10px] font-black uppercase tracking-widest leading-tight">{error}</div>}
          {successMessage && <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-xl text-emerald-600 text-[10px] font-black uppercase tracking-widest leading-tight">{successMessage}</div>}

          <button 
            disabled={loading}
            className="w-full bg-slate-900 text-white py-5 rounded-2xl font-black uppercase tracking-[0.2em] text-[11px] hover:bg-blue-600 transition-all disabled:opacity-50 shadow-xl"
          >
            {loading ? 'Processing...' : (
              mode === 'login' ? 'Sign In' : 
              mode === 'signup' ? 'Create My Account' : 
              mode === 'forgot' ? 'Send Reset Link' : 'Update Password'
            )}
          </button>
        </form>

        {mode !== 'reset' && (
          <button 
            type="button"
            onClick={() => signInWithGoogle()}
            className="w-full mt-6 py-4 border-2 border-slate-100 rounded-2xl font-black uppercase tracking-widest text-[10px] text-slate-600 flex items-center justify-center gap-3 hover:bg-slate-50 transition active:scale-95"
          >
            <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="G" className="w-5 h-5" />
            Continue with Google
          </button>
        )}

        <div className="mt-10 text-center space-y-2">
           {mode === 'login' && <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">New to AutoPal? <button onClick={() => setMode('signup')} className="text-blue-600 font-black">Sign Up</button></p>}
           {(mode === 'signup' || mode === 'forgot') && <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Already have an account? <button onClick={() => setMode('login')} className="text-blue-600 font-black">Sign In</button></p>}
           <button onClick={() => setCurrentView('landing')} className="block w-full text-[9px] font-black uppercase tracking-widest text-slate-300 hover:text-slate-600 transition-colors pt-4">Return Home</button>
        </div>
      </div>
    </div>
  );
};

export default AuthScreen;