import type { Preview } from "@storybook/react-vite";
import React from "react";

// Import Tailwind CSS styles
import "../src/styles/global.css";

const preview: Preview = {
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
    // Background options for light/dark mode testing
    backgrounds: {
      default: "light",
      values: [
        { name: "light", value: "#ffffff" },
        { name: "dark", value: "#18181b" }, // zinc-900
      ],
    },
    // Viewport presets for responsive testing
    viewport: {
      viewports: {
        mobile: {
          name: "Mobile",
          styles: { width: "375px", height: "667px" },
        },
        tablet: {
          name: "Tablet",
          styles: { width: "768px", height: "1024px" },
        },
        desktop: {
          name: "Desktop",
          styles: { width: "1280px", height: "800px" },
        },
      },
    },
  },
  // Global decorators
  decorators: [
    (Story, context) => {
      // Apply dark mode class based on selected background
      const isDark = context.globals.backgrounds?.value === "#18181b";

      return React.createElement(
        "div",
        {
          className: isDark ? "dark bg-zinc-900 min-h-screen p-4" : "p-4",
        },
        React.createElement(Story),
      );
    },
  ],
  // Global types for toolbar controls
  globalTypes: {
    backgrounds: {
      name: "Backgrounds",
      description: "Background color for components",
      toolbar: {
        icon: "paintbrush",
        items: [
          { value: "#ffffff", title: "Light" },
          { value: "#18181b", title: "Dark" },
        ],
        dynamicTitle: true,
      },
    },
  },
};

export default preview;
