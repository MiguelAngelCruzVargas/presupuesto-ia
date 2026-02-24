import React, { useState } from 'react';
import { Sparkles, Loader, X, Check } from 'lucide-react';
import { AIBudgetService } from '../../services/AIBudgetService';

const AIDescriptionGenerator = ({ itemData, context, onSelect, onClose }) => {
    const [loading, setLoading] = useState(false);
    const [suggestions, setSuggestions] = useState([]);
    const [error, setError] = useState('');
    const [selectedIndex, setSelectedIndex] = useState(null);

    const generateSuggestions = async () => {
        setLoading(true);
        setError('');
        setSuggestions([]);

        try {
            const descriptions = await AIBudgetService.generateDescription(itemData, context);
            setSuggestions(descriptions);
        } catch (err) {
            console.error('Error generating descriptions:', err);
            setError(err.message || 'Error al generar descripciones');
        } finally {
            setLoading(false);
        }
    };

    const handleSelect = (description, index) => {
        setSelectedIndex(index);
        onSelect(description);
    };

    React.useEffect(() => {
        // Always try to generate, error handling will catch if service is down
        generateSuggestions();
    }, []);

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-hidden flex flex-col">
                {/* Header */}
                <div className="bg-gradient-to-r from-purple-600 to-indigo-600 p-6 text-white">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <Sparkles size={24} />
                            <div>
                                <h3 className="text-xl font-bold">Generador de Descripciones IA</h3>
                                <p className="text-purple-100 text-sm">Powered by Gemini AI</p>
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            className="hover:bg-white/20 p-2 rounded-lg transition"
                        >
                            <X size={20} />
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6">
                    {/* Item Info */}
                    <div className="bg-slate-50 rounded-lg p-4 mb-6">
                        <h4 className="font-semibold text-slate-700 mb-2">Información de la partida:</h4>
                        <div className="grid grid-cols-2 gap-2 text-sm">
                            {itemData.code && (
                                <div>
                                    <span className="text-slate-500">Código:</span>
                                    <span className="ml-2 font-medium">{itemData.code}</span>
                                </div>
                            )}
                            {itemData.unit && (
                                <div>
                                    <span className="text-slate-500">Unidad:</span>
                                    <span className="ml-2 font-medium">{itemData.unit}</span>
                                </div>
                            )}
                            {itemData.category && (
                                <div>
                                    <span className="text-slate-500">Categoría:</span>
                                    <span className="ml-2 font-medium">{itemData.category}</span>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Loading State */}
                    {loading && (
                        <div className="flex flex-col items-center justify-center py-12">
                            <Loader className="animate-spin text-purple-600 mb-4" size={40} />
                            <p className="text-slate-600">Generando descripciones profesionales...</p>
                        </div>
                    )}

                    {/* Error State */}
                    {error && (
                        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
                            <p className="text-red-700 text-sm">{error}</p>
                            {error.includes('API key') && (
                                <p className="text-red-600 text-xs mt-2">
                                    Configura tu API key de Gemini en el archivo .env
                                </p>
                            )}
                        </div>
                    )}

                    {/* Suggestions */}
                    {suggestions.length > 0 && (
                        <div className="space-y-3">
                            <h4 className="font-semibold text-slate-700 mb-3">
                                Selecciona una descripción:
                            </h4>
                            {suggestions.map((description, index) => (
                                <button
                                    key={index}
                                    onClick={() => handleSelect(description, index)}
                                    className={`w-full text-left p-4 rounded-lg border-2 transition-all ${selectedIndex === index
                                        ? 'border-purple-600 bg-purple-50'
                                        : 'border-slate-200 hover:border-purple-300 bg-white'
                                        }`}
                                >
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2 mb-1">
                                                <span className="text-xs font-semibold text-purple-600 bg-purple-100 px-2 py-1 rounded">
                                                    Opción {index + 1}
                                                </span>
                                            </div>
                                            <p className="text-slate-800">{description}</p>
                                        </div>
                                        {selectedIndex === index && (
                                            <Check className="text-purple-600 flex-shrink-0" size={20} />
                                        )}
                                    </div>
                                </button>
                            ))}
                        </div>
                    )}

                    {/* Retry Button */}
                    {!loading && suggestions.length > 0 && (
                        <button
                            onClick={generateSuggestions}
                            className="mt-4 w-full py-2 text-purple-600 hover:bg-purple-50 rounded-lg transition font-medium text-sm"
                        >
                            🔄 Generar nuevas opciones
                        </button>
                    )}
                </div>

                {/* Footer */}
                <div className="border-t border-slate-200 p-4 bg-slate-50">
                    <div className="flex gap-3 justify-end">
                        <button
                            onClick={onClose}
                            className="px-4 py-2 text-slate-600 hover:bg-slate-200 rounded-lg transition"
                        >
                            Cancelar
                        </button>
                        <button
                            onClick={onClose}
                            disabled={selectedIndex === null}
                            className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            Usar descripción seleccionada
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AIDescriptionGenerator;
