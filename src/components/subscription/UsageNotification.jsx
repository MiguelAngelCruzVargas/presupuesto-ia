import React, { useEffect, useState } from 'react';
import { useSubscription } from '../../context/SubscriptionContext';
import { AlertTriangle, X, Crown, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { SubscriptionService } from '../../services/SubscriptionService';
import { usePricingModal } from '../../context/PricingModalContext';

const UsageNotification = () => {
    const { plan, usage, isPro } = useSubscription();
    const navigate = useNavigate();
    const { openPricingModal } = usePricingModal();
    const [warnings, setWarnings] = useState([]);
    const [dismissed, setDismissed] = useState({});

    useEffect(() => {
        if (isPro) return; // No mostrar notificaciones para usuarios Pro

        const newWarnings = [];
        Object.keys(plan.limits).forEach(key => {
            const limit = plan.limits[key];
            const current = usage[key] || 0;
            
            if (limit !== -1) {
                const percentage = (current / limit) * 100;
                
                // Mostrar advertencia si está entre 80% y 100%
                if (percentage >= 80 && percentage < 100 && !dismissed[key]) {
                    const limitName = {
                        budgets: 'Presupuestos',
                        aiGenerations: 'Generaciones con IA',
                        aiDescriptions: 'Descripciones con IA',
                        aiPriceSuggestions: 'Sugerencias de Precio',
                        bitacoraEntries: 'Bitácoras',
                        photoReports: 'Reportes Fotográficos',
                        pdfExports: 'Exportaciones PDF',
                        catalogItems: 'Items en Catálogo'
                    }[key] || key;

                    newWarnings.push({
                        key,
                        name: limitName,
                        current,
                        limit,
                        percentage: Math.round(percentage),
                        remaining: limit - current
                    });
                }
            }
        });

        setWarnings(newWarnings);
    }, [plan, usage, isPro, dismissed]);

    const handleDismiss = (key) => {
        setDismissed(prev => ({ ...prev, [key]: true }));
    };

    if (isPro || warnings.length === 0) return null;

    return (
        <div className="fixed bottom-4 right-4 z-50 space-y-3 max-w-md">
            {warnings.map((warning) => (
                <div
                    key={warning.key}
                    className="bg-white rounded-xl shadow-2xl border-2 border-amber-200 p-4 animate-slide-up"
                >
                    <div className="flex items-start gap-3">
                        <div className="p-2 bg-amber-100 rounded-lg">
                            <AlertTriangle className="text-amber-600" size={20} />
                        </div>
                        <div className="flex-1">
                            <h4 className="font-bold text-slate-900 mb-1">
                                Límite cercano: {warning.name}
                            </h4>
                            <p className="text-sm text-slate-600 mb-2">
                                Has usado {warning.current} de {warning.limit} ({warning.percentage}%). 
                                Te quedan {warning.remaining} usos.
                            </p>
                            <div className="w-full bg-slate-200 rounded-full h-2 mb-3">
                                <div
                                    className="bg-amber-500 h-2 rounded-full transition-all"
                                    style={{ width: `${warning.percentage}%` }}
                                ></div>
                            </div>
                            <div className="flex gap-2">
                                <button
                                    onClick={openPricingModal}
                                    className="flex-1 px-3 py-1.5 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white rounded-lg text-xs font-bold transition flex items-center justify-center gap-1"
                                >
                                    <Crown size={14} />
                                    Actualizar
                                </button>
                                <button
                                    onClick={() => navigate('/usage')}
                                    className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-medium transition"
                                >
                                    Ver Detalles
                                </button>
                            </div>
                        </div>
                        <button
                            onClick={() => handleDismiss(warning.key)}
                            className="text-slate-400 hover:text-slate-600 transition"
                        >
                            <X size={18} />
                        </button>
                    </div>
                </div>
            ))}
        </div>
    );
};

export default UsageNotification;

