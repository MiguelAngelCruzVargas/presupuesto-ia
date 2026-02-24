/**
 * ProjectPersistenceService
 * Servicio centralizado para persistencia de proyectos
 * Maneja guardado, carga, eliminación y sincronización con Supabase
 */

import SupabaseService from './SupabaseService';
import { supabase } from '../lib/supabaseClient';

export class ProjectPersistenceService {
    /**
     * Guarda un proyecto completo con sincronización de cronograma
     * @param {Object} projectData - Datos completos del proyecto
     * @returns {Promise<Object>} - Proyecto guardado con ID actualizado
     */
    static async saveProject(projectData) {
        // Validar que tenga nombre
        if (!projectData.projectInfo?.project) {
            throw new Error('El proyecto debe tener un nombre');
        }

        // Guardar proyecto principal
        const saved = await SupabaseService.saveProject(projectData);
        
        // Sincronizar cronograma si existe
        if (projectData.scheduleData && saved.id) {
            await this.syncSchedule(saved.id, projectData.scheduleData);
        }

        return saved;
    }

    /**
     * Sincroniza el cronograma con la tabla project_schedules
     * @param {string} projectId - ID del proyecto
     * @param {Object} scheduleData - Datos del cronograma
     */
    static async syncSchedule(projectId, scheduleData) {
        if (!projectId || !scheduleData) return;

        try {
            // Verificar si existe cronograma
            const { data: existing } = await supabase
                .from('project_schedules')
                .select('id')
                .eq('project_id', projectId)
                .maybeSingle();

            if (existing) {
                // Actualizar existente
                await supabase
                    .from('project_schedules')
                    .update({ 
                        tasks: scheduleData, 
                        updated_at: new Date().toISOString() 
                    })
                    .eq('id', existing.id);
            } else {
                // Crear nuevo
                await supabase
                    .from('project_schedules')
                    .insert([{ 
                        project_id: projectId, 
                        tasks: scheduleData 
                    }]);
            }
        } catch (error) {
            console.error('Error syncing schedule:', error);
            // No lanzar error para no interrumpir el guardado del proyecto
        }
    }

    /**
     * Carga un proyecto completo por ID
     * Valida que el proyecto pertenezca al usuario actual
     * @param {string} projectId - ID del proyecto
     * @returns {Promise<Object|null>} - Datos completos del proyecto o null
     * @throws {Error} - Si el proyecto no existe o el usuario no tiene permisos
     */
    static async loadProject(projectId) {
        if (!projectId) {
            throw new Error('ID de proyecto requerido');
        }

        try {
            const fullData = await SupabaseService.getProject(projectId);
            
            if (!fullData) {
                throw new Error('Proyecto no encontrado');
            }

            // Cargar cronograma desde tabla separada si existe
            const { data: schedule } = await supabase
                .from('project_schedules')
                .select('tasks')
                .eq('project_id', projectId)
                .maybeSingle();

            // Priorizar cronograma de tabla separada, sino usar el del JSON
            if (schedule) {
                fullData.scheduleData = schedule.tasks;
            }

            return fullData;
        } catch (error) {
            console.error('Error loading project:', error);
            // Re-lanzar el error para que el componente pueda manejarlo
            throw error;
        }
    }

    /**
     * Lista todos los proyectos (solo metadata)
     * @returns {Promise<Array>} - Lista de proyectos
     */
    static async listProjects() {
        return await SupabaseService.listProjects();
    }

    /**
     * Elimina un proyecto
     * @param {string} projectId - ID del proyecto a eliminar
     */
    static async deleteProject(projectId) {
        if (!projectId) throw new Error('Project ID is required');

        // Eliminar cronograma asociado si existe
        try {
            await supabase
                .from('project_schedules')
                .delete()
                .eq('project_id', projectId);
        } catch (error) {
            console.error('Error deleting schedule:', error);
            // Continuar aunque falle la eliminación del cronograma
        }

        // Eliminar proyecto principal
        await SupabaseService.deleteProject(projectId);
    }

    /**
     * Renombra un proyecto
     * @param {string} projectId - ID del proyecto
     * @param {string} newName - Nuevo nombre
     */
    static async renameProject(projectId, newName) {
        if (!projectId || !newName) {
            throw new Error('Project ID and new name are required');
        }

        await SupabaseService.updateProjectName(projectId, newName);
    }

    /**
     * Carga un proyecto desde URL params
     * Incluye carga de cronograma desde tabla separada
     * @param {string} projectId - ID del proyecto desde URL
     * @returns {Promise<Object|null>} - Datos completos del proyecto
     */
    static async loadProjectFromUrl(projectId) {
        return await this.loadProject(projectId);
    }
}

export default ProjectPersistenceService;

