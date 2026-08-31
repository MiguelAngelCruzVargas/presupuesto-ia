export const BUDGET_CATEGORIES = ['Materiales', 'Mano de Obra', 'Equipos', 'Instalaciones', 'Obra Civil'];

export const SPECIALTY_OPTIONS = [
    'General',
    'Obra Civil',
    'Albañilería',
    'Instalación Eléctrica',
    'Instalación Hidrosanitaria',
    'Instalación de Gas',
    'Acabados',
    'Estructura',
    'Herrería y Aluminio',
    'Carpintería',
    'Aire Acondicionado / Clima',
    'Voz y Datos',
    'Jardinería y Paisajismo'
];

export const BUDGET_UNIT_OPTIONS = [
    { value: 'pza', label: 'Pza' },
    { value: 'und', label: 'Und' },
    { value: 'lote', label: 'Lote' },
    { value: 'm', label: 'm' },
    { value: 'ml', label: 'ml' },
    { value: 'm²', label: 'm²' },
    { value: 'm³', label: 'm³' },
    { value: 'kg', label: 'kg' },
    { value: 'ton', label: 'Ton' },
    { value: 'lt', label: 'Lt' },
    // Faltaban aunque la base de precios ya las usa: el cemento se vende por
    // bulto y la mano de obra se contrata por jornal.
    { value: 'bulto', label: 'Bulto' },
    { value: 'jornal', label: 'Jornal' },
    { value: 'jgo', label: 'Jgo' },
    { value: 'servicio', label: 'Servicio' },
    { value: 'global', label: 'Global' }
];

export const AI_BUDGET_QUICK_SUGGESTIONS = [
    'Cimentación',
    'Muros de Block',
    'Losa de Vigueta',
    'Instalación Eléctrica',
    'Acabados',
    'Pintura'
];

export const SELECT_OPTION_CLASS_NAME = 'bg-white text-slate-900 dark:bg-slate-800 dark:text-slate-100';
