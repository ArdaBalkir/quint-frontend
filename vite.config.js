import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import mkcert from 'vite-plugin-mkcert'

export default defineConfig({
  base: '/',
  plugins: [react(), mkcert()],
  server: {
    host: '127.0.0.1',
    port: 3000,
    https: true,
    proxy: {
      '/api/pynutil': {
        target: 'https://webnutil.apps.ebrains.eu',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/pynutil/, ''),
        secure: true
      }
    }
  },
  define: {
    'process.env': {}
  },
})