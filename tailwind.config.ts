import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        // Royal blue brand palette (base ~ #4169E1).
        royal: {
          50: "#eef2fd",
          100: "#dbe4fb",
          200: "#b8c9f7",
          300: "#8fa8f0",
          400: "#6483e8",
          500: "#4169e1",
          600: "#3454c4",
          700: "#2c46a3",
          800: "#253a82",
          900: "#1f2f67",
        },
      },
    },
  },
  plugins: [],
};
export default config;
