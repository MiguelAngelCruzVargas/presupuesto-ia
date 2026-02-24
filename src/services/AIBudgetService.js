/**
 * AIBudgetService
 * Centralized service for AI-powered budget generation and analysis
 * Uses BackendAIService to keep API keys secure
 */

import { BackendAIService } from './BackendAIService';
import { ErrorService } from './ErrorService';
import { MarketPriceService } from './MarketPriceService';
import { APUService } from './APUService';
import { getCurrentYear, getCurrentYearRange } from '../utils/helpers';
import { generateId } from '../utils/helpers';

export class AIBudgetService {
    /**
     * Generate budget items from natural language description
     * @param {string} prompt - User's natural language description
     * @param {Object} projectInfo - Project information
     * @param {Array} catalog - Catalog items for context
     * @param {Object} config - Optional configuration (prices, location override)
     * @returns {Promise<Array>} - Generated budget items
     */
    static async generateBudgetFromPrompt(prompt, projectInfo, catalog = [], config = {}) {
        if (!prompt || !prompt.trim()) {
            throw new Error('El prompt no puede estar vacío');
        }

        try {
            // Smart Context: Filter catalog to most relevant items instead of just slicing
            const relevantCatalog = this.filterCatalogByRelevance(catalog, prompt, 30);

            const catalogContext = JSON.stringify(
                relevantCatalog.map(c => ({
                    d: c.description,
                    u: c.unit,
                    p: c.unitPrice,
                    c: c.category
                }))
            );

            const location = config.location || projectInfo.location || 'México';
            const catalogCount = relevantCatalog.length;
            const catalogInfo = catalogCount > 0
                ? `\n\nCATÁLOGO MAESTRO DISPONIBLE (${catalogCount} partidas más relevantes):\n${catalogContext}\n\nIMPORTANTE: Si encuentras coincidencias en el catálogo, DEBES usar los datos exactos (descripción, unidad, precio, categoría) y marcar "isCatalogItem": true.`
                : '\n\nNOTA: No hay catálogo disponible. Genera precios basados en estándares de la industria.';

            // Dynamic Price Injection - Cargar precios del Tabulador Oficial CDMX y otras fuentes
            let basePrices = config.basePrices;
            let officialPrices = {};

            if (!basePrices) {
                // Obtener precios del Tabulador Oficial CDMX (PRIORIDAD MÁXIMA)
                const categories = ['Materiales', 'Mano de Obra', 'Obra Civil', 'Instalaciones', 'Equipos'];
                const referencePricesByCategory = {};
                const officialPricesByCategory = {};

                // Cargar TODAS las categorías siempre (el tabulador CDMX tiene miles de conceptos)
                const categoriesToSearch = categories;

                for (const cat of categoriesToSearch) {
                    // PRIORIDAD 1: Buscar precios oficiales del Tabulador CDMX (AUMENTAR a 50 para más opciones)
                    // También buscar precios relevantes según el prompt del usuario
                    let officialRefPrices = await MarketPriceService.getPricesByCategory(cat, location, 50);

                    // Si el prompt menciona conceptos específicos, buscar precios relevantes
                    const promptTerms = prompt.toLowerCase().split(/\s+/).filter(t => t.length > 4);
                    if (promptTerms.length > 0) {
                        // Buscar precios específicos basados en términos del prompt
                        const relevantPrices = await Promise.all(
                            promptTerms.slice(0, 3).map(term =>
                                MarketPriceService.findReferencePrice(term, cat, location, 5)
                            )
                        );
                        const flatRelevant = relevantPrices.flat();
                        // Combinar con los precios generales, priorizando los relevantes
                        const relevantOfficial = flatRelevant.filter(p => p.source === 'cdmx_tabulador');
                        officialRefPrices = [...relevantOfficial, ...officialRefPrices].slice(0, 50);
                    }

                    // Separar precios oficiales de otros
                    const official = officialRefPrices.filter(p => p.source === 'cdmx_tabulador');
                    const others = officialRefPrices.filter(p => p.source !== 'cdmx_tabulador');

                    if (official.length > 0) {
                        officialPricesByCategory[cat] = official.slice(0, 30).map(p => ({
                            description: p.description,
                            unit: p.unit,
                            basePrice: parseFloat(p.base_price),
                            priceRange: p.price_range,
                            source: 'Tabulador Oficial CDMX',
                            official: true
                        }));
                    }

                    // PRIORIDAD 2: Otras fuentes (solo si no hay suficientes oficiales)
                    if (official.length < 15) {
                        const additionalPrices = others.slice(0, Math.max(0, 15 - official.length));
                        if (additionalPrices.length > 0) {
                            if (!referencePricesByCategory[cat]) {
                                referencePricesByCategory[cat] = [];
                            }
                            referencePricesByCategory[cat].push(...additionalPrices.map(p => ({
                                description: p.description,
                                unit: p.unit,
                                basePrice: parseFloat(p.base_price),
                                priceRange: p.price_range,
                                source: p.source || 'Mercado',
                                official: false
                            })));
                        }
                    }
                }

                // Combinar: oficiales primero, luego otros
                for (const cat of categories) {
                    const combined = [
                        ...(officialPricesByCategory[cat] || []),
                        ...(referencePricesByCategory[cat] || [])
                    ];
                    if (combined.length > 0) {
                        referencePricesByCategory[cat] = combined;
                    }
                }

                if (Object.keys(referencePricesByCategory).length > 0) {
                    basePrices = referencePricesByCategory;
                }

                officialPrices = officialPricesByCategory;
            }

            // Construir información de precios con énfasis en el Tabulador Oficial
            let basePricesInfo = '';
            if (basePrices) {
                const officialCount = Object.values(basePrices).flat().filter(p => p.official).length;
                const totalCount = Object.values(basePrices).flat().length;

                basePricesInfo = `\n\n🎯 PRECIOS DE REFERENCIA (${location}):\n`;

                if (officialCount > 0) {
                    basePricesInfo += `\n⭐ TABULADOR OFICIAL CDMX (${officialCount} precios oficiales del Gobierno de la CDMX):\n`;
                    basePricesInfo += `Estos son precios OFICIALES y ACTUALIZADOS del Tabulador General de Precios Unitarios del Gobierno de la Ciudad de México.\n`;
                    basePricesInfo += `ÚSALOS COMO FUENTE PRINCIPAL cuando no haya coincidencia en el catálogo del usuario.\n\n`;
                }

                basePricesInfo += JSON.stringify(basePrices, null, 2);
                basePricesInfo += `\n\n📋 INSTRUCCIONES DE USO (ESTRICTO - MÁXIMA CONSISTENCIA):\n`;
                basePricesInfo += `1. ⚠️ CRÍTICO: Si encuentras un concepto similar en el Tabulador Oficial CDMX o Base Maestra, usa ESE precio EXACTO sin modificar (no inventes, no ajustes)\n`;
                basePricesInfo += `2. Si el concepto está exactamente en la Base Maestra, COPIA el precio tal cual está (mayor consistencia)\n`;
                basePricesInfo += `3. Los precios oficiales (official: true) son OBLIGATORIOS cuando hay coincidencia - NO los modifiques\n`;
                basePricesInfo += `4. Solo si NO hay coincidencia en la Base Maestra, entonces estima basándote en estándares\n`;
                basePricesInfo += `5. En "calculation_basis" SIEMPRE indica la fuente exacta del precio usado\n`;
            }

            const currentYear = new Date().getFullYear();
            const currentYearRange = `${currentYear}-${currentYear + 1}`;

            // Dictionary of technical specifications by specialty
            const getSpecialtyInstructions = (type) => {
                const normalizedType = (type || '').toLowerCase();

                const dictionary = {
                    'eléctrica': `
            - SUB-RAMOS: Baja Tensión (Residencial/Comercial) y Media Tensión (Subestaciones).
            - REQUISITOS TÉCNICOS: Especificar Calibre AWG, aislamiento THW-LS (baja emisión de humos) y marca (Condumex, Schneider o BTicino).
            - CANALIZACIÓN: Detallar si es Conduit Pared Delgada (PD), Pared Gruesa (PG), PVC Pesado o Charola tipo malla.
            - ALCANCE: Debe incluir peinado de tableros, pruebas de continuidad y etiquetado con cintas Brother/Dymo.
            - Ejemplo: 'Suministro e instalación de salida para contacto dúplex polarizado de 20A, incluye: cable cobre cal. 12 AWG, ducto conduit 1/2", caja, placa y mano de obra.'`,

                    'jardinería': `
            - CAPAS DE SUELO: Tierra vegetal (especificar espesor en cm), tierra de monte, composta y fertilizado (Triple 17).
            - VEGETACIÓN: Nombre científico y común, altura de la pieza (ej. 1.50m a 2.00m) y estado fitosanitario.
            - PASTO: Especificar si es en rollo (alfombra), estolón o semilla (tipo San Agustín, Kikuyo o Bermuda).
            - RIEGO: Incluir tubería PVC cedula 40, aspersores emergentes y programadores de riego.`,

                    'albañilería': `
            - CONCRETOS: Especificar resistencia técnica (f'c = 150, 200, 250 kg/cm2).
            - MEZCLAS: Proporciones exactas de mortero cemento-arena (1:4, 1:5).
            - ACABADOS: Detallar si es aplanado rústico, fino, con flota o con llana metálica.
            - INCLUSIÓN: Acarreos verticales/horizontales y andamios a cualquier altura.`,

                    'civil': `
            - CONCRETOS: Especificar resistencia técnica (f'c = 150, 200, 250 kg/cm2).
            - MEZCLAS: Proporciones exactas de mortero cemento-arena (1:4, 1:5).
            - ACABADOS: Detallar si es aplanado rústico, fino, con flota o con llana metálica.
            - INCLUSIÓN: Acarreos verticales/horizontales y andamios a cualquier altura.`,

                    'voz y datos': `
            - CATEGORÍAS: Cat 6, Cat 6A o Fibra Óptica (OM3/OM4).
            - COMPONENTES: Patch panels, Jacks RJ45, Faceplates y Rack de telecomunicaciones.
            - CERTIFICACIÓN: Requerir pruebas con escáner Fluke y reporte de certificación de nodos.`,

                    'hidrosanitaria': `
            - Especifica materiales: TuboPlus (PP-R), PVC sanitario (Norma), Cobre tipo M/L.
            - Detalla diámetros en mm y pulgadas.
            - Incluye: conexiones, soportería, pruebas de hermeticidad y pegamentos.`,

                    'gas': `
            - Especifica materiales: Cobre tipo L, PE-AL-PE.
            - Detalla diámetros en pulgadas.
            - Incluye: pruebas de hermeticidad con manómetro certificado.`,

                    'clima': `
            - Especifica: Capacidad en BTU/Toneladas, refrigerante R-410A.
            - Incluye: kit de instalación, tubería de cobre deshidratado, aislamiento armaflex y bomba de condensados.`
                };

                const key = Object.keys(dictionary).find(k => normalizedType.includes(k)) || 'general';
                const specificRules = dictionary[key] || `
            - Manten un nivel técnico alto en todas las partidas.
            - Usa lenguaje profesional de ingeniería/arquitectura.
            - Evita términos coloquiales o simplificaciones excesivas.`;

                return `
        ESPECIALIDAD OBLIGATORIA: ${type.toUpperCase()}
        REGLAS TÉCNICAS:
        ${specificRules}
        
        REGLAS DE ORO NEODATA (ESTRICTO):
        1. Toda descripción DEBE iniciar con un verbo infinitivo técnico: "Suministro y colocación...", "Construcción de...", "Aplicación de...".
        2. Prohibido usar descripciones de menos de 15 palabras.
        3. El alcance debe ser explícito: "incluye: materiales, desperdicios, mano de obra, herramienta, equipo de seguridad y limpieza."
                `;
            };

            const specialtyInstructions = getSpecialtyInstructions(projectInfo.type);

            const systemPrompt = `Eres el Director de Costos Senior en una constructora mexicana, experto en NEODATA 2026.
Tu misión es generar presupuestos que parezcan sacados de una licitación oficial.

${specialtyInstructions}

⚠️ PROTOCOLO DE GENERACIÓN EXPERTA:
1. **DESCRIBE COMO INGENIERO**: No aceptes "Cable 14". Escribe "Suministro y colocación de conductor de cobre con aislamiento termoplástico...".
2. **AUTO-DESGLOSE**: Si el usuario pide un concepto complejo (ej: "Barda"), genera AUTOMÁTICAMENTE: 1. Excavación, 2. Cimentación, 3. Muro y 4. Castillos.
3. **MÉTRICA EXACTA**: Si hay dimensiones (ej: 4x5m), calcula el área y ponla en 'quantity'. Escribe la fórmula en 'calculation_basis'.
4. **PRIORIDAD DE CATÁLOGO**: Si el Catálogo Maestro tiene conceptos similares, COPIA su estilo técnico de redacción.

Retorna UNICAMENTE el JSON array estructurado. No hables fuera del JSON.`;

            const userPrompt = `Generar presupuesto detallado profesional (Estilo Neodata) para:

"${prompt}"

CONTEXTO DEL PROYECTO:
- Tipo de Especialidad: ${projectInfo.type || 'General'}
- Ubicación: ${location}
- Año: ${currentYear}
${catalogInfo}${basePricesInfo}

INSTRUCCIONES CLAVE:
1. Usa el formato de descripción técnica detallada (Neodata).
2. Aplica las reglas específicas para la especialidad "${projectInfo.type}".
3. Calcula cantidades precisas.
4. Incluye todos los accesorios y complementos necesarios (ej: codos, coples, cajas para tuberías).`;

            const result = await ErrorService.withRetry(
                () => BackendAIService.sendPrompt(userPrompt, systemPrompt),
                2,
                1000
            );

            const candidate = result.candidates?.[0];
            const text = candidate?.content?.parts?.[0]?.text || '';

            if (!text) {
                console.error('AI Response missing text. Full result:', JSON.stringify(result, null, 2));

                if (candidate?.finishReason === 'SAFETY') {
                    throw new Error('La IA bloqueó la respuesta por motivos de seguridad. Intenta reformular tu solicitud.');
                }

                if (candidate?.finishReason === 'RECITATION') {
                    throw new Error('La IA bloqueó la respuesta por coincidencia con contenido protegido. Intenta ser más específico.');
                }

                throw new Error(`No se recibió texto de la IA. Razón: ${candidate?.finishReason || 'Desconocida'}`);
            }

            // Clean and parse JSON
            const cleanJson = text
                .replace(/```json/g, '')
                .replace(/```/g, '')
                .trim();

            let generatedItems;
            try {
                generatedItems = JSON.parse(cleanJson);
            } catch (parseError) {
                // Try to extract JSON from text if it's embedded
                const jsonMatch = cleanJson.match(/\[[\s\S]*\]/);
                if (jsonMatch) {
                    generatedItems = JSON.parse(jsonMatch[0]);
                } else {
                    throw new Error('No se pudo parsear la respuesta de la IA como JSON');
                }
            }

            if (!Array.isArray(generatedItems)) {
                throw new Error('La respuesta de la IA no es un array válido');
            }

            // Validate and add IDs
            let itemsWithIds = generatedItems
                .filter(item => item.description && item.unit)
                .map(item => ({
                    id: generateId(),
                    description: item.description || '',
                    unit: item.unit || 'pza',
                    unitPrice: parseFloat(item.unitPrice) || 0,
                    category: item.category || 'Materiales',
                    quantity: parseFloat(item.quantity) || 0,
                    calculation_basis: item.calculation_basis || '',
                    isCatalogItem: item.isCatalogItem || false
                }));

            // POST-PROCESAMIENTO: Reemplazar precios generados con precios exactos de la Base Maestra
            // Esto asegura máxima consistencia cuando los precios ya existen en la base
            if (basePrices && Object.keys(basePrices).length > 0) {
                console.log('🔍 Post-procesando: Buscando precios exactos en Base Maestra para mayor consistencia...');

                const location = config.location || projectInfo.location || 'México';
                let replacedCount = 0;

                for (const item of itemsWithIds) {
                    // Solo buscar si no es un item del catálogo del usuario (esos ya son correctos)
                    if (!item.isCatalogItem) {
                        try {
                            // Buscar precio exacto en la base maestra
                            const exactPrice = await MarketPriceService.findReferencePrice(
                                item.description,
                                item.category || 'Materiales',
                                location,
                                1
                            );

                            if (exactPrice && exactPrice.length > 0 && exactPrice[0].base_price) {
                                const referencePrice = parseFloat(exactPrice[0].base_price);
                                const generatedPrice = item.unitPrice;

                                // Si el precio de la base maestra está disponible y la unidad coincide
                                if (exactPrice[0].unit === item.unit || !exactPrice[0].unit) {
                                    // Reemplazar con el precio exacto de la base maestra
                                    item.unitPrice = referencePrice;

                                    // Actualizar calculation_basis para indicar que viene de la base maestra
                                    const sourceName = exactPrice[0].source === 'cdmx_tabulador'
                                        ? 'Tabulador Oficial CDMX'
                                        : exactPrice[0].source === 'construbase_libre'
                                            ? 'CONSTRUBASE'
                                            : 'Base de Datos Maestra';

                                    if (!item.calculation_basis.includes(sourceName)) {
                                        item.calculation_basis = `${item.calculation_basis || ''} [Precio exacto de ${sourceName}]`.trim();
                                    }

                                    replacedCount++;

                                    // Si el precio cambió significativamente, loguearlo
                                    const priceDiff = Math.abs(referencePrice - generatedPrice) / generatedPrice;
                                    if (priceDiff > 0.1) { // Más del 10% de diferencia
                                        console.log(`   ✅ Reemplazado: "${item.description.substring(0, 50)}..." - IA: $${generatedPrice.toFixed(2)} → Base: $${referencePrice.toFixed(2)}`);
                                    }
                                }
                            }
                        } catch (error) {
                            // Continuar si hay error en la búsqueda de un item específico
                            console.warn(`   ⚠️ Error buscando precio para "${item.description}":`, error.message);
                        }
                    }
                }

                if (replacedCount > 0) {
                    console.log(`✅ ${replacedCount} precio(s) reemplazado(s) con valores exactos de la Base Maestra para mayor consistencia`);
                }
            }

            // Validaciones post-generación
            console.log(`📊 Validación de Presupuesto Generado:`);
            console.log(`   - Partidas generadas: ${itemsWithIds.length}`);

            // Validar precios razonables
            const priceWarnings = [];
            itemsWithIds.forEach((item, index) => {
                const total = item.quantity * item.unitPrice;

                // Validar precios unitarios por categoría
                if (item.category === 'Mano de Obra' && item.unitPrice < 300) {
                    priceWarnings.push(`Partida ${index + 1}: Precio de mano de obra muy bajo ($${item.unitPrice}/jor). Rango típico: $400-800/jor`);
                }
                if (item.category === 'Mano de Obra' && item.unitPrice > 1200) {
                    priceWarnings.push(`Partida ${index + 1}: Precio de mano de obra muy alto ($${item.unitPrice}/jor). Rango típico: $400-800/jor`);
                }
                if (item.category === 'Obra Civil' && item.unit === 'm²' && item.unitPrice < 50) {
                    priceWarnings.push(`Partida ${index + 1}: Precio de obra civil muy bajo ($${item.unitPrice}/m²). Rango típico: $80-150/m²`);
                }
                if (item.category === 'Obra Civil' && item.unit === 'm³' && item.unitPrice < 500) {
                    priceWarnings.push(`Partida ${index + 1}: Precio de obra civil muy bajo ($${item.unitPrice}/m³). Rango típico: $800-1500/m³`);
                }

                // Validar que haya cálculo_basis si quantity > 0
                if (item.quantity > 0 && !item.calculation_basis) {
                    console.warn(`⚠️ Partida ${index + 1} tiene cantidad > 0 pero no tiene calculation_basis`);
                }
            });

            if (priceWarnings.length > 0) {
                console.warn('⚠️ ADVERTENCIAS DE PRECIOS:');
                priceWarnings.forEach(warning => console.warn(`   - ${warning}`));
            }

            // Validar coherencia de categorías
            const validCategories = ['Materiales', 'Mano de Obra', 'Equipos', 'Instalaciones', 'Obra Civil'];
            const invalidCategories = itemsWithIds.filter(item => !validCategories.includes(item.category));
            if (invalidCategories.length > 0) {
                console.warn(`⚠️ ${invalidCategories.length} partida(s) con categorías no estándar. Ajustando...`);
                invalidCategories.forEach(item => {
                    item.category = 'Materiales'; // Categoría por defecto
                });
            }

            const totalGenerated = itemsWithIds.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
            console.log(`   - Presupuesto total generado: $${totalGenerated.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`);

            return itemsWithIds;

        } catch (error) {
            ErrorService.logError(error, 'AIBudgetService.generateBudgetFromPrompt', {
                prompt,
                projectType: projectInfo.type
            });
            throw error;
        }
    }

    /**
     * Filter catalog items by relevance to the query using simple keyword matching
     * @param {Array} catalog - Full catalog
     * @param {string} query - Search query/prompt
     * @param {number} limit - Max items to return
     * @returns {Array} - Filtered catalog items
     */
    static filterCatalogByRelevance(catalog, query, limit = 20) {
        if (!catalog || catalog.length === 0) return [];
        if (!query) return catalog.slice(0, limit);

        const terms = query.toLowerCase().split(/\s+/).filter(t => t.length > 3);

        // Score items based on term matches
        const scoredItems = catalog.map(item => {
            let score = 0;
            const text = (item.description + ' ' + item.category).toLowerCase();

            terms.forEach(term => {
                if (text.includes(term)) score += 1;
            });

            return { item, score };
        });

        // Filter items with at least one match, sort by score desc, then take top N
        // If no matches found, fallback to first N items (or empty if strict)
        const matches = scoredItems
            .filter(x => x.score > 0)
            .sort((a, b) => b.score - a.score)
            .map(x => x.item);

        return matches.length > 0 ? matches.slice(0, limit) : catalog.slice(0, limit);
    }

    /**
     * Analyze budget and provide insights
     * @param {Array} items - Budget items
     * @param {Object} projectInfo - Project information
     * @returns {Promise<string>} - HTML analysis text
     */
    /**
     * Analyze budget and provide structured insights (JSON)
     * @param {Array} items - Budget items
     * @param {Object} projectInfo - Project information
     * @returns {Promise<Object>} - Structured analysis with alerts
     */
    static async analyzeBudgetStructured(items, projectInfo) {
        if (!items || items.length === 0) {
            throw new Error('No hay partidas para analizar');
        }

        try {
            const location = projectInfo.location || 'México';

            // Optimize payload: Send only necessary fields to save tokens
            const simplifiedItems = items.map(item => ({
                id: item.id,
                d: item.description,
                u: item.unit,
                p: item.unitPrice,
                q: item.quantity,
                c: item.category
            }));

            // Split into chunks if too large (simple approach for now: limit to 100 items)
            const itemsToAnalyze = simplifiedItems.slice(0, 100);

            const prompt = `Analiza este presupuesto de construcción en ${location} y detecta errores, oportunidades de mejora y buenas prácticas.

DATOS DEL PROYECTO:
- Tipo: ${projectInfo.type || 'General'}
- Ubicación: ${location}
- Cliente: ${projectInfo.client || 'No especificado'}

PARTIDAS (Formato: id, d=descripción, u=unidad, p=precio unitario, q=cantidad, c=categoría):
${JSON.stringify(itemsToAnalyze)}

REGLAS DE AUDITORÍA:
1. **Precios Fuera de Mercado**: Detecta precios unitarios que sean >50% más altos o <50% más bajos que el mercado actual en ${location} (${getCurrentYearRange()}).
2. **Inconsistencias**: Unidades incorrectas (ej: limpieza por pieza), categorías mal asignadas.
3. **Omisiones Lógicas**: Si hay "Muro", debe haber "Aplanado" o "Pintura".
4. **Errores de Cantidad**: Cantidades negativas o cero (si no es un concepto opcional).

FORMATO DE RESPUESTA (JSON PURO):
Devuelve un objeto JSON con esta estructura exacta:
{
  "summary": "Resumen ejecutivo de 1-2 oraciones sobre la calidad general del presupuesto.",
  "alerts": [
    {
      "type": "critical", // Para errores graves de precio o lógica
      "title": "Precio de Concreto Muy Bajo",
      "message": "El precio de $1,200/m3 está por debajo del mercado ($2,500+).",
      "itemId": "id_del_item_afectado",
      "suggestedAction": {
        "type": "update_price",
        "value": 2600.00,
        "label": "Actualizar a $2,600.00"
      }
    },
    {
      "type": "warning", // Para sugerencias u omisiones
      "title": "Falta Aplanado",
      "message": "Se detectaron muros pero no partidas de aplanado o acabados.",
      "itemId": null, // null si es general
      "suggestedAction": null
    },
    {
      "type": "info", // Para buenas prácticas
      "title": "Buena estructuración",
      "message": "Las partidas de cimentación están bien detalladas.",
      "itemId": null,
      "suggestedAction": null
    }
  ]
}

IMPORTANTE:
- "suggestedAction" solo debe incluirse si la corrección es clara y numérica (ej: actualizar precio).
- Usa precios de mercado reales de ${location}.
- NO incluyas markdown, solo el JSON.`;

            const systemInstruction = `Eres "Doctor Obra", un auditor experto de costos de construcción en ${location}. Tu trabajo es proteger la rentabilidad del constructor detectando errores costosos. Responde SIEMPRE en JSON válido.`;

            const result = await ErrorService.withRetry(
                () => BackendAIService.sendPrompt(prompt, systemInstruction),
                2,
                1000
            );

            const text = result.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
            const cleanJson = this.cleanJson(text);

            try {
                return JSON.parse(cleanJson);
            } catch (e) {
                console.error("Failed to parse audit JSON", e);
                // Fallback structure
                return {
                    summary: "No se pudo generar un análisis estructurado. Intenta de nuevo.",
                    alerts: []
                };
            }

        } catch (error) {
            ErrorService.logError(error, 'AIBudgetService.analyzeBudgetStructured', {
                itemsCount: items.length
            });
            throw error;
        }
    }

    /**
     * Analyze budget and provide insights (Legacy HTML version)
     * @deprecated Use analyzeBudgetStructured instead
     * @param {Array} items - Budget items
     * @param {Object} projectInfo - Project information
     * @returns {Promise<string>} - HTML analysis text
     */
    static async analyzeBudget(items, projectInfo) {
        if (!items || items.length === 0) {
            throw new Error('No hay partidas para analizar');
        }

        try {
            const location = projectInfo.location || 'México';
            const prompt = `Analiza este presupuesto de construcción en ${location}:

${JSON.stringify(items.slice(0, 50), null, 2)}

Tipo de proyecto: ${projectInfo.type || 'General'}
Cliente: ${projectInfo.client || 'No especificado'}
Ubicación: ${location}

Busca:
1. Errores comunes (precios muy altos/bajos para la región, unidades incorrectas)
2. Omisiones típicas para este tipo de proyecto
3. Inconsistencias en categorías
4. Recomendaciones de optimización local

Responde en HTML simple con formato claro, usando <h3> para títulos, <p> para párrafos, <ul><li> para listas.`;

            const systemInstruction = `Eres "Doctor Obra", un experto auditor de presupuestos de construcción en ${location}. 
Analiza presupuestos buscando errores, precios anómalos para la región, omisiones y proporciona recomendaciones profesionales. 
Responde SOLO en HTML simple y claro, sin scripts ni estilos inline complejos.`;

            const result = await ErrorService.withRetry(
                () => BackendAIService.sendPrompt(prompt, systemInstruction),
                2,
                1000
            );

            const text = result.candidates?.[0]?.content?.parts?.[0]?.text || 'No se pudo generar el análisis.';

            // Basic HTML sanitization
            return text;

        } catch (error) {
            ErrorService.logError(error, 'AIBudgetService.analyzeBudget', {
                itemsCount: items.length,
                projectType: projectInfo.type
            });
            throw error;
        }
    }

    /**
     * Generate technical description for budget
     * @param {Array} items - Budget items
     * @param {Object} projectInfo - Project information
     * @returns {Promise<string>} - Technical description text
     */
    static async generateTechnicalDescription(items, projectInfo) {
        if (!items || items.length === 0) {
            throw new Error('No hay partidas para generar la descripción');
        }

        try {
            const itemDescriptions = items
                .slice(0, 20)
                .map(i => i.description)
                .join(', ');

            const location = projectInfo.location || 'México';
            const prompt = `Genera una memoria descriptiva profesional para una cotización de construcción en ${location}.

Partidas principales: ${itemDescriptions}
Tipo de proyecto: ${projectInfo.type || 'General'}
Cliente: ${projectInfo.client || 'No especificado'}
Ubicación: ${location}

Requisitos:
- Máximo 2 párrafos
- Lenguaje técnico profesional
- Especificaciones relevantes
- Terminología de construcción local de ${location}`;

            const systemInstruction = `Eres un experto en redacción de memorias descriptivas para presupuestos de construcción en ${location}. 
Escribe descripciones técnicas, profesionales y claras.`;

            const result = await ErrorService.withRetry(
                () => BackendAIService.sendPrompt(prompt, systemInstruction),
                2,
                1000
            );

            return result.candidates?.[0]?.content?.parts?.[0]?.text || 'No se pudo generar la descripción.';

        } catch (error) {
            ErrorService.logError(error, 'AIBudgetService.generateTechnicalDescription', {
                itemsCount: items.length
            });
            throw error;
        }
    }
    /**
     * Updates catalog prices using AI based on current market data
     * @param {Array} catalogItems - List of catalog items
     * @returns {Promise<Array>} - Updated items with new prices and reasoning
     */
    static async updateCatalogPrices(catalogItems, location = 'México') {
        if (!catalogItems || catalogItems.length === 0) return [];

        try {
            const currentYear = getCurrentYear();
            const updatedItems = [];
            const itemsNeedingAI = [];

            // PASO 1: Buscar precios en la base de datos maestra primero (más rápido y preciso)
            console.log('🔍 Buscando precios en base de datos maestra...');

            for (const item of catalogItems) {
                try {
                    // Buscar precio de referencia en la base maestra
                    const referencePrice = await MarketPriceService.findReferencePrice(
                        item.description,
                        item.category || 'Materiales',
                        location,
                        1
                    );

                    if (referencePrice && referencePrice.length > 0 && referencePrice[0].base_price) {
                        // Usar precio de la base maestra (más confiable)
                        updatedItems.push({
                            ...item,
                            unitPrice: referencePrice[0].base_price,
                            lastUpdate: new Date().toISOString(),
                            priceNote: `Precio de ${referencePrice[0].source === 'cdmx_tabulador' ? 'Tabulador CDMX' : referencePrice[0].source === 'construbase_libre' ? 'Construbase' : 'base de datos maestra'} (${location})`,
                            source: 'market_database'
                        });
                    } else {
                        // No encontrado en base maestra, usar IA
                        itemsNeedingAI.push(item);
                    }
                } catch (error) {
                    console.warn(`Error buscando precio para "${item.description}":`, error);
                    itemsNeedingAI.push(item);
                }
            }

            console.log(`✅ ${updatedItems.length} precios encontrados en base maestra`);
            console.log(`🤖 ${itemsNeedingAI.length} conceptos requieren actualización con IA`);

            // PASO 2: Actualizar con IA solo los que no están en la base maestra
            if (itemsNeedingAI.length > 0) {
                const itemsList = itemsNeedingAI.map(item =>
                    `- ${item.description} (Unidad: ${item.unit}, Precio Actual: $${item.unitPrice})`
                ).join('\n');

                const systemPrompt = `
                    Actúa como un experto analista de costos de construcción en ${location}.
                    Revisa la siguiente lista de conceptos de obra y actualiza sus precios unitarios a valores de mercado actuales del año ${currentYear} (año actual) en Pesos Mexicanos (MXN) para la región de ${location}.
                    
                    ⚠️ IMPORTANTE: Los precios cambian constantemente. Todos los precios DEBEN ser del año ${currentYear}. No uses precios de años anteriores.
                    
                    Devuelve UNICAMENTE un arreglo JSON con los objetos actualizados.
                    Cada objeto debe tener:
                    - "description": La descripción original (o corregida si tenía errores graves).
                    - "unitPrice": El nuevo precio unitario sugerido (número).
                    - "reasoning": Breve explicación del cambio (ej: "Ajuste por inflación del acero en ${location}").
                    
                    No incluyas markdown, ni explicaciones fuera del JSON.
                `;

                const userPrompt = `Lista de conceptos a actualizar para ${location}:\n${itemsList}`;

                const result = await BackendAIService.sendPrompt(userPrompt, systemPrompt);
                const responseText = result.candidates?.[0]?.content?.parts?.[0]?.text || '';

                const cleanedResponse = this.cleanJson(responseText);
                let aiUpdatedPrices = [];
                try {
                    aiUpdatedPrices = JSON.parse(cleanedResponse);
                } catch (parseError) {
                    // Intentar extraer JSON si está embebido
                    const jsonMatch = cleanedResponse.match(/\[[\s\S]*\]/);
                    if (jsonMatch) {
                        aiUpdatedPrices = JSON.parse(jsonMatch[0]);
                    } else {
                        console.error('Error parseando respuesta de IA:', parseError);
                        // Continuar con precios originales si falla el parseo
                    }
                }

                // Agregar items actualizados por IA
                itemsNeedingAI.forEach(item => {
                    const update = aiUpdatedPrices.find(u => u.description === item.description) || {};
                    updatedItems.push({
                        ...item,
                        unitPrice: update.unitPrice || item.unitPrice,
                        lastUpdate: new Date().toISOString(),
                        priceNote: update.reasoning || 'Actualizado con IA',
                        source: 'ai'
                    });
                });
            }

            return updatedItems;

        } catch (error) {
            console.error('Error updating catalog prices:', error);
            throw error;
        }
    }

    /**
     * Generates a material takeoff (explosión de insumos) based on budget items
     * @param {Array} items - Budget items
     * @returns {Promise<Array>} - List of materials with quantities and estimated costs
     */
    static async generateMaterialTakeoff(items, projectInfo = {}) {
        if (!items || items.length === 0) return { materials: [], assumptions: [] };

        try {
            const itemsList = items.map(item => {
                const basis = item.calculation_basis ? ` [Base: ${item.calculation_basis}]` : '';
                return `- ${item.description} (Cant: ${item.quantity} ${item.unit}, Cat: ${item.category})${basis}`;
            }).join('\n');

            const location = projectInfo.location || 'México';

            // PASO 1: Búsqueda INTELIGENTE en Base Maestra basada en el contexto del presupuesto
            console.log('🔍 Búsqueda inteligente en Base Maestra (Neodata) basada en el presupuesto...');

            // Extraer términos clave de las partidas para buscar materiales relevantes
            const materialKeywords = items
                .map(item => item.description?.toLowerCase() || '')
                .join(' ')
                .split(/\s+/)
                .filter(term => term.length > 4 && !['muro', 'casa', 'obra', 'construcción'].includes(term))
                .slice(0, 10);

            // Buscar materiales específicos mencionados en las partidas
            const specificMaterialSearches = await Promise.all(
                materialKeywords.slice(0, 5).map(keyword =>
                    MarketPriceService.findReferencePrice(keyword, 'Materiales', location, 5)
                )
            );
            const specificMaterials = specificMaterialSearches.flat().filter((m, i, arr) =>
                arr.findIndex(x => x.description === m.description) === i
            );

            // También obtener materiales comunes como respaldo
            const commonMaterials = await MarketPriceService.getPricesByCategory('Materiales', location, 150);

            // Combinar y priorizar: específicos primero, luego comunes
            const allMaterials = [...specificMaterials, ...commonMaterials].filter((m, i, arr) =>
                arr.findIndex(x => x.id === m.id) === i
            ).slice(0, 120);

            const baseMaterialsText = allMaterials.length > 0
                ? allMaterials.map((p, idx) => {
                    // Marcar materiales específicos del proyecto con ⭐
                    const isSpecific = idx < specificMaterials.length;
                    const marker = isSpecific ? '⭐ [RELEVANTE PARA ESTE PROYECTO]' : '';
                    return `${marker ? marker + ' ' : ''}- ${p.description} (${p.unit}): $${p.base_price?.toLocaleString('es-MX', { minimumFractionDigits: 2 })} - Fuente: ${p.source || 'Base Maestra Neodata'}`;
                }).join('\n')
                : 'No se encontraron materiales en la Base Maestra para esta ubicación.';

            console.log(`✅ ${specificMaterials.length} materiales específicos + ${commonMaterials.length} comunes = ${allMaterials.length} materiales encontrados en Base Maestra`);
            console.log(`   Términos buscados: ${materialKeywords.slice(0, 5).join(', ')}`);

            // Calcular totales previos para validación
            const totalBudget = items.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
            const materialsBudget = items
                .filter(item => item.category === 'Materiales')
                .reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);

            const systemPrompt = `
                Eres un experto Ingeniero de Costos y Analista de Precios Unitarios certificado, especializado en metodologías NEODATA, CAPECO y estándares de la industria mexicana en ${location}.

                Tu tarea es generar una "EXPLOSIÓN DE INSUMOS" (Lista de Materiales Consolidada) profesional y precisa para el siguiente presupuesto de obra, desglosando cada partida en sus materiales base consumibles.

                METODOLOGÍA DE CÁLCULO (OBLIGATORIO):

                1. **DESGLOSE POR PARTIDA**:
                   - Analiza cada partida del presupuesto
                   - Identifica los materiales base necesarios según estándares Neodata/CAPECO
                   - NO incluyas mano de obra ni equipos, SOLO MATERIALES CONSUMIBLES

                2. **CÁLCULO DE CANTIDADES CON DESPERDICIOS** (estándares de la industria):
                   - Concreto: +5% desperdicio
                   - Acero de refuerzo: +3% desperdicio
                   - Mampostería (tabique, block): +5% desperdicio
                   - Mortero, aplanados: +10% desperdicio
                   - Pintura: +15% desperdicio (múltiples manos)
                   - Loseta cerámica: +5% desperdicio
                   - Cable eléctrico: +10% desperdicio
                   - Tubería: +5% desperdicio
                   - Agua: Incluir para mezclas (0.2-0.3 m³ por m³ de concreto)

                3. **FÓRMULAS ESTÁNDAR** (ejemplos):
                   - Mampostería de tabique (15x20x30cm):
                     * Tabique: Cantidad m² × 33 piezas/m² × 1.05 (desperdicio)
                     * Mortero: Cantidad m² × 0.02 m³/m² × 1.10 (desperdicio)
                     * Cemento: Mortero m³ × 7.5 bolsas/m³
                     * Arena: Mortero m³ × 0.5 m³/m³
                     * Agua: Mortero m³ × 0.2 m³/m³

                   - Concreto f'c=200 kg/cm² (1 m³):
                     * Cemento: 1.05 m³ × 7.5 bolsas/m³ = 7.875 bolsas
                     * Arena: 1.05 m³ × 0.5 m³/m³ = 0.525 m³
                     * Grava: 1.05 m³ × 0.7 m³/m³ = 0.735 m³
                     * Agua: 1.05 m³ × 0.2 m³/m³ = 0.21 m³

                   - Aplanado de cemento (2cm espesor, 1 m²):
                     * Mortero: 1 m² × 0.02 m × 1.10 = 0.022 m³
                     * Cemento: 0.022 m³ × 7.5 = 0.165 bolsas
                     * Arena: 0.022 m³ × 0.5 = 0.011 m³

                4. **PRECIOS UNITARIOS - PRIORIDAD ABSOLUTA A BASE MAESTRA**:
                   ⚠️ CRÍTICO: DEBES usar los precios EXACTOS de la Base Maestra cuando estén disponibles.
                   
                   🔗 BASE MAESTRA HÍBRIDA - CONSULTA MIENTRAS GENERAS (${allMaterials.length} materiales):
                   ⭐ ${specificMaterials.length} materiales ESPECÍFICOS del proyecto (relevantes según las partidas)
                   📋 ${commonMaterials.length - specificMaterials.length} materiales COMUNES como respaldo
                   
${baseMaterialsText}
                   
                   🤝 ENFOQUE HÍBRIDO - IA + BASE MAESTRA COLABORANDO:
                   1. CONSULTA la Base Maestra MIENTRAS generas cada material (no es solo referencia, úsala activamente)
                   2. Si encuentras el material EXACTO, usa ESE precio SIN MODIFICAR (máxima confiabilidad - dato real)
                   3. Si encuentras un material similar, usa ese precio como base y ajusta si es necesario (ayuda de la IA)
                   4. SOLO si NO hay nada en la Base Maestra, entonces usa estos rangos aproximados (conocimiento de la IA):
                      - Cemento Portland: $180-220/bolsa (${getCurrentYear()})
                      - Arena: $400-600/m³ (${getCurrentYear()})
                      - Grava: $500-700/m³ (${getCurrentYear()})
                      - Tabique rojo recocido: $2.50-3.50/pza (${getCurrentYear()})
                      - Block de concreto: $8-12/pza (${getCurrentYear()})
                      - Acero de refuerzo: $18-25/kg
                      - Pintura vinílica: $80-120/L
                   4. En "notes", SIEMPRE indica la fuente: "Precio Base Maestra Neodata" o "Estimado - No encontrado en Base Maestra"

                5. **CONSOLIDACIÓN**:
                   - Agrupa materiales similares sumando cantidades
                   - Mantén unidades consistentes (convertir si es necesario)
                   - Calcula totales por material

                6. **SUPOSICIONES - SOLO CUANDO NO HAY DATOS REALES**:
                   ⚠️ IMPORTANTE: Solo genera suposiciones cuando NO encuentres datos en la Base Maestra
                   - SOLO documenta suposiciones técnicas cuando NO haya datos reales disponibles
                   - Si usas datos de la Base Maestra, NO es una suposción, es un dato real
                   - Incluye justificación de desperdicios aplicados
                   - Menciona estándares usados (Neodata, CAPECO, CMIC) SOLO si no hay datos en Base Maestra

                VALIDACIÓN DE COHERENCIA:
                - El costo total estimado de materiales debe ser coherente con el presupuesto original
                - Si hay gran discrepancia, revisa tus cálculos y desperdicios

                Devuelve UNICAMENTE un objeto JSON con esta estructura exacta:
                {
                    "materials": [
                        {
                            "material": "Nombre completo del material (ej: Cemento Portland CPC 30R)",
                            "unit": "bolsa|m3|kg|pza|L|m",
                            "quantity": 123.45,
                            "unitPrice": 200.00,
                            "category": "Materiales Básicos|Acabados|Instalaciones|Otros",
                            "notes": "Cálculo: [Explicación detallada]. Desperdicio: X%. Estándar: Neodata/CAPECO."
                        }
                    ],
                    "assumptions": [
                        "Nota técnica 1 (ej: Aplanado con espesor estándar de 2cm según Neodata)",
                        "Nota técnica 2 (ej: Concreto f'c=200 kg/cm² según especificaciones del proyecto)"
                    ]
                    
                    IMPORTANTE: 
                    - Si usas datos de la Base Maestra, NO generes suposiciones, solo notas técnicas opcionales
                    - Las "assumptions" solo son necesarias cuando hay parámetros técnicos que debes documentar
                    - Prefiere dejar "assumptions" vacío si todos los materiales están en Base Maestra
                }

                NO incluyas mano de obra ni equipos, SOLO MATERIALES CONSUMIBLES.
                NO incluyas markdown.
                TODOS los cálculos deben estar justificados en el campo "notes".
            `;

            const userPrompt = `Generar explosión de insumos (lista de materiales consolidada) para el siguiente presupuesto:

PARTIDAS DEL PRESUPUESTO:
${itemsList}

CONTEXTO DEL PROYECTO:
- Tipo: ${projectInfo.type || 'General'}
- Ubicación: ${location}
- Total de Partidas: ${items.length}
- Presupuesto Total Estimado: $${totalBudget.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
- Presupuesto en Materiales: $${materialsBudget.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}

INSTRUCCIONES HÍBRIDAS - IA + BASE MAESTRA:
1. 🤝 COLABORA con la Base Maestra: mientras generas cada material, CONSULTA la lista arriba
2. Busca primero en materiales ESPECÍFICOS (marcados con ⭐) que son relevantes para este proyecto
3. Si no encuentras específico, busca en materiales COMUNES (respaldo)
4. Usa precios EXACTOS de Base Maestra cuando estén disponibles (máxima confiabilidad)
5. SOLO si NO está en Base Maestra, la IA puede estimar con su conocimiento + rangos aproximados
6. Desglosa CADA partida en sus materiales base
7. Aplica desperdicios estándar de la industria
8. Consolida materiales similares sumando cantidades
9. Justifica TODOS los cálculos en "notes" indicando: "Base Maestra Neodata" o "Estimado por IA"
10. SOLO documenta suposiciones técnicas cuando NO uses datos de Base Maestra`;

            const result = await BackendAIService.sendPrompt(userPrompt, systemPrompt);
            const responseText = result.candidates?.[0]?.content?.parts?.[0]?.text || '';

            const cleanedResponse = this.cleanJson(responseText);
            const materialData = JSON.parse(cleanedResponse);

            // Validaciones post-generación
            console.log(`📊 Validación de Explosión de Insumos:`);

            if (!materialData.materials || !Array.isArray(materialData.materials)) {
                throw new Error('La respuesta de la IA no contiene un array de materiales válido');
            }

            // Validar que todos los materiales tengan campos requeridos
            const validMaterials = materialData.materials.filter(mat =>
                mat.material && mat.unit && mat.quantity > 0 && mat.unitPrice > 0
            );

            if (validMaterials.length !== materialData.materials.length) {
                console.warn(`⚠️ ${materialData.materials.length - validMaterials.length} material(es) inválido(s) fueron filtrados`);
            }

            // Calcular total estimado de materiales
            const materialsTotal = validMaterials.reduce((sum, mat) => sum + (mat.quantity * mat.unitPrice), 0);
            // materialsBudget ya está declarado arriba (línea 406), no redeclarar

            console.log(`   - Materiales generados: ${validMaterials.length}`);
            console.log(`   - Total estimado de materiales: $${materialsTotal.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`);
            console.log(`   - Presupuesto en materiales: $${materialsBudget.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`);

            // Validar coherencia (el total de materiales debe ser razonable respecto al presupuesto)
            if (materialsBudget > 0) {
                const difference = Math.abs(materialsTotal - materialsBudget);
                const percentDifference = (difference / materialsBudget) * 100;

                if (percentDifference > 50) {
                    console.warn(`⚠️ ADVERTENCIA: El total de materiales ($${materialsTotal.toFixed(2)}) difiere más del 50% del presupuesto en materiales ($${materialsBudget.toFixed(2)})`);
                    console.warn(`   Diferencia: ${percentDifference.toFixed(1)}%`);
                    console.warn(`   Esto puede indicar que faltan materiales o hay errores en los cálculos.`);
                } else if (percentDifference > 30) {
                    console.warn(`⚠️ El total de materiales difiere ${percentDifference.toFixed(1)}% del presupuesto. Revisa los cálculos.`);
                }
            }

            // Validar que haya notas técnicas
            const materialsWithoutNotes = validMaterials.filter(mat => !mat.notes || mat.notes.trim() === '');
            if (materialsWithoutNotes.length > 0) {
                console.warn(`⚠️ ${materialsWithoutNotes.length} material(es) sin notas técnicas. Se recomienda agregar justificación de cálculos.`);
            }

            // POST-PROCESAMIENTO: Reemplazar precios generados con precios EXACTOS de la Base Maestra
            console.log('🔍 Post-procesando: Reemplazando precios con valores EXACTOS de la Base Maestra...');
            let replacedCount = 0;
            let materialsWithRealData = 0;

            const finalMaterials = await Promise.all(validMaterials.map(async (mat) => {
                try {
                    // Buscar precio exacto en la Base Maestra
                    const exactPrices = await MarketPriceService.findReferencePrice(
                        mat.material,
                        mat.category || 'Materiales',
                        location,
                        3
                    );

                    if (exactPrices && exactPrices.length > 0) {
                        // Usar el precio más relevante (el primero ya está ordenado por relevancia)
                        const bestMatch = exactPrices[0];
                        const exactPrice = parseFloat(bestMatch.base_price);

                        if (!isNaN(exactPrice) && exactPrice > 0) {
                            // Actualizar precio con el valor exacto de la Base Maestra
                            const updatedMat = {
                                ...mat,
                                unitPrice: exactPrice,
                                notes: `${mat.notes || ''} | ✅ Precio Base Maestra Neodata (${bestMatch.source || 'Base Maestra'})`.trim()
                            };

                            replacedCount++;
                            materialsWithRealData++;
                            return updatedMat;
                        }
                    }

                    // Si no se encontró en Base Maestra, mantener el precio generado pero marcar como estimado
                    return {
                        ...mat,
                        notes: `${mat.notes || ''} | ⚠️ Precio estimado - No encontrado en Base Maestra`.trim()
                    };
                } catch (error) {
                    console.warn(`Error buscando precio para ${mat.material}:`, error);
                    return mat;
                }
            }));

            // Filtrar y mejorar suposiciones - convertir en notas técnicas profesionales
            const filteredAssumptions = (materialData.assumptions || [])
                .filter(assumption => {
                    // Eliminar suposiciones que mencionen que son suposiciones o estimaciones
                    const assumptionLower = assumption.toLowerCase();
                    return !assumptionLower.includes('se asumió') &&
                        !assumptionLower.includes('asumió') &&
                        !assumptionLower.includes('suposición') &&
                        !assumptionLower.includes('estimado') &&
                        !assumptionLower.includes('aproximado');
                })
                .map(assumption => {
                    // Convertir en notas técnicas profesionales
                    return assumption
                        .replace(/Se asumió/gi, 'Parámetro técnico')
                        .replace(/se asumió/gi, 'parámetro técnico')
                        .replace(/Asumió/gi, 'Estándar')
                        .replace(/Suposición/gi, 'Nota técnica')
                        .replace(/suposición/gi, 'nota técnica');
                })
                // Solo mantener si hay suficientes materiales sin datos reales
                .filter(() => materialsWithRealData < validMaterials.length * 0.7);

            const realDataPercentage = validMaterials.length > 0
                ? ((materialsWithRealData / validMaterials.length) * 100).toFixed(1)
                : 0;

            console.log(`✅ Post-procesamiento completado:`);
            console.log(`   - ${replacedCount} precio(s) reemplazado(s) con valores EXACTOS de la Base Maestra`);
            console.log(`   - ${materialsWithRealData} de ${validMaterials.length} materiales basados en datos reales (${realDataPercentage}%)`);
            console.log(`   - Suposiciones reducidas: ${filteredAssumptions.length} (de ${(materialData.assumptions || []).length})`);

            return {
                materials: finalMaterials,
                assumptions: filteredAssumptions
            };

        } catch (error) {
            console.error('Error generating material takeoff:', error);
            throw error;
        }
    }

    /**
     * Generates a Unit Price Analysis (APU / Matrix) for a specific item
     * @param {Object} item - Budget item (description, unit)
     * @param {Object} projectInfo - Project context
     * @returns {Promise<Object>} - APU Matrix with materials, labor, equipment
     */
    static async generateAPU(item, projectInfo) {
        if (!item || !item.description) throw new Error('Item description is required');

        try {
            const location = projectInfo.location || 'México';
            const currentYear = getCurrentYear();

            // PASO 1: Buscar materiales, mano de obra y equipos en Base Maestra ANTES de generar
            console.log('🔍 Buscando componentes para APU en Base Maestra (Neodata)...');
            const materialPrices = await MarketPriceService.getPricesByCategory('Materiales', location, 100);
            const laborPrices = await MarketPriceService.getPricesByCategory('Mano de Obra', location, 50);
            const equipmentPrices = await MarketPriceService.getPricesByCategory('Equipos', location, 30);

            const baseMaterialsText = materialPrices.length > 0
                ? materialPrices.slice(0, 50).map(p =>
                    `- ${p.description} (${p.unit}): $${p.base_price?.toLocaleString('es-MX', { minimumFractionDigits: 2 })} - ${p.source || 'Base Maestra'}`
                ).join('\n')
                : 'No se encontraron materiales en Base Maestra.';

            const baseLaborText = laborPrices.length > 0
                ? laborPrices.slice(0, 30).map(p =>
                    `- ${p.description} (${p.unit}): $${p.base_price?.toLocaleString('es-MX', { minimumFractionDigits: 2 })} - ${p.source || 'Base Maestra'}`
                ).join('\n')
                : 'No se encontró mano de obra en Base Maestra.';

            const baseEquipmentText = equipmentPrices.length > 0
                ? equipmentPrices.slice(0, 20).map(p =>
                    `- ${p.description} (${p.unit}): $${p.base_price?.toLocaleString('es-MX', { minimumFractionDigits: 2 })} - ${p.source || 'Base Maestra'}`
                ).join('\n')
                : 'No se encontraron equipos en Base Maestra.';

            console.log(`✅ ${materialPrices.length} materiales, ${laborPrices.length} mano de obra, ${equipmentPrices.length} equipos encontrados en Base Maestra`);

            const systemPrompt = `
                Actúa como un experto Analista de Precios Unitarios (Ingeniero de Costos) en ${location}, nivel NEODATA/OPUS/CONSTRUBASE.
                Tu tarea es generar una Tarjeta de Precios Unitarios (Matriz) detallada y profesional usando precios REALES de la Base Maestra Neodata cuando estén disponibles.
                
                ⚠️⚠️⚠️ CRÍTICO - PRECIO UNITARIO (POR 1 UNIDAD) ⚠️⚠️⚠️:
                El APU que generes DEBE calcular el precio para EXACTAMENTE 1 (UNA) unidad del concepto especificado (ej: 1 m3, 1 m2, 1 pza).
                NO multipliques por la cantidad total del proyecto. Las cantidades que uses en materiales, mano de obra y equipos deben ser las necesarias para ejecutar 1 unidad del concepto.
                El precio final del APU será el precio por unidad. Si el concepto es "por m3", calcula el costo para 1 m3. Si es "por m2", calcula para 1 m2.
                
                EJEMPLO: Si el concepto es "Colado de concreto" con unidad "m3":
                - Calcula materiales, mano de obra y equipos para ejecutar 1 m3
                - NO multipliques por la cantidad total del proyecto (ej: si hay 100 m3 en el proyecto, calcula solo para 1 m3)
                - El precio final será el precio por m3
                
                ⚠️ CRÍTICO - PRIORIDAD A BASE MAESTRA:
                1. PRIMERO busca en la Base Maestra (listas abajo) - usa esos precios EXACTOS
                2. SOLO si no está en Base Maestra, usa precios del año ${currentYear}
                3. Los precios de materiales, mano de obra y equipos cambian constantemente. SIEMPRE usa los más actuales disponibles.
                
                BASE MAESTRA - MATERIALES (${materialPrices.length} disponibles):
${baseMaterialsText}
                
                BASE MAESTRA - MANO DE OBRA (${laborPrices.length} disponibles):
${baseLaborText}
                
                BASE MAESTRA - EQUIPOS (${equipmentPrices.length} disponibles):
${baseEquipmentText}

                INSTRUCCIONES TÉCNICAS CRÍTICAS:
                1. **Cero Ambigüedad**:
                   - NO uses términos como "Lote", "Salida", "Juego" o "Global" en materiales principales. Debes desglosarlos (ej: en vez de "Salida eléctrica", lista: caja chalupa, manguera, cable, cinta).
                   - Especifica cantidades exactas con al menos 4 decimales si es necesario.

                2. **PRECIOS - REGLAS CRÍTICAS**:
                   - Si un material está en la Base Maestra arriba, usa ESE precio EXACTO sin modificar
                   - Si la mano de obra está en la Base Maestra arriba, usa ESE salario EXACTO
                   - SOLO si no está en Base Maestra, usa precios estimados del año ${currentYear}
                   - En "notes", indica siempre la fuente: "Base Maestra Neodata" o "Estimado ${currentYear}"
                
                3. **Mano de Obra y Rendimientos (Yields)** - CRÍTICO PARA PRECIO UNITARIO:
                   - Para cada categoría de mano de obra, define el "Salario Base" (busca primero en Base Maestra arriba) y el "FSR" (aprox 1.7-1.8).
                   - **IMPORTANTE**: Las cantidades de mano de obra (jor, horas) deben ser para EJECUTAR 1 UNIDAD del concepto.
                   - Si el concepto es "por m2" y el rendimiento es 12 m2/jor, entonces para 1 m2 necesitas 1/12 = 0.0833 jor.
                   - Si el concepto es "por m3" y el rendimiento es 5 m3/jor, entonces para 1 m3 necesitas 1/5 = 0.2 jor.
                   - En el campo "notes" del JSON, DEBES justificar el rendimiento usado. (Ej: "Rendimiento: 12m2/jor -> Para 1 m2 se necesita 0.0833 jor").

                4. **Materiales Completos - PARA 1 UNIDAD**:
                   - Las cantidades de materiales deben ser las necesarias para ejecutar EXACTAMENTE 1 unidad del concepto.
                   - Incluye desperdicios (ej: 5% en concreto, entonces si necesitas 1 m3, usa 1.05 m3).
                   - No olvides materiales auxiliares (agua, andamios, clavos, alambre recocido).
                   - PRIMERO busca en Base Maestra antes de estimar.
                   - EJEMPLO: Si el concepto es "Muro de block" por m2 y necesitas 12.5 blocks por m2, la cantidad debe ser 12.5 (o 13.125 con desperdicio).

                5. **Estructura de Costos (Cascada) - PRECIO POR 1 UNIDAD**:
                   - Costo Directo = Materiales + Mano de Obra (con FSR) + Equipo + Herramienta Menor.
                     * Todos estos costos deben ser para ejecutar 1 unidad del concepto.
                   - Herramienta Menor = % de Mano de Obra (3-5%).
                   - Indirectos = % del Costo Directo (ej: 16%).
                   - Financiamiento = % (ej: 1-2%).
                   - Utilidad = % (ej: 10%).
                   - Additional = % (ej: 0.5%).
                   - El PRECIO UNITARIO FINAL es el precio para 1 unidad. Este es el resultado final del APU.

                6. **Chain of Thought (Razonamiento)**:
                   - Antes de generar el JSON, piensa paso a paso en el campo "reasoning_steps" (array de strings) cómo calcularás los rendimientos y materiales.

                ⚠️⚠️⚠️ ESTRUCTURA JSON - CANTIDADES PARA 1 UNIDAD ⚠️⚠️⚠️:
                Todas las cantidades (quantity) en materials, labor y equipment deben ser para ejecutar EXACTAMENTE 1 unidad del concepto.
                
                EJEMPLOS CLAROS:
                
                Si el concepto es "Colado de concreto" con unidad "m3":
                - Materiales: quantity debe ser para 1 m3 (ej: concreto 1.05 m3 con desperdicio, acero 50 kg para 1 m3, etc.)
                - Mano de obra: quantity debe ser jornales para ejecutar 1 m3 (ej: si rendimiento es 5 m3/jor, entonces quantity = 0.2 jor)
                - Equipos: quantity debe ser horas para ejecutar 1 m3 (ej: 0.5 hora de revolvedora para 1 m3)
                
                Si el concepto es "Aplanado de muro" con unidad "m2":
                - Materiales: quantity debe ser para 1 m2 (ej: mortero 0.02 m3 para 1 m2, agua 0.01 m3 para 1 m2)
                - Mano de obra: quantity debe ser jornales para ejecutar 1 m2 (ej: si rendimiento es 12 m2/jor, entonces quantity = 0.0833 jor)
                
                Devuelve UNICAMENTE un objeto JSON con esta estructura exacta:
                {
                    "reasoning_steps": [
                        "Paso 1: Determinar rendimiento de cuadrilla para 1 ${item.unit || 'unidad'}...",
                        "Paso 2: Calcular materiales necesarios para 1 ${item.unit || 'unidad'} con desperdicio..."
                    ],
                    "materials": [
                        { "description": "Nombre del material", "unit": "kg/m2/pza", "quantity": 1.05, "unitPrice": 100.00, "total": 105.00 }
                        // quantity = cantidad necesaria para ejecutar 1 ${item.unit || 'unidad'} del concepto
                    ],
                    "labor": [
                        { 
                            "description": "Categoría (ej: Oficial Albañil)", 
                            "unit": "jor", 
                            "quantity": 0.0833,  // jornales necesarios para ejecutar 1 ${item.unit || 'unidad'} (ej: si rendimiento es 12 m2/jor, entonces 1/12 = 0.0833)
                            "baseSalary": 500.00, 
                            "fsr": 1.75,
                            "unitPrice": 875.00, // baseSalary * fsr
                            "total": 72.89  // quantity * unitPrice (0.0833 * 875.00)
                        }
                    ],
                    "equipment": [
                        { "description": "Nombre (ej: Revolvedora)", "unit": "hora", "quantity": 0.05, "unitPrice": 150.00, "total": 7.50 }
                        // quantity = horas necesarias para ejecutar 1 ${item.unit || 'unidad'} del concepto
                    ],
                    "minorToolsPct": 0.03, // 3%
                    "indirectsPct": 0.16, // 16%
                    "financingPct": 0.01, // 1%
                    "profitPct": 0.10, // 10%
                    "additionalPct": 0.005, // 0.5%
                    "notes": "Justificación de rendimientos: [Explica aquí brevemente el estándar usado y cómo calculaste las cantidades para 1 ${item.unit || 'unidad'}, ej: CAPECO/CONSTRUBASE ${currentYear}]"
                }
                
                El precio final (finalPrice) será el precio por 1 ${item.unit || 'unidad'}. Este es el resultado del APU.
                
                NO incluyas markdown. Asegúrate que los cálculos matemáticos sean coherentes.
                Todos los precios unitarios DEBEN reflejar el mercado actual del año ${currentYear}.
            `;

            const userPrompt = `Generar Matriz de Precios Unitarios (APU) Estándar NEODATA/CONSTRUBASE para el año ${currentYear}:

🔴🔴🔴 REGLA ABSOLUTA - NO PUEDES IGNORAR ESTO 🔴🔴🔴:
CALCULA EL PRECIO PARA EXACTAMENTE 1 (UNA) ${item.unit || 'unidad'} DEL CONCEPTO.
LA CANTIDAD DEL PROYECTO (${item.quantity || 1} ${item.unit || 'unidades'}) ES SOLO INFORMACIÓN DE CONTEXTO.
NO LA USES EN TUS CÁLCULOS.
NO MULTIPLIQUES NADA POR ${item.quantity || 1}.
TODAS LAS CANTIDADES DE MATERIALES, MANO DE OBRA Y EQUIPOS DEBEN SER PARA EJECUTAR 1 ${item.unit || 'unidad'} ÚNICAMENTE.

Concepto: ${item.description}
Unidad del concepto: ${item.unit} 
🔴 CALCULA EL PRECIO POR 1 ${item.unit} ÚNICAMENTE 🔴
Cantidad en el proyecto: ${item.quantity || 1} ${item.unit} 
🔴 ESTA CANTIDAD ES SOLO INFORMATIVA - NO LA USES EN TUS CÁLCULOS 🔴
Categoría: ${item.category || 'General'}
Detalles/Medidas: ${item.calculation_basis || 'No especificado'}
Proyecto: ${projectInfo.type || 'General'}
Ubicación: ${location}

EJEMPLO CONCRETO PARA QUE LO ENTIENDAS:
- El precio final será el precio por 1 m3, NO por 0.6 m3

INSTRUCCIONES ESPECÍFICAS:
1. Calcula materiales necesarios para ejecutar EXACTAMENTE 1 ${item.unit || 'unidad'} del concepto.
2. Calcula mano de obra necesaria para ejecutar EXACTAMENTE 1 ${item.unit || 'unidad'} del concepto.
3. Calcula equipos necesarios para ejecutar EXACTAMENTE 1 ${item.unit || 'unidad'} del concepto.
4. El precio final del APU será el precio por 1 ${item.unit || 'unidad'}.
5. Si el concepto menciona medidas (ej: "15x20cm"), usa esas medidas para calcular los materiales necesarios para 1 unidad, NO para ${item.quantity || 1} unidades.

RECUERDA: IGNORA COMPLETAMENTE LA CANTIDAD DEL PROYECTO (${item.quantity || 1}). SOLO CALCULA PARA 1 ${item.unit || 'unidad'}.`;

            const result = await BackendAIService.sendPrompt(userPrompt, systemPrompt);
            const responseText = result.candidates?.[0]?.content?.parts?.[0]?.text || '';

            const cleanedResponse = this.cleanJson(responseText);
            let apuData = JSON.parse(cleanedResponse);

            console.log('🤖 RAW AI RESPONSE:', JSON.stringify(apuData, null, 2));

            // POST-PROCESAMIENTO: Reemplazar precios generados con precios EXACTOS de la Base Maestra
            console.log('🔍 Post-procesando APU: Reemplazando precios con valores EXACTOS de la Base Maestra...');

            // 1. Enforce Master Catalog Prices (Centralized in APUService)
            const enforcementResult = await APUService.enforceMasterCatalogPrices(apuData, location);
            apuData = enforcementResult.apuData;

            // Update local statistics for final reporting
            let replacedMaterialsCount = enforcementResult.stats.replacedMaterialsCount;
            let replacedLaborCount = enforcementResult.stats.replacedLaborCount;
            let materialsWithRealData = enforcementResult.stats.materialsWithRealData;
            let laborWithRealData = enforcementResult.stats.laborWithRealData;

            // 2. Enrich with Engineering Logic (Neodata Level)
            if (projectInfo && projectInfo.type) {
                console.log(`🔧 Aplicando lógica de ingeniería para especialidad: ${projectInfo.type}`);
                apuData = APUService.enrichWithEngineeringLogic(apuData, projectInfo.type);
            }

            // Actualizar notas del APU con estadísticas
            const totalItems = (apuData.materials?.length || 0) + (apuData.labor?.length || 0);
            const realDataItems = materialsWithRealData + laborWithRealData;
            const realDataPercentage = totalItems > 0
                ? ((realDataItems / totalItems) * 100).toFixed(1)
                : 0;

            const sourceNote = realDataItems > 0
                ? ` | ${realDataItems}/${totalItems} componentes (${realDataPercentage}%) basados en Base Maestra Neodata`
                : ` | Precios estimados ${currentYear}`;

            apuData.notes = `${apuData.notes || ''}${sourceNote}`.trim();

            console.log(`✅ Post-procesamiento APU completado:`);
            console.log(`   - ${replacedMaterialsCount} material(es) reemplazado(s) con valores EXACTOS de Base Maestra`);
            console.log(`   - ${replacedLaborCount} concepto(s) de mano de obra reemplazado(s) con valores EXACTOS`);
            console.log(`   - ${realDataItems}/${totalItems} componentes basados en datos reales (${realDataPercentage}%)`);

            // VALIDACIONES DE COHERENCIA DEL APU - DETECCIÓN DE ERRORES CRÍTICOS
            const validationWarnings = [];
            const validationErrors = [];
            const itemQuantity = item.quantity || 1;
            const itemUnit = item.unit ? item.unit.toLowerCase().replace(/\./g, '').trim() : '';

            // Validar cantidades de materiales típicos
            if (apuData.materials && Array.isArray(apuData.materials)) {
                const concrete = apuData.materials.find(m => m.description?.toLowerCase().includes('concreto'));
                const steel = apuData.materials.filter(m => m.description?.toLowerCase().includes('acero') || m.description?.toLowerCase().includes('varilla'));
                const wood = apuData.materials.find(m => m.description?.toLowerCase().includes('madera') || m.description?.toLowerCase().includes('pino'));

                // Validar concreto: SOLO si el item es m3
                if (concrete && concrete.unit === 'm3') {
                    if (itemUnit === 'm3') {
                        // Para 1 m3 de item, esperamos ~1.0-1.1 m3 de concreto
                        if (concrete.quantity < 0.9 || concrete.quantity > 1.2) {
                            if (Math.abs(concrete.quantity - itemQuantity) < 0.2 && itemQuantity !== 1) {
                                validationErrors.push(`❌ ERROR CRÍTICO: Cantidad de concreto (${concrete.quantity} m3) es igual a la cantidad del proyecto (${itemQuantity} m3). El APU está calculando para ${itemQuantity} m3 en lugar de 1 m3.`);
                            } else {
                                validationWarnings.push(`⚠️ Cantidad de concreto (${concrete.quantity} m3) parece incorrecta para 1 m3 de elemento.`);
                            }
                        }
                    } else if (['ml', 'm', 'metro'].includes(itemUnit)) {
                        // Para elementos lineales, la cantidad debe ser pequeña (ej. 0.03 m3/ml)
                        if (concrete.quantity > 0.5) {
                            validationWarnings.push(`⚠️ Cantidad de concreto (${concrete.quantity} m3) parece muy alta para 1 ml de elemento.`);
                        }
                    }
                }

                // Validar acero: SOLO si el item es m3 (para kg/m3)
                const totalSteel = steel.reduce((sum, s) => sum + (s.quantity || 0), 0);
                if (totalSteel > 0) {
                    if (itemUnit === 'm3') {
                        const expectedSteelPerM3 = 60; // kg/m3 típico
                        const expectedSteelForProject = expectedSteelPerM3 * itemQuantity;
                        if (Math.abs(totalSteel - expectedSteelForProject) < Math.abs(totalSteel - expectedSteelPerM3) && itemQuantity !== 1) {
                            validationErrors.push(`❌ ERROR CRÍTICO: Cantidad de acero (${totalSteel.toFixed(2)} kg) parece calculada para ${itemQuantity} m3.`);
                        } else if (totalSteel > 150) {
                            validationWarnings.push(`⚠️ Cantidad de acero (${totalSteel.toFixed(2)} kg) es MUY ALTA para 1 m3.`);
                        }
                    }
                    // Para ml, no validamos rango estricto porque depende de la sección
                }

                // Validar madera: SOLO si el item es m3
                if (wood && (wood.unit === 'p.t.' || wood.unit === 'pt') && itemUnit === 'm3') {
                    const expectedWoodPerM3 = 1.0;
                    const expectedWoodForProject = expectedWoodPerM3 * itemQuantity;
                    if (Math.abs(wood.quantity - expectedWoodForProject) < Math.abs(wood.quantity - expectedWoodPerM3) && itemQuantity !== 1) {
                        validationErrors.push(`❌ ERROR CRÍTICO: Cantidad de madera parece calculada para el total del proyecto.`);
                    }
                }
            }

            // Validar mano de obra
            if (apuData.labor && Array.isArray(apuData.labor)) {
                const totalLabor = apuData.labor.reduce((sum, l) => sum + (l.quantity || 0), 0);
                if (itemUnit === 'm3' && item.description?.toLowerCase().includes('colado')) {
                    const expectedLaborPerM3 = 0.25;
                    const expectedLaborForProject = expectedLaborPerM3 * itemQuantity;
                    if (Math.abs(totalLabor - expectedLaborForProject) < Math.abs(totalLabor - expectedLaborPerM3) && itemQuantity !== 1) {
                        validationErrors.push(`❌ ERROR CRÍTICO: Mano de obra (${totalLabor.toFixed(2)} jor) parece calculada para ${itemQuantity} m3.`);
                    }
                }
            }

            // Mostrar errores críticos primero
            if (validationErrors.length > 0) {
                console.error('❌ ERRORES CRÍTICOS EN EL APU:');
                validationErrors.forEach(error => console.error(`   ${error}`));
                console.error(`   🔴 El APU está calculando para ${itemQuantity} ${item.unit || 'unidades'} en lugar de 1 ${item.unit || 'unidad'}.`);
                console.error(`   🔴 REGENERA el APU y verifica que el prompt indique claramente calcular para 1 unidad.`);
            }

            if (validationWarnings.length > 0) {
                console.warn('🔍 VALIDACIONES DE COHERENCIA DEL APU:');
                validationWarnings.forEach(warning => console.warn(`   ${warning}`));
            }

            // Validar y reportar precio unitario final
            let finalPrice = APUService.calculateFinalPrice(apuData);
            const currentPrice = item.unitPrice || 0;
            const quantity = item.quantity || 1;

            // CORRECCIÓN AUTOMÁTICA: Si detectamos que está calculando para la cantidad total, corregir
            let wasCorrected = false;
            if (currentPrice > 0 && quantity !== 1) {
                const priceRatio = finalPrice / currentPrice;
                const totalProjectPrice = currentPrice * quantity;

                // Si el precio del APU es similar al precio total del proyecto, está mal calculado
                const isCalculatingForTotal = Math.abs(finalPrice - totalProjectPrice) < Math.abs(finalPrice - currentPrice);

                // Si el ratio es similar a la cantidad, está calculando para la cantidad total
                const isPriceProportionalToQuantity = Math.abs(priceRatio - quantity) < 0.3;

                // Si la diferencia es >500% y el precio es proporcional a la cantidad, corregir automáticamente
                const priceDiffPercent = (Math.abs(finalPrice - currentPrice) / currentPrice) * 100;
                if ((isCalculatingForTotal || isPriceProportionalToQuantity) && priceDiffPercent > 200) {
                    console.warn(`   ⚠️ CORRECCIÓN AUTOMÁTICA: El APU parece estar calculando para ${quantity} ${item.unit || 'unidades'}.`);
                    console.warn(`   ⚠️ Precio detectado: $${finalPrice.toLocaleString('es-MX', { minimumFractionDigits: 2 })}`);
                    console.warn(`   ⚠️ Dividiendo por ${quantity} para obtener el precio por 1 ${item.unit || 'unidad'}...`);

                    // Dividir todas las cantidades del APU por la cantidad del proyecto
                    if (apuData.materials && Array.isArray(apuData.materials)) {
                        apuData.materials = apuData.materials.map(mat => ({
                            ...mat,
                            quantity: (mat.quantity || 0) / quantity
                        }));
                    }
                    if (apuData.labor && Array.isArray(apuData.labor)) {
                        apuData.labor = apuData.labor.map(lab => ({
                            ...lab,
                            quantity: (lab.quantity || 0) / quantity
                        }));
                    }
                    if (apuData.equipment && Array.isArray(apuData.equipment)) {
                        apuData.equipment = apuData.equipment.map(eq => ({
                            ...eq,
                            quantity: (eq.quantity || 0) / quantity
                        }));
                    }

                    // Recalcular el precio final
                    finalPrice = APUService.calculateFinalPrice(apuData);
                    wasCorrected = true;

                    console.warn(`   ✅ Precio corregido: $${finalPrice.toLocaleString('es-MX', { minimumFractionDigits: 2 })} por 1 ${item.unit || 'unidad'}`);
                }
            }

            console.log(`💰 PRECIO UNITARIO FINAL DEL APU: $${finalPrice.toLocaleString('es-MX', { minimumFractionDigits: 2 })} por ${item.unit || 'unidad'}`);
            if (wasCorrected) {
                console.log(`   ✅ Este precio fue CORREGIDO automáticamente (el APU estaba calculando para ${quantity} ${item.unit || 'unidades'})`);
                // Actualizar las notas para reflejar la corrección
                apuData.notes = `${apuData.notes || ''} | ⚠️ CORRECCIÓN AUTOMÁTICA: Las cantidades originales parecían estar calculadas para el total del proyecto (${quantity} ${item.unit}). Se han dividido por ${quantity} para obtener el unitario.`.trim();
            } else {
                console.log(`   ⚠️ Este es el precio por 1 ${item.unit || 'unidad'} del concepto "${item.description}"`);
                console.log(`   ⚠️ NO multipliques este precio por la cantidad del proyecto (${quantity} ${item.unit || 'unidades'})`);
            }

            if (currentPrice > 0) {
                const priceDiff = Math.abs(finalPrice - currentPrice);
                const priceDiffPercent = (priceDiff / currentPrice) * 100;
                const totalProjectPrice = currentPrice * quantity;

                console.log(`   📊 Precio actual del item: $${currentPrice.toLocaleString('es-MX', { minimumFractionDigits: 2 })} por ${item.unit || 'unidad'}`);
                console.log(`   📊 Diferencia: $${priceDiff.toLocaleString('es-MX', { minimumFractionDigits: 2 })} (${priceDiffPercent.toFixed(1)}%)`);

                if (!wasCorrected) {
                    const priceRatio = finalPrice / currentPrice;
                    const isPriceProportionalToQuantity = quantity !== 1 && Math.abs(priceRatio - quantity) < 0.3;

                    if (isPriceProportionalToQuantity && quantity !== 1) {
                        console.error(`   ❌❌❌ ERROR CRÍTICO DETECTADO ❌❌❌`);
                        console.error(`   ❌ El APU está calculando para ${quantity} ${item.unit || 'unidades'} en lugar de 1 ${item.unit || 'unidad'}.`);
                        console.error(`   ❌ Precio del APU: $${finalPrice.toLocaleString('es-MX', { minimumFractionDigits: 2 })}`);
                        console.error(`   ❌ Precio esperado para 1 ${item.unit || 'unidad'}: ~$${currentPrice.toLocaleString('es-MX', { minimumFractionDigits: 2 })}`);
                        console.error(`   ❌ El APU generó un precio ${priceRatio.toFixed(2)}x mayor, lo cual coincide con la cantidad del proyecto (${quantity}).`);
                        console.error(`   🔴 NO APLIQUES ESTE PRECIO. REGENERA el APU.`);
                    } else if (priceDiffPercent > 500) {
                        console.error(`   ❌ ERROR: El precio del APU ($${finalPrice.toLocaleString('es-MX', { minimumFractionDigits: 2 })}) es ${priceDiffPercent.toFixed(1)}% mayor que el precio actual.`);
                        console.error(`   ❌ Esto es EXTREMADAMENTE sospechoso. Verifica que el APU esté calculando para 1 ${item.unit || 'unidad'} y no para ${quantity} ${item.unit || 'unidades'}.`);
                    } else if (priceDiffPercent > 200) {
                        console.warn(`   ⚠️ ADVERTENCIA: El precio del APU ($${finalPrice.toLocaleString('es-MX', { minimumFractionDigits: 2 })}) difiere significativamente del precio actual (${priceDiffPercent.toFixed(1)}% de diferencia).`);
                        console.warn(`   ⚠️ Esto puede ser normal si el precio actual es una estimación. El APU calcula el precio real basado en materiales, mano de obra y equipos.`);
                    } else if (priceDiffPercent > 50 && priceDiffPercent <= 200) {
                        console.log(`   ℹ️ El precio del APU difiere del precio actual en ${priceDiffPercent.toFixed(1)}%. Esto puede ser normal.`);
                    }
                }
            }

            console.log(`   💡 Precio total del concepto en el proyecto: $${(finalPrice * quantity).toLocaleString('es-MX', { minimumFractionDigits: 2 })} (${quantity} ${item.unit || 'unidades'} × $${finalPrice.toLocaleString('es-MX', { minimumFractionDigits: 2 })} por ${item.unit || 'unidad'})`);

            return apuData;

        } catch (error) {
            console.error('Error generating APU:', error);
            throw error;
        }
    }

    /**
     * Calculates volume/quantity from a natural language description.
     * @param {string} description - The user's description (e.g., "Muro de 5x3").
     * @param {string} unit - The target unit (e.g., "m2").
     * @returns {Promise<{formula: string, explanation: string, result: number}>}
     */
    static async calculateVolume(description, unit) {
        const prompt = `
            Act as a quantity surveyor (Generador de Obra).
            Calculate the quantity/volume based on the following description and unit.
            
            Description: "${description}"
            Target Unit: "${unit}"

            Return a JSON object with:
            - "formula": The mathematical formula used (e.g., "5 * 3").
            - "explanation": A brief explanation of the calculation.
            - "result": The numeric result.
        `;

        try {
            const result = await BackendAIService.sendPrompt(prompt);
            const text = result.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
            const cleanJson = this.cleanJson(text);
            return JSON.parse(cleanJson);
        } catch (error) {
            console.error('Error calculating volume:', error);
            return { formula: '', explanation: 'Error calculating', result: 0 };
        }
    }

    /**
     * Generate professional descriptions for budget items (Ported from GeminiService)
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
            console.error('Error generating description:', error);
            throw error;
        }
    }

    /**
     * Suggest price range based on catalog and context (Ported from GeminiService)
     * @param {Object} itemData - Item information
     * @param {Array} catalogData - Catalog items for reference
     * @returns {Promise<Object>} - Price suggestion with range
     */
    static async suggestPrice(itemData, catalogData = [], location = 'México') {
        const { description, unit, category } = itemData;

        // PRIORIDAD 1: Buscar en catálogo del usuario
        const similarItems = this.filterCatalogByRelevance(catalogData, description, 10);

        // PRIORIDAD 2: Buscar en Tabulador Oficial CDMX y otras fuentes de mercado
        let marketPrices = [];
        try {
            marketPrices = await MarketPriceService.findReferencePrice(description, category || 'Materiales', location, 10);
        } catch (error) {
            console.error('Error fetching market prices for suggestion:', error);
        }

        // Priorizar precios oficiales del tabulador CDMX
        const officialPrices = marketPrices.filter(p => p.source === 'cdmx_tabulador').map(p => parseFloat(p.base_price));
        const otherMarketPrices = marketPrices.filter(p => p.source !== 'cdmx_tabulador').map(p => parseFloat(p.base_price));

        // Combinar fuentes: catálogo primero, luego oficiales, luego otros
        const catalogPrices = similarItems
            .map(item => item.unitPrice || item.price || 0)
            .filter(p => p > 0);

        const allPrices = [...catalogPrices, ...officialPrices, ...otherMarketPrices].filter(p => p > 0);

        if (allPrices.length === 0) {
            return {
                suggested: null,
                min: null,
                max: null,
                confidence: 'low',
                message: 'No hay datos suficientes para sugerir un precio',
                source: 'none'
            };
        }

        // Calcular estadísticas, dando más peso a precios oficiales
        const avg = allPrices.reduce((a, b) => a + b, 0) / allPrices.length;
        const min = Math.min(...allPrices);
        const max = Math.max(...allPrices);

        // Si hay precios oficiales, priorizar el promedio de esos
        const suggestedPrice = officialPrices.length > 0
            ? officialPrices.reduce((a, b) => a + b, 0) / officialPrices.length
            : catalogPrices.length > 0
                ? catalogPrices.reduce((a, b) => a + b, 0) / catalogPrices.length
                : avg;

        const priceSources = [];
        if (catalogPrices.length > 0) priceSources.push(`${catalogPrices.length} del catálogo del usuario`);
        if (officialPrices.length > 0) priceSources.push(`${officialPrices.length} del Tabulador Oficial CDMX`);
        if (otherMarketPrices.length > 0) priceSources.push(`${otherMarketPrices.length} de otras fuentes`);

        let promptText = `Eres un experto en costos de construcción en México.\n\n`;

        if (priceSources.length > 0) {
            promptText += `Fuentes de precios disponibles:\n${priceSources.join('\n')}\n\n`;
        }

        if (officialPrices.length > 0) {
            promptText += `⭐ PRECIOS OFICIALES DEL TABULADOR CDMX:\n${officialPrices.map(p => `- $${p.toFixed(2)}`).join('\n')}\n\n`;
        }

        if (catalogPrices.length > 0) {
            promptText += `Precios del catálogo del usuario:\n${catalogPrices.slice(0, 5).map(p => `- $${p.toFixed(2)}`).join('\n')}\n\n`;
        }

        promptText += `Sugiere un precio razonable para:\n- Descripción: ${description}\n- Unidad: ${unit}\n- Categoría: ${category || 'General'}\n- Ubicación: ${location}\n\n`;
        promptText += `Estadísticas disponibles:\n- Precio promedio general: $${avg.toFixed(2)}\n- Rango: $${min.toFixed(2)} - $${max.toFixed(2)}\n`;

        if (officialPrices.length > 0) {
            const officialAvg = officialPrices.reduce((a, b) => a + b, 0) / officialPrices.length;
            promptText += `- Precio promedio del Tabulador Oficial CDMX: $${officialAvg.toFixed(2)}\n`;
            promptText += `\nIMPORTANTE: Si hay precios del Tabulador Oficial CDMX, prioriza esos (son oficiales y actualizados).\n`;
        }

        promptText += `\nResponde SOLO con un número (el precio sugerido en pesos mexicanos), sin símbolos ni texto adicional.`;

        try {
            const result = await BackendAIService.sendPrompt(promptText);
            const text = result.candidates?.[0]?.content?.parts?.[0]?.text || '';
            const aiSuggestedPrice = parseFloat(text.replace(/[^0-9.]/g, ''));

            const finalPrice = !isNaN(aiSuggestedPrice) && aiSuggestedPrice > 0 ? aiSuggestedPrice : suggestedPrice;

            return {
                suggested: finalPrice,
                min: min * 0.9,
                max: max * 1.1,
                confidence: officialPrices.length > 0 ? 'high' : catalogPrices.length >= 5 ? 'high' : catalogPrices.length >= 2 ? 'medium' : 'low',
                similarCount: similarItems.length + marketPrices.length,
                source: officialPrices.length > 0 ? 'cdmx_tabulador' : catalogPrices.length > 0 ? 'catalog' : 'market',
                officialPricesCount: officialPrices.length
            };
        } catch (error) {
            console.error('Error suggesting price:', error);
            return {
                suggested: suggestedPrice,
                min: min * 0.9,
                max: max * 1.1,
                confidence: officialPrices.length > 0 ? 'high' : 'medium',
                similarCount: similarItems.length + marketPrices.length,
                source: officialPrices.length > 0 ? 'cdmx_tabulador' : catalogPrices.length > 0 ? 'catalog' : 'market',
                officialPricesCount: officialPrices.length
            };
        }
    }

    /**
     * Helper to clean JSON string
     * @param {string} text 
     * @returns {string}
     */
    static cleanJson(text) {
        return text
            .replace(/```json/g, '')
            .replace(/```/g, '')
            .trim();
    }
}
