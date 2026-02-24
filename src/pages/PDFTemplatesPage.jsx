import React, { useState, useEffect, useRef } from 'react';
import { Settings, Plus, Trash2, Check, X, Upload, Image as ImageIcon, Palette, FileText, Save, Wand2, Move, Maximize2, Eye, XCircle } from 'lucide-react';
import { PDFTemplateService } from '../services/PDFTemplateService';
import { useProject } from '../context/ProjectContext';
import Card from '../components/ui/Card';
import PDFPreviewModal from '../components/budget/PDFPreviewModal';
import jsPDF from 'jspdf';
import { PDFService } from '../services/PDFService';
import { CalculationsService } from '../services/CalculationsService';

const PDFTemplatesPage = () => {
    const { showToast } = useProject();
    const [templates, setTemplates] = useState([]);
    const [activeTemplate, setActiveTemplate] = useState(null);
    const [showModal, setShowModal] = useState(false);
    const [editingTemplate, setEditingTemplate] = useState(null);
    const [previewLogo, setPreviewLogo] = useState(null);
    const [showImageEditor, setShowImageEditor] = useState(false);
    const [removeBgColor, setRemoveBgColor] = useState('#ffffff');
    const [removeBgTolerance, setRemoveBgTolerance] = useState(30);
    const [showPDFPreview, setShowPDFPreview] = useState(false);
    const [previewTemplate, setPreviewTemplate] = useState(null);
    const canvasRef = useRef(null);
    const imageRef = useRef(null);

    const [formData, setFormData] = useState({
        name: '',
        headerColor: null,
        headerTextColor: [255, 255, 255], // Blanco por defecto
        headerTextSize: 18, // Tamaño del título
        headerSubtextSize: 9, // Tamaño del subtítulo
        logoUrl: null,
        logoPosition: 'left',
        logoSize: { width: 40, height: 40 },
        showHeader: true,
        headerText: 'PRESUPUESTO DE OBRA',
        headerSubtext: 'DOCUMENTO TÉCNICO',
        footerText: '',
        isActive: false
    });

    useEffect(() => {
        loadTemplates();
    }, []);

    const loadTemplates = () => {
        const allTemplates = PDFTemplateService.getTemplates();
        setTemplates(allTemplates);
        const active = PDFTemplateService.getActiveTemplate();
        setActiveTemplate(active);
    };

    const handleOpenModal = (template = null) => {
        if (template) {
            setEditingTemplate(template);
            setFormData({
                name: template.name,
                headerColor: template.headerColor,
                headerTextColor: template.headerTextColor || [255, 255, 255],
                headerTextSize: template.headerTextSize || 18,
                headerSubtextSize: template.headerSubtextSize || 9,
                logoUrl: template.logoUrl,
                logoPosition: template.logoPosition || 'left',
                logoSize: template.logoSize || { width: 40, height: 40 },
                showHeader: template.showHeader !== false,
                headerText: template.headerText || 'PRESUPUESTO DE OBRA',
                headerSubtext: template.headerSubtext || 'DOCUMENTO TÉCNICO',
                footerText: template.footerText || '',
                isActive: template.isActive || false
            });
            setPreviewLogo(template.logoUrl);
        } else {
            setEditingTemplate(null);
            setFormData({
                name: '',
                headerColor: null,
                headerTextColor: [255, 255, 255],
                headerTextSize: 18,
                headerSubtextSize: 9,
                logoUrl: null,
                logoPosition: 'left',
                logoSize: { width: 40, height: 40 },
                showHeader: true,
                headerText: 'PRESUPUESTO DE OBRA',
                headerSubtext: 'DOCUMENTO TÉCNICO',
                footerText: '',
                isActive: false
            });
            setPreviewLogo(null);
        }
        setShowModal(true);
    };

    const handleCloseModal = () => {
        setShowModal(false);
        setEditingTemplate(null);
        setPreviewLogo(null);
    };

    const handleImageUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        if (!file.type.startsWith('image/')) {
            showToast('Solo se permiten archivos de imagen', 'error');
            return;
        }

        if (file.size > 2 * 1024 * 1024) {
            showToast('La imagen debe ser menor a 2MB', 'error');
            return;
        }

        try {
            const base64 = await PDFTemplateService.imageToBase64(file);
            setFormData({ ...formData, logoUrl: base64 });
            setPreviewLogo(base64);
            showToast('Logo cargado correctamente', 'success');
        } catch (error) {
            console.error('Error uploading image:', error);
            showToast('Error al cargar la imagen', 'error');
        }
    };

    const removeBackground = () => {
        if (!previewLogo || !canvasRef.current) return;

        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        const img = new Image();

        img.onload = () => {
            canvas.width = img.width;
            canvas.height = img.height;
            ctx.drawImage(img, 0, 0);

            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const data = imageData.data;

            // Convertir color hex a RGB
            const hex = removeBgColor.replace('#', '');
            const targetR = parseInt(hex.substring(0, 2), 16);
            const targetG = parseInt(hex.substring(2, 4), 16);
            const targetB = parseInt(hex.substring(4, 6), 16);

            // Hacer transparente los píxeles similares al color objetivo
            for (let i = 0; i < data.length; i += 4) {
                const r = data[i];
                const g = data[i + 1];
                const b = data[i + 2];

                // Calcular distancia del color
                const distance = Math.sqrt(
                    Math.pow(r - targetR, 2) +
                    Math.pow(g - targetG, 2) +
                    Math.pow(b - targetB, 2)
                );

                // Si está dentro de la tolerancia, hacer transparente
                if (distance <= removeBgTolerance) {
                    data[i + 3] = 0; // Alpha = 0 (transparente)
                }
            }

            ctx.putImageData(imageData, 0, 0);
            const newBase64 = canvas.toDataURL('image/png');
            setFormData({ ...formData, logoUrl: newBase64 });
            setPreviewLogo(newBase64);
            showToast('Fondo removido correctamente', 'success');
        };

        img.src = previewLogo;
    };

    const handleColorChange = (colorType, value) => {
        if (colorType === 'none') {
            setFormData({ ...formData, headerColor: null });
        } else {
            // Convertir hex a RGB
            const hex = value.replace('#', '');
            const r = parseInt(hex.substring(0, 2), 16);
            const g = parseInt(hex.substring(2, 4), 16);
            const b = parseInt(hex.substring(4, 6), 16);
            setFormData({ ...formData, headerColor: [r, g, b] });
        }
    };

    const handleSave = () => {
        const validation = PDFTemplateService.validateTemplate(formData);
        if (!validation.valid) {
            showToast(validation.errors[0], 'error');
            return;
        }

        try {
            // First save the template to update its data
            const saved = PDFTemplateService.saveTemplate({
                ...formData,
                id: editingTemplate?.id,
                isActive: formData.isActive || false
            });

            // If it was marked active in the form, ensure the service knows and updates everything
            // Note: saveTemplate already handles some of this, but setActiveTemplate ensures exclusivity
            if (formData.isActive) {
                PDFTemplateService.setActiveTemplate(saved.id);
            } else {
                // If we explicitly deactivated it, check if it was the currently active one
                const currentActive = PDFTemplateService.getActiveTemplate();
                if (currentActive && currentActive.id === saved.id) {
                    // We just saved it as inactive, but the service might need to clean up the 'active' key reference
                    // Actually, PDFTemplateService.saveTemplate handles clearing the key if isActive is false
                    // but let's be double sure by re-fetching.
                }
            }

            showToast(
                editingTemplate ? 'Plantilla actualizada' : 'Plantilla creada',
                'success'
            );
            loadTemplates();
            handleCloseModal();
        } catch (error) {
            showToast('Error al guardar la plantilla', 'error');
        }
    };

    const handleDelete = (templateId) => {
        if (window.confirm('¿Estás seguro de eliminar esta plantilla?')) {
            try {
                PDFTemplateService.deleteTemplate(templateId);
                showToast('Plantilla eliminada', 'success');
                loadTemplates();
            } catch (error) {
                showToast('Error al eliminar la plantilla', 'error');
            }
        }
    };

    const handleSetActive = (templateId) => {
        try {
            PDFTemplateService.setActiveTemplate(templateId);
            showToast('Plantilla activada', 'success');
            loadTemplates();
        } catch (error) {
            showToast('Error al activar la plantilla', 'error');
        }
    };

    const handleDeactivate = () => {
        try {
            // Limpiar completamente la referencia de plantilla activa
            localStorage.removeItem('presugenius_active_pdf_template');

            // Actualizar todas las plantillas para marcar isActive como false
            const templates = PDFTemplateService.getTemplates();
            templates.forEach(t => {
                t.isActive = false;
            });
            localStorage.setItem('presugenius_pdf_templates', JSON.stringify(templates));

            showToast('Plantilla desactivada', 'success');
            loadTemplates();
        } catch (error) {
            console.error('Error al desactivar la plantilla:', error);
            showToast('Error al desactivar la plantilla', 'error');
        }
    };

    const handlePreviewTemplate = (template) => {
        // Activar temporalmente esta plantilla para la vista previa
        const originalActive = PDFTemplateService.getActiveTemplate();
        PDFTemplateService.setActiveTemplate(template.id);

        // Guardar referencia para restaurar después
        setPreviewTemplate({ ...template, originalActive });
        setShowPDFPreview(true);
    };

    const handleClosePreview = () => {
        // Restaurar plantilla activa original
        if (previewTemplate?.originalActive) {
            // Había una plantilla activa, restaurarla
            PDFTemplateService.setActiveTemplate(previewTemplate.originalActive.id);
        } else {
            // No había plantilla activa original, limpiar completamente
            localStorage.removeItem('presugenius_active_pdf_template');
            // También actualizar el estado isActive en todas las plantillas
            const templates = PDFTemplateService.getTemplates();
            templates.forEach(t => {
                t.isActive = false;
            });
            localStorage.setItem('presugenius_pdf_templates', JSON.stringify(templates));
        }

        setShowPDFPreview(false);
        setPreviewTemplate(null);
        // Recargar plantillas para actualizar el estado
        loadTemplates();
    };

    const handleGenerateDefaults = () => {
        const defaults = [
            {
                name: 'Corporativo Azul',
                headerColor: [26, 35, 126], // #1a237e
                headerTextColor: [255, 255, 255],
                headerTextSize: 22,
                headerSubtextSize: 10,
                headerText: 'PRESUPUESTO DE OBRA',
                headerSubtext: 'DOCUMENTO TÉCNICO',
                showHeader: true,
                isActive: false
            },
            {
                name: 'Moderno Oscuro',
                headerColor: [30, 41, 59], // Slate 800
                headerTextColor: [255, 255, 255],
                headerTextSize: 20,
                headerSubtextSize: 10,
                headerText: 'PRESUPUESTO',
                headerSubtext: 'PROYECTO EJECUTIVO',
                showHeader: true,
                isActive: false
            },
            {
                name: 'Minimalista',
                headerColor: [255, 255, 255],
                headerTextColor: [15, 23, 42], // Slate 900
                headerTextSize: 24,
                headerSubtextSize: 10,
                headerText: 'PRESUPUESTO',
                headerSubtext: '',
                showHeader: true,
                isActive: false
            }
        ];

        try {
            // Verificar si ya existen para no duplicar ciegamente (opcional, pero buena práctica)
            // Aquí simplemente las agregamos
            defaults.forEach(t => PDFTemplateService.saveTemplate(t));
            showToast('3 plantillas profesionales generadas', 'success');
            loadTemplates();
        } catch (error) {
            console.error('Error generating defaults:', error);
            showToast('Error al generar plantillas', 'error');
        }
    };

    const getColorHex = (rgb) => {
        if (!rgb || !Array.isArray(rgb)) return '#1a237e';
        return `#${rgb[0].toString(16).padStart(2, '0')}${rgb[1].toString(16).padStart(2, '0')}${rgb[2].toString(16).padStart(2, '0')}`;
    };

    return (
        <div className="space-y-6 animate-fadeIn">
            {/* Header */}
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h2 className="text-3xl font-bold bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent mb-2">
                        Plantillas de PDF
                    </h2>
                    <p className="text-slate-500 text-sm">Personaliza el diseño de tus presupuestos en PDF</p>
                </div>
                <button
                    onClick={() => handleOpenModal()}
                    className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white px-6 py-3 rounded-xl font-bold shadow-lg shadow-blue-200/50 transition-all hover:scale-105 flex items-center gap-2"
                >
                    <Plus size={20} />
                    Nueva Plantilla
                </button>
            </div>

            {/* Lista de Plantillas */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {templates.length === 0 ? (
                    <Card className="col-span-full p-16 text-center bg-gradient-to-br from-slate-50 to-white">
                        <div className="max-w-md mx-auto">
                            <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-2xl flex items-center justify-center">
                                <FileText size={40} className="text-blue-600" />
                            </div>
                            <h3 className="text-xl font-bold text-slate-800 mb-2">No hay plantillas creadas</h3>
                            <p className="text-slate-500 mb-6">Crea tu primera plantilla personalizada para darle un toque único a tus presupuestos</p>
                            <button
                                onClick={() => handleOpenModal()}
                                className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white px-6 py-3 rounded-xl font-bold shadow-lg shadow-blue-200/50 transition-all hover:scale-105 flex items-center gap-2 mx-auto"
                            >
                                <Plus size={20} />
                                Crear Primera Plantilla
                            </button>

                            <div className="mt-4 pt-4 border-t border-slate-100">
                                <p className="text-xs text-slate-400 mb-3">¿Prefieres no empezar desde cero?</p>
                                <button
                                    onClick={handleGenerateDefaults}
                                    className="text-indigo-600 hover:text-indigo-800 text-sm font-bold flex items-center justify-center gap-2 mx-auto hover:underline"
                                >
                                    <Wand2 size={16} />
                                    Generar Plantillas Automáticas
                                </button>
                            </div>
                        </div>
                    </Card>
                ) : (
                    templates.map(template => (
                        <Card key={template.id} className={`p-0 overflow-hidden hover:shadow-xl transition-all duration-300 group ${template.isActive ? 'ring-2 ring-emerald-500 dark:ring-emerald-400 ring-opacity-50' : ''}`}>
                            {/* Header con gradiente */}
                            <div className={`relative p-5 ${template.isActive ? 'bg-gradient-to-br from-emerald-50 to-emerald-100 dark:from-emerald-900/30 dark:to-emerald-800/30' : 'bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-700 dark:to-slate-800'}`}>
                                <div className="flex items-start justify-between mb-3">
                                    <div className="flex-1">
                                        <h3 className="font-bold text-lg text-slate-800 dark:text-slate-100 mb-2 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                                            {template.name}
                                        </h3>
                                        {template.isActive && (
                                            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500 dark:bg-emerald-600 text-white rounded-full text-xs font-bold shadow-sm">
                                                <Check size={12} />
                                                Activa
                                            </span>
                                        )}
                                    </div>
                                    <div className="flex gap-1.5">
                                        <button
                                            onClick={() => handlePreviewTemplate(template)}
                                            className="p-2.5 text-purple-600 hover:bg-purple-100 rounded-lg transition-all hover:scale-110 shadow-sm"
                                            title="Vista Previa PDF"
                                        >
                                            <Eye size={18} />
                                        </button>
                                        {template.isActive ? (
                                            <button
                                                onClick={handleDeactivate}
                                                className="p-2.5 text-orange-600 hover:bg-orange-100 rounded-lg transition-all hover:scale-110 shadow-sm"
                                                title="Desactivar plantilla"
                                            >
                                                <XCircle size={18} />
                                            </button>
                                        ) : (
                                            <button
                                                onClick={() => handleSetActive(template.id)}
                                                className="p-2.5 text-blue-600 hover:bg-blue-100 rounded-lg transition-all hover:scale-110 shadow-sm"
                                                title="Activar plantilla"
                                            >
                                                <Check size={18} />
                                            </button>
                                        )}
                                        <button
                                            onClick={() => handleOpenModal(template)}
                                            className="p-2.5 text-slate-600 hover:bg-slate-200 rounded-lg transition-all hover:scale-110 shadow-sm"
                                            title="Editar"
                                        >
                                            <Settings size={18} />
                                        </button>
                                        <button
                                            onClick={() => handleDelete(template.id)}
                                            className="p-2.5 text-red-600 hover:bg-red-100 rounded-lg transition-all hover:scale-110 shadow-sm"
                                            title="Eliminar"
                                        >
                                            <Trash2 size={18} />
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* Preview del Header con mejor diseño */}
                            <div className="p-6 bg-white dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700">
                                <div>
                                    <p className="text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wide mb-3">Vista Previa</p>
                                    <div
                                        className="min-h-[140px] rounded-lg flex items-center justify-center relative overflow-hidden shadow-xl border-2 border-slate-300 dark:border-slate-600 bg-gradient-to-r"
                                        style={{
                                            backgroundColor: template.headerColor
                                                ? `rgb(${template.headerColor.join(',')})`
                                                : '#1a237e'
                                        }}
                                    >
                                        {template.logoUrl && (
                                            <img
                                                src={template.logoUrl}
                                                alt="Logo"
                                                className={`absolute top-1/2 -translate-y-1/2 z-10 ${template.logoPosition === 'left' ? 'left-6' :
                                                    template.logoPosition === 'right' ? 'right-6' :
                                                        'left-1/2 -translate-x-1/2'
                                                    }`}
                                                style={{
                                                    width: `${Math.min(template.logoSize?.width || 40, 60)}px`,
                                                    height: `${Math.min(template.logoSize?.height || 40, 60)}px`,
                                                    objectFit: 'contain',
                                                    filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.2))'
                                                }}
                                            />
                                        )}
                                        <div className={`text-center px-6 py-4 ${template.logoUrl && template.logoPosition === 'left' ? 'ml-auto mr-auto' :
                                            template.logoUrl && template.logoPosition === 'right' ? 'mr-auto ml-auto' :
                                                ''
                                            }`}
                                            style={{
                                                color: template.headerTextColor
                                                    ? `rgb(${template.headerTextColor.join(',')})`
                                                    : 'rgb(255, 255, 255)',
                                                textShadow: '0 1px 2px rgba(0,0,0,0.1)'
                                            }}>
                                            <p className="font-bold mb-1" style={{ fontSize: `${Math.min(template.headerTextSize || 18, 22)}px` }}>
                                                {template.headerText}
                                            </p>
                                            <p className="opacity-90" style={{ fontSize: `${Math.min(template.headerSubtextSize || 9, 12)}px` }}>
                                                {template.headerSubtext}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </Card>
                    ))
                )}
            </div>

            {/* Modal de Edición */}
            {showModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm animate-fadeIn">
                    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] flex flex-col overflow-hidden">
                        {/* Header */}
                        <div className="p-5 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-gradient-to-r from-blue-600 to-indigo-600 text-white">
                            <h3 className="font-bold flex items-center text-lg">
                                <Settings className="mr-2 text-blue-200" />
                                {editingTemplate ? 'Editar Plantilla' : 'Nueva Plantilla'}
                            </h3>
                            <button onClick={handleCloseModal} className="text-white/60 hover:text-white transition">
                                <X size={20} />
                            </button>
                        </div>

                        {/* Content */}
                        <div className="p-6 overflow-y-auto flex-1 space-y-6 bg-white dark:bg-slate-800">
                            {/* Nombre */}
                            <div>
                                <label className="block text-sm font-bold text-slate-700 dark:text-slate-200 mb-2">
                                    Nombre de la Plantilla *
                                </label>
                                <input
                                    type="text"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    className="w-full border border-slate-300 dark:border-slate-600 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 outline-none bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500"
                                    placeholder="Ej: Plantilla Corporativa"
                                />
                            </div>

                            {/* Preview del Header */}
                            <div>
                                <label className="block text-sm font-bold text-slate-700 dark:text-slate-200 mb-3">
                                    Vista Previa del Header
                                </label>
                                <div
                                    className="min-h-[140px] rounded-lg flex items-center justify-center relative overflow-hidden shadow-xl border-2 border-slate-300 dark:border-slate-600 bg-gradient-to-r"
                                    style={{
                                        backgroundColor: formData.headerColor
                                            ? `rgb(${formData.headerColor.join(',')})`
                                            : '#1a237e'
                                    }}
                                >
                                    {previewLogo && (
                                        <img
                                            src={previewLogo}
                                            alt="Logo preview"
                                            className={`absolute top-1/2 -translate-y-1/2 z-10 ${formData.logoPosition === 'left' ? 'left-6' :
                                                formData.logoPosition === 'right' ? 'right-6' :
                                                    'left-1/2 -translate-x-1/2'
                                                }`}
                                            style={{
                                                width: `${Math.min(formData.logoSize.width, 60)}px`,
                                                height: `${Math.min(formData.logoSize.height, 60)}px`,
                                                objectFit: 'contain',
                                                filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.2))'
                                            }}
                                        />
                                    )}
                                    <div className={`text-center px-6 py-4 ${previewLogo && formData.logoPosition === 'left' ? 'ml-auto mr-auto' :
                                        previewLogo && formData.logoPosition === 'right' ? 'mr-auto ml-auto' :
                                            ''
                                        }`}
                                        style={{
                                            color: `rgb(${formData.headerTextColor.join(',')})`,
                                            textShadow: '0 1px 2px rgba(0,0,0,0.1)'
                                        }}>
                                        <p className="font-bold mb-1" style={{ fontSize: `${Math.min(formData.headerTextSize, 22)}px` }}>
                                            {formData.headerText}
                                        </p>
                                        <p className="opacity-90" style={{ fontSize: `${Math.min(formData.headerSubtextSize, 12)}px` }}>
                                            {formData.headerSubtext}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Color del Header */}
                            <div>
                                <label className="block text-sm font-bold text-slate-700 dark:text-slate-200 mb-2 flex items-center gap-2">
                                    <Palette size={16} />
                                    Color del Fondo del Header
                                </label>
                                <div className="space-y-3">
                                    <div className="flex items-center gap-3">
                                        <input
                                            type="radio"
                                            id="color-none"
                                            checked={formData.headerColor === null}
                                            onChange={() => handleColorChange('none', null)}
                                            className="w-4 h-4 accent-blue-600"
                                        />
                                        <label htmlFor="color-none" className="cursor-pointer text-slate-700 dark:text-slate-300">
                                            Sin color (Azul por defecto)
                                        </label>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <input
                                            type="radio"
                                            id="color-custom"
                                            checked={formData.headerColor !== null}
                                            onChange={() => handleColorChange('custom', '#1a237e')}
                                            className="w-4 h-4 accent-blue-600"
                                        />
                                        <label htmlFor="color-custom" className="cursor-pointer flex items-center gap-2 text-slate-700 dark:text-slate-300">
                                            Color personalizado:
                                            <input
                                                type="color"
                                                value={getColorHex(formData.headerColor)}
                                                onChange={(e) => handleColorChange('custom', e.target.value)}
                                                className="w-12 h-8 rounded border border-slate-300 dark:border-slate-600 cursor-pointer"
                                            />
                                        </label>
                                    </div>
                                </div>
                            </div>

                            {/* Color del Texto del Header */}
                            <div>
                                <label className="block text-sm font-bold text-slate-700 dark:text-slate-200 mb-2 flex items-center gap-2">
                                    <Palette size={16} />
                                    Color del Texto del Header
                                </label>
                                <div className="flex items-center gap-3">
                                    <input
                                        type="color"
                                        value={`#${formData.headerTextColor[0].toString(16).padStart(2, '0')}${formData.headerTextColor[1].toString(16).padStart(2, '0')}${formData.headerTextColor[2].toString(16).padStart(2, '0')}`}
                                        onChange={(e) => {
                                            const hex = e.target.value.replace('#', '');
                                            const r = parseInt(hex.substring(0, 2), 16);
                                            const g = parseInt(hex.substring(2, 4), 16);
                                            const b = parseInt(hex.substring(4, 6), 16);
                                            setFormData({ ...formData, headerTextColor: [r, g, b] });
                                        }}
                                        className="w-16 h-10 rounded border border-slate-300 dark:border-slate-600 cursor-pointer"
                                    />
                                    <span className="text-sm text-slate-600 dark:text-slate-300">
                                        RGB({formData.headerTextColor.join(', ')})
                                    </span>
                                </div>
                                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                                    Color del texto del título y subtítulo en el header
                                </p>
                            </div>

                            {/* Tamaño del Texto del Header */}
                            <div>
                                <label className="block text-sm font-bold text-slate-700 dark:text-slate-200 mb-2">
                                    Tamaño de las Letras del Header
                                </label>
                                <div className="space-y-4">
                                    {/* Tamaño del Título */}
                                    <div>
                                        <div className="flex justify-between items-center mb-2">
                                            <span className="text-sm text-slate-600 dark:text-slate-300">Título: {formData.headerTextSize} pt</span>
                                            <span className="text-xs text-slate-400 dark:text-slate-500">8-36 pt</span>
                                        </div>
                                        <input
                                            type="range"
                                            min="8"
                                            max="36"
                                            value={formData.headerTextSize}
                                            onChange={(e) => setFormData({
                                                ...formData,
                                                headerTextSize: parseInt(e.target.value)
                                            })}
                                            className="w-full accent-blue-600"
                                        />
                                        <input
                                            type="number"
                                            min="8"
                                            max="36"
                                            value={formData.headerTextSize}
                                            onChange={(e) => setFormData({
                                                ...formData,
                                                headerTextSize: parseInt(e.target.value) || 18
                                            })}
                                            className="w-full mt-2 border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500"
                                        />
                                    </div>

                                    {/* Tamaño del Subtítulo */}
                                    <div>
                                        <div className="flex justify-between items-center mb-2">
                                            <span className="text-sm text-slate-600 dark:text-slate-300">Subtítulo: {formData.headerSubtextSize} pt</span>
                                            <span className="text-xs text-slate-400 dark:text-slate-500">6-24 pt</span>
                                        </div>
                                        <input
                                            type="range"
                                            min="6"
                                            max="24"
                                            value={formData.headerSubtextSize}
                                            onChange={(e) => setFormData({
                                                ...formData,
                                                headerSubtextSize: parseInt(e.target.value)
                                            })}
                                            className="w-full accent-blue-600"
                                        />
                                        <input
                                            type="number"
                                            min="6"
                                            max="24"
                                            value={formData.headerSubtextSize}
                                            onChange={(e) => setFormData({
                                                ...formData,
                                                headerSubtextSize: parseInt(e.target.value) || 9
                                            })}
                                            className="w-full mt-2 border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500"
                                        />
                                    </div>
                                </div>
                                <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
                                    Ajusta el tamaño de fuente del título y subtítulo del header
                                </p>
                            </div>

                            {/* Logo */}
                            <div>
                                <label className="block text-sm font-bold text-slate-700 dark:text-slate-200 mb-2 flex items-center gap-2">
                                    <ImageIcon size={16} />
                                    Logo / Membrete
                                </label>
                                <div className="space-y-3">
                                    {previewLogo ? (
                                        <div className="space-y-3">
                                            <div className="flex items-center gap-4">
                                                <div className="relative">
                                                    <img
                                                        ref={imageRef}
                                                        src={previewLogo}
                                                        alt="Logo preview"
                                                        className="w-32 h-32 object-contain border-2 border-slate-200 dark:border-slate-600 rounded-lg p-2 bg-slate-50 dark:bg-slate-700"
                                                        style={{
                                                            backgroundImage: 'linear-gradient(45deg, #ccc 25%, transparent 25%), linear-gradient(-45deg, #ccc 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #ccc 75%), linear-gradient(-45deg, transparent 75%, #ccc 75%)',
                                                            backgroundSize: '20px 20px',
                                                            backgroundPosition: '0 0, 0 10px, 10px -10px, -10px 0px'
                                                        }}
                                                    />
                                                </div>
                                                <div className="flex flex-col gap-2">
                                                    <button
                                                        onClick={() => setShowImageEditor(!showImageEditor)}
                                                        className="px-4 py-2 bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 rounded-lg hover:bg-blue-200 dark:hover:bg-blue-900/50 transition flex items-center gap-2"
                                                    >
                                                        <Wand2 size={16} />
                                                        Editar Logo
                                                    </button>
                                                    <button
                                                        onClick={() => {
                                                            setFormData({ ...formData, logoUrl: null });
                                                            setPreviewLogo(null);
                                                        }}
                                                        className="px-4 py-2 bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300 rounded-lg hover:bg-red-200 dark:hover:bg-red-900/50 transition"
                                                    >
                                                        Eliminar Logo
                                                    </button>
                                                </div>
                                            </div>

                                            {/* Editor de Imagen */}
                                            {showImageEditor && (
                                                <div className="p-4 bg-slate-50 dark:bg-slate-700/50 rounded-lg border border-slate-200 dark:border-slate-600 space-y-4">
                                                    <h4 className="font-bold text-slate-700 dark:text-slate-200 flex items-center gap-2">
                                                        <Wand2 size={16} />
                                                        Editor de Logo
                                                    </h4>

                                                    {/* Quitar Fondo */}
                                                    <div className="space-y-2">
                                                        <label className="block text-sm font-medium text-slate-600 dark:text-slate-300">
                                                            Quitar Fondo
                                                        </label>
                                                        <div className="flex items-center gap-3">
                                                            <label className="text-xs text-slate-500 dark:text-slate-400">Color a remover:</label>
                                                            <input
                                                                type="color"
                                                                value={removeBgColor}
                                                                onChange={(e) => setRemoveBgColor(e.target.value)}
                                                                className="w-16 h-8 rounded border border-slate-300 dark:border-slate-600 cursor-pointer"
                                                            />
                                                            <input
                                                                type="range"
                                                                min="0"
                                                                max="100"
                                                                value={removeBgTolerance}
                                                                onChange={(e) => setRemoveBgTolerance(parseInt(e.target.value))}
                                                                className="flex-1"
                                                            />
                                                            <span className="text-xs text-slate-500 w-12">{removeBgTolerance}%</span>
                                                        </div>
                                                        <button
                                                            onClick={removeBackground}
                                                            className="w-full px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition flex items-center justify-center gap-2"
                                                        >
                                                            <Wand2 size={16} />
                                                            Remover Fondo
                                                        </button>
                                                        <p className="text-xs text-slate-500">
                                                            Selecciona el color del fondo y ajusta la tolerancia. Mayor tolerancia = más píxeles removidos.
                                                        </p>
                                                    </div>
                                                    <canvas ref={canvasRef} className="hidden" />
                                                </div>
                                            )}
                                        </div>
                                    ) : (
                                        <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-slate-300 rounded-lg cursor-pointer hover:bg-slate-50 transition">
                                            <Upload size={24} className="text-slate-400 mb-2" />
                                            <span className="text-sm text-slate-600">Haz clic para subir logo</span>
                                            <span className="text-xs text-slate-400 mt-1">PNG, JPG (máx. 2MB)</span>
                                            <input
                                                type="file"
                                                accept="image/*"
                                                onChange={handleImageUpload}
                                                className="hidden"
                                            />
                                        </label>
                                    )}
                                </div>
                            </div>

                            {/* Ubicación del Logo */}
                            {previewLogo && (
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-2 flex items-center gap-2">
                                        <Move size={16} />
                                        Ubicación del Logo en el Header
                                    </label>
                                    <div className="grid grid-cols-3 gap-3">
                                        {['left', 'center', 'right'].map((position) => (
                                            <button
                                                key={position}
                                                onClick={() => setFormData({ ...formData, logoPosition: position })}
                                                className={`p-4 border-2 rounded-lg transition-all flex flex-col items-center gap-2 ${formData.logoPosition === position
                                                    ? 'border-blue-600 bg-blue-50 text-blue-700'
                                                    : 'border-slate-200 hover:border-slate-300 text-slate-600'
                                                    }`}
                                            >
                                                <div className={`w-12 h-12 border-2 rounded flex items-center justify-center ${formData.logoPosition === position
                                                    ? 'border-blue-600'
                                                    : 'border-slate-300'
                                                    }`}>
                                                    {position === 'left' && (
                                                        <div className="w-6 h-6 bg-current rounded ml-0" />
                                                    )}
                                                    {position === 'center' && (
                                                        <div className="w-6 h-6 bg-current rounded mx-auto" />
                                                    )}
                                                    {position === 'right' && (
                                                        <div className="w-6 h-6 bg-current rounded mr-0 ml-auto" />
                                                    )}
                                                </div>
                                                <span className="text-xs font-medium capitalize">
                                                    {position === 'left' ? 'Izquierda' : position === 'center' ? 'Centro' : 'Derecha'}
                                                </span>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Tamaño del Logo */}
                            {previewLogo && (
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-2 flex items-center gap-2">
                                        <Maximize2 size={16} />
                                        Tamaño del Logo
                                    </label>
                                    <div className="space-y-4">
                                        <div>
                                            <div className="flex justify-between items-center mb-2">
                                                <span className="text-sm text-slate-600">Ancho: {formData.logoSize.width} mm</span>
                                                <span className="text-xs text-slate-400">10-200 mm</span>
                                            </div>
                                            <input
                                                type="range"
                                                min="10"
                                                max="200"
                                                value={formData.logoSize.width}
                                                onChange={(e) => setFormData({
                                                    ...formData,
                                                    logoSize: { ...formData.logoSize, width: parseInt(e.target.value) }
                                                })}
                                                className="w-full"
                                            />
                                        </div>
                                        <div>
                                            <div className="flex justify-between items-center mb-2">
                                                <span className="text-sm text-slate-600">Alto: {formData.logoSize.height} mm</span>
                                                <span className="text-xs text-slate-400">10-200 mm</span>
                                            </div>
                                            <input
                                                type="range"
                                                min="10"
                                                max="200"
                                                value={formData.logoSize.height}
                                                onChange={(e) => setFormData({
                                                    ...formData,
                                                    logoSize: { ...formData.logoSize, height: parseInt(e.target.value) }
                                                })}
                                                className="w-full"
                                            />
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1">Ancho (mm)</label>
                                                <input
                                                    type="number"
                                                    min="10"
                                                    max="200"
                                                    value={formData.logoSize.width}
                                                    onChange={(e) => setFormData({
                                                        ...formData,
                                                        logoSize: { ...formData.logoSize, width: parseInt(e.target.value) || 40 }
                                                    })}
                                                    className="w-full border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1">Alto (mm)</label>
                                                <input
                                                    type="number"
                                                    min="10"
                                                    max="200"
                                                    value={formData.logoSize.height}
                                                    onChange={(e) => setFormData({
                                                        ...formData,
                                                        logoSize: { ...formData.logoSize, height: parseInt(e.target.value) || 40 }
                                                    })}
                                                    className="w-full border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Textos del Header */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 dark:text-slate-200 mb-2">
                                        Título Principal
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.headerText}
                                        onChange={(e) => setFormData({ ...formData, headerText: e.target.value })}
                                        className="w-full border border-slate-300 dark:border-slate-600 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 outline-none bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 dark:text-slate-200 mb-2">
                                        Subtítulo
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.headerSubtext}
                                        onChange={(e) => setFormData({ ...formData, headerSubtext: e.target.value })}
                                        className="w-full border border-slate-300 dark:border-slate-600 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 outline-none bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500"
                                    />
                                </div>
                            </div>

                            {/* Texto del Footer */}
                            <div>
                                <label className="block text-sm font-bold text-slate-700 dark:text-slate-200 mb-2">
                                    Texto del Footer (opcional)
                                </label>
                                <input
                                    type="text"
                                    value={formData.footerText}
                                    onChange={(e) => setFormData({ ...formData, footerText: e.target.value })}
                                    className="w-full border border-slate-300 dark:border-slate-600 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 outline-none bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500"
                                    placeholder="Ej: Generado con PresuGenius Pro - www.presugenius.com"
                                />
                                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                                    Este texto aparecerá en la parte inferior de cada página del PDF
                                </p>
                            </div>

                            {/* Activar Plantilla */}
                            <div className="flex items-center gap-3 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                                <input
                                    type="checkbox"
                                    id="isActive"
                                    checked={formData.isActive}
                                    onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                                    className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500 accent-blue-600"
                                />
                                <label htmlFor="isActive" className="cursor-pointer flex-1">
                                    <span className="font-bold text-slate-800 dark:text-blue-100">Usar esta plantilla por defecto</span>
                                    <p className="text-sm text-slate-600 dark:text-blue-300/80">
                                        Los nuevos presupuestos usarán esta plantilla automáticamente
                                    </p>
                                </label>
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="p-4 bg-slate-50 dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 flex justify-end gap-3">
                            <button
                                onClick={handleCloseModal}
                                className="px-4 py-2 text-slate-600 hover:bg-slate-200 rounded-lg font-medium transition"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleSave}
                                className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold shadow-lg shadow-blue-200 transition flex items-center gap-2"
                            >
                                <Save size={18} />
                                Guardar Plantilla
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* PDF Preview Modal */}
            {showPDFPreview && previewTemplate && (() => {
                const exampleProjectInfo = {
                    project: 'Ejemplo de Proyecto',
                    client: 'Cliente de Ejemplo',
                    location: 'Ciudad de México',
                    taxRate: 16,
                    indirect_percentage: 10,
                    profit_percentage: 15
                };

                const exampleItems = [
                    {
                        id: '1',
                        description: 'Excavación manual en terreno tipo I',
                        unit: 'm3',
                        quantity: 50,
                        unitPrice: 120,
                        category: 'Obra Civil'
                    },
                    {
                        id: '2',
                        description: 'Mampostería de tabique rojo recocido',
                        unit: 'm2',
                        quantity: 100,
                        unitPrice: 350,
                        category: 'Obra Civil'
                    },
                    {
                        id: '3',
                        description: 'Aplanado de cemento-arena',
                        unit: 'm2',
                        quantity: 100,
                        unitPrice: 85,
                        category: 'Obra Civil'
                    },
                    {
                        id: '4',
                        description: 'Pintura vinílica en muros',
                        unit: 'm2',
                        quantity: 150,
                        unitPrice: 45,
                        category: 'Materiales'
                    },
                    {
                        id: '5',
                        description: 'Instalación eléctrica básica',
                        unit: 'pza',
                        quantity: 1,
                        unitPrice: 15000,
                        category: 'Instalaciones'
                    }
                ];

                const calc = CalculationsService.calculateTotal(exampleItems, {
                    indirectPercentage: exampleProjectInfo.indirect_percentage,
                    profitPercentage: exampleProjectInfo.profit_percentage,
                    taxRate: exampleProjectInfo.taxRate
                });

                return (
                    <PDFPreviewModal
                        isOpen={showPDFPreview}
                        onClose={handleClosePreview}
                        onDownload={async () => {
                            try {
                                const doc = new jsPDF();
                                await PDFService.generateBudgetPDF(doc, {
                                    projectInfo: exampleProjectInfo,
                                    items: exampleItems,
                                    subtotal: calc.subtotal,
                                    indirectCosts: calc.indirectCosts,
                                    profit: calc.profit,
                                    tax: calc.tax,
                                    total: calc.total,
                                    technicalDescription: 'Este es un ejemplo de vista previa de la plantilla. El presupuesto real utilizará los datos de tu proyecto.'
                                });
                                doc.save(`Vista_Previa_${previewTemplate.name.replace(/\s+/g, '_')}.pdf`);
                                showToast('PDF descargado', 'success');
                            } catch (error) {
                                console.error('Error downloading preview:', error);
                                showToast('Error al descargar el PDF', 'error');
                            }
                        }}
                        projectInfo={exampleProjectInfo}
                        items={exampleItems}
                        calculations={calc}
                        technicalDescription="Este es un ejemplo de vista previa de la plantilla. El presupuesto real utilizará los datos de tu proyecto."
                    />
                );
            })()}
        </div>
    );
};

export default PDFTemplatesPage;

