/**
 * PDFTemplateService
 * Maneja las plantillas de PDF para presupuestos.
 *
 * Las plantillas viven en Supabase (tabla pdf_templates), así te siguen a
 * cualquier equipo donde inicies sesión. localStorage se usa como caché local:
 * gracias a eso las lecturas siguen siendo síncronas y el generador de PDF
 * puede pedir la plantilla activa sin esperar a la red.
 *
 * Flujo: al entrar a la app se llama syncFromCloud() una vez; a partir de ahí
 * se lee de la caché y cada cambio se escribe en las dos.
 */

import { generateId } from '../utils/helpers';
import { supabase } from '../lib/supabaseClient';

const STORAGE_KEY = 'presugenius_pdf_templates';
const ACTIVE_TEMPLATE_KEY = 'presugenius_active_pdf_template';

export class PDFTemplateService {
    // ============================================================
    // Caché local (lecturas síncronas)
    // ============================================================

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

    /** Reescribe la caché local a partir de una lista de plantillas */
    static writeCache(templates) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(templates));

        const active = templates.find(t => t.isActive);
        if (active) {
            localStorage.setItem(ACTIVE_TEMPLATE_KEY, active.id);
        } else {
            localStorage.removeItem(ACTIVE_TEMPLATE_KEY);
        }
    }

    // ============================================================
    // Sincronización con Supabase
    // ============================================================

    /** Id del usuario con sesión, o null si se está trabajando en modo local */
    static async getUserId() {
        try {
            const { data } = await supabase.auth.getUser();
            return data?.user?.id || null;
        } catch (error) {
            console.warn('Sin sesión para sincronizar plantillas:', error);
            return null;
        }
    }

    /** Fila de Supabase -> plantilla que entiende la app */
    static fromRow(row) {
        return {
            id: row.id,
            name: row.name,
            isActive: !!row.is_active,
            createdAt: row.created_at,
            updatedAt: row.updated_at,
            ...(row.config || {})
        };
    }

    /** Plantilla de la app -> fila de Supabase */
    static toRow(template, userId) {
        const { id, name, isActive, createdAt, updatedAt, ...config } = template;
        return {
            id,
            user_id: userId,
            name,
            is_active: !!isActive,
            config
        };
    }

    /**
     * Trae las plantillas de la nube a la caché local.
     * Si la nube está vacía pero hay plantillas locales, las sube primero
     * (migración automática de lo que ya tenías en este navegador).
     * @returns {Promise<Array>} Plantillas ya sincronizadas
     */
    static async syncFromCloud() {
        const userId = await this.getUserId();
        if (!userId) return this.getTemplates(); // modo local: solo caché

        try {
            const { data, error } = await supabase
                .from('pdf_templates')
                .select('*')
                .eq('user_id', userId)
                .order('created_at', { ascending: true });

            if (error) throw error;

            const locales = this.getTemplates();

            // Primera vez en la nube: subir lo que ya existía en este navegador
            if ((!data || data.length === 0) && locales.length > 0) {
                await this.pushLocalToCloud(userId, locales);
                return locales;
            }

            const remotas = (data || []).map(row => this.fromRow(row));
            this.writeCache(remotas);
            return remotas;
        } catch (error) {
            console.error('Error sincronizando plantillas desde Supabase:', error);
            return this.getTemplates(); // se sigue trabajando con la caché
        }
    }

    /** Sube las plantillas locales a la nube (migración de una sola vez) */
    static async pushLocalToCloud(userId, templates) {
        try {
            const filas = templates.map(t => this.toRow(t, userId));
            const { error } = await supabase.from('pdf_templates').upsert(filas);
            if (error) throw error;
            console.info(`Plantillas migradas a Supabase: ${filas.length}`);
        } catch (error) {
            console.error('Error migrando plantillas a Supabase:', error);
        }
    }

    // ============================================================
    // Escrituras (caché + nube)
    // ============================================================

    /**
     * Guardar una plantilla (nueva o existente)
     * @param {Object} templateData - Datos de la plantilla
     * @returns {Promise<Object>} Plantilla guardada
     */
    static async saveTemplate(templateData) {
        const templates = this.getTemplates();
        const now = new Date().toISOString();

        const template = {
            id: templateData.id || generateId(),
            name: templateData.name || 'Plantilla sin nombre',
            headerColor: templateData.headerColor || null, // null = sin color, o array [r, g, b]
            headerTextColor: templateData.headerTextColor || [255, 255, 255],
            headerTextSize: templateData.headerTextSize || 18,
            headerSubtextSize: templateData.headerSubtextSize || 9,
            logoUrl: templateData.logoUrl || null, // base64
            logoPosition: templateData.logoPosition || 'left',
            logoSize: templateData.logoSize || { width: 40, height: 40 }, // mm
            showHeader: templateData.showHeader !== false,
            headerText: templateData.headerText || 'PRESUPUESTO DE OBRA',
            headerSubtext: templateData.headerSubtext || 'DOCUMENTO TÉCNICO',
            footerText: templateData.footerText || '',
            createdAt: templateData.createdAt || now,
            updatedAt: now,
            isActive: templateData.isActive === true
        };

        // Solo una activa a la vez
        if (template.isActive) {
            templates.forEach(t => {
                if (t.id !== template.id) t.isActive = false;
            });
        }

        const index = templates.findIndex(t => t.id === template.id);
        if (index >= 0) {
            templates[index] = template;
        } else {
            templates.push(template);
        }

        this.writeCache(templates);

        // Persistir en la nube
        const userId = await this.getUserId();
        if (userId) {
            try {
                if (template.isActive) {
                    // Desactivar el resto antes de marcar esta
                    const { error: offError } = await supabase
                        .from('pdf_templates')
                        .update({ is_active: false })
                        .eq('user_id', userId)
                        .neq('id', template.id);
                    if (offError) throw offError;
                }

                const { error } = await supabase
                    .from('pdf_templates')
                    .upsert(this.toRow(template, userId));
                if (error) throw error;
            } catch (error) {
                console.error('Error guardando la plantilla en Supabase:', error);
                throw new Error('La plantilla se guardó en este navegador, pero no se pudo sincronizar. Revisa tu conexión.');
            }
        }

        return template;
    }

    /**
     * Eliminar una plantilla
     * @param {string} templateId - ID de la plantilla
     */
    static async deleteTemplate(templateId) {
        const templates = this.getTemplates().filter(t => t.id !== templateId);
        this.writeCache(templates);

        const userId = await this.getUserId();
        if (!userId) return;

        try {
            const { error } = await supabase
                .from('pdf_templates')
                .delete()
                .eq('id', templateId)
                .eq('user_id', userId);
            if (error) throw error;
        } catch (error) {
            console.error('Error eliminando la plantilla en Supabase:', error);
            throw new Error('Se eliminó localmente, pero no se pudo sincronizar.');
        }
    }

    /**
     * Establecer una plantilla como activa
     * @param {string} templateId - ID de la plantilla
     * @returns {Promise<Object|null>} La plantilla activada
     */
    static async setActiveTemplate(templateId) {
        const templates = this.getTemplates();
        const template = templates.find(t => t.id === templateId);
        if (!template) return null;

        templates.forEach(t => { t.isActive = t.id === templateId; });
        this.writeCache(templates);

        const userId = await this.getUserId();
        if (userId) {
            try {
                const { error: offError } = await supabase
                    .from('pdf_templates')
                    .update({ is_active: false })
                    .eq('user_id', userId)
                    .neq('id', templateId);
                if (offError) throw offError;

                const { error } = await supabase
                    .from('pdf_templates')
                    .update({ is_active: true })
                    .eq('id', templateId)
                    .eq('user_id', userId);
                if (error) throw error;
            } catch (error) {
                console.error('Error activando la plantilla en Supabase:', error);
                throw new Error('Se activó en este navegador, pero no se pudo sincronizar.');
            }
        }

        return template;
    }

    /**
     * Dejar el presupuesto sin plantilla (vuelve al diseño por defecto)
     */
    static async deactivateAll() {
        const templates = this.getTemplates();
        templates.forEach(t => { t.isActive = false; });
        this.writeCache(templates);

        const userId = await this.getUserId();
        if (!userId) return;

        try {
            const { error } = await supabase
                .from('pdf_templates')
                .update({ is_active: false })
                .eq('user_id', userId);
            if (error) throw error;
        } catch (error) {
            console.error('Error desactivando plantillas en Supabase:', error);
            throw new Error('Se desactivó en este navegador, pero no se pudo sincronizar.');
        }
    }

    /**
     * Cambia la plantilla activa SOLO en la caché local, sin tocar la nube.
     * Es lo que usa la vista previa: se activa un momento para dibujar el PDF
     * y luego se restaura, sin ensuciar lo que tienes guardado.
     */
    static setActiveTemplateLocal(templateId) {
        const templates = this.getTemplates();
        templates.forEach(t => { t.isActive = t.id === templateId; });
        this.writeCache(templates);
        return templates.find(t => t.id === templateId) || null;
    }

    /** Quita la plantilla activa solo en la caché local (para la vista previa) */
    static deactivateAllLocal() {
        const templates = this.getTemplates();
        templates.forEach(t => { t.isActive = false; });
        this.writeCache(templates);
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
