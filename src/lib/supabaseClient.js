import { createClient } from '@supabase/supabase-js';

// Detectar entorno para variables
const getEnvVar = (key) => {
    // Vite (Browser/Build)
    if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env[key]) {
        return import.meta.env[key];
    }
    // Node.js (Backend/Proxy)
    if (typeof process !== 'undefined' && process.env && process.env[key]) {
        return process.env[key];
    }
    return '';
};

const supabaseUrl = getEnvVar('VITE_SUPABASE_URL');
const supabaseAnonKey = getEnvVar('VITE_SUPABASE_ANON_KEY');

if (!supabaseUrl || !supabaseAnonKey) {
    console.warn('Supabase credentials not found. Running in offline mode.');
}

// Suprimir advertencias específicas de LockManager de Supabase
// Esta es una advertencia conocida que no afecta la funcionalidad
if (typeof console !== 'undefined' && typeof window !== 'undefined') {
    const originalWarn = console.warn;
    console.warn = function (...args) {
        const message = args[0]?.toString() || '';
        // Filtrar solo la advertencia específica de LockManager de gotrue-js
        if (message.includes('LockManager') && message.includes('gotrue-js')) {
            // Suprimir esta advertencia específica ya que no afecta la funcionalidad
            return;
        }
        originalWarn.apply(console, args);
    };
}

// Configuración de Supabase optimizada
export const supabase = createClient(supabaseUrl || '', supabaseAnonKey || '', {
    auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        flowType: 'pkce'
    },
    global: {
        headers: {
            'x-client-info': 'presugenius-web'
        }
    }
});

export default supabase;
