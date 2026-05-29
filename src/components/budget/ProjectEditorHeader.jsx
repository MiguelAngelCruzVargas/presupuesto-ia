import React from 'react';
import { CheckCircle2, Clock3, FileText, FolderOpen, Info, Plus, Save, Share2 } from 'lucide-react';
import { APP_CONFIG } from '../../config/appConfig';
import { SELECT_OPTION_CLASS_NAME, SPECIALTY_OPTIONS } from '../../config/editorConfig';

const ProjectEditorHeader = ({
    hasUnsavedChanges,
    isAutoSaving,
    isDemoMode,
    lastSaved,
    projectInfo,
    onProjectInfoChange,
    onStartNewProject,
    onSaveProject,
    isSaving,
    onOpenLoadModal,
    onCreateTemplate,
    onShareProject,
    scheduleFreshness,
    scheduleData,
    technicalDescriptionFreshness,
    technicalDescriptionMeta,
    onOpenCostConcept,
}) => {
    return (
        <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 space-y-6">
            <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4">
                <div className="flex-1 w-full md:w-auto">
                    <label className="block text-xs font-bold text-slate-400 dark:text-slate-400 uppercase mb-1">Proyecto</label>
                    <input
                        value={projectInfo.project || ''}
                        onChange={(e) => onProjectInfoChange({ project: e.target.value })}
                        className="w-full font-bold text-2xl text-slate-800 dark:text-slate-100 bg-transparent border-b border-transparent hover:border-slate-200 dark:hover:border-slate-600 focus:border-blue-500 outline-none placeholder-slate-300 dark:placeholder-slate-500 transition-colors"
                        placeholder="Nombre del Proyecto"
                    />
                </div>
                <div className="flex flex-wrap gap-2 self-stretch xl:self-center xl:justify-end items-center">
                    {hasUnsavedChanges && !isDemoMode && (
                        <div className="flex items-center gap-2 px-3 py-1.5 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 rounded-lg text-sm font-medium border border-amber-300 dark:border-amber-700">
                            <div className="w-2 h-2 bg-amber-500 rounded-full animate-pulse"></div>
                            Sin guardar
                            {isAutoSaving && <span className="text-xs">(Guardando...)</span>}
                        </div>
                    )}
                    {lastSaved && !hasUnsavedChanges && !isDemoMode && (
                        <div className="hidden md:flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                            <CheckCircle2 size={14} className="text-emerald-500" />
                            Guardado {lastSaved.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}
                        </div>
                    )}
                    <button
                        onClick={onStartNewProject}
                        className="flex items-center gap-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 px-4 py-2 rounded-lg transition border border-emerald-200"
                        title="Comenzar un presupuesto nuevo"
                    >
                        <Plus size={18} />
                        <span className="hidden xl:inline">Nuevo</span>
                    </button>
                    <button
                        onClick={() => onSaveProject(false)}
                        disabled={isSaving || isAutoSaving}
                        className={`flex items-center gap-2 ${isDemoMode ? 'bg-amber-500 hover:bg-amber-600' : 'bg-blue-600 hover:bg-blue-700'} text-white px-4 py-2 rounded-lg transition shadow-sm font-medium ${isSaving || isAutoSaving ? 'opacity-50 cursor-not-allowed' : ''}`}
                        title={isDemoMode ? 'Crear cuenta para guardar' : isAutoSaving ? 'Guardando automáticamente...' : hasUnsavedChanges ? 'Guardar cambios' : 'Guardar en Nube'}
                    >
                        {isSaving || isAutoSaving ? (
                            <div className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full" />
                        ) : (
                            <Save size={18} />
                        )}
                        <span className="hidden xl:inline">
                            {isDemoMode ? 'Guardar (Requiere Cuenta)' : isAutoSaving ? 'Guardando...' : 'Guardar'}
                        </span>
                    </button>

                    <button
                        onClick={onOpenLoadModal}
                        className="flex items-center gap-2 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 px-4 py-2 rounded-lg transition"
                        title="Abrir Proyecto"
                    >
                        <FolderOpen size={18} />
                        <span className="hidden xl:inline">Abrir</span>
                    </button>
                    <button
                        onClick={onCreateTemplate}
                        className="flex items-center gap-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 px-4 py-2 rounded-lg transition"
                        title="Guardar como Plantilla"
                    >
                        <FileText size={18} />
                        <span className="hidden xl:inline">Plantilla</span>
                    </button>
                    <button
                        onClick={onShareProject}
                        className="flex items-center gap-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-600 px-4 py-2 rounded-lg transition"
                        title="Compartir con Cliente"
                    >
                        <Share2 size={18} />
                        <span className="hidden xl:inline">Compartir</span>
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 pt-4 border-t border-slate-100">
                <div>
                    <label className="block text-xs font-bold text-slate-400 dark:text-slate-500 uppercase mb-1">Cliente</label>
                    <input
                        value={projectInfo.client || ''}
                        onChange={(e) => onProjectInfoChange({ client: e.target.value })}
                        className="w-full text-slate-600 dark:text-slate-300 bg-transparent border-b border-slate-200 dark:border-slate-600 focus:border-blue-500 outline-none py-1"
                        placeholder="Cliente"
                    />
                </div>
                <div>
                    <label className="block text-xs font-bold text-slate-400 dark:text-slate-500 uppercase mb-1">Ubicación</label>
                    <input
                        value={projectInfo.location || ''}
                        onChange={(e) => onProjectInfoChange({ location: e.target.value })}
                        className="w-full text-slate-600 dark:text-slate-300 bg-transparent border-b border-slate-200 dark:border-slate-600 focus:border-blue-500 outline-none py-1"
                        placeholder="Ciudad, Estado"
                    />
                </div>
                <div>
                    <label className="block text-xs font-bold text-slate-400 dark:text-slate-500 uppercase mb-1">Especialidad</label>
                    <select
                        value={projectInfo.type || 'General'}
                        onChange={(e) => onProjectInfoChange({ type: e.target.value })}
                        className="w-full bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg py-1.5 px-3 text-sm font-medium text-slate-700 dark:text-slate-200 outline-none focus:ring-2 focus:ring-blue-500 dark:[color-scheme:dark]"
                    >
                        {SPECIALTY_OPTIONS.map(option => (
                            <option key={option} value={option} className={SELECT_OPTION_CLASS_NAME}>
                                {option}
                            </option>
                        ))}
                    </select>
                </div>
                <div>
                    <label className="block text-xs font-bold text-slate-400 dark:text-slate-500 uppercase mb-1 flex items-center gap-2">
                        IVA (%)
                        <button
                            onClick={() => onOpenCostConcept('iva')}
                            className="text-slate-400 hover:text-indigo-500 dark:hover:text-indigo-400 transition-colors"
                            title="¿Qué es el IVA y cuándo aplicarlo?"
                        >
                            <Info size={14} />
                        </button>
                    </label>
                    <input
                        type="number"
                        min="0"
                        max="100"
                        value={projectInfo.taxRate ?? 16}
                        onChange={(e) => onProjectInfoChange({ taxRate: parseFloat(e.target.value) || 0 })}
                        className="w-full text-slate-600 dark:text-slate-300 bg-transparent border-b border-slate-200 dark:border-slate-600 focus:border-blue-500 outline-none py-1"
                        placeholder="16"
                    />
                </div>
                <div>
                    <label className="block text-xs font-bold text-slate-400 dark:text-slate-500 uppercase mb-1 flex items-center gap-2">
                        Indirectos (%)
                        <button
                            onClick={() => onOpenCostConcept('indirectos')}
                            className="text-slate-400 hover:text-indigo-500 dark:hover:text-indigo-400 transition-colors"
                            title="¿Qué son los indirectos y cuándo aplicarlos?"
                        >
                            <Info size={14} />
                        </button>
                    </label>
                    <input
                        type="number"
                        min="0"
                        max="100"
                        value={projectInfo.indirect_percentage ?? 0}
                        onChange={(e) => onProjectInfoChange({ indirect_percentage: parseFloat(e.target.value) || 0 })}
                        className="w-full text-slate-600 dark:text-slate-300 bg-transparent border-b border-slate-200 dark:border-slate-600 focus:border-blue-500 outline-none py-1"
                        placeholder="0"
                    />
                </div>
                <div>
                    <label className="block text-xs font-bold text-slate-400 dark:text-slate-500 uppercase mb-1 flex items-center gap-2">
                        Utilidad (%)
                        <button
                            onClick={() => onOpenCostConcept('utilidad')}
                            className="text-slate-400 hover:text-indigo-500 dark:hover:text-indigo-400 transition-colors"
                            title="¿Qué es la utilidad y cuándo aplicarla?"
                        >
                            <Info size={14} />
                        </button>
                    </label>
                    <input
                        type="number"
                        min="0"
                        max="100"
                        value={projectInfo.profit_percentage ?? 0}
                        onChange={(e) => onProjectInfoChange({ profit_percentage: parseFloat(e.target.value) || 0 })}
                        className="w-full text-slate-600 dark:text-slate-300 bg-transparent border-b border-slate-200 dark:border-slate-600 focus:border-blue-500 outline-none py-1"
                        placeholder="0"
                    />
                </div>
            </div>

            {!isDemoMode && (
                <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
                    <div className={`rounded-2xl border px-4 py-3 ${hasUnsavedChanges
                        ? 'border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/20 dark:text-amber-300'
                        : 'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900/50 dark:bg-emerald-950/20 dark:text-emerald-300'
                        }`}>
                        <p className="text-[11px] font-semibold uppercase tracking-[0.18em]">Estado del proyecto</p>
                        <p className="mt-2 text-sm font-bold">
                            {hasUnsavedChanges ? 'Hay cambios pendientes de guardar' : 'Proyecto sincronizado'}
                        </p>
                        <p className="mt-1 flex items-center gap-2 text-xs opacity-80">
                            <Clock3 size={12} />
                            {lastSaved
                                ? `Último guardado ${lastSaved.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}`
                                : 'Aún no se ha guardado'}
                        </p>
                    </div>

                    <div className={`rounded-2xl border px-4 py-3 ${scheduleFreshness.isStale
                        ? 'border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/20 dark:text-amber-300'
                        : 'border-blue-200 bg-blue-50 text-blue-800 dark:border-blue-900/50 dark:bg-blue-950/20 dark:text-blue-300'
                        }`}>
                        <p className="text-[11px] font-semibold uppercase tracking-[0.18em]">Cronograma</p>
                        <p className="mt-2 text-sm font-bold">
                            {!scheduleFreshness.hasContent
                                ? 'No generado todavía'
                                : scheduleFreshness.isStale
                                    ? 'Desactualizado respecto a las partidas'
                                    : 'Vigente con las partidas actuales'}
                        </p>
                        <p className="mt-1 text-xs opacity-80">
                            {scheduleData?.generationMode
                                ? `Modo: ${scheduleData.generationMode}`
                                : 'Genera uno cuando necesites planeación'}
                        </p>
                    </div>

                    <div className={`rounded-2xl border px-4 py-3 ${technicalDescriptionFreshness.isStale
                        ? 'border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/20 dark:text-amber-300'
                        : 'border-indigo-200 bg-indigo-50 text-indigo-800 dark:border-indigo-900/50 dark:bg-indigo-950/20 dark:text-indigo-300'
                        }`}>
                        <p className="text-[11px] font-semibold uppercase tracking-[0.18em]">Memoria descriptiva</p>
                        <p className="mt-2 text-sm font-bold">
                            {!technicalDescriptionFreshness.hasContent
                                ? 'No generada todavía'
                                : technicalDescriptionFreshness.isStale
                                    ? 'Desactualizada respecto al presupuesto'
                                    : 'Alineada con las partidas actuales'}
                        </p>
                        <p className="mt-1 text-xs opacity-80">
                            {technicalDescriptionMeta?.generatedAt
                                ? `Generada ${new Date(technicalDescriptionMeta.generatedAt).toLocaleDateString(APP_CONFIG.locale)}`
                                : 'Puedes redactarla con IA cuando el presupuesto esté listo'}
                        </p>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ProjectEditorHeader;
