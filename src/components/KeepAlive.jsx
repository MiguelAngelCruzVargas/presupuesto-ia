import { useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { APP_CONFIG } from '../config/appConfig';

/**
 * KeepAlive Component
 * 
 * Este componente envía un "pulso" a Supabase y al Servidor Proxy (Render) 
 * para evitar que entren en modo de pausa por inactividad.
 */
export default function KeepAlive() {
    useEffect(() => {
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
        const renderTimer = setInterval(sendRenderPulse, APP_CONFIG.renderKeepAliveIntervalMs);
        const supabaseTimer = setInterval(sendSupabasePulse, APP_CONFIG.supabaseKeepAliveIntervalMs);

        return () => {
            clearInterval(renderTimer);
            clearInterval(supabaseTimer);
        };
    }, []);

    return null;
}
