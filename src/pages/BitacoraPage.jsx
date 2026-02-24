import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Calendar, CheckCircle, Clock, Camera, Plus, FileText, Download, Image as ImageIcon, Edit, Trash2, Eye, X } from 'lucide-react';
import BitacoraService from '../services/BitacoraService';
import ProjectPersistenceService from '../services/ProjectPersistenceService';
import LogEntryModal from '../components/bitacora/LogEntryModal';
import PDFReportService from '../services/PDFReportService';
import ConfirmModal from '../components/ui/ConfirmModal';
import AlertModal from '../components/ui/AlertModal';

const BitacoraPage = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [schedule, setSchedule] = useState(null);
    const [logs, setLogs] = useState([]);
    const [projectFullData, setProjectFullData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [selectedTask, setSelectedTask] = useState(null);
    const [showModal, setShowModal] = useState(false);
    const [editingLog, setEditingLog] = useState(null);
    const [activeTab, setActiveTab] = useState('cronograma'); // 'cronograma', 'bitacora', 'fotografico'

    // Estados para modales de confirmación y alerta
    const [confirmModal, setConfirmModal] = useState({ isOpen: false, title: '', message: '', onConfirm: null, type: 'warning' });
    const [alertModal, setAlertModal] = useState({ isOpen: false, title: '', message: '', type: 'info' });
    const [showPdfPreview, setShowPdfPreview] = useState(false);
    const [pdfPreviewUrl, setPdfPreviewUrl] = useState(null);
    const [generatingPreview, setGeneratingPreview] = useState(false);

    useEffect(() => {
        loadData();
    }, [id]);

    const loadData = async () => {
        try {
            setLoading(true);

            // Cargar cronograma, logs y datos completos del proyecto (para items)
            const [scheduleData, logsData, projectData] = await Promise.all([
                BitacoraService.loadSchedule(id),
                BitacoraService.loadLogs(id),
                ProjectPersistenceService.loadProject(id)
            ]);

            // Verificar que el proyecto se cargó correctamente
            if (!projectData) {
                throw new Error('Proyecto no encontrado o no tienes permisos para acceder');
            }

            setSchedule(scheduleData);
            setLogs(logsData);
            setProjectFullData(projectData);

        } catch (error) {
            console.error('Error loading bitacora:', error);
            // Verificar si el error es por permisos o proyecto no encontrado
            const errorMessage = error.message?.includes('permisos') || error.message?.includes('permission') || error.message?.includes('No tienes permisos')
                ? 'No tienes permisos para acceder a este proyecto'
                : error.message?.includes('no encontrado') || error.message?.includes('not found')
                ? 'Proyecto no encontrado'
                : 'Error al cargar el proyecto. Puede que no exista o no tengas permisos.';
            
            // Mostrar mensaje de error de forma más elegante
            console.error(errorMessage);
            
            // Redirigir al dashboard después de un breve delay
            setTimeout(() => {
                navigate('/dashboard');
            }, 1500);
        } finally {
            setLoading(false);
        }
    };

    // Filtrar logs con fotos (reportes fotográficos)
    const logsWithPhotos = logs.filter(log => 
        log.photos && 
        Array.isArray(log.photos) && 
        log.photos.length > 0 &&
        !log.isDiaryEntry &&
        log.task_id !== 'diary'
    );
    
    // Filtrar entradas de diario (sin fotos, tipo libro)
    const diaryEntries = logs.filter(log => log.isDiaryEntry === true || (log.task_id === 'diary' && (!log.photos || log.photos.length === 0)));
    
    // Filtrar notas de bitácora normales (excluir diario y reportes fotográficos)
    const bitacoraNotes = logs.filter(log => {
        const isDiary = log.isDiaryEntry || log.task_id === 'diary';
        const isPhotographicReport = log.subject?.includes('Reporte Fotográfico:');
        
        // Incluir si NO es diario y NO es reporte fotográfico
        const shouldInclude = !isDiary && !isPhotographicReport;
        
        if (!shouldInclude) {
            console.log('Nota excluida:', {
                id: log.id,
                note_number: log.note_number,
                subject: log.subject,
                isDiaryEntry: log.isDiaryEntry,
                task_id: log.task_id,
                isPhotographicReport
            });
        }
        
        return shouldInclude;
    });
    
    console.log('Notas de bitácora filtradas:', bitacoraNotes.length, 'de', logs.length);
    console.log('Notas incluidas:', bitacoraNotes.map(n => ({
        note_number: n.note_number,
        subject: n.subject,
        hasContent: !!n.content
    })));

    // Función para generar preview del PDF
    const handlePreviewPDF = async (type = 'photographic') => {
        if (type === 'photographic' && logsWithPhotos.length === 0) {
            setAlertModal({
                isOpen: true,
                title: 'Sin reportes fotográficos',
                message: 'No hay reportes fotográficos para mostrar en el preview.',
                type: 'warning'
            });
            return;
        }

        if (type === 'bitacora' && bitacoraNotes.length === 0) {
            setAlertModal({
                isOpen: true,
                title: 'Sin notas de bitácora',
                message: 'No hay notas de bitácora para mostrar en el preview.',
                type: 'warning'
            });
            return;
        }

        setGeneratingPreview(true);
        try {
            const projectInfo = projectFullData?.projectInfo || projectFullData || {};
            const reportDate = new Date().toISOString().split('T')[0];

            if (type === 'photographic') {
                const logsByDate = {};
                logsWithPhotos.forEach(log => {
                    const date = log.log_date ? new Date(log.log_date).toISOString().split('T')[0] : reportDate;
                    if (!logsByDate[date]) logsByDate[date] = [];
                    logsByDate[date].push(log);
                });

                const dates = Object.keys(logsByDate).sort().reverse();
                const selectedDate = dates[0] || reportDate;
                const dateLogs = logsByDate[selectedDate] || logsWithPhotos;

                const options = {
                    contractor: projectInfo.contractor || projectInfo.client || '',
                    contractNumber: projectInfo.contractNumber || 'S/N',
                    concepts: PDFReportService.extractConceptsFromLogs(dateLogs),
                    obra: projectInfo.project || projectInfo.name || '',
                    supervisorName: projectInfo.supervisorName || '',
                    supervisorRole: projectInfo.supervisorRole || '',
                    contractorTitle: projectInfo.contractorTitle || 'EL CONTRATISTA',
                    contractorName: projectInfo.contractorName || projectInfo.contractor || projectInfo.client || '',
                    contractorRole: projectInfo.contractorRole || 'ADMINISTRADOR ÚNICO',
                    municipalityTitle: projectInfo.municipalityTitle || 'H. AYUNTAMIENTO'
                };

                const pdfBlob = await PDFReportService.generatePhotographicReportPreview(
                    projectInfo,
                    dateLogs,
                    selectedDate,
                    options
                );

                const url = URL.createObjectURL(pdfBlob);
                setPdfPreviewUrl(url);
                setShowPdfPreview(true);
            } else if (type === 'bitacora') {
                const pdfBlob = await PDFReportService.generateBitacoraReportPreview(
                    projectInfo,
                    bitacoraNotes,
                    reportDate,
                    {}
                );

                const url = URL.createObjectURL(pdfBlob);
                setPdfPreviewUrl(url);
                setShowPdfPreview(true);
            }
        } catch (error) {
            console.error('Error generating PDF preview:', error);
            setAlertModal({
                isOpen: true,
                title: 'Error',
                message: 'No se pudo generar el preview del PDF: ' + error.message,
                type: 'error'
            });
        } finally {
            setGeneratingPreview(false);
        }
    };

    // Limpiar URL del blob al cerrar el preview
    useEffect(() => {
        return () => {
            if (pdfPreviewUrl) {
                URL.revokeObjectURL(pdfPreviewUrl);
            }
        };
    }, [pdfPreviewUrl]);

    const handleExportPDF = async (type = 'photographic') => {
        if (!projectFullData || logs.length === 0) {
            setAlertModal({
                isOpen: true,
                title: 'Sin datos',
                message: 'No hay datos suficientes para generar el reporte.',
                type: 'warning'
            });
            return;
        }

        try {
            const reportDate = new Date().toISOString().split('T')[0];
            const projectInfo = projectFullData.projectInfo || projectFullData;

            if (type === 'photographic') {
                // Usar logsWithPhotos ya definido arriba
                if (logsWithPhotos.length === 0) {
                    setAlertModal({
                        isOpen: true,
                        title: 'Sin fotografías',
                        message: 'No hay fotografías en las notas. Agrega fotos a las notas antes de generar el reporte fotográfico.',
                        type: 'warning'
                    });
                    return;
                }

                // Agrupar logs por fecha de reporte (cada fecha genera un PDF individual)
                const logsByDate = {};
                logsWithPhotos.forEach(log => {
                    const logDate = log.log_date ? new Date(log.log_date).toISOString().split('T')[0] : reportDate;
                    if (!logsByDate[logDate]) {
                        logsByDate[logDate] = [];
                    }
                    logsByDate[logDate].push(log);
                });

                // Generar un PDF por cada fecha
                const dates = Object.keys(logsByDate).sort();

                if (dates.length === 0) {
                    setAlertModal({
                        isOpen: true,
                        title: 'Sin reportes',
                        message: 'No se encontraron reportes fotográficos con fecha válida.',
                        type: 'warning'
                    });
                    return;
                }

                // Si hay múltiples fechas, preguntar si quiere exportar todas o solo una
                if (dates.length > 1) {
                    setConfirmModal({
                        isOpen: true,
                        title: 'Múltiples reportes',
                        message: `Se encontraron ${dates.length} reportes fotográficos en diferentes fechas.\n\n¿Deseas exportar todos los reportes (${dates.length} PDFs)?`,
                        type: 'info',
                        confirmText: 'Exportar todos',
                        cancelText: 'Solo el más reciente',
                        onConfirm: async () => {
                            // Exportar todos los reportes
                            try {
                                for (const date of dates) {
                                    const dateLogs = logsByDate[date];
                                    const concepts = PDFReportService.extractConceptsFromLogs(dateLogs);

                                    const options = {
                                        contractor: projectInfo.contractor || projectInfo.client || 'Contratista',
                                        contractNumber: projectInfo.contractNumber || 'S/N',
                                        concepts: concepts,
                                        supervisorName: projectInfo.supervisorName || 'Ing. Responsable',
                                        supervisorRole: projectInfo.supervisorRole || 'DIRECTOR DE OBRAS PÚBLICAS',
                                        contractorTitle: projectInfo.contractorTitle || 'EL CONTRATISTA',
                                        contractorName: projectInfo.contractorName || projectInfo.contractor || projectInfo.client || '',
                                        contractorRole: projectInfo.contractorRole || 'ADMINISTRADOR ÚNICO',
                                        municipalityTitle: projectInfo.municipalityTitle || 'H. AYUNTAMIENTO'
                                    };

                                    await PDFReportService.generatePhotographicReport(
                                        projectInfo,
                                        dateLogs,
                                        date,
                                        options
                                    );

                                    // Pequeña pausa entre descargas para evitar bloqueos del navegador
                                    await new Promise(resolve => setTimeout(resolve, 500));
                                }
                                setAlertModal({
                                    isOpen: true,
                                    title: 'Exportación exitosa',
                                    message: `Se generaron ${dates.length} reportes fotográficos.`,
                                    type: 'success'
                                });
                            } catch (error) {
                                setAlertModal({
                                    isOpen: true,
                                    title: 'Error',
                                    message: 'Error al generar los PDFs: ' + error.message,
                                    type: 'error'
                                });
                            }
                        },
                        onCancel: async () => {
                            // Exportar solo el más reciente
                            try {
                                const latestDate = dates[dates.length - 1];
                                const dateLogs = logsByDate[latestDate];
                                const concepts = PDFReportService.extractConceptsFromLogs(dateLogs);

                                const options = {
                                    contractor: projectInfo.contractor || projectInfo.client || 'Contratista',
                                    contractNumber: projectInfo.contractNumber || 'S/N',
                                    concepts: concepts,
                                    supervisorName: projectInfo.supervisorName || 'Ing. Responsable',
                                    supervisorRole: projectInfo.supervisorRole || 'DIRECTOR DE OBRAS PÚBLICAS'
                                };

                                await PDFReportService.generatePhotographicReport(
                                    projectInfo,
                                    dateLogs,
                                    latestDate,
                                    options
                                );
                            } catch (error) {
                                setAlertModal({
                                    isOpen: true,
                                    title: 'Error',
                                    message: 'Error al generar el PDF: ' + error.message,
                                    type: 'error'
                                });
                            }
                        }
                    });
                } else {
                    // Solo una fecha, exportar directamente
                    const date = dates[0];
                    const dateLogs = logsByDate[date];
                    const concepts = PDFReportService.extractConceptsFromLogs(dateLogs);

                    const options = {
                        contractor: projectInfo.contractor || projectInfo.client || 'Contratista',
                        contractNumber: projectInfo.contractNumber || 'S/N',
                        concepts: concepts,
                        supervisorName: projectInfo.supervisorName || 'Ing. Responsable',
                        supervisorRole: projectInfo.supervisorRole || 'DIRECTOR DE OBRAS PÚBLICAS'
                    };

                    await PDFReportService.generatePhotographicReport(
                        projectInfo,
                        dateLogs,
                        date,
                        options
                    );
                }
            } else if (type === 'diary') {
                // Exportar diario tipo libro (solo entradas de diario, sin fotos)
                if (diaryEntries.length === 0) {
                    setAlertModal({
                        isOpen: true,
                        title: 'Sin entradas de diario',
                        message: 'No hay entradas en el diario para exportar.',
                        type: 'warning'
                    });
                    return;
                }
                await PDFReportService.generateDiaryReport(
                    projectInfo,
                    diaryEntries,
                    reportDate,
                    {}
                );
            } else {
                // Exportar bitácora completa (notas, textos, avances)
                await PDFReportService.generateBitacoraReport(
                    projectInfo,
                    bitacoraNotes,
                    reportDate,
                    {}
                );
            }
        } catch (error) {
            console.error('Error generating PDF:', error);
            setAlertModal({
                isOpen: true,
                title: 'Error',
                message: 'Error al generar el PDF: ' + error.message,
                type: 'error'
            });
        }
    };

    const getTaskLogs = (taskId) => logs.filter(l => l.task_id === taskId);

    const getTaskProgress = (taskId) => {
        // Calcular desde logs locales (más eficiente para render)
        const taskLogs = getTaskLogs(taskId);
        if (taskLogs.length === 0) return 0;
        // Return the latest progress
        return taskLogs[0].progress_percentage || 0;
    };

    // Función para eliminar un reporte
    const handleDeleteReport = (logId) => {
        setConfirmModal({
            isOpen: true,
            title: 'Eliminar Reporte',
            message: '¿Estás seguro de que deseas eliminar este reporte fotográfico? Esta acción no se puede deshacer.',
            type: 'danger',
            onConfirm: async () => {
                try {
                    await BitacoraService.deleteLog(logId);
                    loadData(); // Recargar datos
                    setAlertModal({
                        isOpen: true,
                        title: 'Reporte eliminado',
                        message: 'El reporte fotográfico ha sido eliminado correctamente.',
                        type: 'success'
                    });
                } catch (error) {
                    console.error('Error deleting report:', error);
                    setAlertModal({
                        isOpen: true,
                        title: 'Error',
                        message: 'Error al eliminar el reporte: ' + error.message,
                        type: 'error'
                    });
                }
            }
        });
    };

    // Función para eliminar una entrada del diario
    const handleDeleteLog = (logId) => {
        setConfirmModal({
            isOpen: true,
            title: 'Eliminar Entrada',
            message: '¿Estás seguro de que deseas eliminar esta entrada del diario? Esta acción no se puede deshacer.',
            type: 'danger',
            onConfirm: async () => {
                try {
                    await BitacoraService.deleteLog(logId);
                    loadData(); // Recargar datos
                    setAlertModal({
                        isOpen: true,
                        title: 'Entrada eliminada',
                        message: 'La entrada del diario ha sido eliminada correctamente.',
                        type: 'success'
                    });
                } catch (error) {
                    console.error('Error deleting diary entry:', error);
                    setAlertModal({
                        isOpen: true,
                        title: 'Error',
                        message: 'Error al eliminar la entrada: ' + error.message,
                        type: 'error'
                    });
                }
            }
        });
    };

    // Función para editar una nota de bitácora
    const handleEditLog = (log) => {
        // Buscar la tarea asociada al log
        const task = schedule?.tasks?.find(t => t.id === log.task_id) || {
            id: log.task_id || 'general',
            name: log.subject || 'Nota General',
            progress: log.progress_percentage || 0
        };
        setSelectedTask(task);
        setEditingLog(log);
        setShowModal(true);
    };

    // Función para eliminar una nota de bitácora
    const handleDeleteNote = (logId) => {
        setConfirmModal({
            isOpen: true,
            title: 'Eliminar Nota',
            message: '¿Estás seguro de que deseas eliminar esta nota de bitácora? Esta acción no se puede deshacer.',
            type: 'danger',
            onConfirm: async () => {
                try {
                    await BitacoraService.deleteLog(logId);
                    loadData(); // Recargar datos
                    setAlertModal({
                        isOpen: true,
                        title: 'Nota eliminada',
                        message: 'La nota de bitácora ha sido eliminada correctamente.',
                        type: 'success'
                    });
                } catch (error) {
                    console.error('Error deleting note:', error);
                    setAlertModal({
                        isOpen: true,
                        title: 'Error',
                        message: 'Error al eliminar la nota: ' + error.message,
                        type: 'error'
                    });
                }
            }
        });
    };

    // Función para editar un reporte
    const handleEditReport = (log) => {
        navigate(`/project/${id}/report/${log.id}/edit`);
    };

    if (loading) return <div className="p-10 text-center">Cargando bitácora...</div>;

    // Renderizar contenido del cronograma
    const renderCronograma = () => {
        if (!schedule) {
            return (
                <div className="bg-white p-12 rounded-2xl shadow-sm text-center">
                    <Calendar size={48} className="mx-auto text-slate-300 mb-4" />
                    <h3 className="text-lg font-bold text-slate-700">No hay cronograma activo</h3>
                    <p className="text-slate-500 mb-6">Primero debes generar y guardar un cronograma desde el Editor.</p>
                    <button onClick={() => navigate(`/editor/${id}`)} className="text-indigo-600 font-bold hover:underline">
                        Ir al Editor
                    </button>
                </div>
            );
        }

        // Extraer el cronograma: puede estar en schedule.tasks o directamente en schedule
        // El cronograma de la IA tiene: { totalDurationWeeks, phases: [...] }
        const scheduleData = schedule.tasks || schedule;
        const totalWeeks = scheduleData.totalDurationWeeks || 12;
        const phases = scheduleData.phases || [];

        return (
            <div className="space-y-4">
                {/* Resumen del Cronograma */}
                {scheduleData.startDate && scheduleData.endDate && (
                    <div className="bg-gradient-to-r from-indigo-50 to-purple-50 p-4 rounded-xl border border-indigo-200">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-xs font-bold text-slate-500 uppercase mb-1">Duración Total</p>
                                <p className="text-2xl font-bold text-slate-800">{totalWeeks} Semanas</p>
                            </div>
                            <div className="text-right">
                                <p className="text-xs font-bold text-slate-500 uppercase mb-1">Período</p>
                                <p className="text-sm font-medium text-slate-700">
                                    {new Date(scheduleData.startDate).toLocaleDateString('es-MX')} - {new Date(scheduleData.endDate).toLocaleDateString('es-MX')}
                                </p>
                            </div>
                        </div>
                    </div>
                )}

                <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                    {phases.length > 0 ? (
                        (() => {
                            return (
                                <div className="space-y-6 p-4">
                                    {/* Timeline Header */}
                                    <div className="flex justify-between text-xs text-slate-400 px-4 border-b border-slate-100 pb-2">
                                        <span>Semana 1</span>
                                        <span>Semana {Math.round(totalWeeks / 2)}</span>
                                        <span>Semana {totalWeeks}</span>
                                    </div>

                                    {phases.map((phase, pIndex) => (
                                        <div key={pIndex} className="border border-slate-200 rounded-xl overflow-hidden">
                                            {/* Phase Header */}
                                            <div className="bg-slate-50 p-4 border-b border-slate-200">
                                                <div className="flex justify-between items-center mb-2">
                                                    <h3 className="font-bold text-slate-800">{phase.name || `Fase ${pIndex + 1}`}</h3>
                                                    <span className="text-xs font-medium text-slate-500 bg-white px-2 py-1 rounded border border-slate-200">
                                                        Semana {phase.startWeek} - {phase.endWeek}
                                                    </span>
                                                </div>
                                                {/* Phase Gantt Bar */}
                                                <div className="relative w-full h-6 bg-slate-100 rounded-full overflow-hidden mt-1">
                                                    <div
                                                        className="absolute h-full rounded-full bg-indigo-200 opacity-80"
                                                        style={{
                                                            left: `${((phase.startWeek - 1) / totalWeeks) * 100}%`,
                                                            width: `${(phase.durationWeeks / totalWeeks) * 100}%`
                                                        }}
                                                        title={`Semana ${phase.startWeek} - ${phase.endWeek} (${phase.durationWeeks} sem)`}
                                                    ></div>
                                                </div>
                                            </div>

                                            {/* Información adicional de la fase */}
                                            {(phase.resources?.length > 0 || phase.risks?.length > 0 || phase.items?.length > 0 || phase.notes) && (
                                                <div className="p-4 bg-slate-50 border-t border-slate-200">
                                                    {phase.resources?.length > 0 && (
                                                        <div className="mb-2">
                                                            <p className="text-[10px] font-bold text-blue-600 uppercase mb-1">Recursos Clave</p>
                                                            <div className="flex flex-wrap gap-1">
                                                                {phase.resources.map((res, i) => (
                                                                    <span key={i} className="text-[10px] text-blue-700 bg-white px-2 py-0.5 rounded border border-blue-200">
                                                                        {res}
                                                                    </span>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    )}
                                                    {phase.risks?.length > 0 && (
                                                        <div className="mb-2">
                                                            <p className="text-[10px] font-bold text-amber-600 uppercase mb-1">Riesgos</p>
                                                            <div className="flex flex-wrap gap-1">
                                                                {phase.risks.map((risk, i) => (
                                                                    <span key={i} className="text-[10px] text-amber-700 bg-white px-2 py-0.5 rounded border border-amber-200">
                                                                        {risk}
                                                                    </span>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    )}
                                                    {phase.items?.length > 0 && (
                                                        <div className="mb-2">
                                                            <p className="text-[10px] font-bold text-slate-600 uppercase mb-1">Partidas Incluidas</p>
                                                            <div className="flex flex-wrap gap-1">
                                                                {phase.items.map((item, i) => (
                                                                    <span key={i} className="text-[10px] text-slate-700 bg-white px-2 py-0.5 rounded border border-slate-200">
                                                                        {item}
                                                                    </span>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    )}
                                                    {phase.notes && (
                                                        <div className="mt-2">
                                                            <p className="text-[10px] font-bold text-slate-600 uppercase mb-1">Notas</p>
                                                            <p className="text-xs text-slate-600 italic">{phase.notes}</p>
                                                        </div>
                                                    )}
                                                </div>
                                            )}

                                            {/* Tasks List - Si la fase tiene tareas desglosadas */}
                                            {phase.tasks && Array.isArray(phase.tasks) && phase.tasks.length > 0 ? (
                                                <div className="divide-y divide-slate-100">
                                                    {phase.tasks.map((task, tIndex) => {
                                                        const taskId = task.id || `task-${pIndex}-${tIndex}`;
                                                        const progress = getTaskProgress(taskId);
                                                        const taskLogs = getTaskLogs(taskId);

                                                        return (
                                                            <div key={taskId} className="p-4 hover:bg-slate-50 transition grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
                                                                {/* Task Info */}
                                                                <div className="md:col-span-4">
                                                                    <h4 className="font-medium text-slate-700 text-sm">{task.name}</h4>
                                                                    <div className="flex items-center gap-2 mt-1">
                                                                        <div className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${progress === 100 ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>
                                                                            {progress}%
                                                                        </div>
                                                                        <span className="text-[10px] text-slate-400">{taskLogs.length} reportes</span>
                                                                    </div>
                                                                </div>

                                                                {/* Task Gantt */}
                                                                <div className="md:col-span-5">
                                                                    <div className="relative w-full h-6 bg-slate-100 rounded-full overflow-hidden mt-1">
                                                                        <div
                                                                            className="absolute h-full rounded-full bg-indigo-500 opacity-80"
                                                                            style={{
                                                                                left: `${((task.startWeek - 1) / totalWeeks) * 100}%`,
                                                                                width: `${(task.durationWeeks / totalWeeks) * 100}%`
                                                                            }}
                                                                            title={`Semana ${task.startWeek} - ${task.endWeek} (${task.durationWeeks} sem)`}
                                                                        ></div>
                                                                    </div>
                                                                    <div className="flex justify-between text-[10px] text-slate-400 mt-1">
                                                                        <span>Sem {task.startWeek}</span>
                                                                        <span>Sem {task.endWeek}</span>
                                                                    </div>
                                                                </div>

                                                                {/* Actions */}
                                                                <div className="md:col-span-3 flex justify-end">
                                                                    <button
                                                                        onClick={() => {
                                                                            setSelectedTask({ ...task, id: taskId, progress });
                                                                            setShowModal(true);
                                                                        }}
                                                                        className="text-indigo-600 text-xs font-bold flex items-center hover:bg-indigo-50 px-3 py-2 rounded-lg transition border border-indigo-100"
                                                                    >
                                                                        <Camera size={14} className="mr-1" /> Registrar
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            ) : (
                                                <div className="p-4">
                                                    <div className="text-center text-slate-400 text-sm italic mb-3">
                                                        No hay tareas desglosadas en esta fase.
                                                        <br />
                                                        <span className="text-xs text-slate-500">Puedes registrar notas directamente para esta fase.</span>
                                                    </div>
                                                    <div className="flex justify-center">
                                                        <button
                                                            onClick={() => {
                                                                const phaseId = phase.id || `phase-${pIndex}`;
                                                                setSelectedTask({
                                                                    id: phaseId,
                                                                    name: phase.name || `Fase ${pIndex + 1}`,
                                                                    progress: 0
                                                                });
                                                                setShowModal(true);
                                                            }}
                                                            className="text-indigo-600 text-sm font-bold flex items-center hover:bg-indigo-50 px-4 py-2 rounded-lg transition border border-indigo-200 bg-indigo-50"
                                                        >
                                                            <Plus size={16} className="mr-2" /> Registrar Nota para esta Fase
                                                        </button>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            );
                        })()
                    ) : (
                        <div className="p-4 text-slate-500 text-center">
                            <p className="mb-2">No se encontraron fases en el cronograma.</p>
                            <p className="text-xs text-slate-400">Genera un nuevo cronograma desde el Editor.</p>
                        </div>
                    )}
                </div>
            </div>
        );
    };

    // Renderizar contenido de bitácora (notas)
    const renderBitacora = () => {
        // Ordenar notas por fecha (más recientes primero)
        const sortedNotes = [...bitacoraNotes].sort((a, b) => {
            const dateA = new Date(a.log_date || a.created_at);
            const dateB = new Date(b.log_date || b.created_at);
            return dateB - dateA;
        });

        return (
            <div className="space-y-4">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="font-bold text-slate-700 flex items-center gap-2">
                        <FileText className="mr-2" size={20} /> Notas de Bitácora
                        <span className="text-xs font-normal text-slate-400 bg-white px-2 py-1 rounded border border-slate-200">
                            {bitacoraNotes.length} {bitacoraNotes.length === 1 ? 'nota' : 'notas'}
                        </span>
                    </h2>
                    <div className="flex gap-2">
                        <button
                            onClick={() => {
                                setSelectedTask({
                                    id: 'general',
                                    name: 'Nota General',
                                    progress: 0
                                });
                                setEditingLog(null);
                                setShowModal(true);
                            }}
                            className="bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold px-4 py-2 rounded-lg transition flex items-center gap-2 shadow-sm"
                            title="Crear nueva nota"
                        >
                            <Plus size={16} />
                            Nueva Nota
                        </button>
                        <button
                            onClick={() => handlePreviewPDF('bitacora')}
                            disabled={bitacoraNotes.length === 0 || generatingPreview}
                            className="bg-slate-600 hover:bg-slate-700 text-white px-4 py-2 rounded-lg font-bold transition flex items-center gap-2 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                            title="Vista previa del PDF"
                        >
                            {generatingPreview ? (
                                <>
                                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                                    Generando...
                                </>
                            ) : (
                                <>
                                    <Eye size={16} />
                                    Vista Previa PDF
                                </>
                            )}
                        </button>
                        <button
                            onClick={() => handleExportPDF('bitacora')}
                            className="bg-white text-slate-700 border border-slate-200 px-4 py-2 rounded-lg font-bold hover:bg-slate-50 transition flex items-center gap-2 shadow-sm"
                            disabled={bitacoraNotes.length === 0}
                        >
                            <Download size={16} />
                            Exportar PDF
                        </button>
                    </div>
                </div>

                {/* Diseño tipo libro - Dos páginas */}
                <div className="space-y-6">
                    {sortedNotes.map((log) => {
                        // Extraer metadata del contenido si existe
                        const metadata = BitacoraService.extractBitacoraMetadata(log.content) || {};
                        return (
                            <div key={log.id} className="bg-gradient-to-br from-amber-50 via-white to-amber-50 rounded-lg shadow-lg border-2 border-amber-200 p-6 group">
                                {/* Simulación de libro abierto - Dos páginas */}
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                    {/* Página Izquierda */}
                                    <div className="bg-white rounded shadow-inner border-r-2 border-amber-100 p-6 min-h-[600px] relative flex flex-col" style={{ 
                                        backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 31px, #e5e7eb 31px, #e5e7eb 32px)',
                                        backgroundSize: '100% 32px'
                                    }}>
                                        {/* Número de folio en esquina */}
                                        <div className="absolute top-2 right-2 text-xs font-bold text-amber-600">
                                            Folio #{log.note_number || 'S/N'}
                                        </div>
                                        
                                        {/* Header de la página */}
                                        <div className="mb-4 pb-3 border-b-2 border-amber-200">
                                            <div className="flex items-center justify-between mb-2">
                                                <h3 className="text-lg font-bold text-slate-800" style={{ fontFamily: 'serif' }}>
                                                    {log.subject || 'Sin Asunto'}
                                                </h3>
                                                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <button
                                                        onClick={() => handleEditLog(log)}
                                                        className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded transition"
                                                        title="Editar nota"
                                                    >
                                                        <Edit size={14} />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDeleteNote(log.id)}
                                                        className="p-1.5 text-red-600 hover:bg-red-50 rounded transition"
                                                        title="Eliminar nota"
                                                    >
                                                        <Trash2 size={14} />
                                                    </button>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-3 text-xs text-slate-600">
                                                <span className="font-semibold">{log.classification || 'Informe'}</span>
                                                <span>•</span>
                                                <span>{new Date(log.log_date || log.created_at).toLocaleDateString('es-MX', { 
                                                    weekday: 'long', 
                                                    year: 'numeric', 
                                                    month: 'long', 
                                                    day: 'numeric' 
                                                })}</span>
                                                <span className={`ml-auto px-2 py-0.5 rounded text-[10px] font-bold ${log.status === 'Cerrada' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                                                    {log.status || 'Abierta'}
                                                </span>
                                            </div>
                                        </div>

                                        {/* Contenido principal */}
                                        <div className="mb-4 flex-1">
                                            <p className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed" style={{ fontFamily: 'serif', lineHeight: '1.8' }}>
                                                {BitacoraService.getCleanContent(log.content) || 'Sin contenido'}
                                            </p>
                                        </div>

                                        {/* Información adicional si existe */}
                                        {(metadata.weather || metadata.materials || metadata.personnel) && (
                                            <div className="mb-4 pt-3 border-t border-amber-100">
                                                {metadata.weather && (
                                                    <div className="mb-2 text-xs">
                                                        <span className="font-semibold text-slate-600">Clima: </span>
                                                        <span className="text-slate-700">{metadata.weather}</span>
                                                    </div>
                                                )}
                                                {metadata.materials && (
                                                    <div className="mb-2 text-xs">
                                                        <span className="font-semibold text-slate-600">Materiales: </span>
                                                        <span className="text-slate-700">{metadata.materials}</span>
                                                    </div>
                                                )}
                                                {metadata.personnel && (
                                                    <div className="text-xs">
                                                        <span className="font-semibold text-slate-600">Personal: </span>
                                                        <span className="text-slate-700">{metadata.personnel}</span>
                                                    </div>
                                                )}
                                            </div>
                                        )}

                                        {/* Firma y autor - Siempre al final */}
                                        <div className="mt-auto pt-4 border-t-2 border-amber-200">
                                            <div className="flex items-center gap-3 mb-2">
                                                <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold text-sm border-2 border-indigo-200">
                                                    {log.author_role ? log.author_role.charAt(0) : 'U'}
                                                </div>
                                                <div>
                                                    <p className="text-sm font-bold text-slate-700" style={{ fontFamily: 'serif' }}>
                                                        {log.author_role || 'Usuario'}
                                                    </p>
                                                    <p className="text-xs text-slate-500">Firma Digital</p>
                                                </div>
                                            </div>
                                            <div className="mt-3 pt-3 border-t border-amber-100">
                                                <div className="h-12 border-b-2 border-slate-400 relative">
                                                    <span className="absolute bottom-1 left-0 text-xs text-slate-500 italic">Firma</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Página Derecha */}
                                    <div className="bg-white rounded shadow-inner border-l-2 border-amber-100 p-6 min-h-[600px] relative flex flex-col" style={{ 
                                        backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 31px, #e5e7eb 31px, #e5e7eb 32px)',
                                        backgroundSize: '100% 32px'
                                    }}>
                                        {/* Observaciones y detalles adicionales */}
                                        {metadata.observations && (
                                            <div className="mb-4">
                                                <h4 className="text-sm font-bold text-slate-700 mb-2 border-b border-amber-200 pb-1" style={{ fontFamily: 'serif' }}>
                                                    Observaciones
                                                </h4>
                                                <p className="text-xs text-slate-600 whitespace-pre-wrap leading-relaxed" style={{ fontFamily: 'serif', lineHeight: '1.8' }}>
                                                    {metadata.observations}
                                                </p>
                                            </div>
                                        )}

                                        {/* Avance físico */}
                                        <div className="mb-4 p-3 bg-amber-50 rounded border border-amber-200">
                                            <div className="flex items-center justify-between mb-2">
                                                <span className="text-xs font-semibold text-slate-700">Avance Físico</span>
                                                <span className="text-sm font-bold text-indigo-600">{log.progress_percentage || 0}%</span>
                                            </div>
                                            <div className="w-full bg-slate-200 rounded-full h-2">
                                                <div 
                                                    className="bg-indigo-600 h-2 rounded-full transition-all"
                                                    style={{ width: `${log.progress_percentage || 0}%` }}
                                                ></div>
                                            </div>
                                        </div>

                                        {/* Espaciador flexible para empujar la firma hacia abajo */}
                                        <div className="flex-1"></div>

                                        {/* Firma y autor - Siempre al final */}
                                        <div className="mt-auto pt-4 border-t-2 border-amber-200">
                                            <div className="flex items-center gap-3 mb-2">
                                                <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold text-sm border-2 border-indigo-200">
                                                    {log.author_role ? log.author_role.charAt(0) : 'U'}
                                                </div>
                                                <div>
                                                    <p className="text-sm font-bold text-slate-700" style={{ fontFamily: 'serif' }}>
                                                        {log.author_role || 'Usuario'}
                                                    </p>
                                                    <p className="text-xs text-slate-500">Firma Digital</p>
                                                </div>
                                            </div>
                                            <div className="mt-3 pt-3 border-t border-amber-100">
                                                <div className="h-12 border-b-2 border-slate-400 relative">
                                                    <span className="absolute bottom-1 left-0 text-xs text-slate-500 italic">Firma</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                    {bitacoraNotes.length === 0 && (
                        <div className="text-center py-12 bg-white rounded-xl border border-dashed border-slate-300">
                            <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-3">
                                <FileText className="text-slate-300" size={24} />
                            </div>
                            <p className="text-slate-500 font-medium mb-2">Bitácora sin registros</p>
                            <p className="text-xs text-slate-400 mb-4">Registra la primera nota desde el cronograma o crea una nota general.</p>
                            <button
                                onClick={() => {
                                    setSelectedTask({
                                        id: 'general',
                                        name: 'Nota General',
                                        progress: 0
                                    });
                                    setEditingLog(null);
                                    setShowModal(true);
                                }}
                                className="bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold px-4 py-2 rounded-lg transition flex items-center gap-2 mx-auto shadow-sm"
                            >
                                <Plus size={16} />
                                Crear Primera Nota
                            </button>
                        </div>
                    )}
                </div>
            </div>
        );
    };

    // Renderizar contenido de reporte fotográfico
    const renderFotografico = () => {
        return (
            <div className="space-y-4">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="font-bold text-slate-700 flex items-center gap-2">
                        <ImageIcon className="mr-2" size={20} /> Reporte Fotográfico
                        <span className="text-xs font-normal text-slate-400 bg-white px-2 py-1 rounded border border-slate-200">
                            {logsWithPhotos.length} reportes con fotos
                        </span>
                    </h2>
                    <div className="flex gap-2">
                        <button
                            onClick={() => navigate(`/project/${id}/report/new`)}
                            className="bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold px-4 py-2 rounded-lg transition flex items-center gap-2 shadow-sm"
                        >
                            <Plus size={16} />
                            Nuevo Reporte
                        </button>
                        <button
                            onClick={() => handlePreviewPDF('photographic')}
                            disabled={logsWithPhotos.length === 0 || generatingPreview}
                            className="bg-slate-600 hover:bg-slate-700 text-white px-4 py-2 rounded-lg font-bold transition flex items-center gap-2 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                            title="Vista previa del PDF"
                        >
                            {generatingPreview ? (
                                <>
                                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                                    Generando...
                                </>
                            ) : (
                                <>
                                    <Eye size={16} />
                                    Vista Previa PDF
                                </>
                            )}
                        </button>
                        <button
                            onClick={() => handleExportPDF('photographic')}
                            className="bg-white text-slate-700 border border-slate-200 px-4 py-2 rounded-lg font-bold hover:bg-slate-50 transition flex items-center gap-2 shadow-sm"
                            disabled={logsWithPhotos.length === 0}
                        >
                            <Download size={16} />
                            Exportar PDF
                        </button>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {logsWithPhotos.map((log) => (
                        <div key={log.id} className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden hover:shadow-md transition group">
                            {/* Header */}
                            <div className="p-3 bg-slate-50 border-b border-slate-200">
                                <div className="flex items-center justify-between mb-1">
                                    <span className="text-xs font-bold text-slate-500">Nota #{log.note_number || 'N/A'}</span>
                                    <div className="flex items-center gap-2">
                                        <span className="text-[10px] text-slate-400">{new Date(log.log_date).toLocaleDateString()}</span>
                                        {/* Botones de acción */}
                                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button
                                                onClick={() => handleEditReport(log)}
                                                className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded transition"
                                                title="Editar reporte"
                                            >
                                                <Edit size={14} />
                                            </button>
                                            <button
                                                onClick={() => handleDeleteReport(log.id)}
                                                className="p-1.5 text-red-600 hover:bg-red-50 rounded transition"
                                                title="Eliminar reporte"
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                                <h3 className="font-bold text-slate-800 text-sm line-clamp-2">{log.subject || 'Sin asunto'}</h3>
                            </div>

                            {/* Photos Grid */}
                            <div className="p-3">
                                <div className="grid grid-cols-2 gap-2 mb-3">
                                    {log.photos.slice(0, 4).map((photo, idx) => (
                                        <img key={idx} src={photo} className="w-full h-24 object-cover rounded-lg border border-slate-200" alt={`photo ${idx + 1}`} />
                                    ))}
                                </div>
                                {log.photos.length > 4 && (
                                    <p className="text-xs text-slate-500 text-center">+{log.photos.length - 4} fotos más</p>
                                )}
                            </div>

                            {/* Footer */}
                            <div className="p-3 bg-slate-50 border-t border-slate-200">
                                <p className="text-xs text-slate-600 line-clamp-2 mb-2">{log.content || 'Sin descripción'}</p>
                                <div className="flex items-center justify-between">
                                    <span className="text-[10px] text-slate-400">{log.classification || 'Informe'}</span>
                                    <span className="text-[10px] font-bold text-indigo-600">Avance: {log.progress_percentage}%</span>
                                </div>
                            </div>
                        </div>
                    ))}
                    {logsWithPhotos.length === 0 && (
                        <div className="col-span-full text-center py-12 bg-white rounded-xl border border-dashed border-slate-300">
                            <ImageIcon size={48} className="mx-auto text-slate-300 mb-4" />
                            <p className="text-slate-500 font-medium mb-2">No hay reportes fotográficos</p>
                            <p className="text-xs text-slate-400 mb-4">Crea un nuevo reporte fotográfico con múltiples conceptos y fotos.</p>
                            <button
                                onClick={() => navigate(`/project/${id}/report/new`)}
                                className="bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold px-4 py-2 rounded-lg transition flex items-center gap-2 mx-auto shadow-sm"
                            >
                                <Plus size={16} />
                                Crear Primer Reporte
                            </button>
                        </div>
                    )}
                </div>
            </div>
        );
    };


    return (
        <div className="min-h-screen bg-slate-50 p-6">
            <div className="max-w-7xl mx-auto space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-4">
                        <button onClick={() => navigate(`/editor/${id}`)} className="p-2 hover:bg-white rounded-full transition" title="Volver al Editor">
                            <ArrowLeft size={24} className="text-slate-600" />
                        </button>
                        <div>
                            <h1 className="text-2xl font-bold text-slate-900">Bitácora de Obra</h1>
                            <p className="text-slate-500">Seguimiento y evidencias del proyecto</p>
                        </div>
                    </div>
                    <button
                        onClick={() => navigate(`/editor/${id}`)}
                        className="bg-white text-indigo-600 border border-indigo-200 px-4 py-2 rounded-lg font-bold hover:bg-indigo-50 transition flex items-center shadow-sm"
                    >
                        <Calendar size={18} className="mr-2" /> Editar Cronograma
                    </button>
                </div>

                {/* Tabs */}
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                    <div className="flex border-b border-slate-200">
                        <button
                            onClick={() => setActiveTab('cronograma')}
                            className={`flex-1 px-6 py-4 font-bold text-sm transition flex items-center justify-center gap-2 ${activeTab === 'cronograma'
                                    ? 'bg-indigo-50 text-indigo-700 border-b-2 border-indigo-600'
                                    : 'text-slate-600 hover:bg-slate-50'
                                }`}
                        >
                            <Clock size={18} />
                            Cronograma
                        </button>
                        <button
                            onClick={() => setActiveTab('bitacora')}
                            className={`flex-1 px-6 py-4 font-bold text-sm transition flex items-center justify-center gap-2 ${activeTab === 'bitacora'
                                    ? 'bg-indigo-50 text-indigo-700 border-b-2 border-indigo-600'
                                    : 'text-slate-600 hover:bg-slate-50'
                                }`}
                        >
                            <FileText size={18} />
                            Bitácora
                            {logs.length > 0 && (
                                <span className="bg-indigo-600 text-white text-xs px-2 py-0.5 rounded-full">{logs.length}</span>
                            )}
                        </button>
                        <button
                            onClick={() => setActiveTab('fotografico')}
                            className={`flex-1 px-6 py-4 font-bold text-sm transition flex items-center justify-center gap-2 ${activeTab === 'fotografico'
                                    ? 'bg-indigo-50 text-indigo-700 border-b-2 border-indigo-600'
                                    : 'text-slate-600 hover:bg-slate-50'
                                }`}
                        >
                            <ImageIcon size={18} />
                            Reporte Fotográfico
                            {logsWithPhotos.length > 0 && (
                                <span className="bg-indigo-600 text-white text-xs px-2 py-0.5 rounded-full">{logsWithPhotos.length}</span>
                            )}
                        </button>
                    </div>

                    {/* Tab Content */}
                    <div className="p-6">
                        {activeTab === 'cronograma' && renderCronograma()}
                        {activeTab === 'bitacora' && renderBitacora()}
                        {activeTab === 'fotografico' && renderFotografico()}
                    </div>
                </div>
            </div>

            {/* Modals */}
            <LogEntryModal
                isOpen={showModal}
                onClose={() => {
                    setShowModal(false);
                    setSelectedTask(null);
                    setEditingLog(null);
                }}
                task={selectedTask}
                projectId={id}
                onSave={loadData}
                editingLog={editingLog}
            />


            {/* Modal de Confirmación */}
            <ConfirmModal
                isOpen={confirmModal.isOpen}
                onClose={() => setConfirmModal({ ...confirmModal, isOpen: false })}
                onConfirm={confirmModal.onConfirm || (() => { })}
                onCancel={confirmModal.onCancel || (() => { })}
                title={confirmModal.title}
                message={confirmModal.message}
                type={confirmModal.type}
                confirmText={confirmModal.type === 'danger' ? 'Eliminar' : 'Exportar todos'}
                cancelText={confirmModal.type === 'danger' ? 'Cancelar' : 'Solo el más reciente'}
            />

            {/* Modal de Alerta */}
            <AlertModal
                isOpen={alertModal.isOpen}
                onClose={() => setAlertModal({ ...alertModal, isOpen: false })}
                title={alertModal.title}
                message={alertModal.message}
                type={alertModal.type}
            />

            {/* Modal de Preview PDF */}
            {showPdfPreview && pdfPreviewUrl && (
                <div className="fixed inset-0 bg-black bg-opacity-75 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-lg shadow-2xl w-full h-full max-w-7xl max-h-[90vh] flex flex-col">
                        {/* Header del Modal */}
                        <div className="flex items-center justify-between p-4 border-b border-slate-200">
                            <div className="flex items-center gap-3">
                                <FileText size={24} className="text-indigo-600" />
                                <h3 className="text-xl font-bold text-slate-900">Vista Previa del PDF</h3>
                            </div>
                            <button
                                onClick={() => {
                                    setShowPdfPreview(false);
                                    if (pdfPreviewUrl) {
                                        URL.revokeObjectURL(pdfPreviewUrl);
                                        setPdfPreviewUrl(null);
                                    }
                                }}
                                className="p-2 hover:bg-slate-100 rounded-lg transition"
                                title="Cerrar"
                            >
                                <X size={24} className="text-slate-600" />
                            </button>
                        </div>

                        {/* Contenedor del PDF */}
                        <div className="flex-1 overflow-hidden">
                            <iframe
                                src={pdfPreviewUrl}
                                className="w-full h-full border-0"
                                title="Preview del PDF"
                            />
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default BitacoraPage;
