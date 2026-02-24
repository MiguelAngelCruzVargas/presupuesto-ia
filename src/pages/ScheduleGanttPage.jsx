import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Calendar, Clock } from 'lucide-react';
import GanttChart from '../components/schedule/GanttChart';
import ProjectPersistenceService from '../services/ProjectPersistenceService';

const ScheduleGanttPage = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [scheduleData, setScheduleData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [projectInfo, setProjectInfo] = useState(null);

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

            {/* Gantt Chart - Ocupa todo el espacio disponible */}
            <div className="w-full h-[calc(100vh-100px)] p-4">
                <div className="h-full w-full bg-slate-50 rounded-lg overflow-hidden border border-slate-200">
                    <GanttChart
                        scheduleData={scheduleData}
                        onUpdate={handleUpdate}
                        startDate={startDate ? new Date(startDate) : new Date()}
                    />
                </div>
            </div>
        </div>
    );
};

export default ScheduleGanttPage;

