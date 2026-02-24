import React, { useState, useEffect } from 'react';
import { TrendingUp, Sparkles, AlertCircle } from 'lucide-react';
import { AIBudgetService } from '../../services/AIBudgetService';

const AIPriceHelper = ({ itemData, catalogData, onSuggestionClick }) => {
    const [suggestion, setSuggestion] = useState(null);
    const [loading, setLoading] = useState(false);
    const [visible, setVisible] = useState(false);

    // Removed auto-fetch useEffect to prevent rate limit errors

    const fetchSuggestion = async () => {
        setLoading(true);
        try {
            const result = await AIBudgetService.suggestPrice(itemData, catalogData);
            setSuggestion(result);
            setVisible(true);
        } catch (error) {
            console.error('Error fetching price suggestion:', error);
            setVisible(false);
        } finally {
            setLoading(false);
        }
    };

    const getConfidenceColor = (confidence) => {
        switch (confidence) {
            case 'high': return 'text-green-600 bg-green-50 border-green-200';
            case 'medium': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
            case 'low': return 'text-orange-600 bg-orange-50 border-orange-200';
            default: return 'text-slate-600 bg-slate-50 border-slate-200';
        }
    };

    const getConfidenceLabel = (confidence) => {
        switch (confidence) {
            case 'high': return 'Alta confianza';
            case 'medium': return 'Confianza media';
            case 'low': return 'Baja confianza';
            default: return 'Sin datos';
        }
    };

    if (!visible || !suggestion) {
        return (
            <button
                onClick={fetchSuggestion}
                disabled={loading}
                className="mt-1 text-xs flex items-center gap-1 text-purple-600 hover:text-purple-700 font-medium transition-colors"
                title="Consultar precio sugerido con IA"
            >
                {loading ? (
                    <span className="animate-spin">⏳</span>
                ) : (
                    <Sparkles size={14} />
                )}
                {loading ? 'Analizando...' : 'Sugerir Precio'}
            </button>
        );
    }

    if (suggestion.suggested === null) {
        return (
            <div className="mt-2 p-3 bg-slate-50 border border-slate-200 rounded-lg text-sm relative group">
                <button
                    onClick={() => setVisible(false)}
                    className="absolute top-1 right-1 text-slate-400 hover:text-slate-600"
                >
                    ×
                </button>
                <div className="flex items-center gap-2 text-slate-600">
                    <AlertCircle size={16} />
                    <span>{suggestion.message}</span>
                </div>
            </div>
        );
    }

    return (
        <div className="mt-2 p-3 bg-gradient-to-r from-purple-50 to-indigo-50 border border-purple-200 rounded-lg">
            <div className="flex items-start gap-3">
                <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-purple-600 rounded-lg flex items-center justify-center">
                        <Sparkles size={16} className="text-white" />
                    </div>
                </div>

                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                        <span className="text-sm font-semibold text-purple-900">
                            Sugerencia de IA
                        </span>
                        <span className={`text-xs px-2 py-0.5 rounded-full border ${getConfidenceColor(suggestion.confidence)}`}>
                            {getConfidenceLabel(suggestion.confidence)}
                        </span>
                    </div>

                    <div className="space-y-2">
                        {/* Suggested Price */}
                        <div>
                            <button
                                onClick={() => onSuggestionClick(suggestion.suggested)}
                                className="text-lg font-bold text-purple-600 hover:text-purple-700 transition"
                            >
                                ${suggestion.suggested.toFixed(2)}
                            </button>
                            <span className="text-xs text-slate-500 ml-2">
                                (Click para usar)
                            </span>
                        </div>

                        {/* Price Range */}
                        <div className="flex items-center gap-2 text-xs text-slate-600">
                            <TrendingUp size={14} />
                            <span>
                                Rango típico: ${suggestion.min.toFixed(2)} - ${suggestion.max.toFixed(2)}
                            </span>
                        </div>

                        {/* Similar Items Count */}
                        {suggestion.similarCount > 0 && (
                            <div className="text-xs text-slate-500">
                                Basado en {suggestion.similarCount} partida{suggestion.similarCount !== 1 ? 's' : ''} similar{suggestion.similarCount !== 1 ? 'es' : ''} del catálogo
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AIPriceHelper;
