
import React, { useState, useEffect } from 'react';
import { signIn, signUp, signInWithGoogle, sendPasswordResetEmail, updatePassword } from '../auth/authService.ts';

type AuthMode = 'login' | 'signup' | 'forgot' | 'reset';

const AuthScreen: React.FC = () => {
  const [mode, setMode] = useState<AuthMode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Check if we are arriving from a password recovery link
  useEffect(() => {
    if (window.location.hash.includes('type=recovery')) {
      setMode('reset');
    }
  }, []);

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
        setSuccessMessage(`Reset link sent to ${email}. Check your inbox or spam.`);
      } else if (mode === 'reset') {
        await updatePassword(password);
        setSuccessMessage('Password updated successfully! Redirecting...');
        setTimeout(() => window.location.reload(), 1500);
      }
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  if (successMessage && (mode === 'signup' || mode === 'forgot')) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-3xl shadow-xl p-10 border border-slate-100 text-center animate-slide-in">
          <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center text-3xl mx-auto mb-6">
            {mode === 'signup' ? '✉️' : '🔑'}
          </div>
          <h2 className="text-2xl font-black text-slate-900 mb-2">
            {mode === 'signup' ? 'Verify Your Email' : 'Check Your Inbox'}
          </h2>
          <p className="text-slate-500 mb-8 leading-relaxed text-sm">
            {successMessage}
          </p>
          <button 
            onClick={() => {
              setSuccessMessage(null);
              setMode('login');
            }}
            className="w-full bg-slate-900 text-white py-4 rounded-2xl font-bold hover:bg-slate-800 transition"
          >
            Back to Sign In
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-3xl shadow-xl p-8 border border-slate-100">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center text-white font-black text-2xl shadow-lg shadow-blue-500/30 mx-auto mb-4">
            A
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tighter">
            {mode === 'login' && 'Welcome Back'}
            {mode === 'signup' && 'Join AutoPal NG'}
            {mode === 'forgot' && 'Reset Password'}
            {mode === 'reset' && 'Create New Password'}
          </h1>
          <p className="text-slate-500 text-sm">
            {mode === 'forgot' ? 'We will send you a secure link.' : 'Vehicle Ownership Intelligence'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {mode !== 'reset' && (
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Email Address</label>
              <input 
                type="email" 
                required
                placeholder="alex@example.com"
                className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition text-sm"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
          )}
          
          {(mode === 'login' || mode === 'signup' || mode === 'reset') && (
            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="block text-xs font-bold text-slate-400 uppercase">
                  {mode === 'reset' ? 'New Password' : 'Password'}
                </label>
                {mode === 'login' && (
                  <button 
                    type="button"
                    onClick={() => setMode('forgot')}
                    className="text-[10px] font-bold text-blue-600 hover:underline uppercase tracking-wider"
                  >
                    Forgot?
                  </button>
                )}
              </div>
              <input 
                type="password" 
                required
                placeholder="••••••••"
                className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition text-sm"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          )}

          {error && (
            <div className="p-3 bg-red-50 border border-red-100 rounded-xl">
              <p className="text-red-500 text-xs font-bold leading-tight">{error}</p>
            </div>
          )}

          {successMessage && mode === 'reset' && (
            <div className="p-3 bg-emerald-50 border border-emerald-100 rounded-xl">
              <p className="text-emerald-600 text-xs font-bold leading-tight">{successMessage}</p>
            </div>
          )}

          <button 
            disabled={loading}
            className="w-full bg-blue-600 text-white py-4 rounded-2xl font-black uppercase tracking-widest hover:bg-blue-700 transition disabled:opacity-50 shadow-lg shadow-blue-500/20"
          >
            {loading ? 'Processing...' : (
              mode === 'login' ? 'Sign In' : 
              mode === 'signup' ? 'Create Account' : 
              mode === 'forgot' ? 'Send Reset Link' : 'Update Password'
            )}
          </button>
        </form>

        {mode !== 'reset' && (
          <>
            <div className="mt-6 flex items-center gap-4">
              <div className="flex-1 h-px bg-slate-100"></div>
              <span className="text-[10px] font-bold text-slate-300 uppercase">Or</span>
              <div className="flex-1 h-px bg-slate-100"></div>
            </div>

            <button 
              onClick={() => signInWithGoogle()}
              className="w-full mt-6 py-4 border border-slate-200 rounded-2xl font-bold text-slate-700 flex items-center justify-center gap-2 hover:bg-slate-50 transition"
            >
              <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" className="w-5 h-5" />
              Google
            </button>
          </>
        )}

        <p className="mt-8 text-center text-sm text-slate-500">
          {mode === 'login' && (
            <>
              Don't have an account?{' '}
              <button onClick={() => setMode('signup')} className="text-blue-600 font-bold hover:underline">Sign Up</button>
            </>
          )}
          {(mode === 'signup' || mode === 'forgot' || mode === 'reset') && (
            <>
              Already have an account?{' '}
              <button onClick={() => setMode('login')} className="text-blue-600 font-bold hover:underline">Log In</button>
            </>
          )}
        </p>
      </div>
    </div>
  );
};

export default AuthScreen;
