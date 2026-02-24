import { supabase } from '../lib/supabaseClient.js';
import { SecurityUtils } from '../utils/security.js';

export class SystemSettingsService {
    constructor() {
        this.cache = null;
        this.lastFetch = 0;
        this.CACHE_DURATION = 5 * 60 * 1000; // 5 minutos

        // Valores por defecto
        this.defaults = {
            whatsapp_number: '522811975587',
            support_message: 'Hola, necesito ayuda con PresuGenius',
            ignore_env_keys: false, // Si es true, solo usa las keys de la BD
            plan_pro_price: 299,
            plan_pro_description: 'Para profesionales que necesitan más',
            plan_pro_features: [
                'Presupuestos ilimitados',
                'Generaciones con IA ilimitadas',
                'Descripciones con IA ilimitadas',
                'Sugerencias de precio ilimitadas',
                'Bitácoras ilimitadas',
                'Reportes fotográficos ilimitados',
                'Exportaciones PDF ilimitadas',
                'Catálogo ilimitado',
                'Soporte prioritario',
                'Actualizaciones prioritarias',
                'Plantillas premium'
            ],
            plan_free_description: 'Perfecto para probar la plataforma',
            plan_free_features: [
                '1 presupuesto',
                '3 generaciones con IA',
                '5 descripciones con IA',
                '10 sugerencias de precio',
                '1 bitácora de obra',
                '1 reporte fotográfico',
                '5 exportaciones PDF',
                '50 items en catálogo',
                'Soporte por email'
            ],
            bank_details: `🏦 **Datos Bancarios para Transferencia**\n\n**Banco:** BBVA\n**CLABE:** 012345678901234567\n**Titular:** Miguel Ángel\n**Concepto:** Tu Nombre - Plan Pro`,
            plan_pro_limits: {
                budgets: -1, // -1 = ilimitado
                ai_generations: -1,
                descriptions: -1,
                suggestions: -1
            },
            api_keys: {
                gemini: {
                    free: [],
                    pro: []
                },
                groq: {
                    free: [],
                    pro: []
                },
                deepseek: {
                    free: [],
                    pro: []
                }
            }
        };
    }

    /**
     * Obtener todas las configuraciones
     */
    async getAllSettings(forceRefresh = false) {
        try {
            // Usar caché si es válido
            const now = Date.now();
            if (!forceRefresh && this.cache && (now - this.lastFetch < this.CACHE_DURATION)) {
                return this.cache;
            }

            const { data, error } = await supabase
                .from('app_settings')
                .select('*');

            if (error) throw error;

            // Convertir array a objeto
            const settings = { ...this.defaults };

            for (const item of data) {
                // Desencriptar valores sensibles (api_keys)
                if (item.key === 'api_keys' && item.value && item.value.__encrypted) {
                    try {
                        const decryptedStr = await SecurityUtils.decrypt(item.value.data);
                        if (decryptedStr) {
                            settings[item.key] = JSON.parse(decryptedStr);
                            console.log('🔓 Settings: API Keys desencriptadas correctamente');
                        } else {
                            console.error('❌ Settings: Falló la desencriptación de API Keys');
                        }
                    } catch (e) {
                        console.error('❌ Settings: Error al desencriptar keys', e);
                        // Mantener valor por defecto o raw si falló
                    }
                } else {
                    settings[item.key] = item.value;
                }
            }

            this.cache = settings;
            this.lastFetch = now;
            return settings;
        } catch (error) {
            console.error('Error fetching system settings:', error);
            return this.defaults;
        }
    }

    /**
     * Guardar una configuración
     */
    async saveSetting(key, value) {
        try {
            let valueToSave = value;

            // Encriptar si es api_keys
            if (key === 'api_keys') {
                console.log('🔒 Settings: Encriptando API Keys antes de guardar...');
                const jsonStr = JSON.stringify(value);
                const encryptedData = await SecurityUtils.encrypt(jsonStr);

                if (encryptedData) {
                    valueToSave = {
                        __encrypted: true,
                        data: encryptedData
                    };
                }
            }

            const { error } = await supabase
                .from('app_settings')
                .upsert({
                    key,
                    value: valueToSave,
                    updated_at: new Date().toISOString(),
                    updated_by: (await supabase.auth.getUser()).data.user?.email
                });

            if (error) throw error;

            // Actualizar caché local (con el valor plano para la app)
            if (this.cache) {
                this.cache[key] = value;
            }

            return true;
        } catch (error) {
            console.error(`Error saving setting ${key}:`, error);
            throw error;
        }
    }

    /**
     * Obtiene una configuración específica
     */
    async getSetting(key, defaultValue = null) {
        const settings = await this.getAllSettings();
        return settings[key] ?? defaultValue;
    }
}

export const systemSettingsService = new SystemSettingsService();
