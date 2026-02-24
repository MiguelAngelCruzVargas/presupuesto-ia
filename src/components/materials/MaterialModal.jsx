import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Package, X, Sparkles, AlertTriangle, Printer, Plus, Trash2, ChevronDown, ChevronUp, Info } from 'lucide-react';
import { formatCurrency } from '../../utils/format';
import { PDFService } from '../../services/PDFService';

/**
 * MaterialModal
 * Modal para visualizar y editar la lista de insumos/materiales
 */
const MaterialModal = ({
    isOpen,
    onClose,
    materialList: initialMaterialList = [],
    materialAssumptions: initialMaterialAssumptions = [],
    isGenerating = false,
    onRegenerate = null,
    onMaterialsUpdate = null,
    projectInfo = {},
    error = null
}) => {
    const [materialList, setMaterialList] = useState(initialMaterialList);
    const [materialAssumptions, setMaterialAssumptions] = useState(initialMaterialAssumptions);
    const [showAssumptions, setShowAssumptions] = useState(false); // Colapsado por defecto

    // Sincronizar cuando cambien las props
    useEffect(() => {
        setMaterialList(initialMaterialList);
        setMaterialAssumptions(initialMaterialAssumptions);
    }, [initialMaterialList, initialMaterialAssumptions]);

    // Notificar cambios al componente padre solo cuando se actualiza manualmente
    // No usar useEffect para evitar loops infinitos - se llama directamente en las funciones de manejo

    const handleUpdateMaterial = (idx, field, value) => {
        const newList = [...materialList];
        newList[idx][field] = value;
        setMaterialList(newList);
        // NO notificar inmediatamente para evitar loops - se notificará al cerrar el modal
    };

    const handleDeleteMaterial = (idx) => {
        const newList = materialList.filter((_, i) => i !== idx);
        setMaterialList(newList);
        // NO notificar inmediatamente para evitar loops - se notificará al cerrar el modal
    };

    const handleAddMaterial = () => {
        const newList = [...materialList, {
            material: 'Nuevo Material',
            unit: 'pza',
            quantity: 1,
            unitPrice: 0,
            category: 'Materiales',
            notes: ''
        }];
        setMaterialList(newList);
        // NO notificar inmediatamente para evitar loops - se notificará al cerrar el modal
    };

    // Notificar cambios cuando se cierra el modal
    const handleClose = () => {
        // Notificar cambios finales antes de cerrar
        if (onMaterialsUpdate) {
            onMaterialsUpdate(materialList, materialAssumptions);
        }
        if (onClose) {
            onClose();
        }
    };

    const handleExportPDF = () => {
        PDFService.exportMaterials(projectInfo, materialList);
    };

    if (!isOpen) return null;

    const modalContent = (
        <>
            {/* Overlay de fondo que cubre TODA la pantalla, incluido el sidebar */}
            <div 
                className="fixed top-0 left-0 right-0 bottom-0 bg-slate-900/80 backdrop-blur-md animate-fadeIn" 
                style={{ 
                    zIndex: 999999,
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    width: '100vw',
                    height: '100vh'
                }}
                onClick={handleClose}
            />
            {/* Contenedor centrado del modal */}
            <div 
                className="fixed top-0 left-0 right-0 bottom-0 flex items-center justify-center pointer-events-none animate-fadeIn" 
                style={{ 
                    zIndex: 1000000,
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    width: '100vw',
                    height: '100vh',
                    padding: '1rem'
                }}
            >
                <div 
                    className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl max-w-5xl w-full max-h-[90vh] flex flex-col overflow-hidden border border-slate-200 dark:border-slate-700 relative pointer-events-auto"
                    style={{ 
                        zIndex: 1000001,
                        position: 'relative'
                    }}
                    onClick={(e) => e.stopPropagation()}
                >
                {/* Header */}
                <div className="p-5 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-gradient-to-r from-indigo-900 to-indigo-800 text-white">
                    <div>
                        <h3 className="font-bold flex items-center text-lg">
                            <Package className="mr-2 text-indigo-300" /> Explosión de Insumos (Estimada)
                        </h3>
                        {materialList.length > 0 && (
                            <p className="text-xs text-indigo-200 mt-1">
                                Lista guardada - Puedes editar o regenerar con IA
                            </p>
                        )}
                    </div>
                    <div className="flex items-center gap-2">
                        {onRegenerate && materialList.length > 0 && (
                            <button
                                onClick={onRegenerate}
                                disabled={isGenerating}
                                className="px-3 py-1.5 bg-indigo-700 hover:bg-indigo-600 text-white text-xs font-medium rounded-lg transition flex items-center gap-1 disabled:opacity-50"
                                title="Regenerar lista con IA"
                            >
                                <Sparkles size={14} />
                                Regenerar
                            </button>
                        )}
                        <button onClick={handleClose} className="text-white/60 hover:text-white transition">
                            <X size={20} />
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div className="p-0 overflow-y-auto flex-1 bg-slate-50 dark:bg-slate-700/50">
                    {isGenerating ? (
                        <div className="flex flex-col items-center justify-center h-64 space-y-4">
                            <div className="animate-spin rounded-full h-12 w-12 border-4 border-indigo-500 border-t-transparent"></div>
                            <p className="text-slate-500 dark:text-slate-300 font-medium">Calculando materiales necesarios...</p>
                        </div>
                    ) : error ? (
                        <div className="p-12 text-center">
                            <AlertTriangle className="mx-auto mb-4 text-red-500" size={48} />
                            <p className="text-red-600 dark:text-red-400 font-medium mb-2">Error al generar insumos</p>
                            <p className="text-sm text-slate-600 dark:text-slate-400">{error}</p>
                        </div>
                    ) : materialList.length > 0 ? (
                        <div className="flex flex-col h-full">
                            {/* Base Técnica - Colapsable y discreta */}
                            {materialAssumptions.length > 0 && (
                                <div className="bg-slate-100 dark:bg-slate-700/30 border-b border-slate-200 dark:border-slate-600">
                                    <button
                                        onClick={() => setShowAssumptions(!showAssumptions)}
                                        className="w-full p-3 flex items-center justify-between hover:bg-slate-200 dark:hover:bg-slate-700/50 transition text-left"
                                    >
                                        <div className="flex items-center gap-2">
                                            <Info className="text-slate-500 dark:text-slate-400" size={16} />
                                            <span className="text-xs font-medium text-slate-600 dark:text-slate-300">
                                                Base de Cálculo
                                            </span>
                                            <span className="text-xs text-slate-400 dark:text-slate-500">
                                                ({materialAssumptions.length} parámetros)
                                            </span>
                                        </div>
                                        {showAssumptions ? (
                                            <ChevronUp className="text-slate-400 dark:text-slate-500" size={16} />
                                        ) : (
                                            <ChevronDown className="text-slate-400 dark:text-slate-500" size={16} />
                                        )}
                                    </button>
                                    {showAssumptions && (
                                        <div className="px-3 pb-3 border-t border-slate-200 dark:border-slate-600">
                                            <ul className="list-disc list-inside text-xs text-slate-600 dark:text-slate-400 space-y-1.5 mt-2">
                                                {materialAssumptions.map((assumption, idx) => (
                                                    <li key={idx} className="leading-relaxed">{assumption}</li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}
                                </div>
                            )}

                            <div className="overflow-auto flex-1">
                                <table className="w-full text-left border-collapse">
                                    <thead className="bg-white dark:bg-slate-800 text-xs uppercase text-slate-500 dark:text-slate-400 font-bold border-b border-slate-200 dark:border-slate-700 sticky top-0 shadow-sm z-10">
                                        <tr>
                                            <th className="p-4">Material</th>
                                            <th className="p-4 w-32">Categoría</th>
                                            <th className="p-4 w-24 text-center">Unidad</th>
                                            <th className="p-4 w-32 text-right">Cantidad</th>
                                            <th className="p-4 w-32 text-right">Costo Est.</th>
                                            <th className="p-4 w-32 text-right">Total</th>
                                            <th className="p-4 w-48">Notas</th>
                                            <th className="p-4 w-10"></th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 dark:divide-slate-700 bg-white dark:bg-slate-800">
                                        {materialList.map((mat, idx) => (
                                            <tr key={idx} className="hover:bg-indigo-50/30 dark:hover:bg-slate-700/50 group">
                                                <td className="p-2">
                                                    <input
                                                        value={mat.material}
                                                        onChange={(e) => handleUpdateMaterial(idx, 'material', e.target.value)}
                                                        className="w-full bg-transparent dark:bg-slate-800 outline-none font-medium text-slate-700 dark:text-slate-200 focus:text-indigo-700 dark:focus:text-indigo-400 border-b border-transparent focus:border-indigo-300 dark:focus:border-indigo-600"
                                                    />
                                                </td>
                                                <td className="p-2">
                                                    <select
                                                        value={mat.category || 'Materiales'}
                                                        onChange={(e) => handleUpdateMaterial(idx, 'category', e.target.value)}
                                                        className="w-full bg-transparent dark:bg-slate-800 text-xs outline-none cursor-pointer text-slate-700 dark:text-slate-300"
                                                    >
                                                        {['Materiales', 'Acabados', 'Instalaciones', 'Otros'].map(c => (
                                                            <option key={c} value={c}>{c}</option>
                                                        ))}
                                                    </select>
                                                </td>
                                                <td className="p-2">
                                                    <input
                                                        value={mat.unit}
                                                        onChange={(e) => handleUpdateMaterial(idx, 'unit', e.target.value)}
                                                        className="w-full text-center bg-transparent dark:bg-slate-800 outline-none text-slate-500 dark:text-slate-400 text-sm"
                                                    />
                                                </td>
                                                <td className="p-2">
                                                    <input
                                                        type="number"
                                                        value={mat.quantity}
                                                        onChange={(e) => handleUpdateMaterial(idx, 'quantity', parseFloat(e.target.value) || 0)}
                                                        className="w-full text-right font-mono text-slate-700 dark:text-slate-200 bg-transparent dark:bg-slate-800 outline-none focus:bg-slate-50 dark:focus:bg-slate-700 rounded px-1"
                                                    />
                                                </td>
                                                <td className="p-2">
                                                    <input
                                                        type="number"
                                                        value={mat.unitPrice}
                                                        onChange={(e) => handleUpdateMaterial(idx, 'unitPrice', parseFloat(e.target.value) || 0)}
                                                        className="w-full text-right font-mono text-slate-500 dark:text-slate-400 text-sm bg-transparent dark:bg-slate-800 outline-none focus:bg-slate-50 dark:focus:bg-slate-700 rounded px-1"
                                                    />
                                                </td>
                                                <td className="p-4 text-right font-mono font-bold text-slate-800 dark:text-slate-200">
                                                    {formatCurrency((mat.quantity || 0) * (mat.unitPrice || 0))}
                                                </td>
                                                <td className="p-2">
                                                    <input
                                                        value={mat.notes || ''}
                                                        onChange={(e) => handleUpdateMaterial(idx, 'notes', e.target.value)}
                                                        className="w-full text-xs text-slate-500 dark:text-slate-400 italic bg-transparent dark:bg-slate-800 outline-none"
                                                        placeholder="Notas..."
                                                    />
                                                </td>
                                                <td className="p-2 text-center">
                                                    <button
                                                        onClick={() => handleDeleteMaterial(idx)}
                                                        className="text-slate-300 dark:text-slate-600 hover:text-red-500 dark:hover:text-red-400 opacity-0 group-hover:opacity-100 transition"
                                                    >
                                                        <Trash2 size={14} />
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                    <tfoot className="bg-slate-50 dark:bg-slate-700/50 font-bold text-slate-800 dark:text-slate-200 border-t border-slate-200 dark:border-slate-700">
                                        <tr>
                                            <td colSpan="8" className="p-2">
                                                <button
                                                    onClick={handleAddMaterial}
                                                    className="text-indigo-600 dark:text-indigo-400 text-xs font-bold flex items-center hover:bg-indigo-50 dark:hover:bg-indigo-900/20 px-3 py-2 rounded transition w-full justify-center border border-dashed border-indigo-200 dark:border-indigo-700"
                                                >
                                                    <Plus size={14} className="mr-1" /> Agregar Insumo Manual
                                                </button>
                                            </td>
                                        </tr>
                                        <tr>
                                            <td colSpan="5" className="p-4 text-right uppercase text-xs text-slate-500 dark:text-slate-400">Total Estimado de Materiales</td>
                                            <td className="p-4 text-right font-mono text-indigo-600 dark:text-indigo-400">
                                                {formatCurrency(
                                                    materialList.reduce((sum, m) => sum + ((m.quantity || 0) * (m.unitPrice || 0)), 0)
                                                )}
                                            </td>
                                            <td colSpan="2"></td>
                                        </tr>
                                    </tfoot>
                                </table>
                            </div>
                        </div>
                    ) : (
                        <div className="p-12 text-center text-slate-400 dark:text-slate-500">
                            <Package size={48} className="mx-auto mb-4 opacity-50" />
                            <p className="mb-4">No hay lista de insumos generada aún.</p>
                            {onRegenerate && (
                                <button
                                    onClick={onRegenerate}
                                    disabled={isGenerating}
                                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition flex items-center gap-2 mx-auto disabled:opacity-50"
                                >
                                    {isGenerating ? (
                                        <>
                                            <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                                            Generando...
                                        </>
                                    ) : (
                                        <>
                                            <Sparkles size={16} />
                                            Generar con IA
                                        </>
                                    )}
                                </button>
                            )}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-4 bg-white dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 flex justify-between items-center text-xs text-slate-400 dark:text-slate-500">
                    <p>* Cantidades y costos estimados. Puedes editar cualquier campo.</p>
                    <div className="flex gap-2">
                        {materialList.length > 0 && (
                            <button
                                onClick={handleExportPDF}
                                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold transition flex items-center shadow-lg shadow-indigo-200 dark:shadow-indigo-900/50"
                            >
                                <Printer size={16} className="mr-2" /> Exportar PDF
                            </button>
                        )}
                        <button
                            onClick={handleClose}
                            className="px-6 py-2 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-600 dark:text-slate-300 rounded-lg font-bold transition"
                        >
                            Cerrar
                        </button>
                    </div>
                </div>
            </div>
        </div>
        </>
    );

    // Usar Portal para renderizar directamente en el body y evitar problemas de z-index con el sidebar
    // Esto asegura que el modal esté fuera del árbol DOM normal y por encima de todo
    if (typeof document !== 'undefined') {
        return createPortal(modalContent, document.body);
    }
    return modalContent;
};

export default MaterialModal;

