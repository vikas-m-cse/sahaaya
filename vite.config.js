import { resolve } from "node:path";
import { cpSync, existsSync, readdirSync } from "node:fs";
import { defineConfig } from "vite";

// The legacy portal controllers are loaded by URL at runtime from bootstrap.js.
// Vite only emits files it sees as build inputs/imports, so copy those runtime
// scripts/styles into dist explicitly. Keep bootstrap.js out of the copied
// scripts: Vite bundles that entry and rewrites the HTML reference.
function copyRuntimeAssets() {
  return {
    name: "sahaaya-copy-runtime-assets",
    closeBundle() {
      const root = process.cwd();
      const out = resolve(root, "dist");
      for (const directory of ["js", "css"]) {
        const source = resolve(root, directory);
        const target = resolve(out, directory);
        if (!existsSync(source)) continue;
        cpSync(source, target, {
          recursive: true,
          filter: (sourcePath) =>
            !sourcePath.endsWith("/bootstrap.js") &&
            !sourcePath.endsWith("\\bootstrap.js")
        });
      }
    }
  };
}

export default defineConfig({
  server: {
    port: 5500,
    open: true
  },
  plugins: [copyRuntimeAssets()],
  build: {
    rollupOptions: {
      input: {
        main: resolve(process.cwd(), "index.html"),
        volunteer: resolve(process.cwd(), "volunteer/index.html"),
        home: resolve(process.cwd(), "home/index.html"),
        admin: resolve(process.cwd(), "admin/index.html"),
        adminLogin: resolve(process.cwd(), "admin/login.html")
      }
    }
  }
});
