import React from 'react';
import { AlertTriangle } from 'lucide-react';

const ConfirmModal = ({ isOpen, onClose, onConfirm, onCancel, title, message, confirmText = 'Confirmar', cancelText = 'Cancelar', type = 'warning' }) => {
    if (!isOpen) return null;

    const handleCancel = () => {
        if (onCancel) {
            onCancel();
        }
        onClose();
    };

    const handleConfirm = () => {
        if (onConfirm) {
            onConfirm();
        }
        onClose();
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm animate-fadeIn">
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden transform transition-all scale-100">
                <div className="p-6 text-center">
                    <div className={`mx-auto flex items-center justify-center h-12 w-12 rounded-full mb-4 ${type === 'danger' ? 'bg-red-100' : type === 'info' ? 'bg-blue-100' : 'bg-amber-100'}`}>
                        <AlertTriangle className={`h-6 w-6 ${type === 'danger' ? 'text-red-600' : type === 'info' ? 'text-blue-600' : 'text-amber-600'}`} />
                    </div>
                    <h3 className="text-lg font-bold text-slate-900 mb-2">{title}</h3>
                    <p className="text-sm text-slate-500 mb-6 whitespace-pre-line">{message}</p>

                    <div className="flex gap-3 justify-center">
                        <button
                            onClick={handleCancel}
                            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-medium transition"
                        >
                            {cancelText}
                        </button>
                        <button
                            onClick={handleConfirm}
                            className={`px-4 py-2 text-white rounded-lg font-bold transition shadow-lg ${type === 'danger'
                                    ? 'bg-red-600 hover:bg-red-700 shadow-red-200'
                                    : type === 'info'
                                    ? 'bg-blue-600 hover:bg-blue-700 shadow-blue-200'
                                    : 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-200'
                                }`}
                        >
                            {confirmText}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ConfirmModal;
