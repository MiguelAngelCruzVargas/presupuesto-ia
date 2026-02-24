import React, { useState } from 'react';
import { X, BookOpen, Save, Calendar } from 'lucide-react';
import BitacoraService from '../../services/BitacoraService';

const DiaryEntryModal = ({ isOpen, onClose, projectId, onSave, editingEntry = null }) => {
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [content, setContent] = useState('');
    const [authorName, setAuthorName] = useState('');
    const [authorRole, setAuthorRole] = useState('Residente');
    const [authorSignature, setAuthorSignature] = useState('');
    const [uploading, setUploading] = useState(false);
    const [noteNumber, setNoteNumber] = useState(null);

    // Cargar datos si se está editando
    React.useEffect(() => {
        if (isOpen && editingEntry) {
            const entryDate = editingEntry.log_date ? new Date(editingEntry.log_date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0];
            setDate(entryDate);
            setContent(editingEntry.content || '');
            setAuthorName(editingEntry.author_name || '');
            setAuthorRole(editingEntry.author_role || 'Residente');
            setAuthorSignature(editingEntry.author_signature || '');
        } else if (isOpen && !editingEntry) {
            // Resetear para nueva entrada
            setDate(new Date().toISOString().split('T')[0]);
            setContent('');
            setAuthorName('');
            setAuthorRole('Residente');
            setAuthorSignature('');
        }
    }, [isOpen, editingEntry]);

    // Obtener número de nota
    React.useEffect(() => {
        if (isOpen && projectId && !editingEntry) {
            const fetchNextNoteNumber = async () => {
                try {
                    const nextNumber = await BitacoraService.getNextNoteNumber(projectId);
                    setNoteNumber(nextNumber);
                } catch (error) {
                    console.error('Error fetching note number:', error);
                    setNoteNumber(1);
                }
            };
            fetchNextNoteNumber();
        } else if (editingEntry) {
            setNoteNumber(editingEntry.note_number);
        }
    }, [isOpen, projectId, editingEntry]);

    if (!isOpen) return null;

    const handleSubmit = async () => {
        if (!projectId) {
            alert('Error: No se encontró el ID del proyecto');
            return;
        }

        if (!content.trim()) {
            alert('Por favor, escribe el contenido del diario');
            return;
        }

        if (!authorName.trim()) {
            alert('Por favor, ingresa el nombre del autor');
            return;
        }

        setUploading(true);
        try {
            const logDate = new Date(date + 'T12:00:00').toISOString();

            if (editingEntry && editingEntry.id) {
                // Actualizar entrada existente
                await BitacoraService.updateLog(editingEntry.id, {
                    content,
                    logDate,
                    authorName,
                    authorRole,
                    authorSignature,
                    classification: 'Informe',
                    subject: `Diario de Obra - ${new Date(date).toLocaleDateString('es-MX')}`,
                    isDiaryEntry: true
                });
            } else {
                // Crear nueva entrada
                await BitacoraService.createLog({
                    projectId,
                    taskId: 'diary',
                    content,
                    progressPercentage: 0,
                    photos: [],
                    subject: `Diario de Obra - ${new Date(date).toLocaleDateString('es-MX')}`,
                    classification: 'Informe',
                    authorRole,
                    status: 'Abierta',
                    logDate,
                    noteNumber,
                    authorName,
                    authorSignature,
                    isDiaryEntry: true
                });
            }

            onSave();
            onClose();
            
            // Resetear formulario
            setDate(new Date().toISOString().split('T')[0]);
            setContent('');
            setAuthorName('');
            setAuthorRole('Residente');
            setAuthorSignature('');
        } catch (error) {
            console.error('Error saving diary entry:', error);
            alert('Error al guardar la entrada del diario: ' + error.message);
        } finally {
            setUploading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm animate-fadeIn">
            <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full overflow-hidden flex flex-col max-h-[90vh]">
                <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-800 text-white">
                    <div>
                        <h3 className="font-bold flex items-center text-lg">
                            <BookOpen className="mr-2" size={20} /> 
                            {editingEntry ? 'Editar' : 'Nueva'} Entrada de Diario
                        </h3>
                        <p className="text-xs text-slate-400 mt-1">
                            Folio #{noteNumber || '...'} • Registro diario de actividades
                        </p>
                    </div>
                    <button onClick={onClose} className="text-white/60 hover:text-white">
                        <X size={24} />
                    </button>
                </div>

                <div className="p-6 space-y-5 overflow-y-auto flex-1">
                    {/* Fecha */}
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                            Fecha del Registro <span className="text-red-500">*</span>
                        </label>
                        <div className="relative">
                            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                            <input
                                type="date"
                                value={date}
                                onChange={(e) => setDate(e.target.value)}
                                className="w-full pl-10 bg-slate-50 border border-slate-200 rounded-lg py-2 px-3 text-sm font-medium text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500"
                            />
                        </div>
                    </div>

                    {/* Contenido del Diario */}
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                            Registro de Actividades <span className="text-red-500">*</span>
                        </label>
                        <textarea
                            value={content}
                            onChange={(e) => setContent(e.target.value)}
                            className="w-full p-4 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none resize-none h-64 text-sm leading-relaxed"
                            placeholder="Describe las actividades realizadas durante el día, trabajos ejecutados, observaciones, incidencias, personal presente, materiales utilizados, etc..."
                        />
                    </div>

                    {/* Información del Autor */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-4 border-t border-slate-100">
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                                Nombre del Autor <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="text"
                                value={authorName}
                                onChange={(e) => setAuthorName(e.target.value)}
                                className="w-full font-medium text-slate-800 border-b-2 border-slate-200 focus:border-indigo-500 outline-none py-2 px-1 transition"
                                placeholder="Ej: Ing. Juan Pérez"
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                                Cargo / Rol
                            </label>
                            <div className="flex gap-3">
                                {['Supervisor', 'Residente', 'Superintendente', 'Otro'].map(role => (
                                    <button
                                        key={role}
                                        onClick={() => setAuthorRole(role)}
                                        className={`px-3 py-1.5 rounded-full text-xs font-bold border transition ${
                                            authorRole === role
                                                ? 'bg-indigo-50 border-indigo-200 text-indigo-700'
                                                : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300'
                                        }`}
                                    >
                                        {role}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Firma */}
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                            Firma (Opcional)
                        </label>
                        <input
                            type="text"
                            value={authorSignature}
                            onChange={(e) => setAuthorSignature(e.target.value)}
                            className="w-full font-medium text-slate-800 border-b-2 border-slate-200 focus:border-indigo-500 outline-none py-2 px-1 transition"
                            placeholder="Firma digital o nombre para firmar"
                        />
                        <p className="text-xs text-slate-400 mt-1">
                            Este campo aparecerá como firma en el PDF del diario
                        </p>
                    </div>
                </div>

                <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end gap-2">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-slate-600 hover:bg-slate-200 rounded-lg font-medium transition"
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={uploading}
                        className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold transition flex items-center shadow-lg shadow-indigo-200 disabled:opacity-50"
                    >
                        {uploading ? 'Guardando...' : <><Save size={18} className="mr-2" /> Guardar Entrada</>}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default DiaryEntryModal;

