import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { nodePolyfills } from "vite-plugin-node-polyfills";

export default defineConfig({
  envPrefix: ["VITE_", "NEXT_PUBLIC_"],
  plugins: [
    react(),
    nodePolyfills({
      globals: { Buffer: true, global: true, process: true },
      protocolImports: true,
    }),
  ],
  optimizeDeps: {
    esbuildOptions: {
      define: { global: "globalThis" },
    },
  },
  resolve: {
    alias: {
      crypto: "crypto-browserify",
      stream: "stream-browserify",
    },
  },
  build: {
    target: "esnext",
    outDir: "dist",
    sourcemap: false,
    rollupOptions: {
      external: [],
      output: {
        manualChunks: undefined,
      },
    },
  },
});
