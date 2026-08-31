/**
 * Clasifica de dónde salió el precio de una partida.
 *
 * El dato ya existía (`calculation_basis` guarda el origen y `isCatalogItem`
 * marca las del catálogo propio), pero no se mostraba en ninguna parte: en
 * pantalla un precio verificado contra tu base y uno inventado por la IA se
 * veían exactamente igual.
 *
 * Niveles, de más a menos confiable:
 *   catalogo    Tu catálogo. Lo capturaste tú.
 *   oficial     Tabulador oficial (CDMX).
 *   base        CONSTRUBASE o tu base maestra importada.
 *   referencia  Valor indicativo de mercado, marcado para revisar.
 *   ia          Lo estimó la IA y no encontró respaldo. Revísalo siempre.
 */

export const ORIGEN_PRECIO = {
    catalogo: {
        nivel: 'catalogo',
        etiqueta: 'Catálogo',
        titulo: 'Precio de tu catálogo personal',
        clases: 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-800'
    },
    oficial: {
        nivel: 'oficial',
        etiqueta: 'Oficial',
        titulo: 'Precio del tabulador oficial',
        clases: 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-800'
    },
    base: {
        nivel: 'base',
        etiqueta: 'Base',
        titulo: 'Precio encontrado en tu base de precios',
        clases: 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800'
    },
    referencia: {
        nivel: 'referencia',
        etiqueta: 'Referencia',
        titulo: 'Valor indicativo de mercado: ajústalo a tu región y proveedores',
        clases: 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-800'
    },
    ia: {
        nivel: 'ia',
        etiqueta: 'Estimado IA',
        titulo: 'Lo estimó la IA sin respaldo en tu base de precios. Revísalo antes de cotizar.',
        clases: 'bg-slate-100 text-slate-600 border-slate-300 dark:bg-slate-700/50 dark:text-slate-300 dark:border-slate-600'
    }
};

/**
 * @param {Object} item - Partida del presupuesto
 * @returns {Object|null} Uno de ORIGEN_PRECIO, o null si no hay nada que marcar
 */
export const getOrigenPrecio = (item) => {
    if (!item) return null;

    // Sin precio todavía: no hay nada que calificar
    if (!item.unitPrice || Number(item.unitPrice) <= 0) return null;

    if (item.isCatalogItem) return ORIGEN_PRECIO.catalogo;

    const base = String(item.calculation_basis || '');

    if (base.includes('Tabulador Oficial')) return ORIGEN_PRECIO.oficial;
    if (base.includes('Referencia de mercado')) return ORIGEN_PRECIO.referencia;
    if (base.includes('CONSTRUBASE') || base.includes('Base de Datos Maestra')) return ORIGEN_PRECIO.base;

    // Sin rastro de respaldo: lo puso la IA
    return ORIGEN_PRECIO.ia;
};
