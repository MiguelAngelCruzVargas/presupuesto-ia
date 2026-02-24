import React, { createContext, useContext, useState, useEffect } from 'react';

const ThemeContext = createContext();

export const useTheme = () => {
    const context = useContext(ThemeContext);
    if (!context) {
        throw new Error('useTheme must be used within a ThemeProvider');
    }
    return context;
};

export const ThemeProvider = ({ children }) => {
    // Leer preferencia guardada o usar preferencia del sistema
    const getInitialTheme = () => {
        // Verificar que estamos en el cliente
        if (typeof window === 'undefined') {
            return false;
        }
        
        try {
            const savedTheme = localStorage.getItem('presugenius_theme');
            if (savedTheme) {
                return savedTheme === 'dark';
            }
            // Detectar preferencia del sistema
            if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
                return true;
            }
        } catch (e) {
            console.warn('Error reading theme preference:', e);
        }
        return false;
    };

    const [isDark, setIsDark] = useState(() => {
        // Lazy initialization para evitar problemas en SSR
        return getInitialTheme();
    });

    useEffect(() => {
        // Verificar que estamos en el cliente
        if (typeof window === 'undefined' || typeof document === 'undefined') {
            return;
        }
        
        // Aplicar tema al documento
        if (isDark) {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }
        
        // Guardar preferencia
        try {
            localStorage.setItem('presugenius_theme', isDark ? 'dark' : 'light');
        } catch (e) {
            console.warn('Error saving theme preference:', e);
        }
    }, [isDark]);

    // Escuchar cambios en la preferencia del sistema
    useEffect(() => {
        if (typeof window === 'undefined' || !window.matchMedia) {
            return;
        }
        
        try {
            const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
            const handleChange = (e) => {
                // Solo aplicar si no hay preferencia guardada
                try {
                    if (!localStorage.getItem('presugenius_theme')) {
                        setIsDark(e.matches);
                    }
                } catch (err) {
                    console.warn('Error reading theme preference:', err);
                }
            };
            mediaQuery.addEventListener('change', handleChange);
            return () => mediaQuery.removeEventListener('change', handleChange);
        } catch (e) {
            console.warn('Error setting up theme listener:', e);
        }
    }, []);

    const toggleTheme = () => {
        setIsDark(!isDark);
    };

    const value = {
        isDark,
        toggleTheme,
        setTheme: setIsDark
    };

    return (
        <ThemeContext.Provider value={value}>
            {children}
        </ThemeContext.Provider>
    );
};

