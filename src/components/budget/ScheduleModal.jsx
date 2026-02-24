import React, { useState } from 'react';
import { Calendar, X, Clock, AlertCircle, Download, List, BarChart3, ExternalLink, Sparkles } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import GanttChart from '../schedule/GanttChart';

const ScheduleModal = ({ isOpen, onClose, scheduleData, isGenerating, onSaveToBitacora, error = null, onScheduleUpdate = null, projectId = null, onRegenerate = null }) => {
    const navigate = useNavigate();
    const params = useParams();
    const currentProjectId = projectId || params.id;
    if (!isOpen) return null;

    const { totalDurationWeeks = 0, phases = [], startDate = new Date().toISOString().split('T')[0] } = scheduleData || {};
    const [viewMode, setViewMode] = useState('gantt'); // 'list' | 'gantt'
    const [localScheduleData, setLocalScheduleData] = useState(scheduleData);

    // Sincronizar localScheduleData cuando cambie scheduleData desde fuera
    React.useEffect(() => {
        if (scheduleData) {
            setLocalScheduleData(scheduleData);
        }
    }, [scheduleData]);

    return (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm animate-fadeIn">
            <div className={`bg-white rounded-2xl shadow-2xl ${viewMode === 'gantt' ? 'max-w-[95vw] w-full' : 'max-w-4xl w-full'} ${viewMode === 'gantt' ? 'h-[95vh]' : 'max-h-[90vh]'} flex flex-col overflow-hidden`}>
                {/* Header */}
                <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-gradient-to-r from-emerald-600 to-teal-600 text-white">
                    <div>
                        <h3 className="font-bold flex items-center text-lg">
                            <Calendar className="mr-2 text-emerald-200" /> Cronograma de Obra Estimado
                        </h3>
                        {scheduleData && (scheduleData.phases?.length > 0 || scheduleData.tasks?.length > 0) && (
                            <p className="text-xs text-emerald-200 mt-1">
                                Cronograma guardado - Puedes editar o regenerar con IA
                            </p>
                        )}
                    </div>
                    <div className="flex items-center gap-2">
                        {onRegenerate && scheduleData && (scheduleData.phases?.length > 0 || scheduleData.tasks?.length > 0) && (
                            <button
                                onClick={onRegenerate}
                                disabled={isGenerating}
                                className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-500 text-white text-xs font-medium rounded-lg transition flex items-center gap-1 disabled:opacity-50"
                                title="Regenerar cronograma con IA"
                            >
                                <Sparkles size={14} />
                                Regenerar
                            </button>
                        )}
                        <button onClick={onClose} className="text-white/60 hover:text-white transition">
                            <X size={20} />
                        </button>
                    </div>
                </div>

                {/* Pestañas de Vista */}
                {!isGenerating && phases.length > 0 && (
                    <div className="px-6 pt-4 border-b border-slate-200 bg-white">
                        <div className="flex gap-2">
                            <button
                                onClick={() => setViewMode('gantt')}
                                className={`flex items-center gap-2 px-4 py-2 rounded-t-lg font-medium transition ${
                                    viewMode === 'gantt'
                                        ? 'bg-slate-50 text-emerald-600 border-b-2 border-emerald-600'
                                        : 'text-slate-600 hover:text-slate-800 hover:bg-slate-50'
                                }`}
                            >
                                <BarChart3 size={18} />
                                Vista Gantt
                            </button>
                            <button
                                onClick={() => setViewMode('list')}
                                className={`flex items-center gap-2 px-4 py-2 rounded-t-lg font-medium transition ${
                                    viewMode === 'list'
                                        ? 'bg-slate-50 text-emerald-600 border-b-2 border-emerald-600'
                                        : 'text-slate-600 hover:text-slate-800 hover:bg-slate-50'
                                }`}
                            >
                                <List size={18} />
                                Vista Lista
                            </button>
                        </div>
                    </div>
                )}

                {/* Content */}
                <div className={`p-0 flex-1 bg-slate-50 ${viewMode === 'gantt' ? 'overflow-hidden' : 'overflow-y-auto'}`}>
                    {isGenerating ? (
                        <div className="flex flex-col items-center justify-center h-64 space-y-4">
                            <div className="animate-spin rounded-full h-12 w-12 border-4 border-emerald-500 border-t-transparent"></div>
                            <p className="text-slate-500 font-medium">Calculando tiempos y fases...</p>
                        </div>
                    ) : phases.length > 0 ? (
                        <>
                            {/* Vista Gantt Chart */}
                            {viewMode === 'gantt' ? (
                                <div className="h-full flex flex-col">
                                    {/* Summary Card - Compacta con botón de página dedicada */}
                                    <div className="bg-white p-3 border-b border-slate-200 flex items-center justify-between shrink-0">
                                        <div>
                                            <h4 className="text-xs font-bold text-slate-400 uppercase mb-1">Duración Total Estimada</h4>
                                            <div className="flex items-baseline gap-2">
                                                <span className="text-2xl font-bold text-slate-800">{totalDurationWeeks}</span>
                                                <span className="text-slate-500 font-medium text-sm">Semanas</span>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <div className="h-10 w-10 bg-emerald-100 rounded-full flex items-center justify-center">
                                                <Clock className="text-emerald-600" size={20} />
                                            </div>
                                            {currentProjectId && (
                                                <button
                                                    onClick={() => {
                                                        onClose();
                                                        navigate(`/project/${currentProjectId}/schedule`);
                                                    }}
                                                    className="px-4 py-2 bg-emerald-600 text-white rounded-lg font-medium hover:bg-emerald-700 transition flex items-center gap-2 shadow-lg shadow-emerald-200"
                                                    title="Abrir en página dedicada para mejor visualización"
                                                >
                                                    <ExternalLink size={16} />
                                                    <span>Ver en Página Completa</span>
                                                </button>
                                            )}
                                        </div>
                                    </div>

                                    {/* Gantt Chart Component - Vista previa compacta */}
                                    <div className="flex-1 overflow-hidden p-4">
                                        <div className="bg-slate-100 rounded-lg p-4 h-full flex items-center justify-center border-2 border-dashed border-slate-300">
                                            <div className="text-center">
                                                <BarChart3 className="mx-auto mb-3 text-slate-400" size={48} />
                                                <p className="text-slate-600 font-medium mb-2">Vista Gantt Completa</p>
                                                <p className="text-sm text-slate-500 mb-4">Para una mejor experiencia, abre el cronograma en una página dedicada</p>
                                                {currentProjectId && (
                                                    <button
                                                        onClick={() => {
                                                            onClose();
                                                            navigate(`/project/${currentProjectId}/schedule`);
                                                        }}
                                                        className="px-6 py-3 bg-emerald-600 text-white rounded-lg font-medium hover:bg-emerald-700 transition flex items-center gap-2 mx-auto shadow-lg shadow-emerald-200"
                                                    >
                                                        <ExternalLink size={18} />
                                                        <span>Abrir Página Completa</span>
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                /* Vista Lista (original) */
                                <div className="p-6 space-y-6">
                                    {/* Summary Card */}
                                    <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 flex items-center justify-between">
                                        <div>
                                            <h4 className="text-sm font-bold text-slate-400 uppercase mb-1">Duración Total Estimada</h4>
                                            <div className="flex items-baseline gap-2">
                                                <span className="text-3xl font-bold text-slate-800">{totalDurationWeeks}</span>
                                                <span className="text-slate-500 font-medium">Semanas</span>
                                            </div>
                                        </div>
                                        <div className="h-12 w-12 bg-emerald-100 rounded-full flex items-center justify-center">
                                            <Clock className="text-emerald-600" size={24} />
                                        </div>
                                    </div>

                                    {/* Timeline / List */}
                                    <div className="space-y-4">
                                        <h4 className="text-sm font-bold text-slate-700 uppercase">Fases del Proyecto</h4>
                                        <div className="space-y-3">
                                    {phases.map((phase, index) => (
                                        <div key={index} className={`bg-white p-4 rounded-xl border shadow-sm hover:shadow-md transition-shadow ${phase.isCritical ? 'border-red-200 ring-1 ring-red-100' : 'border-slate-200'}`}>
                                            <div className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-center mb-3">
                                                <div>
                                                    <div className="flex items-center gap-2">
                                                        <h5 className="font-bold text-slate-800 text-lg">{phase.name}</h5>
                                                        {phase.isCritical && (
                                                            <span className="px-2 py-0.5 bg-red-100 text-red-700 rounded text-[10px] font-bold border border-red-200 uppercase tracking-wider">
                                                                Ruta Crítica
                                                            </span>
                                                        )}
                                                    </div>
                                                    <p className="text-xs text-slate-500 mt-1">
                                                        {phase.startDate && phase.endDate ? (
                                                            <span className="font-medium text-slate-700">
                                                                {new Date(phase.startDate).toLocaleDateString()} - {new Date(phase.endDate).toLocaleDateString()}
                                                            </span>
                                                        ) : (
                                                            <span>Semana {phase.startWeek} - Semana {phase.endWeek}</span>
                                                        )}
                                                        <span className="ml-2 text-slate-400">({phase.durationWeeks} semanas)</span>
                                                    </p>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <span className={`px-3 py-1 rounded-full text-xs font-bold border ${phase.isCritical ? 'bg-red-50 text-red-700 border-red-100' : 'bg-emerald-50 text-emerald-700 border-emerald-100'}`}>
                                                        {phase.durationWeeks} Semanas
                                                    </span>
                                                </div>
                                            </div>

                                            {/* Progress Bar Visual */}
                                            <div className="w-full bg-slate-100 rounded-full h-2 mb-3 overflow-hidden relative">
                                                {/* Grid lines for weeks could go here */}
                                                <div
                                                    className={`h-2 rounded-full opacity-70 ${phase.isCritical ? 'bg-red-500' : 'bg-emerald-500'}`}
                                                    style={{
                                                        width: `${(phase.durationWeeks / totalDurationWeeks) * 100}%`,
                                                        marginLeft: `${((phase.startWeek - 1) / totalDurationWeeks) * 100}%`
                                                    }}
                                                ></div>
                                            </div>

                                            {/* Resources & Risks Grid */}
                                            {(phase.resources?.length > 0 || phase.risks?.length > 0) && (
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-3">
                                                    {phase.resources?.length > 0 && (
                                                        <div className="bg-blue-50/50 p-2 rounded border border-blue-100">
                                                            <p className="text-[10px] font-bold text-blue-500 uppercase mb-1">Recursos Clave</p>
                                                            <div className="flex flex-wrap gap-1">
                                                                {phase.resources.map((res, i) => (
                                                                    <span key={i} className="text-[10px] text-blue-700 bg-white px-1.5 py-0.5 rounded border border-blue-200">
                                                                        {res}
                                                                    </span>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    )}
                                                    {phase.risks?.length > 0 && (
                                                        <div className="bg-amber-50/50 p-2 rounded border border-amber-100">
                                                            <p className="text-[10px] font-bold text-amber-600 uppercase mb-1">Riesgos Potenciales</p>
                                                            <ul className="list-disc list-inside text-[10px] text-amber-800">
                                                                {phase.risks.map((risk, i) => (
                                                                    <li key={i}>{risk}</li>
                                                                ))}
                                                            </ul>
                                                        </div>
                                                    )}
                                                </div>
                                            )}

                                            {/* Items included */}
                                            <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                                                <p className="text-xs font-bold text-slate-500 mb-2 uppercase">Partidas Incluidas:</p>
                                                <div className="flex flex-wrap gap-2">
                                                    {phase.items?.map((item, i) => (
                                                        <span key={i} className="text-xs text-slate-600 bg-white px-2 py-1 rounded border border-slate-200">
                                                            {item}
                                                        </span>
                                                    ))}
                                                </div>
                                            </div>

                                            {phase.notes && (
                                                <div className="mt-3 flex gap-2 items-start text-xs text-slate-500 italic">
                                                    <AlertCircle size={14} className="mt-0.5 shrink-0" />
                                                    <span>{phase.notes}</span>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                        )}
                        </>
                    ) : (
                        <div className="p-12 text-center">
                            <Calendar size={48} className="mx-auto mb-4 opacity-50 text-slate-400" />
                            <p className="text-slate-400 mb-2 font-medium">No se pudo generar el cronograma.</p>
                            {error && (
                                <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg max-w-md mx-auto text-left">
                                    <p className="text-sm text-red-700 font-bold mb-2">Error:</p>
                                    <p className="text-sm text-red-700 mb-3">{error}</p>
                                    <div className="text-xs text-red-600 space-y-1">
                                        <p className="font-bold">Posibles soluciones:</p>
                                        <ul className="list-disc list-inside space-y-1 ml-2">
                                            <li>Verifica que el servidor de IA esté corriendo: <code className="bg-red-100 px-1 rounded">npm run gemini-proxy</code></li>
                                            <li>Asegúrate de que todas las partidas tengan cantidad mayor a 0</li>
                                            <li>Revisa la consola del navegador (F12) para más detalles</li>
                                            <li>Intenta generar el cronograma nuevamente</li>
                                        </ul>
                                    </div>
                                </div>
                            )}
                            {!error && (
                                <p className="text-xs text-slate-500 mt-4">Abre la consola del navegador (F12) para ver más detalles del error.</p>
                            )}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-4 bg-white border-t border-slate-200 flex justify-between items-center text-xs text-slate-400">
                    <p>* Tiempos estimados por IA. Verificar disponibilidad de recursos.</p>
                    <div className="flex gap-3">
                        <button className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-bold transition flex items-center gap-2" disabled>
                            <Download size={16} /> PDF (Próximamente)
                        </button>
                        <button onClick={onClose} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-bold transition">
                            Cerrar
                        </button>
                        <button
                            onClick={onSaveToBitacora}
                            disabled={!scheduleData || phases.length === 0}
                            className={`px-6 py-2 rounded-lg font-bold transition flex items-center shadow-lg ${
                                !scheduleData || phases.length === 0
                                    ? 'bg-slate-300 text-slate-500 cursor-not-allowed'
                                    : 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-emerald-200'
                            }`}
                        >
                            Guardar y ver Bitácora
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ScheduleModal;
