/**
 * PDFTemplateService
 * Maneja las plantillas de PDF para presupuestos
 * Guarda en localStorage y permite sincronizar con Supabase
 */

import { generateId } from '../utils/helpers';

const STORAGE_KEY = 'presugenius_pdf_templates';
const ACTIVE_TEMPLATE_KEY = 'presugenius_active_pdf_template';

export class PDFTemplateService {
    /**
     * Obtener todas las plantillas
     * @returns {Array} Lista de plantillas
     */
    static getTemplates() {
        try {
            const stored = localStorage.getItem(STORAGE_KEY);
            return stored ? JSON.parse(stored) : [];
        } catch (error) {
            console.error('Error loading PDF templates:', error);
            return [];
        }
    }

    /**
     * Obtener la plantilla activa
     * @returns {Object|null} Plantilla activa o null
     */
    static getActiveTemplate() {
        try {
            const activeId = localStorage.getItem(ACTIVE_TEMPLATE_KEY);
            if (!activeId) return null;

            const templates = this.getTemplates();
            return templates.find(t => t.id === activeId) || null;
        } catch (error) {
            console.error('Error loading active template:', error);
            return null;
        }
    }

    /**
     * Guardar una nueva plantilla
     * @param {Object} templateData - Datos de la plantilla
     * @returns {Object} Plantilla guardada
     */
    static saveTemplate(templateData) {
        try {
            const templates = this.getTemplates();
            const now = new Date().toISOString();

            const template = {
                id: templateData.id || generateId(),
                name: templateData.name || 'Plantilla sin nombre',
                headerColor: templateData.headerColor || null, // null = sin color, o array [r, g, b]
                headerTextColor: templateData.headerTextColor || [255, 255, 255], // Color del texto [r, g, b]
                headerTextSize: templateData.headerTextSize || 18, // Tamaño del título en pt
                headerSubtextSize: templateData.headerSubtextSize || 9, // Tamaño del subtítulo en pt
                logoUrl: templateData.logoUrl || null, // URL base64 o blob URL
                logoPosition: templateData.logoPosition || 'left', // 'left', 'center', 'right'
                logoSize: templateData.logoSize || { width: 40, height: 40 }, // mm
                showHeader: templateData.showHeader !== false, // true por defecto
                headerText: templateData.headerText || 'PRESUPUESTO DE OBRA',
                headerSubtext: templateData.headerSubtext || 'DOCUMENTO TÉCNICO',
                footerText: templateData.footerText || '',
                createdAt: templateData.createdAt || now,
                updatedAt: now,
                isActive: templateData.isActive || false
            };

            // Si es la plantilla activa, actualizar la referencia
            // IMPORTANTE: Solo activar si explícitamente se indica isActive = true
            if (template.isActive === true) {
                localStorage.setItem(ACTIVE_TEMPLATE_KEY, template.id);
                // Desactivar otras plantillas
                templates.forEach(t => {
                    if (t.id !== template.id) t.isActive = false;
                });
            } else {
                // Si no está activa, asegurarse de que no esté en la referencia activa
                const currentActiveId = localStorage.getItem(ACTIVE_TEMPLATE_KEY);
                if (currentActiveId === template.id) {
                    // Esta plantilla estaba activa pero ahora no lo está, limpiar referencia
                    localStorage.removeItem(ACTIVE_TEMPLATE_KEY);
                }
            }

            // Actualizar o agregar
            const index = templates.findIndex(t => t.id === template.id);
            if (index >= 0) {
                templates[index] = template;
            } else {
                templates.push(template);
            }

            localStorage.setItem(STORAGE_KEY, JSON.stringify(templates));
            return template;
        } catch (error) {
            console.error('Error saving PDF template:', error);
            throw new Error('No se pudo guardar la plantilla');
        }
    }

    /**
     * Eliminar una plantilla
     * @param {string} templateId - ID de la plantilla
     */
    static deleteTemplate(templateId) {
        try {
            const templates = this.getTemplates();
            const filtered = templates.filter(t => t.id !== templateId);
            localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));

            // Si era la activa, limpiar referencia
            const activeId = localStorage.getItem(ACTIVE_TEMPLATE_KEY);
            if (activeId === templateId) {
                localStorage.removeItem(ACTIVE_TEMPLATE_KEY);
            }
        } catch (error) {
            console.error('Error deleting template:', error);
            throw new Error('No se pudo eliminar la plantilla');
        }
    }

    /**
     * Establecer una plantilla como activa
     * @param {string} templateId - ID de la plantilla
     */
    static setActiveTemplate(templateId) {
        try {
            const templates = this.getTemplates();
            
            // Desactivar todas
            templates.forEach(t => t.isActive = false);
            
            // Activar la seleccionada
            const template = templates.find(t => t.id === templateId);
            if (template) {
                template.isActive = true;
                localStorage.setItem(ACTIVE_TEMPLATE_KEY, templateId);
                localStorage.setItem(STORAGE_KEY, JSON.stringify(templates));
                return template;
            }
            return null;
        } catch (error) {
            console.error('Error setting active template:', error);
            throw new Error('No se pudo activar la plantilla');
        }
    }

    /**
     * Convertir imagen a base64
     * @param {File} file - Archivo de imagen
     * @returns {Promise<string>} Base64 string
     */
    static async imageToBase64(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => {
                const base64 = reader.result;
                resolve(base64);
            };
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    }

    /**
     * Validar plantilla
     * @param {Object} template - Plantilla a validar
     * @returns {{valid: boolean, errors: string[]}}
     */
    static validateTemplate(template) {
        const errors = [];

        if (!template.name || template.name.trim() === '') {
            errors.push('El nombre de la plantilla es requerido');
        }

        if (template.headerColor && !Array.isArray(template.headerColor)) {
            errors.push('El color del header debe ser un array [r, g, b]');
        }

        if (template.headerColor && template.headerColor.length !== 3) {
            errors.push('El color del header debe tener 3 valores (RGB)');
        }

        if (template.logoUrl && !template.logoUrl.startsWith('data:image')) {
            errors.push('La URL del logo debe ser una imagen en base64');
        }

        return {
            valid: errors.length === 0,
            errors
        };
    }
}

export default PDFTemplateService;

