// For more info, see https://github.com/storybookjs/eslint-plugin-storybook#configuration-flat-config-format
import storybook from "eslint-plugin-storybook";

import eslintPluginAstro from "eslint-plugin-astro";
import tseslint from "typescript-eslint";

export default [
  {
    ignores: [
      ".astro/",
      "dist/",
      "node_modules/",
      "backend/pb_data/",
      "backend/pb_migrations/", // use PocketBase JSVM globals (migrate, Collection, ...)
      "catalyst-ui-kit/",
      "storybook-static/",
    ],
  },
  ...tseslint.configs.recommended,
  ...eslintPluginAstro.configs["flat/recommended"],
  ...eslintPluginAstro.configs["flat/jsx-a11y-recommended"],
  {
    files: ["**/*.{ts,tsx}"],
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
    },
  },
  {
    // Node scripts and tests under backend/test and backend/scripts (not the
    // PocketBase JSVM).
    files: ["backend/test/**/*.mjs", "backend/scripts/**/*.mjs"],
    languageOptions: {
      globals: Object.fromEntries(
        [
          "AbortSignal",
          "Buffer",
          "FormData",
          "URLSearchParams",
          "clearTimeout",
          "console",
          "fetch",
          "process",
          "setTimeout",
        ].map((name) => [name, "readonly"]),
      ),
    },
  },
  ...storybook.configs["flat/recommended"],
];
