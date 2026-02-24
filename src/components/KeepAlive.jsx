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
            try {
                // Hacemos una petición al Proxy de IA para mantenerlo despierto
                const apiBaseUrl = import.meta.env.VITE_API_URL || 'http://localhost:4001';
                // Intentamos un endpoint simple o la raíz del API
                await fetch(`${apiBaseUrl}/api/ai/health`, { mode: 'no-cors' }).catch(() => {
                    // Si el endpoint /health no existe, al menos el request llegó al servidor
                    fetch(`${apiBaseUrl}/`, { mode: 'no-cors' }).catch(() => { });
                });
                console.log(`[KeepAlive] Pulso a Render enviado - ${new Date().toLocaleTimeString()}`);
            } catch (err) {
                // Ignoramos errores de red, lo importante es el intento de conexión
            }
        };

        const sendSupabasePulse = async () => {
            try {
                // Una consulta simple a cualquier tabla (usamos una que sea probable que exista)
                await supabase.from('projects').select('id').limit(1);
                console.log(`[KeepAlive] Pulso a Supabase exitoso - ${new Date().toLocaleTimeString()}`);
            } catch (err) {
                console.warn('[KeepAlive] Error en pulso Supabase:', err.message);
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
