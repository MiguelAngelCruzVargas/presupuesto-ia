/**
 * ShareService
 * Servicio para manejar el compartir proyectos con clientes mediante enlaces seguros
 */

import { supabase } from '../lib/supabaseClient';

export class ShareService {
    /**
     * Crear un enlace compartido para un proyecto
     * @param {string} projectId - ID del proyecto
     * @param {Object} options - Opciones de compartir
     * @returns {Promise<Object>} - Información del enlace compartido
     */
    static async createShare(projectId, options = {}) {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                throw new Error('Usuario no autenticado');
            }

            if (!projectId) {
                throw new Error('ID del proyecto es requerido');
            }

            // Verificar que el proyecto existe y pertenece al usuario
            const { data: project, error: projectError } = await supabase
                .from('projects')
                .select('id, user_id')
                .eq('id', projectId)
                .single();

            if (projectError || !project) {
                throw new Error('Proyecto no encontrado');
            }

            if (project.user_id !== user.id) {
                throw new Error('No tienes permisos para compartir este proyecto');
            }

            // Generar token único
            const shareToken = this.generateToken();

            // Generar código corto opcional (verificar unicidad)
            let shareCode = null;
            if (options.includeShortCode) {
                let attempts = 0;
                let codeExists = true;
                while (codeExists && attempts < 10) {
                    shareCode = this.generateShortCode();
                    // Verificar si ya existe - usar consulta sin single() para evitar error si no existe
                    const { data: existing, error: checkError } = await supabase
                        .from('project_shares')
                        .select('id')
                        .eq('share_code', shareCode)
                        .limit(1);
                    
                    // Si hay datos, el código existe
                    codeExists = existing && existing.length > 0;
                    attempts++;
                }
                if (codeExists) {
                    // Si después de 10 intentos no encontramos uno único, no usar código corto
                    shareCode = null;
                }
            }

            // Preparar metadata
            const metadata = options.metadata || {};
            
            const shareData = {
                project_id: projectId,
                share_token: shareToken,
                share_code: shareCode,
                can_edit: options.canEdit || false,
                expires_at: options.expiresAt || null,
                password: options.password || null,
                allowed_emails: options.allowedEmails || null,
                metadata: metadata,
                created_by: user.id
            };

            const { data, error } = await supabase
                .from('project_shares')
                .insert(shareData)
                .select()
                .single();

            if (error) {
                console.error('Error al crear share:', error);
                
                // Si el error es por token duplicado (poco probable pero posible), reintentar
                if (error.code === '23505') {
                    // Reintentar con nuevo token/código
                    shareData.share_token = this.generateToken();
                    if (shareData.share_code) {
                        shareData.share_code = this.generateShortCode();
                    }
                    
                    const { data: retryData, error: retryError } = await supabase
                        .from('project_shares')
                        .insert(shareData)
                        .select()
                        .single();
                    
                    if (retryError) {
                        console.error('Error en reintento:', retryError);
                        throw new Error('Error al crear el enlace compartido. Por favor intenta de nuevo.');
                    }
                    
                    return {
                        ...retryData,
                        shareUrl: `${window.location.origin}/share/${retryData.share_token}`,
                        shortUrl: retryData.share_code ? `${window.location.origin}/s/${retryData.share_code}` : null
                    };
                }
                
                // Otros errores
                if (error.message) {
                    throw new Error(`Error al crear el enlace: ${error.message}`);
                }
                throw new Error('Error desconocido al crear el enlace compartido');
            }

            // Generar URL completa
            const baseUrl = window.location.origin;
            const shareUrl = `${baseUrl}/share/${shareToken}`;

            return {
                ...data,
                shareUrl: shareUrl,
                shortUrl: shareCode ? `${baseUrl}/s/${shareCode}` : null
            };
        } catch (error) {
            console.error('Error creating share:', error);
            throw error;
        }
    }

    /**
     * Obtener información de un enlace compartido por token
     * @param {string} token - Token del enlace compartido
     * @returns {Promise<Object>} - Información del share y proyecto
     */
    static async getShareByToken(token) {
        try {
            if (!token) {
                throw new Error('Token no proporcionado');
            }

            // Buscar por token o código corto - hacer dos consultas separadas para evitar problemas con .or()
            let data = null;

            // Primero intentar buscar por token
            const { data: tokenData, error: tokenError } = await supabase
                .from('project_shares')
                .select(`
                    *,
                    projects (
                        id,
                        name,
                        client,
                        type,
                        created_at,
                        updated_at,
                        data
                    )
                `)
                .eq('share_token', token)
                .single();

            // Si se encuentra por token, usarlo
            if (tokenData && !tokenError) {
                data = tokenData;
            } else {
                // Si no se encuentra por token, buscar por código corto
                const { data: codeData, error: codeError } = await supabase
                    .from('project_shares')
                    .select(`
                        *,
                        projects (
                            id,
                            name,
                            client,
                            type,
                            created_at,
                            updated_at,
                            data
                        )
                    `)
                    .eq('share_code', token)
                    .single();

                if (codeError && codeError.code !== 'PGRST116') { // PGRST116 = no rows found
                    throw codeError;
                }
                if (codeData) {
                    data = codeData;
                }
            }

            if (!data) {
                throw new Error('Enlace no encontrado o inválido');
            }

            // Verificar si ha expirado
            if (data.expires_at && new Date(data.expires_at) < new Date()) {
                throw new Error('Este enlace ha expirado');
            }

            // Incrementar contador de accesos
            await this.recordAccess(data.id);

            return data;
        } catch (error) {
            console.error('Error getting share:', error);
            throw error;
        }
    }

    /**
     * Verificar contraseña del enlace compartido
     * @param {string} token - Token del enlace
     * @param {string} password - Contraseña ingresada
     * @returns {Promise<boolean>} - True si la contraseña es correcta
     */
    static async verifyPassword(token, password) {
        try {
            if (!token) return false;

            // Buscar por token primero
            let data = null;
            const { data: tokenData, error: tokenError } = await supabase
                .from('project_shares')
                .select('password')
                .eq('share_token', token)
                .single();

            if (tokenData) {
                data = tokenData;
            } else {
                // Si no se encuentra por token, buscar por código corto
                const { data: codeData, error: codeError } = await supabase
                    .from('project_shares')
                    .select('password')
                    .eq('share_code', token)
                    .single();

                if (codeError && codeError.code !== 'PGRST116') {
                    return false;
                }
                data = codeData;
            }

            if (!data || !data.password) return false;

            // Comparación simple (en producción debería usar hash)
            return data.password === password;
        } catch (error) {
            console.error('Error verifying password:', error);
            return false;
        }
    }

    /**
     * Registrar acceso al enlace compartido
     * @param {string} shareId - ID del share
     */
    static async recordAccess(shareId, metadata = {}) {
        try {
            // Obtener IP y user agent
            const accessData = {
                share_id: shareId,
                ip_address: metadata.ipAddress || null,
                user_agent: metadata.userAgent || navigator.userAgent,
                metadata: metadata.extra || {}
            };

            await supabase
                .from('project_share_access')
                .insert(accessData);

            // Actualizar contador en project_shares
            // Primero obtener el valor actual
            const { data: currentShare } = await supabase
                .from('project_shares')
                .select('access_count')
                .eq('id', shareId)
                .single();

            const newCount = (currentShare?.access_count || 0) + 1;

            await supabase
                .from('project_shares')
                .update({
                    access_count: newCount,
                    last_accessed_at: new Date().toISOString()
                })
                .eq('id', shareId);
        } catch (error) {
            console.error('Error recording access:', error);
            // No lanzar error, solo registrar
        }
    }

    /**
     * Obtener todos los enlaces compartidos de un proyecto
     * @param {string} projectId - ID del proyecto
     * @returns {Promise<Array>} - Lista de enlaces compartidos
     */
    static async getProjectShares(projectId) {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                throw new Error('Usuario no autenticado');
            }

            const { data, error } = await supabase
                .from('project_shares')
                .select('*')
                .eq('project_id', projectId)
                .order('created_at', { ascending: false });

            if (error) throw error;

            // Generar URLs completas
            const baseUrl = window.location.origin;
            return data.map(share => ({
                ...share,
                shareUrl: `${baseUrl}/share/${share.share_token}`,
                shortUrl: share.share_code ? `${baseUrl}/s/${share.share_code}` : null
            }));
        } catch (error) {
            console.error('Error getting project shares:', error);
            throw error;
        }
    }

    /**
     * Obtener estadísticas de un enlace compartido
     * @param {string} shareId - ID del share
     * @returns {Promise<Object>} - Estadísticas de acceso
     */
    static async getShareStats(shareId) {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                throw new Error('Usuario no autenticado');
            }

            // Obtener información del share
            const { data: share, error: shareError } = await supabase
                .from('project_shares')
                .select('*')
                .eq('id', shareId)
                .single();

            if (shareError) throw shareError;

            // Obtener accesos recientes
            const { data: accesses, error: accessError } = await supabase
                .from('project_share_access')
                .select('*')
                .eq('share_id', shareId)
                .order('accessed_at', { ascending: false })
                .limit(50);

            if (accessError) throw accessError;

            // Calcular estadísticas
            const stats = {
                totalAccesses: share.access_count || 0,
                recentAccesses: accesses || [],
                lastAccessed: share.last_accessed_at,
                createdAt: share.created_at,
                expiresAt: share.expires_at,
                isExpired: share.expires_at ? new Date(share.expires_at) < new Date() : false
            };

            return stats;
        } catch (error) {
            console.error('Error getting share stats:', error);
            throw error;
        }
    }

    /**
     * Eliminar un enlace compartido
     * @param {string} shareId - ID del share
     */
    static async deleteShare(shareId) {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                throw new Error('Usuario no autenticado');
            }

            const { error } = await supabase
                .from('project_shares')
                .delete()
                .eq('id', shareId);

            if (error) throw error;

            return true;
        } catch (error) {
            console.error('Error deleting share:', error);
            throw error;
        }
    }

    /**
     * Actualizar configuración de un enlace compartido
     * @param {string} shareId - ID del share
     * @param {Object} updates - Campos a actualizar
     */
    static async updateShare(shareId, updates) {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                throw new Error('Usuario no autenticado');
            }

            const { data, error } = await supabase
                .from('project_shares')
                .update(updates)
                .eq('id', shareId)
                .select()
                .single();

            if (error) throw error;

            return data;
        } catch (error) {
            console.error('Error updating share:', error);
            throw error;
        }
    }

    /**
     * Generar token único
     */
    static generateToken() {
        const array = new Uint8Array(32);
        crypto.getRandomValues(array);
        return btoa(String.fromCharCode.apply(null, array))
            .replace(/\+/g, '-')
            .replace(/\//g, '_')
            .replace(/=+$/, '');
    }

    /**
     * Generar código corto único (6 caracteres)
     */
    static generateShortCode() {
        const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Sin caracteres confusos
        let code = '';
        for (let i = 0; i < 6; i++) {
            code += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return code;
    }
}

