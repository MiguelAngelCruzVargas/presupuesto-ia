/**
 * CalculationsService
 * Handles all budget calculations including:
 * - Subtotals, indirect costs, profit margins, taxes
 * - APU (Análisis de Precios Unitarios) calculations
 * - Material explosion
 */

export class CalculationsService {
    /**
     * Calculate subtotal from items
     */
    static calculateSubtotal(items) {
        return items.reduce((acc, item) => {
            return acc + (item.quantity * item.unitPrice);
        }, 0);
    }

    /**
     * Calculate indirect costs
     */
    static calculateIndirectCosts(subtotal, indirectPercentage) {
        return subtotal * (indirectPercentage / 100);
    }

    /**
     * Calculate profit
     */
    static calculateProfit(subtotal, indirectCosts, profitPercentage) {
        const base = subtotal + indirectCosts;
        return base * (profitPercentage / 100);
    }

    /**
     * Calculate taxes
     */
    static calculateTax(subtotal, indirectCosts, profit, taxRate) {
        const base = subtotal + indirectCosts + profit;
        return base * (taxRate / 100);
    }

    /**
     * Calculate grand total
     */
    static calculateTotal(items, config = {}) {
        const {
            indirectPercentage = 0,
            profitPercentage = 0,
            taxRate = 16
        } = config;

        const subtotal = this.calculateSubtotal(items);
        const indirectCosts = this.calculateIndirectCosts(subtotal, indirectPercentage);
        const profit = this.calculateProfit(subtotal, indirectCosts, profitPercentage);
        const tax = this.calculateTax(subtotal, indirectCosts, profit, taxRate);

        return {
            subtotal,
            indirectCosts,
            profit,
            tax,
            total: subtotal + indirectCosts + profit + tax
        };
    }

    /**
     * Calculate APU (Análisis de Precios Unitarios) for an item
     * @deprecated Use APUService.calculateFinalPrice() instead
     */
    static calculateAPU(apuBreakdown) {
        if (!apuBreakdown || apuBreakdown.length === 0) return 0;

        // Mantener compatibilidad con formato antiguo
        if (Array.isArray(apuBreakdown)) {
            return apuBreakdown.reduce((total, component) => {
                return total + (component.quantity * component.unit_price);
            }, 0);
        }

        // Si es un objeto APU completo, usar el servicio
        if (typeof apuBreakdown === 'object' && (apuBreakdown.materials || apuBreakdown.labor)) {
            const { APUService } = require('./APUService');
            return APUService.calculateFinalPrice(apuBreakdown);
        }

        return 0;
    }

    /**
     * Material explosion - get total quantities by material
     */
    static getMaterialExplosion(items, apuData) {
        const materials = {};

        items.forEach(item => {
            const itemAPU = apuData[item.id] || [];

            itemAPU.forEach(component => {
                if (component.type === 'material') {
                    const key = component.description;

                    if (!materials[key]) {
                        materials[key] = {
                            description: component.description,
                            unit: item.unit,
                            totalQuantity: 0,
                            unitPrice: component.unit_price,
                            total: 0
                        };
                    }

                    const componentTotal = component.quantity * item.quantity;
                    materials[key].totalQuantity += componentTotal;
                    materials[key].total = materials[key].totalQuantity * materials[key].unitPrice;
                }
            });
        });

        return Object.values(materials);
    }

    /**
     * Get breakdown by category
     */
    static getCategoryBreakdown(items) {
        const breakdown = {};

        items.forEach(item => {
            const category = item.category || 'Otros';
            const itemTotal = item.quantity * item.unitPrice;

            if (!breakdown[category]) {
                breakdown[category] = {
                    category,
                    total: 0,
                    items: []
                };
            }

            breakdown[category].total += itemTotal;
            breakdown[category].items.push(item);
        });

        return Object.values(breakdown);
    }

    /**
     * Calculate cost per square meter (if applicable)
     */
    static calculateCostPerUnit(total, area, unit = 'm2') {
        if (!area || area === 0) return 0;
        return total / area;
    }

    /**
     * Compare two budgets
     */
    static compareBudgets(budget1, budget2) {
        const calc1 = this.calculateTotal(budget1.items, budget1);
        const calc2 = this.calculateTotal(budget2.items, budget2);

        return {
            budget1: calc1,
            budget2: calc2,
            difference: calc2.total - calc1.total,
            percentageDifference: ((calc2.total - calc1.total) / calc1.total) * 100
        };
    }
}

export default CalculationsService;
