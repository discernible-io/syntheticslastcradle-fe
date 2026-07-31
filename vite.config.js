import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "REACT_APP_");
  return {
    plugins: [react()],
    envPrefix: "REACT_APP_",
    publicDir: "public",
    build: {
      outDir: "dist",
      sourcemap: false,
      emptyOutDir: true,
    },
    server: {
      port: 5173,
      host: true,
    },
    define: {
      __DEPLOY_LABEL__: JSON.stringify(env.REACT_APP_DEPLOY_LABEL || ""),
    },
  };
});
