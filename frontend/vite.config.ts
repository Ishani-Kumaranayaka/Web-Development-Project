import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'
import { fileURLToPath } from 'node:url'

// https://vite.dev/config/
export default defineConfig({
  plugins: [vue(), tailwindcss()],
  envDir: fileURLToPath(new URL('..', import.meta.url)),
  server: {
    proxy: { '/api': 'http://localhost:4000' },
  },
})
