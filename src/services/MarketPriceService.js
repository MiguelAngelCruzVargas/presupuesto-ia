/**
 * MarketPriceService
 * Servicio para gestionar precios de referencia del mercado
 * Se usa cuando el usuario no tiene un concepto en su catálogo personal
 */

import { supabase } from '../lib/supabaseClient';

export class MarketPriceService {
    /**
     * Buscar precio de referencia por descripción, categoría y ubicación
     * Prioriza precios oficiales (CDMX Tabulador) sobre otras fuentes
     * @param {string} description - Descripción del concepto
     * @param {string} category - Categoría (Materiales, Mano de Obra, etc.)
     * @param {string} location - Ubicación (México, CDMX, Monterrey, etc.)
     * @param {number} limit - Máximo de resultados
     * @returns {Promise<Array>} - Array de precios de referencia (ordenados por prioridad)
     */
    static async findReferencePrice(description, category, location = 'México', limit = 5) {
        try {
            if (!description || !category) {
                return [];
            }

            const officialSources = ['cdmx_tabulador'];
            const isCDMX = location && (location.includes('CDMX') || location.includes('Ciudad de México'));

            // Buscar todos los precios de la categoría
            let query = supabase
                .from('market_price_reference')
                .select('*')
                .eq('category', category)
                .eq('is_active', true);

            // Filtrar por ubicación
            let locationConditions = [];
            if (isCDMX) {
                locationConditions.push('location.ilike.%CDMX%');
                locationConditions.push('location.ilike.%Ciudad de México%');
                locationConditions.push('location.eq.México');
            } else {
                // Simplificar la ubicación para evitar errores con comas en Supabase
                const simpleLocation = location.split(',')[0].trim();
                const searchLocation = simpleLocation.includes('%') ? simpleLocation : `%${simpleLocation}%`;

                // Usar comillas para manejar espacios y caracteres especiales
                locationConditions.push(`location.ilike."${searchLocation}"`);
                locationConditions.push('location.eq.México');
            }
            query = query.or(locationConditions.join(','));

            const { data, error } = await query;
            if (error) throw error;

            if (!data || data.length === 0) {
                // Fallback: buscar en "México" genérico
                const { data: fallbackData, error: fallbackError } = await supabase
                    .from('market_price_reference')
                    .select('*')
                    .eq('category', category)
                    .eq('is_active', true)
                    .eq('location', 'México')
                    .limit(limit);

                if (fallbackError) throw fallbackError;
                return fallbackData || [];
            }

            // Calcular relevancia y priorizar fuentes oficiales
            const descriptionTerms = description.toLowerCase().split(/\s+/).filter(t => t.length > 3);
            const scoredResults = data.map(item => {
                let score = 0;
                const itemText = item.description.toLowerCase();

                // Puntos por coincidencias en descripción
                descriptionTerms.forEach(term => {
                    if (itemText.includes(term)) score += 1;
                });

                // Bonificación por ser fuente oficial (CDMX Tabulador)
                if (officialSources.includes(item.source)) {
                    score += 10;
                }

                // Bonificación por ubicación específica (CDMX para proyectos CDMX)
                if (isCDMX && (item.location?.includes('CDMX') || item.location?.includes('Ciudad de México'))) {
                    score += 5;
                }

                return { ...item, relevanceScore: score };
            });

            // Ordenar por relevancia (oficiales primero)
            const sorted = scoredResults.sort((a, b) => {
                // Primero por score de relevancia
                if (b.relevanceScore !== a.relevanceScore) {
                    return b.relevanceScore - a.relevanceScore;
                }
                // Si mismo score, priorizar oficiales
                const aOfficial = officialSources.includes(a.source) ? 1 : 0;
                const bOfficial = officialSources.includes(b.source) ? 1 : 0;
                return bOfficial - aOfficial;
            });

            return sorted.slice(0, limit);

        } catch (error) {
            console.error('Error finding reference price:', error);
            return [];
        }
    }

    /**
     * Buscar precios en la base de datos maestra con paginación
     * @param {string} query - Término de búsqueda
     * @param {number} page - Número de página (1-based)
     * @param {number} limit - Resultados por página
     * @returns {Promise<{data: Array, count: number}>}
     */
    static async searchPrices(query = '', page = 1, limit = 50) {
        try {
            const from = (page - 1) * limit;
            const to = from + limit - 1;

            let dbQuery = supabase
                .from('market_price_reference')
                .select('*', { count: 'exact' })
                .eq('is_active', true)
                .order('description', { ascending: true });

            if (query) {
                dbQuery = dbQuery.ilike('description', `%${query}%`);
            }

            const { data, count, error } = await dbQuery.range(from, to);

            if (error) throw error;

            // Ordenar priorizando fuentes oficiales
            const officialSources = ['cdmx_tabulador'];
            const sorted = (data || []).sort((a, b) => {
                const aOfficial = officialSources.includes(a.source) ? 1 : 0;
                const bOfficial = officialSources.includes(b.source) ? 1 : 0;
                if (bOfficial !== aOfficial) {
                    return bOfficial - aOfficial;
                }
                return (a.description || '').localeCompare(b.description || '');
            });

            return { data: sorted, count: count || 0 };
        } catch (error) {
            console.error('Error searching prices:', error);
            return { data: [], count: 0 };
        }
    }

    /**
     * Obtener precios de referencia por categoría y ubicación
     * @param {string} category - Categoría
     * @param {string} location - Ubicación
     * @param {number} limit - Máximo de resultados
     * @returns { Promise < Array >} - Array de precios de referencia
     */
    static async getPricesByCategory(category, location = 'México', limit = 50) {
        try {
            const officialSources = ['cdmx_tabulador'];
            const isCDMX = location && (location.includes('CDMX') || location.includes('Ciudad de México'));

            let query = supabase
                .from('market_price_reference')
                .select('*')
                .eq('category', category)
                .eq('is_active', true);

            // Filtrar por ubicación
            let locationConditions = [];
            if (isCDMX) {
                locationConditions.push('location.ilike.%CDMX%');
                locationConditions.push('location.ilike.%Ciudad de México%');
                locationConditions.push('location.eq.México');
            } else {
                // Simplificar la ubicación para evitar errores con comas en Supabase
                // Ej: "Loma Bonita, Oaxaca" -> "Loma Bonita"
                const simpleLocation = location.split(',')[0].trim();
                const searchLocation = simpleLocation.includes('%') ? simpleLocation : `%${simpleLocation}%`;

                // Usar comillas para manejar espacios y caracteres especiales
                locationConditions.push(`location.ilike."${searchLocation}"`);
                locationConditions.push('location.eq.México');
            }

            query = query.or(locationConditions.join(','));

            const { data, error } = await query;
            if (error) throw error;

            if (!data || data.length === 0) {
                return [];
            }

            // Ordenar: precios oficiales primero, luego por descripción
            const sorted = data.sort((a, b) => {
                // Priorizar fuentes oficiales
                const aOfficial = officialSources.includes(a.source) ? 1 : 0;
                const bOfficial = officialSources.includes(b.source) ? 1 : 0;
                if (bOfficial !== aOfficial) {
                    return bOfficial - aOfficial;
                }
                // Luego ordenar por descripción
                return (a.description || '').localeCompare(b.description || '');
            });

            return sorted.slice(0, limit);

        } catch (error) {
            console.error('Error getting prices by category:', error);
            return [];
        }
    }

    /**
     * Obtener precio promedio de referencia para un concepto
     * Útil para tener un precio base cuando no hay coincidencia exacta
     * @param {string} category - Categoría
     * @param {string} location - Ubicación
     * @returns {Promise<number|null>} - Precio promedio o null
     */
    static async getAveragePriceByCategory(category, location = 'México') {
        try {
            const prices = await this.getPricesByCategory(category, location, 100);

            if (prices.length === 0) return null;

            const validPrices = prices
                .map(p => parseFloat(p.base_price))
                .filter(p => !isNaN(p) && p > 0);

            if (validPrices.length === 0) return null;

            const sum = validPrices.reduce((a, b) => a + b, 0);
            return sum / validPrices.length;

        } catch (error) {
            console.error('Error getting average price:', error);
            return null;
        }
    }

    /**
     * Agregar o actualizar precio de referencia
     * @param {Object} priceData - Datos del precio
     * @returns {Promise<Object>} - Precio creado/actualizado
     */
    static async upsertPrice(priceData) {
        try {
            const { description, unit, category, location, base_price, price_range, source, metadata } = priceData;

            // Buscar si ya existe un precio similar
            const { data: existing } = await supabase
                .from('market_price_reference')
                .select('id')
                .eq('description', description)
                .eq('unit', unit)
                .eq('category', category)
                .eq('location', location)
                .single();

            const priceRecord = {
                description,
                unit,
                category,
                location: location || 'México',
                base_price: parseFloat(base_price),
                price_range: price_range || null,
                source: source || 'manual',
                metadata: metadata || null,
                is_active: true,
                last_updated: new Date().toISOString()
            };

            if (existing) {
                // Actualizar existente
                const { data, error } = await supabase
                    .from('market_price_reference')
                    .update(priceRecord)
                    .eq('id', existing.id)
                    .select()
                    .single();

                if (error) throw error;
                return data;
            } else {
                // Crear nuevo
                const { data, error } = await supabase
                    .from('market_price_reference')
                    .insert([priceRecord])
                    .select()
                    .single();

                if (error) throw error;
                return data;
            }

        } catch (error) {
            console.error('Error upserting price:', error);
            throw error;
        }
    }

    /**
     * Obtener estadísticas de precios de referencia
     * @returns {Promise<Object>} - Estadísticas
     */
    static async getStatistics() {
        try {
            const { data, error } = await supabase
                .from('market_price_reference')
                .select('category, location, is_active')
                .eq('is_active', true);

            if (error) throw error;

            const stats = {
                total: data.length,
                byCategory: {},
                byLocation: {},
                bySource: {}
            };

            data.forEach(item => {
                // Por categoría
                stats.byCategory[item.category] = (stats.byCategory[item.category] || 0) + 1;

                // Por ubicación
                stats.byLocation[item.location] = (stats.byLocation[item.location] || 0) + 1;
            });

            return stats;

        } catch (error) {
            console.error('Error getting statistics:', error);
            return { total: 0, byCategory: {}, byLocation: {} };
        }
    }
}
