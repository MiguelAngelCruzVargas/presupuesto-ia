/**
 * CriticalPathService
 *
 * Método de la ruta crítica (CPM) sobre las fases del cronograma.
 *
 * Antes `isCritical` lo ponía la IA porque le parecía, y las dependencias eran
 * una cadena: la fase N dependía de la N-1, así que nada se traslapaba nunca y
 * todo era "crítico". Eso no es una ruta crítica, es una lista.
 *
 * Aquí se hace el cálculo real:
 *   - Pasada hacia adelante: inicio y fin más tempranos posibles.
 *   - Pasada hacia atrás: inicio y fin más tardíos sin retrasar la obra.
 *   - Holgura = inicio tardío - inicio temprano.
 *   - Es crítica la fase con holgura 0: si se atrasa un día, la obra se atrasa
 *     un día.
 *
 * Trabaja en días. Si una fase no declara de quién depende, se asume que
 * arranca después de la anterior (comportamiento antiguo, para no romper
 * cronogramas ya guardados).
 */

export class CriticalPathService {
    /**
     * Calcula la red de fases.
     * @param {Array} phases - Fases con { name, durationWeeks, dependsOn?: string[] }
     * @returns {{fases: Array, duracionTotalDias: number, rutaCritica: string[], tieneParalelo: boolean}}
     */
    static calcular(phases = []) {
        if (!Array.isArray(phases) || phases.length === 0) {
            return { fases: [], duracionTotalDias: 0, rutaCritica: [], tieneParalelo: false };
        }

        const nodos = phases.map((phase, index) => ({
            index,
            name: phase.name,
            // Se trabaja en días para no perder precisión al convertir semanas
            duracion: Math.max(1, Math.round((Number(phase.durationWeeks) || 1) * 7)),
            dependsOn: this.resolverDependencias(phase, phases, index),
            original: phase
        }));

        const porNombre = new Map(nodos.map(n => [n.name, n]));
        const orden = this.ordenTopologico(nodos, porNombre);

        // --- Pasada hacia adelante: lo más pronto que puede empezar cada fase
        orden.forEach(nodo => {
            const finesPrevios = nodo.dependsOn
                .map(nombre => porNombre.get(nombre))
                .filter(Boolean)
                // Si la predecesora aún no tiene valor es porque se rompió un
                // ciclo: se ignora esa arista (cuenta como 0) en vez de
                // propagar NaN y devolver un cronograma de 0 días.
                .map(previo => Number.isFinite(previo.inicioTemprano)
                    ? previo.inicioTemprano + previo.duracion
                    : 0);

            nodo.inicioTemprano = finesPrevios.length > 0 ? Math.max(...finesPrevios) : 0;
            nodo.finTemprano = nodo.inicioTemprano + nodo.duracion;
        });

        const duracionTotalDias = Math.max(...nodos.map(n => n.finTemprano || 0));

        // --- Pasada hacia atrás: lo más tarde que puede empezar sin retrasar la obra
        const sucesores = new Map(nodos.map(n => [n.name, []]));
        nodos.forEach(nodo => {
            nodo.dependsOn.forEach(nombre => {
                if (sucesores.has(nombre)) sucesores.get(nombre).push(nodo);
            });
        });

        [...orden].reverse().forEach(nodo => {
            const siguientes = (sucesores.get(nodo.name) || [])
                // Igual que en la pasada hacia adelante: una sucesora sin
                // calcular viene de un ciclo roto, se ignora esa arista.
                .filter(s => Number.isFinite(s.inicioTardio));

            nodo.finTardio = siguientes.length > 0
                ? Math.min(...siguientes.map(s => s.inicioTardio))
                : duracionTotalDias;
            nodo.inicioTardio = nodo.finTardio - nodo.duracion;
        });

        const fases = nodos.map(nodo => {
            const diferencia = nodo.inicioTardio - nodo.inicioTemprano;
            const holgura = Number.isFinite(diferencia) ? Math.max(0, diferencia) : 0;
            return {
                ...nodo.original,
                dependsOn: nodo.dependsOn,
                duracionDias: nodo.duracion,
                inicioTempranoDia: nodo.inicioTemprano,
                finTempranoDia: nodo.finTemprano,
                inicioTardioDia: nodo.inicioTardio,
                finTardioDia: nodo.finTardio,
                holguraDias: holgura,
                // Esto ya no es una opinión: holgura 0 = atrasarla atrasa la obra
                isCritical: holgura === 0
            };
        });

        const rutaCritica = fases.filter(f => f.isCritical).map(f => f.name);

        // ¿Hay fases que corren en paralelo, o sigue siendo una fila india?
        const tieneParalelo = fases.some(a =>
            fases.some(b =>
                a.name !== b.name &&
                a.inicioTempranoDia < b.finTempranoDia &&
                b.inicioTempranoDia < a.finTempranoDia
            )
        );

        return { fases, duracionTotalDias, rutaCritica, tieneParalelo };
    }

    /**
     * De quién depende una fase. Si la IA no lo declaró, se cae al
     * comportamiento anterior: depende de la fase inmediatamente previa.
     */
    static resolverDependencias(phase, phases, index) {
        const declaradas = Array.isArray(phase.dependsOn) ? phase.dependsOn : [];
        const nombresValidos = new Set(phases.map(p => p.name));

        const limpias = declaradas
            .filter(nombre => nombresValidos.has(nombre) && nombre !== phase.name);

        if (limpias.length > 0) return limpias;

        return index > 0 ? [phases[index - 1].name] : [];
    }

    /**
     * Orden topológico para procesar cada fase después de sus predecesoras.
     * Si hay un ciclo (la IA puede inventarlo), se rompe respetando el orden
     * original en vez de colgarse.
     */
    static ordenTopologico(nodos, porNombre) {
        const visitados = new Set();
        const enProceso = new Set();
        const orden = [];

        const visitar = (nodo) => {
            if (visitados.has(nodo.name)) return;
            if (enProceso.has(nodo.name)) {
                // Ciclo: se ignora esta arista para no entrar en bucle infinito
                console.warn(`Dependencia circular en el cronograma: ${nodo.name}`);
                return;
            }

            enProceso.add(nodo.name);
            nodo.dependsOn.forEach(nombre => {
                const previo = porNombre.get(nombre);
                if (previo) visitar(previo);
            });
            enProceso.delete(nodo.name);

            visitados.add(nodo.name);
            orden.push(nodo);
        };

        nodos.forEach(visitar);
        return orden;
    }
}

export default CriticalPathService;
