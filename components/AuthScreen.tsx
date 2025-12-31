
import React, { useState } from 'react';
import { signIn, signUp, signInWithGoogle } from '../auth/authService.ts';

const AuthScreen: React.FC = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [emailSent, setEmailSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      if (isLogin) {
        await signIn(email, password);
      } else {
        await signUp(email, password);
        setEmailSent(true);
      }
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  if (emailSent) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-3xl shadow-xl p-10 border border-slate-100 text-center animate-slide-in">
          <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center text-3xl mx-auto mb-6">
            ✉️
          </div>
          <h2 className="text-2xl font-black text-slate-900 mb-2">Check Your Email</h2>
          <p className="text-slate-500 mb-8 leading-relaxed text-sm">
            We've sent a verification link to <span className="font-bold text-slate-900">{email}</span>. 
            Please check your inbox and spam folder.
          </p>
          <div className="bg-amber-50 border border-amber-100 p-4 rounded-2xl text-left mb-8">
            <h4 className="text-[10px] font-black text-amber-600 uppercase tracking-widest mb-1">Testing Tip</h4>
            <p className="text-[11px] text-amber-700 leading-tight">
              If the link doesn't work, ensure your site's URL is added to the <b>Redirect URLs</b> in your Supabase Dashboard.
            </p>
          </div>
          <button 
            onClick={() => {
              setEmailSent(false);
              setIsLogin(true);
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
            {isLogin ? 'Welcome Back' : 'Join AutoPal NG'}
          </h1>
          <p className="text-slate-500 text-sm">Vehicle Ownership Intelligence</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
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
          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Password</label>
            <input 
              type="password" 
              required
              placeholder="••••••••"
              className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition text-sm"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          {error && (
            <div className="p-3 bg-red-50 border border-red-100 rounded-xl">
              <p className="text-red-500 text-xs font-bold leading-tight">{error}</p>
            </div>
          )}

          <button 
            disabled={loading}
            className="w-full bg-blue-600 text-white py-4 rounded-2xl font-black uppercase tracking-widest hover:bg-blue-700 transition disabled:opacity-50 shadow-lg shadow-blue-500/20"
          >
            {loading ? 'Processing...' : (isLogin ? 'Sign In' : 'Create Account')}
          </button>
        </form>

        <div className="mt-6 flex items-center gap-4">
          <div className="flex-1 h-px bg-slate-100"></div>
          <span className="text-[10px] font-bold text-slate-300 uppercase">Or continue with</span>
          <div className="flex-1 h-px bg-slate-100"></div>
        </div>

        <button 
          onClick={() => signInWithGoogle()}
          className="w-full mt-6 py-4 border border-slate-200 rounded-2xl font-bold text-slate-700 flex items-center justify-center gap-2 hover:bg-slate-50 transition"
        >
          <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" className="w-5 h-5" />
          Google
        </button>

        <p className="mt-8 text-center text-sm text-slate-500">
          {isLogin ? "Don't have an account?" : "Already have an account?"}{' '}
          <button 
            onClick={() => setIsLogin(!isLogin)}
            className="text-blue-600 font-bold hover:underline"
          >
            {isLogin ? 'Sign Up' : 'Log In'}
          </button>
        </p>
      </div>
    </div>
  );
};

export default AuthScreen;
