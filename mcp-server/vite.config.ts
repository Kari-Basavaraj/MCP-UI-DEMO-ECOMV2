import { defineConfig } from "vite";
import { viteSingleFile } from "vite-plugin-singlefile";

const entry = process.env.ENTRY || "products-app";

export default defineConfig({
  plugins: [viteSingleFile()],
  build: {
    outDir: "dist",
    emptyOutDir: false,
    rollupOptions: {
      input: `${entry}.html`,
    },
  },
});
