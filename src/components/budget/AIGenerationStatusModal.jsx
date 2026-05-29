import React from 'react';
import { AlertTriangle, CheckCircle2, X } from 'lucide-react';

const AIGenerationStatusModal = ({ status, onClose }) => {
    if (!status?.isOpen) return null;

    const toneClassName = status.status === 'error'
        ? 'bg-red-500/15 text-red-400'
        : status.status === 'success'
            ? 'bg-emerald-500/15 text-emerald-400'
            : 'bg-indigo-500/15 text-indigo-300';

    const closeButtonClassName = status.status === 'error'
        ? 'bg-red-600 text-white hover:bg-red-700'
        : 'bg-emerald-600 text-white hover:bg-emerald-700';

    return (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-sm animate-fadeIn">
            <div className="w-full max-w-md rounded-3xl border border-slate-700 bg-slate-900 text-white shadow-2xl overflow-hidden">
                <div className="p-6">
                    <div className="flex items-start gap-4">
                        <div className={`mt-0.5 flex h-14 w-14 items-center justify-center rounded-2xl ${toneClassName}`}>
                            {status.status === 'loading' && (
                                <div className="h-6 w-6 animate-spin rounded-full border-2 border-current border-t-transparent" />
                            )}
                            {status.status === 'success' && <CheckCircle2 size={28} />}
                            {status.status === 'error' && <AlertTriangle size={28} />}
                        </div>

                        <div className="flex-1">
                            <div className="flex items-start justify-between gap-3">
                                <div>
                                    <h3 className="text-xl font-bold text-white">{status.title}</h3>
                                    <p className="mt-2 text-sm leading-relaxed text-slate-300">
                                        {status.message}
                                    </p>
                                </div>

                                {status.status !== 'loading' && (
                                    <button
                                        onClick={onClose}
                                        className="rounded-lg p-1 text-slate-400 transition hover:bg-slate-800 hover:text-white"
                                    >
                                        <X size={18} />
                                    </button>
                                )}
                            </div>

                            {status.status === 'loading' && (
                                <div className="mt-5">
                                    <div className="h-2 overflow-hidden rounded-full bg-slate-800">
                                        <div className="h-full w-full origin-left animate-pulse rounded-full bg-gradient-to-r from-indigo-500 via-violet-500 to-fuchsia-500" />
                                    </div>
                                    <p className="mt-3 text-xs uppercase tracking-[0.18em] text-slate-500">
                                        Procesando con IA
                                    </p>
                                </div>
                            )}

                            {status.status !== 'loading' && (
                                <div className="mt-6 flex justify-end">
                                    <button
                                        onClick={onClose}
                                        className={`rounded-xl px-4 py-2 text-sm font-bold transition ${closeButtonClassName}`}
                                    >
                                        Cerrar
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AIGenerationStatusModal;
