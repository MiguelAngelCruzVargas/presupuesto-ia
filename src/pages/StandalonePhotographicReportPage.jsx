import React, { useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
    ArrowLeft,
    Camera,
    Download,
    FileImage,
    ImagePlus,
    Minus,
    Plus,
    Trash2,
    Upload
} from 'lucide-react';
import { format } from 'date-fns';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import AlertModal from '../components/ui/AlertModal';
import ImageUploadService from '../services/ImageUploadService';

const createInitialReport = () => ({
    title: 'REPORTE FOTOGRAFICO DE OBRA',
    folio: `RF-${format(new Date(), 'yyyyMMdd')}`,
    contratista: '',
    supervisor: '',
    obra: '',
    contratoNo: 'S/N',
    ubicacion: '',
    conceptos: '',
    fecha: format(new Date(), 'yyyy-MM-dd'),
    semana: '',
    logo: '',
    gridCols: 2,
    imageFit: 'contain',
    photos: [],
    footerLeft: {
        title: 'EL CONTRATISTA',
        name: '',
        role: 'RESPONSABLE DE OBRA'
    },
    footerRight: {
        title: 'SUPERVISION',
        name: '',
        role: 'RESPONSABLE DE REVISION'
    }
});

const readFileAsDataUrl = (file) => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
});

const StandalonePhotographicReportPage = () => {
    const [report, setReport] = useState(createInitialReport);
    const [zoom, setZoom] = useState(0.8);
    const [isGenerating, setIsGenerating] = useState(false);
    const [compressingPhotos, setCompressingPhotos] = useState(false);
    const [alertModal, setAlertModal] = useState({ isOpen: false, title: '', message: '', type: 'info' });
    const reportRef = useRef(null);

    const completionRate = useMemo(() => {
        const checklist = [
            Boolean(report.logo),
            Boolean(report.contratista.trim()),
            Boolean(report.obra.trim()),
            Boolean(report.ubicacion.trim()),
            Boolean(report.conceptos.trim()),
            report.photos.length > 0,
            Boolean(report.footerLeft.name.trim()),
            Boolean(report.footerRight.name.trim())
        ];

        return Math.round((checklist.filter(Boolean).length / checklist.length) * 100);
    }, [report]);

    const recommendedImageSpec = useMemo(() => {
        if (report.gridCols === 1) {
            return {
                ratio: '16:9 o 4:3 horizontal',
                size: '1600 x 900 px minimo',
                note: 'Ideal para fotos amplias de frente general o avances completos.'
            };
        }

        if (report.gridCols === 2) {
            return {
                ratio: '4:3 horizontal',
                size: '1200 x 900 px minimo',
                note: 'Es la opcion mas equilibrada para obra, detalle y contexto.'
            };
        }

        return {
            ratio: '4:3 horizontal bien centrada',
            size: '1000 x 750 px minimo',
            note: 'Conviene usar tomas limpias porque en 3 columnas se ven mas pequenas.'
        };
    }, [report.gridCols]);

    const handleFieldChange = (field, value) => {
        setReport((prev) => ({ ...prev, [field]: value }));
    };

    const handleFooterChange = (side, field, value) => {
        setReport((prev) => ({
            ...prev,
            [side]: {
                ...prev[side],
                [field]: value
            }
        }));
    };

    const handleLogoUpload = async (event) => {
        const file = event.target.files?.[0];
        if (!file) return;

        try {
            const logo = await readFileAsDataUrl(file);
            handleFieldChange('logo', logo);
        } catch (error) {
            console.error('Error reading logo:', error);
            setAlertModal({
                isOpen: true,
                title: 'No se pudo cargar el logo',
                message: 'Intenta de nuevo con otra imagen.',
                type: 'error'
            });
        }
    };

    const handlePhotoUpload = async (event) => {
        const files = Array.from(event.target.files || []);
        if (files.length === 0) return;

        setCompressingPhotos(true);
        try {
            const images = await Promise.all(
                files.map(async (file) => {
                    const optimized = await ImageUploadService.prepareImageForApp(file);
                    return {
                        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
                        url: await readFileAsDataUrl(optimized.file),
                        description: '',
                        meta: {
                            originalSize: optimized.originalSize,
                            compressedSize: optimized.compressedSize,
                            reduction: optimized.reduction
                        }
                    };
                })
            );

            setReport((prev) => ({
                ...prev,
                photos: [...prev.photos, ...images]
            }));
        } catch (error) {
            console.error('Error reading photos:', error);
            setAlertModal({
                isOpen: true,
                title: 'No se pudieron cargar las fotos',
                message: 'Revisa los archivos seleccionados e inténtalo otra vez.',
                type: 'error'
            });
        } finally {
            setCompressingPhotos(false);
            event.target.value = '';
        }
    };

    const updatePhoto = (photoId, updates) => {
        setReport((prev) => ({
            ...prev,
            photos: prev.photos.map((photo) => (
                photo.id === photoId ? { ...photo, ...updates } : photo
            ))
        }));
    };

    const removePhoto = (photoId) => {
        setReport((prev) => ({
            ...prev,
            photos: prev.photos.filter((photo) => photo.id !== photoId)
        }));
    };

    const buildPdf = async () => {
        if (!reportRef.current) {
            throw new Error('No se encontró la vista previa del reporte.');
        }

        const canvas = await html2canvas(reportRef.current, {
            scale: 2,
            useCORS: true,
            backgroundColor: '#ffffff',
            logging: false
        });

        const pdf = new jsPDF({
            orientation: 'portrait',
            unit: 'mm',
            format: 'a4'
        });

        const margin = 6;
        const pageWidth = pdf.internal.pageSize.getWidth();
        const pageHeight = pdf.internal.pageSize.getHeight();
        const contentWidth = pageWidth - (margin * 2);
        const contentHeight = pageHeight - (margin * 2);
        const imageHeight = (canvas.height * contentWidth) / canvas.width;
        const imageData = canvas.toDataURL('image/jpeg', 0.98);

        let heightLeft = imageHeight;
        let position = margin;

        pdf.addImage(imageData, 'JPEG', margin, position, contentWidth, imageHeight);
        heightLeft -= contentHeight;

        while (heightLeft > 0) {
            position = margin - (imageHeight - heightLeft);
            pdf.addPage();
            pdf.addImage(imageData, 'JPEG', margin, position, contentWidth, imageHeight);
            heightLeft -= contentHeight;
        }

        const safeFolio = (report.folio || 'reporte').replace(/[^a-zA-Z0-9-_]/g, '_');
        const safeDate = (report.fecha || format(new Date(), 'yyyy-MM-dd')).replace(/[^0-9-]/g, '');

        return {
            pdf,
            filename: `Reporte_Fotografico_${safeFolio}_${safeDate}.pdf`
        };
    };

    const handleDownloadPdf = async () => {
        setIsGenerating(true);
        try {
            const result = await buildPdf();
            result.pdf.save(result.filename);
        } catch (error) {
            console.error('Error generating PDF:', error);
            setAlertModal({
                isOpen: true,
                title: 'Error al generar PDF',
                message: error.message || 'No se pudo generar el reporte en PDF.',
                type: 'error'
            });
        } finally {
            setIsGenerating(false);
        }
    };

    const photosPerPage = Math.max(1, report.gridCols * 3);

    return (
        <>
            <div className="flex flex-col gap-6 min-h-[calc(100vh-140px)]">
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                    <div>
                        <Link
                            to="/reports"
                            className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-blue-600 dark:text-slate-400 dark:hover:text-blue-300 transition"
                        >
                            <ArrowLeft size={16} />
                            Volver al modulo de reportes
                        </Link>
                        <h1 className="mt-2 text-2xl md:text-3xl font-bold text-slate-900 dark:text-slate-50">
                            Constructor Libre de Reporte Fotografico
                        </h1>
                        <p className="mt-1 text-sm md:text-base text-slate-600 dark:text-slate-300 max-w-3xl">
                            Crea reportes fotográficos aunque el presupuesto no haya nacido en esta app. Aquí puedes cargar logo, membrete, fotos, firmas y exportar tu documento final a PDF.
                        </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                        <div className="px-4 py-2 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-900">
                            <span className="text-xs font-bold uppercase tracking-wider">Checklist</span>
                            <p className="text-lg font-black">{completionRate}%</p>
                        </div>
                        <button
                            type="button"
                            onClick={handleDownloadPdf}
                            disabled={isGenerating}
                            className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-bold shadow-lg shadow-blue-200 dark:shadow-blue-950/40 transition"
                        >
                            {isGenerating ? (
                                <span className="h-5 w-5 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                            ) : (
                                <Download size={18} />
                            )}
                            {isGenerating ? 'Generando...' : 'Descargar PDF'}
                        </button>
                    </div>
                </div>

                <div className="grid grid-cols-1 xl:grid-cols-[420px_minmax(0,1fr)] gap-6 items-start">
                    <div className="space-y-6">
                        <section className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm p-5">
                            <h2 className="text-sm font-black uppercase tracking-[0.18em] text-slate-700 dark:text-slate-100 mb-4">
                                Datos del reporte
                            </h2>
                            <div className="grid grid-cols-1 gap-4">
                                <div className="grid grid-cols-2 gap-3">
                                    <label className="space-y-1">
                                        <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Folio</span>
                                        <input
                                            value={report.folio}
                                            onChange={(e) => handleFieldChange('folio', e.target.value)}
                                            className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 outline-none focus:ring-2 focus:ring-blue-500"
                                        />
                                    </label>
                                    <label className="space-y-1">
                                        <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Fecha</span>
                                        <input
                                            type="date"
                                            value={report.fecha}
                                            onChange={(e) => handleFieldChange('fecha', e.target.value)}
                                            className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 outline-none focus:ring-2 focus:ring-blue-500"
                                        />
                                    </label>
                                </div>

                                <label className="space-y-1">
                                    <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Titulo</span>
                                    <input
                                        value={report.title}
                                        onChange={(e) => handleFieldChange('title', e.target.value)}
                                        className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                </label>

                                <label className="space-y-1">
                                    <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Contratista</span>
                                    <input
                                        value={report.contratista}
                                        onChange={(e) => handleFieldChange('contratista', e.target.value)}
                                        className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                </label>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    <label className="space-y-1">
                                        <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Obra</span>
                                        <input
                                            value={report.obra}
                                            onChange={(e) => handleFieldChange('obra', e.target.value)}
                                            className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 outline-none focus:ring-2 focus:ring-blue-500"
                                        />
                                    </label>
                                    <label className="space-y-1">
                                        <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Contrato No.</span>
                                        <input
                                            value={report.contratoNo}
                                            onChange={(e) => handleFieldChange('contratoNo', e.target.value)}
                                            className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 outline-none focus:ring-2 focus:ring-blue-500"
                                        />
                                    </label>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    <label className="space-y-1">
                                        <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Ubicacion</span>
                                        <input
                                            value={report.ubicacion}
                                            onChange={(e) => handleFieldChange('ubicacion', e.target.value)}
                                            className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 outline-none focus:ring-2 focus:ring-blue-500"
                                        />
                                    </label>
                                    <label className="space-y-1">
                                        <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Semana</span>
                                        <input
                                            value={report.semana}
                                            onChange={(e) => handleFieldChange('semana', e.target.value)}
                                            className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 outline-none focus:ring-2 focus:ring-blue-500"
                                        />
                                    </label>
                                </div>

                                <label className="space-y-1">
                                    <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Conceptos</span>
                                    <textarea
                                        rows={3}
                                        value={report.conceptos}
                                        onChange={(e) => handleFieldChange('conceptos', e.target.value)}
                                        className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                                    />
                                </label>
                            </div>
                        </section>

                        <section className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm p-5">
                            <h2 className="text-sm font-black uppercase tracking-[0.18em] text-slate-700 dark:text-slate-100 mb-4">
                                Plantilla y disposicion
                            </h2>
                            <div className="space-y-4">
                                <label className="flex items-center justify-between gap-4 p-4 rounded-2xl border border-dashed border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 cursor-pointer hover:border-blue-400 hover:bg-blue-50/60 dark:hover:bg-blue-950/20 transition">
                                    <div className="flex items-center gap-3">
                                        <div className="w-12 h-12 rounded-2xl bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-300 flex items-center justify-center">
                                            <FileImage size={22} />
                                        </div>
                                        <div>
                                            <p className="font-bold text-slate-800 dark:text-slate-100">Logo o membrete</p>
                                            <p className="text-sm text-slate-500 dark:text-slate-400">Carga el encabezado visual de tu formato.</p>
                                        </div>
                                    </div>
                                    <span className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-white dark:bg-slate-800 text-sm font-semibold text-slate-700 dark:text-slate-200 shadow-sm">
                                        <Upload size={16} />
                                        Subir
                                    </span>
                                    <input type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
                                </label>

                                <div className="grid grid-cols-2 gap-3">
                                    <label className="space-y-1">
                                        <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Columnas de fotos</span>
                                        <select
                                            value={report.gridCols}
                                            onChange={(e) => handleFieldChange('gridCols', Number(e.target.value))}
                                            className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 outline-none focus:ring-2 focus:ring-blue-500"
                                        >
                                            <option value={1}>1 columna</option>
                                            <option value={2}>2 columnas</option>
                                            <option value={3}>3 columnas</option>
                                        </select>
                                    </label>
                                    <label className="space-y-1">
                                        <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Ajuste de imagen</span>
                                        <select
                                            value={report.imageFit}
                                            onChange={(e) => handleFieldChange('imageFit', e.target.value)}
                                            className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 outline-none focus:ring-2 focus:ring-blue-500"
                                        >
                                            <option value="contain">Ajustar completa</option>
                                            <option value="cover">Llenar recortando</option>
                                        </select>
                                    </label>
                                </div>

                                <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 dark:border-amber-900/60 dark:bg-amber-950/20">
                                    <p className="text-xs font-black uppercase tracking-[0.18em] text-amber-800 dark:text-amber-300">
                                        Tamano recomendado de imagen
                                    </p>
                                    <p className="mt-2 text-sm font-semibold text-amber-900 dark:text-amber-100">
                                        Proporcion: {recommendedImageSpec.ratio}
                                    </p>
                                    <p className="text-sm text-amber-800 dark:text-amber-200">
                                        Resolucion: {recommendedImageSpec.size}
                                    </p>
                                    <p className="mt-1 text-xs text-amber-700 dark:text-amber-300">
                                        {recommendedImageSpec.note}
                                    </p>
                                    <p className="mt-2 text-xs text-amber-700 dark:text-amber-300">
                                        Consejo: usa <strong>Ajustar completa</strong> para que la foto no salga cortada ni estirada. Usa <strong>Llenar recortando</strong> solo si quieres ocupar todo el cuadro.
                                    </p>
                                </div>
                            </div>
                        </section>

                        <section className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm p-5">
                                <div className="flex items-center justify-between gap-3 mb-4">
                                    <div>
                                        <h2 className="text-sm font-black uppercase tracking-[0.18em] text-slate-700 dark:text-slate-100">
                                            Evidencia fotografica
                                        </h2>
                                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                                        Puedes subir fotos aunque no exista un presupuesto previo.
                                    </p>
                                </div>
                                <label className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold cursor-pointer shadow-lg shadow-emerald-200 dark:shadow-emerald-950/40 transition">
                                    <ImagePlus size={18} />
                                    {compressingPhotos ? 'Comprimiendo...' : 'Agregar'}
                                    <input type="file" accept="image/*" multiple className="hidden" onChange={handlePhotoUpload} />
                                </label>
                            </div>

                            <div className="mb-4 rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3 dark:border-blue-900/60 dark:bg-blue-950/20">
                                <p className="text-xs font-black uppercase tracking-[0.18em] text-blue-800 dark:text-blue-300">
                                    Compresion automatica
                                </p>
                                <p className="mt-1 text-sm text-blue-800 dark:text-blue-200">
                                    Cada imagen se optimiza automaticamente para quedar cerca de <strong>2 MB</strong> sin degradacion agresiva antes de entrar al reporte.
                                </p>
                            </div>

                            {report.photos.length === 0 ? (
                                <div className="rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/40 p-8 text-center">
                                    <Camera size={40} className="mx-auto mb-3 text-slate-300 dark:text-slate-600" />
                                    <p className="font-bold text-slate-700 dark:text-slate-200">Todavia no agregas fotos</p>
                                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Sube tus evidencias y empieza a armar el reporte.</p>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {report.photos.map((photo, index) => (
                                        <div key={photo.id} className="rounded-2xl border border-slate-200 dark:border-slate-700 p-3 bg-slate-50 dark:bg-slate-900/50">
                                            <div className="flex items-start gap-3">
                                                <img
                                                    src={photo.url}
                                                    alt={`Evidencia ${index + 1}`}
                                                    className="w-24 h-24 rounded-xl object-cover border border-slate-200 dark:border-slate-700"
                                                />
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center justify-between gap-3 mb-2">
                                                        <span className="text-xs font-black uppercase tracking-wider text-slate-500">
                                                            Evidencia {String(index + 1).padStart(2, '0')}
                                                        </span>
                                                        <button
                                                            type="button"
                                                            onClick={() => removePhoto(photo.id)}
                                                            className="p-2 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition"
                                                        >
                                                            <Trash2 size={16} />
                                                        </button>
                                                    </div>
                                                    <textarea
                                                        rows={2}
                                                        value={photo.description}
                                                        onChange={(e) => updatePhoto(photo.id, { description: e.target.value })}
                                                        placeholder="Descripcion opcional para esta foto"
                                                        className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                                                    />
                                                    {photo.meta && photo.meta.originalSize > photo.meta.compressedSize && (
                                                        <p className="mt-2 text-[11px] text-emerald-700 dark:text-emerald-300 font-medium">
                                                            Optimizada de {(photo.meta.originalSize / 1024 / 1024).toFixed(2)} MB a {(photo.meta.compressedSize / 1024 / 1024).toFixed(2)} MB
                                                        </p>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </section>

                        <section className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm p-5">
                            <h2 className="text-sm font-black uppercase tracking-[0.18em] text-slate-700 dark:text-slate-100 mb-4">
                                Firmas
                            </h2>
                            <div className="grid grid-cols-1 gap-5">
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                    <input
                                        value={report.footerLeft.title}
                                        onChange={(e) => handleFooterChange('footerLeft', 'title', e.target.value)}
                                        placeholder="Titulo firma izquierda"
                                        className="px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                    <input
                                        value={report.footerLeft.name}
                                        onChange={(e) => handleFooterChange('footerLeft', 'name', e.target.value)}
                                        placeholder="Nombre firma izquierda"
                                        className="px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                    <input
                                        value={report.footerLeft.role}
                                        onChange={(e) => handleFooterChange('footerLeft', 'role', e.target.value)}
                                        placeholder="Cargo firma izquierda"
                                        className="px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                    <input
                                        value={report.footerRight.title}
                                        onChange={(e) => handleFooterChange('footerRight', 'title', e.target.value)}
                                        placeholder="Titulo firma derecha"
                                        className="px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                    <input
                                        value={report.footerRight.name}
                                        onChange={(e) => handleFooterChange('footerRight', 'name', e.target.value)}
                                        placeholder="Nombre firma derecha"
                                        className="px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                    <input
                                        value={report.footerRight.role}
                                        onChange={(e) => handleFooterChange('footerRight', 'role', e.target.value)}
                                        placeholder="Cargo firma derecha"
                                        className="px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>
                            </div>
                        </section>
                    </div>

                    <div className="space-y-4">
                        <div className="flex items-center justify-between gap-3 px-4 py-3 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
                            <div>
                                <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">Vista previa A4</p>
                                <p className="text-sm text-slate-600 dark:text-slate-300">La exportación sale desde esta plantilla.</p>
                            </div>
                            <div className="flex items-center gap-2">
                                <button
                                    type="button"
                                    onClick={() => setZoom((prev) => Math.max(0.5, Number((prev - 0.1).toFixed(2))))}
                                    className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition text-slate-500"
                                >
                                    <Minus size={16} />
                                </button>
                                <span className="min-w-[56px] text-center text-sm font-bold text-slate-700 dark:text-slate-200">
                                    {Math.round(zoom * 100)}%
                                </span>
                                <button
                                    type="button"
                                    onClick={() => setZoom((prev) => Math.min(1.2, Number((prev + 0.1).toFixed(2))))}
                                    className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition text-slate-500"
                                >
                                    <Plus size={16} />
                                </button>
                            </div>
                        </div>

                        <div className="overflow-auto rounded-3xl border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-900/50 p-4 md:p-8">
                            <div
                                className="origin-top mx-auto transition-transform duration-200"
                                style={{
                                    width: '210mm',
                                    transform: `scale(${zoom})`
                                }}
                            >
                                <div
                                    ref={reportRef}
                                    className="bg-white text-black shadow-[0_24px_60px_rgba(15,23,42,0.18)] p-[6mm]"
                                >
                                    <div className="border-2 border-black">
                                        <div className="border-b-2 border-black min-h-[96px] flex items-center justify-center p-3">
                                            {report.logo ? (
                                                <img src={report.logo} alt="Logo" className="max-h-28 w-full object-contain" />
                                            ) : (
                                                <div className="text-[11px] font-bold tracking-[0.25em] uppercase text-slate-300">
                                                    Logo / Membrete
                                                </div>
                                            )}
                                        </div>

                                        <div className="border-b-2 border-black py-2 px-3 text-center">
                                            <h2 className="text-sm font-black uppercase tracking-[0.35em] leading-tight">
                                                {report.title || 'REPORTE FOTOGRAFICO DE OBRA'}
                                            </h2>
                                        </div>

                                        <div className="grid grid-cols-12 divide-x-2 divide-black">
                                            <div className="col-span-4 divide-y-2 divide-black">
                                                <div className="min-h-[62px] p-2">
                                                    <span className="block text-[10px] font-bold">CONTRATISTA:</span>
                                                    <span className="block text-sm font-medium uppercase">{report.contratista || 'S/N'}</span>
                                                </div>
                                                <div className="min-h-[62px] p-2">
                                                    <span className="block text-[10px] font-bold">UBICACION:</span>
                                                    <span className="block text-sm font-medium uppercase">{report.ubicacion || 'S/N'}</span>
                                                </div>
                                            </div>

                                            <div className="col-span-5 divide-y-2 divide-black">
                                                <div className="min-h-[62px] p-2">
                                                    <span className="block text-[10px] font-bold">OBRA:</span>
                                                    <span className="block text-sm font-medium uppercase">{report.obra || 'S/N'}</span>
                                                </div>
                                                <div className="min-h-[62px] p-2">
                                                    <span className="block text-[10px] font-bold">CONCEPTOS:</span>
                                                    <span className="block text-[11px] font-medium uppercase leading-tight">{report.conceptos || 'S/N'}</span>
                                                </div>
                                            </div>

                                            <div className="col-span-3 divide-y-2 divide-black">
                                                <div className="min-h-[62px] p-2">
                                                    <span className="block text-[10px] font-bold">CONTRATO No.:</span>
                                                    <span className="block text-sm font-medium uppercase">{report.contratoNo || 'S/N'}</span>
                                                </div>
                                                <div className="min-h-[62px] p-2 flex flex-col justify-center gap-1">
                                                    <div>
                                                        <span className="text-[10px] font-bold">FECHA:</span>{' '}
                                                        <span className="text-sm font-medium uppercase">{report.fecha || 'S/N'}</span>
                                                    </div>
                                                    <div>
                                                        <span className="text-[10px] font-bold">SEMANA:</span>{' '}
                                                        <span className="text-sm font-medium uppercase">{report.semana || 'S/N'}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div
                                        className={`grid gap-4 mt-5 ${
                                            report.gridCols === 1
                                                ? 'grid-cols-1'
                                                : report.gridCols === 2
                                                    ? 'grid-cols-2'
                                                    : 'grid-cols-3'
                                        }`}
                                    >
                                        {report.photos.map((photo, index) => (
                                            <div
                                                key={photo.id}
                                                data-pdf-break-before={index > 0 && index % photosPerPage === 0 ? true : undefined}
                                                className="border-2 border-black bg-white overflow-hidden"
                                            >
                                                <div className="relative aspect-[4/3] border-b-2 border-black bg-[linear-gradient(135deg,#f8fafc_0%,#e2e8f0_100%)]">
                                                    <div className="absolute top-2 left-2 px-2 py-1 bg-black/75 text-white rounded-sm text-[8px] font-bold tracking-[0.18em] uppercase">
                                                        EV-{String(index + 1).padStart(2, '0')}
                                                    </div>
                                                    <img
                                                        src={photo.url}
                                                        alt={`Foto ${index + 1}`}
                                                        className={`w-full h-full ${
                                                            report.imageFit === 'cover'
                                                                ? 'object-cover'
                                                                : 'object-contain p-2'
                                                        }`}
                                                    />
                                                </div>
                                                <div className="p-2 min-h-[52px]">
                                                    <p className="text-[10px] font-semibold uppercase leading-tight">
                                                        {photo.description || 'Sin descripcion'}
                                                    </p>
                                                </div>
                                            </div>
                                        ))}

                                        {report.photos.length === 0 && (
                                            <div className="col-span-full border-2 border-dashed border-slate-300 min-h-[180px] flex flex-col items-center justify-center text-slate-300">
                                                <Camera size={42} className="mb-3" />
                                                <p className="text-base font-semibold">Sin evidencias cargadas</p>
                                                <p className="text-xs">Agrega fotos desde el panel izquierdo</p>
                                            </div>
                                        )}
                                    </div>

                                    <div className="mt-8 grid grid-cols-2 gap-12 px-10">
                                        <div className="text-center pt-2 border-t-2 border-black">
                                            <p className="text-[11px] font-black uppercase leading-tight">{report.footerLeft.title || 'EL CONTRATISTA'}</p>
                                            <p className="text-[10px] font-medium uppercase mt-1">{report.footerLeft.name || ' '}</p>
                                            <p className="text-[9px] font-bold text-slate-600 uppercase mt-1">{report.footerLeft.role || ' '}</p>
                                        </div>
                                        <div className="text-center pt-2 border-t-2 border-black">
                                            <p className="text-[11px] font-black uppercase leading-tight">{report.footerRight.title || 'SUPERVISION'}</p>
                                            <p className="text-[10px] font-medium uppercase mt-1">{report.footerRight.name || ' '}</p>
                                            <p className="text-[9px] font-bold text-slate-600 uppercase mt-1">{report.footerRight.role || ' '}</p>
                                        </div>
                                    </div>

                                    <div className="mt-4 text-right">
                                        <span className="text-[9px] font-bold uppercase tracking-[0.18em] text-slate-500">
                                            Folio {report.folio || 'S/N'}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <AlertModal
                isOpen={alertModal.isOpen}
                onClose={() => setAlertModal({ ...alertModal, isOpen: false })}
                title={alertModal.title}
                message={alertModal.message}
                type={alertModal.type}
            />
        </>
    );
};

export default StandalonePhotographicReportPage;
