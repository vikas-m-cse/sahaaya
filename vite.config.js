import { resolve } from "path";
import { defineConfig } from "vite";

export default defineConfig({
  server: {
    port: 5500,
    open: true
  },
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, "index.html"),
        volunteer: resolve(__dirname, "volunteer/index.html"),
        home: resolve(__dirname, "home/index.html"),
        admin: resolve(__dirname, "admin/index.html")
      }
    }
  }
});
