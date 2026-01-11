import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

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
