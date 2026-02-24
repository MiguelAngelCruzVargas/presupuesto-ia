import { systemSettingsService } from './SystemSettingsService.js';

// Detectar entorno para variables
const getEnvVar = (key) => {
    let value = '';
    // Vite (Browser/Build)
    if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env[key]) {
        value = import.meta.env[key];
        console.log(`DEBUG getEnvVar (Vite): ${key} = ${value ? '*****' : 'NO ENCONTRADA'}`);
    }
    // Node.js (Backend/Proxy)
    else if (typeof process !== 'undefined' && process.env && process.env[key]) {
        value = process.env[key];
        console.log(`DEBUG getEnvVar (Node): ${key} = ${value ? '*****' : 'NO ENCONTRADA'}`);
    }
    return value;
};

// Tipos de funcionalidades
export const FUNCTION_TYPE = {
    BUDGET: 'budget',           // Generación de presupuestos
    SCHEDULE: 'schedule',        // Cronogramas
    PRICES: 'prices',            // Precios unitarios
    ANALYSIS: 'analysis',        // Análisis de presupuestos
    APU: 'apu',                  // Análisis de Precios Unitarios
    PRICE_SEARCH: 'price_search', // Búsqueda de precios con IA
    GENERAL: 'general'           // Uso general
};

// Tiers de usuario
export const USER_TIER = {
    FREE: 'free',
    PRO: 'pro',
    ENTERPRISE: 'enterprise'
};


const PROVIDERS = {
    GEMINI: 'gemini',
    GROQ: 'groq',
    DEEPSEEK: 'deepseek'
};

class ApiKeyManager {
    constructor() {
        this.keys = {
            gemini: { free: [], pro: [], byFunction: {} },
            groq: { free: [], pro: [], byFunction: {} },
            deepseek: { free: [], pro: [], byFunction: {} }
        };
        this.currentIndex = {
            gemini: { free: 0, pro: 0 },
            groq: { free: 0, pro: 0 },
            deepseek: { free: 0, pro: 0 }
        };
        this.keyStats = new Map();
        console.log('DEBUG: ApiKeyManager constructor - Estado inicial de keys:', JSON.stringify(this.keys));
        this.initializeKeys();
        this.loadFromSettings();
    }

    /**
     * Carga keys desde la configuración dinámica de Supabase
     */
    async loadFromSettings() {
        try {
            const settings = await systemSettingsService.getAllSettings();
            const ignoreEnvKeys = settings.ignore_env_keys;
            console.log('DEBUG: loadFromSettings - ignoreEnvKeys:', ignoreEnvKeys);
            console.log('DEBUG: loadFromSettings - settings.api_keys:', JSON.stringify(settings.api_keys));

            for (const provider of Object.keys(PROVIDERS)) {
                const providerKey = PROVIDERS[provider];
                const dynamicKeys = settings.api_keys?.[providerKey];
                if (dynamicKeys) {
                    if (ignoreEnvKeys) {
                        console.log(`DEBUG: loadFromSettings - Ignorando keys de entorno para ${providerKey}`);
                        this.keys[providerKey].free = [];
                        this.keys[providerKey].pro = [];
                    }
                    if (dynamicKeys.free && Array.isArray(dynamicKeys.free)) {
                        dynamicKeys.free.forEach(key => {
                            if (key && !this.keys[providerKey].free.includes(key)) {
                                this.keys[providerKey].free.push(key);
                                console.log(`DEBUG: loadFromSettings - Añadida key FREE dinámica para ${providerKey}`);
                            }
                        });
                    }
                    if (dynamicKeys.pro && Array.isArray(dynamicKeys.pro)) {
                        dynamicKeys.pro.forEach(key => {
                            if (key && !this.keys[providerKey].pro.includes(key)) {
                                this.keys[providerKey].pro.push(key);
                                console.log(`DEBUG: loadFromSettings - Añadida key PRO dinámica para ${providerKey}`);
                            }
                        });
                    }
                }
            }
            console.log('✅ ApiKeyManager: Keys dinámicas cargadas para todos los proveedores');
            console.log('DEBUG: loadFromSettings - Estado final de keys:', JSON.stringify(this.keys));
        } catch (error) {
            console.error('Error loading dynamic keys:', error);
        }
    }

    /**
     * Inicializa las API keys desde variables de entorno
     */
    initializeKeys() {
        // Helper para cargar múltiples keys
        const loadKeys = (providerKey, prefix) => {
            console.log(`DEBUG: Cargando keys para ${providerKey} con prefijo ${prefix}`);
            for (let i = 1; i <= 3; i++) { // Soporte hasta 3 keys por tier
                const freeKey = getEnvVar(`${prefix}_API_KEY_FREE_${i}`);
                if (freeKey) {
                    this.keys[providerKey].free.push(freeKey);
                    console.log(`DEBUG: ${prefix}_API_KEY_FREE_${i} cargada.`);
                }
                const proKey = getEnvVar(`${prefix}_API_KEY_PRO_${i}`);
                if (proKey) {
                    this.keys[providerKey].pro.push(proKey);
                    console.log(`DEBUG: ${prefix}_API_KEY_PRO_${i} cargada.`);
                }
            }
            // Fallback para key genérica si no hay específicas
            if (this.keys[providerKey].free.length === 0 && getEnvVar(`${prefix}_API_KEY`)) {
                this.keys[providerKey].free.push(getEnvVar(`${prefix}_API_KEY`));
                console.log(`DEBUG: ${prefix}_API_KEY (fallback) cargada.`);
            }
            // Keys por función
            if (getEnvVar(`${prefix}_API_KEY_BUDGET`)) this.keys[providerKey].byFunction[FUNCTION_TYPE.BUDGET] = getEnvVar(`${prefix}_API_KEY_BUDGET`);
            if (getEnvVar(`${prefix}_API_KEY_SCHEDULE`)) this.keys[providerKey].byFunction[FUNCTION_TYPE.SCHEDULE] = getEnvVar(`${prefix}_API_KEY_SCHEDULE`);
            if (getEnvVar(`${prefix}_API_KEY_PRICES`)) this.keys[providerKey].byFunction[FUNCTION_TYPE.PRICES] = getEnvVar(`${prefix}_API_KEY_PRICES`);
            if (getEnvVar(`${prefix}_API_KEY_PRICE_SEARCH`)) this.keys[providerKey].byFunction[FUNCTION_TYPE.PRICE_SEARCH] = getEnvVar(`${prefix}_API_KEY_PRICE_SEARCH`);
            if (getEnvVar(`${prefix}_API_KEY_GENERAL`)) this.keys[providerKey].byFunction[FUNCTION_TYPE.GENERAL] = getEnvVar(`${prefix}_API_KEY_GENERAL`);
        };

        loadKeys(PROVIDERS.GEMINI, 'GEMINI');
        loadKeys(PROVIDERS.GROQ, 'GROQ');
        loadKeys(PROVIDERS.DEEPSEEK, 'DEEPSEEK');
        
        // Log
        for (const provider of Object.keys(PROVIDERS)) {
            const providerKey = PROVIDERS[provider];
            console.log(`🔑 ApiKeyManager inicializado para ${providerKey}:`);
            console.log(`   - Keys FREE: ${this.keys[providerKey].free.length}`);
            console.log(`   - Keys PRO: ${this.keys[providerKey].pro.length}`);
            if (Object.keys(this.keys[providerKey].byFunction).length > 0) {
                console.log(`   - Keys by Function: ${Object.keys(this.keys[providerKey].byFunction).join(', ')}`);
            }
        }
    }

    /**
     * Obtiene la API key apropiada según el proveedor, usuario y funcionalidad
     * @param {string} preferredProvider - Proveedor preferido ('gemini', 'groq', 'deepseek')
     * @param {string} userTier - Tier del usuario (FREE/PRO)
     * @param {string} functionType - Tipo de funcionalidad
     * @returns {string|null} - API key o null si no hay disponible
     */
    getApiKey(preferredProvider = PROVIDERS.GEMINI, userTier = USER_TIER.FREE, functionType = FUNCTION_TYPE.GENERAL) {
        const providersToTry = [preferredProvider];
        // Si el proveedor preferido no es Gemini, intentar Gemini como fallback
        if (preferredProvider !== PROVIDERS.GEMINI) {
            providersToTry.push(PROVIDERS.GEMINI);
        }
        // Siempre intentar Groq y DeepSeek como fallbacks si no se encuentran keys
        if (!providersToTry.includes(PROVIDERS.GROQ)) providersToTry.push(PROVIDERS.GROQ);
        if (!providersToTry.includes(PROVIDERS.DEEPSEEK)) providersToTry.push(PROVIDERS.DEEPSEEK);

        for (const provider of providersToTry) {
            if (!this.keys[provider]) continue;

            // 1. Prioridad: Key específica por funcionalidad (si existe)
            if (functionType && this.keys[provider].byFunction && this.keys[provider].byFunction[functionType]) {
                const functionKey = this.keys[provider].byFunction[functionType];
                this.recordUsage(functionKey);
                return functionKey;
            }

            // 2. Seleccionar pool según tier
            const pool = userTier === USER_TIER.PRO || userTier === USER_TIER.ENTERPRISE
                ? this.keys[provider].pro
                : this.keys[provider].free;

            // 3. Si hay keys en el pool, seleccionarla
            if (pool.length > 0) {
                return this.selectKeyFromPool(pool, userTier, provider);
            }

            // 4. Si no hay keys en el pool del tier, intentar con el pool del otro tier como fallback
            const fallbackPool = userTier === USER_TIER.FREE ? this.keys[provider].pro : this.keys[provider].free;
            if (fallbackPool.length > 0) {
                console.warn(`⚠️ Usando pool alternativo para tier ${userTier} en ${provider}`);
                return this.selectKeyFromPool(fallbackPool, userTier, provider);
            }
        }
        
        console.warn('❌ No se encontraron API keys disponibles para ningún proveedor o tier.');
        return null;
    }

    /**
     * Selecciona una key del pool con balanceo de carga (round-robin)
     * @param {Array<string>} pool - Pool de keys
     * @param {string} tier - Tier del usuario
     * @returns {string} - API key seleccionada
     */
    selectKeyFromPool(pool, tier, provider) {
        if (pool.length === 0) return null;
        const indexKey = tier === USER_TIER.PRO || tier === USER_TIER.ENTERPRISE ? 'pro' : 'free';
        const currentIndex = this.currentIndex[provider][indexKey] || 0;
        const selectedKey = pool[currentIndex % pool.length];
        this.currentIndex[provider][indexKey] = (currentIndex + 1) % pool.length;
        this.recordUsage(selectedKey);
        return selectedKey;
    }

    /**
     * Registra el uso de una key para estadísticas
     * @param {string} key - API key (maskeada)
     */
    recordUsage(key) {
        const maskedKey = this.maskKey(key);
        if (!this.keyStats.has(maskedKey)) {
            this.keyStats.set(maskedKey, {
                count: 0,
                lastUsed: null,
                errors: 0
            });
        }
        const stats = this.keyStats.get(maskedKey);
        stats.count++;
        stats.lastUsed = new Date();
    }

    /**
     * Registra un error en una key (para detectar keys problemáticas)
     * @param {string} key - API key
     */
    recordError(key) {
        const maskedKey = this.maskKey(key);
        if (this.keyStats.has(maskedKey)) {
            this.keyStats.get(maskedKey).errors++;
        }
    }

    /**
     * Enmascara una API key para logs (muestra solo últimos 4 caracteres)
     * @param {string} key - API key completa
     * @returns {string} - Key enmascarada
     */
    maskKey(key) {
        if (!key || key.length < 8) return '***';
        return `...${key.slice(-4)}`;
    }

    /**
     * Obtiene estadísticas de uso
     * @returns {Object} - Estadísticas
     */
    getStats() {
        const stats = {};
        this.keyStats.forEach((value, key) => {
            stats[key] = { ...value };
        });

        const totalKeys = {
            free: 0,
            pro: 0
        };

        for (const provider of Object.keys(PROVIDERS)) {
            if (this.keys[provider]) {
                totalKeys.free += this.keys[provider].free.length;
                totalKeys.pro += this.keys[provider].pro.length;
            }
        }

        return {
            totalKeys: totalKeys,
            usage: stats
        };
    }

    /**
     * Verifica si hay keys disponibles para un tier y proveedor
     * @param {string} provider - Proveedor ('gemini', 'groq', 'deepseek')
     * @param {string} userTier - Tier del usuario
     * @returns {boolean} - True si hay keys disponibles
     */
    hasAvailableKeys(provider = PROVIDERS.GEMINI, userTier = USER_TIER.FREE) {
        if (!this.keys[provider]) return false;
        const pool = userTier === USER_TIER.PRO || userTier === USER_TIER.ENTERPRISE
            ? this.keys[provider].pro
            : this.keys[provider].free;
        return pool.length > 0;
    }
}

// Singleton instance
const apiKeyManager = new ApiKeyManager();
export { apiKeyManager, PROVIDERS };
