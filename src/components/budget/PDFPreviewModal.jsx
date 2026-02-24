import React, { useState, useEffect } from 'react';
import { X, Download, FileText, Loader } from 'lucide-react';
import jsPDF from 'jspdf';
import { PDFService } from '../../services/PDFService';

const PDFPreviewModal = ({
    isOpen,
    onClose,
    onDownload,
    projectInfo,
    items,
    calculations,
    technicalDescription = ''
}) => {
    const [pdfUrl, setPdfUrl] = useState(null);
    const [isGenerating, setIsGenerating] = useState(false);

    useEffect(() => {
        if (isOpen) {
            generatePDFPreview();
        } else {
            // Limpiar URL cuando se cierra el modal
            if (pdfUrl) {
                URL.revokeObjectURL(pdfUrl);
                setPdfUrl(null);
            }
        }

        // Cleanup al desmontar
        return () => {
            if (pdfUrl) {
                URL.revokeObjectURL(pdfUrl);
            }
        };
    }, [isOpen]);

    const generatePDFPreview = async () => {
        setIsGenerating(true);
        try {
            // Generar PDF en memoria
            const doc = new jsPDF();
            await PDFService.generateBudgetPDF(doc, {
                projectInfo,
                items,
                subtotal: calculations.subtotal,
                indirectCosts: calculations.indirectCosts,
                profit: calculations.profit,
                tax: calculations.tax,
                total: calculations.total,
                technicalDescription,
                isPreview: true
            });

            // Obtener el PDF como blob
            const pdfBlob = doc.output('blob');
            const url = URL.createObjectURL(pdfBlob);
            setPdfUrl(url);
        } catch (error) {
            console.error('Error generating PDF preview:', error);
        } finally {
            setIsGenerating(false);
        }
    };

    if (!isOpen) return null;

    // Agrupar items por categoría
    const groupedItems = items.reduce((acc, item) => {
        const cat = item.category || 'Sin Categoría';
        if (!acc[cat]) acc[cat] = [];
        acc[cat].push(item);
        return acc;
    }, {});

    return (
        <div className="fixed inset-0 z-[90] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-md animate-fadeIn">
            <div className="bg-white rounded-3xl shadow-2xl max-w-5xl w-full max-h-[95vh] flex flex-col overflow-hidden border border-slate-200">
                {/* Header */}
                <div className="p-6 border-b border-slate-200 flex justify-between items-center bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-r from-blue-600/90 to-indigo-600/90"></div>
                    <div className="relative z-10 flex items-center gap-3">
                        <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center backdrop-blur-sm">
                            <FileText size={20} />
                        </div>
                        <h3 className="font-bold text-xl">Vista Previa del Presupuesto</h3>
                    </div>
                    <button
                        onClick={onClose}
                        className="relative z-10 text-white/80 hover:text-white hover:bg-white/20 rounded-lg p-2 transition-all"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Content - PDF Preview */}
                <div className="p-4 overflow-hidden flex-1 bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
                    {isGenerating ? (
                        <div className="flex flex-col items-center justify-center h-full space-y-6">
                            <div className="relative">
                                <div className="w-20 h-20 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
                                <Loader className="absolute inset-0 animate-spin text-blue-600" size={48} />
                            </div>
                            <div className="text-center">
                                <p className="text-slate-700 font-semibold text-lg mb-1">Generando vista previa</p>
                                <p className="text-slate-500 text-sm">Por favor espera...</p>
                            </div>
                        </div>
                    ) : pdfUrl ? (
                        <div className="w-full h-full rounded-xl overflow-hidden shadow-2xl border-2 border-slate-200 bg-white">
                            <iframe
                                src={pdfUrl}
                                className="w-full h-full border-0"
                                title="Vista previa del PDF"
                                style={{ minHeight: '600px' }}
                            />
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center h-full space-y-4 text-slate-500 bg-white rounded-xl p-12 border-2 border-dashed border-slate-300">
                            <FileText size={48} className="text-slate-400" />
                            <p className="font-medium">No se pudo generar la vista previa</p>
                        </div>
                    )}
                </div>

                {/* Footer con Botones */}
                <div className="p-5 bg-gradient-to-r from-slate-50 to-white border-t border-slate-200 flex justify-between items-center">
                    <div className="text-xs text-slate-500 space-y-1">
                        <p className="flex items-center gap-2 font-medium">
                            <FileText size={14} />
                            Esta es la vista previa exacta del PDF.
                        </p>
                        <p className="text-slate-400 pl-6">
                            Si necesitas corregir algo, cierra esta ventana y edita en la tabla.
                        </p>
                    </div>
                    <div className="flex gap-3">
                        <button
                            onClick={onClose}
                            className="px-5 py-2.5 text-slate-600 hover:bg-slate-100 rounded-xl font-medium transition-all hover:scale-105 border border-slate-200"
                            disabled={isGenerating}
                        >
                            Volver a Editar
                        </button>
                        <button
                            onClick={onDownload}
                            disabled={isGenerating || !pdfUrl}
                            className={`px-6 py-2.5 rounded-xl font-bold shadow-lg transition-all flex items-center gap-2 ${isGenerating || !pdfUrl
                                ? 'bg-slate-300 text-slate-500 cursor-not-allowed'
                                : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-blue-200/50 hover:scale-105'
                                }`}
                        >
                            <Download size={18} />
                            Descargar PDF
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PDFPreviewModal;

