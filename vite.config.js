import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    port: 5173,
    strictPort: true,
    proxy: {
      '/api/host': {
        target: 'http://localhost:5000',
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
      '/api': {
        target: 'http://3.147.226.49:5000',
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path.replace(/^\/api/, ''),
        headers: {
          'Host': 'accomodation.api.test.nextkinlife.live',
          'Origin': 'https://accomodation.test.nextkinlife.live'
        },
        configure: (proxy, _options) => {
          proxy.on('error', (err, _req, _res) => {
            console.log('proxy error', err);
          });
          proxy.on('proxyReq', (proxyReq, req, _res) => {
            console.log('Sending Request to the Target:', req.method, req.url);
          });
          proxy.on('proxyRes', (proxyRes, req, res) => {
            console.log('Received Response from the Target:', proxyRes.statusCode, req.url);
            const setCookie = proxyRes.headers['set-cookie'];
            if (setCookie) {
              proxyRes.headers['set-cookie'] = setCookie.map(cookie => {
                // Remove Domain, Secure, SameSite and explicitly add SameSite=Lax
                return cookie
                  .replace(/;?\s*Domain=[^;]+/i, '')
                  .replace(/;?\s*Secure/i, '')
                  .replace(/;?\s*SameSite=[^;]+/i, '') + '; SameSite=Lax';
              });
            }
          });
        }
      },
      '/socket.io': {
        target: 'http://3.147.226.49:5000',
        changeOrigin: true,
        secure: false,
        ws: true,
        headers: {
          'Host': 'accomodation.api.test.nextkinlife.live',
          'Origin': 'https://accomodation.test.nextkinlife.live'
        },
        configure: (proxy, _options) => {
          proxy.on('proxyRes', (proxyRes, req, res) => {
            const setCookie = proxyRes.headers['set-cookie'];
            if (setCookie) {
              proxyRes.headers['set-cookie'] = setCookie.map(cookie => {
                // Remove Domain, Secure, SameSite and explicitly add SameSite=Lax
                return cookie
                  .replace(/;?\s*Domain=[^;]+/i, '')
                  .replace(/;?\s*Secure/i, '')
                  .replace(/;?\s*SameSite=[^;]+/i, '') + '; SameSite=Lax';
              });
            }
          });
        }
      },

    }
  },
  build: {
    rollupOptions: {
      output: {
      },
    },
    chunkSizeWarningLimit: 1000,
  },
})