
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import process from 'node:process';

export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  // Set the third parameter to '' to load all envs regardless of the `VITE_` prefix.
  const env = loadEnv(mode, process.cwd(), '');
  
  // Resolve Gemini API key prioritizing the active platform GEMINI_API_KEY
  const resolvedApiKey = env.GEMINI_API_KEY || process.env.GEMINI_API_KEY || env.VITE_GEMINI_API_KEY || env.API_KEY || env.VITE_API_KEY || process.env.API_KEY || "";
  const resolvedSupabaseUrl = env.VITE_SUPABASE_URL || env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || "";
  const resolvedSupabaseAnonKey = env.VITE_SUPABASE_ANON_KEY || env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || "";
  const resolvedPaystackKey = env.VITE_PAYSTACK_PUBLIC_KEY || env.PAYSTACK_PUBLIC_KEY || process.env.PAYSTACK_PUBLIC_KEY || "";

  return {
    plugins: [react()],
    define: {
      // Explicitly define process.env keys for the browser runtime
      'process.env.API_KEY': JSON.stringify(resolvedApiKey),
      'process.env.GEMINI_API_KEY': JSON.stringify(resolvedApiKey),
      'process.env.SUPABASE_URL': JSON.stringify(resolvedSupabaseUrl),
      'process.env.SUPABASE_ANON_KEY': JSON.stringify(resolvedSupabaseAnonKey),
      'process.env.PAYSTACK_PUBLIC_KEY': JSON.stringify(resolvedPaystackKey),
    },
    server: {
      host: true,
      port: 3000
    },
    build: {
      outDir: 'dist',
      sourcemap: true
    }
  };
});
