// Direct AI SDK removed; using backend proxy
import { BackendAIService } from '../services/BackendAIService';

// No local initialization needed; BackendAIService handles authentication

/**
 * Service for interacting with the AI models (Gemini, Groq).
 * This service acts as a client for the backend proxy.
 */
export const AIService = {
    /**
     * Check if AI is available (proxy should be running)
     * Note: We don't check for API key in frontend anymore - the proxy handles it
     */
    static isAvailable() {
        // The proxy handles authentication, so we assume it's available
        // The proxy will return errors if not configured properly
        return true;
    },

    /**
     * Generate professional descriptions for budget items
     * @param {Object} itemData - Item information (code, unit, category)
     * @param {Array} context - Other items in budget for context
     * @returns {Promise<Array<string>>} - Array of 2-3 description suggestions
     */
    static async generateDescription(itemData, context = []) {
        const { code, unit, category, partialDescription } = itemData;

        // Build prompt
        const contextInfo = context.length > 0
            ? `\n\nContexto del presupuesto:\n${context.slice(0, 5).map(item => `- ${item.description} (${item.unit})`).join('\n')}`
            : '';

        const prompt = `Eres un experto en presupuestos de construcción en México. \nGenera 3 descripciones profesionales y técnicas para una partida de presupuesto con las siguientes características:\n\n- Código/Clave: ${code || 'No especificado'}\n- Unidad: ${unit || 'No especificada'}\n- Categoría: ${category || 'General'}\n${partialDescription ? `- Descripción parcial: ${partialDescription}` : ''}\n${contextInfo}\n\nRequisitos:\n1. Descripciones técnicas y profesionales\n2. Incluir especificaciones relevantes\n3. Usar terminología de construcción mexicana\n4. Máximo 100 caracteres cada una\n5. Diferentes niveles de detalle (básica, media, detallada)\n\nResponde SOLO con las 3 descripciones separadas por saltos de línea, sin numeración ni texto adicional.`;

        try {
            const result = await BackendAIService.sendPrompt(prompt);
            const text = result.candidates?.[0]?.content?.parts?.[0]?.text || '';
            const descriptions = text.split('\n').filter(l => l.trim().length > 0).slice(0, 3);
            return descriptions.length > 0 ? descriptions : [
                'Suministro y colocación de material',
                'Mano de obra y materiales incluidos',
                'Partida de construcción'
            ];
        } catch (error) {
            console.error('Error generating description with AI:', error);
            throw error;
        }
    },

    /**
     * Suggest price range based on catalog and context
     * @param {Object} itemData - Item information
     * @param {Array} catalogData - Catalog items for reference
     * @returns {Promise<Object>} - Price suggestion with range
     */
    static async suggestPrice(itemData, catalogData = []) {
        const { description, unit, category } = itemData;

        // Find similar items in catalog
        const similarItems = catalogData
            .filter(item =>
                item.unit === unit ||
                item.category === category ||
                item.description?.toLowerCase().includes(description?.toLowerCase().split(' ')[0])
            )
            .slice(0, 10);

        if (similarItems.length === 0) {
            return {
                suggested: null,
                min: null,
                max: null,
                confidence: 'low',
                message: 'No hay datos suficientes en el catálogo para sugerir un precio'
            };
        }

        // Calculate statistics - use unitPrice (not price)
        const prices = similarItems
            .map(item => item.unitPrice || item.price || 0)
            .filter(p => p > 0);

        // Prevent division by zero
        if (prices.length === 0) {
            return {
                suggested: null,
                min: null,
                max: null,
                confidence: 'low',
                message: 'No hay precios válidos en los items similares'
            };
        }

        const avg = prices.reduce((a, b) => a + b, 0) / prices.length;
        const min = Math.min(...prices);
        const max = Math.max(...prices);

        const catalogInfo = similarItems
            .map(item => `- ${item.description}: $${(item.unitPrice || item.price || 0).toFixed(2)} ${item.unit}`)
            .join('\n');

        const prompt = `Eres un experto en costos de construcción en México.\n\nBasándote en los siguientes precios de catálogo para partidas similares:\n\n${catalogInfo}\n\nSugiere un precio razonable para:\n- Descripción: ${description}\n- Unidad: ${unit}\n- Categoría: ${category || 'General'}\n\nEstadísticas del catálogo:\n- Precio promedio: $${avg.toFixed(2)}\n-- Rango: $${min.toFixed(2)} - $${max.toFixed(2)}\n\nResponde SOLO con un número (el precio sugerido en pesos mexicanos), sin símbolos ni texto adicional.`;

        try {
            const result = await BackendAIService.sendPrompt(prompt);
            const text = result.candidates?.[0]?.content?.parts?.[0]?.text || '';
            const suggestedPrice = parseFloat(text.replace(/[^0-9.]/g, ''));

            return {
                suggested: isNaN(suggestedPrice) ? avg : suggestedPrice,
                min: min * 0.8,
                max: max * 1.2,
                confidence: prices.length >= 5 ? 'high' : prices.length >= 2 ? 'medium' : 'low',
                similarCount: similarItems.length
            };
        } catch (error) {
            console.error('Error suggesting price with AI:', error);
            return {
                suggested: avg,
                min: min * 0.8,
                max: max * 1.2,
                confidence: 'medium',
                similarCount: similarItems.length
            };
        }
    },

    /**
     * Analyze budget and provide insights
     * @param {Array} items - Budget items
     * @param {Object} projectInfo - Project information
     * @returns {Promise<string>} - Analysis text
     */
    static async analyzeBudget(items, projectInfo) {
        const prompt = `Analiza este presupuesto de construcción:\n\n${JSON.stringify(items, null, 2)}\n\nTipo de proyecto: ${projectInfo.type || 'General'}\n\nBusca errores, precios inusuales, omisiones comunes y proporciona recomendaciones.`;

        const systemInstruction = `Eres "Doctor Obra", un experto auditor de presupuestos de construcción. Analiza presupuestos buscando errores, precios anómalos, omisiones y proporciona recomendaciones profesionales. Responde en HTML simple con formato claro.`;

        try {
            const result = await BackendAIService.sendPrompt(prompt, systemInstruction);
            return result.candidates?.[0]?.content?.parts?.[0]?.text || 'No se pudo generar el análisis.';
        } catch (error) {
            console.error('Error analyzing budget with AI:', error);
            throw error;
        }
    },
};

export default AIService;
