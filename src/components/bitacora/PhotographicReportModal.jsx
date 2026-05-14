import React, { useState, useEffect } from 'react';
import { X, Camera, Save, Plus, Trash2, Check, Upload } from 'lucide-react';
import BitacoraService from '../../services/BitacoraService';
import ImageUploadService from '../../services/ImageUploadService';

const PhotographicReportModal = ({ isOpen, onClose, projectId, items = [], onSave, editingLog = null }) => {
    const [reportDate, setReportDate] = useState(new Date().toISOString().split('T')[0]);
    const [entries, setEntries] = useState([]);
    const [uploading, setUploading] = useState(false);

    // Cargar datos del log cuando se está editando
    useEffect(() => {
        if (isOpen && editingLog) {
            // Establecer fecha del reporte
            const logDate = editingLog.log_date ? new Date(editingLog.log_date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0];
            setReportDate(logDate);

            // Extraer nombre del concepto del subject
            const conceptName = editingLog.subject?.replace('Reporte Fotográfico: ', '') || 'Concepto';
            
            // Buscar el item correspondiente
            const item = items.find(i => 
                i.description === conceptName || 
                i.id?.toString() === editingLog.task_id
            );

            // Crear entrada con los datos del log
            const entry = {
                id: Date.now(),
                logId: editingLog.id, // ID del log para actualizar
                itemId: item?.id || editingLog.task_id,
                itemName: conceptName,
                itemCode: item?.code || '',
                photos: [], // Se cargarán desde las URLs
                previewUrls: editingLog.photos || [], // URLs existentes
                photoUrls: editingLog.photos || [], // URLs originales para mantener
                description: editingLog.content || '',
                progress: editingLog.progress_percentage || 100,
                isCompleted: editingLog.progress_percentage === 100
            };

            setEntries([entry]);
        } else if (isOpen && !editingLog) {
            // Resetear cuando se crea uno nuevo
            setReportDate(new Date().toISOString().split('T')[0]);
            setEntries([]);
        }
    }, [isOpen, editingLog, items]);

    // Limpiar previews al cerrar
    useEffect(() => {
        return () => {
            entries.forEach(entry => {
                entry.previewUrls.forEach(url => {
                    // Solo revocar si es un blob URL (no URLs de servidor)
                    if (url.startsWith('blob:')) {
                        ImageUploadService.revokePreviewUrl(url);
                    }
                });
            });
        };
    }, [entries]);

    if (!isOpen) return null;

    const handleAddBlock = () => {
        setEntries([...entries, {
            id: Date.now(),
            itemId: 'block-' + Date.now(),
            itemName: '',
            itemCode: '',
            photos: [],
            previewUrls: [],
            photoUrls: [],
            description: '',
            progress: 100,
            isCompleted: true
        }]);
    };

    const handleRemoveEntry = (entryId) => {
        const entry = entries.find(e => e.id === entryId);
        if (entry) {
            entry.previewUrls.forEach(url => ImageUploadService.revokePreviewUrl(url));
        }
        setEntries(entries.filter(e => e.id !== entryId));
    };

    const handleFileChange = (entryId, e) => {
        const selectedFiles = Array.from(e.target.files || []);
        if (selectedFiles.length === 0) return;

        (async () => {
            const validFiles = [];
            const newPreviewUrls = [];

            for (const file of selectedFiles) {
                try {
                    const optimized = await ImageUploadService.prepareImageForApp(file);
                    validFiles.push(optimized.file);
                    newPreviewUrls.push(ImageUploadService.createPreviewUrl(optimized.file));
                } catch (error) {
                    alert(`Error en ${file.name}: ${error.message}`);
                }
            }

            setEntries(currentEntries => currentEntries.map(entry => {
                if (entry.id === entryId) {
                    return {
                        ...entry,
                        photos: [...entry.photos, ...validFiles],
                        previewUrls: [...entry.previewUrls, ...newPreviewUrls]
                    };
                }
                return entry;
            }));
        })();
    };

    const updateEntry = (entryId, field, value) => {
        setEntries(entries.map(entry => {
            if (entry.id === entryId) {
                return { ...entry, [field]: value };
            }
            return entry;
        }));
    };

    /** Actualiza varios campos de una entrada a la vez (evita estados intermedios al eliminar fotos). */
    const updateEntryFields = (entryId, updates) => {
        setEntries(entries.map(entry =>
            entry.id === entryId ? { ...entry, ...updates } : entry
        ));
    };

    const handleSave = async () => {
        if (entries.length === 0) {
            alert('Agrega al menos un bloque (fotos y concepto).');
            return;
        }

        setUploading(true);
        try {
            // Procesar cada entrada secuencialmente
            for (const entry of entries) {
                // 1. Subir nuevas fotos (si hay)
                let newPhotoUrls = [];
                if (entry.photos.length > 0) {
                    newPhotoUrls = await ImageUploadService.uploadMultipleImages(
                        entry.photos,
                        projectId,
                        'report-' + entry.itemId
                    );
                }

                // 2. Combinar URLs existentes con nuevas
                const existingUrls = entry.photoUrls || [];
                const allPhotoUrls = [...existingUrls, ...newPhotoUrls];

                // 3. Fecha del reporte
                const logDate = new Date(reportDate + 'T12:00:00').toISOString();

                const conceptName = (entry.itemName || '').trim() || `Concepto ${entry.itemId}`;
                if (editingLog && entry.logId) {
                    await BitacoraService.updateLog(entry.logId, {
                        content: entry.description || `Reporte fotográfico: ${conceptName}`,
                        progressPercentage: entry.isCompleted ? 100 : entry.progress,
                        photos: allPhotoUrls,
                        subject: `Reporte Fotográfico: ${conceptName}`
                    });
                } else {
                    await BitacoraService.createLog({
                        projectId,
                        taskId: entry.itemId.toString(),
                        content: entry.description || `Reporte fotográfico: ${conceptName}`,
                        progressPercentage: entry.isCompleted ? 100 : entry.progress,
                        photos: allPhotoUrls,
                        subject: `Reporte Fotográfico: ${conceptName}`,
                        classification: 'Informe',
                        authorRole: 'Residente',
                        status: 'Abierta',
                        logDate: logDate
                    });
                }
            }

            onSave();
            onClose();
        } catch (error) {
            console.error('Error saving report:', error);
            alert('Error al guardar el reporte: ' + error.message);
        } finally {
            setUploading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[90] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/80 backdrop-blur-sm animate-fadeIn">
            <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl max-w-4xl w-full h-[92vh] sm:h-[90vh] max-h-[900px] flex flex-col overflow-hidden">
                {/* Header: título, fecha y acciones */}
                <div className="shrink-0 p-4 sm:p-5 border-b border-slate-200 bg-slate-800 text-white flex flex-wrap items-center justify-between gap-3">
                    <div className="min-w-0 flex items-center gap-4 flex-wrap">
                        <div>
                            <h3 className="font-bold text-lg sm:text-xl flex items-center gap-2">
                                <Camera className="shrink-0" size={24} /> <span className="truncate">{editingLog ? 'Editar' : 'Nuevo'} Reporte Fotográfico</span>
                            </h3>
                            <p className="text-slate-400 text-xs sm:text-sm truncate mt-0.5">
                                {editingLog ? 'Modifica el reporte' : 'Fotos y concepto por bloque'}
                            </p>
                        </div>
                        <label className="flex items-center gap-2 shrink-0">
                            <span className="text-slate-400 text-xs font-medium">Fecha:</span>
                            <input
                                type="date"
                                value={reportDate}
                                onChange={(e) => setReportDate(e.target.value)}
                                className="bg-white/10 border border-slate-500 rounded-lg px-3 py-1.5 text-sm font-medium text-white focus:ring-2 focus:ring-indigo-400 outline-none"
                            />
                        </label>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                        <button
                            type="button"
                            onClick={handleSave}
                            disabled={uploading || entries.length === 0}
                            className="bg-indigo-500 hover:bg-indigo-600 text-white font-bold px-4 py-2 rounded-xl transition flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed min-h-[40px] touch-manipulation"
                        >
                            {uploading ? (
                                <><span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Guardando...</>
                            ) : (
                                <><Save size={18} /> {editingLog ? 'Actualizar' : 'Guardar'}</>
                            )}
                        </button>
                        <button type="button" onClick={onClose} className="p-2 rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition touch-manipulation" aria-label="Cerrar">
                            <X size={24} />
                        </button>
                    </div>
                </div>

                {/* Contenido: bloques de fotos + concepto debajo, sin barra lateral */}
                <div className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-6 bg-slate-100">
                    {entries.length === 0 ? (
                        <div className="min-h-[280px] flex flex-col items-center justify-center text-slate-500 px-4">
                            <div className="w-16 h-16 rounded-2xl bg-slate-200/80 flex items-center justify-center mb-4">
                                <Camera size={32} className="text-slate-400" />
                            </div>
                            <p className="font-semibold text-base text-slate-600 text-center">Agrega fotos y concepto</p>
                            <p className="text-sm text-slate-400 text-center mt-1">Cada bloque puede tener varias fotos y un concepto debajo.</p>
                            <button
                                type="button"
                                onClick={handleAddBlock}
                                className="mt-6 inline-flex items-center gap-2 px-5 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl transition shadow-lg shadow-indigo-200/50 min-h-[44px] touch-manipulation"
                            >
                                <Plus size={20} /> Agregar fotos y concepto
                            </button>
                        </div>
                    ) : (
                        <div className="space-y-6 max-w-3xl mx-auto">
                            {entries.map((entry, index) => (
                                <div key={entry.id} className="bg-white rounded-xl shadow-sm border-2 border-slate-200 overflow-hidden">
                                    <div className="p-4 sm:p-5">
                                        <div className="flex items-center justify-between gap-3 mb-4">
                                            <span className="text-xs font-bold text-slate-500 uppercase tracking-wide">Bloque {index + 1}</span>
                                            <button
                                                type="button"
                                                onClick={() => handleRemoveEntry(entry.id)}
                                                className="p-2 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition touch-manipulation"
                                                title="Eliminar bloque"
                                            >
                                                <Trash2 size={18} />
                                            </button>
                                        </div>

                                        {/* Fotos */}
                                        <div className="mb-4">
                                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                                                {entry.previewUrls.map((url, idx) => (
                                                    <div key={idx} className="aspect-square relative group rounded-lg overflow-hidden border border-slate-200">
                                                        <img src={url} className="w-full h-full object-cover" alt="Evidencia" />
                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                const newPreviewUrls = entry.previewUrls.filter((_, i) => i !== idx);
                                                                const newPhotoUrls = (entry.photoUrls || []).filter((_, i) => i !== idx);
                                                                const existingCount = (entry.photoUrls || []).length;
                                                                const newPhotos = idx >= existingCount ? entry.photos.filter((_, i) => i !== idx - existingCount) : entry.photos;
                                                                updateEntryFields(entry.id, { previewUrls: newPreviewUrls, photoUrls: newPhotoUrls, photos: newPhotos });
                                                            }}
                                                            className="absolute top-1.5 right-1.5 p-1.5 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition shadow-lg hover:bg-red-600 min-w-[28px] min-h-[28px] flex items-center justify-center"
                                                            title="Eliminar foto"
                                                        >
                                                            <Trash2 size={12} />
                                                        </button>
                                                    </div>
                                                ))}
                                                <label className="aspect-square border-2 border-dashed border-slate-300 rounded-lg flex flex-col items-center justify-center cursor-pointer hover:bg-indigo-50/50 hover:border-indigo-400 transition text-slate-400 hover:text-indigo-600 touch-manipulation">
                                                    <Upload size={22} className="mb-1" />
                                                    <span className="text-xs font-bold">Subir</span>
                                                    <input type="file" accept="image/*" multiple className="hidden" onChange={(e) => handleFileChange(entry.id, e)} />
                                                </label>
                                            </div>
                                        </div>

                                        {/* Concepto debajo de las fotos (input, no select que se despliega) */}
                                        <div className="mb-4">
                                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">Concepto</label>
                                            <input
                                                type="text"
                                                value={entry.itemName}
                                                onChange={(e) => updateEntry(entry.id, 'itemName', e.target.value)}
                                                className="w-full border-2 border-slate-200 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                                                placeholder="Nombre del concepto o partida"
                                            />
                                        </div>

                                        <div className="mb-3">
                                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">Concepto general</label>
                                            <textarea
                                                value={entry.description}
                                                onChange={(e) => updateEntry(entry.id, 'description', e.target.value)}
                                                className="w-full border-2 border-slate-200 rounded-xl p-3 text-sm outline-none focus:ring-2 focus:ring-indigo-500 resize-none min-h-[80px]"
                                                placeholder="Concepto general de todas las fotos de este bloque..."
                                                rows={2}
                                            />
                                        </div>

                                        <div className="flex items-center gap-3 bg-slate-50 p-3 rounded-xl border border-slate-100">
                                            <button
                                                type="button"
                                                onClick={() => updateEntry(entry.id, 'isCompleted', !entry.isCompleted)}
                                                className={`shrink-0 w-6 h-6 rounded-md border-2 flex items-center justify-center transition ${entry.isCompleted ? 'bg-green-500 border-green-600 text-white' : 'bg-white border-slate-300'}`}
                                                aria-checked={entry.isCompleted}
                                            >
                                                <Check size={14} strokeWidth={4} />
                                            </button>
                                            <span className="text-sm font-medium text-slate-700">Terminado (100%)</span>
                                        </div>
                                    </div>
                                </div>
                            ))}

                            <button
                                type="button"
                                onClick={handleAddBlock}
                                className="w-full py-4 border-2 border-dashed border-slate-300 rounded-xl text-slate-500 hover:border-indigo-400 hover:text-indigo-600 hover:bg-indigo-50/30 font-bold transition flex items-center justify-center gap-2 touch-manipulation"
                            >
                                <Plus size={22} /> Agregar más fotos y concepto
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default PhotographicReportModal;
