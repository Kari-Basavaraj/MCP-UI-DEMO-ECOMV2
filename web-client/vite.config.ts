import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    host: true
  },
  resolve: {
    alias: {
      compositions: path.resolve(__dirname, "./node_modules/sds/src/ui/compositions"),
      data: path.resolve(__dirname, "./node_modules/sds/src/data"),
      hooks: path.resolve(__dirname, "./node_modules/sds/src/ui/hooks"),
      icons: path.resolve(__dirname, "./node_modules/sds/src/ui/icons"),
      images: path.resolve(__dirname, "./node_modules/sds/src/ui/images"),
      layout: path.resolve(__dirname, "./node_modules/sds/src/ui/layout"),
      primitives: path.resolve(__dirname, "./node_modules/sds/src/ui/primitives"),
      utils: path.resolve(__dirname, "./node_modules/sds/src/ui/utils"),
      sds: path.resolve(__dirname, "./node_modules/sds/src"),
    }
  }
})
