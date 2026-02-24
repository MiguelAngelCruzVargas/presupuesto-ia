import { supabase } from '../lib/supabaseClient';

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
     * Create template from existing project
     * @param {string} projectId - Source project ID
     * @param {Object} metadata - Template metadata
     * @returns {Promise<Object>} - Created template
     */
    static async createTemplate(projectId, metadata) {
        try {
            // Get project data
            const { data: project, error: projectError } = await supabase
                .from('projects')
                .select('*')
                .eq('id', projectId)
                .single();

            if (projectError) throw projectError;

            // Get project items
            const { data: items, error: itemsError } = await supabase
                .from('budget_items')
                .select('*')
                .eq('project_id', projectId);

            if (itemsError) throw itemsError;

            // Create template
            const templateData = {
                name: metadata.name || project.name,
                description: metadata.description || '',
                category_id: metadata.categoryId,
                is_public: metadata.isPublic || false,
                user_id: project.user_id,
                template_data: {
                    projectInfo: {
                        type: project.type,
                        location: project.location,
                        taxRate: project.tax_rate,
                        indirect_percentage: project.indirect_percentage,
                        profit_percentage: project.profit_percentage
                    },
                    items: items.map(item => ({
                        code: item.code,
                        description: item.description,
                        unit: item.unit,
                        quantity: item.quantity,
                        price: item.price,
                        category: item.category,
                        notes: item.notes
                    })),
                    metadata: {
                        totalItems: items.length,
                        estimatedTotal: items.reduce((sum, item) => sum + (item.quantity * item.price), 0),
                        categories: [...new Set(items.map(item => item.category))]
                    }
                }
                // Nota: tags se almacenaría dentro de template_data si se necesitara en el futuro
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
     * Create new project from template
     * @param {string} templateId - Template ID
     * @param {Object} customization - Custom values
     * @param {string} userId - User ID
     * @returns {Promise<Object>} - Created project
     */
    static async useTemplate(templateId, customization, userId) {
        try {
            // Get template
            const { data: template, error: templateError } = await supabase
                .from('project_templates')
                .select('*')
                .eq('id', templateId)
                .single();

            if (templateError) throw templateError;

            const templateData = template.template_data;

            // Create new project
            const projectData = {
                user_id: userId,
                name: customization.projectName || template.name,
                client: customization.client || '',
                location: customization.location || templateData.projectInfo.location,
                type: templateData.projectInfo.type,
                tax_rate: templateData.projectInfo.taxRate,
                indirect_percentage: templateData.projectInfo.indirect_percentage ?? 0,
                profit_percentage: templateData.projectInfo.profit_percentage ?? 0
            };

            const { data: project, error: projectError } = await supabase
                .from('projects')
                .insert([projectData])
                .select()
                .single();

            if (projectError) throw projectError;

            // Create budget items
            const items = templateData.items.map((item, index) => ({
                project_id: project.id,
                code: item.code,
                description: item.description,
                unit: item.unit,
                quantity: customization.quantities?.[index] || item.quantity,
                price: customization.prices?.[index] || item.price,
                category: item.category,
                notes: item.notes,
                order_index: index
            }));

            const { error: itemsError } = await supabase
                .from('budget_items')
                .insert(items);

            if (itemsError) throw itemsError;

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
