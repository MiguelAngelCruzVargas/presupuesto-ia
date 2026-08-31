/**
 * ScheduleDurationService
 *
 * Calcula cuánto dura de verdad cada partida, en vez de adivinarlo.
 *
 * Antes las duraciones salían de una heurística topada en 2 semanas, así que
 * 100 m³ de excavación y 5,000 m³ duraban lo mismo. Aquí se usa la fórmula de
 * obra de toda la vida:
 *
 *     duración (días) = cantidad / (rendimiento × número de cuadrillas)
 *
 * El rendimiento sale, por orden de confianza:
 *   1. Del APU de la partida (labor[].quantity son los jornales por unidad,
 *      así que el rendimiento es su inverso). Es el mejor dato porque lo
 *      revisaste tú al armar el precio unitario.
 *   2. Del catálogo de rendimientos por concepto (excavación, aplanado...).
 *   3. Del catálogo por unidad de medida (m², m³, ml...).
 *
 * Siempre se devuelve de dónde salió, para poder mostrarlo y que nadie firme
 * un programa de obra sin saber en qué se basa.
 */

import { getRendimientoReferencia, CUADRILLA_POR_DEFECTO } from '../config/rendimientos.js';

export class ScheduleDurationService {
    /** Tope de días por partida: más allá de esto conviene partirla en frentes */
    static MAX_DIAS_POR_PARTIDA = 120;

    /**
     * Jornales-hombre por unidad según el APU de la partida.
     * @returns {{jornalesPorUnidad: number, personasCuadrilla: number}|null}
     */
    static leerJornalesDelAPU(item) {
        const labor = item?.apuData?.labor;
        if (!Array.isArray(labor) || labor.length === 0) return null;

        const cantidades = labor
            .map(l => Number(l?.quantity))
            .filter(q => Number.isFinite(q) && q > 0);

        if (cantidades.length === 0) return null;

        // Suma de jornales de todas las categorías para producir 1 unidad
        const jornalesPorUnidad = cantidades.reduce((a, b) => a + b, 0);
        if (jornalesPorUnidad <= 0) return null;

        // La proporción entre categorías dice el tamaño natural de la cuadrilla:
        // 1 oficial (0.0833) + 2 ayudantes (0.1666) -> 3 personas.
        const minimo = Math.min(...cantidades);
        const personasCuadrilla = Math.max(
            1,
            Math.round(cantidades.reduce((total, q) => total + q / minimo, 0))
        );

        return { jornalesPorUnidad, personasCuadrilla };
    }

    /**
     * Duración de una partida.
     *
     * @param {Object} item - Partida con quantity, unit, category y opcionalmente apuData
     * @param {Object} opciones
     * @param {number} opciones.cuadrillas - Cuántas cuadrillas trabajan en paralelo (default 1)
     * @returns {Object} { dias, jornales, rendimientoDiario, personasCuadrilla, fuente, explicacion }
     */
    static calcularDuracionPartida(item = {}, opciones = {}) {
        const cuadrillas = Math.max(1, Number(opciones.cuadrillas) || 1);
        const cantidad = Number(item.quantity) || 0;
        const unidad = item.unit || 'pza';

        if (cantidad <= 0) {
            return {
                dias: 1,
                jornales: 0,
                rendimientoDiario: 0,
                personasCuadrilla: CUADRILLA_POR_DEFECTO,
                fuente: 'sin_cantidad',
                explicacion: 'La partida no tiene cantidad; se asigna 1 día por omisión.'
            };
        }

        const desdeAPU = this.leerJornalesDelAPU(item);

        let jornales;
        let personasCuadrilla;
        let rendimientoDiario;
        let fuente;

        if (desdeAPU) {
            // Jornales-hombre totales que pide el APU
            jornales = cantidad * desdeAPU.jornalesPorUnidad;
            personasCuadrilla = desdeAPU.personasCuadrilla;
            // Lo que produce la cuadrilla completa en un día
            rendimientoDiario = personasCuadrilla / desdeAPU.jornalesPorUnidad;
            fuente = 'apu';
        } else {
            const referencia = getRendimientoReferencia(item);
            rendimientoDiario = referencia.rendimiento;
            personasCuadrilla = CUADRILLA_POR_DEFECTO;
            jornales = (cantidad / rendimientoDiario) * personasCuadrilla;
            fuente = referencia.fuente;
        }

        const diasCrudos = cantidad / (rendimientoDiario * cuadrillas);
        const diasReales = Math.max(1, Math.ceil(diasCrudos));
        const dias = Math.min(this.MAX_DIAS_POR_PARTIDA, diasReales);

        // Si la partida no cabe en el tope, NO se recorta en silencio: se avisa
        // y se dice cuántas cuadrillas harían falta para que sea ejecutable.
        const excedeTope = diasReales > this.MAX_DIAS_POR_PARTIDA;
        const cuadrillasSugeridas = excedeTope
            ? Math.ceil(diasReales / this.MAX_DIAS_POR_PARTIDA) * cuadrillas
            : cuadrillas;

        const rendimientoTexto = Number(rendimientoDiario.toFixed(2));
        const plural = cuadrillas > 1 ? 's' : '';
        const base = `${cantidad} ${unidad} ÷ (${rendimientoTexto} ${unidad}/día × ${cuadrillas} cuadrilla${plural}) = ${diasReales} día${diasReales > 1 ? 's' : ''}`;
        const origen = fuente === 'apu'
            ? `Rendimiento tomado del APU (${personasCuadrilla} personas por cuadrilla).`
            : 'Rendimiento de referencia: esta partida no tiene APU.';
        const aviso = excedeTope
            ? ` ATENCIÓN: son más de ${this.MAX_DIAS_POR_PARTIDA} días con una sola cuadrilla. Se muestra topada; para ejecutarla en plazo necesitas ~${cuadrillasSugeridas} cuadrillas o dividirla en frentes.`
            : '';

        return {
            dias,
            diasReales,
            excedeTope,
            cuadrillasSugeridas,
            jornales: Number(jornales.toFixed(2)),
            rendimientoDiario: rendimientoTexto,
            personasCuadrilla,
            cuadrillas,
            fuente,
            explicacion: `${base}. ${origen}${aviso}`
        };
    }

    /**
     * Duración de una lista de partidas, con el resumen de en qué se apoyó.
     * @returns {{duraciones: Map, totalDias: number, totalJornales: number, cobertura: Object}}
     */
    static calcularDuraciones(items = [], opciones = {}) {
        const duraciones = new Map();
        let totalDias = 0;
        let totalJornales = 0;
        const cobertura = { apu: 0, catalogo: 0, estimado: 0 };

        items.forEach((item, index) => {
            const calculo = this.calcularDuracionPartida(item, opciones);
            duraciones.set(item.id ?? index, calculo);

            totalDias += calculo.dias;
            totalJornales += calculo.jornales;

            if (calculo.fuente === 'apu') cobertura.apu += 1;
            else if (calculo.fuente.startsWith('catalogo')) cobertura.catalogo += 1;
            else cobertura.estimado += 1;
        });

        return {
            duraciones,
            totalDias,
            totalJornales: Number(totalJornales.toFixed(2)),
            cobertura: {
                ...cobertura,
                total: items.length,
                // Qué tan confiable es el cronograma: % de partidas con APU real
                porcentajeConAPU: items.length > 0
                    ? Math.round((cobertura.apu / items.length) * 100)
                    : 0
            }
        };
    }

    /**
     * Línea por partida lista para meter en el prompt de la IA, para que
     * agrupe las fases pero NO invente las duraciones.
     */
    static describirParaPrompt(item, calculo, indice) {
        return `${indice + 1}. ${item.description} | ${item.quantity} ${item.unit || 'pza'} | categoría: ${item.category || 'General'} | DURACIÓN CALCULADA: ${calculo.dias} día(s) | ${calculo.jornales} jornales`;
    }
}

export default ScheduleDurationService;
