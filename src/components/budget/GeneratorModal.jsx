import React, { useState } from 'react';
import { Ruler, Calculator, Check, X, ArrowRight, BrainCircuit } from 'lucide-react';
import { AIBudgetService } from '../../services/AIBudgetService';

const GeneratorModal = ({ isOpen, onClose, onApply, item }) => {
    const [description, setDescription] = useState('');
    const [isCalculating, setIsCalculating] = useState(false);
    const [result, setResult] = useState(null);
    const [error, setError] = useState(null);

    if (!isOpen) return null;

    const handleCalculate = async () => {
        if (!description.trim()) return;

        setIsCalculating(true);
        setError(null);
        setResult(null);

        try {
            const data = await AIBudgetService.calculateVolume(description, item.unit);
            setResult(data);
        } catch (err) {
            setError('No se pudo calcular el volumen. Intenta ser más específico.');
        } finally {
            setIsCalculating(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm animate-fadeIn">
            <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden transform transition-all scale-100">
                {/* Header */}
                <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-gradient-to-r from-indigo-600 to-purple-600 text-white">
                    <h3 className="font-bold flex items-center text-lg">
                        <Ruler className="mr-2 text-indigo-200" /> Generador Inteligente
                    </h3>
                    <button
                        onClick={onClose}
                        className="text-white/60 hover:text-white hover:bg-white/10 p-1 rounded-full transition"
                    >
                        <X size={20} />
                    </button>
                </div>

                <div className="p-6 space-y-6">
                    {/* Item Context */}
                    <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                        <p className="text-xs text-slate-500 uppercase font-bold mb-1">Concepto</p>
                        <p className="text-sm font-medium text-slate-800 line-clamp-2">{item.description || 'Sin descripción'}</p>
                        <div className="flex items-center gap-2 mt-2">
                            <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded font-bold">Unidad: {item.unit}</span>
                        </div>
                    </div>

                    {/* Input Area */}
                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-2">Describe las medidas o el área</label>
                        <textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="Ej: Muro de 5 metros de largo por 3 metros de alto..."
                            className="w-full p-3 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition resize-none text-slate-700"
                            rows={3}
                        />
                        <p className="text-xs text-slate-400 mt-1 text-right">La IA detectará las dimensiones y calculará el total.</p>
                    </div>

                    {/* Action Button */}
                    {!result && (
                        <button
                            onClick={handleCalculate}
                            disabled={isCalculating || !description.trim()}
                            className={`w-full py-3 rounded-xl font-bold flex items-center justify-center transition shadow-lg ${isCalculating || !description.trim()
                                    ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                                    : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-500/30'
                                }`}
                        >
                            {isCalculating ? (
                                <>
                                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></div>
                                    Calculando...
                                </>
                            ) : (
                                <>
                                    <BrainCircuit size={18} className="mr-2" /> Calcular Cantidad
                                </>
                            )}
                        </button>
                    )}

                    {/* Error Message */}
                    {error && (
                        <div className="p-3 bg-red-50 text-red-600 text-sm rounded-lg border border-red-100 flex items-center">
                            <X size={16} className="mr-2 shrink-0" /> {error}
                        </div>
                    )}

                    {/* Result Area */}
                    {result && (
                        <div className="bg-emerald-50 rounded-xl border border-emerald-100 overflow-hidden animate-fadeIn">
                            <div className="p-4 border-b border-emerald-100/50">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <p className="text-xs text-emerald-600 font-bold uppercase mb-1">Resultado Calculado</p>
                                        <div className="flex items-baseline gap-1">
                                            <span className="text-3xl font-bold text-emerald-700">{result.result}</span>
                                            <span className="text-sm font-medium text-emerald-600">{item.unit}</span>
                                        </div>
                                    </div>
                                    <div className="bg-white p-2 rounded-lg shadow-sm">
                                        <code className="text-xs font-mono text-slate-600 block bg-slate-50 px-2 py-1 rounded mb-1 border border-slate-100">
                                            {result.formula}
                                        </code>
                                    </div>
                                </div>
                                <p className="text-sm text-emerald-800 mt-3 italic">
                                    "{result.explanation}"
                                </p>
                            </div>
                            <div className="p-3 bg-emerald-100/50 flex gap-3">
                                <button
                                    onClick={() => setResult(null)}
                                    className="flex-1 py-2 text-emerald-700 font-bold text-sm hover:bg-emerald-100 rounded-lg transition"
                                >
                                    Recalcular
                                </button>
                                <button
                                    onClick={() => onApply(result.result)}
                                    className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm rounded-lg shadow-sm transition flex items-center justify-center"
                                >
                                    <Check size={16} className="mr-1" /> Aplicar Cantidad
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default GeneratorModal;
