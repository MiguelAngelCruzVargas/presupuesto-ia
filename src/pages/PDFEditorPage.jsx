import React, { useState, useMemo, useCallback } from 'react';
import {
    Upload, FileText, Edit3, Save, Trash2,
    Plus, AlertCircle, ArrowLeft, Loader2, Check
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

/**
 * PDFEditorPage - Versión Optimizada
 * Mejoras: Rendimiento con useMemo, validación centralizada, 
 * feedback visual de Drag & Drop y modularidad.
 */
const PDFEditorPage = () => {
    const navigate = useNavigate();

    // --- Estados ---
    const [pdfFile, setPdfFile] = useState(null);
    const [isExtracting, setIsExtracting] = useState(false);
    const [extractedData, setExtractedData] = useState(null);
    const [editableItems, setEditableItems] = useState([]);
    const [projectInfo, setProjectInfo] = useState({
        project: '',
        client: '',
        location: '',
        taxRate: 16
    });
    const [error, setError] = useState(null);
    const [isDragging, setIsDragging] = useState(false);

    // --- Helpers y Formateadores ---
    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('es-MX', {
            style: 'currency',
            currency: 'MXN',
        }).format(amount);
    };

    // --- Lógica de Archivos ---
    const validateAndSetFile = useCallback((file) => {
        if (file && file.type === 'application/pdf') {
            setPdfFile(file);
            setError(null);
            return true;
        }
        setError('Por favor selecciona un archivo PDF válido');
        return false;
    }, []);

    const handleFileSelect = (e) => validateAndSetFile(e.target.files[0]);

    const handleDrop = (e) => {
        e.preventDefault();
        setIsDragging(false);
        validateAndSetFile(e.dataTransfer.files[0]);
    };

    // --- Lógica de Negocio (Extracción e Items) ---
    const handleExtract = async () => {
        if (!pdfFile) return;
        setIsExtracting(true);
        setError(null);

        const formData = new FormData();
        formData.append('file', pdfFile);

        try {
            const response = await fetch('/api/ai/extract-pdf', {
                method: 'POST',
                body: formData
            });

            const data = await response.json();

            if (data.success) {
                setExtractedData(data);
                setEditableItems(data.items || []);
                setProjectInfo(prev => ({ ...prev, ...data.projectInfo }));
            } else {
                throw new Error(data.error || 'No se pudieron extraer datos del PDF');
            }
        } catch (err) {
            setError(err.message || 'Error al procesar el PDF');
        } finally {
            setIsExtracting(false);
        }
    };

    const handleUpdateItem = (index, field, value) => {
        const updated = [...editableItems];
        updated[index] = { ...updated[index], [field]: value };
        setEditableItems(updated);
    };

    const handleDeleteItem = (index) => {
        setEditableItems(prev => prev.filter((_, i) => i !== index));
    };

    const handleAddItem = () => {
        setEditableItems(prev => [
            ...prev,
            {
                description: '',
                unit: 'pza',
                quantity: 0,
                unitPrice: 0,
                category: 'Materiales'
            }
        ]);
    };

    // --- Cálculos Optimizados ---
    const totals = useMemo(() => {
        const subtotal = editableItems.reduce((sum, item) =>
            sum + (Number(item.quantity) * Number(item.unitPrice)), 0
        );
        const tax = subtotal * (projectInfo.taxRate / 100);
        return { subtotal, tax, total: subtotal + tax };
    }, [editableItems, projectInfo.taxRate]);

    // --- Guardado ---
    const handleSaveAsProject = () => {
        const projectData = {
            projectInfo: {
                ...projectInfo,
                id: `pdf-${Date.now()}`,
                status: 'draft',
                createdAt: new Date().toISOString()
            },
            items: editableItems.map((item, index) => ({
                ...item,
                id: crypto.randomUUID?.() || `item-${index}-${Date.now()}`
            })),
            totals
        };

        localStorage.setItem('pendingPDFImport', JSON.stringify(projectData));
        navigate('/editor');
    };

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-900 p-4 md:p-8">
            <div className="max-w-7xl mx-auto space-y-6">

                {/* --- Header --- */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => navigate('/dashboard')}
                            className="p-2 hover:bg-white dark:hover:bg-slate-800 rounded-full shadow-sm transition-all"
                        >
                            <ArrowLeft size={20} className="text-slate-600 dark:text-slate-300" />
                        </button>
                        <div>
                            <h1 className="text-2xl md:text-3xl font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                                <FileText className="text-indigo-600" /> Editor de Presupuesto AI
                            </h1>
                            <p className="text-slate-500 dark:text-slate-400 text-sm">
                                Convierte tus archivos PDF en proyectos editables para TuGestor
                            </p>
                        </div>
                    </div>
                </div>

                {/* --- Vista de Carga --- */}
                {!extractedData ? (
                    <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-xl border border-slate-200 dark:border-slate-700 overflow-hidden max-w-2xl mx-auto mt-12">
                        <div className="p-8 md:p-14 text-center">
                            <div className="mb-8">
                                <div className="mx-auto w-20 h-20 bg-indigo-50 dark:bg-indigo-900/30 rounded-3xl flex items-center justify-center mb-6 text-indigo-600 dark:text-indigo-400">
                                    <Upload size={36} />
                                </div>
                                <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100 mb-2">Sube tu Presupuesto PDF</h2>
                                <p className="text-slate-500 dark:text-slate-400 max-w-xs mx-auto">Arrastra tu archivo aquí para comenzar la extracción inteligente</p>
                            </div>

                            <div
                                onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                                onDragLeave={() => setIsDragging(false)}
                                onDrop={handleDrop}
                                onClick={() => document.getElementById('pdf-file-input').click()}
                                className={`
                                    relative border-3 border-dashed rounded-2xl p-10 transition-all cursor-pointer bg-slate-50 dark:bg-slate-900/50
                                    ${isDragging
                                        ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20 scale-[1.02]'
                                        : 'border-slate-300 dark:border-slate-600 hover:border-indigo-400 hover:bg-white dark:hover:bg-slate-800'}
                                `}
                            >
                                <p className="text-lg font-bold text-slate-700 dark:text-slate-200 mb-1 truncate px-4">
                                    {pdfFile ? pdfFile.name : 'Click para seleccionar archivo'}
                                </p>
                                <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">PDF hasta 10MB</p>
                                <input id="pdf-file-input" type="file" accept="application/pdf" onChange={handleFileSelect} className="hidden" />
                            </div>

                            {error && (
                                <div className="mt-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800 rounded-xl flex items-start gap-3 text-red-700 dark:text-red-400 text-left">
                                    <AlertCircle size={20} className="shrink-0 mt-0.5" />
                                    <span className="text-sm font-medium">{error}</span>
                                </div>
                            )}

                            {pdfFile && (
                                <button
                                    onClick={handleExtract}
                                    disabled={isExtracting}
                                    className="w-full mt-8 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white py-4 rounded-xl font-bold transition-all shadow-xl shadow-indigo-200 dark:shadow-none flex items-center justify-center gap-3 transform active:scale-95"
                                >
                                    {isExtracting ? (
                                        <> <Loader2 className="animate-spin" /> Procesando Documento... </>
                                    ) : (
                                        <> <Edit3 size={20} /> Extraer y Editar </>
                                    )}
                                </button>
                            )}
                        </div>
                    </div>
                ) : (
                    /* --- Vista Dividida del Editor (Split View) --- */
                    <div className="flex flex-col lg:flex-row gap-6 h-[calc(100vh-140px)] animate-in fade-in slide-in-from-bottom-4 duration-500">

                        {/* Columna Izquierda: Visor PDF */}
                        <div className="lg:w-1/2 bg-slate-200 dark:bg-slate-800 rounded-2xl overflow-hidden border border-slate-300 dark:border-slate-700 shadow-inner flex flex-col">
                            <div className="px-4 py-3 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center shrink-0">
                                <div className="flex items-center gap-2">
                                    <div className="w-2 h-2 rounded-full bg-red-500"></div>
                                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Documento Original</span>
                                </div>
                                <span className="text-xs font-mono bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded text-slate-600 dark:text-slate-400 truncate max-w-[200px]" title={pdfFile?.name}>
                                    {pdfFile?.name}
                                </span>
                            </div>
                            <div className="flex-1 bg-slate-300 dark:bg-zinc-900 relative">
                                {pdfFile ? (
                                    <iframe
                                        src={URL.createObjectURL(pdfFile)}
                                        className="w-full h-full"
                                        title="PDF Viewer"
                                    />
                                ) : (
                                    <div className="flex items-center justify-center h-full text-slate-400">
                                        <p>No se pudo cargar la vista previa</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Columna Derecha: Editor de Datos */}
                        <div className="lg:w-1/2 flex flex-col gap-4 overflow-hidden">

                            {/* Panel Superior: Información del Proyecto */}
                            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-5 shrink-0">
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="text-xs font-bold text-indigo-500 uppercase tracking-wider flex items-center gap-1">
                                        <Edit3 size={12} /> Datos del Proyecto
                                    </h3>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="col-span-2">
                                        <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1 ml-1">Proyecto</label>
                                        <input
                                            type="text"
                                            value={projectInfo.project || ''}
                                            onChange={(e) => setProjectInfo({ ...projectInfo, project: e.target.value })}
                                            className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded-lg text-sm font-semibold text-slate-700 dark:text-slate-200 focus:ring-2 focus:ring-indigo-500 border-transparent outline-none transition"
                                            placeholder="Nombre del Proyecto"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1 ml-1">Cliente</label>
                                        <input
                                            type="text"
                                            value={projectInfo.client || ''}
                                            onChange={(e) => setProjectInfo({ ...projectInfo, client: e.target.value })}
                                            className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded-lg text-sm focus:border-indigo-500 outline-none transition"
                                            placeholder="Cliente"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1 ml-1">Ubicación</label>
                                        <input
                                            type="text"
                                            value={projectInfo.location || ''}
                                            onChange={(e) => setProjectInfo({ ...projectInfo, location: e.target.value })}
                                            className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded-lg text-sm focus:border-indigo-500 outline-none transition"
                                            placeholder="Ubicación"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Tabla de Items */}
                            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 flex-1 flex flex-col overflow-hidden relative">
                                <div className="p-3 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/50 shrink-0">
                                    <div className="flex items-center gap-2">
                                        <h3 className="font-bold text-sm text-slate-700 dark:text-slate-200">Partidas y Conceptos</h3>
                                        <span className="px-2 py-0.5 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-md text-xs font-bold border border-indigo-200 dark:border-indigo-800">
                                            {editableItems.length}
                                        </span>
                                    </div>
                                    <button
                                        onClick={handleAddItem}
                                        className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-xs font-bold transition shadow-sm shadow-emerald-200 dark:shadow-none"
                                    >
                                        <Plus size={14} /> Agregar Fila
                                    </button>
                                </div>

                                <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-300 dark:scrollbar-thumb-slate-600 scrollbar-track-transparent p-1">
                                    <table className="w-full text-sm border-separate border-spacing-y-1">
                                        <thead className="sticky top-0 z-10">
                                            <tr>
                                                <th className="px-2 py-2 text-left text-[10px] font-bold text-slate-400 uppercase tracking-wider w-8 bg-white dark:bg-slate-800">#</th>
                                                <th className="px-2 py-2 text-left text-[10px] font-bold text-slate-400 uppercase tracking-wider bg-white dark:bg-slate-800">Descripción & Detalles</th>
                                                <th className="px-2 py-2 text-right text-[10px] font-bold text-slate-400 uppercase tracking-wider w-20 bg-white dark:bg-slate-800">Cant.</th>
                                                <th className="px-2 py-2 text-right text-[10px] font-bold text-slate-400 uppercase tracking-wider w-24 bg-white dark:bg-slate-800">P. Unitario</th>
                                                <th className="px-2 py-2 text-right text-[10px] font-bold text-slate-400 uppercase tracking-wider w-24 bg-white dark:bg-slate-800 bg-opacity-90 backdrop-blur">Total</th>
                                                <th className="w-8 bg-white dark:bg-slate-800"></th>
                                            </tr>
                                        </thead>
                                        <tbody className="space-y-1">
                                            {editableItems.map((item, index) => (
                                                <tr key={index} className="group hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors rounded-lg">
                                                    <td className="px-2 py-2 text-slate-300 text-xs text-center font-mono select-none">{index + 1}</td>
                                                    <td className="px-2 py-2">
                                                        <textarea
                                                            value={item.description}
                                                            onChange={(e) => handleUpdateItem(index, 'description', e.target.value)}
                                                            className="w-full bg-transparent border-b border-transparent focus:border-indigo-300 dark:focus:border-indigo-500 rounded-sm p-0 text-slate-700 dark:text-slate-200 text-sm focus:ring-0 resize-none overflow-hidden leading-snug"
                                                            rows={1}
                                                            style={{ minHeight: '1.5em' }}
                                                            onInput={(e) => {
                                                                e.target.style.height = 'auto';
                                                                e.target.style.height = e.target.scrollHeight + 'px';
                                                            }}
                                                            placeholder="Descripción..."
                                                        />
                                                        <div className="flex gap-2 mt-1.5 opacity-60 group-hover:opacity-100 transition-opacity">
                                                            <input
                                                                type="text"
                                                                value={item.unit}
                                                                onChange={(e) => handleUpdateItem(index, 'unit', e.target.value)}
                                                                className="w-14 bg-slate-100 dark:bg-slate-900 rounded px-1.5 py-0.5 text-[10px] font-medium text-slate-500 border-none focus:ring-1 focus:ring-indigo-300 text-center uppercase"
                                                                placeholder="UNID"
                                                            />
                                                            <select
                                                                value={item.category}
                                                                onChange={(e) => handleUpdateItem(index, 'category', e.target.value)}
                                                                className="bg-slate-100 dark:bg-slate-900 rounded px-1.5 py-0.5 text-[10px] font-medium text-slate-500 border-none focus:ring-1 focus:ring-indigo-300 max-w-[100px]"
                                                            >
                                                                <option>Materiales</option>
                                                                <option>Mano de Obra</option>
                                                                <option>Equipo</option>
                                                                <option>Preliminares</option>
                                                                <option>Acabados</option>
                                                            </select>
                                                        </div>
                                                    </td>
                                                    <td className="px-2 py-2 align-top">
                                                        <input
                                                            type="number"
                                                            value={item.quantity}
                                                            onChange={(e) => handleUpdateItem(index, 'quantity', parseFloat(e.target.value) || 0)}
                                                            className="w-full bg-slate-50 dark:bg-slate-900/30 rounded border border-transparent hover:border-slate-200 focus:border-indigo-500 px-1.5 py-1 text-right text-slate-700 dark:text-slate-200 font-medium text-sm"
                                                        />
                                                    </td>
                                                    <td className="px-2 py-2 align-top">
                                                        <input
                                                            type="number"
                                                            value={item.unitPrice}
                                                            onChange={(e) => handleUpdateItem(index, 'unitPrice', parseFloat(e.target.value) || 0)}
                                                            className="w-full bg-slate-50 dark:bg-slate-900/30 rounded border border-transparent hover:border-slate-200 focus:border-indigo-500 px-1.5 py-1 text-right text-slate-700 dark:text-slate-200 font-medium text-sm"
                                                        />
                                                    </td>
                                                    <td className="px-2 py-2 text-right align-top font-bold text-slate-800 dark:text-slate-100 text-sm pt-2">
                                                        ${(item.quantity * item.unitPrice).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                    </td>
                                                    <td className="px-1 py-2 align-top text-center">
                                                        <button
                                                            onClick={() => handleDeleteItem(index)}
                                                            className="text-slate-300 hover:text-red-500 transition-colors p-1 opacity-0 group-hover:opacity-100"
                                                            title="Eliminar partida"
                                                        >
                                                            <Trash2 size={14} />
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>

                                {/* Footer de Totales */}
                                <div className="p-4 bg-slate-50 dark:bg-slate-900/30 border-t border-slate-200 dark:border-slate-700 shrink-0">
                                    <div className="flex items-center justify-between gap-4">
                                        <button
                                            onClick={() => { setExtractedData(null); setPdfFile(null); setEditableItems([]); }}
                                            className="px-4 py-2 text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 text-sm font-medium transition hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"
                                        >
                                            Cancelar
                                        </button>

                                        <div className="flex items-center gap-4">
                                            <div className="text-right mr-2">
                                                <p className="text-[10px] font-bold text-slate-400 uppercase leading-none mb-1">Total Estimado</p>
                                                <p className="text-xl font-bold text-indigo-600 dark:text-indigo-400 leading-none">
                                                    ${totals.total.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                                                </p>
                                            </div>
                                            <button
                                                onClick={handleSaveAsProject}
                                                className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl font-bold shadow-lg shadow-indigo-200 dark:shadow-none transition transform active:scale-95"
                                            >
                                                <Save size={18} />
                                                <span>Crear Proyecto</span>
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default PDFEditorPage;