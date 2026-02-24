import React, { useState } from 'react';
import { X, FileText, Save, Cloud, Users, Package, AlertCircle } from 'lucide-react';
import BitacoraService from '../../services/BitacoraService';
import { useSubscription } from '../../context/SubscriptionContext';
import LimitModal from '../subscription/LimitModal';

const LogEntryModal = ({ isOpen, onClose, task, projectId, onSave, editingLog = null }) => {
    const { checkLimit, incrementUsage, isPro } = useSubscription();
    const [content, setContent] = useState('');
    const [progress, setProgress] = useState(0);
    const [uploading, setUploading] = useState(false);
    const [limitModal, setLimitModal] = useState({
        isOpen: false,
        actionType: null,
        usage: 0,
        limit: 0
    });

    // Campos profesionales
    const [subject, setSubject] = useState('');
    const [classification, setClassification] = useState('Informe');
    const [authorRole, setAuthorRole] = useState('Residente');
    const [status, setStatus] = useState('Abierta');
    const [noteNumber, setNoteNumber] = useState(null);
    
    // Campos específicos para bitácora de obra civil
    const [weather, setWeather] = useState(''); // Condiciones climáticas
    const [materials, setMaterials] = useState(''); // Materiales utilizados
    const [personnel, setPersonnel] = useState(''); // Personal utilizado
    const [observations, setObservations] = useState(''); // Observaciones adicionales

    // Cargar datos si se está editando
    React.useEffect(() => {
        if (isOpen && editingLog) {
            // Limpiar contenido de metadata
            const cleanContent = BitacoraService.getCleanContent(editingLog.content || '');
            setContent(cleanContent);
            setProgress(editingLog.progress_percentage || 0);
            setSubject(editingLog.subject || '');
            setClassification(editingLog.classification || 'Informe');
            setAuthorRole(editingLog.author_role || 'Residente');
            setStatus(editingLog.status || 'Abierta');
            setNoteNumber(editingLog.note_number);
            // Cargar campos adicionales (extraer de metadata del contenido)
            const metadata = BitacoraService.extractBitacoraMetadata(editingLog.content) || {};
            setWeather(metadata.weather || '');
            setMaterials(metadata.materials || '');
            setPersonnel(metadata.personnel || '');
            setObservations(metadata.observations || '');
        } else if (isOpen && !editingLog) {
            // Resetear para nueva nota
            setContent('');
            setProgress(task?.progress || 0);
            setSubject('');
            setClassification('Informe');
            setAuthorRole('Residente');
            setStatus('Abierta');
            setWeather('');
            setMaterials('');
            setPersonnel('');
            setObservations('');
        }
    }, [isOpen, editingLog, task]);

    // Fetch next note number on open (solo si no se está editando)
    React.useEffect(() => {
        if (isOpen && projectId && !editingLog) {
            const fetchNextNoteNumber = async () => {
                try {
                    const nextNumber = await BitacoraService.getNextNoteNumber(projectId);
                    setNoteNumber(nextNumber);
                } catch (error) {
                    console.error('Error fetching note number:', error);
                    setNoteNumber(1); // Fallback
                }
            };
            fetchNextNoteNumber();
        } else if (editingLog) {
            setNoteNumber(editingLog.note_number);
        }
    }, [isOpen, projectId, editingLog]);

    if (!isOpen) return null;
    
    // Si no hay task, crear una por defecto
    const taskData = task || { id: 'general', name: 'Nota General', progress: 0 };

    const handleSubmit = async () => {
        if (!projectId) {
            alert('Error: No se encontró el ID del proyecto');
            return;
        }

        // Validar datos
        const validation = BitacoraService.validateLogData({
            projectId,
            taskId: taskData.id,
            subject,
            progressPercentage: progress,
            classification,
            authorRole,
            status
        });

        if (!validation.valid) {
            alert('Errores de validación:\n' + validation.errors.join('\n'));
            return;
        }

        setUploading(true);
        try {
            // Preparar metadata con campos adicionales
            const metadata = {
                weather,
                materials,
                personnel,
                observations
            };

            // Crear o actualizar nota
            if (editingLog) {
                // Actualizar nota existente
                await BitacoraService.updateLog(editingLog.id, {
                    content,
                    progressPercentage: progress,
                    subject,
                    classification,
                    authorRole,
                    status,
                    noteNumber,
                    metadata
                });
            } else {
                // Verificar límite antes de crear nueva nota
                if (!isPro) {
                    const limitCheck = await checkLimit('bitacoraEntries');
                    if (!limitCheck.allowed) {
                        setLimitModal({
                            isOpen: true,
                            actionType: 'bitacoraEntries',
                            usage: limitCheck.current,
                            limit: limitCheck.limit
                        });
                        setUploading(false);
                        return;
                    }
                }

                // Crear nueva nota
                await BitacoraService.createLog({
                    projectId,
                    taskId: taskData.id,
                    content,
                    progressPercentage: progress,
                    subject,
                    classification,
                    authorRole,
                    status,
                    noteNumber,
                    metadata
                });

                // Incrementar contador de uso
                if (!isPro) {
                    await incrementUsage('bitacoraEntries');
                }
            }

            onSave();
            onClose();
            
            // Resetear formulario
            setContent('');
            setProgress(taskData.progress || 0);
            setSubject('');
            setWeather('');
            setMaterials('');
            setPersonnel('');
            setObservations('');
        } catch (error) {
            console.error('Error saving log:', error);
            alert('Error al guardar la nota: ' + error.message);
        } finally {
            setUploading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm animate-fadeIn">
            <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full overflow-hidden flex flex-col max-h-[90vh]">
                <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-800 text-white">
                    <div>
                        <h3 className="font-bold flex items-center text-lg">
                            <FileText className="mr-2" size={20} /> {editingLog ? 'Editar Nota de Bitácora' : 'Nueva Nota de Bitácora'}
                        </h3>
                        <p className="text-xs text-slate-400 mt-1">Folio #{noteNumber || '...'} • {taskData.name}</p>
                    </div>
                    <button onClick={onClose} className="text-white/60 hover:text-white"><X size={24} /></button>
                </div>

                <div className="p-6 space-y-5 overflow-y-auto flex-1">
                    {/* Top Row: Classification & Status */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Clasificación</label>
                            <select
                                value={classification}
                                onChange={(e) => setClassification(e.target.value)}
                                className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2 px-3 text-sm font-medium text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500"
                            >
                                <option>Apertura</option>
                                <option>Orden</option>
                                <option>Solicitud</option>
                                <option>Autorización</option>
                                <option>Informe</option>
                                <option>Cierre</option>
                                <option>Otro</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Estatus</label>
                            <div className="flex bg-slate-100 rounded-lg p-1">
                                <button
                                    onClick={() => setStatus('Abierta')}
                                    className={`flex-1 py-1.5 text-xs font-bold rounded-md transition ${status === 'Abierta' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                                >
                                    Abierta
                                </button>
                                <button
                                    onClick={() => setStatus('Cerrada')}
                                    className={`flex-1 py-1.5 text-xs font-bold rounded-md transition ${status === 'Cerrada' ? 'bg-white text-green-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                                >
                                    Cerrada
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Subject */}
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Asunto <span className="text-red-500">*</span></label>
                        <input
                            value={subject}
                            onChange={(e) => setSubject(e.target.value)}
                            className="w-full font-bold text-slate-800 border-b-2 border-slate-200 focus:border-indigo-500 outline-none py-2 px-1 transition"
                            placeholder="Ej: Solicitud de estimación 1"
                        />
                    </div>

                    {/* Author Role */}
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Firma como</label>
                        <div className="flex gap-3">
                            {['Supervisor', 'Residente', 'Superintendente'].map(role => (
                                <button
                                    key={role}
                                    onClick={() => setAuthorRole(role)}
                                    className={`px-3 py-1.5 rounded-full text-xs font-bold border transition ${authorRole === role ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300'}`}
                                >
                                    {role}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Content */}
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Descripción de Actividades <span className="text-red-500">*</span></label>
                        <textarea
                            value={content}
                            onChange={(e) => setContent(e.target.value)}
                            className="w-full p-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none resize-none h-32 text-sm"
                            placeholder="Describe detalladamente las actividades realizadas, hechos, órdenes o solicitudes..."
                        />
                    </div>

                    {/* Campos específicos de bitácora de obra civil */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-4 border-t border-slate-100">
                        {/* Condiciones Climáticas */}
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1 flex items-center gap-1">
                                <Cloud size={14} /> Condiciones Climáticas
                            </label>
                            <input
                                type="text"
                                value={weather}
                                onChange={(e) => setWeather(e.target.value)}
                                className="w-full p-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
                                placeholder="Ej: Soleado, 25°C, sin viento"
                            />
                        </div>

                        {/* Avance Físico */}
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Avance Físico (%)</label>
                            <div className="flex items-center gap-3">
                                <input
                                    type="range"
                                    min="0"
                                    max="100"
                                    value={progress}
                                    onChange={(e) => setProgress(parseInt(e.target.value))}
                                    className="flex-1 h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                                />
                                <div className="text-right text-sm font-bold text-indigo-600 w-12">{progress}%</div>
                            </div>
                        </div>
                    </div>

                    {/* Recursos Utilizados */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-4 border-t border-slate-100">
                        {/* Materiales */}
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1 flex items-center gap-1">
                                <Package size={14} /> Materiales Utilizados
                            </label>
                            <textarea
                                value={materials}
                                onChange={(e) => setMaterials(e.target.value)}
                                className="w-full p-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none resize-none h-20 text-sm"
                                placeholder="Ej: 50 m³ de concreto, 200 kg de acero..."
                            />
                        </div>

                        {/* Personal */}
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1 flex items-center gap-1">
                                <Users size={14} /> Personal Utilizado
                            </label>
                            <textarea
                                value={personnel}
                                onChange={(e) => setPersonnel(e.target.value)}
                                className="w-full p-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none resize-none h-20 text-sm"
                                placeholder="Ej: 3 albañiles, 1 capataz, 1 ayudante..."
                            />
                        </div>
                    </div>

                    {/* Observaciones */}
                    <div className="pt-4 border-t border-slate-100">
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1 flex items-center gap-1">
                            <AlertCircle size={14} /> Observaciones Adicionales
                        </label>
                        <textarea
                            value={observations}
                            onChange={(e) => setObservations(e.target.value)}
                            className="w-full p-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none resize-none h-24 text-sm"
                            placeholder="Incidentes, desviaciones, correcciones, o cualquier observación relevante..."
                        />
                    </div>
                </div>

                <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end gap-2">
                    <button onClick={onClose} className="px-4 py-2 text-slate-600 hover:bg-slate-200 rounded-lg font-medium transition">
                        Cancelar
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={uploading}
                        className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold transition flex items-center shadow-lg shadow-indigo-200 disabled:opacity-50"
                    >
                        {uploading ? 'Firmando...' : <><Save size={18} className="mr-2" /> Firmar Nota</>}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default LogEntryModal;
