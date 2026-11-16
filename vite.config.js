import { defineConfig } from "vite";
export default defineConfig({
  build: {
    target: "esnext",
    rollupOptions: {
      input: { main: "index.html", armageddon: "armageddon.html" },
      output: { manualChunks: { three: ["three"] } },
    },
  },
});
