import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Calendar, Clock, BarChart3, Package } from 'lucide-react';
import GanttChart from '../components/schedule/GanttChart';
import ProjectPersistenceService from '../services/ProjectPersistenceService';
import InsumosPorFase from '../components/schedule/InsumosPorFase';
import BitacoraService from '../services/BitacoraService';

const ScheduleGanttPage = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [scheduleData, setScheduleData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [projectInfo, setProjectInfo] = useState(null);
    const [items, setItems] = useState([]);
    const [vista, setVista] = useState('gantt'); // 'gantt' | 'insumos'
    const [logs, setLogs] = useState([]);

    useEffect(() => {
        loadSchedule();
    }, [id]);

    const loadSchedule = async () => {
        if (!id) {
            navigate('/editor');
            return;
        }

        try {
            setLoading(true);
            const project = await ProjectPersistenceService.loadProject(id);
            
            if (project && project.scheduleData) {
                setScheduleData(project.scheduleData);
                setProjectInfo(project.projectInfo);
                // Las partidas traen el APU, de donde salen los insumos
                setItems(project.items || []);

                // Avance real reportado en bitácora, para contrastarlo con lo
                // programado. Si falla, el Gantt simplemente muestra 0%.
                try {
                    setLogs(await BitacoraService.loadLogs(id));
                } catch (error) {
                    console.warn('No se pudo cargar el avance de bitácora:', error);
                }
            } else {
                // Si no hay cronograma, redirigir al editor
                navigate(`/editor/${id}`);
            }
        } catch (error) {
            console.error('Error loading schedule:', error);
            navigate(`/editor/${id}`);
        } finally {
            setLoading(false);
        }
    };

    const handleUpdate = async (updatedSchedule) => {
        setScheduleData(updatedSchedule);
        
        // Guardar automáticamente
        if (id) {
            try {
                await ProjectPersistenceService.syncSchedule(id, updatedSchedule);
            } catch (error) {
                console.error('Error saving schedule:', error);
            }
        }
    };

    // Avance real por partida: del ultimo reporte de bitacora de cada una.
    // Se declara antes de los returns tempranos para no alterar el orden de hooks.
    const avancePorPartida = useMemo(() => {
        const mapa = new Map();
        logs.forEach(log => {
            const item = items.find(i => String(i.id) === String(log.task_id));
            const nombre = item?.description;
            if (!nombre) return;

            const previo = mapa.get(nombre);
            const fecha = log.log_date || log.created_at;
            if (!previo || new Date(fecha) > new Date(previo.fecha)) {
                mapa.set(nombre, {
                    progreso: Number(log.progress_percentage) || 0,
                    fecha
                });
            }
        });
        return mapa;
    }, [logs, items]);

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-4 border-emerald-500 border-t-transparent mx-auto mb-4"></div>
                    <p className="text-slate-600">Cargando cronograma...</p>
                </div>
            </div>
        );
    }

    if (!scheduleData || !scheduleData.phases || scheduleData.phases.length === 0) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
                <div className="bg-white rounded-xl shadow-lg p-8 max-w-md w-full text-center">
                    <Calendar className="mx-auto mb-4 text-slate-400" size={48} />
                    <h2 className="text-xl font-bold text-slate-800 mb-2">No hay cronograma disponible</h2>
                    <p className="text-slate-600 mb-6">Genera un cronograma desde el editor del proyecto.</p>
                    <button
                        onClick={() => navigate(`/editor/${id}`)}
                        className="px-6 py-2 bg-emerald-600 text-white rounded-lg font-medium hover:bg-emerald-700 transition"
                    >
                        Ir al Editor
                    </button>
                </div>
            </div>
        );
    }

    const { totalDurationWeeks = 0, startDate = new Date().toISOString().split('T')[0] } = scheduleData || {};

    return (
        <div className="min-h-screen bg-slate-50">
            {/* Header */}
            <div className="bg-white border-b border-slate-200 sticky top-0 z-10">
                <div className="w-full px-6 py-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <button
                                onClick={() => navigate(`/editor/${id}`)}
                                className="p-2 hover:bg-slate-100 rounded-lg transition"
                                title="Volver al editor"
                            >
                                <ArrowLeft size={20} className="text-slate-600" />
                            </button>
                            <div>
                                <h1 className="text-xl font-bold text-slate-800">
                                    {projectInfo?.project || 'Cronograma de Obra'}
                                </h1>
                                <p className="text-sm text-slate-500">
                                    Vista Gantt - Cronograma Visual Interactivo
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center gap-4">
                            {/* Summary Card Compacta */}
                            <div className="bg-emerald-50 px-4 py-2 rounded-lg border border-emerald-200">
                                <div className="flex items-center gap-2">
                                    <Clock className="text-emerald-600" size={18} />
                                    <div>
                                        <div className="text-xs text-emerald-600 font-medium">Duración Total</div>
                                        <div className="text-sm font-bold text-emerald-700">{totalDurationWeeks} Semanas</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Pestañas: el Gantt dice CUÁNDO se ejecuta; los insumos, QUÉ comprar y para cuándo */}
            <div className="w-full px-4 pt-3">
                <div className="inline-flex bg-slate-200/70 rounded-xl p-1 gap-1">
                    <button
                        type="button"
                        onClick={() => setVista('gantt')}
                        className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition min-h-[40px] ${vista === 'gantt' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
                    >
                        <BarChart3 size={16} />
                        Cronograma
                    </button>
                    <button
                        type="button"
                        onClick={() => setVista('insumos')}
                        className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition min-h-[40px] ${vista === 'insumos' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
                    >
                        <Package size={16} />
                        Insumos por fase
                    </button>
                </div>
            </div>

            <div className="w-full h-[calc(100vh-160px)] p-4">
                <div className="h-full w-full bg-slate-50 rounded-lg overflow-hidden border border-slate-200">
                    {vista === 'gantt' ? (
                        <GanttChart
                            scheduleData={scheduleData}
                            onUpdate={handleUpdate}
                            startDate={startDate ? new Date(startDate) : new Date()}
                            avancePorPartida={avancePorPartida}
                        />
                    ) : (
                        <InsumosPorFase scheduleData={scheduleData} items={items} />
                    )}
                </div>
            </div>
        </div>
    );
};

export default ScheduleGanttPage;

