import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  // Note: /api/ endpoints are Vercel serverless functions.
  // For local development, use "vercel dev" instead of "vite dev".
  // Or deploy to Vercel where /api/ works automatically.
})
