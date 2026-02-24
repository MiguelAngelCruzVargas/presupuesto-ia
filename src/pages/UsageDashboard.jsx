import React, { useEffect, useState } from 'react';
import { useSubscription } from '../context/SubscriptionContext';
import { useNavigate } from 'react-router-dom';
import { usePricingModal } from '../context/PricingModalContext';
import { 
    BarChart3, 
    TrendingUp, 
    Zap, 
    FileText, 
    Camera, 
    BookOpen, 
    Bot, 
    Crown,
    AlertTriangle,
    CheckCircle,
    ArrowRight,
    Calendar,
    Package
} from 'lucide-react';
import { SubscriptionService } from '../services/SubscriptionService';
import Card from '../components/ui/Card';

const UsageDashboard = () => {
    const { plan, usage, loading, refreshData, isPro } = useSubscription();
    const navigate = useNavigate();
    const { openPricingModal } = usePricingModal();
    const [usagePercentages, setUsagePercentages] = useState({});

    useEffect(() => {
        refreshData();
    }, []);

    useEffect(() => {
        // Calcular porcentajes de uso
        const percentages = {};
        Object.keys(plan.limits).forEach(key => {
            const limit = plan.limits[key];
            const current = usage[key] || 0;
            if (limit === -1) {
                percentages[key] = 0; // Ilimitado
            } else {
                percentages[key] = Math.min(100, (current / limit) * 100);
            }
        });
        setUsagePercentages(percentages);
    }, [plan, usage]);

    const getUsageColor = (percentage) => {
        if (percentage >= 100) return 'bg-red-500';
        if (percentage >= 80) return 'bg-amber-500';
        if (percentage >= 50) return 'bg-yellow-500';
        return 'bg-green-500';
    };

    const getUsageStatus = (key) => {
        const limit = plan.limits[key];
        const current = usage[key] || 0;
        
        if (limit === -1) {
            return { status: 'unlimited', text: 'Ilimitado', icon: CheckCircle, color: 'text-green-600' };
        }
        
        const percentage = (current / limit) * 100;
        if (percentage >= 100) {
            return { status: 'exceeded', text: 'Límite alcanzado', icon: AlertTriangle, color: 'text-red-600' };
        }
        if (percentage >= 80) {
            return { status: 'warning', text: 'Cerca del límite', icon: AlertTriangle, color: 'text-amber-600' };
        }
        return { status: 'ok', text: 'Normal', icon: CheckCircle, color: 'text-green-600' };
    };

    const usageItems = [
        {
            key: 'budgets',
            label: 'Presupuestos',
            icon: FileText,
            description: 'Presupuestos creados este mes'
        },
        {
            key: 'aiGenerations',
            label: 'Generaciones con IA',
            icon: Bot,
            description: 'Presupuestos generados con IA'
        },
        {
            key: 'aiDescriptions',
            label: 'Descripciones con IA',
            icon: Zap,
            description: 'Descripciones generadas con IA'
        },
        {
            key: 'aiPriceSuggestions',
            label: 'Sugerencias de Precio',
            icon: TrendingUp,
            description: 'Sugerencias de precio con IA'
        },
        {
            key: 'bitacoraEntries',
            label: 'Bitácoras',
            icon: BookOpen,
            description: 'Notas de bitácora creadas'
        },
        {
            key: 'photoReports',
            label: 'Reportes Fotográficos',
            icon: Camera,
            description: 'Reportes fotográficos creados'
        },
        {
            key: 'pdfExports',
            label: 'Exportaciones PDF',
            icon: FileText,
            description: 'PDFs generados'
        },
        {
            key: 'catalogItems',
            label: 'Items en Catálogo',
            icon: Package,
            description: 'Items en tu catálogo maestro'
        }
    ];

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="text-center">
                    <div className="animate-spin h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-4"></div>
                    <p className="text-slate-600">Cargando uso...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900 mb-2">Dashboard de Uso</h1>
                    <p className="text-slate-600">
                        Monitorea tu uso mensual y gestiona tus límites
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <div className={`px-4 py-2 rounded-lg font-bold ${
                        isPro 
                            ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white' 
                            : 'bg-slate-100 text-slate-700'
                    }`}>
                        {plan.name}
                    </div>
                    {!isPro && (
                        <button
                            onClick={openPricingModal}
                            className="px-4 py-2 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white rounded-lg font-bold transition flex items-center gap-2"
                        >
                            <Crown size={18} />
                            Actualizar a Pro
                        </button>
                    )}
                </div>
            </div>

            {/* Plan Info Card */}
            <Card className="bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200">
                <div className="flex items-center justify-between">
                    <div>
                        <h3 className="text-lg font-bold text-slate-900 mb-1">
                            Plan {plan.name}
                        </h3>
                        <p className="text-sm text-slate-600">
                            {isPro 
                                ? 'Disfruta de todas las funcionalidades sin límites'
                                : 'Límites mensuales - Se reinician cada mes'
                            }
                        </p>
                    </div>
                    <div className="text-right">
                        <div className="text-2xl font-bold text-slate-900">
                            {isPro ? 'Ilimitado' : 'Gratis'}
                        </div>
                        {!isPro && (
                            <button
                                onClick={openPricingModal}
                                className="text-sm text-blue-600 hover:text-blue-700 font-medium mt-1"
                            >
                                Ver planes →
                            </button>
                        )}
                    </div>
                </div>
            </Card>

            {/* Usage Stats Grid */}
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {usageItems.map((item) => {
                    const Icon = item.icon;
                    const limit = plan.limits[item.key];
                    const current = usage[item.key] || 0;
                    const percentage = limit === -1 ? 0 : Math.min(100, (current / limit) * 100);
                    const status = getUsageStatus(item.key);
                    const StatusIcon = status.icon;

                    return (
                        <Card key={item.key} className="hover:shadow-lg transition">
                            <div className="space-y-4">
                                {/* Header */}
                                <div className="flex items-start justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className={`p-2 rounded-lg ${
                                            status.status === 'exceeded' 
                                                ? 'bg-red-100' 
                                                : status.status === 'warning'
                                                ? 'bg-amber-100'
                                                : 'bg-blue-100'
                                        }`}>
                                            <Icon className={status.color} size={20} />
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-slate-900">{item.label}</h3>
                                            <p className="text-xs text-slate-500">{item.description}</p>
                                        </div>
                                    </div>
                                    <StatusIcon className={status.color} size={18} />
                                </div>

                                {/* Usage Bar */}
                                {limit !== -1 && (
                                    <>
                                        <div className="space-y-2">
                                            <div className="flex justify-between text-sm">
                                                <span className="font-medium text-slate-700">
                                                    {current} / {limit}
                                                </span>
                                                <span className={`font-bold ${
                                                    percentage >= 100 
                                                        ? 'text-red-600' 
                                                        : percentage >= 80
                                                        ? 'text-amber-600'
                                                        : 'text-slate-600'
                                                }`}>
                                                    {Math.round(percentage)}%
                                                </span>
                                            </div>
                                            <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                                                <div
                                                    className={`h-full rounded-full transition-all ${getUsageColor(percentage)}`}
                                                    style={{ width: `${percentage}%` }}
                                                ></div>
                                            </div>
                                        </div>
                                    </>
                                )}

                                {limit === -1 && (
                                    <div className="flex items-center gap-2 text-green-600">
                                        <CheckCircle size={16} />
                                        <span className="text-sm font-medium">Ilimitado</span>
                                    </div>
                                )}

                                {/* Status Message */}
                                {status.status === 'exceeded' && (
                                    <button
                                        onClick={openPricingModal}
                                        className="w-full py-2 bg-red-50 hover:bg-red-100 text-red-700 rounded-lg text-sm font-medium transition flex items-center justify-center gap-2"
                                    >
                                        Actualizar Plan
                                        <ArrowRight size={14} />
                                    </button>
                                )}

                                {status.status === 'warning' && (
                                    <div className="text-xs text-amber-600 bg-amber-50 p-2 rounded">
                                        ⚠️ Te quedan {limit - current} usos restantes
                                    </div>
                                )}
                            </div>
                        </Card>
                    );
                })}
            </div>

            {/* Summary */}
            <Card className="bg-slate-50">
                <div className="flex items-center justify-between">
                    <div>
                        <h3 className="font-bold text-slate-900 mb-1">Resumen del Mes</h3>
                        <p className="text-sm text-slate-600">
                            Los contadores se reinician automáticamente cada mes
                        </p>
                    </div>
                    <div className="flex items-center gap-2 text-slate-600">
                        <Calendar size={20} />
                        <span className="text-sm font-medium">
                            {new Date().toLocaleDateString('es-MX', { month: 'long', year: 'numeric' })}
                        </span>
                    </div>
                </div>
            </Card>

            {/* Upgrade CTA */}
            {!isPro && (
                <Card className="bg-gradient-to-r from-indigo-600 to-blue-600 text-white">
                    <div className="flex items-center justify-between">
                        <div>
                            <h3 className="text-xl font-bold mb-2 flex items-center gap-2">
                                <Crown size={24} />
                                Actualiza a Pro
                            </h3>
                            <p className="text-purple-100">
                                Desbloquea todas las funcionalidades sin límites por solo $299 MXN/mes
                            </p>
                        </div>
                        <button
                            onClick={openPricingModal}
                            className="px-6 py-3 bg-white text-indigo-600 rounded-xl font-bold hover:bg-indigo-50 transition flex items-center gap-2"
                        >
                            Ver Planes
                            <ArrowRight size={20} />
                        </button>
                    </div>
                </Card>
            )}
        </div>
    );
};

export default UsageDashboard;

