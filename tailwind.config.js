import {UWELL_COLOR} from "./src/styles/theme.ts";

/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        midGray: UWELL_COLOR.midGray,
        mainRed: UWELL_COLOR.mainRed,
        textGray: UWELL_COLOR.textGray,
      }
    },
    fontFamily: {
      sans: ['Inter', 'sans-serif'],
    },
  },
  plugins: [],
}

