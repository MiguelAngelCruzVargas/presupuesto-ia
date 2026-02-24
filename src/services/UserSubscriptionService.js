/**
 * UserSubscriptionService
 * Gestiona las suscripciones y tiers de usuarios
 */

import { supabase } from '../lib/supabaseClient';
import { USER_TIER } from './ApiKeyManager';

export class UserSubscriptionService {
    /**
     * Obtiene el tier de un usuario (FREE/PRO/ENTERPRISE)
     * @param {string} userId - ID del usuario
     * @returns {Promise<string>} - Tier del usuario (free/pro/enterprise)
     */
    static async getUserTier(userId) {
        if (!userId) return USER_TIER.FREE;

        try {
            // Usar función de base de datos para obtener tier
            const { data, error } = await supabase.rpc('get_user_tier', {
                p_user_id: userId
            });

            if (error) {
                console.warn('Error obteniendo tier de usuario, usando FREE por defecto:', error);
                return USER_TIER.FREE;
            }

            return data || USER_TIER.FREE;
        } catch (error) {
            console.error('Error en getUserTier:', error);
            return USER_TIER.FREE;
        }
    }

    /**
     * Obtiene la suscripción completa de un usuario
     * @param {string} userId - ID del usuario
     * @returns {Promise<Object|null>} - Información de suscripción o null
     */
    static async getSubscription(userId) {
        if (!userId) return null;

        try {
            const { data, error } = await supabase
                .from('user_subscriptions')
                .select('*')
                .eq('user_id', userId)
                .single();

            if (error && error.code !== 'PGRST116') {
                console.error('Error obteniendo suscripción:', error);
                return null;
            }

            return data;
        } catch (error) {
            console.error('Error en getSubscription:', error);
            return null;
        }
    }

    /**
     * Verifica si un usuario tiene suscripción activa
     * @param {string} userId - ID del usuario
     * @returns {Promise<boolean>} - True si tiene suscripción activa
     */
    static async hasActiveSubscription(userId) {
        const subscription = await this.getSubscription(userId);
        
        if (!subscription) return false;
        if (subscription.status !== 'active' && subscription.status !== 'trial') return false;
        
        // Verificar si está expirada
        if (subscription.expires_at) {
            const expiresAt = new Date(subscription.expires_at);
            if (expiresAt < new Date()) return false;
        }

        return subscription.tier !== USER_TIER.FREE;
    }

    /**
     * Obtiene el tier actual del usuario desde el contexto
     * (Para usar en el frontend cuando ya tienes el usuario)
     * @param {Object} user - Objeto de usuario de Supabase
     * @returns {Promise<string>} - Tier del usuario
     */
    static async getCurrentUserTier(user) {
        if (!user || !user.id) return USER_TIER.FREE;
        return await this.getUserTier(user.id);
    }
}

