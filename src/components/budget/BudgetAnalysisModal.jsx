import React, { useState, useEffect } from 'react';
import { X, Sparkles, Bot, AlertTriangle, AlertCircle, Info, CheckCircle, ArrowRight } from 'lucide-react';
import { AIBudgetService } from '../../services/AIBudgetService';

const BudgetAnalysisModal = ({ isOpen, onClose, items, projectInfo, onApplyFix }) => {
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [analysisData, setAnalysisData] = useState(null);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (isOpen && items && items.length > 0) {
            analyzeBudget();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isOpen]);

    const analyzeBudget = async () => {
        if (!items || items.length === 0) {
            setError('No hay partidas para analizar');
            return;
        }

        setIsAnalyzing(true);
        setError(null);
        setAnalysisData(null);

        try {
            const result = await AIBudgetService.analyzeBudgetStructured(items, projectInfo);
            setAnalysisData(result);
        } catch (err) {
            console.error('Error analyzing budget:', err);
            setError('Error al analizar el presupuesto. Por favor, intenta de nuevo.');
        } finally {
            setIsAnalyzing(false);
        }
    };

    const handleApplyFix = (alert) => {
        if (onApplyFix && alert.suggestedAction && alert.itemId) {
            onApplyFix(alert.itemId, alert.suggestedAction);
            // Mark alert as fixed locally (optional UI enhancement)
            setAnalysisData(prev => ({
                ...prev,
                alerts: prev.alerts.map(a =>
                    a === alert ? { ...a, fixed: true } : a
                )
            }));
        }
    };

    const handleClose = () => {
        setAnalysisData(null);
        setError(null);
        setIsAnalyzing(false);
        onClose();
    };

    if (!isOpen) return null;

    const getAlertIcon = (type) => {
        switch (type) {
            case 'critical': return <AlertTriangle className="text-red-500" size={20} />;
            case 'warning': return <AlertCircle className="text-amber-500" size={20} />;
            case 'info': return <Info className="text-blue-500" size={20} />;
            default: return <Sparkles className="text-indigo-500" size={20} />;
        }
    };

    const getAlertColor = (type) => {
        switch (type) {
            case 'critical': return 'border-red-100 bg-red-50';
            case 'warning': return 'border-amber-100 bg-amber-50';
            case 'info': return 'border-blue-100 bg-blue-50';
            default: return 'border-slate-100 bg-slate-50';
        }
    };

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm animate-fadeIn">
            <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[85vh] flex flex-col overflow-hidden transform transition-all scale-100">
                {/* Header Premium */}
                <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-gradient-to-r from-slate-900 to-slate-800 text-white">
                    <div className="flex flex-col">
                        <h3 className="font-bold flex items-center text-lg">
                            <Sparkles className="mr-2 text-amber-400" /> Auditoría Inteligente
                        </h3>
                        <span className="text-xs text-slate-400 ml-8 flex items-center">
                            <Bot size={10} className="mr-1" /> Analizando precios para: <strong className="text-slate-200 ml-1">{projectInfo?.location || 'México'}</strong>
                        </span>
                    </div>
                    <button
                        onClick={handleClose}
                        className="text-white/60 hover:text-white hover:bg-white/10 p-1 rounded-full transition"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Content */}
                <div className="p-0 overflow-y-auto flex-1 bg-slate-50">
                    {isAnalyzing ? (
                        <div className="text-center py-12 space-y-6">
                            <div className="relative mx-auto w-16 h-16">
                                <div className="absolute inset-0 bg-indigo-100 rounded-full animate-ping opacity-75"></div>
                                <div className="relative bg-white p-3 rounded-full shadow-sm border border-indigo-100">
                                    <Bot size={40} className="text-indigo-600 animate-bounce" />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <h4 className="text-lg font-bold text-slate-800">Analizando Presupuesto</h4>
                                <p className="text-slate-500">Revisando precios unitarios, rendimientos y coherencia técnica...</p>
                            </div>
                        </div>
                    ) : error ? (
                        <div className="text-center py-12 space-y-4 px-8">
                            <div className="bg-red-50 p-4 rounded-xl border border-red-100 inline-block mb-2">
                                <AlertTriangle className="text-red-500 w-8 h-8 mx-auto" />
                            </div>
                            <div className="text-slate-800 font-bold">{error}</div>
                            <button
                                onClick={analyzeBudget}
                                className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold transition shadow-lg shadow-indigo-200"
                            >
                                Reintentar
                            </button>
                        </div>
                    ) : analysisData ? (
                        <div className="space-y-6 p-6">
                            {/* Summary Card */}
                            {analysisData.summary && (
                                <div className="bg-white p-5 rounded-xl border border-indigo-100 shadow-sm">
                                    <h4 className="text-xs font-bold text-indigo-500 uppercase mb-2 flex items-center">
                                        <Bot size={14} className="mr-1" /> Diagnóstico General
                                    </h4>
                                    <p className="text-slate-700 leading-relaxed">{analysisData.summary}</p>
                                </div>
                            )}

                            {/* Alerts List */}
                            <div className="space-y-3">
                                {analysisData.alerts && analysisData.alerts.length > 0 ? (
                                    analysisData.alerts.map((alert, idx) => (
                                        <div
                                            key={idx}
                                            className={`p-4 rounded-xl border ${getAlertColor(alert.type)} transition-all hover:shadow-md`}
                                        >
                                            <div className="flex gap-3 items-start">
                                                <div className="mt-0.5 shrink-0">
                                                    {alert.fixed ? <CheckCircle className="text-emerald-500" size={20} /> : getAlertIcon(alert.type)}
                                                </div>
                                                <div className="flex-1">
                                                    <h5 className={`font-bold text-sm ${alert.fixed ? 'text-slate-400 line-through' : 'text-slate-800'}`}>
                                                        {alert.title}
                                                    </h5>
                                                    <p className={`text-sm mt-1 ${alert.fixed ? 'text-slate-400' : 'text-slate-600'}`}>
                                                        {alert.message}
                                                    </p>

                                                    {/* Action Button */}
                                                    {!alert.fixed && alert.suggestedAction && (
                                                        <button
                                                            onClick={() => handleApplyFix(alert)}
                                                            className="mt-3 flex items-center gap-2 px-3 py-1.5 bg-white border border-slate-200 hover:border-indigo-300 hover:text-indigo-600 text-slate-600 text-xs font-bold rounded-lg transition shadow-sm group"
                                                        >
                                                            <Sparkles size={12} className="text-indigo-500 group-hover:animate-pulse" />
                                                            {alert.suggestedAction.label || 'Aplicar Corrección'}
                                                            <ArrowRight size={12} className="opacity-0 group-hover:opacity-100 transition-opacity -ml-1 group-hover:ml-0" />
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <div className="text-center py-8 text-slate-400">
                                        <CheckCircle size={48} className="mx-auto mb-2 text-emerald-100" />
                                        <p>No se encontraron problemas críticos.</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    ) : null}
                </div>

                {/* Footer */}
                <div className="p-4 bg-white border-t border-slate-100 flex justify-between items-center">
                    {analysisData && (
                        <button
                            onClick={analyzeBudget}
                            className="px-4 py-2 text-sm text-slate-500 hover:text-slate-700 font-medium transition flex items-center"
                        >
                            <Sparkles size={14} className="mr-1" /> Reanalizar
                        </button>
                    )}
                    <button
                        onClick={handleClose}
                        className="px-6 py-2.5 bg-slate-900 text-white rounded-lg font-bold hover:bg-slate-800 transition shadow-lg shadow-slate-900/20 ml-auto"
                    >
                        Cerrar
                    </button>
                </div>
            </div>
        </div>
    );
};

export default BudgetAnalysisModal;

