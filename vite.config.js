import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [
    react(),
    {
      name: 'copy-data-folder',
      closeBundle: async function() {
        var fs = await import('fs');
        var path = await import('path');
        var src = path.resolve(process.cwd(), 'data');
        var dest = path.resolve(process.cwd(), 'dist/data');
        if (fs.existsSync(src)) {
          fs.cpSync(src, dest, { recursive: true });
          console.log('Copied data/ to dist/data/');
        }
      }
    }
  ],
})
