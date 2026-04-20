/**@type {import('tailwindcss').Config} **/
export const content = [
    "./app/**/*.{js,ts,jsx,tsx}",
    "./pages/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}"
];
export const theme = {
    extend: {
        colors: {
            blue: {
                1: '#0E78F9',
                'rgb-example': 'rgb(255, 0, 0)'
            }
        },
        backgroundImage: {
            hero: "url('/images/hero-bg.webp')",
        },
    },
};
export const plugins = [];
