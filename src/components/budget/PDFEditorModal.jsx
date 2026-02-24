import React, { useState } from 'react';
import { X, Upload, FileText, Edit3, Save, Trash2, Plus, AlertCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const PDFEditorModal = ({ isOpen, onClose }) => {
    const navigate = useNavigate();
    const [pdfFile, setPdfFile] = useState(null);
    const [isExtracting, setIsExtracting] = useState(false);
    const [extractedData, setExtractedData] = useState(null);
    const [editableItems, setEditableItems] = useState([]);
    const [projectInfo, setProjectInfo] = useState({});
    const [error, setError] = useState(null);

    const handleFileSelect = (e) => {
        const file = e.target.files[0];
        if (file && file.type === 'application/pdf') {
            setPdfFile(file);
            setError(null);
        } else {
            setError('Por favor selecciona un archivo PDF válido');
        }
    };

    const handleDrop = (e) => {
        e.preventDefault();
        const file = e.dataTransfer.files[0];
        if (file && file.type === 'application/pdf') {
            setPdfFile(file);
            setError(null);
        } else {
            setError('Por favor selecciona un archivo PDF válido');
        }
    };

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

            if (!response.ok) {
                const err = await response.json();
                throw new Error(err.error || 'Error al extraer PDF');
            }

            const data = await response.json();

            if (data.success) {
                setExtractedData(data);
                setEditableItems(data.items || []);
                setProjectInfo(data.projectInfo || {});
            } else {
                throw new Error('No se pudieron extraer datos del PDF');
            }
        } catch (err) {
            console.error(err);
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
        setEditableItems(editableItems.filter((_, i) => i !== index));
    };

    const handleAddItem = () => {
        setEditableItems([
            ...editableItems,
            {
                description: '',
                unit: 'pza',
                quantity: 0,
                unitPrice: 0,
                category: 'Materiales'
            }
        ]);
    };

    const handleSaveAsProject = () => {
        // Guardar en localStorage para que el Editor lo cargue
        const projectData = {
            projectInfo: {
                ...projectInfo,
                id: `pdf-import-${Date.now()}`,
                project: projectInfo.project || 'Presupuesto desde PDF'
            },
            items: editableItems.map((item, index) => ({
                ...item,
                id: `item-${index}-${Date.now()}`
            }))
        };

        localStorage.setItem('pendingPDFImport', JSON.stringify(projectData));

        // Navegar al editor
        navigate('/editor');
        onClose();
    };

    const calculateTotals = () => {
        const subtotal = editableItems.reduce((sum, item) =>
            sum + (item.quantity * item.unitPrice), 0
        );
        const tax = subtotal * ((projectInfo.taxRate || 16) / 100);
        const total = subtotal + tax;
        return { subtotal, tax, total };
    };

    const totals = calculateTotals();

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-hidden flex flex-col">
                {/* Header */}
                <div className="p-6 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="bg-indigo-100 dark:bg-indigo-900/30 p-3 rounded-xl">
                            <FileText className="text-indigo-600 dark:text-indigo-400" size={24} />
                        </div>
                        <div>
                            <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100">
                                Cargar y Editar PDF
                            </h2>
                            <p className="text-sm text-slate-500 dark:text-slate-400">
                                Importa presupuestos desde PDF y edítalos antes de guardar
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition"
                    >
                        <X size={24} className="text-slate-600 dark:text-slate-300" />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6">
                    {!extractedData ? (
                        // Upload Section
                        <div className="space-y-6">
                            <div
                                onDrop={handleDrop}
                                onDragOver={(e) => e.preventDefault()}
                                className="border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-xl p-12 text-center hover:border-indigo-500 dark:hover:border-indigo-400 transition cursor-pointer"
                                onClick={() => document.getElementById('pdf-file-input').click()}
                            >
                                <Upload className="mx-auto text-slate-400 dark:text-slate-500 mb-4" size={48} />
                                <p className="text-lg font-medium text-slate-700 dark:text-slate-200 mb-2">
                                    {pdfFile ? pdfFile.name : 'Arrastra un PDF aquí o haz clic para seleccionar'}
                                </p>
                                <p className="text-sm text-slate-500 dark:text-slate-400">
                                    Soporta presupuestos en formato PDF
                                </p>
                                <input
                                    id="pdf-file-input"
                                    type="file"
                                    accept="application/pdf"
                                    onChange={handleFileSelect}
                                    className="hidden"
                                />
                            </div>

                            {error && (
                                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 flex items-start gap-3">
                                    <AlertCircle className="text-red-600 dark:text-red-400 flex-shrink-0" size={20} />
                                    <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
                                </div>
                            )}

                            {pdfFile && (
                                <button
                                    onClick={handleExtract}
                                    disabled={isExtracting}
                                    className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white py-3 rounded-xl font-medium transition flex items-center justify-center gap-2"
                                >
                                    {isExtracting ? (
                                        <>
                                            <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent" />
                                            Extrayendo datos con IA...
                                        </>
                                    ) : (
                                        <>
                                            <Edit3 size={20} />
                                            Extraer y Editar
                                        </>
                                    )}
                                </button>
                            )}
                        </div>
                    ) : (
                        // Editor Section
                        <div className="space-y-6">
                            {/* Project Info */}
                            <div className="bg-slate-50 dark:bg-slate-900/50 rounded-xl p-6 space-y-4">
                                <h3 className="font-bold text-lg text-slate-800 dark:text-slate-100 mb-4">
                                    Información del Proyecto
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div>
                                        <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                                            Proyecto
                                        </label>
                                        <input
                                            type="text"
                                            value={projectInfo.project || ''}
                                            onChange={(e) => setProjectInfo({ ...projectInfo, project: e.target.value })}
                                            className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg text-sm"
                                            placeholder="Nombre del proyecto"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                                            Cliente
                                        </label>
                                        <input
                                            type="text"
                                            value={projectInfo.client || ''}
                                            onChange={(e) => setProjectInfo({ ...projectInfo, client: e.target.value })}
                                            className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg text-sm"
                                            placeholder="Nombre del cliente"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                                            Ubicación
                                        </label>
                                        <input
                                            type="text"
                                            value={projectInfo.location || ''}
                                            onChange={(e) => setProjectInfo({ ...projectInfo, location: e.target.value })}
                                            className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg text-sm"
                                            placeholder="Ciudad, Estado"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Items Table */}
                            <div>
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="font-bold text-lg text-slate-800 dark:text-slate-100">
                                        Conceptos ({editableItems.length})
                                    </h3>
                                    <button
                                        onClick={handleAddItem}
                                        className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-medium transition"
                                    >
                                        <Plus size={16} />
                                        Agregar Concepto
                                    </button>
                                </div>

                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm">
                                        <thead className="bg-slate-100 dark:bg-slate-900/50">
                                            <tr>
                                                <th className="px-3 py-2 text-left text-xs font-medium text-slate-600 dark:text-slate-400">#</th>
                                                <th className="px-3 py-2 text-left text-xs font-medium text-slate-600 dark:text-slate-400">Descripción</th>
                                                <th className="px-3 py-2 text-left text-xs font-medium text-slate-600 dark:text-slate-400">Unidad</th>
                                                <th className="px-3 py-2 text-left text-xs font-medium text-slate-600 dark:text-slate-400">Cantidad</th>
                                                <th className="px-3 py-2 text-left text-xs font-medium text-slate-600 dark:text-slate-400">P.U.</th>
                                                <th className="px-3 py-2 text-left text-xs font-medium text-slate-600 dark:text-slate-400">Categoría</th>
                                                <th className="px-3 py-2 text-left text-xs font-medium text-slate-600 dark:text-slate-400">Total</th>
                                                <th className="px-3 py-2 text-xs font-medium text-slate-600 dark:text-slate-400"></th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                                            {editableItems.map((item, index) => (
                                                <tr key={index} className="hover:bg-slate-50 dark:hover:bg-slate-900/30">
                                                    <td className="px-3 py-2 text-slate-600 dark:text-slate-400">{index + 1}</td>
                                                    <td className="px-3 py-2">
                                                        <input
                                                            type="text"
                                                            value={item.description}
                                                            onChange={(e) => handleUpdateItem(index, 'description', e.target.value)}
                                                            className="w-full px-2 py-1 bg-transparent border border-transparent hover:border-slate-300 dark:hover:border-slate-600 focus:border-indigo-500 rounded text-slate-700 dark:text-slate-200"
                                                        />
                                                    </td>
                                                    <td className="px-3 py-2">
                                                        <input
                                                            type="text"
                                                            value={item.unit}
                                                            onChange={(e) => handleUpdateItem(index, 'unit', e.target.value)}
                                                            className="w-20 px-2 py-1 bg-transparent border border-transparent hover:border-slate-300 dark:hover:border-slate-600 focus:border-indigo-500 rounded text-slate-700 dark:text-slate-200"
                                                        />
                                                    </td>
                                                    <td className="px-3 py-2">
                                                        <input
                                                            type="number"
                                                            value={item.quantity}
                                                            onChange={(e) => handleUpdateItem(index, 'quantity', parseFloat(e.target.value) || 0)}
                                                            className="w-24 px-2 py-1 bg-transparent border border-transparent hover:border-slate-300 dark:hover:border-slate-600 focus:border-indigo-500 rounded text-slate-700 dark:text-slate-200"
                                                        />
                                                    </td>
                                                    <td className="px-3 py-2">
                                                        <input
                                                            type="number"
                                                            value={item.unitPrice}
                                                            onChange={(e) => handleUpdateItem(index, 'unitPrice', parseFloat(e.target.value) || 0)}
                                                            className="w-28 px-2 py-1 bg-transparent border border-transparent hover:border-slate-300 dark:hover:border-slate-600 focus:border-indigo-500 rounded text-slate-700 dark:text-slate-200"
                                                        />
                                                    </td>
                                                    <td className="px-3 py-2">
                                                        <select
                                                            value={item.category}
                                                            onChange={(e) => handleUpdateItem(index, 'category', e.target.value)}
                                                            className="px-2 py-1 bg-transparent border border-transparent hover:border-slate-300 dark:hover:border-slate-600 focus:border-indigo-500 rounded text-slate-700 dark:text-slate-200"
                                                        >
                                                            <option>Materiales</option>
                                                            <option>Mano de Obra</option>
                                                            <option>Equipo</option>
                                                            <option>Preliminares</option>
                                                            <option>Acabados</option>
                                                        </select>
                                                    </td>
                                                    <td className="px-3 py-2 text-slate-700 dark:text-slate-200 font-medium">
                                                        ${(item.quantity * item.unitPrice).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                                                    </td>
                                                    <td className="px-3 py-2">
                                                        <button
                                                            onClick={() => handleDeleteItem(index)}
                                                            className="p-1 hover:bg-red-100 dark:hover:bg-red-900/30 rounded text-red-600 dark:text-red-400"
                                                        >
                                                            <Trash2 size={16} />
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            {/* Totals */}
                            <div className="bg-slate-50 dark:bg-slate-900/50 rounded-xl p-6">
                                <div className="space-y-2 max-w-md ml-auto">
                                    <div className="flex justify-between text-sm">
                                        <span className="text-slate-600 dark:text-slate-400">Subtotal:</span>
                                        <span className="font-medium text-slate-800 dark:text-slate-200">
                                            ${totals.subtotal.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                                        </span>
                                    </div>
                                    <div className="flex justify-between text-sm">
                                        <span className="text-slate-600 dark:text-slate-400">IVA ({projectInfo.taxRate || 16}%):</span>
                                        <span className="font-medium text-slate-800 dark:text-slate-200">
                                            ${totals.tax.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                                        </span>
                                    </div>
                                    <div className="flex justify-between text-lg font-bold pt-2 border-t border-slate-300 dark:border-slate-600">
                                        <span className="text-slate-800 dark:text-slate-100">Total:</span>
                                        <span className="text-indigo-600 dark:text-indigo-400">
                                            ${totals.total.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                {extractedData && (
                    <div className="p-6 border-t border-slate-200 dark:border-slate-700 flex gap-3">
                        <button
                            onClick={() => {
                                setExtractedData(null);
                                setPdfFile(null);
                                setEditableItems([]);
                                setProjectInfo({});
                            }}
                            className="px-6 py-3 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 rounded-xl font-medium transition"
                        >
                            Cargar Otro PDF
                        </button>
                        <button
                            onClick={handleSaveAsProject}
                            className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white py-3 rounded-xl font-medium transition flex items-center justify-center gap-2"
                        >
                            <Save size={20} />
                            Guardar como Proyecto
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default PDFEditorModal;
