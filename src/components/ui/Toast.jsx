import React, { useState, useEffect } from 'react';
import { CheckCircle, Info, X, MessageCircle, AlertTriangle } from 'lucide-react';
import { useError } from '../../context/ErrorContext';

const Toast = ({ message, type, onClose, error = null }) => {
    const [isReporting, setIsReporting] = useState(false);
    const errorContext = useError(); // Usar hook directamente, retorna funciones vacías si no está disponible

    // Si es un error, intentar obtener el último error del contexto si no se pasó uno
    const lastError = errorContext.getLastError ? errorContext.getLastError() : null;
    const displayError = error || (type === 'error' && lastError) || null;

    // Si es un error, registrarlo automáticamente
    useEffect(() => {
        if (type === 'error' && displayError && errorContext && errorContext.logError) {
            errorContext.logError(displayError, {
                source: 'Toast',
                message: message,
                timestamp: new Date().toISOString()
            });
        }
    }, [type, displayError, message, errorContext]);

    const handleReportError = () => {
        if (!displayError && !lastError) return;
        
        setIsReporting(true);
        // Abrir el chat de soporte automáticamente
        // El chat detectará el error automáticamente
        window.dispatchEvent(new CustomEvent('openSupportChat', { 
            detail: { errorReport: true } 
        }));
        
        setTimeout(() => {
            setIsReporting(false);
            onClose();
        }, 500);
    };

    const isErrorType = type === 'error' || type === 'warning';

    return (
        <div className={`fixed bottom-6 right-6 z-50 min-w-[300px] max-w-md rounded-xl shadow-2xl border animate-slideIn ${
            type === 'success' 
                ? 'bg-emerald-600 text-white border-emerald-500' 
                : type === 'error'
                ? 'bg-red-600 text-white border-red-500'
                : type === 'warning'
                ? 'bg-amber-600 text-white border-amber-500'
                : 'bg-slate-800 text-white border-slate-700'
        }`}>
            <div className="p-4">
                <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 mt-0.5">
                        {type === 'success' ? (
                            <CheckCircle size={20} />
                        ) : isErrorType ? (
                            <AlertTriangle size={20} />
                        ) : (
                            <Info size={20} />
                        )}
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm leading-relaxed">{message}</p>
                        
                        {/* Botón para reportar error */}
                        {isErrorType && (displayError || lastError) && (
                            <button
                                onClick={handleReportError}
                                disabled={isReporting}
                                className="mt-3 w-full bg-white/20 hover:bg-white/30 text-white text-xs font-medium py-2 px-3 rounded-lg transition flex items-center justify-center gap-2 disabled:opacity-50"
                            >
                                <MessageCircle size={14} />
                                {isReporting ? 'Abriendo soporte...' : 'Reportar este error'}
                            </button>
                        )}
                    </div>
                    <button 
                        onClick={onClose} 
                        className="flex-shrink-0 opacity-70 hover:opacity-100 transition p-1 -mt-1 -mr-1"
                    >
                        <X size={16} />
                    </button>
                </div>
            </div>
        </div>
    );
};

export default Toast;
