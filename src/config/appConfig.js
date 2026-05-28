export const APP_CONFIG = {
    locale: 'es-MX',
    defaultCurrency: 'MXN',
    defaultCountry: 'México',
    defaultProjectName: 'Presupuesto Nuevo',
    defaultProjectType: 'General',
    defaultTaxRate: 16,
    defaultIndirectPercentage: 0,
    defaultProfitPercentage: 0,
    inactivityLimitMs: 60 * 60 * 1000,
    activityThrottleMs: 1000,
    renderKeepAliveIntervalMs: 10 * 60 * 1000,
    supabaseKeepAliveIntervalMs: 24 * 60 * 60 * 1000,
    localBudgetStorageKey: 'presugenius_budgets',
    localCatalogStorageKey: 'presugenius_catalog'
};

export const getTodayString = () => new Date().toISOString().split('T')[0];

export const createDefaultProjectInfo = (overrides = {}) => ({
    id: overrides.id,
    client: '',
    project: APP_CONFIG.defaultProjectName,
    date: getTodayString(),
    currency: APP_CONFIG.defaultCurrency,
    taxRate: APP_CONFIG.defaultTaxRate,
    type: APP_CONFIG.defaultProjectType,
    indirect_percentage: APP_CONFIG.defaultIndirectPercentage,
    profit_percentage: APP_CONFIG.defaultProfitPercentage,
    location: APP_CONFIG.defaultCountry,
    ...overrides
});
