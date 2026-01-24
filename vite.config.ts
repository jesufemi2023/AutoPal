
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
// Fixed: Specifically import cwd to avoid 'Process' type collision which was causing Property 'cwd' does not exist on type 'Process'
import { cwd } from 'node:process';

export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  // Set the third parameter to '' to load all envs regardless of the `VITE_` prefix.
  // Fixed: Use imported cwd() function directly instead of process.cwd() to resolve typing issues in the build environment
  const env = loadEnv(mode, cwd(), '');
  
  return {
    plugins: [react()],
    define: {
      // Explicitly define process.env.API_KEY for the browser.
      // This physically replaces "process.env.API_KEY" in your code with the string value of the key during build.
      'process.env.API_KEY': JSON.stringify(env.VITE_API_KEY || env.API_KEY || ""),
      'process.env.SUPABASE_URL': JSON.stringify(env.VITE_SUPABASE_URL || env.SUPABASE_URL || ""),
      'process.env.SUPABASE_ANON_KEY': JSON.stringify(env.VITE_SUPABASE_ANON_KEY || env.SUPABASE_ANON_KEY || ""),
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
