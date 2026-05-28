/**
 * ProjectPersistenceService
 * Servicio centralizado para persistencia de proyectos
 * Maneja guardado, carga, eliminación y sincronización con Supabase
 */

import SupabaseService from './SupabaseService';
import StorageService from './StorageService';
import { supabase } from '../lib/supabaseClient';
import { APP_CONFIG, createDefaultProjectInfo, getTodayString } from '../config/appConfig';

export class ProjectPersistenceService {
    static PROJECT_SCHEMA_VERSION = 2;

    static getTodayString() {
        return getTodayString();
    }

    static buildBudgetSignature(items = [], projectInfo = {}) {
        const compactItems = (items || []).map(item => ({
            d: String(item.description || '').trim().toLowerCase(),
            q: Number(item.quantity) || 0,
            u: String(item.unit || '').trim().toLowerCase(),
            p: Number(item.unitPrice) || 0,
            c: String(item.category || '').trim().toLowerCase()
        }));

        return JSON.stringify({
            project: String(projectInfo.project || '').trim().toLowerCase(),
            client: String(projectInfo.client || '').trim().toLowerCase(),
            type: String(projectInfo.type || 'general').trim().toLowerCase(),
            location: String(projectInfo.location || APP_CONFIG.defaultCountry).trim().toLowerCase(),
            items: compactItems
        });
    }

    static buildModuleStatus(projectData = {}) {
        const items = Array.isArray(projectData.items) ? projectData.items : [];
        const projectInfo = projectData.projectInfo || {};
        const budgetSignature = this.buildBudgetSignature(items, projectInfo);
        const scheduleData = this.normalizeScheduleData(projectData.scheduleData, projectInfo.date);
        const technicalDescriptionMeta = projectData.technicalDescriptionMeta || {};

        const scheduleHasContent = (scheduleData.phases?.length || 0) > 0 || (scheduleData.tasks?.length || 0) > 0;
        const scheduleSourceSignature = scheduleData.sourceSignature || null;
        const scheduleIsStale = Boolean(scheduleHasContent && scheduleSourceSignature && scheduleSourceSignature !== budgetSignature);

        const descriptionHasContent = Boolean(projectData.technicalDescription && String(projectData.technicalDescription).trim());
        const descriptionSourceSignature = technicalDescriptionMeta.sourceSignature || null;
        const descriptionIsStale = Boolean(descriptionHasContent && descriptionSourceSignature && descriptionSourceSignature !== budgetSignature);

        return {
            budgetSignature,
            modules: {
                schedule: {
                    initialized: true,
                    hasContent: scheduleHasContent,
                    isStale: scheduleIsStale,
                    generatedAt: scheduleData.generatedAt || null,
                    generationMode: scheduleData.generationMode || null,
                    sourceSignature: scheduleSourceSignature
                },
                technicalDescription: {
                    initialized: true,
                    hasContent: descriptionHasContent,
                    isStale: descriptionIsStale,
                    generatedAt: technicalDescriptionMeta.generatedAt || null,
                    generationMode: technicalDescriptionMeta.generationMode || null,
                    sourceSignature: descriptionSourceSignature
                }
            }
        };
    }

    static buildProjectMeta(projectData = {}) {
        const now = new Date().toISOString();
        const derivedStatus = this.buildModuleStatus(projectData);
        const previousMeta = projectData.projectMeta || {};
        const previousVersion = Number(previousMeta.version || 0);

        return {
            schemaVersion: this.PROJECT_SCHEMA_VERSION,
            version: previousVersion + 1,
            savedAt: now,
            lastBudgetSignature: derivedStatus.budgetSignature,
            stats: {
                itemsCount: Array.isArray(projectData.items) ? projectData.items.length : 0
            },
            modules: derivedStatus.modules
        };
    }

    static createEmptySchedule(baseDate = null) {
        const normalizedDate = baseDate || this.getTodayString();
        return {
            phases: [],
            tasks: [],
            totalDurationWeeks: 0,
            startDate: normalizedDate,
            endDate: normalizedDate,
            notes: '',
            status: 'draft',
            isInitialized: true
        };
    }

    static normalizeScheduleData(scheduleData = null, baseDate = null) {
        const empty = this.createEmptySchedule(baseDate);
        if (!scheduleData) return empty;

        const normalized = {
            ...empty,
            ...scheduleData
        };

        const phases = Array.isArray(normalized.phases) ? normalized.phases : [];
        let tasks = Array.isArray(normalized.tasks) ? normalized.tasks : [];

        let rebuiltPhases = phases;

        if (rebuiltPhases.length === 0 && tasks.length > 0) {
            const grouped = new Map();

            tasks.forEach((task, index) => {
                const phaseName = task.phaseName || task.name || `Fase ${index + 1}`;
                if (!grouped.has(phaseName)) {
                    grouped.set(phaseName, []);
                }
                grouped.get(phaseName).push(task);
            });

            rebuiltPhases = Array.from(grouped.entries()).map(([phaseName, phaseTasks], index) => {
                const startWeek = Math.min(...phaseTasks.map(task => Number(task.startWeek) || index + 1));
                const endWeek = Math.max(...phaseTasks.map(task => Number(task.endWeek) || startWeek));
                return {
                    id: phaseTasks[0]?.id || `phase-${index + 1}`,
                    name: phaseName,
                    startWeek,
                    endWeek,
                    durationWeeks: Math.max(1, endWeek - startWeek + 1),
                    items: phaseTasks.map(task => task.name).filter(Boolean),
                    resources: phaseTasks[0]?.resources || [],
                    risks: phaseTasks[0]?.risks || [],
                    notes: phaseTasks[0]?.notes || '',
                    isCritical: phaseTasks.some(task => task.isCritical),
                    startDate: phaseTasks[0]?.startDate || null,
                    endDate: phaseTasks[0]?.endDate || null
                };
            });
        }

        if (tasks.length === 0 && rebuiltPhases.length > 0) {
            tasks = rebuiltPhases.flatMap((phase, phaseIndex) =>
                (phase.items || []).map((itemName, itemIndex) => ({
                    id: `${phase.id || `phase-${phaseIndex + 1}`}-task-${itemIndex + 1}`,
                    name: itemName,
                    phaseName: phase.name,
                    startWeek: phase.startWeek,
                    endWeek: phase.endWeek,
                    durationWeeks: Math.max(1, phase.durationWeeks || (phase.endWeek - phase.startWeek + 1) || 1),
                    isCritical: !!phase.isCritical,
                    notes: phase.notes || '',
                    order: itemIndex + 1
                }))
            );
        }

        const totalDurationWeeks = rebuiltPhases.length > 0
            ? Math.max(...rebuiltPhases.map(phase => Number(phase.endWeek) || 0))
            : normalized.totalDurationWeeks || 0;

        return {
            ...normalized,
            phases: rebuiltPhases,
            tasks,
            totalDurationWeeks,
            startDate: normalized.startDate || baseDate || this.getTodayString(),
            endDate: normalized.endDate || normalized.startDate || baseDate || this.getTodayString()
        };
    }

    static ensureProjectStructure(projectData = {}) {
        const normalizedDate = projectData.projectInfo?.date || this.getTodayString();
        const normalizedProjectInfo = createDefaultProjectInfo({
            id: projectData.id || projectData.projectInfo?.id,
            project: 'Proyecto sin nombre',
            date: normalizedDate,
            ...projectData.projectInfo
        });

        const scheduleData = this.normalizeScheduleData(projectData.scheduleData, normalizedDate);
        const phasesCount = Array.isArray(scheduleData?.phases) ? scheduleData.phases.length : 0;
        const tasksCount = Array.isArray(scheduleData?.tasks) ? scheduleData.tasks.length : 0;
        const derivedStatus = this.buildModuleStatus({
            ...projectData,
            projectInfo: normalizedProjectInfo,
            scheduleData
        });

        return {
            ...projectData,
            id: projectData.id || normalizedProjectInfo.id,
            projectInfo: normalizedProjectInfo,
            scheduleData,
            technicalDescriptionMeta: projectData.technicalDescriptionMeta || null,
            projectMeta: {
                schemaVersion: projectData.projectMeta?.schemaVersion || this.PROJECT_SCHEMA_VERSION,
                version: projectData.projectMeta?.version || 1,
                savedAt: projectData.projectMeta?.savedAt || projectData.lastModified || null,
                lastBudgetSignature: projectData.projectMeta?.lastBudgetSignature || derivedStatus.budgetSignature,
                stats: {
                    itemsCount: projectData.projectMeta?.stats?.itemsCount ?? (projectData.items?.length || 0)
                },
                modules: {
                    schedule: {
                        initialized: true,
                        hasContent: phasesCount > 0 || tasksCount > 0,
                        ...projectData.projectMeta?.modules?.schedule,
                        ...derivedStatus.modules.schedule
                    },
                    technicalDescription: {
                        initialized: true,
                        hasContent: Boolean(projectData.technicalDescription && String(projectData.technicalDescription).trim()),
                        ...projectData.projectMeta?.modules?.technicalDescription,
                        ...derivedStatus.modules.technicalDescription
                    }
                }
            },
            projectModules: {
                bitacora: {
                    initialized: true,
                    totalLogs: projectData.projectModules?.bitacora?.totalLogs || 0
                },
                photographicReport: {
                    initialized: true,
                    totalReports: projectData.projectModules?.photographicReport?.totalReports || 0
                },
                schedule: {
                    initialized: true,
                    hasContent: phasesCount > 0 || tasksCount > 0
                },
                ...projectData.projectModules
            }
        };
    }

    static buildLocalProjectData(projectData) {
        const normalizedProject = this.ensureProjectStructure(projectData);
        return {
            ...normalizedProject,
            id: normalizedProject.id || normalizedProject.projectInfo?.id
        };
    }

    static isRecoverableRemoteError(error) {
        if (!error) return false;
        if (error.isOfflineCapable || error.isCloudUnavailable) return true;

        const message = (error.message || '').toLowerCase();
        return (
            message.includes('failed to fetch') ||
            message.includes('network') ||
            message.includes('web server is down') ||
            message.includes('error code 521') ||
            message.includes('cloudflare')
        );
    }

    /**
     * Guarda un proyecto completo con sincronización de cronograma
     * @param {Object} projectData - Datos completos del proyecto
     * @returns {Promise<Object>} - Proyecto guardado con ID actualizado
     */
    static async saveProject(projectData) {
        const normalizedProjectData = this.ensureProjectStructure(projectData);
        // Validar que tenga nombre
        if (!normalizedProjectData.projectInfo?.project) {
            throw new Error('El proyecto debe tener un nombre');
        }
        const projectToSave = {
            ...normalizedProjectData,
            projectMeta: this.buildProjectMeta(normalizedProjectData)
        };
        if (import.meta.env?.DEV) {
            console.debug('[Reporte] ProjectPersistence.saveProject - id:', projectToSave?.id, 'projectInfo:', {
                project: projectToSave.projectInfo?.project,
                contractor: projectToSave.projectInfo?.contractor,
                concepts: projectToSave.projectInfo?.concepts,
                ubicacion: projectToSave.projectInfo?.ubicacion,
                lastReportDate: projectToSave.projectInfo?.lastReportDate,
            })
        }
        let saved;
        let savedLocally = false;

        try {
            // Guardar proyecto principal
            saved = await SupabaseService.saveProject(projectToSave);
            if (import.meta.env?.DEV) console.debug('[Reporte] ProjectPersistence.saveProject - resultado OK, id:', saved?.id)
        } catch (error) {
            if (!this.isRecoverableRemoteError(error)) {
                throw error;
            }

            console.warn('[Offline] saveProject fallback a almacenamiento local:', error);
            saved = StorageService.saveProject(this.buildLocalProjectData(projectToSave));
            savedLocally = true;
        }

        // Sincronizar cronograma si existe
        if (projectToSave.scheduleData && saved.id && !savedLocally) {
            await this.syncSchedule(saved.id, projectToSave.scheduleData);
        }

        return this.ensureProjectStructure({
            ...projectToSave,
            ...saved,
            id: saved.id || projectToSave.id
        });
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
            if (import.meta.env?.DEV && fullData?.projectInfo) {
                console.debug('[Reporte] ProjectPersistence.loadProject - projectId:', projectId, 'projectInfo leído:', {
                    project: fullData.projectInfo?.project,
                    contractor: fullData.projectInfo?.contractor,
                    concepts: fullData.projectInfo?.concepts,
                    ubicacion: fullData.projectInfo?.ubicacion,
                    lastReportDate: fullData.projectInfo?.lastReportDate,
                })
            }
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
                fullData.scheduleData = this.normalizeScheduleData(schedule.tasks, fullData.projectInfo?.date);
            }

            return this.ensureProjectStructure(fullData);
        } catch (error) {
            if (this.isRecoverableRemoteError(error) || error.message === 'No autenticado') {
                const localProject = StorageService.getProject(projectId);
                if (localProject) {
                    console.warn('[Offline] loadProject usando almacenamiento local:', projectId);
                    return this.ensureProjectStructure(localProject);
                }
            }
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
        const remoteProjects = await SupabaseService.listProjects();
        const localProjects = StorageService.listProjects();

        if (!remoteProjects.length) {
            return localProjects;
        }

        const mergedProjects = new Map();

        [...localProjects, ...remoteProjects].forEach(project => {
            const existing = mergedProjects.get(project.id);
            if (!existing) {
                mergedProjects.set(project.id, project);
                return;
            }

            const existingDate = new Date(existing.lastModified || 0).getTime();
            const currentDate = new Date(project.lastModified || 0).getTime();
            if (currentDate >= existingDate) {
                mergedProjects.set(project.id, project);
            }
        });

        return Array.from(mergedProjects.values())
            .sort((a, b) => new Date(b.lastModified || 0) - new Date(a.lastModified || 0));
    }

    /**
     * Elimina un proyecto
     * @param {string} projectId - ID del proyecto a eliminar
     */
    static async deleteProject(projectId) {
        if (!projectId) throw new Error('Project ID is required');

        StorageService.deleteProject(projectId);

        // 1. Eliminar logs de bitácora
        try {
            await supabase
                .from('site_logs')
                .delete()
                .eq('project_id', projectId);
        } catch (error) {
            console.error('Error deleting logs:', error);
        }

        // 2. Eliminar cronograma asociado
        try {
            await supabase
                .from('project_schedules')
                .delete()
                .eq('project_id', projectId);
        } catch (error) {
            console.error('Error deleting schedule:', error);
        }

        // 3. Eliminar proyecto principal
        try {
            await SupabaseService.deleteProject(projectId);
        } catch (error) {
            if (!this.isRecoverableRemoteError(error)) {
                throw error;
            }
            console.warn('[Offline] deleteProject completado solo en local:', projectId);
        }
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

        StorageService.updateProjectName(projectId, newName);

        try {
            await SupabaseService.updateProjectName(projectId, newName);
        } catch (error) {
            if (!this.isRecoverableRemoteError(error)) {
                throw error;
            }
            console.warn('[Offline] renameProject aplicado solo en local:', projectId);
        }
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

