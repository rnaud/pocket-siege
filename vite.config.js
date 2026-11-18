import {assetManifestPlugin} from "./scripts/asset-manifest.mjs";
import { defineConfig } from "vite";
import { progressPagePlugin } from "./scripts/progress-page.mjs";
export default defineConfig({
  plugins: [progressPagePlugin(),assetManifestPlugin()],
  build: {
    target: "esnext",
    rollupOptions: {
      input: { main: "index.html", armageddon: "armageddon.html", progress: "progress.html" },
      output: { manualChunks: { three: ["three"] } },
    },
  },
});
