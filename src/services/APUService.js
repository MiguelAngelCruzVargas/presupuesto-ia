/**
 * APUService
 * Servicio dedicado para Análisis de Precios Unitarios (APU)
 * Maneja cálculos, validaciones y transformaciones de datos APU
 * 
 * Estándar: NEODATA/OPUS
 */

import { MarketPriceService } from './MarketPriceService';

export class APUService {
    // Valores por defecto según estándar mexicano
    static DEFAULT_CONFIG = {
        minorToolsPct: 0.03,      // 3% de herramienta menor sobre mano de obra
        indirectsPct: 0.16,        // 16% indirectos sobre costo directo
        financingPct: 0.01,       // 1% financiamiento
        profitPct: 0.10,          // 10% utilidad
        additionalPct: 0.005,      // 0.5% cargos adicionales
        defaultFSR: 1.75          // Factor de Salario Real por defecto
    };

    // Lógica de ingeniería por especialidad (Nivel Neodata)
    static SPECIALTY_LOGIC = {
        'ELECTRICA_BAJA_TENSION': {
            consumablesPct: 0.05, // 5% para "Material Menor" (pijas, cinta, conectores)
            safetyGearPct: 0.02,  // Equipo de seguridad dieléctrico
            recommendedUnits: ['salida', 'ml', 'pza']
        },
        'ELECTRICA_MEDIA_TENSION': {
            heavyEquipment: true, // Requiere grúas o canastillas
            specializedLabor: 'Cuadrilla de Linieros',
            testingPct: 0.03      // Pruebas de megger/continuidad
        },
        'JARDINERIA_PAISAJISMO': {
            shrinkagePct: 0.10,   // 10% merma en plantas/pasto (se secan)
            waterConsumption: true,
            laborType: 'Jornaleros Paisajistas'
        },
        'ALBAÑILERIA': {
            minorToolsPct: 0.05, // Mayor desgaste de herramienta
            cleanupPct: 0.02     // Limpieza constante
        }
    };

    /**
     * Enriquece el APU con lógica de ingeniería según la especialidad
     * Inyecta componentes "fantasma" que Neodata siempre incluye
     * @param {Object} apuData - Datos base del APU
     * @param {string} specialty - Especialidad (ej: 'electrica', 'jardineria')
     * @returns {Object} - APU enriquecido con items automáticos
     */
    static enrichWithEngineeringLogic(apuData, specialty) {
        if (!specialty) return apuData;

        const normalizedSpecialty = specialty.toUpperCase();
        let logic = {};

        // Detectar lógica a aplicar
        if (normalizedSpecialty.includes('ELECTRICA') || normalizedSpecialty.includes('ELECTRIC')) {
            logic = this.SPECIALTY_LOGIC['ELECTRICA_BAJA_TENSION'];
        } else if (normalizedSpecialty.includes('JARDIN')) {
            logic = this.SPECIALTY_LOGIC['JARDINERIA_PAISAJISMO'];
        } else if (normalizedSpecialty.includes('ALBAÑIL') || normalizedSpecialty.includes('CIVIL')) {
            logic = this.SPECIALTY_LOGIC['ALBAÑILERIA'];
        }

        const enriched = JSON.parse(JSON.stringify(apuData));
        enriched.materials = enriched.materials || [];

        // Lógica: Material Menor (Consumibles)
        if (logic.consumablesPct) {
            const matTotal = this.calculateMaterialsTotal(enriched.materials);
            if (matTotal > 0) {
                // Verificar si ya existe para no duplicar
                const hasConsumables = enriched.materials.some(m => m.description.includes('Material menor') || m.description.includes('Consumibles'));
                if (!hasConsumables) {
                    enriched.materials.push({
                        description: "Material menor (Cinta aislante, conectores, tornillería, etc.)",
                        unit: "%",
                        quantity: 1,
                        unitPrice: matTotal * logic.consumablesPct,
                        isGenerated: true
                    });
                }
            }
        }

        // Lógica: Merma por ser vivos (Jardinería)
        if (logic.shrinkagePct) {
            const matTotal = this.calculateMaterialsTotal(enriched.materials);
            if (matTotal > 0) {
                enriched.materials.push({
                    description: "Merma y reposición de material vegetal (Garantía)",
                    unit: "%",
                    quantity: 1,
                    unitPrice: matTotal * logic.shrinkagePct,
                    isGenerated: true
                });
            }
        }

        // Lógica: Limpieza fina (Albañilería)
        if (logic.cleanupPct) {
            const directCost = this.calculateDirectCost(enriched);
            if (directCost > 0) {
                enriched.materials.push({
                    description: "Limpieza fina de obra y retiro de escombro fuera de la zona",
                    unit: "lote",
                    quantity: 1,
                    unitPrice: directCost * logic.cleanupPct,
                    isGenerated: true
                });
            }
        }

        return enriched;
    }

    /**
     * Enforces official prices from the Master Catalog if a match is found.
     * @param {Object} apuData - The APU data to process.
     * @param {string} location - The location for price lookup.
     * @returns {Promise<{apuData: Object, stats: Object}>} - The updated APU data and statistics.
     */
    static async enforceMasterCatalogPrices(apuData, location) {
        let replacedMaterialsCount = 0;
        let materialsWithRealData = 0;
        let replacedLaborCount = 0;
        let laborWithRealData = 0;

        const normalizeUnit = (u) => {
            if (!u) return '';
            const unit = u.toLowerCase().replace(/\./g, '').trim();
            const map = {
                'jor': 'jor', 'jornal': 'jor', 'dia': 'jor', 'dias': 'jor',
                'hr': 'h', 'hora': 'h', 'horas': 'h', 'h': 'h'
            };
            return map[unit] || unit;
        };

        const processedAPU = JSON.parse(JSON.stringify(apuData));

        // Process Materials
        if (processedAPU.materials && Array.isArray(processedAPU.materials)) {
            const updatedMaterials = await Promise.all(processedAPU.materials.map(async (mat) => {
                try {
                    const validPrices = await MarketPriceService.findReferencePrice(
                        mat.description,
                        'Materiales',
                        location,
                        5
                    );

                    if (validPrices && validPrices.length > 0) {
                        const matUnit = normalizeUnit(mat.unit);
                        const exactMatch = validPrices.find(p => normalizeUnit(p.unit) === matUnit);

                        if (exactMatch) {
                            const exactPrice = parseFloat(exactMatch.base_price);
                            if (!isNaN(exactPrice) && exactPrice > 0) {
                                replacedMaterialsCount++;
                                materialsWithRealData++;
                                return {
                                    ...mat,
                                    unitPrice: exactPrice,
                                    total: (mat.quantity || 0) * exactPrice,
                                    source: 'Base Maestra Neodata',
                                    sourceDetail: exactMatch.source || 'Base Maestra'
                                };
                            }
                        }
                    }
                    return mat;
                } catch (error) {
                    console.warn(`Error finding price for material ${mat.description}:`, error);
                    return mat;
                }
            }));
            processedAPU.materials = updatedMaterials;
        }

        // Process Labor
        if (processedAPU.labor && Array.isArray(processedAPU.labor)) {
            const updatedLabor = await Promise.all(processedAPU.labor.map(async (lab) => {
                try {
                    const exactPrices = await MarketPriceService.findReferencePrice(
                        lab.description,
                        'Mano de Obra',
                        location,
                        3
                    );

                    if (exactPrices && exactPrices.length > 0) {
                        const labUnit = normalizeUnit(lab.unit);
                        const exactMatch = exactPrices.find(p => normalizeUnit(p.unit) === labUnit);

                        if (exactMatch) {
                            const exactSalary = parseFloat(exactMatch.base_price);
                            if (!isNaN(exactSalary) && exactSalary > 0) {
                                const fsr = lab.fsr || 1.75;
                                const unitPrice = exactSalary * fsr;
                                replacedLaborCount++;
                                laborWithRealData++;
                                return {
                                    ...lab,
                                    baseSalary: exactSalary,
                                    unitPrice: unitPrice,
                                    total: (lab.quantity || 0) * unitPrice,
                                    source: 'Base Maestra Neodata',
                                    sourceDetail: exactMatch.source || 'Base Maestra',
                                    notes: `${lab.notes || ''} | Salario base: Base Maestra Neodata`.trim()
                                };
                            }
                        }
                    }
                    return lab;
                } catch (error) {
                    console.warn(`Error finding salary for labor ${lab.description}:`, error);
                    return lab;
                }
            }));
            processedAPU.labor = updatedLabor;
        }

        // Process Equipment
        if (processedAPU.equipment && Array.isArray(processedAPU.equipment)) {
            const updatedEquipment = await Promise.all(processedAPU.equipment.map(async (eq) => {
                try {
                    const exactPrices = await MarketPriceService.findReferencePrice(
                        eq.description,
                        'Equipos',
                        location,
                        1
                    );

                    if (exactPrices && exactPrices.length > 0) {
                        const eqUnit = normalizeUnit(eq.unit);
                        const exactMatch = exactPrices.find(p => normalizeUnit(p.unit) === eqUnit);

                        if (exactMatch) {
                            const exactPrice = parseFloat(exactMatch.base_price);
                            if (!isNaN(exactPrice) && exactPrice > 0) {
                                return {
                                    ...eq,
                                    unitPrice: exactPrice,
                                    total: (eq.quantity || 0) * exactPrice,
                                    source: 'Base Maestra Neodata'
                                };
                            }
                        }
                    }
                    return eq;
                } catch (error) {
                    console.warn(`Error finding price for equipment ${eq.description}:`, error);
                    return eq;
                }
            }));
            processedAPU.equipment = updatedEquipment;
        }

        return {
            apuData: processedAPU,
            stats: {
                replacedMaterialsCount,
                materialsWithRealData,
                replacedLaborCount,
                laborWithRealData
            }
        };
    }

    /**
     * Valida la estructura de datos APU
     * @param {Object} apuData - Datos del APU a validar
     * @returns {Object} - { valid: boolean, errors: Array<string> }
     */
    static validateAPUData(apuData) {
        const errors = [];

        if (!apuData || typeof apuData !== 'object') {
            return { valid: false, errors: ['APU data debe ser un objeto'] };
        }

        // Validar arrays requeridos
        if (!Array.isArray(apuData.materials)) {
            errors.push('materials debe ser un array');
        }
        if (!Array.isArray(apuData.labor)) {
            errors.push('labor debe ser un array');
        }
        if (!Array.isArray(apuData.equipment)) {
            errors.push('equipment debe ser un array');
        }

        // Validar porcentajes
        const percentages = ['minorToolsPct', 'indirectsPct', 'financingPct', 'profitPct', 'additionalPct'];
        percentages.forEach(pct => {
            if (apuData[pct] !== undefined && (typeof apuData[pct] !== 'number' || apuData[pct] < 0 || apuData[pct] > 1)) {
                errors.push(`${pct} debe ser un número entre 0 y 1`);
            }
        });

        // Validar estructura de materiales
        if (Array.isArray(apuData.materials)) {
            apuData.materials.forEach((mat, idx) => {
                if (!mat.description) errors.push(`Material ${idx + 1}: falta descripción`);
                if (typeof mat.quantity !== 'number' || mat.quantity < 0) {
                    errors.push(`Material ${idx + 1}: cantidad inválida`);
                }
                if (typeof mat.unitPrice !== 'number' || mat.unitPrice < 0) {
                    errors.push(`Material ${idx + 1}: precio unitario inválido`);
                }
            });
        }

        // Validar estructura de mano de obra
        if (Array.isArray(apuData.labor)) {
            apuData.labor.forEach((lab, idx) => {
                if (!lab.description) errors.push(`Mano de obra ${idx + 1}: falta descripción`);
                if (typeof lab.quantity !== 'number' || lab.quantity < 0) {
                    errors.push(`Mano de obra ${idx + 1}: cantidad inválida`);
                }
                const baseSalary = lab.baseSalary || lab.unitPrice;
                if (typeof baseSalary !== 'number' || baseSalary < 0) {
                    errors.push(`Mano de obra ${idx + 1}: salario base inválido`);
                }
                if (lab.fsr !== undefined && (typeof lab.fsr !== 'number' || lab.fsr <= 0)) {
                    errors.push(`Mano de obra ${idx + 1}: FSR inválido`);
                }
            });
        }

        // Validar estructura de equipo
        if (Array.isArray(apuData.equipment)) {
            apuData.equipment.forEach((eq, idx) => {
                if (!eq.description) errors.push(`Equipo ${idx + 1}: falta descripción`);
                if (typeof eq.quantity !== 'number' || eq.quantity < 0) {
                    errors.push(`Equipo ${idx + 1}: cantidad inválida`);
                }
                if (typeof eq.unitPrice !== 'number' || eq.unitPrice < 0) {
                    errors.push(`Equipo ${idx + 1}: precio unitario inválido`);
                }
            });
        }

        return {
            valid: errors.length === 0,
            errors
        };
    }

    /**
     * Normaliza y completa datos APU con valores por defecto
     * @param {Object} apuData - Datos del APU
     * @returns {Object} - Datos normalizados
     */
    static normalizeAPUData(apuData) {
        if (!apuData) return null;

        const normalized = JSON.parse(JSON.stringify(apuData));

        // Asegurar arrays
        normalized.materials = normalized.materials || [];
        normalized.labor = normalized.labor || [];
        normalized.equipment = normalized.equipment || [];

        // Aplicar valores por defecto
        normalized.minorToolsPct = normalized.minorToolsPct ?? this.DEFAULT_CONFIG.minorToolsPct;
        normalized.indirectsPct = normalized.indirectsPct ?? this.DEFAULT_CONFIG.indirectsPct;
        normalized.financingPct = normalized.financingPct ?? this.DEFAULT_CONFIG.financingPct;
        normalized.profitPct = normalized.profitPct ?? this.DEFAULT_CONFIG.profitPct;
        normalized.additionalPct = normalized.additionalPct ?? this.DEFAULT_CONFIG.additionalPct;

        // Normalizar mano de obra: asegurar baseSalary y fsr
        normalized.labor = normalized.labor.map(lab => ({
            ...lab,
            baseSalary: lab.baseSalary ?? lab.unitPrice ?? 0,
            fsr: lab.fsr ?? this.DEFAULT_CONFIG.defaultFSR,
            unit: lab.unit || 'jor'
        }));

        // Normalizar materiales y equipo: asegurar valores numéricos
        normalized.materials = normalized.materials.map(mat => ({
            ...mat,
            quantity: mat.quantity ?? 0,
            unitPrice: mat.unitPrice ?? 0,
            unit: mat.unit || 'pza'
        }));

        normalized.equipment = normalized.equipment.map(eq => ({
            ...eq,
            quantity: eq.quantity ?? 0,
            unitPrice: eq.unitPrice ?? 0,
            unit: eq.unit || 'hora'
        }));

        return normalized;
    }

    /**
     * Calcula el costo total de materiales
     * @param {Array} materials - Array de materiales
     * @returns {number} - Total de materiales
     */
    static calculateMaterialsTotal(materials) {
        if (!Array.isArray(materials)) return 0;
        return materials.reduce((sum, mat) => {
            const quantity = mat.quantity || 0;
            const unitPrice = mat.unitPrice || 0;
            return sum + (quantity * unitPrice);
        }, 0);
    }

    /**
     * Calcula el costo total de mano de obra (con FSR)
     * @param {Array} labor - Array de mano de obra
     * @returns {number} - Total de mano de obra
     */
    static calculateLaborTotal(labor) {
        if (!Array.isArray(labor)) return 0;
        return labor.reduce((sum, lab) => {
            const baseSalary = lab.baseSalary || lab.unitPrice || 0;
            const fsr = lab.fsr || this.DEFAULT_CONFIG.defaultFSR;
            const realSalary = baseSalary * fsr;
            const quantity = lab.quantity || 0;
            return sum + (quantity * realSalary);
        }, 0);
    }

    /**
     * Calcula el costo total de equipo
     * @param {Array} equipment - Array de equipo
     * @returns {number} - Total de equipo
     */
    static calculateEquipmentTotal(equipment) {
        if (!Array.isArray(equipment)) return 0;
        return equipment.reduce((sum, eq) => {
            const quantity = eq.quantity || 0;
            const unitPrice = eq.unitPrice || 0;
            return sum + (quantity * unitPrice);
        }, 0);
    }

    /**
     * Calcula el costo de herramienta menor
     * @param {number} laborTotal - Total de mano de obra
     * @param {number} minorToolsPct - Porcentaje de herramienta menor
     * @returns {number} - Costo de herramienta menor
     */
    static calculateMinorToolsCost(laborTotal, minorToolsPct) {
        return laborTotal * (minorToolsPct || this.DEFAULT_CONFIG.minorToolsPct);
    }

    /**
     * Calcula el costo directo
     * @param {Object} apuData - Datos del APU normalizados
     * @returns {number} - Costo directo
     */
    static calculateDirectCost(apuData) {
        const normalized = this.normalizeAPUData(apuData);
        if (!normalized) return 0;

        const materialsTotal = this.calculateMaterialsTotal(normalized.materials);
        const laborTotal = this.calculateLaborTotal(normalized.labor);
        const equipmentTotal = this.calculateEquipmentTotal(normalized.equipment);
        const minorToolsCost = this.calculateMinorToolsCost(laborTotal, normalized.minorToolsPct);

        return materialsTotal + laborTotal + equipmentTotal + minorToolsCost;
    }

    /**
     * Calcula todos los costos en cascada del APU
     * @param {Object} apuData - Datos del APU
     * @returns {Object} - Objeto con todos los cálculos
     */
    static calculateAPUTotals(apuData) {
        const normalized = this.normalizeAPUData(apuData);
        if (!normalized) {
            return {
                materialsTotal: 0,
                laborTotal: 0,
                equipmentTotal: 0,
                minorToolsCost: 0,
                directCost: 0,
                indirectCost: 0,
                subtotal1: 0,
                financingCost: 0,
                subtotal2: 0,
                profitCost: 0,
                subtotal3: 0,
                additionalCost: 0,
                finalPrice: 0
            };
        }

        // Costos directos
        const materialsTotal = this.calculateMaterialsTotal(normalized.materials);
        const laborTotal = this.calculateLaborTotal(normalized.labor);
        const equipmentTotal = this.calculateEquipmentTotal(normalized.equipment);
        const minorToolsCost = this.calculateMinorToolsCost(laborTotal, normalized.minorToolsPct);
        const directCost = materialsTotal + laborTotal + equipmentTotal + minorToolsCost;

        // Cascada de costos indirectos
        const indirectCost = directCost * normalized.indirectsPct;
        const subtotal1 = directCost + indirectCost;

        const financingCost = subtotal1 * normalized.financingPct;
        const subtotal2 = subtotal1 + financingCost;

        const profitCost = subtotal2 * normalized.profitPct;
        const subtotal3 = subtotal2 + profitCost;

        const additionalCost = subtotal3 * normalized.additionalPct;
        const finalPrice = subtotal3 + additionalCost;

        return {
            materialsTotal,
            laborTotal,
            equipmentTotal,
            minorToolsCost,
            directCost,
            indirectCost,
            subtotal1,
            financingCost,
            subtotal2,
            profitCost,
            subtotal3,
            additionalCost,
            finalPrice
        };
    }

    /**
     * Calcula el precio unitario final del APU
     * @param {Object} apuData - Datos del APU
     * @returns {number} - Precio unitario final
     */
    static calculateFinalPrice(apuData) {
        const totals = this.calculateAPUTotals(apuData);
        return totals.finalPrice;
    }

    /**
     * Obtiene el salario real de un elemento de mano de obra
     * @param {Object} laborItem - Item de mano de obra
     * @returns {number} - Salario real (baseSalary * fsr)
     */
    static getRealSalary(laborItem) {
        if (!laborItem) return 0;
        const baseSalary = laborItem.baseSalary || laborItem.unitPrice || 0;
        const fsr = laborItem.fsr || this.DEFAULT_CONFIG.defaultFSR;
        return baseSalary * fsr;
    }

    /**
     * Calcula el total de un item de mano de obra
     * @param {Object} laborItem - Item de mano de obra
     * @returns {number} - Total (quantity * realSalary)
     */
    static calculateLaborItemTotal(laborItem) {
        if (!laborItem) return 0;
        const realSalary = this.getRealSalary(laborItem);
        const quantity = laborItem.quantity || 0;
        return quantity * realSalary;
    }

    /**
     * Exporta datos APU a formato estándar para guardado
     * @param {Object} apuData - Datos del APU
     * @returns {Object} - Datos exportados
     */
    static exportAPUData(apuData) {
        const normalized = this.normalizeAPUData(apuData);
        if (!normalized) return null;

        return {
            ...normalized,
            calculatedTotals: this.calculateAPUTotals(normalized),
            calculatedAt: new Date().toISOString(),
            version: '1.0'
        };
    }

    /**
     * Crea un APU vacío con estructura básica
     * @returns {Object} - APU vacío
     */
    static createEmptyAPU() {
        return {
            materials: [],
            labor: [],
            equipment: [],
            minorToolsPct: this.DEFAULT_CONFIG.minorToolsPct,
            indirectsPct: this.DEFAULT_CONFIG.indirectsPct,
            financingPct: this.DEFAULT_CONFIG.financingPct,
            profitPct: this.DEFAULT_CONFIG.profitPct,
            additionalPct: this.DEFAULT_CONFIG.additionalPct,
            notes: ''
        };
    }

    /**
     * Agrega un material al APU
     * @param {Object} apuData - Datos del APU
     * @param {Object} material - Material a agregar
     * @returns {Object} - APU actualizado
     */
    static addMaterial(apuData, material) {
        const normalized = this.normalizeAPUData(apuData) || this.createEmptyAPU();
        normalized.materials.push({
            description: material.description || '',
            unit: material.unit || 'pza',
            quantity: material.quantity || 0,
            unitPrice: material.unitPrice || 0
        });
        return normalized;
    }

    /**
     * Agrega un elemento de mano de obra al APU
     * @param {Object} apuData - Datos del APU
     * @param {Object} labor - Mano de obra a agregar
     * @returns {Object} - APU actualizado
     */
    static addLabor(apuData, labor) {
        const normalized = this.normalizeAPUData(apuData) || this.createEmptyAPU();
        normalized.labor.push({
            description: labor.description || '',
            unit: labor.unit || 'jor',
            quantity: labor.quantity || 0,
            baseSalary: labor.baseSalary || 0,
            fsr: labor.fsr || this.DEFAULT_CONFIG.defaultFSR
        });
        return normalized;
    }

    /**
     * Agrega un equipo al APU
     * @param {Object} apuData - Datos del APU
     * @param {Object} equipment - Equipo a agregar
     * @returns {Object} - APU actualizado
     */
    static addEquipment(apuData, equipment) {
        const normalized = this.normalizeAPUData(apuData) || this.createEmptyAPU();
        normalized.equipment.push({
            description: equipment.description || '',
            unit: equipment.unit || 'hora',
            quantity: equipment.quantity || 0,
            unitPrice: equipment.unitPrice || 0
        });
        return normalized;
    }
}

export default APUService;

