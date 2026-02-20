import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: './',
  server: {
    proxy: {
      '/api-soop': {
        target: 'https://live.sooplive.co.kr',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api-soop/, ''),
        headers: {
          'Origin': 'https://www.sooplive.co.kr',
          'Referer': 'https://www.sooplive.co.kr/'
        }
      },
      '/api-ch': {
        target: 'https://chapi.sooplive.co.kr',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api-ch/, ''),
        headers: {
          'Origin': 'https://www.sooplive.co.kr',
          'Referer': 'https://www.sooplive.co.kr/'
        }
      }
    }
  }
})
