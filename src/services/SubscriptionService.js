import { supabase } from '../lib/supabaseClient';
import { systemSettingsService } from './SystemSettingsService';

/**
 * Servicio para manejar planes y límites de usuarios
 */
export class SubscriptionService {
    // Emails con acceso Pro permanente (administradores/desarrolladores)
    static PRO_EMAILS = [
        'isc20350265@gmail.com'
    ];

    // Definición de planes
    static PLANS = {
        FREE: {
            id: 'free',
            name: 'Gratis',
            price: 0,
            limits: {
                budgets: 1,              // 1 presupuesto
                aiGenerations: 3,        // 3 usos de IA
                aiDescriptions: 5,       // 5 descripciones con IA
                aiPriceSuggestions: 10,  // 10 sugerencias de precio
                bitacoraEntries: 1,      // 1 bitácora
                photoReports: 1,         // 1 reporte fotográfico
                pdfExports: 5,           // 5 exportaciones PDF
                catalogItems: 50         // 50 items en catálogo
            }
        },
        PRO: {
            id: 'pro',
            name: 'Pro',
            price: 299, // MXN por mes
            limits: {
                budgets: -1,             // Ilimitado
                aiGenerations: -1,       // Ilimitado
                aiDescriptions: -1,      // Ilimitado
                aiPriceSuggestions: -1,  // Ilimitado
                bitacoraEntries: -1,     // Ilimitado
                photoReports: -1,       // Ilimitado
                pdfExports: -1,         // Ilimitado
                catalogItems: -1         // Ilimitado
            }
        }
    };

    /**
     * Obtener datos completos de precios y planes (para el modal)
     */
    static async getPricingData() {
        // Asegurar que tenemos settings cargados
        const settings = await systemSettingsService.getAllSettings();

        return {
            pro: {
                price: parseFloat(settings.plan_pro_price),
                description: settings.plan_pro_description,
                features: settings.plan_pro_features
            },
            free: {
                price: 0,
                description: settings.plan_free_description,
                features: settings.plan_free_features
            },
            bankDetails: settings.bank_details
        };
    };

    /**
     * Obtener el plan del usuario
     */
    /**
     * Verificar si un email tiene acceso Pro permanente
     */
    static isProEmail(email) {
        if (!email) return false;
        return this.PRO_EMAILS.includes(email.toLowerCase());
    }

    static async getUserPlan(userId) {
        try {
            // Obtener configuración dinámica
            const settings = await systemSettingsService.getAllSettings();
            const proPrice = settings.plan_pro_price || this.PLANS.PRO.price;
            const proLimits = settings.plan_pro_limits || {};

            // Preparar objeto de Plan Pro Dinámico
            const dynamicProPlan = {
                ...this.PLANS.PRO,
                price: proPrice,
                limits: {
                    ...this.PLANS.PRO.limits,
                    ...proLimits
                }
            };

            // Primero verificar si el usuario tiene un email Pro
            const { data: userData } = await supabase.auth.getUser();
            if (userData?.user?.email && this.isProEmail(userData.user.email)) {
                return dynamicProPlan;
            }

            const { data, error } = await supabase
                .from('user_subscriptions')
                .select('*')
                .eq('user_id', userId)
                .maybeSingle();

            if (error) {
                console.error('Error getting user plan:', error);
                // Si hay error pero el email es Pro, devolver Pro
                if (userData?.user?.email && this.isProEmail(userData.user.email)) {
                    return dynamicProPlan;
                }
                return this.PLANS.FREE;
            }

            if (!data) {
                // Usuario nuevo, verificar si es email Pro
                if (userData?.user?.email && this.isProEmail(userData.user.email)) {
                    return dynamicProPlan;
                }
                // Asignar plan gratuito
                await this.setUserPlan(userId, 'free');
                return this.PLANS.FREE;
            }

            // Verificar si la suscripción está activa
            if (data.plan === 'pro') {
                const now = new Date();
                const expiresAt = new Date(data.expires_at);

                if (expiresAt < now) {
                    // Verificar si es email Pro antes de degradar
                    if (userData?.user?.email && this.isProEmail(userData.user.email)) {
                        return dynamicProPlan;
                    }
                    // Suscripción expirada, cambiar a free
                    await this.setUserPlan(userId, 'free');
                    return this.PLANS.FREE;
                }
                // Retornar Pro dinámico si coincide
                return dynamicProPlan;
            }

            return this.PLANS[data.plan.toUpperCase()] || this.PLANS.FREE;
        } catch (error) {
            console.error('Error getting user plan:', error);
            // Intentar verificar email Pro incluso en caso de error
            try {
                const { data: userData } = await supabase.auth.getUser();
                if (userData?.user?.email && this.isProEmail(userData.user.email)) {
                    // Volver a calcular dinámico por si acaso (aunque debería estar en scope)
                    const settings = await systemSettingsService.getAllSettings();
                    return {
                        ...this.PLANS.PRO,
                        price: settings.plan_pro_price || this.PLANS.PRO.price,
                        limits: { ...this.PLANS.PRO.limits, ...(settings.plan_pro_limits || {}) }
                    };
                }
            } catch (e) {
                // Ignorar error secundario
            }
            return this.PLANS.FREE;
        }
    }

    /**
     * Establecer el plan del usuario
     */
    static async setUserPlan(userId, planId, expiresAt = null) {
        try {
            const planData = {
                user_id: userId,
                plan: planId,
                expires_at: expiresAt || (planId === 'pro' ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() : null),
                updated_at: new Date().toISOString()
            };

            const { error } = await supabase
                .from('user_subscriptions')
                .upsert(planData, { onConflict: 'user_id' });

            if (error) throw error;
            return true;
        } catch (error) {
            console.error('Error setting user plan:', error);
            return false;
        }
    }

    /**
     * Obtener el uso actual del usuario
     */
    static async getUserUsage(userId) {
        try {
            const { data, error } = await supabase
                .from('user_usage')
                .select('*')
                .eq('user_id', userId)
                .maybeSingle();

            if (error) {
                console.error('Error getting user usage:', error);
                return this.getDefaultUsage();
            }

            if (!data) {
                // Crear registro de uso inicial
                const defaultUsage = this.getDefaultUsage();
                await this.initializeUserUsage(userId);
                return defaultUsage;
            }

            // Resetear contadores mensuales si es nuevo mes
            const lastReset = new Date(data.last_reset);
            const now = new Date();
            if (now.getMonth() !== lastReset.getMonth() || now.getFullYear() !== lastReset.getFullYear()) {
                await this.resetMonthlyUsage(userId);
                return this.getDefaultUsage();
            }

            return {
                budgets_created: data.budgets_created || 0,
                ai_generations: data.ai_generations || 0,
                ai_descriptions: data.ai_descriptions || 0,
                ai_price_suggestions: data.ai_price_suggestions || 0,
                bitacora_entries: data.bitacora_entries || 0,
                photo_reports: data.photo_reports || 0,
                pdf_exports: data.pdf_exports || 0,
                catalog_items: data.catalog_items || 0
            };
        } catch (error) {
            console.error('Error getting user usage:', error);
            return this.getDefaultUsage();
        }
    }

    /**
     * Inicializar uso del usuario
     */
    static async initializeUserUsage(userId) {
        try {
            const { error } = await supabase
                .from('user_usage')
                .insert({
                    user_id: userId,
                    last_reset: new Date().toISOString()
                });

            if (error) throw error;
        } catch (error) {
            console.error('Error initializing user usage:', error);
        }
    }

    /**
     * Resetear uso mensual
     */
    static async resetMonthlyUsage(userId) {
        try {
            const { error } = await supabase
                .from('user_usage')
                .update({
                    budgets_created: 0,
                    ai_generations: 0,
                    ai_descriptions: 0,
                    ai_price_suggestions: 0,
                    bitacora_entries: 0,
                    photo_reports: 0,
                    pdf_exports: 0,
                    catalog_items: 0,
                    last_reset: new Date().toISOString()
                })
                .eq('user_id', userId);

            if (error) throw error;
        } catch (error) {
            console.error('Error resetting monthly usage:', error);
        }
    }

    /**
     * Incrementar contador de uso
     */
    static async incrementUsage(userId, type) {
        try {
            const { error } = await supabase.rpc('increment_user_usage', {
                p_user_id: userId,
                p_type: type
            });

            // Si la función RPC no existe, usar update manual
            if (error && error.message.includes('function')) {
                const usage = await this.getUserUsage(userId);
                const newValue = (usage[type] || 0) + 1;

                const { error: updateError } = await supabase
                    .from('user_usage')
                    .update({ [type]: newValue })
                    .eq('user_id', userId);

                if (updateError) throw updateError;
            } else if (error) {
                throw error;
            }
        } catch (error) {
            console.error('Error incrementing usage:', error);
        }
    }

    /**
     * Verificar si el usuario puede realizar una acción
     */
    static async canPerformAction(userId, actionType) {
        // Verificar primero si es un email Pro
        try {
            const { data: userData } = await supabase.auth.getUser();
            if (userData?.user?.email && this.isProEmail(userData.user.email)) {
                return { allowed: true, remaining: -1, limit: -1, current: 0 };
            }
        } catch (e) {
            // Continuar con verificación normal
        }

        const plan = await this.getUserPlan(userId);
        const usage = await this.getUserUsage(userId);

        const limit = plan.limits[actionType];
        const current = usage[actionType] || 0;

        // -1 significa ilimitado
        if (limit === -1) return { allowed: true, remaining: -1 };

        const remaining = limit - current;
        return {
            allowed: remaining > 0,
            remaining: Math.max(0, remaining),
            limit,
            current
        };
    }

    /**
     * Obtener uso por defecto
     */
    static getDefaultUsage() {
        return {
            budgets_created: 0,
            ai_generations: 0,
            ai_descriptions: 0,
            ai_price_suggestions: 0,
            bitacora_entries: 0,
            photo_reports: 0,
            pdf_exports: 0,
            catalog_items: 0
        };
    }

    /**
     * Obtener mensaje de límite alcanzado
     */
    static getLimitMessage(actionType, plan) {
        const messages = {
            budgets: 'Has alcanzado el límite de presupuestos. ¡Actualiza a Pro para crear ilimitados!',
            aiGenerations: 'Has alcanzado el límite de generaciones con IA. ¡Actualiza a Pro para uso ilimitado!',
            aiDescriptions: 'Has alcanzado el límite de descripciones con IA. ¡Actualiza a Pro para uso ilimitado!',
            aiPriceSuggestions: 'Has alcanzado el límite de sugerencias de precio. ¡Actualiza a Pro para uso ilimitado!',
            bitacoraEntries: 'Has alcanzado el límite de bitácoras. ¡Actualiza a Pro para crear ilimitadas!',
            photoReports: 'Has alcanzado el límite de reportes fotográficos. ¡Actualiza a Pro para crear ilimitados!',
            pdfExports: 'Has alcanzado el límite de exportaciones PDF. ¡Actualiza a Pro para exportaciones ilimitadas!',
            catalogItems: 'Has alcanzado el límite de items en catálogo. ¡Actualiza a Pro para catálogo ilimitado!'
        };

        return messages[actionType] || 'Has alcanzado el límite de esta funcionalidad. ¡Actualiza a Pro!';
    }
}

