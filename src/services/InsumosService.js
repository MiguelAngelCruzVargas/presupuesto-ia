/**
 * InsumosService
 *
 * Saca los insumos (materiales, mano de obra y equipo) del APU de cada partida
 * y los cruza con el cronograma para responder dos preguntas de obra:
 *
 *   ¿Cuánto necesito en total?      -> consolidado()
 *   ¿Qué compro y para cuándo?      -> programaDeSuministro()
 *
 * Diferencia con generateMaterialTakeoff de AIBudgetService: aquel le PREGUNTA
 * a la IA qué materiales hacen falta a partir de las descripciones. Este no
 * pregunta nada: multiplica las cantidades del APU, que son las que tú ya
 * revisaste al armar el precio unitario. Es exacto y no gasta tokens.
 *
 * Los dos se complementan: la IA sirve cuando la partida todavía no tiene APU.
 */

const TIPOS = ['materials', 'labor', 'equipment'];

const ETIQUETA_TIPO = {
    materials: 'Materiales',
    labor: 'Mano de obra',
    equipment: 'Equipo y herramienta'
};

/** Clave para sumar el mismo insumo aunque venga de partidas distintas */
const claveInsumo = (descripcion = '', unidad = '') =>
    `${descripcion.trim().toLowerCase()}|${unidad.trim().toLowerCase()}`;

export class InsumosService {
    /** Días de anticipación por defecto para comprar antes de que arranque la fase */
    static DIAS_ANTICIPACION_COMPRA = 7;

    /**
     * Insumos que consume UNA partida completa.
     * Las cantidades del APU son por 1 unidad, así que se multiplican por la
     * cantidad de la partida.
     * @returns {Array} [{ tipo, descripcion, unidad, cantidad, costoUnitario, costoTotal }]
     */
    static insumosDePartida(item) {
        const apu = item?.apuData;
        if (!apu) return [];

        const cantidadPartida = Number(item.quantity) || 0;
        if (cantidadPartida <= 0) return [];

        const insumos = [];

        TIPOS.forEach(tipo => {
            const lista = Array.isArray(apu[tipo]) ? apu[tipo] : [];

            lista.forEach(insumo => {
                const porUnidad = Number(insumo?.quantity);
                if (!Number.isFinite(porUnidad) || porUnidad <= 0) return;

                const cantidad = porUnidad * cantidadPartida;
                const costoUnitario = Number(insumo.unitPrice) || 0;

                insumos.push({
                    tipo,
                    tipoEtiqueta: ETIQUETA_TIPO[tipo],
                    descripcion: insumo.description || 'Sin descripción',
                    unidad: insumo.unit || 'pza',
                    cantidad,
                    costoUnitario,
                    costoTotal: cantidad * costoUnitario,
                    partida: item.description
                });
            });
        });

        return insumos;
    }

    /**
     * Suma los insumos de varias partidas en una sola lista.
     * @returns {{insumos: Array, cobertura: Object}}
     */
    static consolidar(items = []) {
        const acumulado = new Map();
        let conAPU = 0;

        items.forEach(item => {
            const insumos = this.insumosDePartida(item);
            if (insumos.length > 0) conAPU += 1;

            insumos.forEach(insumo => {
                const clave = `${insumo.tipo}|${claveInsumo(insumo.descripcion, insumo.unidad)}`;
                const previo = acumulado.get(clave);

                if (previo) {
                    previo.cantidad += insumo.cantidad;
                    previo.costoTotal += insumo.costoTotal;
                    if (!previo.partidas.includes(insumo.partida)) {
                        previo.partidas.push(insumo.partida);
                    }
                } else {
                    acumulado.set(clave, {
                        tipo: insumo.tipo,
                        tipoEtiqueta: insumo.tipoEtiqueta,
                        descripcion: insumo.descripcion,
                        unidad: insumo.unidad,
                        cantidad: insumo.cantidad,
                        costoUnitario: insumo.costoUnitario,
                        costoTotal: insumo.costoTotal,
                        partidas: [insumo.partida]
                    });
                }
            });
        });

        const insumos = Array.from(acumulado.values())
            .map(insumo => ({
                ...insumo,
                cantidad: Number(insumo.cantidad.toFixed(2)),
                costoTotal: Number(insumo.costoTotal.toFixed(2))
            }))
            .sort((a, b) => b.costoTotal - a.costoTotal);

        return {
            insumos,
            cobertura: {
                partidasConAPU: conAPU,
                totalPartidas: items.length,
                porcentaje: items.length > 0 ? Math.round((conAPU / items.length) * 100) : 0
            }
        };
    }

    /**
     * Programa de suministro: qué insumos pide cada fase y para cuándo hay que
     * tenerlos en obra.
     *
     * @param {Object} schedule - Cronograma generado (con phases y startDate)
     * @param {Array} items - Partidas del presupuesto (con apuData)
     * @param {Object} opciones - { diasAnticipacion }
     * @returns {{fases: Array, sinAPU: Array, totalMateriales: number}}
     */
    static programaDeSuministro(schedule, items = [], opciones = {}) {
        const diasAnticipacion = Number.isFinite(opciones.diasAnticipacion)
            ? opciones.diasAnticipacion
            : this.DIAS_ANTICIPACION_COMPRA;

        const fases = Array.isArray(schedule?.phases) ? schedule.phases : [];
        const porDescripcion = new Map(items.map(item => [item.description, item]));

        // Partidas que no aportan nada porque les falta el APU
        const sinAPU = items
            .filter(item => !item?.apuData)
            .map(item => item.description);

        let totalMateriales = 0;

        const fasesConInsumos = fases.map(fase => {
            const partidasDeLaFase = (fase.items || [])
                .map(nombre => porDescripcion.get(nombre))
                .filter(Boolean);

            const { insumos } = this.consolidar(partidasDeLaFase);
            const materiales = insumos.filter(i => i.tipo === 'materials');
            const costoMateriales = materiales.reduce((sum, i) => sum + i.costoTotal, 0);
            totalMateriales += costoMateriales;

            return {
                fase: fase.name,
                startDate: fase.startDate,
                endDate: fase.endDate,
                // Fecha en la que el material debe estar comprado para no frenar la obra
                fechaLimiteCompra: this.restarDias(fase.startDate, diasAnticipacion),
                diasAnticipacion,
                partidas: partidasDeLaFase.map(p => p.description),
                partidasSinAPU: (fase.items || []).filter(nombre => {
                    const item = porDescripcion.get(nombre);
                    return !item?.apuData;
                }),
                materiales,
                manoObra: insumos.filter(i => i.tipo === 'labor'),
                equipo: insumos.filter(i => i.tipo === 'equipment'),
                costoMateriales: Number(costoMateriales.toFixed(2))
            };
        });

        return {
            fases: fasesConInsumos,
            sinAPU,
            totalMateriales: Number(totalMateriales.toFixed(2))
        };
    }

    /** Resta días naturales a una fecha ISO (yyyy-mm-dd) */
    static restarDias(fechaISO, dias) {
        if (!fechaISO) return null;
        const fecha = new Date(`${fechaISO}T12:00:00`);
        if (Number.isNaN(fecha.getTime())) return fechaISO;
        fecha.setDate(fecha.getDate() - dias);
        return fecha.toISOString().split('T')[0];
    }

    /** Filas planas para exportar a Excel o CSV */
    static aFilasExportables(programa) {
        const filas = [];

        programa.fases.forEach(fase => {
            fase.materiales.forEach(material => {
                filas.push({
                    Fase: fase.fase,
                    'Comprar antes de': fase.fechaLimiteCompra,
                    'Inicio de fase': fase.startDate,
                    Insumo: material.descripcion,
                    Unidad: material.unidad,
                    Cantidad: material.cantidad,
                    'Costo unitario': material.costoUnitario,
                    'Costo total': material.costoTotal,
                    'Se usa en': material.partidas.join(' / ')
                });
            });
        });

        return filas;
    }
}

export default InsumosService;
