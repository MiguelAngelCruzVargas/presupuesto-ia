import React from 'react';
import { X, Check, Zap, Crown, ArrowRight, Sparkles, Shield, CheckCircle, Smartphone } from 'lucide-react';
import { renderMarkdown } from '../../utils/markdownRenderer';
import { useSubscription } from '../../context/SubscriptionContext';
import { SubscriptionService } from '../../services/SubscriptionService';

const PricingModal = ({ isOpen, onClose, previewData = null }) => {
    const { plan } = useSubscription();
    const [pricingData, setPricingData] = React.useState(null);
    const [loading, setLoading] = React.useState(true);
    const [showPayment, setShowPayment] = React.useState(false);

    React.useEffect(() => {
        const loadData = async () => {
            if (previewData) {
                setPricingData(previewData);
                setLoading(false);
                return;
            }

            try {
                const data = await SubscriptionService.getPricingData();
                setPricingData(data);
            } catch (error) {
                console.error('Error loading pricing data:', error);
            } finally {
                setLoading(false);
            }
        };

        if (isOpen) {
            loadData();
        }
    }, [isOpen, previewData]);

    // Reset payment view when modal closes or opens
    React.useEffect(() => {
        if (!isOpen) {
            setShowPayment(false);
        }
    }, [isOpen]);

    if (!isOpen) return null;

    // Default features as fallback
    const defaultFeatures = {
        free: [],
        pro: []
    };

    const plans = [
        {
            id: 'free',
            name: 'Gratis',
            price: 0,
            description: pricingData?.free?.description || 'Perfecto para probar la plataforma',
            icon: Zap,
            iconBg: 'bg-blue-100',
            iconColor: 'text-blue-600',
            borderColor: 'border-slate-200',
            hoverBorder: 'hover:border-blue-300',
            features: (pricingData?.free?.features || defaultFeatures.free).map(text => ({ text, included: true }))
        },
        {
            id: 'pro',
            name: 'Pro',
            price: pricingData?.pro?.price || 299,
            description: pricingData?.pro?.description || 'Para profesionales que necesitan más',
            icon: Crown,
            iconBg: 'bg-indigo-100',
            iconColor: 'text-indigo-600',
            borderColor: 'border-indigo-500',
            hoverBorder: 'hover:border-indigo-600',
            popular: true,
            features: (pricingData?.pro?.features || defaultFeatures.pro).map(text => ({ text, included: true }))
        }
    ];

    const handleUpgrade = (planId) => {
        if (planId === 'pro') {
            setShowPayment(true);
        } else {
            // Logic for downgrading to free if needed
            console.log('Downgrade to free requested');
        }
    };

    const handleCopyInstructions = () => {
        const textToCopy = pricingData?.bankDetails || '';
        navigator.clipboard.writeText(textToCopy);
        // Could add a toast here but for now just simple copy
    };

    const handleWhatsAppClick = () => {
        const text = encodeURIComponent(`Hola, acabo de realizar mi transferencia para el Plan Pro. Mi correo es: [TU CORREO AQUÍ]`);
        window.open(`https://wa.me/5216677981504?text=${text}`, '_blank');
    };

    if (showPayment) {
        return (
            <div
                className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-md animate-fadeIn"
                onClick={onClose}
            >
                <div
                    className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl max-w-lg w-full overflow-hidden flex flex-col border border-slate-200 dark:border-slate-800"
                    onClick={(e) => e.stopPropagation()}
                >
                    <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-6 text-white text-center relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl translate-x-1/2 -translate-y-1/2"></div>
                        <h2 className="text-2xl font-bold relative z-10">¡Excelente Elección! 🚀</h2>
                        <p className="text-indigo-100 text-sm relative z-10">Estás a un paso de activar tu cuenta Pro</p>
                        <button onClick={() => setShowPayment(false)} className="absolute top-4 left-4 text-white/70 hover:text-white transition z-50">
                            <ArrowRight className="rotate-180" size={20} />
                        </button>
                    </div>

                    <div className="p-8 space-y-6">
                        <div className="bg-yellow-50 dark:bg-yellow-900/10 border border-yellow-200 dark:border-yellow-800 rounded-xl p-4">
                            <p className="text-sm text-yellow-800 dark:text-yellow-200 text-center">
                                Por el momento los pagos son <strong>manuales vía transferencia</strong>.
                            </p>
                        </div>

                        <div className="space-y-2">
                            <div className="flex justify-between items-center mb-2">
                                <h3 className="font-bold text-slate-700 dark:text-slate-300 uppercase text-xs tracking-wider">Instrucciones de Pago</h3>
                                <button
                                    onClick={handleCopyInstructions}
                                    className="text-xs text-indigo-600 hover:text-indigo-700 font-bold flex items-center gap-1 bg-indigo-50 px-2 py-1 rounded-full transition-colors"
                                >
                                    COPIAR DATOS
                                </button>
                            </div>
                            <div className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 p-5 rounded-2xl text-left text-sm leading-relaxed text-slate-700 dark:text-slate-300">
                                {renderMarkdown(pricingData?.bankDetails || 'Datos bancarios no configurados. Contacta a soporte.')}
                            </div>
                        </div>

                        <div className="pt-2">
                            <button
                                onClick={handleWhatsAppClick}
                                className="w-full bg-[#25D366] hover:bg-[#20bd5a] text-white font-bold py-3.5 rounded-xl flex items-center justify-center gap-2 transition-transform hover:-translate-y-0.5 shadow-lg shadow-green-500/20"
                            >
                                <Smartphone size={20} />
                                Enviar Comprobante por WhatsApp
                            </button>
                            <p className="text-xs text-center text-slate-400 mt-3">
                                Tu cuenta será activada manualmente en cuanto verifiquemos tu pago.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-md animate-fadeIn"
            onClick={onClose}
        >
            <div
                className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col transform transition-all scale-100 border border-slate-200 dark:border-slate-800"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Compact Header */}
                <div className="relative bg-gradient-to-r from-blue-700 via-indigo-700 to-purple-700 text-white p-6 overflow-hidden shrink-0">
                    {/* Decorative background shapes */}
                    <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-2xl"></div>
                    <div className="absolute bottom-0 left-0 w-32 h-32 bg-purple-500/20 rounded-full translate-y-1/2 -translate-x-1/2 blur-xl"></div>

                    <button
                        onClick={onClose}
                        className="absolute top-4 right-4 text-white/70 hover:text-white transition p-2 hover:bg-white/10 rounded-full z-50"
                    >
                        <X size={20} />
                    </button>

                    <div className="flex flex-col items-center text-center relative z-10">
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 text-xs font-medium mb-3 text-blue-100">
                            <Sparkles size={12} className="text-yellow-300" />
                            <span>Sube de nivel tu productividad</span>
                        </div>
                        <h2 className="text-2xl md:text-3xl font-bold mb-1 tracking-tight">Elige tu Plan Ideal</h2>
                        <p className="text-blue-100 text-sm max-w-lg mx-auto leading-relaxed opacity-90">
                            Desbloquea todo el potencial de la IA para tus presupuestos
                        </p>
                    </div>
                </div>

                {/* Scrollable Content */}
                <div className="flex-1 overflow-y-auto p-6 md:p-8 bg-slate-50 dark:bg-slate-950/50">
                    <div className="grid md:grid-cols-2 gap-6 max-w-3xl mx-auto items-start">
                        {plans.map((planOption) => {
                            const Icon = planOption.icon;
                            const isCurrentPlan = plan.id === planOption.id;
                            const isPro = planOption.id === 'pro';

                            return (
                                <div
                                    key={planOption.id}
                                    className={`relative rounded-2xl transition-all duration-300 ${isPro
                                        ? 'bg-white dark:bg-slate-900 border-2 border-indigo-500 shadow-xl shadow-indigo-500/10 scale-[1.02] md:-mt-2 z-10'
                                        : 'bg-white/80 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md'
                                        }`}
                                >
                                    {isPro && (
                                        <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 z-20">
                                            <span className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-3 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider shadow-lg border border-white/20">
                                                Recomendado
                                            </span>
                                        </div>
                                    )}

                                    <div className={`p-6 ${isPro ? 'pt-8' : ''}`}>
                                        <div className="flex justify-between items-start mb-4">
                                            <div>
                                                <h3 className={`text-lg font-bold ${isPro ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-700 dark:text-slate-300'}`}>
                                                    {planOption.name}
                                                </h3>
                                                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 min-h-[32px] md:min-h-0">
                                                    {planOption.description}
                                                </p>
                                            </div>
                                            <div className={`p-2.5 rounded-xl ${planOption.iconBg} ${planOption.iconColor}`}>
                                                <Icon size={20} />
                                            </div>
                                        </div>

                                        <div className="flex items-baseline gap-1 mb-6">
                                            <span className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
                                                ${planOption.price}
                                            </span>
                                            {planOption.price > 0 && (
                                                <span className="text-slate-500 text-sm font-medium">/mes</span>
                                            )}
                                        </div>

                                        <button
                                            onClick={isCurrentPlan ? undefined : () => handleUpgrade(planOption.id)}
                                            disabled={isCurrentPlan}
                                            className={`w-full py-2.5 rounded-lg text-sm font-bold transition-all mb-6 flex items-center justify-center gap-2 ${isCurrentPlan
                                                ? 'bg-slate-100 dark:bg-slate-800 text-slate-400 cursor-default'
                                                : isPro
                                                    ? 'bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40 transform hover:-translate-y-0.5'
                                                    : 'bg-white border-2 border-slate-200 hover:border-slate-300 text-slate-600 hover:text-slate-800'
                                                }`}
                                        >
                                            {isCurrentPlan ? (
                                                <>Plan Actual <CheckCircle size={14} /></>
                                            ) : isPro ? (
                                                <>Actualizar Ahora <Sparkles size={14} /></>
                                            ) : (
                                                'Continuar Gratis'
                                            )}
                                        </button>

                                        <div className="space-y-3">
                                            <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                                                Incluye:
                                            </div>
                                            {planOption.features.map((feature, index) => (
                                                <div key={index} className="flex items-start gap-2.5 group">
                                                    <div className={`mt-0.5 shrink-0 w-4 h-4 rounded-full flex items-center justify-center ${isPro ? 'bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400' : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
                                                        }`}>
                                                        <Check size={10} strokeWidth={3} />
                                                    </div>
                                                    <span className={`text-sm ${isPro ? 'text-slate-700 dark:text-slate-200 font-medium' : 'text-slate-600 dark:text-slate-400'}`}>
                                                        {feature.text}
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Footer Minimal */}
                <div className="p-4 bg-slate-50 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 text-center">
                    <p className="text-xs text-slate-400 dark:text-slate-500 flex items-center justify-center gap-4">
                        <span className="flex items-center gap-1"><Shield size={12} /> Pago Seguro</span>
                        <span className="flex items-center gap-1"><Zap size={12} /> Cancelación en cualquier momento</span>
                    </p>
                </div>
            </div>
        </div>
    );
};

export default PricingModal;
