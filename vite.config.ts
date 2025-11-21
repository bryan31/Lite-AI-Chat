import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  // Set the third parameter to '' to load all env regardless of the `VITE_` prefix.
  const env = loadEnv(mode, process.cwd(), '');

  return {
    plugins: [react()],
    server: {
      port: 3000,
      host: true // Listen on all addresses
    },
    define: {
      // Map the variable specifically. 
      // NOTE: We do NOT set 'process.env': {} here to avoid breaking libraries that rely on process.env.NODE_ENV
      'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
    },
  };
});