/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["JetBrains Mono", "ui-monospace", "monospace"],
      },
      colors: {
        panel: "#1a1d23",
        surface: "#22262e",
        accent: "#3b82f6",
        muted: "#6b7280",
      },
    },
  },
  plugins: [],
};
