import React, { useState, useEffect } from 'react';
import { X, Camera, Save, Plus, Trash2, Calendar, Search, Check, Upload } from 'lucide-react';
import BitacoraService from '../../services/BitacoraService';
import ImageUploadService from '../../services/ImageUploadService';

const PhotographicReportModal = ({ isOpen, onClose, projectId, items = [], onSave, editingLog = null }) => {
    const [reportDate, setReportDate] = useState(new Date().toISOString().split('T')[0]);
    const [entries, setEntries] = useState([]);
    const [uploading, setUploading] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [showItemSelector, setShowItemSelector] = useState(false);

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

    const handleAddItem = (item) => {
        const newEntry = {
            id: Date.now(),
            itemId: item.id,
            itemName: item.description || item.concept || 'Concepto sin nombre',
            itemCode: item.code || '',
            photos: [],
            previewUrls: [],
            description: '',
            progress: 100, // Default to completed
            isCompleted: true
        };
        setEntries([...entries, newEntry]);
        setShowItemSelector(false);
        setSearchTerm('');
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

        const validFiles = [];
        const newPreviewUrls = [];

        selectedFiles.forEach(file => {
            const validation = ImageUploadService.validateImage(file);
            if (validation.valid) {
                validFiles.push(file);
                newPreviewUrls.push(ImageUploadService.createPreviewUrl(file));
            } else {
                alert(`Error en ${file.name}: ${validation.error}`);
            }
        });

        setEntries(entries.map(entry => {
            if (entry.id === entryId) {
                return {
                    ...entry,
                    photos: [...entry.photos, ...validFiles],
                    previewUrls: [...entry.previewUrls, ...newPreviewUrls]
                };
            }
            return entry;
        }));
    };

    const updateEntry = (entryId, field, value) => {
        setEntries(entries.map(entry => {
            if (entry.id === entryId) {
                return { ...entry, [field]: value };
            }
            return entry;
        }));
    };

    const handleSave = async () => {
        if (entries.length === 0) {
            alert('Agrega al menos un concepto al reporte.');
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

                if (editingLog && entry.logId) {
                    // Actualizar log existente
                    await BitacoraService.updateLog(entry.logId, {
                        content: entry.description || `Reporte fotográfico del concepto: ${entry.itemName}`,
                        progressPercentage: entry.isCompleted ? 100 : entry.progress,
                        photos: allPhotoUrls,
                        subject: `Reporte Fotográfico: ${entry.itemName}`
                    });
                } else {
                    // Crear nuevo log
                    await BitacoraService.createLog({
                        projectId,
                        taskId: entry.itemId.toString(),
                        content: entry.description || `Reporte fotográfico del concepto: ${entry.itemName}`,
                        progressPercentage: entry.isCompleted ? 100 : entry.progress,
                        photos: allPhotoUrls,
                        subject: `Reporte Fotográfico: ${entry.itemName}`,
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

    // Filtrar items para el buscador
    const filteredItems = items.filter(item =>
        (item.description || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (item.code || '').toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="fixed inset-0 z-[90] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm animate-fadeIn">
            <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full h-[90vh] flex flex-col overflow-hidden">
                {/* Header */}
                <div className="p-5 border-b border-slate-100 bg-slate-800 text-white flex justify-between items-center">
                    <div>
                        <h3 className="font-bold text-xl flex items-center">
                            <Camera className="mr-2" size={24} /> {editingLog ? 'Editar' : 'Nuevo'} Reporte Fotográfico
                        </h3>
                        <p className="text-slate-400 text-sm">
                            {editingLog ? 'Modifica el reporte existente' : 'Genera un reporte diario con múltiples conceptos'}
                        </p>
                    </div>
                    <button onClick={onClose} className="text-white/60 hover:text-white transition">
                        <X size={28} />
                    </button>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-hidden flex flex-col md:flex-row">
                    {/* Sidebar / Controls */}
                    <div className="w-full md:w-80 bg-slate-50 border-r border-slate-200 p-5 flex flex-col gap-6 overflow-y-auto">
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Fecha del Reporte</label>
                            <input
                                type="date"
                                value={reportDate}
                                onChange={(e) => setReportDate(e.target.value)}
                                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm font-medium text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500"
                            />
                        </div>

                        <div className="flex-1">
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Agregar Concepto</label>
                            <div className="relative">
                                <button
                                    onClick={() => setShowItemSelector(!showItemSelector)}
                                    className="w-full bg-white border border-slate-300 hover:border-indigo-500 text-slate-600 px-4 py-3 rounded-xl flex items-center justify-between transition shadow-sm"
                                >
                                    <span className="font-medium">Seleccionar concepto...</span>
                                    <Plus size={18} />
                                </button>

                                {showItemSelector && (
                                    <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl shadow-xl border border-slate-200 z-50 max-h-80 flex flex-col">
                                        <div className="p-3 border-b border-slate-100">
                                            <div className="relative">
                                                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                                <input
                                                    autoFocus
                                                    type="text"
                                                    placeholder="Buscar concepto..."
                                                    value={searchTerm}
                                                    onChange={(e) => setSearchTerm(e.target.value)}
                                                    className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                                                />
                                            </div>
                                        </div>
                                        <div className="overflow-y-auto flex-1 p-1">
                                            {filteredItems.length > 0 ? (
                                                filteredItems.map(item => (
                                                    <button
                                                        key={item.id}
                                                        onClick={() => handleAddItem(item)}
                                                        className="w-full text-left px-3 py-2 hover:bg-indigo-50 rounded-lg text-sm text-slate-700 transition group"
                                                    >
                                                        <div className="font-bold text-xs text-slate-500 mb-0.5">{item.code}</div>
                                                        <div className="line-clamp-2 group-hover:text-indigo-700">{item.description}</div>
                                                    </button>
                                                ))
                                            ) : (
                                                <div className="p-4 text-center text-slate-400 text-xs">No se encontraron conceptos</div>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="bg-indigo-50 p-4 rounded-xl border border-indigo-100">
                            <h4 className="font-bold text-indigo-900 text-sm mb-1">Resumen</h4>
                            <p className="text-indigo-700 text-xs mb-3">
                                {entries.length} conceptos agregados al reporte.
                            </p>
                            <button
                                onClick={handleSave}
                                disabled={uploading || entries.length === 0}
                                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2.5 rounded-lg shadow-lg shadow-indigo-200 transition flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {uploading ? 'Guardando...' : <><Save size={18} /> {editingLog ? 'Actualizar Reporte' : 'Guardar Reporte'}</>}
                            </button>
                        </div>
                    </div>

                    {/* Main Content / Entries List */}
                    <div className="flex-1 bg-slate-100 p-6 overflow-y-auto">
                        {entries.length === 0 ? (
                            <div className="h-full flex flex-col items-center justify-center text-slate-400">
                                <Camera size={64} className="mb-4 opacity-20" />
                                <p className="font-medium text-lg">No hay conceptos en el reporte</p>
                                <p className="text-sm">Selecciona conceptos del menú lateral para comenzar.</p>
                            </div>
                        ) : (
                            <div className="space-y-6 max-w-3xl mx-auto">
                                {entries.map((entry, index) => (
                                    <div key={entry.id} className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden animate-fadeIn">
                                        {/* Entry Header */}
                                        <div className="p-4 border-b border-slate-100 flex justify-between items-start bg-slate-50/50">
                                            <div className="flex items-start gap-3">
                                                <div className="w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-700 font-bold text-sm shrink-0">
                                                    {index + 1}
                                                </div>
                                                <div>
                                                    <div className="text-xs font-bold text-slate-500 uppercase mb-0.5">{entry.itemCode}</div>
                                                    <h4 className="font-bold text-slate-800 text-sm leading-snug">{entry.itemName}</h4>
                                                </div>
                                            </div>
                                            <button
                                                onClick={() => handleRemoveEntry(entry.id)}
                                                className="text-slate-400 hover:text-red-500 transition p-1"
                                                title="Eliminar concepto"
                                            >
                                                <Trash2 size={18} />
                                            </button>
                                        </div>

                                        <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-6">
                                            {/* Photos */}
                                            <div>
                                                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Evidencia Fotográfica</label>
                                                <div className="grid grid-cols-3 gap-2 mb-3">
                                                    {entry.previewUrls.map((url, idx) => (
                                                        <div key={idx} className="aspect-square relative group rounded-lg overflow-hidden border border-slate-200">
                                                            <img src={url} className="w-full h-full object-cover" alt="evidence" />
                                                            {/* Botón para eliminar foto */}
                                                            <button
                                                                onClick={() => {
                                                                    const newPreviewUrls = entry.previewUrls.filter((_, i) => i !== idx);
                                                                    const newPhotoUrls = entry.photoUrls ? entry.photoUrls.filter((_, i) => i !== idx) : [];
                                                                    updateEntry(entry.id, 'previewUrls', newPreviewUrls);
                                                                    updateEntry(entry.id, 'photoUrls', newPhotoUrls);
                                                                }}
                                                                className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                                                                title="Eliminar foto"
                                                            >
                                                                <Trash2 size={12} />
                                                            </button>
                                                        </div>
                                                    ))}
                                                    <label className="aspect-square border-2 border-dashed border-slate-300 rounded-lg flex flex-col items-center justify-center cursor-pointer hover:bg-slate-50 hover:border-indigo-400 transition text-slate-400 hover:text-indigo-500">
                                                        <Upload size={20} className="mb-1" />
                                                        <span className="text-[10px] font-bold">Subir</span>
                                                        <input
                                                            type="file"
                                                            accept="image/*"
                                                            multiple
                                                            className="hidden"
                                                            onChange={(e) => handleFileChange(entry.id, e)}
                                                        />
                                                    </label>
                                                </div>
                                            </div>

                                            {/* Details */}
                                            <div className="space-y-4">
                                                <div>
                                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Descripción / Observaciones</label>
                                                    <textarea
                                                        value={entry.description}
                                                        onChange={(e) => updateEntry(entry.id, 'description', e.target.value)}
                                                        className="w-full border border-slate-200 rounded-lg p-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none resize-none h-24"
                                                        placeholder="Describe los trabajos realizados..."
                                                    />
                                                </div>

                                                <div className="flex items-center gap-3 bg-slate-50 p-3 rounded-lg border border-slate-100">
                                                    <button
                                                        onClick={() => updateEntry(entry.id, 'isCompleted', !entry.isCompleted)}
                                                        className={`w-5 h-5 rounded border flex items-center justify-center transition ${entry.isCompleted
                                                                ? 'bg-green-500 border-green-600 text-white'
                                                                : 'bg-white border-slate-300 text-transparent'
                                                            }`}
                                                    >
                                                        <Check size={14} strokeWidth={4} />
                                                    </button>
                                                    <span className="text-sm font-medium text-slate-700">Marcar como Terminado (100%)</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PhotographicReportModal;
