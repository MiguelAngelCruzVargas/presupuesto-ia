/**
 * Sentry Configuration
 * Monitoreo de errores en producción
 * Solo se inicializa si SENTRY_DSN está configurado
 * 
 * NOTA: Para usar Sentry, instala: npm install @sentry/react
 */

let Sentry = null;
let isInitialized = false;

// Cargar Sentry de forma dinámica solo si está disponible
async function loadSentry() {
    if (typeof window === 'undefined') return; // Solo en el cliente
    
    try {
        // Intentar importar Sentry dinámicamente
        const SentryModule = await import('@sentry/react').catch(() => null);
        
        if (SentryModule && (SentryModule.default || SentryModule)) {
            Sentry = SentryModule.default || SentryModule;
            initializeSentry();
        } else {
            console.log('📝 Sentry no está disponible. Para habilitar monitoreo de errores, ejecuta: npm install @sentry/react');
        }
    } catch (error) {
        // Sentry no está instalado o hubo error - esto es normal
        console.log('📝 Sentry no está disponible. Para habilitar monitoreo de errores, ejecuta: npm install @sentry/react');
    }
}

// Cargar Sentry cuando el módulo se importe (sin bloquear)
if (typeof window !== 'undefined') {
    // Usar setTimeout para no bloquear la carga inicial
    setTimeout(() => {
        loadSentry();
    }, 0);
}

function initializeSentry() {
    if (isInitialized || !Sentry) return;

    const dsn = import.meta.env.VITE_SENTRY_DSN;
    const environment = import.meta.env.MODE || 'development';
    
    // Solo inicializar si hay DSN configurado (producción)
    if (!dsn) {
        console.log('📝 Sentry no configurado (VITE_SENTRY_DSN no encontrado). Esto es normal en desarrollo.');
        return;
    }

    try {
        // Verificar que Sentry tenga el método init
        if (!Sentry || !Sentry.init) {
            console.warn('Sentry no está disponible correctamente');
            return;
        }

        const integrations = [];
        
        // Agregar integraciones solo si están disponibles
        if (Sentry.browserTracingIntegration) {
            integrations.push(Sentry.browserTracingIntegration());
        }
        if (Sentry.replayIntegration) {
            integrations.push(Sentry.replayIntegration({
                maskAllText: true,
                blockAllMedia: true,
            }));
        }

        Sentry.init({
            dsn,
            environment,
            integrations,
            
            // Performance Monitoring
            tracesSampleRate: environment === 'production' ? 0.1 : 1.0, // 10% en producción, 100% en desarrollo
            
            // Session Replay
            replaysSessionSampleRate: environment === 'production' ? 0.1 : 1.0,
            replaysOnErrorSampleRate: 1.0, // Siempre grabar cuando hay errores
            
            // Configuración adicional
            beforeSend(event, hint) {
                // Filtrar errores que no queremos reportar
                if (event.exception) {
                    const errorMessage = event.exception.values?.[0]?.value || '';
                    
                    // Filtrar errores comunes de red que no son críticos
                    if (errorMessage.includes('Failed to fetch') ||
                        errorMessage.includes('NetworkError') ||
                        errorMessage.includes('ERR_NAME_NOT_RESOLVED')) {
                        // Solo reportar si es error recurrente
                        return null;
                    }
                    
                    // Filtrar errores de validación del usuario (no son bugs)
                    if (errorMessage.includes('validation') && 
                        !errorMessage.includes('internal')) {
                        return null;
                    }
                }
                
                // Agregar información del usuario si está disponible
                if (window.user) {
                    event.user = {
                        id: window.user.id,
                        email: window.user.email,
                    };
                }
                
                return event;
            },
            
            // Ignorar ciertos errores
            ignoreErrors: [
                // Errores de red comunes
                'NetworkError',
                'Failed to fetch',
                'Network request failed',
                // Errores de extensiones del navegador
                'ResizeObserver loop limit exceeded',
                'Non-Error promise rejection captured',
                // Errores específicos del navegador
                'Script error',
            ],
        });
        
        isInitialized = true;
        console.log('✅ Sentry inicializado correctamente para:', environment);
    } catch (error) {
        console.error('❌ Error al inicializar Sentry:', error);
    }
}

/**
 * Obtener instancia de Sentry (solo si está inicializado)
 */
export function getSentry() {
    if (!isInitialized || !Sentry) return null;
    return Sentry;
}

/**
 * Verificar si Sentry está inicializado
 */
export function isSentryInitialized() {
    return isInitialized && Sentry !== null;
}

/**
 * Capturar excepción manualmente
 */
export function captureException(error, context = {}, level = 'error') {
    // Si Sentry no está instalado o inicializado, solo loggear
    if (!Sentry || !isInitialized) {
        console.error('[Error no enviado a Sentry]:', error, context);
        return;
    }
    
    try {
        if (Sentry.captureException) {
            Sentry.captureException(error, {
                level,
                extra: context,
                tags: {
                    source: context.source || 'manual',
                },
            });
        }
    } catch (err) {
        console.error('Error al capturar excepción en Sentry:', err);
    }
}

/**
 * Capturar mensaje manualmente
 */
export function captureMessage(message, level = 'info', context = {}) {
    // Si Sentry no está disponible, solo loggear
    if (!Sentry || !isInitialized) {
        console.log(`[${level.toUpperCase()}]`, message, context);
        return;
    }
    
    try {
        if (Sentry.captureMessage) {
            Sentry.captureMessage(message, {
                level,
                extra: context,
            });
        }
    } catch (err) {
        console.error('Error al capturar mensaje en Sentry:', err);
    }
}

/**
 * Configurar usuario para contexto de errores
 */
export function setSentryUser(user) {
    // Guardar en window para acceso rápido (siempre)
    if (typeof window !== 'undefined') {
        window.user = user;
    }
    
    if (!Sentry || !isInitialized) return;
    
    try {
        if (Sentry.setUser) {
            Sentry.setUser({
                id: user?.id,
                email: user?.email,
                username: user?.email?.split('@')[0],
            });
        }
    } catch (err) {
        console.error('Error al configurar usuario en Sentry:', err);
    }
}

/**
 * Limpiar usuario (al hacer logout)
 */
export function clearSentryUser() {
    // Limpiar siempre window.user
    if (typeof window !== 'undefined') {
        delete window.user;
    }
    
    if (!Sentry || !isInitialized) return;
    
    try {
        if (Sentry.setUser) {
            Sentry.setUser(null);
        }
    } catch (err) {
        console.error('Error al limpiar usuario en Sentry:', err);
    }
}

/**
 * Agregar contexto adicional a errores futuros
 */
export function setSentryContext(key, value) {
    if (!Sentry || !isInitialized) return;
    
    try {
        if (Sentry.setContext) {
            Sentry.setContext(key, value);
        }
    } catch (err) {
        console.error('Error al configurar contexto en Sentry:', err);
    }
}

export default {
    getSentry,
    isSentryInitialized,
    captureException,
    captureMessage,
    setSentryUser,
    clearSentryUser,
    setSentryContext,
};

