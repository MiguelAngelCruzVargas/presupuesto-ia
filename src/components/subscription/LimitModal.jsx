import React from 'react';
import { X, Crown, AlertCircle, ArrowRight } from 'lucide-react';
import { SubscriptionService } from '../../services/SubscriptionService';
import { usePricingModal } from '../../context/PricingModalContext';

const LimitModal = ({ isOpen, onClose, actionType, usage, limit }) => {
    const { openPricingModal } = usePricingModal();

    if (!isOpen) return null;

    const message = SubscriptionService.getLimitMessage(actionType, SubscriptionService.PLANS.FREE);

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 relative">
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 text-slate-400 hover:text-slate-600"
                >
                    <X size={24} />
                </button>

                <div className="text-center mb-6">
                    <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-amber-500 to-orange-500 rounded-full mb-4">
                        <AlertCircle className="text-white" size={32} />
                    </div>
                    <h2 className="text-2xl font-bold text-slate-900 mb-2">
                        Límite Alcanzado
                    </h2>
                    <p className="text-slate-600">
                        {message}
                    </p>
                </div>

                {/* Usage Stats */}
                <div className="bg-slate-50 rounded-xl p-4 mb-6">
                    <div className="flex justify-between items-center mb-2">
                        <span className="text-sm text-slate-600">Uso actual</span>
                        <span className="text-sm font-bold text-slate-900">
                            {usage} / {limit}
                        </span>
                    </div>
                    <div className="w-full bg-slate-200 rounded-full h-2">
                        <div
                            className="bg-gradient-to-r from-amber-500 to-orange-500 h-2 rounded-full"
                            style={{ width: '100%' }}
                        ></div>
                    </div>
                </div>

                {/* Features Comparison */}
                <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl p-4 mb-6">
                    <div className="flex items-center gap-2 mb-3">
                        <Crown className="text-purple-600" size={20} />
                        <span className="font-bold text-purple-900">Con Pro obtienes:</span>
                    </div>
                    <ul className="space-y-2 text-sm text-purple-800">
                        <li>• Uso ilimitado de todas las funciones</li>
                        <li>• Presupuestos ilimitados</li>
                        <li>• IA ilimitada</li>
                        <li>• Bitácoras y reportes ilimitados</li>
                        <li>• Soporte prioritario</li>
                    </ul>
                </div>

                {/* Actions */}
                <div className="flex flex-col gap-3">
                    <button
                        onClick={() => {
                            onClose();
                            openPricingModal();
                        }}
                        className="w-full py-3 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white rounded-xl font-bold transition shadow-lg shadow-indigo-500/50 flex items-center justify-center gap-2"
                    >
                        <Crown size={20} />
                        Ver Planes y Precios
                        <ArrowRight size={20} />
                    </button>
                    <button
                        onClick={onClose}
                        className="w-full py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-medium transition"
                    >
                        Cerrar
                    </button>
                </div>
            </div>
        </div>
    );
};

export default LimitModal;

