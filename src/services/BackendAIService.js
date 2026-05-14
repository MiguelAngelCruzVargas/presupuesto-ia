// src/services/BackendAIService.js
// Wrapper around the Express proxy that forwards AI requests.
// It hides the API key from the client and returns the raw AI response.

const AI_CACHE_PREFIX = 'presupuesto_ia_ai_cache:';
const DEFAULT_CACHE_TTL_MS = 10 * 60 * 1000;
const DEFAULT_RETRY_DELAYS_MS = [700, 1400];
const memoryCache = new Map();

const safeStorage = {
    get(key) {
        if (typeof localStorage === 'undefined') return null;
        try {
            return localStorage.getItem(key);
        } catch {
            return null;
        }
    },
    set(key, value) {
        if (typeof localStorage === 'undefined') return;
        try {
            localStorage.setItem(key, value);
        } catch {
            // Ignore cache write failures.
        }
    },
    remove(key) {
        if (typeof localStorage === 'undefined') return;
        try {
            localStorage.removeItem(key);
        } catch {
            // Ignore cache delete failures.
        }
    }
};

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const isRetryableError = (error) => {
    const statusCode = error?.statusCode;
    const message = String(error?.message || '').toLowerCase();

    if ([401, 403, 404].includes(statusCode)) return false;
    if (
        message.includes('api key') ||
        message.includes('inválida') ||
        message.includes('invalida') ||
        message.includes('no tiene permisos') ||
        message.includes('respuesta inválida')
    ) {
        return false;
    }

    return (
        [429, 500, 502, 503, 504].includes(statusCode) ||
        message.includes('failed to fetch') ||
        message.includes('network') ||
        message.includes('sobrecargado') ||
        message.includes('overloaded') ||
        message.includes('resource') ||
        message.includes('agotado') ||
        message.includes('quota') ||
        message.includes('limit exceeded') ||
        message.includes('respuesta vacía')
    );
};

const normalizeError = (error) => {
    if (!error) return new Error('Error desconocido');

    if (String(error.message || '').includes('Failed to fetch') || String(error.message || '').includes('NetworkError')) {
        const networkError = new Error('No se pudo conectar al servidor de IA. Verifica que el proxy de IA esté corriendo (puerto 4001).');
        networkError.statusCode = error.statusCode;
        return networkError;
    }

    if (String(error.message || '').includes('404')) {
        const notFoundError = new Error('Servidor de IA no encontrado. Ejecuta: npm run ai-proxy');
        notFoundError.statusCode = error.statusCode || 404;
        return notFoundError;
    }

    return error;
};

const buildCacheKey = (prompt, systemInstruction, explicitKey) => {
    if (explicitKey) {
        return `${AI_CACHE_PREFIX}${explicitKey}`;
    }

    const payload = JSON.stringify({
        prompt: String(prompt || ''),
        systemInstruction: String(systemInstruction || '')
    });

    let hash = 0;
    for (let i = 0; i < payload.length; i++) {
        hash = ((hash << 5) - hash) + payload.charCodeAt(i);
        hash |= 0;
    }

    return `${AI_CACHE_PREFIX}${hash}`;
};

const readCache = (cacheKey, ttlMs) => {
    const now = Date.now();
    const memoryHit = memoryCache.get(cacheKey);
    if (memoryHit && (now - memoryHit.savedAt) < ttlMs) {
        return memoryHit.value;
    }

    const stored = safeStorage.get(cacheKey);
    if (!stored) return null;

    try {
        const parsed = JSON.parse(stored);
        if (!parsed?.savedAt || (now - parsed.savedAt) >= ttlMs) {
            safeStorage.remove(cacheKey);
            return null;
        }

        memoryCache.set(cacheKey, parsed);
        return parsed.value;
    } catch {
        safeStorage.remove(cacheKey);
        return null;
    }
};

const writeCache = (cacheKey, value) => {
    const payload = {
        savedAt: Date.now(),
        value
    };

    memoryCache.set(cacheKey, payload);
    safeStorage.set(cacheKey, JSON.stringify(payload));
};

const parseResponseBody = async (response) => {
    const text = await response.text();
    if (!text || !text.trim()) {
        throw new Error('Respuesta vacía del servidor de IA');
    }

    try {
        return JSON.parse(text);
    } catch {
        throw new Error('Respuesta inválida del servidor de IA. Verifica que el proxy esté configurado correctamente.');
    }
};

export const BackendAIService = {
    async getUsageStatus() {
        const response = await fetch('/api/ai/usage');

        if (!response.ok) {
            throw new Error(`No se pudo cargar el estado de uso de la IA (${response.status})`);
        }

        return response.json();
    },

    /**
     * Send a prompt to the AI proxy.
     * @param {string} prompt - User prompt.
     * @param {string} [systemInstruction] - Optional system instruction.
     * @param {Object} [options] - Retry/cache options.
     * @returns {Promise<Object>} - Raw AI response JSON.
     */
    async sendPrompt(prompt, systemInstruction, options = {}) {
        const {
            cache = true,
            cacheKey: explicitCacheKey,
            cacheTtlMs = DEFAULT_CACHE_TTL_MS,
            forceRefresh = false,
            retryDelaysMs = DEFAULT_RETRY_DELAYS_MS
        } = options || {};

        const cacheKey = buildCacheKey(prompt, systemInstruction, explicitCacheKey);

        if (cache && !forceRefresh) {
            const cached = readCache(cacheKey, cacheTtlMs);
            if (cached) {
                return cached;
            }
        }

        let lastError = null;

        for (let attempt = 0; attempt <= retryDelaysMs.length; attempt++) {
            try {
                const body = { prompt };
                if (systemInstruction) body.systemInstruction = systemInstruction;

                const response = await fetch('/api/ai', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(body),
                });

                if (!response.ok) {
                    let errorMessage = `Error ${response.status}: ${response.statusText}`;
                    let errorDetails = null;

                    try {
                        const errorText = await response.text();
                        try {
                            const err = JSON.parse(errorText);
                            errorMessage = err.error || errorMessage;
                            errorDetails = err.details;
                        } catch {
                            if (errorText && errorText.length < 200) {
                                errorMessage = errorText;
                            }
                        }
                    } catch {
                        // Ignore response body issues.
                    }

                    if (response.status === 404) {
                        errorMessage = 'Servidor de IA no disponible. Ejecuta: npm run ai-proxy';
                    } else if (response.status === 401 || response.status === 403) {
                        errorMessage = errorMessage || 'La API key del proveedor de IA es inválida o no tiene permisos.';
                    } else if (response.status === 429) {
                        errorMessage = 'Has excedido el límite de consultas a la IA. Espera un momento antes de intentar de nuevo.';
                    } else if (response.status === 500 || response.status === 503) {
                        const lowerError = errorMessage.toLowerCase();

                        if (lowerError.includes('overloaded') || lowerError.includes('model is overloaded')) {
                            errorMessage = '⚠️ El servicio de IA está sobrecargado en este momento. Por favor intenta de nuevo en 30-60 segundos.';
                        } else if (lowerError.includes('quota') || lowerError.includes('limit exceeded')) {
                            errorMessage = '⚠️ Has alcanzado el límite de uso del servicio de IA. Por favor intenta más tarde o verifica tu cuota de API.';
                        } else if (lowerError.includes('resource') && lowerError.includes('exhausted')) {
                            errorMessage = '⚠️ El servicio de IA está temporalmente agotado. Por favor intenta en unos minutos.';
                        } else if (!errorMessage || errorMessage.includes('Internal Server Error')) {
                            errorMessage = 'Error interno del servidor. Por favor intenta de nuevo en unos momentos o contacta a soporte si el problema persiste.';
                        }
                    }

                    const fullError = new Error(errorMessage);
                    fullError.statusCode = response.status;
                    if (errorDetails) {
                        fullError.details = errorDetails;
                    }
                    throw fullError;
                }

                const parsed = await parseResponseBody(response);
                if (cache) {
                    writeCache(cacheKey, parsed);
                }
                return parsed;
            } catch (error) {
                const normalized = normalizeError(error);
                lastError = normalized;

                if (!isRetryableError(normalized) || attempt === retryDelaysMs.length) {
                    console.error('BackendAIService error:', normalized);
                    throw normalized;
                }

                await delay(retryDelaysMs[attempt]);
            }
        }

        throw normalizeError(lastError);
    },
};
