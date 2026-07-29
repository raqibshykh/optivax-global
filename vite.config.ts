import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import svgr from "vite-plugin-svgr";
import path from "path";

// Function form (not a plain object) so we can read VITE_BASE_PATH from the
// mode-specific .env file before the config is built — every static asset
// path in src/ that uses `import.meta.env.BASE_URL` (GridShape, NotFound,
// UserDropdown, AppHeader, AppSidebar, AuthPageLayout) depends on this
// matching wherever the built app is actually deployed. Defaults to "/"
// (a domain-root deploy, e.g. Vercel) — the WP-embedded deploy at
// https://optivaxglobal.com/pms/ sets VITE_BASE_PATH=/pms/ in
// .env.production instead of hardcoding it here, so a future root-hosted
// deploy isn't broken by a value baked in for this one target.
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "VITE_");
  const base = env.VITE_BASE_PATH || "/";

  return {
    base,
    plugins: [react(), svgr({ svgrOptions: { exportType: "named", namedExport: "ReactComponent", icon: true } })],
    resolve: { alias: { "@": path.resolve(__dirname, "src") } },
    build: {
      outDir: "dist",
      emptyOutDir: true,
      manifest: true,
      rollupOptions: {
        input: "index.html",
        output: {
          // Groups the heaviest third-party libraries into their own stable
          // vendor chunks instead of letting Rollup's default per-dynamic-import
          // splitting scatter them across many small chunks (or duplicate them
          // across pages that share a dependency) — these chunks change far
          // less often than app code, so browsers cache them across deploys.
          manualChunks(id: string) {
            if (!id.includes("node_modules")) return undefined;
            if (id.includes("apexcharts")) return "vendor-charts";
            if (id.includes("react-dom") || id.includes("/react/") || id.includes("react-router")) return "vendor-react";
            return undefined;
          },
        },
      },
    },
  };
});