import React, { useState, useEffect } from 'react';
import { Calendar, X, Sparkles, AlertTriangle, CheckCircle, Loader } from 'lucide-react';
import { AIBudgetService } from '../../services/AIBudgetService';
import ProjectPersistenceService from '../../services/ProjectPersistenceService';
import ScheduleModal from '../budget/ScheduleModal';

/**
 * ScheduleGenerator
 * Componente independiente para generar cronogramas de obra con IA
 * Maneja toda la lógica de generación, validación y persistencia
 */
const ScheduleGenerator = ({
    items = [],
    projectInfo = {},
    projectId = null,
    scheduleData: initialScheduleData = null,
    onScheduleGenerated = null,
    onClose = null,
    showToast = null,
    onSaveToBitacora = null
}) => {
    const [scheduleData, setScheduleData] = useState(initialScheduleData);
    const [isGenerating, setIsGenerating] = useState(false);
    const [showModal, setShowModal] = useState(false);
    const [error, setError] = useState(null);
    const [showConfigModal, setShowConfigModal] = useState(false);
    const [config, setConfig] = useState({
        startDate: new Date().toISOString().split('T')[0],
        workDays: {
            mon: true,
            tue: true,
            wed: true,
            thu: true,
            fri: true,
            sat: true,
            sun: false
        },
        notes: ''
    });

    // Sincronizar scheduleData cuando cambie la prop
    useEffect(() => {
        if (initialScheduleData !== null) {
            setScheduleData(initialScheduleData);
        }
    }, [initialScheduleData]);

    // Validar items antes de generar
    const validateItems = () => {
        if (!items || items.length === 0) {
            return { valid: false, message: 'Agrega partidas antes de generar el cronograma' };
        }

        const hasZeroQuantity = items.some(item => item.quantity <= 0);
        if (hasZeroQuantity) {
            return {
                valid: false,
                message: 'Hay partidas con cantidad 0. Por favor completa las cantidades antes de continuar.'
            };
        }

        return { valid: true };
    };

    // Abrir modal de configuración
    const handleOpenConfig = () => {
        const validation = validateItems();
        if (!validation.valid) {
            if (showToast) {
                showToast(validation.message, 'warning');
            } else {
                setError(validation.message);
            }
            return;
        }

        // Si ya existe cronograma VÁLIDO, abrir el visualizador sin regenerar
        // Si existe pero está vacío o inválido, permitir configurar uno nuevo
        const hasValidSchedule = scheduleData && (
            (scheduleData.tasks && Array.isArray(scheduleData.tasks) && scheduleData.tasks.length > 0) ||
            (scheduleData.phases && Array.isArray(scheduleData.phases) && scheduleData.phases.length > 0)
        );

        if (hasValidSchedule) {
            setShowModal(true);
            return;
        }

        setShowConfigModal(true);
    };

    // Generar cronograma con IA (llamado desde el modal de config)
    const handleGenerateSchedule = async () => {
        setShowConfigModal(false);
        setIsGenerating(true);
        setError(null);
        setShowModal(true);

        try {
            const data = await AIBudgetService.generateSchedule(items, projectInfo, config);
            setScheduleData(data);

            // Auto-guardar si hay projectId
            if (projectId && data) {
                try {
                    await ProjectPersistenceService.syncSchedule(projectId, data);
                    if (showToast) {
                        showToast('Cronograma generado y guardado exitosamente', 'success');
                    }
                } catch (err) {
                    console.error('Error saving schedule:', err);
                    // No mostrar error al usuario, el cronograma se generó correctamente
                }
            }

            // Callback opcional
            if (onScheduleGenerated) {
                onScheduleGenerated(data);
            }
        } catch (error) {
            console.error('Error generating schedule:', error);
            const errorMessage = error.message || 'Error al generar el cronograma';
            setError(errorMessage);
            if (showToast) {
                showToast(errorMessage, 'error');
            }
            setScheduleData(null);
        } finally {
            setIsGenerating(false);
        }
    };

    const handleClose = () => {
        setShowModal(false);
        if (onClose) {
            onClose();
        }
    };

    // Función para regenerar cronograma
    const handleRegenerate = () => {
        setShowModal(false);
        setShowConfigModal(true);
    };

    const handleSaveToBitacoraInternal = async () => {
        if (!projectId) {
            if (showToast) {
                showToast('Guarda el proyecto antes de ir a la bitácora', 'warning');
            }
            return;
        }

        // Guardar cronograma si no está guardado
        if (scheduleData && projectId) {
            try {
                await ProjectPersistenceService.syncSchedule(projectId, scheduleData);
            } catch (err) {
                console.error('Error saving schedule:', err);
            }
        }

        // Usar callback del padre si existe
        if (onSaveToBitacora) {
            onSaveToBitacora();
        } else if (onClose) {
            onClose();
        }
    };

    const toggleWorkDay = (day) => {
        setConfig(prev => ({
            ...prev,
            workDays: {
                ...prev.workDays,
                [day]: !prev.workDays[day]
            }
        }));
    };

    return (
        <>
            {/* Botón de Generar Cronograma */}
            <button
                onClick={handleOpenConfig}
                disabled={isGenerating || !items || items.length === 0}
                className={`
                    flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all
                    ${isGenerating || !items || items.length === 0
                        ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                        : 'bg-emerald-500 hover:bg-emerald-600 text-white shadow-lg shadow-emerald-900/20 hover:shadow-xl transform hover:-translate-y-0.5'
                    }
                `}
                title={!items || items.length === 0 ? 'Agrega partidas primero' : 'Generar Cronograma con IA'}
            >
                {isGenerating ? (
                    <>
                        <Loader className="animate-spin" size={18} />
                        <span>Generando...</span>
                    </>
                ) : (
                    <>
                        <Calendar size={18} />
                        <span>Cronograma</span>
                    </>
                )}
            </button>

            {/* Modal de Configuración */}
            {showConfigModal && (
                <div className="fixed inset-0 z-[90] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fadeIn">
                    <div className="bg-white rounded-xl shadow-2xl max-w-md w-full overflow-hidden">
                        <div className="p-5 border-b border-slate-100 bg-slate-50">
                            <h3 className="font-bold text-lg text-slate-800">Configurar Cronograma</h3>
                            <p className="text-xs text-slate-500">Define los parámetros para la IA</p>
                        </div>
                        <div className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-1">Fecha de Inicio</label>
                                <input
                                    type="date"
                                    value={config.startDate}
                                    onChange={(e) => setConfig({ ...config, startDate: e.target.value })}
                                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-700 focus:ring-2 focus:ring-emerald-500 outline-none"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-2">Días Laborables</label>
                                <div className="flex flex-wrap gap-2">
                                    {[
                                        { key: 'mon', label: 'L' },
                                        { key: 'tue', label: 'M' },
                                        { key: 'wed', label: 'X' },
                                        { key: 'thu', label: 'J' },
                                        { key: 'fri', label: 'V' },
                                        { key: 'sat', label: 'S' },
                                        { key: 'sun', label: 'D' },
                                    ].map((day) => (
                                        <button
                                            key={day.key}
                                            onClick={() => toggleWorkDay(day.key)}
                                            className={`w-8 h-8 rounded-full text-xs font-bold flex items-center justify-center transition-colors ${config.workDays[day.key]
                                                    ? 'bg-emerald-100 text-emerald-700 border border-emerald-200'
                                                    : 'bg-slate-100 text-slate-400 border border-slate-200'
                                                }`}
                                        >
                                            {day.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-1">Restricciones / Notas</label>
                                <textarea
                                    value={config.notes}
                                    onChange={(e) => setConfig({ ...config, notes: e.target.value })}
                                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-700 h-20 resize-none focus:ring-2 focus:ring-emerald-500 outline-none"
                                    placeholder="Ej: La cimentación depende de permisos, lluvias esperadas en semana 2..."
                                />
                            </div>
                        </div>
                        <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-3">
                            <button
                                onClick={() => setShowConfigModal(false)}
                                className="px-4 py-2 text-slate-600 hover:bg-slate-200 rounded-lg text-sm font-medium transition"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleGenerateSchedule}
                                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-bold shadow-lg shadow-emerald-200 transition flex items-center gap-2"
                            >
                                <Sparkles size={16} />
                                Generar con IA
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal de Cronograma */}
            {
                showModal && (
                    <ScheduleModal
                        isOpen={showModal}
                        onClose={handleClose}
                        scheduleData={scheduleData}
                        isGenerating={isGenerating}
                        onSaveToBitacora={handleSaveToBitacoraInternal}
                        error={error}
                        projectId={projectId}
                        onRegenerate={handleRegenerate}
                        onScheduleUpdate={async (updatedSchedule) => {
                            setScheduleData(updatedSchedule);
                            // Guardar actualización si hay projectId
                            if (projectId && updatedSchedule) {
                                try {
                                    await ProjectPersistenceService.syncSchedule(projectId, updatedSchedule);
                                    if (showToast) {
                                        showToast('Cronograma actualizado', 'success');
                                    }
                                } catch (err) {
                                    console.error('Error saving schedule update:', err);
                                }
                            }
                        }}
                    />
                )
            }

            {/* Mensaje de Error (si no hay showToast) */}
            {
                error && !showToast && (
                    <div className="fixed bottom-4 right-4 bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg shadow-lg flex items-center gap-2 z-50 animate-fadeIn">
                        <AlertTriangle size={20} />
                        <span className="text-sm font-medium">{error}</span>
                        <button
                            onClick={() => setError(null)}
                            className="text-red-600 hover:text-red-800"
                        >
                            <X size={16} />
                        </button>
                    </div>
                )
            }
        </>
    );
};

export default ScheduleGenerator;

