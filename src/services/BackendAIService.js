// src/services/BackendAIService.js
// Wrapper around the Express proxy that forwards AI requests.
// It hides the API key from the client and returns the raw AI response.

export const BackendAIService = {
    /**
     * Send a prompt to the AI proxy.
     * @param {string} prompt - User prompt.
     * @param {string} [systemInstruction] - Optional system instruction.
     * @returns {Promise<Object>} - Raw AI response JSON.
     */
    async sendPrompt(prompt, systemInstruction) {
        try {
            const body = { prompt };
            if (systemInstruction) body.systemInstruction = systemInstruction;

            const response = await fetch('/api/ai', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            });

            // Check if response is ok
            if (!response.ok) {
                // Try to get error message from response
                let errorMessage = `Error ${response.status}: ${response.statusText}`;
                let errorDetails = null;

                try {
                    const errorText = await response.text();
                    try {
                        const err = JSON.parse(errorText);
                        errorMessage = err.error || errorMessage;
                        errorDetails = err.details;
                    } catch (e) {
                        // If response is not JSON, use the text if it's short enough, otherwise stick to status
                        if (errorText && errorText.length < 200) {
                            errorMessage = errorText;
                        }
                    }
                } catch (e) {
                    // Ignore reading error
                }

                // Enhance error message based on status code and content
                if (response.status === 404) {
                    errorMessage = 'Servidor de IA no disponible. Ejecuta: npm run ai-proxy';
                } else if (response.status === 429) {
                    errorMessage = 'Has excedido el límite de consultas gratuitas a la IA. Por favor espera 1 minuto antes de intentar de nuevo.';
                } else if (response.status === 500 || response.status === 503) {
                    // Detectar errores específicos de AI API
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
                if (errorDetails) {
                    fullError.details = errorDetails;
                }
                throw fullError;
            }

            // Check if response has content
            const text = await response.text();
            if (!text || text.trim() === '') {
                throw new Error('Respuesta vacía del servidor de IA');
            }

            // Parse JSON
            try {
                return JSON.parse(text);
            } catch (parseError) {
                throw new Error('Respuesta inválida del servidor de IA. Verifica que el proxy esté configurado correctamente.');
            }
        } catch (error) {
            // Improve error messages
            if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
                throw new Error('No se pudo conectar al servidor de IA. Verifica que el proxy de IA esté corriendo (puerto 4001).');
            }
            if (error.message.includes('404')) {
                throw new Error('Servidor de IA no encontrado. Ejecuta: npm run ai-proxy');
            }
            console.error('BackendAIService error:', error);
            throw error;
        }
    },
};
