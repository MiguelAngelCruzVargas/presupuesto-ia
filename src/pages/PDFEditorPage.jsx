import React, { useState, useMemo, useCallback } from 'react';
import {
    Upload, FileText, Edit3, Save, Trash2,
    Plus, AlertCircle, ArrowLeft, Loader2, Check, Info
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

    const usageNotes = [
        {
            title: 'Que hace esta herramienta',
            text: 'Convierte un PDF de presupuesto en un borrador editable. Intenta leer el nombre del proyecto, cliente, ubicacion, IVA y las partidas con cantidad, unidad y precio.'
        },
        {
            title: 'Cuando funciona mejor',
            text: 'Funciona mejor con presupuestos reales que traen tablas, conceptos, cantidades y precios unitarios visibles en texto.'
        },
        {
            title: 'Cuando no sacara partidas',
            text: 'Si subes un oficio, carta, formato escaneado o un PDF sin tabla de conceptos, puede detectar solo algunos datos generales y dejar las partidas vacias.'
        },
        {
            title: 'Que hacer si no detecta conceptos',
            text: 'Revisa el PDF en la columna izquierda. Si no contiene partidas de presupuesto, usa "Agregar Fila" para capturarlas manualmente o sube un PDF con desglose de conceptos.'
        }
    ];

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
        <div className="min-h-screen bg-gradient-to-br from-slate-100 via-white to-blue-50 dark:from-slate-900 dark:via-slate-900 dark:to-slate-950 p-4 md:p-8">
            <div className="max-w-7xl mx-auto space-y-6">

                {/* --- Header --- */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => navigate('/dashboard')}
                            className="p-2 rounded-full border border-slate-200 bg-white/90 text-slate-700 shadow-sm transition-all hover:border-slate-300 hover:bg-white dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
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

                <div className="rounded-3xl border border-blue-200/80 bg-white/90 p-5 shadow-sm shadow-blue-100 backdrop-blur dark:border-blue-900 dark:bg-blue-950/20 dark:shadow-none">
                    <div className="flex items-start gap-3">
                        <div className="mt-0.5 p-2 rounded-xl bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-300">
                            <Info size={18} />
                        </div>
                        <div className="space-y-3">
                            <div>
                                <h2 className="text-sm font-bold uppercase tracking-wider text-blue-700 dark:text-blue-300">
                                    Como funciona este apartado
                                </h2>
                                <p className="mt-1 text-sm text-slate-700 dark:text-slate-300 max-w-4xl">
                                    Esta pantalla no edita visualmente el PDF como Word o Acrobat. Lo que hace es leer el contenido del archivo,
                                    extraer los datos utiles del presupuesto y convertirlos en un proyecto editable dentro del sistema.
                                </p>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                {usageNotes.map((note) => (
                                    <div
                                        key={note.title}
                                        className="rounded-2xl border border-slate-200 bg-slate-50/90 p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900/40 dark:shadow-none"
                                    >
                                        <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">{note.title}</p>
                                        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">{note.text}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                {/* --- Vista de Carga --- */}
                {!extractedData ? (
                    <div className="max-w-2xl mx-auto mt-12 overflow-hidden rounded-[2rem] border border-slate-200 bg-white/95 shadow-[0_24px_80px_-32px_rgba(15,23,42,0.35)] dark:border-slate-700 dark:bg-slate-800 dark:shadow-none">
                        <div className="p-8 md:p-14 text-center">
                            <div className="mb-8">
                                <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-to-br from-indigo-100 to-blue-100 text-indigo-600 shadow-lg shadow-indigo-100 dark:bg-indigo-900/30 dark:text-indigo-400 dark:shadow-none">
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
                                    relative rounded-[1.75rem] border-2 border-dashed p-10 transition-all cursor-pointer bg-gradient-to-br from-slate-50 to-white dark:bg-slate-900/50
                                    ${isDragging
                                        ? 'border-indigo-500 bg-indigo-50 shadow-lg shadow-indigo-100 scale-[1.02] dark:bg-indigo-900/20 dark:shadow-none'
                                        : 'border-slate-300 dark:border-slate-600 hover:border-indigo-400 hover:from-white hover:to-blue-50 dark:hover:bg-slate-800'}
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
                                    className="mt-8 flex w-full items-center justify-center gap-3 rounded-2xl bg-indigo-600 py-4 font-bold text-white shadow-xl shadow-indigo-200 transition-all transform active:scale-95 hover:bg-indigo-700 disabled:bg-indigo-400 dark:shadow-none"
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
                        <div className="lg:w-1/2 flex flex-col overflow-hidden rounded-[1.75rem] border border-slate-200 bg-white shadow-[0_24px_80px_-40px_rgba(15,23,42,0.45)] dark:border-slate-700 dark:bg-slate-800 dark:shadow-none">
                            <div className="shrink-0 flex items-center justify-between border-b border-slate-200 bg-slate-50/90 px-4 py-3 dark:border-slate-700 dark:bg-slate-900">
                                <div className="flex items-center gap-2">
                                    <div className="w-2 h-2 rounded-full bg-red-500"></div>
                                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Documento Original</span>
                                </div>
                                <span className="text-xs font-mono bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded text-slate-600 dark:text-slate-400 truncate max-w-[200px]" title={pdfFile?.name}>
                                    {pdfFile?.name}
                                </span>
                            </div>
                            <div className="relative flex-1 bg-slate-100 dark:bg-zinc-900">
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
                            <div className="shrink-0 rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800">
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
                                            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-700 outline-none transition focus:border-indigo-300 focus:ring-2 focus:ring-indigo-500 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200"
                                            placeholder="Nombre del Proyecto"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1 ml-1">Cliente</label>
                                        <input
                                            type="text"
                                            value={projectInfo.client || ''}
                                            onChange={(e) => setProjectInfo({ ...projectInfo, client: e.target.value })}
                                            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700 outline-none transition focus:border-indigo-300 focus:ring-2 focus:ring-indigo-500 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200"
                                            placeholder="Cliente"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1 ml-1">Ubicación</label>
                                        <input
                                            type="text"
                                            value={projectInfo.location || ''}
                                            onChange={(e) => setProjectInfo({ ...projectInfo, location: e.target.value })}
                                            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700 outline-none transition focus:border-indigo-300 focus:ring-2 focus:ring-indigo-500 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200"
                                            placeholder="Ubicación"
                                        />
                                    </div>
                                </div>
                            </div>

                            {editableItems.length === 0 && (
                                <div className="shrink-0 rounded-2xl border border-amber-200 bg-amber-50 p-4 shadow-sm dark:border-amber-900 dark:bg-amber-950/20 dark:shadow-none">
                                    <div className="flex items-start gap-3">
                                        <AlertCircle className="text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" size={18} />
                                        <div>
                                            <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">
                                                No se detectaron partidas automaticamente
                                            </p>
                                            <p className="mt-1 text-sm text-amber-700 dark:text-amber-400">
                                                Este PDF parece no contener una tabla de presupuesto con conceptos, cantidades y precios.
                                                Puedes capturar las partidas manualmente con <strong>"Agregar Fila"</strong> o intentar con un PDF que si tenga desglose de presupuesto.
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Tabla de Items */}
                            <div className="relative flex flex-1 flex-col overflow-hidden rounded-[1.5rem] border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800">
                                <div className="shrink-0 flex items-center justify-between border-b border-slate-200 bg-slate-50/80 p-3 dark:border-slate-700 dark:bg-slate-800/50">
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
                                                <th className="w-8 bg-white px-2 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:bg-slate-800 dark:text-slate-400">#</th>
                                                <th className="bg-white px-2 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:bg-slate-800 dark:text-slate-400">Descripción & Detalles</th>
                                                <th className="w-20 bg-white px-2 py-3 text-right text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:bg-slate-800 dark:text-slate-400">Cant.</th>
                                                <th className="w-24 bg-white px-2 py-3 text-right text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:bg-slate-800 dark:text-slate-400">P. Unitario</th>
                                                <th className="w-24 bg-white px-2 py-3 text-right text-[10px] font-bold uppercase tracking-wider text-slate-500 backdrop-blur dark:bg-slate-800 dark:text-slate-400">Total</th>
                                                <th className="w-8 bg-white dark:bg-slate-800"></th>
                                            </tr>
                                        </thead>
                                        <tbody className="space-y-1">
                                            {editableItems.map((item, index) => (
                                                <tr key={index} className="group rounded-lg transition-colors hover:bg-blue-50/70 dark:hover:bg-slate-700/30">
                                                    <td className="select-none px-2 py-2 text-center font-mono text-xs text-slate-400">{index + 1}</td>
                                                    <td className="px-2 py-2">
                                                        <textarea
                                                            value={item.description}
                                                            onChange={(e) => handleUpdateItem(index, 'description', e.target.value)}
                                                            className="w-full resize-none overflow-hidden rounded-sm border-b border-transparent bg-transparent p-0 text-sm leading-snug text-slate-700 focus:ring-0 focus:border-indigo-300 dark:text-slate-200 dark:focus:border-indigo-500"
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
                                                                className="w-14 rounded bg-slate-100 px-1.5 py-0.5 text-center text-[10px] font-medium uppercase text-slate-600 focus:ring-1 focus:ring-indigo-300 dark:bg-slate-900 dark:text-slate-300"
                                                                placeholder="UNID"
                                                            />
                                                            <select
                                                                value={item.category}
                                                                onChange={(e) => handleUpdateItem(index, 'category', e.target.value)}
                                                                className="max-w-[100px] rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-600 focus:ring-1 focus:ring-indigo-300 dark:bg-slate-900 dark:text-slate-300"
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
                                                            className="w-full rounded border border-transparent bg-slate-50 px-1.5 py-1 text-right text-sm font-medium text-slate-700 hover:border-slate-300 focus:border-indigo-500 dark:bg-slate-900/30 dark:text-slate-200"
                                                        />
                                                    </td>
                                                    <td className="px-2 py-2 align-top">
                                                        <input
                                                            type="number"
                                                            value={item.unitPrice}
                                                            onChange={(e) => handleUpdateItem(index, 'unitPrice', parseFloat(e.target.value) || 0)}
                                                            className="w-full rounded border border-transparent bg-slate-50 px-1.5 py-1 text-right text-sm font-medium text-slate-700 hover:border-slate-300 focus:border-indigo-500 dark:bg-slate-900/30 dark:text-slate-200"
                                                        />
                                                    </td>
                                                    <td className="px-2 py-2 text-right align-top font-bold text-slate-800 dark:text-slate-100 text-sm pt-2">
                                                        ${(item.quantity * item.unitPrice).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                    </td>
                                                    <td className="px-1 py-2 align-top text-center">
                                                        <button
                                                            onClick={() => handleDeleteItem(index)}
                                                            className="p-1 text-slate-300 opacity-0 transition-colors group-hover:opacity-100 hover:text-red-500"
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
                                <div className="shrink-0 border-t border-slate-200 bg-slate-50/90 p-4 dark:border-slate-700 dark:bg-slate-900/30">
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
