import React, { useEffect, useMemo, useState } from 'react';
import { useSubscription } from '../context/SubscriptionContext';
import { usePricingModal } from '../context/PricingModalContext';
import {
    Activity,
    AlertTriangle,
    ArrowRight,
    Bot,
    Calendar,
    CheckCircle2,
    Clock3,
    Crown,
    Gauge,
    KeyRound,
    Layers3,
    RefreshCw,
    ShieldAlert,
    Sparkles,
    Zap
} from 'lucide-react';
import Card from '../components/ui/Card';
import { BackendAIService } from '../services/BackendAIService';
import { APP_CONFIG } from '../config/appConfig';

const providerLabels = {
    gemini: 'Gemini',
    groq: 'Groq',
    deepseek: 'DeepSeek'
};

const providerRoles = {
    gemini: 'Proveedor de respaldo',
    groq: 'Proveedor principal',
    deepseek: 'Proveedor alterno'
};

const functionLabels = {
    budget: 'Presupuestos IA',
    schedule: 'Cronogramas',
    prices: 'Precios unitarios',
    price_search: 'Búsqueda de mercado',
    analysis: 'Análisis',
    general: 'Chat y asistencia'
};

const formatDateTime = (value) => {
    if (!value) return 'Sin uso reciente';
    return new Date(value).toLocaleString(APP_CONFIG.locale, {
        day: '2-digit',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit'
    });
};

const getPressureTone = (percent) => {
    if (percent >= 90) return 'text-red-600 bg-red-50 border-red-200 dark:text-red-300 dark:bg-red-950/30 dark:border-red-900/50';
    if (percent >= 70) return 'text-amber-600 bg-amber-50 border-amber-200 dark:text-amber-300 dark:bg-amber-950/30 dark:border-amber-900/50';
    return 'text-emerald-600 bg-emerald-50 border-emerald-200 dark:text-emerald-300 dark:bg-emerald-950/30 dark:border-emerald-900/50';
};

const getPressureBar = (percent) => {
    if (percent >= 90) return 'bg-red-500';
    if (percent >= 70) return 'bg-amber-500';
    return 'bg-emerald-500';
};

const UsageDashboard = () => {
    const { plan, usage, loading, refreshData, isPro } = useSubscription();
    const { openPricingModal } = usePricingModal();
    const [proxyUsage, setProxyUsage] = useState(null);
    const [proxyLoading, setProxyLoading] = useState(true);
    const [proxyError, setProxyError] = useState('');

    useEffect(() => {
        refreshData();
        loadProxyUsage();
    }, []);

    const loadProxyUsage = async () => {
        try {
            setProxyLoading(true);
            setProxyError('');
            const data = await BackendAIService.getUsageStatus();
            setProxyUsage(data);
        } catch (error) {
            console.error('Error loading proxy usage:', error);
            setProxyError(error.message || 'No se pudo consultar el estado del proxy de IA.');
        } finally {
            setProxyLoading(false);
        }
    };

    const activeProviders = useMemo(() => {
        return Object.entries(proxyUsage?.providers || {}).filter(([, provider]) => provider.active);
    }, [proxyUsage]);

    const providerCards = useMemo(() => {
        const providers = proxyUsage?.providers || {};
        const activeProviderKeys = Object.entries(providers)
            .filter(([, provider]) => provider.active)
            .map(([providerKey]) => providerKey);

        const preferredProvider = activeProviderKeys.includes('groq')
            ? 'groq'
            : activeProviderKeys[0] || null;

        return activeProviderKeys.map((providerKey) => {
            const provider = providers[providerKey];
            const totalConfiguredKeys = (provider?.configured?.free || 0) + (provider?.configured?.pro || 0);
            const statusLabel = providerKey === preferredProvider
                ? 'Proveedor principal'
                : (providerRoles[providerKey] || 'Proveedor activo');

            return {
                providerKey,
                provider,
                totalConfiguredKeys,
                statusLabel
            };
        });
    }, [proxyUsage]);

    const summary = useMemo(() => {
        const providers = proxyUsage?.providers || {};
        const totalProviderRequests = Object.values(providers).reduce((sum, item) => sum + (item.requests || 0), 0);
        const totalProviderErrors = Object.values(providers).reduce((sum, item) => sum + (item.errors || 0), 0);
        const totalBlocked = Object.values(providers).reduce((sum, item) => sum + (item.blocked || 0), 0);

        return {
            totalRequests: proxyUsage?.runtime?.totalDailyRequests || 0,
            totalProviderRequests,
            totalProviderErrors,
            totalBlocked,
            trackedIps: proxyUsage?.runtime?.trackedIps || 0
        };
    }, [proxyUsage]);

    const monthlyCounters = [
        { key: 'budgets', label: 'Presupuestos creados', value: usage.budgets || 0 },
        { key: 'aiGenerations', label: 'Generaciones IA', value: usage.aiGenerations || 0 },
        { key: 'photoReports', label: 'Reportes fotográficos', value: usage.photoReports || 0 },
        { key: 'pdfExports', label: 'PDF exportados', value: usage.pdfExports || 0 }
    ];

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="text-center">
                    <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent"></div>
                    <p className="text-slate-600 dark:text-slate-300">Cargando uso...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
                <div>
                    <div className="inline-flex items-center gap-2 rounded-full border border-cyan-200 bg-cyan-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-cyan-700 dark:border-cyan-900 dark:bg-cyan-950/30 dark:text-cyan-300">
                        <Activity size={14} />
                        Uso real de IA
                    </div>
                    <h1 className="mt-3 text-3xl font-bold text-slate-900 dark:text-slate-50">Dashboard de Uso</h1>
                    <p className="mt-1 text-slate-600 dark:text-slate-400">
                        Monitorea consumo real del proxy, presión por función y estado de tus proveedores de API.
                    </p>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                    <div className={`rounded-xl px-4 py-2 font-bold ${
                        isPro
                            ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white'
                            : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200'
                    }`}>
                        {plan.name}
                    </div>
                    <button
                        onClick={loadProxyUsage}
                        className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-cyan-200 hover:text-cyan-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-cyan-900 dark:hover:text-cyan-300"
                    >
                        <RefreshCw size={16} />
                        Actualizar IA
                    </button>
                    {!isPro && (
                        <button
                            onClick={openPricingModal}
                            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-blue-600 px-4 py-2 font-bold text-white transition hover:from-indigo-700 hover:to-blue-700"
                        >
                            <Crown size={18} />
                            Actualizar a Pro
                        </button>
                    )}
                </div>
            </div>

            <Card className="border-0 bg-gradient-to-br from-slate-950 via-slate-900 to-cyan-950 text-white shadow-2xl shadow-slate-950/15">
                <div className="grid gap-6 xl:grid-cols-[1.3fr_0.7fr]">
                    <div>
                        <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-cyan-200">
                            <Bot size={14} />
                            Consumo del proxy
                        </div>
                        <h3 className="mt-4 text-2xl font-bold">Indicador técnico de uso real</h3>
                        <p className="mt-2 max-w-2xl text-sm text-slate-300">
                            Aquí ya no se muestra solo “ilimitado”. Ves cuántas solicitudes han pasado por tu proxy,
                            qué proveedor está vivo, qué funciones están cerca de su tope diario y si alguna key quedó bloqueada.
                        </p>
                        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Requests hoy</p>
                                <p className="mt-3 text-3xl font-bold">{summary.totalRequests}</p>
                            </div>
                            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Proveedores activos</p>
                                <p className="mt-3 text-3xl font-bold">{activeProviders.length}</p>
                            </div>
                            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Keys bloqueadas</p>
                                <p className="mt-3 text-3xl font-bold">{summary.totalBlocked}</p>
                            </div>
                            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Errores registrados</p>
                                <p className="mt-3 text-3xl font-bold">{summary.totalProviderErrors}</p>
                            </div>
                        </div>
                    </div>

                    <div className="rounded-3xl border border-cyan-400/20 bg-white/5 p-5 backdrop-blur">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-200">Estado actual</p>
                                <p className="mt-2 text-lg font-bold text-white">
                                    {proxyError ? 'Proxy no disponible' : proxyLoading ? 'Consultando...' : 'Operativo'}
                                </p>
                            </div>
                            <Gauge className="text-cyan-300" size={24} />
                        </div>
                        <div className="mt-5 space-y-3 text-sm text-slate-300">
                            <div className="flex items-center justify-between rounded-2xl bg-white/5 px-4 py-3">
                                <span>IPs con actividad</span>
                                <span className="font-bold text-white">{summary.trackedIps}</span>
                            </div>
                            <div className="flex items-center justify-between rounded-2xl bg-white/5 px-4 py-3">
                                <span>Requests por proveedor</span>
                                <span className="font-bold text-white">{summary.totalProviderRequests}</span>
                            </div>
                            <div className="flex items-center justify-between rounded-2xl bg-white/5 px-4 py-3">
                                <span>Última lectura</span>
                                <span className="font-bold text-white">
                                    {proxyUsage?.timestamp ? formatDateTime(proxyUsage.timestamp) : 'Sin datos'}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            </Card>

            {proxyError && (
                <Card className="border border-red-200 bg-red-50 dark:border-red-900/50 dark:bg-red-950/20">
                    <div className="flex items-start gap-3 text-red-700 dark:text-red-300">
                        <ShieldAlert className="mt-0.5 shrink-0" size={18} />
                        <div>
                            <p className="font-bold">No se pudo leer el uso técnico de la API</p>
                            <p className="mt-1 text-sm">{proxyError}</p>
                        </div>
                    </div>
                </Card>
            )}

            <div className="grid gap-4 lg:grid-cols-3">
                {(proxyUsage?.functionUsage || []).map((item) => {
                    const pressure = item.dailyLimit > 0 ? Math.min(100, Math.round((item.totalRequests / item.dailyLimit) * 100)) : 0;
                    return (
                        <Card key={item.functionType} className="border border-slate-200/80 bg-gradient-to-br from-white via-slate-50 to-slate-100/80 dark:border-slate-700 dark:from-slate-900 dark:via-slate-900 dark:to-slate-800/80">
                            <div className="space-y-4">
                                <div className="flex items-start justify-between gap-3">
                                    <div>
                                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">Función IA</p>
                                        <h3 className="mt-2 text-lg font-bold text-slate-900 dark:text-slate-50">
                                            {functionLabels[item.functionType] || item.name}
                                        </h3>
                                    </div>
                                    <div className={`rounded-xl border px-3 py-1 text-xs font-bold ${getPressureTone(pressure)}`}>
                                        {pressure}% del tope
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <div className="flex items-center justify-between text-sm">
                                        <span className="text-slate-600 dark:text-slate-400">Uso diario observado</span>
                                        <span className="font-bold text-slate-900 dark:text-slate-50">
                                            {item.totalRequests} / {item.dailyLimit}
                                        </span>
                                    </div>
                                    <div className="h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
                                        <div
                                            className={`h-full rounded-full transition-all ${getPressureBar(pressure)}`}
                                            style={{ width: `${pressure}%` }}
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    <div className="rounded-2xl bg-slate-100 p-3 dark:bg-slate-800">
                                        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">Cooldown</p>
                                        <p className="mt-2 text-sm font-bold text-slate-800 dark:text-slate-100">{Math.round(item.cooldownMs / 1000)}s</p>
                                    </div>
                                    <div className="rounded-2xl bg-slate-100 p-3 dark:bg-slate-800">
                                        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">IPs activas</p>
                                        <p className="mt-2 text-sm font-bold text-slate-800 dark:text-slate-100">{item.activeIps}</p>
                                    </div>
                                </div>
                            </div>
                        </Card>
                    );
                })}
            </div>

            <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
                <Card className="border border-slate-200/80 dark:border-slate-700">
                    <div className="flex items-center justify-between">
                        <div>
                            <h3 className="text-lg font-bold text-slate-900 dark:text-slate-50">Estado por proveedor</h3>
                            <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                                Qué motor está activo, cuántas keys tiene y si ya presenta errores o bloqueos.
                            </p>
                        </div>
                        <KeyRound className="text-slate-400" size={20} />
                    </div>

                    <div className="mt-5 grid gap-4">
                        {providerCards.map(({ providerKey, provider, totalConfiguredKeys, statusLabel }) => (
                            <div
                                key={providerKey}
                                className="rounded-3xl border border-slate-200 bg-gradient-to-r from-white to-slate-50 p-5 dark:border-slate-700 dark:from-slate-900 dark:to-slate-800"
                            >
                                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
                                                Activo
                                            </span>
                                            <h4 className="text-lg font-bold text-slate-900 dark:text-slate-50">
                                                {providerLabels[providerKey] || providerKey}
                                            </h4>
                                        </div>
                                        <p className="mt-2 text-sm font-semibold text-slate-700 dark:text-slate-200">
                                            {statusLabel}
                                        </p>
                                        <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
                                            Último uso: {formatDateTime(provider.lastUsed)}
                                        </p>
                                    </div>

                                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                                        <div className="rounded-2xl bg-slate-100 p-3 text-center dark:bg-slate-800">
                                            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">Keys operativas</p>
                                            <p className="mt-2 text-lg font-bold text-slate-800 dark:text-slate-50">{totalConfiguredKeys}</p>
                                        </div>
                                        <div className="rounded-2xl bg-slate-100 p-3 text-center dark:bg-slate-800">
                                            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">Requests</p>
                                            <p className="mt-2 text-lg font-bold text-slate-800 dark:text-slate-50">{provider.requests}</p>
                                        </div>
                                        <div className={`rounded-2xl p-3 text-center ${provider.errors > 0 ? 'bg-amber-50 dark:bg-amber-950/20' : 'bg-slate-100 dark:bg-slate-800'}`}>
                                            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">Errores</p>
                                            <p className={`mt-2 text-lg font-bold ${provider.errors > 0 ? 'text-amber-600 dark:text-amber-300' : 'text-slate-800 dark:text-slate-50'}`}>{provider.errors}</p>
                                        </div>
                                        <div className={`rounded-2xl p-3 text-center ${provider.blocked > 0 ? 'bg-red-50 dark:bg-red-950/20' : 'bg-slate-100 dark:bg-slate-800'}`}>
                                            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">Bloqueadas</p>
                                            <p className={`mt-2 text-lg font-bold ${provider.blocked > 0 ? 'text-red-600 dark:text-red-300' : 'text-slate-800 dark:text-slate-50'}`}>{provider.blocked}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}

                        {!proxyLoading && activeProviders.length === 0 && (
                            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-700 dark:border-amber-900/50 dark:bg-amber-950/20 dark:text-amber-300">
                                No hay proveedores activos detectados. Revisa tus `API keys` o la configuración dinámica.
                            </div>
                        )}
                    </div>
                </Card>

                <div className="space-y-4">
                    <Card className="border border-slate-200/80 dark:border-slate-700">
                        <div className="flex items-center justify-between">
                            <div>
                                <h3 className="text-lg font-bold text-slate-900 dark:text-slate-50">Uso mensual del plan</h3>
                                <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                                    Esto sigue sirviendo para lo comercial, pero ahora queda como referencia secundaria.
                                </p>
                            </div>
                            <Sparkles className="text-slate-400" size={20} />
                        </div>
                        <div className="mt-5 grid gap-3">
                            {monthlyCounters.map((item) => (
                                <div key={item.key} className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3 dark:bg-slate-800">
                                    <span className="text-sm text-slate-600 dark:text-slate-300">{item.label}</span>
                                    <span className="text-lg font-bold text-slate-900 dark:text-slate-50">{item.value}</span>
                                </div>
                            ))}
                        </div>
                    </Card>

                    <Card className="border border-slate-200/80 bg-gradient-to-br from-indigo-50 via-white to-cyan-50 dark:border-slate-700 dark:from-indigo-950/20 dark:via-slate-900 dark:to-cyan-950/20">
                        <div className="flex items-start gap-3">
                            <div className="rounded-2xl bg-indigo-100 p-3 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300">
                                <Zap size={20} />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-slate-900 dark:text-slate-50">Cómo leer este tablero</h3>
                                <div className="mt-3 space-y-2 text-sm text-slate-600 dark:text-slate-400">
                                    <p>Si una función se acerca al 100%, estás consumiendo gran parte del límite técnico diario del proxy.</p>
                                    <p>Si un proveedor muestra bloqueos, alguna key fue rechazada por autenticación, cuota o rate limit.</p>
                                    <p>El uso mensual del plan no desaparece, pero ya no manda sobre la parte técnica real de la API.</p>
                                </div>
                            </div>
                        </div>
                    </Card>

                    {!isPro && (
                        <Card className="border-0 bg-gradient-to-r from-indigo-600 to-blue-600 text-white">
                            <div className="flex items-center justify-between gap-4">
                                <div>
                                    <h3 className="flex items-center gap-2 text-xl font-bold">
                                        <Crown size={22} />
                                        Actualiza a Pro
                                    </h3>
                                    <p className="mt-2 text-sm text-indigo-100">
                                        Mantén el plan comercial amplio mientras monitoreas el consumo técnico real del proxy.
                                    </p>
                                </div>
                                <button
                                    onClick={openPricingModal}
                                    className="inline-flex items-center gap-2 rounded-xl bg-white px-5 py-3 font-bold text-indigo-600 transition hover:bg-indigo-50"
                                >
                                    Ver planes
                                    <ArrowRight size={18} />
                                </button>
                            </div>
                        </Card>
                    )}
                </div>
            </div>

            <Card className="bg-slate-50 dark:bg-slate-900/60">
                <div className="flex items-center justify-between">
                    <div>
                        <h3 className="font-bold text-slate-900 dark:text-slate-50">Resumen del periodo</h3>
                        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                            Vista correspondiente a {new Date().toLocaleDateString(APP_CONFIG.locale, { month: 'long', year: 'numeric' })}.
                        </p>
                    </div>
                    <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                        <Calendar size={18} />
                        <span className="text-sm font-medium">Corte técnico diario + contadores mensuales</span>
                    </div>
                </div>
            </Card>
        </div>
    );
};

export default UsageDashboard;
