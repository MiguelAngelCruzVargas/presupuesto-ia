/**
 * Configuración de documentos (presupuesto, reporte fotográfico, bitácora).
 *
 * Aquí viven los textos que antes estaban incrustados en las páginas y en los
 * servicios de PDF. Estaban escritos para obra pública municipal
 * ("H. AYUNTAMIENTO", "DIRECTOR DE OBRAS PÚBLICAS"), lo que obligaba a
 * borrarlos a mano en cualquier obra privada, industrial o de urbanización.
 */

/** Títulos por defecto de cada documento. Las plantillas PDF pueden pisarlos. */
export const DOCUMENT_TITLES = {
    budget: 'PRESUPUESTO DE OBRA',
    budgetSubtitle: 'DOCUMENTO TÉCNICO',
    photoReport: 'REPORTE FOTOGRAFICO DE OBRA'
};

/**
 * Esquemas de firma según el tipo de obra.
 *
 * left  = quien ejecuta (contratista, constructora)
 * right = quien recibe o supervisa (ayuntamiento, cliente, dirección de planta)
 */
export const SIGNATURE_SCHEMES = [
    {
        id: 'publica',
        label: 'Obra pública (municipal)',
        description: 'Contrato con ayuntamiento o dependencia de gobierno',
        left: { title: 'EL CONTRATISTA', role: 'ADMINISTRADOR ÚNICO' },
        right: { title: 'H. AYUNTAMIENTO', role: 'DIRECTOR DE OBRAS PÚBLICAS' }
    },
    {
        id: 'privada',
        label: 'Obra privada',
        description: 'Casa, local, remodelación: el cliente recibe directamente',
        left: { title: 'EL CONTRATISTA', role: 'RESPONSABLE DE OBRA' },
        right: { title: 'EL CLIENTE', role: 'PROPIETARIO' }
    },
    {
        id: 'industrial',
        label: 'Industrial / corporativa',
        description: 'Nave, planta o proyecto para una empresa',
        left: { title: 'LA CONTRATISTA', role: 'SUPERINTENDENTE DE OBRA' },
        right: { title: 'LA EMPRESA', role: 'GERENCIA DE PROYECTOS' }
    },
    {
        id: 'supervision',
        label: 'Con supervisión externa',
        description: 'Cuando una tercera parte revisa y valida el avance',
        left: { title: 'EL CONTRATISTA', role: 'RESIDENTE DE OBRA' },
        right: { title: 'SUPERVISIÓN', role: 'SUPERVISOR EXTERNO' }
    },
    {
        id: 'generico',
        label: 'Genérico (sin cargos)',
        description: 'Solo nombres y firmas, sin cargos preimpresos',
        left: { title: 'ELABORÓ', role: '' },
        right: { title: 'RECIBIÓ', role: '' }
    }
];

/** Esquema que se usa si el proyecto no tiene uno guardado */
export const DEFAULT_SIGNATURE_SCHEME_ID = 'publica';

/** Busca un esquema por id; si no existe devuelve el de por defecto */
export const getSignatureScheme = (schemeId) =>
    SIGNATURE_SCHEMES.find(s => s.id === schemeId) ||
    SIGNATURE_SCHEMES.find(s => s.id === DEFAULT_SIGNATURE_SCHEME_ID);

/**
 * Valores de firma iniciales para un esquema, en el formato que usan
 * el reporte fotográfico y el generador de PDF.
 */
export const buildSignatureData = (schemeId, overrides = {}) => {
    const scheme = getSignatureScheme(schemeId);
    return {
        signatureScheme: scheme.id,
        contractorTitle: scheme.left.title,
        contractorName: '',
        contractorRole: scheme.left.role,
        municipalityTitle: scheme.right.title,
        supervisorName: '',
        supervisorRole: scheme.right.role,
        ...overrides
    };
};

/**
 * Correos con acceso al panel de administración.
 * Se define en VITE_ADMIN_EMAILS (separados por coma) para no tener que
 * tocar el código al cambiar de administrador.
 */
export const ADMIN_EMAILS = (import.meta.env?.VITE_ADMIN_EMAILS || 'isc20350265@gmail.com')
    .split(',')
    .map(email => email.trim().toLowerCase())
    .filter(Boolean);

export const isAdminEmail = (email) =>
    !!email && ADMIN_EMAILS.includes(email.toLowerCase());
