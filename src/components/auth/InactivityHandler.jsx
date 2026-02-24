import React, { useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';

// 1 Hora en milisegundos
const INACTIVITY_LIMIT_MS = 60 * 60 * 1000;

const InactivityHandler = () => {
    const { user, signOut } = useAuth();
    const navigate = useNavigate();
    const timerRef = useRef(null);

    const handleLogout = useCallback(async () => {
        if (user) {
            console.log('Sesión cerrada automáticamente por inactividad');
            await signOut();
            // Redirigir a login con un parámetro para (opcionalmente) mostrar un mensaje
            navigate('/login?reason=inactivity', { replace: true });
        }
    }, [user, signOut, navigate]);

    const resetTimer = useCallback(() => {
        if (timerRef.current) {
            clearTimeout(timerRef.current);
        }
        if (user) {
            timerRef.current = setTimeout(handleLogout, INACTIVITY_LIMIT_MS);
        }
    }, [user, handleLogout]);

    useEffect(() => {
        // Solo activar si hay un usuario logueado
        if (!user) return;

        // Eventos a monitorear
        const events = ['mousemove', 'keydown', 'click', 'scroll', 'touchstart'];

        // Handler para eventos de actividad
        // Usamos un throttle simple para no llamar a resetTimer en cada pixel de movimiento
        let lastReset = Date.now();
        const handleActivity = () => {
            const now = Date.now();
            // Solo reiniciar si ha pasado más de 1 segundo desde el último reinicio
            // para mejorar el rendimiento
            if (now - lastReset > 1000) {
                resetTimer();
                lastReset = now;
            }
        };

        // Iniciar timer inicial
        resetTimer();

        // Agregar listeners globales
        events.forEach(event => {
            window.addEventListener(event, handleActivity);
        });

        // Cleanup al desmontar o cambiar de usuario
        return () => {
            if (timerRef.current) clearTimeout(timerRef.current);
            events.forEach(event => {
                window.removeEventListener(event, handleActivity);
            });
        };
    }, [user, resetTimer]);

    return null; // Este componente no renderiza nada visualmente
};

export default InactivityHandler;
