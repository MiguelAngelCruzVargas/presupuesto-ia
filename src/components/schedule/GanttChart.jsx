import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Calendar, ChevronLeft, ChevronRight, ZoomIn, ZoomOut, Maximize2, Minimize2, Save, Move, Link as LinkIcon, X, Info, AlertTriangle, Wrench, Package } from 'lucide-react';

// Helper para obtener días laborables entre dos fechas
const getWorkingDays = (start, end, workDays) => {
    let count = 0;
    const current = new Date(start);
    while (current <= end) {
        const dayName = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'][current.getDay()];
        if (workDays[dayName]) count++;
        current.setDate(current.getDate() + 1);
    }
    return count;
};

/**
 * GanttChart Component
 * Visualización interactiva tipo Gantt del cronograma con drag & drop y dependencias
 */
const GanttChart = ({ 
    scheduleData, 
    onUpdate, 
    startDate = null,
    workDays = { mon: true, tue: true, wed: true, thu: true, fri: true, sat: true, sun: false }
}) => {
    const { phases = [], totalDurationWeeks = 0 } = scheduleData || {};
    const [viewMode, setViewMode] = useState('weeks'); // 'days', 'weeks', 'months'
    const [zoomLevel, setZoomLevel] = useState(1);
    const [scrollPosition, setScrollPosition] = useState(0);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [draggingTask, setDraggingTask] = useState(null);
    const [dragStartPos, setDragStartPos] = useState(null);
    const [selectedTask, setSelectedTask] = useState(null);
    const [showTaskDetails, setShowTaskDetails] = useState(false);
    const ganttContainerRef = useRef(null);
    const [startDateState, setStartDateState] = useState(startDate || new Date());

    // Convertir phases a tasks para el Gantt
    const tasks = useMemo(() => {
        if (!phases || phases.length === 0) return [];
        
        let currentDate = new Date(startDateState);
        const weekMs = 7 * 24 * 60 * 60 * 1000;
        
        return phases.map((phase, index) => {
            let start, end, duration;
            
            if (phase.startDate && phase.endDate) {
                start = new Date(phase.startDate);
                end = new Date(phase.endDate);
                duration = Math.ceil((end - start) / weekMs);
            } else if (phase.startWeek && phase.durationWeeks) {
                // Calcular fechas basadas en semanas desde startDateState
                const weeksOffset = (phase.startWeek - 1) * 7;
                start = new Date(currentDate.getTime() + weeksOffset * 24 * 60 * 60 * 1000);
                duration = phase.durationWeeks;
                end = new Date(start.getTime() + duration * weekMs);
            } else {
                // Fallback: usar duración estimada
                duration = phase.durationWeeks || 2;
                start = new Date(currentDate);
                end = new Date(start.getTime() + duration * weekMs);
                currentDate = new Date(end);
            }

            return {
                id: `phase-${index}`,
                name: phase.name,
                start: start,
                end: end,
                duration: duration,
                progress: 0, // Se puede calcular desde bitácora
                isCritical: phase.isCritical || false,
                dependencies: [], // Se puede calcular desde lógica de fases
                resources: phase.resources || [],
                risks: phase.risks || [],
                notes: phase.notes || '',
                originalPhase: phase
            };
        });
    }, [phases, startDateState]);

    // Calcular dependencias automáticamente (una fase depende de la anterior)
    const tasksWithDependencies = useMemo(() => {
        return tasks.map((task, index) => ({
            ...task,
            dependencies: index > 0 ? [`phase-${index - 1}`] : []
        }));
    }, [tasks]);

    // Calcular dimensiones del Gantt
    const { timelineStart, timelineEnd, totalDays } = useMemo(() => {
        if (tasksWithDependencies.length === 0) {
            return { timelineStart: new Date(), timelineEnd: new Date(), totalDays: 1 };
        }

        const allDates = tasksWithDependencies.flatMap(t => [t.start, t.end]);
        const minDate = new Date(Math.min(...allDates.map(d => d.getTime())));
        const maxDate = new Date(Math.max(...allDates.map(d => d.getTime())));
        
        // Ajustar a lunes si es necesario
        const startOfWeek = new Date(minDate);
        startOfWeek.setDate(minDate.getDate() - minDate.getDay() + 1);
        
        const endOfWeek = new Date(maxDate);
        endOfWeek.setDate(maxDate.getDate() + (7 - maxDate.getDay()));
        
        const days = Math.ceil((endOfWeek - startOfWeek) / (24 * 60 * 60 * 1000));
        
        return {
            timelineStart: startOfWeek,
            timelineEnd: endOfWeek,
            totalDays: days
        };
    }, [tasksWithDependencies]);


    // Convertir fecha a posición X en el timeline según el modo
    const dateToX = (date) => {
        if (viewMode === 'days') {
            const daysSinceStart = Math.ceil((date - timelineStart) / (24 * 60 * 60 * 1000));
            const dayWidth = containerWidth / totalDays;
            return Math.max(0, daysSinceStart * dayWidth);
        } else if (viewMode === 'weeks') {
            const weeksSinceStart = Math.ceil((date - timelineStart) / (7 * 24 * 60 * 60 * 1000));
            const weekWidth = containerWidth / Math.ceil(totalDays / 7);
            return Math.max(0, (weeksSinceStart - 1) * weekWidth);
        } else {
            // Meses
            const monthsSinceStart = (date.getFullYear() - timelineStart.getFullYear()) * 12 + 
                                   (date.getMonth() - timelineStart.getMonth());
            const monthWidth = containerWidth / Math.ceil(totalDays / 30);
            return Math.max(0, monthsSinceStart * monthWidth);
        }
    };

    // Convertir posición X a fecha
    const xToDate = (x) => {
        const dayWidth = containerWidth / totalDays;
        const days = x / dayWidth;
        const date = new Date(timelineStart);
        date.setDate(date.getDate() + Math.round(days));
        return date;
    };

    // Manejar drag start
    const handleTaskMouseDown = (task, e) => {
        e.preventDefault();
        setDraggingTask(task);
        setDragStartPos({ x: e.clientX, initialStart: task.start, initialEnd: task.end });
    };

    // Manejar drag durante movimiento
    useEffect(() => {
        if (!draggingTask || !dragStartPos) return;

        const handleMouseMove = (e) => {
            // Preview visual durante el arrastre (opcional)
        };

        const handleMouseUp = (e) => {
            if (!ganttContainerRef.current || !draggingTask) return;
            
            const container = ganttContainerRef.current.querySelector('.gantt-timeline');
            if (!container) {
                setDraggingTask(null);
                setDragStartPos(null);
                return;
            }
            
            const rect = container.getBoundingClientRect();
            const deltaX = e.clientX - dragStartPos.x;
            const dayWidth = containerWidth / totalDays;
            const daysDelta = Math.round(deltaX / dayWidth);
            
            if (daysDelta !== 0 && onUpdate) {
                const newStart = new Date(dragStartPos.initialStart);
                newStart.setDate(newStart.getDate() + daysDelta);
                const duration = Math.ceil((dragStartPos.initialEnd - dragStartPos.initialStart) / (24 * 60 * 60 * 1000));
                const newEnd = new Date(newStart);
                newEnd.setDate(newEnd.getDate() + duration);
                
                // Actualizar la tarea
                const updatedTasks = tasksWithDependencies.map(t => 
                    t.id === draggingTask.id 
                        ? { ...t, start: newStart, end: newEnd }
                        : t
                );
                
                // Convertir de vuelta a formato de phases
                const updatedPhases = updatedTasks.map(t => ({
                    ...t.originalPhase,
                    startDate: t.start.toISOString().split('T')[0],
                    endDate: t.end.toISOString().split('T')[0]
                }));
                
                onUpdate({
                    ...scheduleData,
                    phases: updatedPhases
                });
            }
            
            setDraggingTask(null);
            setDragStartPos(null);
        };

        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp);

        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };
    }, [draggingTask, dragStartPos, totalDays, zoomLevel, tasksWithDependencies, scheduleData, onUpdate]);

    // Generar grid de días/semanas/meses según el modo
    const timeGrid = useMemo(() => {
        const grid = [];
        const current = new Date(timelineStart);
        
        while (current <= timelineEnd) {
            grid.push(new Date(current));
            
            // Avanzar según el modo seleccionado
            if (viewMode === 'days') {
                current.setDate(current.getDate() + 1);
            } else if (viewMode === 'weeks') {
                // Avanzar al siguiente lunes (inicio de semana)
                current.setDate(current.getDate() + 7);
            } else if (viewMode === 'months') {
                current.setMonth(current.getMonth() + 1);
            }
        }
        
        return grid;
    }, [timelineStart, timelineEnd, viewMode]);

    if (!scheduleData || phases.length === 0) {
        return (
            <div className="p-12 text-center bg-slate-50 rounded-lg border-2 border-dashed border-slate-300">
                <Calendar className="mx-auto mb-4 text-slate-400" size={48} />
                <p className="text-slate-500 font-medium">No hay cronograma disponible</p>
            </div>
        );
    }

    const rowHeight = 35;
    const headerHeight = 40;
    const [containerWidth, setContainerWidth] = useState(1200);

    // Calcular ancho del contenedor dinámicamente
    useEffect(() => {
        const updateWidth = () => {
            if (ganttContainerRef.current) {
                const container = ganttContainerRef.current;
                const availableWidth = container.offsetWidth || container.clientWidth;
                const width = Math.max(availableWidth - 180, 800); // Restar ancho de columna de nombres, mínimo 800px
                setContainerWidth(width * zoomLevel);
            }
        };
        
        // Ejecutar inmediatamente
        updateWidth();
        
        // También después de un pequeño delay para asegurar que el DOM esté listo
        const timeoutId = setTimeout(updateWidth, 100);
        
        window.addEventListener('resize', updateWidth);
        return () => {
            clearTimeout(timeoutId);
            window.removeEventListener('resize', updateWidth);
        };
    }, [zoomLevel]);

    return (
        <div 
            ref={ganttContainerRef}
            className={`h-full w-full flex flex-col bg-white ${isFullscreen ? 'fixed inset-4 z-50 rounded-2xl shadow-2xl' : ''}`}
        >
            {/* Toolbar */}
            <div className="p-1.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-1.5">
                    <button
                        onClick={() => setViewMode('days')}
                        className={`px-1.5 py-0.5 rounded text-[10px] font-medium transition ${
                            viewMode === 'days' 
                                ? 'bg-blue-600 text-white' 
                                : 'bg-white text-slate-700 hover:bg-slate-100'
                        }`}
                    >
                        Días
                    </button>
                    <button
                        onClick={() => setViewMode('weeks')}
                        className={`px-1.5 py-0.5 rounded text-[10px] font-medium transition ${
                            viewMode === 'weeks' 
                                ? 'bg-blue-600 text-white' 
                                : 'bg-white text-slate-700 hover:bg-slate-100'
                        }`}
                    >
                        Semanas
                    </button>
                    <button
                        onClick={() => setViewMode('months')}
                        className={`px-1.5 py-0.5 rounded text-[10px] font-medium transition ${
                            viewMode === 'months' 
                                ? 'bg-blue-600 text-white' 
                                : 'bg-white text-slate-700 hover:bg-slate-100'
                        }`}
                    >
                        Meses
                    </button>
                </div>
                
                <div className="flex items-center gap-1">
                    <button
                        onClick={() => setZoomLevel(Math.max(0.5, zoomLevel - 0.25))}
                        className="p-1 hover:bg-slate-200 rounded transition"
                        title="Alejar"
                    >
                        <ZoomOut size={14} />
                    </button>
                    <span className="text-[10px] text-slate-600 font-medium min-w-[35px] text-center">{Math.round(zoomLevel * 100)}%</span>
                    <button
                        onClick={() => setZoomLevel(Math.min(2, zoomLevel + 0.25))}
                        className="p-1 hover:bg-slate-200 rounded transition"
                        title="Acercar"
                    >
                        <ZoomIn size={14} />
                    </button>
                </div>
            </div>

            {/* Gantt Chart */}
            <div className="flex-1 overflow-auto bg-white">
                <div className="gantt-timeline relative" style={{ width: `${containerWidth + 180}px`, minHeight: `${headerHeight + (tasksWithDependencies.length * rowHeight)}px` }}>
                    {/* Header con fechas */}
                    <div 
                        className="sticky top-0 z-10 bg-white border-b-2 border-slate-300"
                        style={{ height: `${headerHeight}px` }}
                    >
                        <div className="flex" style={{ width: `${containerWidth}px` }}>
                            {/* Columna de nombres de tareas */}
                            <div className="sticky left-0 z-20 bg-white border-r-2 border-slate-300" style={{ width: '180px', height: `${headerHeight}px` }}>
                                <div className="p-1.5 h-full flex items-center">
                                    <span className="font-bold text-slate-700 text-[10px]">Fases del Proyecto</span>
                                </div>
                            </div>
                            
                            {/* Timeline de fechas */}
                            <div className="flex-1 relative">
                                {timeGrid.map((date, index) => {
                                    let xPos, cellWidth, label;
                                    
                                    if (viewMode === 'days') {
                                        const daysSinceStart = Math.ceil((date - timelineStart) / (24 * 60 * 60 * 1000));
                                        const dayWidth = containerWidth / totalDays;
                                        xPos = daysSinceStart * dayWidth;
                                        cellWidth = dayWidth;
                                        label = date.toLocaleDateString('es-MX', { day: '2-digit', month: 'short' });
                                    } else if (viewMode === 'weeks') {
                                        const weeksSinceStart = Math.ceil((date - timelineStart) / (7 * 24 * 60 * 60 * 1000));
                                        const weekWidth = containerWidth / Math.ceil(totalDays / 7);
                                        xPos = (weeksSinceStart - 1) * weekWidth;
                                        cellWidth = weekWidth;
                                        label = `Sem ${weeksSinceStart}`;
                                    } else {
                                        // Meses
                                        const monthsSinceStart = (date.getFullYear() - timelineStart.getFullYear()) * 12 + 
                                                               (date.getMonth() - timelineStart.getMonth());
                                        const monthWidth = containerWidth / Math.ceil(totalDays / 30);
                                        xPos = monthsSinceStart * monthWidth;
                                        cellWidth = monthWidth;
                                        label = date.toLocaleDateString('es-MX', { month: 'short', year: '2-digit' });
                                    }
                                    
                                    return (
                                        <div
                                            key={index}
                                            className="absolute top-0 border-r border-slate-200"
                                            style={{
                                                left: `${xPos + 180}px`,
                                                width: `${cellWidth}px`,
                                                height: `${headerHeight}px`
                                            }}
                                        >
                                            <div className="p-0.5 text-[9px] font-medium text-slate-600 text-center">
                                                {label}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>

                    {/* Filas de tareas */}
                    <div className="relative">
                        {tasksWithDependencies.map((task, index) => {
                            const taskX = dateToX(task.start);
                            const taskWidth = dateToX(task.end) - taskX;
                            const taskY = index * rowHeight;
                            const isDragging = draggingTask?.id === task.id;

                            return (
                                <div key={task.id} className="relative" style={{ height: `${rowHeight}px` }}>
                                    {/* Fondo de la fila */}
                                    <div className="absolute inset-0 bg-slate-50 border-b border-slate-100" />
                                    
                                    {/* Nombre de la tarea (sticky) */}
                                    <div 
                                        className="sticky left-0 z-10 bg-white border-r-2 border-slate-300 px-1.5 py-0.5 h-full flex items-center"
                                        style={{ width: '180px' }}
                                    >
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-1">
                                                <span className="font-medium text-slate-800 text-[10px] truncate leading-tight">{task.name}</span>
                                                {task.isCritical && (
                                                    <span className="px-0.5 py-0 bg-red-100 text-red-700 rounded text-[8px] font-bold shrink-0">
                                                        C
                                                    </span>
                                                )}
                                            </div>
                                            <div className="text-[9px] text-slate-500 mt-0 truncate leading-tight">
                                                {task.start.toLocaleDateString('es-MX', { day: '2-digit', month: 'short' })} - {task.end.toLocaleDateString('es-MX', { day: '2-digit', month: 'short' })}
                                            </div>
                                        </div>
                                        <Move size={10} className="text-slate-400 shrink-0 ml-0.5" />
                                    </div>

                                    {/* Barra de la tarea */}
                                    <div
                                        className={`absolute cursor-pointer transition-all group ${
                                            task.isCritical 
                                                ? 'bg-red-500 hover:bg-red-600' 
                                                : 'bg-blue-500 hover:bg-blue-600'
                                        } ${isDragging ? 'opacity-70 shadow-lg' : 'shadow-sm'} rounded px-1 flex items-center`}
                                        style={{
                                            left: `${taskX + 180}px`,
                                            top: '4px',
                                            width: `${Math.max(taskWidth, 50)}px`,
                                            height: `${rowHeight - 8}px`,
                                            zIndex: isDragging ? 50 : 5
                                        }}
                                        onMouseDown={(e) => {
                                            // Si es click simple, mostrar detalles; si es drag, mover
                                            if (e.button === 0) {
                                                const startX = e.clientX;
                                                const startY = e.clientY;
                                                const handleMouseMove = (moveEvent) => {
                                                    const deltaX = Math.abs(moveEvent.clientX - startX);
                                                    const deltaY = Math.abs(moveEvent.clientY - startY);
                                                    if (deltaX > 5 || deltaY > 5) {
                                                        // Es un drag, usar función de drag
                                                        handleTaskMouseDown(task, e);
                                                        document.removeEventListener('mousemove', handleMouseMove);
                                                    }
                                                };
                                                const handleMouseUp = () => {
                                                    document.removeEventListener('mousemove', handleMouseMove);
                                                    document.removeEventListener('mouseup', handleMouseUp);
                                                    // Si no hubo movimiento significativo, mostrar detalles
                                                    setSelectedTask(task);
                                                    setShowTaskDetails(true);
                                                };
                                                document.addEventListener('mousemove', handleMouseMove);
                                                document.addEventListener('mouseup', handleMouseUp);
                                            } else {
                                                handleTaskMouseDown(task, e);
                                            }
                                        }}
                                        title={`${task.name} - Click para ver detalles, arrastra para mover`}
                                    >
                                        <span className="text-white text-[9px] font-medium truncate leading-tight">
                                            {task.name}
                                        </span>
                                        {/* Indicador de que tiene detalles */}
                                        {(task.resources?.length > 0 || task.risks?.length > 0 || task.notes || task.originalPhase?.items?.length > 0) && (
                                            <Info size={8} className="text-white opacity-70 group-hover:opacity-100 ml-1" />
                                        )}
                                    </div>

                                    {/* Dependencias (líneas) */}
                                    {task.dependencies && task.dependencies.length > 0 && (
                                        <svg 
                                            className="absolute pointer-events-none"
                                            style={{ width: `${containerWidth}px`, height: `${rowHeight}px`, top: 0, left: 0, zIndex: 1 }}
                                        >
                                            {task.dependencies.map((depId, depIndex) => {
                                                const depTask = tasksWithDependencies.find(t => t.id === depId);
                                                if (!depTask) return null;
                                                
                                                const depX = dateToX(depTask.end) + 180;
                                                const depY = tasksWithDependencies.findIndex(t => t.id === depId) * rowHeight + (rowHeight / 2);
                                                const taskXCenter = taskX + 180;
                                                const taskYCenter = taskY + (rowHeight / 2);
                                                
                                                return (
                                                    <g key={depIndex}>
                                                        <path
                                                            d={`M ${depX} ${depY} L ${depX + 20} ${depY} L ${depX + 20} ${taskYCenter} L ${taskXCenter} ${taskYCenter}`}
                                                            stroke="#64748b"
                                                            strokeWidth="2"
                                                            fill="none"
                                                            strokeDasharray="5,5"
                                                            markerEnd="url(#arrowhead)"
                                                        />
                                                    </g>
                                                );
                                            })}
                                        </svg>
                                    )}
                                </div>
                            );
                        })}
                    </div>

                    {/* SVG markers para flechas */}
                    <svg style={{ position: 'absolute', width: 0, height: 0 }}>
                        <defs>
                            <marker
                                id="arrowhead"
                                markerWidth="10"
                                markerHeight="10"
                                refX="9"
                                refY="3"
                                orient="auto"
                            >
                                <polygon points="0 0, 10 3, 0 6" fill="#64748b" />
                            </marker>
                        </defs>
                    </svg>
                </div>
            </div>

            {/* Modal de Detalles de Tarea */}
            {showTaskDetails && selectedTask && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm animate-fadeIn">
                    <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
                        {/* Header */}
                        <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-gradient-to-r from-emerald-600 to-teal-600 text-white">
                            <h3 className="font-bold flex items-center text-lg">
                                <Info className="mr-2 text-emerald-200" size={20} />
                                {selectedTask.name}
                            </h3>
                            <button 
                                onClick={() => {
                                    setShowTaskDetails(false);
                                    setSelectedTask(null);
                                }}
                                className="text-white/60 hover:text-white transition"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        {/* Content */}
                        <div className="p-6 overflow-y-auto flex-1">
                            <div className="space-y-4">
                                {/* Fechas */}
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="bg-slate-50 p-3 rounded-lg">
                                        <div className="text-xs font-bold text-slate-500 uppercase mb-1">Fecha Inicio</div>
                                        <div className="text-sm font-medium text-slate-800">
                                            {selectedTask.start.toLocaleDateString('es-MX', { 
                                                weekday: 'long', 
                                                year: 'numeric', 
                                                month: 'long', 
                                                day: 'numeric' 
                                            })}
                                        </div>
                                    </div>
                                    <div className="bg-slate-50 p-3 rounded-lg">
                                        <div className="text-xs font-bold text-slate-500 uppercase mb-1">Fecha Fin</div>
                                        <div className="text-sm font-medium text-slate-800">
                                            {selectedTask.end.toLocaleDateString('es-MX', { 
                                                weekday: 'long', 
                                                year: 'numeric', 
                                                month: 'long', 
                                                day: 'numeric' 
                                            })}
                                        </div>
                                    </div>
                                </div>

                                {/* Duración y Estado */}
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="bg-slate-50 p-3 rounded-lg">
                                        <div className="text-xs font-bold text-slate-500 uppercase mb-1">Duración</div>
                                        <div className="text-sm font-medium text-slate-800">{selectedTask.duration} semanas</div>
                                    </div>
                                    <div className="bg-slate-50 p-3 rounded-lg">
                                        <div className="text-xs font-bold text-slate-500 uppercase mb-1">Estado</div>
                                        <div className="flex items-center gap-2">
                                            {selectedTask.isCritical ? (
                                                <span className="px-2 py-1 bg-red-100 text-red-700 rounded text-xs font-bold">
                                                    Ruta Crítica
                                                </span>
                                            ) : (
                                                <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs font-bold">
                                                    Fase Normal
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Recursos */}
                                {selectedTask.resources && selectedTask.resources.length > 0 && (
                                    <div>
                                        <div className="flex items-center gap-2 mb-2">
                                            <Wrench size={16} className="text-blue-600" />
                                            <h4 className="font-bold text-slate-700">Recursos Clave</h4>
                                        </div>
                                        <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
                                            <div className="flex flex-wrap gap-2">
                                                {selectedTask.resources.map((resource, i) => (
                                                    <span key={i} className="px-3 py-1.5 bg-white text-blue-700 rounded-lg text-xs font-medium border border-blue-200">
                                                        {resource}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Riesgos */}
                                {selectedTask.risks && selectedTask.risks.length > 0 && (
                                    <div>
                                        <div className="flex items-center gap-2 mb-2">
                                            <AlertTriangle size={16} className="text-amber-600" />
                                            <h4 className="font-bold text-slate-700">Riesgos Potenciales</h4>
                                        </div>
                                        <div className="bg-amber-50 p-4 rounded-lg border border-amber-100">
                                            <ul className="space-y-2">
                                                {selectedTask.risks.map((risk, i) => (
                                                    <li key={i} className="flex items-start gap-2 text-sm text-amber-800">
                                                        <span className="text-amber-600 mt-0.5">•</span>
                                                        <span>{risk}</span>
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    </div>
                                )}

                                {/* Partidas Incluidas */}
                                {selectedTask.originalPhase?.items && selectedTask.originalPhase.items.length > 0 && (
                                    <div>
                                        <div className="flex items-center gap-2 mb-2">
                                            <Package size={16} className="text-emerald-600" />
                                            <h4 className="font-bold text-slate-700">Partidas Incluidas</h4>
                                        </div>
                                        <div className="bg-emerald-50 p-4 rounded-lg border border-emerald-100">
                                            <div className="flex flex-wrap gap-2">
                                                {selectedTask.originalPhase.items.map((item, i) => (
                                                    <span key={i} className="px-3 py-1.5 bg-white text-emerald-700 rounded-lg text-xs font-medium border border-emerald-200">
                                                        {item}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Notas */}
                                {selectedTask.notes && (
                                    <div>
                                        <div className="flex items-center gap-2 mb-2">
                                            <Info size={16} className="text-slate-600" />
                                            <h4 className="font-bold text-slate-700">Notas</h4>
                                        </div>
                                        <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                                            <p className="text-sm text-slate-700 leading-relaxed">{selectedTask.notes}</p>
                                        </div>
                                    </div>
                                )}

                                {/* Dependencias */}
                                {selectedTask.dependencies && selectedTask.dependencies.length > 0 && (
                                    <div>
                                        <div className="flex items-center gap-2 mb-2">
                                            <LinkIcon size={16} className="text-purple-600" />
                                            <h4 className="font-bold text-slate-700">Dependencias</h4>
                                        </div>
                                        <div className="bg-purple-50 p-4 rounded-lg border border-purple-100">
                                            <ul className="space-y-2">
                                                {selectedTask.dependencies.map((depId, i) => {
                                                    const depTask = tasksWithDependencies.find(t => t.id === depId);
                                                    return depTask ? (
                                                        <li key={i} className="text-sm text-purple-800">
                                                            <span className="font-medium">→</span> {depTask.name}
                                                        </li>
                                                    ) : null;
                                                })}
                                            </ul>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end">
                            <button
                                onClick={() => {
                                    setShowTaskDetails(false);
                                    setSelectedTask(null);
                                }}
                                className="px-6 py-2 bg-slate-600 text-white rounded-lg font-medium hover:bg-slate-700 transition"
                            >
                                Cerrar
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Leyenda */}
            <div className="p-1.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-[9px] shrink-0">
                <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1">
                        <div className="w-2.5 h-2.5 bg-blue-500 rounded"></div>
                        <span className="text-slate-600">Fase Normal</span>
                    </div>
                    <div className="flex items-center gap-1">
                        <div className="w-2.5 h-2.5 bg-red-500 rounded"></div>
                        <span className="text-slate-600">Ruta Crítica</span>
                    </div>
                    <div className="flex items-center gap-1">
                        <LinkIcon size={10} className="text-slate-600" />
                        <span className="text-slate-600">Dependencias</span>
                    </div>
                </div>
                <div className="text-slate-500">
                    Arrastra las barras para cambiar fechas
                </div>
            </div>
        </div>
    );
};

export default GanttChart;

