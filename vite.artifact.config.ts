// Separate build config for producing a single self-contained HTML file (for publishing as a
// Claude Artifact). Keeps the normal `vite build` output (code-split, cacheable) unchanged.
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { viteSingleFile } from "vite-plugin-singlefile";

export default defineConfig({
  plugins: [react(), viteSingleFile()],
  build: {
    outDir: "dist-artifact",
    emptyOutDir: true,
  },
});
