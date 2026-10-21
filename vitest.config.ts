import { fileURLToPath } from "node:url";
import tsconfigPaths from "vite-tsconfig-paths";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [tsconfigPaths()],
  resolve: {
    alias: {
      // Vitest lacks Next's `react-server` export condition, so the real
      // `next-intl/server` resolves to its client entry and throws from
      // server actions exercised by the integration suites.
      "next-intl/server": fileURLToPath(
        new URL("./lib/i18n/test-server.ts", import.meta.url),
      ),
    },
  },
  test: {
    environment: "node",
    setupFiles: ["./vitest.setup.ts"],
    include: ["lib/**/*.test.ts", "app/**/*.test.ts", "scripts/**/*.test.ts"],
    // Integration suites share one database; running files in parallel let
    // them clobber each other's rows (unique violations on app_settings,
    // flaky API-key requestCount assertions). Files run sequentially;
    // tests within a file were always sequential.
    fileParallelism: false,
  },
});
