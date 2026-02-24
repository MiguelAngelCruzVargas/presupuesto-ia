/**
 * BitacoraService
 * Servicio centralizado para gestión de bitácora de obra
 * Maneja logs, notas, avances y evidencias fotográficas
 */

import { supabase } from '../lib/supabaseClient';

export class BitacoraService {
    /**
     * Carga todos los logs de un proyecto
     * @param {string} projectId - ID del proyecto
     * @returns {Promise<Array>} - Array de logs ordenados por fecha
     */
    static async loadLogs(projectId) {
        if (!projectId) {
            throw new Error('Project ID is required');
        }

        try {
            const { data, error } = await supabase
                .from('site_logs')
                .select('*')
                .eq('project_id', projectId)
                .order('log_date', { ascending: false });

            if (error) throw error;
            return data || [];
        } catch (error) {
            console.error('Error loading logs:', error);
            throw error;
        }
    }

    /**
     * Carga el cronograma de un proyecto
     * @param {string} projectId - ID del proyecto
     * @returns {Promise<Object|null>} - Cronograma o null
     */
    static async loadSchedule(projectId) {
        if (!projectId) {
            throw new Error('Project ID is required');
        }

        try {
            const { data, error } = await supabase
                .from('project_schedules')
                .select('*')
                .eq('project_id', projectId)
                .maybeSingle();

            if (error && error.code !== 'PGRST116') throw error;
            return data || null;
        } catch (error) {
            console.error('Error loading schedule:', error);
            throw error;
        }
    }

    /**
     * Obtiene el siguiente número de folio para un proyecto
     * @param {string} projectId - ID del proyecto
     * @returns {Promise<number>} - Siguiente número de folio
     */
    static async getNextNoteNumber(projectId) {
        if (!projectId) {
            throw new Error('Project ID is required');
        }

        try {
            const { count, error } = await supabase
                .from('site_logs')
                .select('*', { count: 'exact', head: true })
                .eq('project_id', projectId);

            if (error) throw error;
            return (count || 0) + 1;
        } catch (error) {
            console.error('Error getting next note number:', error);
            throw error;
        }
    }

    /**
     * Crea una nueva nota de bitácora
     * @param {Object} logData - Datos de la nota
     * @returns {Promise<Object>} - Nota creada
     */
    static async createLog(logData) {
        const {
            projectId,
            taskId,
            content,
            progressPercentage = 0,
            photos = [],
            subject,
            classification = 'Informe',
            authorRole = 'Residente',
            status = 'Abierta',
            noteNumber = null,
            logDate = null, // Fecha opcional del log (para reportes fotográficos)
            authorName = null, // Para entradas de diario
            authorSignature = null, // Para entradas de diario
            isDiaryEntry = false, // Flag para identificar entradas de diario
            metadata = null // Metadata adicional (clima, materiales, personal, observaciones)
        } = logData;

        if (!projectId || !taskId) {
            throw new Error('Project ID and Task ID are required');
        }

        if (!subject || !subject.trim()) {
            throw new Error('Subject is required');
        }

        try {
            // Obtener número de folio si no se proporciona
            const finalNoteNumber = noteNumber || await this.getNextNoteNumber(projectId);

            // Para entradas de diario, guardar metadata en el content con formato especial
            let finalContent = content || '';
            if (isDiaryEntry && (authorName || authorSignature)) {
                const diaryMetadata = {
                    authorName: authorName || '',
                    authorSignature: authorSignature || '',
                    isDiaryEntry: true
                };
                // Guardar metadata al final del content con un separador especial
                finalContent = content + '\n\n<!--DIARY_METADATA:' + JSON.stringify(diaryMetadata) + '-->';
            } else if (metadata && Object.keys(metadata).length > 0) {
                // Para bitácora normal, guardar metadata (clima, materiales, personal, observaciones)
                finalContent = content + '\n\n<!--BITACORA_METADATA:' + JSON.stringify(metadata) + '-->';
            }

            const { data, error } = await supabase
                .from('site_logs')
                .insert([{
                    project_id: projectId,
                    task_id: taskId,
                    content: finalContent,
                    progress_percentage: progressPercentage,
                    photos: Array.isArray(photos) ? photos : [photos].filter(Boolean),
                    log_date: logDate || new Date().toISOString(), // Usar fecha proporcionada o actual
                    note_number: finalNoteNumber,
                    classification,
                    author_role: authorRole,
                    status,
                    subject: subject.trim()
                }])
                .select()
                .single();

            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Error creating log:', error);
            throw error;
        }
    }

    /**
     * Actualiza una nota existente
     * @param {string} logId - ID de la nota
     * @param {Object} updates - Campos a actualizar
     * @returns {Promise<Object>} - Nota actualizada
     */
    static async updateLog(logId, updates) {
        if (!logId) {
            throw new Error('Log ID is required');
        }

        try {
            const updateData = {};
            
            // Manejar contenido con metadata de diario o bitácora
            if (updates.content !== undefined) {
                let finalContent = updates.content;
                if (updates.isDiaryEntry && (updates.authorName || updates.authorSignature)) {
                    const diaryMetadata = {
                        authorName: updates.authorName || '',
                        authorSignature: updates.authorSignature || '',
                        isDiaryEntry: true
                    };
                    // Remover metadata anterior si existe
                    finalContent = finalContent.replace(/\n\n<!--DIARY_METADATA:.*?-->/, '');
                    // Agregar nueva metadata
                    finalContent = finalContent + '\n\n<!--DIARY_METADATA:' + JSON.stringify(diaryMetadata) + '-->';
                } else if (updates.metadata && Object.keys(updates.metadata).length > 0) {
                    // Para bitácora normal, guardar metadata
                    finalContent = finalContent.replace(/\n\n<!--BITACORA_METADATA:.*?-->/, '');
                    finalContent = finalContent + '\n\n<!--BITACORA_METADATA:' + JSON.stringify(updates.metadata) + '-->';
                }
                updateData.content = finalContent;
            }
            if (updates.progressPercentage !== undefined) updateData.progress_percentage = updates.progressPercentage;
            if (updates.photos !== undefined) updateData.photos = Array.isArray(updates.photos) ? updates.photos : [updates.photos].filter(Boolean);
            if (updates.subject !== undefined) updateData.subject = updates.subject;
            if (updates.classification !== undefined) updateData.classification = updates.classification;
            if (updates.authorRole !== undefined) updateData.author_role = updates.authorRole;
            if (updates.status !== undefined) updateData.status = updates.status;
            if (updates.logDate !== undefined) updateData.log_date = updates.logDate;

            const { data, error } = await supabase
                .from('site_logs')
                .update(updateData)
                .eq('id', logId)
                .select()
                .single();

            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Error updating log:', error);
            throw error;
        }
    }

    /**
     * Elimina una nota
     * @param {string} logId - ID de la nota
     */
    static async deleteLog(logId) {
        if (!logId) {
            throw new Error('Log ID is required');
        }

        try {
            const { error } = await supabase
                .from('site_logs')
                .delete()
                .eq('id', logId);

            if (error) throw error;
        } catch (error) {
            console.error('Error deleting log:', error);
            throw error;
        }
    }

    /**
     * Obtiene los logs de una tarea específica
     * @param {string} projectId - ID del proyecto
     * @param {string} taskId - ID de la tarea
     * @returns {Promise<Array>} - Logs de la tarea
     */
    static async getTaskLogs(projectId, taskId) {
        if (!projectId || !taskId) {
            throw new Error('Project ID and Task ID are required');
        }

        try {
            const { data, error } = await supabase
                .from('site_logs')
                .select('*')
                .eq('project_id', projectId)
                .eq('task_id', taskId)
                .order('log_date', { ascending: false });

            if (error) throw error;
            return data || [];
        } catch (error) {
            console.error('Error getting task logs:', error);
            throw error;
        }
    }

    /**
     * Calcula el avance de una tarea basado en sus logs
     * @param {string} projectId - ID del proyecto
     * @param {string} taskId - ID de la tarea
     * @returns {Promise<number>} - Porcentaje de avance (0-100)
     */
    static async getTaskProgress(projectId, taskId) {
        const logs = await this.getTaskLogs(projectId, taskId);
        if (logs.length === 0) return 0;
        
        // Retornar el avance más reciente
        return logs[0].progress_percentage || 0;
    }

    /**
     * Obtiene estadísticas de la bitácora
     * @param {string} projectId - ID del proyecto
     * @returns {Promise<Object>} - Estadísticas
     */
    static async getStatistics(projectId) {
        if (!projectId) {
            throw new Error('Project ID is required');
        }

        try {
            const logs = await this.loadLogs(projectId);

            const stats = {
                totalLogs: logs.length,
                openLogs: logs.filter(l => l.status === 'Abierta').length,
                closedLogs: logs.filter(l => l.status === 'Cerrada').length,
                byClassification: {},
                byAuthorRole: {},
                totalPhotos: 0,
                averageProgress: 0
            };

            let totalProgress = 0;
            logs.forEach(log => {
                // Por clasificación
                stats.byClassification[log.classification] = 
                    (stats.byClassification[log.classification] || 0) + 1;

                // Por rol de autor
                stats.byAuthorRole[log.author_role] = 
                    (stats.byAuthorRole[log.author_role] || 0) + 1;

                // Fotos
                if (log.photos && Array.isArray(log.photos)) {
                    stats.totalPhotos += log.photos.length;
                }

                // Progreso
                totalProgress += log.progress_percentage || 0;
            });

            stats.averageProgress = logs.length > 0 
                ? Math.round(totalProgress / logs.length) 
                : 0;

            return stats;
        } catch (error) {
            console.error('Error getting statistics:', error);
            throw error;
        }
    }

    /**
     * Valida datos de una nota antes de guardar
     * @param {Object} logData - Datos a validar
     * @returns {Object} - { valid: boolean, errors: Array<string> }
     */
    static validateLogData(logData) {
        const errors = [];

        if (!logData.projectId) errors.push('Project ID is required');
        if (!logData.taskId) errors.push('Task ID is required');
        if (!logData.subject || !logData.subject.trim()) {
            errors.push('Subject is required');
        }

        if (logData.progressPercentage !== undefined) {
            const progress = parseInt(logData.progressPercentage);
            if (isNaN(progress) || progress < 0 || progress > 100) {
                errors.push('Progress must be between 0 and 100');
            }
        }

        const validClassifications = ['Apertura', 'Orden', 'Solicitud', 'Autorización', 'Informe', 'Cierre', 'Otro'];
        if (logData.classification && !validClassifications.includes(logData.classification)) {
            errors.push(`Classification must be one of: ${validClassifications.join(', ')}`);
        }

        const validAuthorRoles = ['Supervisor', 'Residente', 'Superintendente', 'Otro'];
        if (logData.authorRole && !validAuthorRoles.includes(logData.authorRole)) {
            errors.push(`Author role must be one of: ${validAuthorRoles.join(', ')}`);
        }

        const validStatuses = ['Abierta', 'Cerrada'];
        if (logData.status && !validStatuses.includes(logData.status)) {
            errors.push(`Status must be one of: ${validStatuses.join(', ')}`);
        }

        return {
            valid: errors.length === 0,
            errors
        };
    }

    /**
     * Extrae los metadatos de una entrada de diario del content
     * @param {string} content - Contenido de la entrada
     * @returns {Object|null} - Metadatos del diario o null
     */
    static extractDiaryMetadata(content) {
        if (!content) return null;
        
        const metadataMatch = content.match(/<!--DIARY_METADATA:(.*?)-->/);
        if (metadataMatch) {
            try {
                return JSON.parse(metadataMatch[1]);
            } catch (e) {
                console.error('Error parsing diary metadata:', e);
                return null;
            }
        }
        return null;
    }

    /**
     * Extrae metadata de bitácora del contenido
     * @param {string} content - Contenido con metadata
     * @returns {object|null} - Metadata extraída o null
     */
    static extractBitacoraMetadata(content) {
        if (!content) return null;
        const metadataMatch = content.match(/<!--BITACORA_METADATA:(.*?)-->/);
        if (metadataMatch) {
            try {
                return JSON.parse(metadataMatch[1]);
            } catch (e) {
                console.error('Error parsing bitacora metadata:', e);
                return null;
            }
        }
        return null;
    }

    /**
     * Obtiene el contenido limpio sin metadata
     * @param {string} content - Contenido con metadata
     * @returns {string} - Contenido limpio
     */
    static getCleanContent(content) {
        if (!content) return '';
        return content.replace(/\n\n<!--DIARY_METADATA:.*?-->/, '').replace(/\n\n<!--BITACORA_METADATA:.*?-->/, '').trim();
    }

    /**
     * Verifica si un log es una entrada de diario
     * @param {Object} log - Log a verificar
     * @returns {boolean} - True si es entrada de diario
     */
    static isDiaryEntry(log) {
        if (!log) return false;
        // Verificar por task_id o por metadata en content
        if (log.task_id === 'diary') return true;
        if (log.content && this.extractDiaryMetadata(log.content)) return true;
        return false;
    }
}

export default BitacoraService;

