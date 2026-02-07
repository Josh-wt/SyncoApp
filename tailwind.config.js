/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./App.{js,jsx,ts,tsx}",
    "./screens/**/*.{js,jsx,ts,tsx}",
    "./components/**/*.{js,jsx,ts,tsx}",
  ],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        primary: "#2f00ff",
        "accent-purple": "#a855f7",
        "background-light": "#f6f1ff",
        "background-dark": "#130f23",
      },
      fontFamily: {
        display: ["BricolageGrotesque-Regular"],
      },
      borderRadius: {
        DEFAULT: "1rem",
        lg: "2rem",
        xl: "3rem",
      },
      boxShadow: {
        glass: "0 8px 32px 0 rgba(31, 38, 135, 0.07)",
        glow: "0 0 60px -15px rgba(47, 0, 255, 0.3)",
        "glow-purple": "0 0 80px -20px rgba(168, 85, 247, 0.4)",
      },
    },
  },
  plugins: [],
};
