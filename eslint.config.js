// For more info, see https://github.com/storybookjs/eslint-plugin-storybook#configuration-flat-config-format
import eslintPluginAstro from "eslint-plugin-astro";
import tseslint from "typescript-eslint";

async function loadStorybookConfig() {
  try {
    const storybook = await import("eslint-plugin-storybook");
    return storybook.default.configs["flat/recommended"];
  } catch (error) {
    if (
      error?.code === "ERR_MODULE_NOT_FOUND" &&
      error?.message?.includes("eslint-plugin-storybook")
    ) {
      return [];
    }
    throw error;
  }
}

const storybookConfig = await loadStorybookConfig();

export default [
  {
    ignores: [
      ".astro/",
      "dist/",
      "node_modules/",
      "backend/",
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
  ...storybookConfig,
];
