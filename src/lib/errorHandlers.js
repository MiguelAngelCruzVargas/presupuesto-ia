/**
 * Error Handlers Globales
 * Captura errores no manejados de JavaScript
 */

import { captureException, captureMessage } from './sentry';

/**
 * Configurar handlers de errores globales
 */
export function setupGlobalErrorHandlers() {
    // Error handler para errores no capturados
    window.addEventListener('error', (event) => {
        // Ignorar errores de recursos externos (scripts, imágenes, etc.)
        if (event.target && event.target !== window) {
            return;
        }

        captureException(event.error || new Error(event.message), {
            source: 'window.error',
            filename: event.filename,
            lineno: event.lineno,
            colno: event.colno,
        }, 'error');
    });

    // Handler para promesas rechazadas no manejadas
    window.addEventListener('unhandledrejection', (event) => {
        // Ignorar errores de validación del usuario
        const errorMessage = event.reason?.message || String(event.reason);
        
        if (errorMessage.includes('validation') && 
            !errorMessage.includes('internal')) {
            return;
        }

        captureException(
            event.reason instanceof Error 
                ? event.reason 
                : new Error(String(event.reason)),
            {
                source: 'unhandledrejection',
                promise: true,
            },
            'error'
        );
    });

    // Handler para errores de consola (opcional, solo en desarrollo)
    if (import.meta.env.DEV) {
        const originalConsoleError = console.error;
        console.error = (...args) => {
            originalConsoleError.apply(console, args);
            
            // Capturar solo errores críticos en desarrollo
            if (args.length > 0 && args[0] instanceof Error) {
                captureMessage('Console Error (Development)', 'warning', {
                    error: args[0].message,
                    stack: args[0].stack,
                });
            }
        };
    }

    console.log('✅ Global error handlers configurados');
}

/**
 * Inicializar handlers cuando la app esté lista
 */
if (typeof window !== 'undefined') {
    // Esperar a que el DOM esté listo
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', setupGlobalErrorHandlers);
    } else {
        setupGlobalErrorHandlers();
    }
}

