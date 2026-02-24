import React, { createContext, useState, useContext, useCallback, useEffect } from 'react';
import { setErrorContext } from '../services/ErrorService';

const ErrorContext = createContext();

export const useError = () => {
    const context = useContext(ErrorContext);
    if (!context) {
        // Retornar funciones vacías si el contexto no está disponible
        return {
            recentErrors: [],
            logError: () => {},
            getRecentErrors: () => [],
            getLastError: () => null,
            clearErrors: () => {},
            formatErrorForSupport: () => null,
        };
    }
    return context;
};

/**
 * Contexto para almacenar errores recientes y facilitar el reporte
 */
export const ErrorProvider = ({ children }) => {
    const [recentErrors, setRecentErrors] = useState([]);
    const MAX_STORED_ERRORS = 10; // Mantener solo los últimos 10 errores

    /**
     * Registrar un error reciente
     */
    const logError = useCallback((error, context = {}) => {
        const errorInfo = {
            id: Date.now(),
            timestamp: new Date(),
            message: error?.message || String(error),
            stack: error?.stack,
            context: {
                ...context,
                userAgent: navigator.userAgent,
                url: window.location.href,
                platform: navigator.platform,
            },
            error: error instanceof Error ? {
                name: error.name,
                message: error.message,
                stack: error.stack,
            } : null
        };

        setRecentErrors(prev => {
            const updated = [errorInfo, ...prev].slice(0, MAX_STORED_ERRORS);
            return updated;
        });

        // Guardar en localStorage para persistencia
        try {
            const stored = localStorage.getItem('presugenius_recent_errors');
            const parsed = stored ? JSON.parse(stored) : [];
            const updated = [errorInfo, ...parsed].slice(0, MAX_STORED_ERRORS);
            localStorage.setItem('presugenius_recent_errors', JSON.stringify(updated));
        } catch (e) {
            console.warn('No se pudo guardar error en localStorage:', e);
        }
    }, []);

    /**
     * Obtener errores recientes
     */
    const getRecentErrors = useCallback((limit = 5) => {
        return recentErrors.slice(0, limit);
    }, [recentErrors]);

    /**
     * Obtener el último error
     */
    const getLastError = useCallback(() => {
        return recentErrors[0] || null;
    }, [recentErrors]);

    /**
     * Limpiar errores almacenados
     */
    const clearErrors = useCallback(() => {
        setRecentErrors([]);
        try {
            localStorage.removeItem('presugenius_recent_errors');
        } catch (e) {
            console.warn('No se pudo limpiar errores de localStorage:', e);
        }
    }, []);

    /**
     * Formatear error para compartir con el asistente
     */
    const formatErrorForSupport = useCallback((errorId = null) => {
        const error = errorId 
            ? recentErrors.find(e => e.id === errorId)
            : recentErrors[0];

        if (!error) return null;

        return `
**Error Reportado:**
- **Mensaje:** ${error.message}
- **Fecha:** ${error.timestamp.toLocaleString('es-MX')}
- **URL:** ${error.context.url}
- **Página:** ${error.context.currentPage || 'Desconocida'}

${error.error?.stack ? `**Stack Trace:**\n\`\`\`\n${error.error.stack}\n\`\`\`` : ''}

${error.context.browser ? `**Navegador:** ${error.context.browser}` : ''}
${error.context.os ? `**Sistema Operativo:** ${error.context.os}` : ''}
        `.trim();
    }, [recentErrors]);

    // Cargar errores del localStorage al montar
    React.useEffect(() => {
        try {
            const stored = localStorage.getItem('presugenius_recent_errors');
            if (stored) {
                const parsed = JSON.parse(stored);
                // Convertir timestamps de string a Date
                const withDates = parsed.map(err => ({
                    ...err,
                    timestamp: new Date(err.timestamp)
                }));
                setRecentErrors(withDates.slice(0, MAX_STORED_ERRORS));
            }
        } catch (e) {
            console.warn('Error al cargar errores de localStorage:', e);
        }
    }, []);

    // Conectar con ErrorService cuando el contexto esté listo
    useEffect(() => {
        setErrorContext({
            logError,
            getRecentErrors,
            getLastError,
            clearErrors,
            formatErrorForSupport,
        });
    }, []);

    const value = {
        recentErrors,
        logError,
        getRecentErrors,
        getLastError,
        clearErrors,
        formatErrorForSupport,
    };

    return (
        <ErrorContext.Provider value={value}>
            {children}
        </ErrorContext.Provider>
    );
};

