import { resolve } from "node:path";
import { cpSync, copyFileSync, existsSync, mkdirSync } from "node:fs";
import { defineConfig } from "vite";

/**
 * These pages intentionally use classic scripts (not ES modules) because
 * they share globals such as SAHAAYA_CONFIG, SahaayaDB and SahaayaAuth.
 * Vite does not bundle/copy those script tags automatically, so copy the
 * source scripts into the production output without changing their runtime.
 */
function copyClassicScripts() {
  return {
    name: "sahaaya-copy-classic-scripts",
    apply: "build",
    writeBundle(outputOptions) {
      const projectRoot = process.cwd();
      const outputDir = resolve(projectRoot, outputOptions.dir || "dist");
      const sourceJsDir = resolve(projectRoot, "js");
      const outputJsDir = resolve(outputDir, "js");

      if (existsSync(sourceJsDir)) {
        mkdirSync(outputJsDir, { recursive: true });
        cpSync(sourceJsDir, outputJsDir, { recursive: true });
      }

      const landingController = resolve(projectRoot, "app.js");
      if (existsSync(landingController)) {
        copyFileSync(landingController, resolve(outputDir, "app.js"));
      }
    }
  };
}

export default defineConfig({
  plugins: [copyClassicScripts()],
  server: {
    port: 5500,
    open: true
  },
  build: {
    rollupOptions: {
      input: {
        main: resolve(process.cwd(), "index.html"),
        volunteer: resolve(process.cwd(), "volunteer/index.html"),
        home: resolve(process.cwd(), "home/index.html"),
        admin: resolve(process.cwd(), "admin/index.html")
      }
    }
  }
});
