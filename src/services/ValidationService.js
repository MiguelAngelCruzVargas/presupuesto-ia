import { MarketPriceService } from './MarketPriceService';
import { APP_CONFIG } from '../config/appConfig';

/**
 * ValidationService
 * Centralized validation for budget items, projects, and user inputs
 */

export class ValidationService {
    /**
     * Validate a budget item
     * @param {Object} item - Budget item to validate
     * @returns {{ valid: boolean, errors: string[] }}
     */
    static validateItem(item) {
        const errors = [];

        if (!item.description || !item.description.trim()) {
            errors.push('La descripción es requerida');
        }

        if (item.quantity === undefined || item.quantity === null) {
            errors.push('La cantidad es requerida');
        } else if (item.quantity < 0) {
            errors.push('La cantidad no puede ser negativa');
        } else if (!isFinite(item.quantity)) {
            errors.push('La cantidad debe ser un número válido');
        }

        if (item.unitPrice === undefined || item.unitPrice === null) {
            errors.push('El precio unitario es requerido');
        } else if (item.unitPrice < 0) {
            errors.push('El precio unitario no puede ser negativo');
        } else if (!isFinite(item.unitPrice)) {
            errors.push('El precio unitario debe ser un número válido');
        }

        if (!item.unit || !item.unit.trim()) {
            errors.push('La unidad es requerida');
        }

        if (!item.category || !item.category.trim()) {
            errors.push('La categoría es requerida');
        }

        return {
            valid: errors.length === 0,
            errors
        };
    }

    static normalizeUnit(unit) {
        return String(unit || '')
            .toLowerCase()
            .replace(/\s+/g, '')
            .replace('²', '2')
            .replace('³', '3');
    }

    static areUnitsCompatible(unitA, unitB) {
        const a = this.normalizeUnit(unitA);
        const b = this.normalizeUnit(unitB);
        if (!a || !b) return false;
        if (a === b) return true;

        const groups = [
            ['m', 'ml'],
            ['m2', 'm²'],
            ['m3', 'm³'],
            ['pza', 'pieza', 'und'],
            ['lt', 'l'],
            ['kg', 'kilo'],
            ['ton', 'tonelada'],
        ];

        return groups.some(group => group.includes(a) && group.includes(b));
    }

    static inferCategoryHints(description = '') {
        const text = String(description).toLowerCase();
        const hints = [];

        if (/(cable|tablero|contacto|apagador|conduit|luminaria)/.test(text)) hints.push('Instalaciones');
        if (/(excav|concreto|cimbra|acero|castillo|cadena|muro|block|tabique)/.test(text)) hints.push('Obra Civil');
        if (/(pintura|loseta|azulejo|yeso|impermeabil)/.test(text)) hints.push('Materiales');
        if (/(plomero|electricista|albanil|albañil|cuadrilla|jornal)/.test(text)) hints.push('Mano de Obra');
        if (/(retroexcavadora|vibrador|revolvedora|camion|bote|costal|equipo)/.test(text)) hints.push('Equipos');

        return hints;
    }

    static async validateItemAgainstBase(item, options = {}) {
        const location = options.location || APP_CONFIG.defaultCountry;
        const warnings = [];
        const suggestions = [];
        let severity = 'info';

        const basicValidation = this.validateItem(item);
        if (!basicValidation.valid) {
            return {
                severity: 'error',
                warnings: basicValidation.errors,
                suggestions,
                benchmark: null
            };
        }

        const categoryHints = this.inferCategoryHints(item.description);
        if (categoryHints.length > 0 && !categoryHints.includes(item.category)) {
            warnings.push(`La categoría podría no coincidir. Para esta descripción parece más cercano a: ${categoryHints.join(', ')}.`);
            severity = 'warning';
        }

        const benchmark = await MarketPriceService.getBenchmarkForItem(item, location);
        if (!benchmark) {
            return {
                severity,
                warnings,
                suggestions,
                benchmark: null
            };
        }

        if (!this.areUnitsCompatible(item.unit, benchmark.referenceUnit)) {
            warnings.push(`La unidad "${item.unit}" no coincide con la referencia de base maestra "${benchmark.referenceUnit}".`);
            suggestions.push(`Revisa si esta partida debería estar en ${benchmark.referenceUnit}.`);
            severity = 'warning';
        }

        if (item.category && benchmark.referenceCategory && item.category !== benchmark.referenceCategory) {
            warnings.push(`La referencia más cercana de base maestra está en categoría "${benchmark.referenceCategory}".`);
            severity = 'warning';
        }

        const currentPrice = parseFloat(item.unitPrice);
        if (!Number.isNaN(currentPrice) && currentPrice > 0) {
            const ratio = currentPrice / benchmark.referencePrice;

            if (ratio >= 2.5) {
                warnings.push(`El precio está muy arriba de la referencia (${benchmark.sourceLabel}: $${benchmark.referencePrice.toFixed(2)}).`);
                suggestions.push('Valida si incluye más alcance, indirectos o una unidad distinta.');
                severity = 'error';
            } else if (ratio <= 0.4) {
                warnings.push(`El precio está muy abajo de la referencia (${benchmark.sourceLabel}: $${benchmark.referencePrice.toFixed(2)}).`);
                suggestions.push('Podría faltar mano de obra, herramienta o el precio estar capturado por otra unidad.');
                severity = severity === 'error' ? 'error' : 'warning';
            } else if (ratio >= 1.6 || ratio <= 0.65) {
                warnings.push(`El precio se desvía de la referencia de base maestra (${benchmark.sourceLabel}: $${benchmark.referencePrice.toFixed(2)}).`);
                severity = severity === 'error' ? 'error' : 'info';
            }
        }

        return {
            severity,
            warnings,
            suggestions,
            benchmark
        };
    }

    /**
     * Validate project info
     * @param {Object} projectInfo - Project information
     * @returns {{ valid: boolean, errors: string[] }}
     */
    static validateProject(projectInfo) {
        const errors = [];

        if (!projectInfo.project || !projectInfo.project.trim()) {
            errors.push('El nombre del proyecto es requerido');
        }

        if (projectInfo.taxRate !== undefined && projectInfo.taxRate !== null) {
            if (projectInfo.taxRate < 0 || projectInfo.taxRate > 100) {
                errors.push('La tasa de IVA debe estar entre 0 y 100');
            }
            if (!isFinite(projectInfo.taxRate)) {
                errors.push('La tasa de IVA debe ser un número válido');
            }
        }

        if (projectInfo.indirect_percentage !== undefined && projectInfo.indirect_percentage !== null) {
            if (projectInfo.indirect_percentage < 0) {
                errors.push('El porcentaje de indirectos no puede ser negativo');
            }
            if (!isFinite(projectInfo.indirect_percentage)) {
                errors.push('El porcentaje de indirectos debe ser un número válido');
            }
        }

        if (projectInfo.profit_percentage !== undefined && projectInfo.profit_percentage !== null) {
            if (projectInfo.profit_percentage < 0) {
                errors.push('El porcentaje de utilidad no puede ser negativo');
            }
            if (!isFinite(projectInfo.profit_percentage)) {
                errors.push('El porcentaje de utilidad debe ser un número válido');
            }
        }

        return {
            valid: errors.length === 0,
            errors
        };
    }

    /**
     * Validate email format
     * @param {string} email - Email to validate
     * @returns {boolean}
     */
    static validateEmail(email) {
        if (!email || !email.trim()) return false;
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    /**
     * Validate password strength
     * @param {string} password - Password to validate
     * @returns {{ valid: boolean, errors: string[] }}
     */
    static validatePassword(password) {
        const errors = [];

        if (!password || password.length < 6) {
            errors.push('La contraseña debe tener al menos 6 caracteres');
        }

        return {
            valid: errors.length === 0,
            errors
        };
    }

    /**
     * Sanitize HTML string (basic)
     * @param {string} html - HTML string to sanitize
     * @returns {string}
     */
    static sanitizeHTML(html) {
        if (!html) return '';
        // Remove script tags and event handlers (basic sanitization)
        return html
            .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
            .replace(/on\w+="[^"]*"/gi, '')
            .replace(/on\w+='[^']*'/gi, '');
    }

    /**
     * Validate and sanitize number input
     * @param {string|number} value - Value to validate
     * @param {Object} options - Validation options
     * @returns {number|null}
     */
    static validateNumber(value, options = {}) {
        const { min, max, allowNegative = true } = options;
        
        if (value === '' || value === null || value === undefined) {
            return null;
        }

        const num = parseFloat(value);
        
        if (isNaN(num) || !isFinite(num)) {
            return null;
        }

        if (!allowNegative && num < 0) {
            return null;
        }

        if (min !== undefined && num < min) {
            return null;
        }

        if (max !== undefined && num > max) {
            return null;
        }

        return num;
    }
}

export default ValidationService;

