/** @type {import('tailwindcss').Config} */
export default {
    darkMode: 'class', // Habilitar modo oscuro con clase
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            screens: {
                // Celulares en horizontal / pantallas muy angostas.
                // Ya se usaba xs: en el código pero no estaba definido,
                // así que esas clases no se generaban.
                xs: '480px',
            },
        },
    },
    plugins: [],
}
