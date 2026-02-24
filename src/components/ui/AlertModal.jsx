import React from 'react';
import { Info, CheckCircle, AlertCircle, X } from 'lucide-react';

const AlertModal = ({ isOpen, onClose, title, message, type = 'info' }) => {
    if (!isOpen) return null;

    const icons = {
        info: <Info className="h-6 w-6 text-blue-600" />,
        success: <CheckCircle className="h-6 w-6 text-emerald-600" />,
        warning: <AlertCircle className="h-6 w-6 text-amber-600" />,
        error: <AlertCircle className="h-6 w-6 text-red-600" />
    };

    const bgColors = {
        info: 'bg-blue-100',
        success: 'bg-emerald-100',
        warning: 'bg-amber-100',
        error: 'bg-red-100'
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm animate-fadeIn">
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden transform transition-all scale-100">
                <div className="p-6">
                    <div className="flex items-start gap-4">
                        <div className={`flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full ${bgColors[type]}`}>
                            {icons[type]}
                        </div>
                        <div className="flex-1">
                            <div className="flex items-start justify-between mb-2">
                                <h3 className="text-lg font-bold text-slate-900">{title}</h3>
                                <button
                                    onClick={onClose}
                                    className="text-slate-400 hover:text-slate-600 transition p-1 -mt-1 -mr-1"
                                >
                                    <X size={18} />
                                </button>
                            </div>
                            <p className="text-sm text-slate-600 mb-6 whitespace-pre-line">{message}</p>
                            <div className="flex justify-end">
                                <button
                                    onClick={onClose}
                                    className={`px-4 py-2 text-white rounded-lg font-bold transition shadow-lg ${
                                        type === 'error' ? 'bg-red-600 hover:bg-red-700 shadow-red-200' :
                                        type === 'success' ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-200' :
                                        type === 'warning' ? 'bg-amber-600 hover:bg-amber-700 shadow-amber-200' :
                                        'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-200'
                                    }`}
                                >
                                    Aceptar
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AlertModal;

