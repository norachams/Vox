/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: "#464D77", // YInMn Blue
        accent: "#F9DB6D",  // Naples Yellow
        bg: "#E8DFDE",      // Platinum
        neutral: "#877666", // Beaver
        teal: "#36827F",    // Teal
      },
    },
  },
  plugins: [],
}

