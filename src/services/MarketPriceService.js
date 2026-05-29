/**
 * MarketPriceService
 * Servicio para gestionar precios de referencia del mercado
 * Se usa cuando el usuario no tiene un concepto en su catálogo personal
 */

import { supabase } from '../lib/supabaseClient';
import { APP_CONFIG } from '../config/appConfig';

export class MarketPriceService {
    static getDefaultCountry() {
        return APP_CONFIG.defaultCountry;
    }

    static normalizeUnit(unit) {
        return String(unit || '')
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/\s+/g, '')
            .replace(/\./g, '')
            .replace('²', '2')
            .replace('³', '3');
    }

    static areUnitsCompatible(unitA, unitB) {
        const a = this.normalizeUnit(unitA);
        const b = this.normalizeUnit(unitB);

        if (!a || !b) return false;
        if (a === b) return true;

        const groups = [
            ['m', 'ml', 'metro', 'metros'],
            ['m2', 'metro2', 'metros2'],
            ['m3', 'metro3', 'metros3'],
            ['pza', 'pieza', 'pzas', 'und', 'unidad', 'unidades'],
            ['lt', 'l', 'litro', 'litros'],
            ['kg', 'kilo', 'kilos', 'kilogramo', 'kilogramos'],
            ['ton', 'tons', 'tonelada', 'toneladas'],
            ['jgo', 'juego', 'juegos'],
            ['servicio', 'srv'],
            ['global', 'glb'],
        ];

        return groups.some(group => group.includes(a) && group.includes(b));
    }

    static normalizeText(text) {
        return String(text || '')
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/[^a-z0-9\s]/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();
    }

    static buildSearchTerms(description) {
        return this.normalizeText(description)
            .split(' ')
            .filter(term => term.length >= 4)
            .slice(0, 5);
    }

    /**
     * Buscar precio de referencia por descripción, categoría y ubicación
     * Prioriza precios oficiales (CDMX Tabulador) sobre otras fuentes
     * @param {string} description - Descripción del concepto
     * @param {string} category - Categoría (Materiales, Mano de Obra, etc.)
     * @param {string} location - Ubicación (México, CDMX, Monterrey, etc.)
     * @param {number} limit - Máximo de resultados
     * @returns {Promise<Array>} - Array de precios de referencia (ordenados por prioridad)
     */
    static async findReferencePrice(description, category, location = APP_CONFIG.defaultCountry, limit = 5) {
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
                locationConditions.push(`location.eq.${this.getDefaultCountry()}`);
            } else {
                // Simplificar la ubicación para evitar errores con comas en Supabase
                const simpleLocation = location.split(',')[0].trim();
                const searchLocation = simpleLocation.includes('%') ? simpleLocation : `%${simpleLocation}%`;

                // Usar comillas para manejar espacios y caracteres especiales
                locationConditions.push(`location.ilike."${searchLocation}"`);
                locationConditions.push(`location.eq.${this.getDefaultCountry()}`);
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
                    .eq('location', this.getDefaultCountry())
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

    static scoreDescriptionMatch(queryDescription, candidateDescription) {
        const queryTerms = this.buildSearchTerms(queryDescription);
        const candidateText = this.normalizeText(candidateDescription);

        if (queryTerms.length === 0 || !candidateText) return 0;

        let score = 0;
        queryTerms.forEach(term => {
            if (candidateText.includes(term)) {
                score += term.length > 7 ? 2 : 1;
            }
        });

        if (candidateText.includes(this.normalizeText(queryDescription))) {
            score += 4;
        }

        return score;
    }

    static rankCandidates(description, candidates = [], expectedUnit = null) {
        return candidates
            .map(item => {
                const fuzzyScore = this.scoreDescriptionMatch(description, item.description);
                const unitCompatible = expectedUnit
                    ? this.areUnitsCompatible(expectedUnit, item.unit)
                    : true;

                let score = fuzzyScore;
                if (unitCompatible) {
                    score += 100;
                } else if (expectedUnit && item.unit) {
                    score -= 100;
                }

                return {
                    ...item,
                    fuzzyScore,
                    unitCompatible,
                    benchmarkScore: score
                };
            })
            .filter(item => item.fuzzyScore > 0)
            .sort((a, b) => b.benchmarkScore - a.benchmarkScore);
    }

    static async findBestMatch(description, category, location = APP_CONFIG.defaultCountry, expectedUnit = null) {
        const exactMatches = await this.findReferencePrice(description, category, location, 10);
        if (exactMatches.length > 0) {
            const rankedExactMatches = this.rankCandidates(description, exactMatches, expectedUnit);
            const exactCompatible = rankedExactMatches.find(item => item.unitCompatible);

            if (exactCompatible) {
                return exactCompatible;
            }

            if (rankedExactMatches.length > 0 && !expectedUnit) {
                return rankedExactMatches[0];
            }
        }

        const terms = this.buildSearchTerms(description);
        let bestIncompatibleCandidate = null;

        for (const term of terms.slice(0, 2)) {
            const { data } = await this.searchPrices(term, 1, 25);
            const candidates = this.rankCandidates(
                description,
                (data || []).filter(item => !category || item.category === category),
                expectedUnit
            );

            const compatibleCandidate = candidates.find(item => item.unitCompatible);
            if (compatibleCandidate) {
                return compatibleCandidate;
            }

            if (!bestIncompatibleCandidate && candidates.length > 0) {
                bestIncompatibleCandidate = candidates[0];
            }
        }

        return expectedUnit ? null : bestIncompatibleCandidate;
    }

    static async getBenchmarkForItem(item, location = APP_CONFIG.defaultCountry) {
        if (!item?.description) return null;

        const category = item.category || 'Materiales';
        const bestMatch = await this.findBestMatch(item.description, category, location, item.unit);
        if (!bestMatch) return null;

        const marketPrice = parseFloat(bestMatch.base_price);
        if (Number.isNaN(marketPrice) || marketPrice <= 0) return null;

        const currentPrice = parseFloat(item.unitPrice);
        const ratio = currentPrice > 0 ? marketPrice / currentPrice : null;

        return {
            match: bestMatch,
            referencePrice: marketPrice,
            referenceUnit: bestMatch.unit,
            referenceCategory: bestMatch.category,
            ratioAgainstCurrent: ratio,
            sourceLabel: bestMatch.source === 'cdmx_tabulador'
                ? 'Tabulador Oficial CDMX'
                : bestMatch.source === 'construbase_libre'
                    ? 'Construbase'
                    : bestMatch.source || 'Base maestra'
        };
    }

    /**
     * Obtener precios de referencia por categoría y ubicación
     * @param {string} category - Categoría
     * @param {string} location - Ubicación
     * @param {number} limit - Máximo de resultados
     * @returns { Promise < Array >} - Array de precios de referencia
     */
    static async getPricesByCategory(category, location = APP_CONFIG.defaultCountry, limit = 50) {
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
                locationConditions.push(`location.eq.${this.getDefaultCountry()}`);
            } else {
                // Simplificar la ubicación para evitar errores con comas en Supabase
                // Ej: "Loma Bonita, Oaxaca" -> "Loma Bonita"
                const simpleLocation = location.split(',')[0].trim();
                const searchLocation = simpleLocation.includes('%') ? simpleLocation : `%${simpleLocation}%`;

                // Usar comillas para manejar espacios y caracteres especiales
                locationConditions.push(`location.ilike."${searchLocation}"`);
                locationConditions.push(`location.eq.${this.getDefaultCountry()}`);
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
    static async getAveragePriceByCategory(category, location = APP_CONFIG.defaultCountry) {
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
                location: location || this.getDefaultCountry(),
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
