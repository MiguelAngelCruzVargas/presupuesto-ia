import React from 'react';
import { AlertTriangle, Bot, Info, Plus, Sparkles } from 'lucide-react';
import { AI_BUDGET_QUICK_SUGGESTIONS } from '../../config/editorConfig';

const AIBudgetCommandCenter = ({
    aiPrompt,
    isAiLoading,
    onAiPromptChange,
    onGenerateBudget,
    onAnalyzeBudget,
    onQuickSuggestionClick,
}) => {
    return (
        <div className="bg-white dark:bg-slate-800 p-1 rounded-2xl shadow-xl shadow-indigo-100/50 dark:shadow-indigo-900/20 border border-slate-100 dark:border-slate-700 relative overflow-hidden group-focus-within:ring-2 ring-indigo-500/20 transition-all">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 opacity-0 group-focus-within:opacity-100 transition-opacity"></div>
            <div className="p-6">
                <div className="flex flex-col md:flex-row gap-4 items-start">
                    <div className="flex-1 w-full relative">
                        <div className="relative group">
                            <div className="absolute -inset-0.5 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-xl opacity-0 group-focus-within:opacity-20 transition duration-500 blur"></div>
                            <div className="relative flex items-center">
                                <Bot className="absolute left-4 text-indigo-500 w-6 h-6 animate-pulse" />
                                <input
                                    value={aiPrompt}
                                    onChange={(e) => onAiPromptChange(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && onGenerateBudget()}
                                    placeholder="Ej: 'Barda de 20m lineales x 2.5m de alto' (Incluye medidas para calcular cantidades)..."
                                    className="w-full pl-14 pr-4 py-4 bg-slate-50 dark:bg-slate-700 border-2 border-slate-100 dark:border-slate-600 rounded-xl focus:border-indigo-500 dark:focus:border-indigo-400 focus:bg-white dark:focus:bg-slate-600 focus:outline-none focus:ring-0 transition-all text-lg shadow-inner placeholder:text-slate-400 dark:placeholder:text-slate-500 text-slate-700 dark:text-slate-200"
                                />
                            </div>
                            <div className="mt-2 flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 px-2">
                                <Info size={12} className="text-indigo-500" />
                                <span><strong>Tip:</strong> Para obtener cantidades exactas, especifica dimensiones. Ej: <em>"Losa de 100m2"</em> o <em>"Zanja de 50m x 0.60m"</em>.</span>
                            </div>
                        </div>

                        <div className="flex gap-2 mt-3 overflow-x-auto pb-2 scrollbar-hide">
                            {AI_BUDGET_QUICK_SUGGESTIONS.map((suggestion) => (
                                <button
                                    key={suggestion}
                                    onClick={() => onQuickSuggestionClick(suggestion)}
                                    className="px-3 py-1 bg-slate-100 dark:bg-slate-700 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 text-slate-500 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 rounded-full text-xs font-bold transition border border-transparent hover:border-indigo-200 dark:hover:border-indigo-700 whitespace-nowrap flex items-center"
                                >
                                    <Plus size={10} className="mr-1" /> {suggestion}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="flex gap-3 w-full md:w-auto self-start">
                        <button
                            onClick={onGenerateBudget}
                            disabled={isAiLoading}
                            className="flex-1 md:flex-none bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white px-6 py-4 rounded-xl font-bold shadow-lg shadow-indigo-200 transform hover:-translate-y-0.5 transition-all flex items-center justify-center gap-2 min-w-[140px]"
                        >
                            {isAiLoading ? (
                                <>
                                    <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                                    <span>Pensando...</span>
                                </>
                            ) : (
                                <>
                                    <Sparkles size={20} />
                                    <span>Generar</span>
                                </>
                            )}
                        </button>
                        <button
                            onClick={onAnalyzeBudget}
                            className="px-5 py-4 bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-300 border-2 border-slate-200 dark:border-slate-600 rounded-xl font-bold hover:border-amber-400 dark:hover:border-amber-500 hover:text-amber-600 dark:hover:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-900/30 transition flex items-center gap-2"
                            title="Auditar Presupuesto"
                        >
                            <AlertTriangle size={20} />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AIBudgetCommandCenter;
