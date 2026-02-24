/**
 * SupabaseService
 * Handles cloud persistence of projects using Supabase
 */

import { supabase } from '../lib/supabaseClient';
import { generateId } from '../utils/helpers';

export class SupabaseService {
    /**
     * Save a project to Supabase
     * @param {Object} projectData - Full project data
     * @returns {Object} - Saved project metadata
     */
    static async saveProject(projectData) {
        try {
            const user = (await supabase.auth.getUser()).data.user;
            const userId = user ? user.id : null; // Optional: handle auth later

            // Prepare data for DB
            // We store the heavy JSON in a 'data' column
            const id = projectData.id || generateId();

            const payload = {
                id: id,
                name: projectData.projectInfo?.project || 'Sin Nombre',
                client: projectData.projectInfo?.client || '',
                location: projectData.projectInfo?.location || '',
                data: projectData, // Store full JSON
                updated_at: new Date().toISOString()
            };

            if (userId) payload.user_id = userId;

            const { data, error } = await supabase
                .from('projects')
                .upsert(payload)
                .select()
                .single();

            if (error) throw error;

            return data;
        } catch (error) {
            console.error('Error saving project to Supabase:', error);
            throw error;
        }
    }

    /**
     * Get all projects (metadata)
     * @returns {Array} - List of projects sorted by date
     */
    static async getAllProjects() {
        try {
            const { data, error } = await supabase
                .from('projects')
                .select('id, name, client, location, updated_at, data')
                .order('updated_at', { ascending: false });

            if (error) throw error;

            return data.map(p => {
                const projectData = p.data || {};
                const info = projectData.projectInfo || {};
                const items = projectData.items || [];

                // Calculate total for display
                const total = items.reduce((sum, item) => {
                    return sum + (item.quantity * item.unitPrice);
                }, 0);

                return {
                    id: p.id,
                    project: info.project || p.name || 'Sin Nombre',
                    client: info.client || p.client || 'Sin Cliente',
                    type: info.type || 'General',
                    location: info.location || p.location,
                    lastModified: p.updated_at,
                    items: items,
                    total: total,
                    // Keep full data for loading
                    ...projectData
                };
            });

        } catch (error) {
            console.error('Error loading projects from Supabase:', error);
            return [];
        }
    }

    /**
     * Alias for getAllProjects - used in Editor component
     * @returns {Array} - List of projects sorted by date
     */
    static async listProjects() {
        return this.getAllProjects();
    }

    /**
     * Get a specific project by ID
     * RLS policies ensure user can only access their own projects
     * @param {string} id 
     * @returns {Object|null}
     */
    static async getProject(id) {
        try {
            // Verificar autenticación primero
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                throw new Error('No autenticado');
            }

            // RLS policies de Supabase aseguran que solo se obtengan proyectos del usuario
            const { data, error } = await supabase
                .from('projects')
                .select('id, user_id, data')
                .eq('id', id)
                .maybeSingle();

            if (error) throw error;
            if (!data) return null;

            // Validación adicional: verificar que el proyecto pertenece al usuario
            // (aunque RLS debería proteger esto, validamos como capa adicional)
            if (data.user_id && data.user_id !== user.id) {
                console.warn('Intento de acceso a proyecto de otro usuario bloqueado');
                throw new Error('No tienes permisos para acceder a este proyecto');
            }

            return data.data; // The 'data' column contains our JSON
        } catch (error) {
            console.error('Error loading project details:', error);
            // Re-lanzar el error para que el componente pueda manejarlo
            throw error;
        }
    }

    /**
     * Delete a project by ID
     * @param {string} id 
     */
    static async deleteProject(id) {
        try {
            const { error } = await supabase
                .from('projects')
                .delete()
                .eq('id', id);

            if (error) throw error;
        } catch (error) {
            console.error('Error deleting project:', error);
            throw error;
        }
    }

    /**
     * Update project name
     * @param {string} id 
     * @param {string} newName 
     */
    static async updateProjectName(id, newName) {
        try {
            const { error } = await supabase
                .from('projects')
                .update({ name: newName, updated_at: new Date().toISOString() })
                .eq('id', id);

            if (error) throw error;
        } catch (error) {
            console.error('Error updating project name:', error);
            throw error;
        }
    }
}

export default SupabaseService;
