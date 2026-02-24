import React, { useEffect, useState } from 'react';
import { Clock, AlertTriangle, X } from 'lucide-react';

const RateLimitModal = ({ isOpen, onClose, message, retryAfter }) => {
    const [timeLeft, setTimeLeft] = useState(retryAfter || 0);

    useEffect(() => {
        setTimeLeft(retryAfter || 0);
    }, [retryAfter]);

    useEffect(() => {
        if (!isOpen || timeLeft <= 0) return;

        const timer = setInterval(() => {
            setTimeLeft((prev) => {
                if (prev <= 1) {
                    clearInterval(timer);
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        return () => clearInterval(timer);
    }, [isOpen, timeLeft]);

    if (!isOpen) return null;

    const formatTime = (seconds) => {
        if (seconds < 60) return `${seconds}s`;
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;
        return `${minutes}m ${remainingSeconds}s`;
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl max-w-md w-full overflow-hidden scale-100 animate-in zoom-in-95 duration-200 border border-slate-200 dark:border-slate-700">
                {/* Header */}
                <div className="bg-amber-50 dark:bg-amber-900/20 px-6 py-4 border-b border-amber-100 dark:border-amber-900/50 flex items-center gap-3">
                    <div className="p-2 bg-amber-100 dark:bg-amber-900/50 rounded-full text-amber-600 dark:text-amber-400">
                        <AlertTriangle size={24} />
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">
                            Límite de Uso Alcanzado
                        </h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                            Espera un momento antes de continuar
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="ml-auto text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 space-y-4">
                    <p className="text-slate-600 dark:text-slate-300 text-center">
                        {message || "Has realizado demasiadas solicitudes en poco tiempo. Por favor espera para no saturar el servicio."}
                    </p>

                    {timeLeft > 0 ? (
                        <div className="flex flex-col items-center justify-center p-4 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700">
                            <span className="text-sm text-slate-500 dark:text-slate-400 mb-1">
                                Podrás intentar de nuevo en:
                            </span>
                            <div className="flex items-center gap-2 text-2xl font-mono font-bold text-blue-600 dark:text-blue-400">
                                <Clock size={24} />
                                {formatTime(timeLeft)}
                            </div>
                        </div>
                    ) : (
                        <div className="flex items-center justify-center p-3 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 rounded-lg border border-green-200 dark:border-green-900/50">
                            ¡Ya puedes intentarlo de nuevo!
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="px-6 py-4 bg-slate-50 dark:bg-slate-900/50 border-t border-slate-100 dark:border-slate-800 flex justify-end">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-200 rounded-lg font-medium transition-colors"
                    >
                        Entendido
                    </button>
                </div>
            </div>
        </div>
    );
};

export default RateLimitModal;
