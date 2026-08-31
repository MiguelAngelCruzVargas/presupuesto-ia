/**
 * BudgetNormalizerService
 *
 * Limpia lo que devuelve la IA antes de meterlo al presupuesto.
 *
 * Pedirle por prompt que respete el catálogo ayuda, pero no garantiza nada:
 * en pruebas reales devolvió unidades en inglés ("bag") y categorías con la
 * caja cambiada ("Mano de obra" en vez de "Mano de Obra"). Eso no lo detectaba
 * ValidationService, que solo comprueba que el campo no venga vacío.
 *
 * Consecuencias que tenía dejarlo pasar:
 *   - Unidades fuera del catálogo: el selector del editor las muestra vacías.
 *   - Categorías que no coinciden exactamente: el desglose por categoría del
 *     tablero filtra con === , así que esas partidas salían en $0.
 *
 * Aquí se corrige de forma determinista y se reporta qué se tocó, para no
 * "arreglar" cosas a espaldas del usuario.
 */

import { BUDGET_CATEGORIES, BUDGET_UNIT_OPTIONS } from '../config/editorConfig.js';

/** Quita acentos y pasa a minúsculas */
const plano = (texto = '') =>
    String(texto).toLowerCase().trim().normalize('NFD').replace(/[̀-ͯ]/g, '');

/**
 * Sinónimos de unidad -> unidad del catálogo.
 * Cubre inglés, plurales y las formas que suele inventar la IA.
 */
const SINONIMOS_UNIDAD = {
    // piezas
    pieza: 'pza', piezas: 'pza', pz: 'pza', pcs: 'pza', piece: 'pza', pieces: 'pza', unit: 'pza',
    unidad: 'und', unidades: 'und', u: 'und',
    // superficie
    'm2': 'm²', m2: 'm²', mt2: 'm²', 'metro cuadrado': 'm²', 'metros cuadrados': 'm²',
    'sq m': 'm²', sqm: 'm²', 'sq.m': 'm²',
    // volumen
    'm3': 'm³', m3: 'm³', mt3: 'm³', 'metro cubico': 'm³', 'metros cubicos': 'm³',
    'cu m': 'm³', cum: 'm³',
    // longitud
    metro: 'm', metros: 'm', mts: 'm', mt: 'm',
    'metro lineal': 'ml', 'metros lineales': 'ml', lm: 'ml',
    // peso
    kilo: 'kg', kilos: 'kg', kilogramo: 'kg', kilogramos: 'kg', kgs: 'kg',
    tonelada: 'ton', toneladas: 'ton', tonne: 'ton', tons: 'ton', t: 'ton',
    // volumen líquido
    litro: 'lt', litros: 'lt', l: 'lt', liter: 'lt', liters: 'lt',
    // costales y sacos (muy comunes en obra en México)
    bag: 'bulto', bags: 'bulto', saco: 'bulto', sacos: 'bulto', costal: 'bulto',
    bolsa: 'bulto', bolsas: 'bulto', bultos: 'bulto',
    // mano de obra
    jornada: 'jornal', jornadas: 'jornal', jor: 'jornal', dia: 'jornal', day: 'jornal',
    // conjuntos
    juego: 'jgo', juegos: 'jgo', set: 'jgo', kit: 'jgo',
    lotes: 'lote', lot: 'lote',
    servicios: 'servicio', service: 'servicio',
    total: 'global', gbl: 'global'
};

/** Sinónimos de categoría -> categoría del catálogo */
const SINONIMOS_CATEGORIA = {
    material: 'Materiales', materiales: 'Materiales', materials: 'Materiales', insumos: 'Materiales',
    'mano de obra': 'Mano de Obra', 'manodeobra': 'Mano de Obra', labor: 'Mano de Obra',
    'mano obra': 'Mano de Obra', 'labour': 'Mano de Obra', 'trabajo': 'Mano de Obra',
    equipo: 'Equipos', equipos: 'Equipos', equipment: 'Equipos', maquinaria: 'Equipos',
    'herramienta': 'Equipos', 'herramientas': 'Equipos',
    instalacion: 'Instalaciones', instalaciones: 'Instalaciones', installations: 'Instalaciones',
    'obra civil': 'Obra Civil', 'civil': 'Obra Civil', 'obracivil': 'Obra Civil'
};

export class BudgetNormalizerService {
    /** Unidades válidas del catálogo del editor */
    static get unidadesValidas() {
        return BUDGET_UNIT_OPTIONS.map(u => u.value);
    }

    /**
     * Lleva una unidad a la del catálogo.
     * @returns {{unidad: string, cambiada: boolean, reconocida: boolean}}
     */
    static normalizarUnidad(unidad) {
        const original = String(unidad || '').trim();
        const validas = this.unidadesValidas;

        // Ya es válida tal cual
        if (validas.includes(original)) {
            return { unidad: original, cambiada: false, reconocida: true };
        }

        const clave = plano(original);

        // Coincide con una válida ignorando acentos y caja (m2 -> m²)
        const directa = validas.find(v => plano(v) === clave);
        if (directa) {
            return { unidad: directa, cambiada: directa !== original, reconocida: true };
        }

        const sinonimo = SINONIMOS_UNIDAD[clave];
        if (sinonimo && validas.includes(sinonimo)) {
            return { unidad: sinonimo, cambiada: true, reconocida: true };
        }

        // No se reconoce: se deja 'pza' para que el editor no quede en blanco,
        // pero se marca para que el usuario la revise.
        return { unidad: 'pza', cambiada: true, reconocida: false, original };
    }

    /**
     * Lleva una categoría a la del catálogo.
     * @returns {{categoria: string, cambiada: boolean, reconocida: boolean}}
     */
    static normalizarCategoria(categoria) {
        const original = String(categoria || '').trim();

        if (BUDGET_CATEGORIES.includes(original)) {
            return { categoria: original, cambiada: false, reconocida: true };
        }

        const clave = plano(original);

        // Mismo texto salvo acentos o mayúsculas: el caso más común
        // ("Mano de obra" -> "Mano de Obra")
        const directa = BUDGET_CATEGORIES.find(c => plano(c) === clave);
        if (directa) {
            return { categoria: directa, cambiada: true, reconocida: true };
        }

        const sinonimo = SINONIMOS_CATEGORIA[clave];
        if (sinonimo) {
            return { categoria: sinonimo, cambiada: true, reconocida: true };
        }

        return { categoria: 'Materiales', cambiada: true, reconocida: false, original };
    }

    /**
     * Conceptos que se cuentan por pieza, no por superficie ni volumen.
     * La IA tiende a poner m² a todo: en una prueba real devolvió
     * "Muebles de baño (lavamanos, inodoro, ducha)" en m².
     */
    static CONCEPTOS_POR_PIEZA = [
        'mueble', 'lavabo', 'lavamanos', 'inodoro', 'taza', 'wc', 'retrete',
        'regadera', 'ducha', 'tarja', 'fregadero', 'calentador', 'boiler',
        'puerta', 'ventana', 'chapa', 'cerradura', 'luminaria', 'lampara',
        'contacto', 'apagador', 'interruptor', 'pastilla', 'medidor',
        'tinaco', 'cisterna', 'bomba', 'mueble de cocina'
    ];

    /** Unidades que no tienen sentido para algo que se cuenta por pieza */
    static UNIDADES_DE_MEDIDA = ['m²', 'm³', 'm', 'ml', 'm2', 'm3'];

    /**
     * Detecta unidades que no pegan con el concepto.
     *
     * NO las corrige sola: si el concepto está en m² y debería ser pieza, la
     * cantidad también está mal (6 m² de muebles no son 6 muebles), y adivinar
     * cuántas piezas son sería inventar. Se avisa para que lo revises.
     *
     * @returns {Array} avisos de coherencia
     */
    static revisarCoherenciaUnidad(items = []) {
        const avisos = [];

        items.forEach(item => {
            const texto = plano(item.description);
            const unidad = String(item.unit || '');

            const esPorPieza = this.CONCEPTOS_POR_PIEZA.some(c => texto.includes(plano(c)));
            const tieneUnidadDeMedida = this.UNIDADES_DE_MEDIDA.includes(unidad);

            if (esPorPieza && tieneUnidadDeMedida) {
                avisos.push({
                    partida: item.description,
                    campo: 'unidad',
                    tipo: 'coherencia',
                    mensaje: `Está en "${unidad}" pero se cuenta por pieza. Revisa la unidad Y la cantidad: probablemente sean piezas o juegos, no ${unidad}.`
                });
            }
        });

        return avisos;
    }

    /**
     * Normaliza las partidas que devolvió la IA.
     *
     * @param {Array} items - Partidas crudas
     * @returns {{items: Array, avisos: Array, correcciones: number}}
     */
    static normalizarPartidas(items = []) {
        const avisos = [];
        let correcciones = 0;

        const normalizadas = items.map((item, index) => {
            const unidad = this.normalizarUnidad(item.unit);
            const categoria = this.normalizarCategoria(item.category);

            if (unidad.cambiada) correcciones += 1;
            if (categoria.cambiada) correcciones += 1;

            if (!unidad.reconocida) {
                avisos.push({
                    partida: item.description,
                    campo: 'unidad',
                    mensaje: `Unidad "${unidad.original}" no está en el catálogo; se puso "pza". Revísala.`
                });
            }

            if (!categoria.reconocida) {
                avisos.push({
                    partida: item.description,
                    campo: 'categoría',
                    mensaje: `Categoría "${categoria.original}" no existe; se puso "Materiales". Revísala.`
                });
            }

            const cantidad = Number(item.quantity);
            const precio = Number(item.unitPrice);

            if (!Number.isFinite(cantidad) || cantidad <= 0) {
                avisos.push({
                    partida: item.description,
                    campo: 'cantidad',
                    mensaje: 'La IA no devolvió una cantidad válida; se puso 1.'
                });
            }

            if (!Number.isFinite(precio) || precio < 0) {
                avisos.push({
                    partida: item.description,
                    campo: 'precio',
                    mensaje: 'La IA no devolvió un precio válido; se puso 0.'
                });
            }

            return {
                ...item,
                unit: unidad.unidad,
                category: categoria.categoria,
                quantity: Number.isFinite(cantidad) && cantidad > 0 ? cantidad : 1,
                unitPrice: Number.isFinite(precio) && precio >= 0 ? precio : 0,
                order_index: item.order_index ?? index
            };
        });

        // Unidades válidas pero incoherentes con el concepto (m² de muebles)
        avisos.push(...this.revisarCoherenciaUnidad(normalizadas));

        return { items: normalizadas, avisos, correcciones };
    }
}

export default BudgetNormalizerService;
