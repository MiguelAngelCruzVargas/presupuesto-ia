/**
 * Rendimientos de referencia para calcular duraciones de obra.
 *
 * Se usan SOLO cuando la partida no tiene APU. Si la partida sí tiene APU,
 * el rendimiento sale de ahí (que es más fiable, porque lo revisaste tú):
 * en el APU, labor[].quantity son los jornales necesarios para 1 unidad,
 * así que el rendimiento es su inverso (0.0833 jor/m² = 12 m²/jornal).
 *
 * Los valores son "unidades que produce UNA cuadrilla en UN día" y salen de
 * prácticas comunes de obra en México. Ajústalos a tus cuadrillas reales:
 * son el respaldo, no la verdad absoluta.
 */

/** Rendimiento diario por unidad de medida, cuando no hay nada más específico */
export const RENDIMIENTO_POR_UNIDAD = {
    m2: 25,      // aplanados, pisos, muros
    'm²': 25,
    m3: 8,       // excavación, concreto, relleno
    'm³': 8,
    m: 40,       // trazo, tubería, cableado
    ml: 40,
    kg: 250,     // acero de refuerzo habilitado
    ton: 0.25,
    pza: 12,
    und: 12,
    jgo: 8,
    lote: 1,
    global: 1,
    servicio: 1,
    lt: 100
};

/**
 * Ajustes por tipo de trabajo. Se busca por palabra clave en la descripción
 * o la categoría de la partida; el primero que coincide manda.
 */
export const RENDIMIENTO_POR_CONCEPTO = [
    { claves: ['excavacion', 'excavación'], unidad: 'm3', rendimiento: 6 },
    { claves: ['relleno', 'compactacion', 'compactación'], unidad: 'm3', rendimiento: 10 },
    { claves: ['plantilla', 'firme'], unidad: 'm2', rendimiento: 30 },
    { claves: ['concreto', 'colado'], unidad: 'm3', rendimiento: 6 },
    { claves: ['cimbra', 'descimbra'], unidad: 'm2', rendimiento: 15 },
    { claves: ['acero', 'armado', 'varilla'], unidad: 'kg', rendimiento: 200 },
    { claves: ['muro', 'block', 'tabique', 'mamposteria', 'mampostería'], unidad: 'm2', rendimiento: 12 },
    { claves: ['aplanado', 'repellado', 'yeso'], unidad: 'm2', rendimiento: 20 },
    { claves: ['piso', 'loseta', 'ceramica', 'cerámica', 'porcelanato'], unidad: 'm2', rendimiento: 18 },
    { claves: ['pintura', 'vinilica', 'vinílica'], unidad: 'm2', rendimiento: 60 },
    { claves: ['impermeabiliz'], unidad: 'm2', rendimiento: 40 },
    { claves: ['instalacion electrica', 'instalación eléctrica', 'salida electrica', 'contacto'], unidad: 'pza', rendimiento: 8 },
    { claves: ['hidraulica', 'hidráulica', 'sanitaria', 'tuberia', 'tubería'], unidad: 'ml', rendimiento: 25 },
    { claves: ['mueble', 'lavabo', 'wc', 'taza'], unidad: 'pza', rendimiento: 4 },
    { claves: ['carpinteria', 'carpintería', 'closet', 'puerta'], unidad: 'pza', rendimiento: 2 },
    { claves: ['herreria', 'herrería', 'canceleria', 'cancelería', 'aluminio'], unidad: 'm2', rendimiento: 8 },
    { claves: ['demolicion', 'demolición', 'retiro', 'escombro'], unidad: 'm3', rendimiento: 5 },
    { claves: ['limpieza'], unidad: 'm2', rendimiento: 80 },
    { claves: ['trazo', 'nivelacion', 'nivelación'], unidad: 'm2', rendimiento: 200 }
];

/** Personas por cuadrilla cuando no se puede deducir del APU */
export const CUADRILLA_POR_DEFECTO = 3;

/** Quita acentos y pasa a minúsculas para comparar sin sorpresas */
const normalizar = (texto = '') =>
    texto.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

/**
 * Rendimiento diario de referencia para una partida sin APU.
 * @returns {{rendimiento: number, fuente: string}} unidades por día de cuadrilla
 */
export const getRendimientoReferencia = (item = {}) => {
    const texto = normalizar(`${item.description || ''} ${item.category || ''}`);

    for (const regla of RENDIMIENTO_POR_CONCEPTO) {
        if (regla.claves.some(clave => texto.includes(normalizar(clave)))) {
            return { rendimiento: regla.rendimiento, fuente: 'catalogo_concepto' };
        }
    }

    const unidad = normalizar(item.unit || 'pza');
    const porUnidad = RENDIMIENTO_POR_UNIDAD[unidad];
    if (porUnidad) {
        return { rendimiento: porUnidad, fuente: 'catalogo_unidad' };
    }

    return { rendimiento: 10, fuente: 'estimado' };
};
