/**
 * ErrorService
 * Centralized error handling and user-friendly error messages
 * Integrado con Sentry para monitoreo en producción
 */

import { captureException, captureMessage } from '../lib/sentry';

// Variable global para almacenar el contexto de errores (se inyectará desde ErrorContext)
let errorContextRef = null;

export const setErrorContext = (context) => {
    errorContextRef = context;
};

export class ErrorService {
    /**
     * Get user-friendly error message
     * @param {Error|string} error - Error object or message
     * @returns {string}
     */
    static getErrorMessage(error) {
        if (typeof error === 'string') {
            return error;
        }

        if (!error) {
            return 'Ha ocurrido un error desconocido';
        }

        // Network errors
        if (error.message?.includes('fetch') || error.message?.includes('network')) {
            return 'Error de conexión. Verifica tu internet e intenta de nuevo.';
        }

        // API errors
        if (error.message?.includes('API') || error.message?.includes('Gemini')) {
            return 'Error al conectar con el servicio de IA. Intenta más tarde.';
        }

        // Overloaded/Service unavailable errors
        if (error.message?.includes('overloaded') || error.message?.includes('sobrecargado')) {
            return '⚠️ El servicio de IA está sobrecargado en este momento. Por favor espera 30-60 segundos e intenta de nuevo.';
        }

        if (error.message?.includes('quota') || error.message?.includes('limit exceeded') || error.message?.includes('límite')) {
            return '⚠️ Has alcanzado el límite de uso del servicio de IA. Por favor intenta más tarde.';
        }

        // Supabase errors
        if (error.message?.includes('JWT') || error.message?.includes('auth')) {
            return 'Error de autenticación. Por favor, inicia sesión nuevamente.';
        }

        if (error.message?.includes('permission') || error.message?.includes('policy')) {
            return 'No tienes permisos para realizar esta acción.';
        }

        // JSON parsing errors
        if (error.message?.includes('JSON') || error.message?.includes('parse')) {
            return 'Error al procesar los datos. Verifica el formato.';
        }

        // Validation errors
        if (error.message?.includes('validation') || error.message?.includes('valid')) {
            return error.message;
        }

        // Default: return the error message or a generic one
        return error.message || 'Ha ocurrido un error. Intenta nuevamente.';
    }

    /**
     * Log error with context
     * @param {Error|string} error - Error to log
     * @param {string} context - Context where error occurred
     * @param {Object} metadata - Additional metadata
     * @param {string} level - Error level: 'error', 'warning', 'info'
     */
    static logError(error, context = 'Unknown', metadata = {}, level = 'error') {
        const errorMessage = this.getErrorMessage(error);
        
        console.error(`[${context}]`, {
            error: errorMessage,
            originalError: error,
            metadata,
            timestamp: new Date().toISOString()
        });

        // Registrar en el contexto de errores para que el asistente pueda acceder
        if (errorContextRef && errorContextRef.logError) {
            try {
                errorContextRef.logError(error, {
                    context,
                    ...metadata,
                    currentPage: window.location.pathname,
                });
            } catch (e) {
                console.warn('Error al registrar en ErrorContext:', e);
            }
        }

        // Enviar a Sentry si está configurado (solo en producción)
        try {
            const errorObj = error instanceof Error ? error : new Error(errorMessage);
            
            // Agregar contexto adicional al error
            errorObj.context = context;
            errorObj.metadata = metadata;
            
            captureException(errorObj, {
                context,
                ...metadata,
                userFriendlyMessage: errorMessage,
            }, level);
        } catch (sentryError) {
            // Si Sentry falla, continuar sin interrumpir
            console.warn('Error al enviar a Sentry:', sentryError);
        }
    }

    /**
     * Handle API error with retry logic
     * @param {Function} fn - Function to retry
     * @param {number} maxRetries - Maximum number of retries
     * @param {number} delay - Delay between retries in ms
     * @returns {Promise}
     */
    static async withRetry(fn, maxRetries = 3, delay = 1000) {
        let lastError;
        
        for (let i = 0; i < maxRetries; i++) {
            try {
                return await fn();
            } catch (error) {
                lastError = error;
                
                // Don't retry on certain errors
                if (error.message?.includes('validation') || 
                    error.message?.includes('permission') ||
                    error.message?.includes('auth')) {
                    throw error;
                }
                
                if (i < maxRetries - 1) {
                    await new Promise(resolve => setTimeout(resolve, delay * (i + 1)));
                }
            }
        }
        
        throw lastError;
    }
}

export default ErrorService;

