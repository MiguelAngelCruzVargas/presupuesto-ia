import { supabase } from '../lib/supabaseClient';
import { generateId } from '../utils/helpers';

export class TemplateService {
    /**
     * Get all templates, optionally filtered by category
     * @param {string} category - Optional category filter
     * @param {boolean} publicOnly - Only show public templates
     * @returns {Promise<Array>} - Array of templates
     */
    static async getTemplates(category = null, publicOnly = true) {
        try {
            let query = supabase
                .from('project_templates')
                .select(`
          *,
          categories (
            id,
            name
          )
        `)
                .order('created_at', { ascending: false });

            // Always filter by is_public when publicOnly is true
            if (publicOnly) {
                query = query.eq('is_public', true);
            }

            if (category) {
                query = query.eq('category_id', category);
            }

            const { data, error } = await query;

            if (error) {
                console.error('Error fetching templates:', error);
                throw error;
            }

            console.log(`📋 Templates loaded: ${data?.length || 0} (publicOnly: ${publicOnly})`);

            return data || [];
        } catch (error) {
            console.error('Error fetching templates:', error);
            throw error;
        }
    }

    /**
     * Get user's templates (both public and private)
     * @param {string} userId - User ID
     * @returns {Promise<Array>} - User's templates
     */
    static async getUserTemplates(userId) {
        try {
            const { data, error } = await supabase
                .from('project_templates')
                .select(`
                    *,
                    categories (
                        id,
                        name
                    )
                `)
                .eq('user_id', userId)
                .order('created_at', { ascending: false });

            if (error) throw error;
            return data || [];
        } catch (error) {
            console.error('Error fetching user templates:', error);
            throw error;
        }
    }

    /**
     * Get templates for a user (includes their own templates + public templates from others)
     * @param {string} userId - User ID
     * @param {string} category - Optional category filter
     * @returns {Promise<Array>} - Combined templates
     */
    static async getUserTemplatesWithPublic(userId, category = null) {
        try {
            // Get all templates that are either:
            // 1. Owned by the user (public or private)
            // 2. Public templates from other users
            // Use simpler approach: get all that match RLS policy (which already handles this)
            let query = supabase
                .from('project_templates')
                .select(`
                    *,
                    categories (
                        id,
                        name
                    )
                `)
                .order('created_at', { ascending: false });

            if (category) {
                query = query.eq('category_id', category);
            }

            const { data, error } = await query;

            if (error) {
                console.error('Error en query getUserTemplatesWithPublic:', error);
                throw error;
            }

            // RLS policy already filters to: user's own templates OR public templates
            // But we can also filter client-side to be safe
            const filteredTemplates = (data || []).filter(template =>
                template.user_id === userId || template.is_public === true
            );

            // Remove duplicates (shouldn't happen, but just in case)
            const uniqueTemplates = Array.from(
                new Map(filteredTemplates.map(t => [t.id, t])).values()
            );

            console.log(`📋 Templates loaded for user ${userId}: ${uniqueTemplates.length} (${uniqueTemplates.filter(t => t.user_id === userId).length} own, ${uniqueTemplates.filter(t => t.is_public && t.user_id !== userId).length} public from others)`);

            return uniqueTemplates;
        } catch (error) {
            console.error('Error fetching user templates with public:', error);
            throw error;
        }
    }

    /**
     * Guarda un presupuesto existente como plantilla reutilizable.
     *
     * Lee las partidas de projects.data, que es donde la app las guarda de
     * verdad. Antes las leía de la tabla budget_items, que está vacía: por eso
     * TODA plantilla guardada salía sin partidas, sin dar ningún error.
     *
     * @param {string} projectId - Proyecto del que se copia
     * @param {Object} metadata - { name, description, categoryId, isPublic }
     * @returns {Promise<Object>} La plantilla creada
     */
    static async createTemplate(projectId, metadata) {
        try {
            const { data: project, error: projectError } = await supabase
                .from('projects')
                .select('*')
                .eq('id', projectId)
                .single();

            if (projectError) throw projectError;

            const contenido = project.data || {};
            const projectInfo = contenido.projectInfo || {};
            const items = Array.isArray(contenido.items) ? contenido.items : [];

            if (items.length === 0) {
                throw new Error('Este presupuesto no tiene partidas que guardar como plantilla.');
            }

            // Se guarda la forma que usa la app (unitPrice). Se acepta price por
            // si el proyecto viene de una versión anterior.
            const partidas = items.map(item => ({
                code: item.code || '',
                description: item.description,
                unit: item.unit,
                quantity: Number(item.quantity) || 0,
                unitPrice: Number(item.unitPrice ?? item.price) || 0,
                category: item.category,
                notes: item.notes || '',
                // El APU es lo más caro de rehacer: si el proyecto lo tiene,
                // viaja con la plantilla.
                apuData: item.apuData || null,
                calculation_basis: item.calculation_basis || ''
            }));

            const totalEstimado = partidas.reduce(
                (suma, item) => suma + item.quantity * item.unitPrice,
                0
            );

            const templateData = {
                name: metadata.name || project.name,
                description: metadata.description || '',
                category_id: metadata.categoryId || null,
                is_public: metadata.isPublic || false,
                user_id: project.user_id,
                template_data: {
                    projectInfo: {
                        type: projectInfo.type || project.type,
                        location: projectInfo.location || project.location,
                        taxRate: projectInfo.taxRate ?? project.tax_rate,
                        indirect_percentage: projectInfo.indirect_percentage ?? project.indirect_percentage ?? 0,
                        profit_percentage: projectInfo.profit_percentage ?? project.profit_percentage ?? 0
                    },
                    items: partidas,
                    metadata: {
                        totalItems: partidas.length,
                        estimatedTotal: totalEstimado,
                        categories: [...new Set(partidas.map(item => item.category))],
                        conAPU: partidas.filter(item => item.apuData).length
                    }
                }
            };

            const { data: template, error: templateError } = await supabase
                .from('project_templates')
                .insert([templateData])
                .select()
                .single();

            if (templateError) throw templateError;
            return template;
        } catch (error) {
            console.error('Error creating template:', error);
            throw error;
        }
    }

    /**
     * Crea un proyecto nuevo a partir de una plantilla: una copia completa,
     * editable de principio a fin, sin tocar la plantilla original.
     *
     * Escribe en projects.data, que es de donde la app lee. Antes insertaba en
     * budget_items y dejaba data en NULL, así que el proyecto creado abría
     * vacío aunque el mensaje dijera que todo salió bien.
     *
     * @param {string} templateId
     * @param {Object} customization - { projectName, client, location, quantities, prices }
     * @param {string} userId
     */
    static async useTemplate(templateId, customization = {}, userId) {
        try {
            const { data: template, error: templateError } = await supabase
                .from('project_templates')
                .select('*')
                .eq('id', templateId)
                .single();

            if (templateError) throw templateError;

            const contenido = template.template_data || {};
            const infoPlantilla = contenido.projectInfo || {};
            const partidasPlantilla = Array.isArray(contenido.items) ? contenido.items : [];

            if (partidasPlantilla.length === 0) {
                throw new Error('Esta plantilla no tiene partidas. Vuelve a guardarla desde un presupuesto con contenido.');
            }

            const nombreProyecto = customization.projectName || template.name;
            const projectId = generateId();

            // Cada partida estrena id: son copias independientes, editar una no
            // toca la plantilla ni otros proyectos creados a partir de ella.
            const items = partidasPlantilla.map((item, index) => ({
                id: generateId(),
                code: item.code || '',
                description: item.description,
                unit: item.unit,
                quantity: Number(customization.quantities?.[index] ?? item.quantity) || 0,
                unitPrice: Number(customization.prices?.[index] ?? item.unitPrice ?? item.price) || 0,
                category: item.category,
                notes: item.notes || '',
                apuData: item.apuData || null,
                calculation_basis: item.calculation_basis || '',
                order_index: index
            }));

            const projectInfo = {
                id: projectId,
                project: nombreProyecto,
                client: customization.client || '',
                location: customization.location || infoPlantilla.location || '',
                type: infoPlantilla.type || 'General',
                taxRate: infoPlantilla.taxRate ?? 16,
                indirect_percentage: infoPlantilla.indirect_percentage ?? 0,
                profit_percentage: infoPlantilla.profit_percentage ?? 0,
                date: new Date().toISOString().split('T')[0]
            };

            // Misma forma que escribe SupabaseService.saveProject
            const contenidoProyecto = {
                id: projectId,
                projectInfo,
                items,
                scheduleData: null,
                materialList: [],
                materialAssumptions: [],
                creadoDesdePlantilla: {
                    templateId,
                    nombre: template.name,
                    fecha: new Date().toISOString()
                }
            };

            const { data: project, error: projectError } = await supabase
                .from('projects')
                .insert([{
                    id: projectId,
                    user_id: userId,
                    name: nombreProyecto,
                    client: projectInfo.client,
                    location: projectInfo.location,
                    type: projectInfo.type,
                    tax_rate: projectInfo.taxRate,
                    indirect_percentage: projectInfo.indirect_percentage,
                    profit_percentage: projectInfo.profit_percentage,
                    data: contenidoProyecto
                }])
                .select()
                .single();

            if (projectError) throw projectError;

            // Contador de uso: para saber qué plantillas sirven de verdad.
            // Si falla no se interrumpe: el proyecto ya se creó bien.
            try {
                await supabase
                    .from('project_templates')
                    .update({ usage_count: (template.usage_count || 0) + 1 })
                    .eq('id', templateId);
            } catch (error) {
                console.warn('No se pudo actualizar el contador de uso:', error);
            }

            return {
                project,
                itemsCount: items.length
            };
        } catch (error) {
            console.error('Error using template:', error);
            throw error;
        }
    }

    /**
     * Duplica un presupuesto tal cual, sin pasar por una plantilla.
     * Para cuando solo quieres partir de uno que ya hiciste y cambiarle cosas.
     *
     * @param {string} projectId - Proyecto original
     * @param {string} nuevoNombre - Nombre de la copia
     * @returns {Promise<Object>} El proyecto nuevo
     */
    static async duplicarProyecto(projectId, nuevoNombre) {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('Necesitas iniciar sesión para duplicar un presupuesto.');

            const { data: original, error: errorOriginal } = await supabase
                .from('projects')
                .select('*')
                .eq('id', projectId)
                .single();

            if (errorOriginal) throw errorOriginal;

            const contenido = original.data || {};
            const nuevoId = generateId();
            const nombre = nuevoNombre || `${original.name} (copia)`;

            // Ids nuevos en las partidas para que las dos copias sean independientes
            const items = (contenido.items || []).map(item => ({
                ...item,
                id: generateId()
            }));

            const contenidoNuevo = {
                ...contenido,
                id: nuevoId,
                projectInfo: {
                    ...(contenido.projectInfo || {}),
                    id: nuevoId,
                    project: nombre,
                    date: new Date().toISOString().split('T')[0]
                },
                items,
                // El cronograma y la bitácora son del proyecto original: se
                // vuelven a generar para el nuevo con sus propias fechas.
                scheduleData: null,
                duplicadoDe: { projectId, nombre: original.name, fecha: new Date().toISOString() }
            };

            const { data: copia, error: errorCopia } = await supabase
                .from('projects')
                .insert([{
                    id: nuevoId,
                    user_id: user.id,
                    name: nombre,
                    client: original.client,
                    location: original.location,
                    type: original.type,
                    tax_rate: original.tax_rate,
                    indirect_percentage: original.indirect_percentage,
                    profit_percentage: original.profit_percentage,
                    data: contenidoNuevo
                }])
                .select()
                .single();

            if (errorCopia) throw errorCopia;

            return { project: copia, itemsCount: items.length };
        } catch (error) {
            console.error('Error duplicando el proyecto:', error);
            throw error;
        }
    }

    /**
     * Delete template
     * @param {string} templateId - Template ID
     * @param {string} userId - User ID (for permission check)
     * @returns {Promise<boolean>} - Success status
     */
    static async deleteTemplate(templateId, userId) {
        try {
            const { error } = await supabase
                .from('project_templates')
                .delete()
                .eq('id', templateId)
                .eq('user_id', userId);

            if (error) throw error;
            return true;
        } catch (error) {
            console.error('Error deleting template:', error);
            throw error;
        }
    }

    /**
     * Get all categories
     * @returns {Promise<Array>} - Categories
     */
    static async getCategories() {
        try {
            const { data, error } = await supabase
                .from('categories')
                .select('*')
                .order('name');

            if (error) throw error;
            return data || [];
        } catch (error) {
            console.error('Error fetching categories:', error);
            throw error;
        }
    }

    /**
     * Search templates
     * @param {string} query - Search query
     * @returns {Promise<Array>} - Matching templates
     */
    static async searchTemplates(query, userId = null) {
        try {
            let searchQuery = supabase
                .from('project_templates')
                .select(`
                    *,
                    categories (
                        id,
                        name
                    )
                `)
                .or(`name.ilike.%${query}%,description.ilike.%${query}%`)
                .order('created_at', { ascending: false });

            // If user is provided, show their templates + public ones
            // Otherwise, show only public templates
            if (userId) {
                searchQuery = searchQuery.or(`user_id.eq.${userId},is_public.eq.true`);
            } else {
                searchQuery = searchQuery.eq('is_public', true);
            }

            const { data, error } = await searchQuery;

            if (error) throw error;

            // Remove duplicates if user is provided
            if (userId && data) {
                const uniqueTemplates = Array.from(
                    new Map(data.map(t => [t.id, t])).values()
                );
                return uniqueTemplates;
            }

            return data || [];
        } catch (error) {
            console.error('Error searching templates:', error);
            throw error;
        }
    }
}
