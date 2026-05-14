import { useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';

/**
 * KeepAlive Component
 * 
 * Este componente envía un "pulso" a Supabase y al Servidor Proxy (Render) 
 * para evitar que entren en modo de pausa por inactividad.
 */
export default function KeepAlive() {
    useEffect(() => {
        // Render Free suspende la app tras 15 MINUTOS de inactividad.
        // Usamos 10 minutos para estar seguros mientras el usuario tenga la pestaña abierta.
        const RENDER_INTERVAL = 10 * 60 * 1000;

        // Supabase Free pausa el proyecto tras 7 DÍAS de inactividad.
        // Un pulso cada 24 horas es más que suficiente para esto.
        const SUPABASE_INTERVAL = 24 * 60 * 60 * 1000;

        const sendRenderPulse = async () => {
            // Solo enviar pulso si hay API configurada (producción o backend en 4001); evita ERR_CONNECTION_REFUSED en dev sin servidor
            const apiBaseUrl = import.meta.env.VITE_API_URL;
            if (!apiBaseUrl) return;
            try {
                await fetch(`${apiBaseUrl}/api/ai/health`, { mode: 'no-cors' }).catch(() => {
                    fetch(`${apiBaseUrl}/`, { mode: 'no-cors' }).catch(() => {});
                });
            } catch {
                // Silenciar: servidor no disponible
            }
        };

        const sendSupabasePulse = async () => {
            try {
                await supabase.from('projects').select('id').limit(1);
            } catch {
                // Silenciar: conexión o permisos
            }
        };

        // Ejecutar inmediatamente
        sendRenderPulse();
        sendSupabasePulse();

        // Configurar intervalos
        const renderTimer = setInterval(sendRenderPulse, RENDER_INTERVAL);
        const supabaseTimer = setInterval(sendSupabasePulse, SUPABASE_INTERVAL);

        return () => {
            clearInterval(renderTimer);
            clearInterval(supabaseTimer);
        };
    }, []);

    return null;
}
