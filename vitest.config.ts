import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

// Run every test in a US timezone. CI runs in UTC, where `new Date("YYYY-MM-DD")`
// happens to give the right day; in the US it is a day early (see "Date
// Handling" in AGENTS.md). Set here, before the workers spawn, so they inherit it.
process.env.TZ = "America/Chicago";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/test/setup.ts"],
    include: ["src/**/*.{test,spec}.{ts,tsx}"],
    exclude: ["node_modules", "dist", ".astro"],
    coverage: {
      provider: "v8",
      reporter: ["text", "html"],
      exclude: [
        "src/components/catalyst/**", // Exclude UI kit from coverage
        "src/test/**",
        "**/*.stories.tsx",
        "**/*.d.ts",
      ],
    },
  },
});
