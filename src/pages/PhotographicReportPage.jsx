import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Camera, Save, Plus, Trash2, Check, Upload, X, Image as ImageIcon, Images, LayoutGrid, Eye, FileText, ExternalLink, Loader2, ChevronDown } from 'lucide-react';
import BitacoraService from '../services/BitacoraService';
import ImageUploadService from '../services/ImageUploadService';
import ProjectPersistenceService from '../services/ProjectPersistenceService';
import PDFReportService from '../services/PDFReportService';
import AlertModal from '../components/ui/AlertModal';
import { useSubscription } from '../context/SubscriptionContext';
import { useProject } from '../context/ProjectContext';
import LimitModal from '../components/subscription/LimitModal';

// Texto que se guarda en el log: descripción del bloque + descripciones por foto
const buildLogContent = (entry, conceptName) => {
    const baseContent = entry.description || `Reporte fotográfico: ${conceptName}`;
    const photoCaptions = Array.isArray(entry.photoCaptions) ? entry.photoCaptions : [];
    return baseContent + '\n\n<!--PHOTO_CAPTIONS:' + JSON.stringify(photoCaptions) + '-->';
};

const PhotographicReportPage = () => {
    const { projectId, logId } = useParams();
    const navigate = useNavigate();
    const isFreeMode = !projectId;
    const { checkLimit, incrementUsage, isPro } = useSubscription();
    const { showToast } = useProject();
    const [reportDate, setReportDate] = useState(new Date().toISOString().split('T')[0]);
    const [entries, setEntries] = useState([]);
    const [uploading, setUploading] = useState(false);
    const [items, setItems] = useState([]);
    const [projectInfo, setProjectInfo] = useState(null);
    const [resolvedProjectId, setResolvedProjectId] = useState(projectId || null);
    const [loading, setLoading] = useState(true);
    const [editingLog, setEditingLog] = useState(null);
    const [alertModal, setAlertModal] = useState({ isOpen: false, title: '', message: '', type: 'info' });
    const [limitModal, setLimitModal] = useState({
        isOpen: false,
        actionType: null,
        usage: 0,
        limit: 0
    });

    // Estados para campos editables del encabezado
    const [headerData, setHeaderData] = useState({
        companyName: '',
        companyRfc: '',
        companyExtra: '',
        contractor: '',
        contractNumber: '',
        obra: '',
        concepts: '',
        ubicacion: ''
    });

    // Diseño del PDF: logo del membrete, columnas de la cuadrícula y ajuste de las fotos
    const [pdfLayout, setPdfLayout] = useState({
        logoUrl: '',
        gridCols: 3,
        photoFit: 'auto'
    });
    const [uploadingLogo, setUploadingLogo] = useState(false);
    const [pdfPreviewUrl, setPdfPreviewUrl] = useState(null);
    const [generatingPreview, setGeneratingPreview] = useState(false);

    // Carga masiva: se eligen muchas fotos de una vez y luego se decide cómo repartirlas
    const [bulkPhotos, setBulkPhotos] = useState(null);      // { files, previewUrls, failed }
    const [preparingBulk, setPreparingBulk] = useState(null); // { done, total }
    const [photosPerBlock, setPhotosPerBlock] = useState(1);

    // En celular el formulario de datos va plegado: en obra lo que importa
    // son las fotos, y el membrete normalmente ya viene guardado del proyecto.
    const [showHeaderData, setShowHeaderData] = useState(
        () => typeof window === 'undefined' || window.innerWidth >= 768
    );

    // Estados para campos editables de las firmas
    const [signatureData, setSignatureData] = useState({
        contractorTitle: 'EL CONTRATISTA',
        contractorName: '',
        contractorRole: 'ADMINISTRADOR ÚNICO',
        municipalityTitle: 'H. AYUNTAMIENTO',
        supervisorName: '',
        supervisorRole: 'DIRECTOR DE OBRAS PÚBLICAS'
    });

    // Cargar datos del proyecto y log si se está editando
    useEffect(() => {
        setResolvedProjectId(projectId || null);
    }, [projectId]);

    useEffect(() => {
        const loadData = async () => {
            try {
                setLoading(true);

                if (!projectId) {
                    setItems([]);
                    setProjectInfo({});
                    setHeaderData(prev => ({
                        ...prev,
                        contractNumber: 'S/N'
                    }));
                    setSignatureData(prev => ({
                        ...prev,
                        contractorTitle: 'EL CONTRATISTA',
                        contractorRole: 'ADMINISTRADOR ÚNICO',
                        municipalityTitle: 'H. AYUNTAMIENTO',
                        supervisorRole: 'DIRECTOR DE OBRAS PÚBLICAS'
                    }));
                    return;
                }

                // Cargar items del proyecto
                const projectData = await ProjectPersistenceService.loadProject(projectId);
                if (import.meta.env.DEV) {
                    console.debug('[Reporte] CARGAR - projectId:', projectId, 'projectData recibido:', {
                        hasProjectInfo: !!projectData?.projectInfo,
                        contractor: projectData?.projectInfo?.contractor ?? projectData?.contractor,
                        obra: projectData?.projectInfo?.project ?? projectData?.project,
                        concepts: projectData?.projectInfo?.concepts ?? projectData?.concepts,
                        ubicacion: projectData?.projectInfo?.ubicacion ?? projectData?.ubicacion,
                        lastReportDate: projectData?.projectInfo?.lastReportDate ?? projectData?.lastReportDate,
                    })
                }
                setItems(projectData?.items || []);
                // projectInfo puede estar en data.projectInfo o en la raíz; priorizar projectInfo
                const loadedProjectInfo = { ...projectData, ...(projectData?.projectInfo || {}) };
                setProjectInfo(loadedProjectInfo);

                // Inicializar datos del encabezado (cargar lo guardado en la base)
                const header = {
                    companyName: loadedProjectInfo.companyName || loadedProjectInfo.contractor || loadedProjectInfo.client || '',
                    companyRfc: loadedProjectInfo.companyRfc || '',
                    companyExtra: loadedProjectInfo.companyExtra || '',
                    contractor: loadedProjectInfo.contractor || loadedProjectInfo.client || '',
                    contractNumber: loadedProjectInfo.contractNumber || 'S/N',
                    obra: loadedProjectInfo.project || loadedProjectInfo.name || '',
                    concepts: loadedProjectInfo.concepts ?? '',
                    ubicacion: loadedProjectInfo.ubicacion || loadedProjectInfo.location || ''
                };
                if (import.meta.env.DEV) console.debug('[Reporte] CARGAR - setHeaderData:', header)
                setHeaderData(header);

                // Diseño del PDF guardado con el proyecto
                setPdfLayout({
                    logoUrl: loadedProjectInfo.logoUrl || '',
                    gridCols: Number(loadedProjectInfo.photoGridCols) || 3,
                    photoFit: loadedProjectInfo.photoFit || 'auto'
                });

                // Inicializar datos de las firmas
                setSignatureData({
                    contractorTitle: loadedProjectInfo.contractorTitle || 'EL CONTRATISTA',
                    contractorName: loadedProjectInfo.contractor || loadedProjectInfo.client || '',
                    contractorRole: loadedProjectInfo.contractorRole || 'ADMINISTRADOR ÚNICO',
                    municipalityTitle: loadedProjectInfo.municipalityTitle || 'H. AYUNTAMIENTO',
                    supervisorName: loadedProjectInfo.supervisorName || '',
                    supervisorRole: loadedProjectInfo.supervisorRole || 'DIRECTOR DE OBRAS PÚBLICAS'
                });

                // Fecha: si no estamos editando un log, usar la última fecha guardada
                if (!logId && loadedProjectInfo.lastReportDate) {
                    setReportDate(loadedProjectInfo.lastReportDate);
                }

                // Si hay logId, cargar el log para editar
                if (logId) {
                    const logs = await BitacoraService.loadLogs(projectId);
                    const log = logs.find(l => l.id === logId);

                    if (log) {
                        setEditingLog(log);
                        const logDate = log.log_date ? new Date(log.log_date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0];
                        setReportDate(logDate);

                        // Extraer nombre del concepto del subject
                        const conceptName = log.subject?.replace('Reporte Fotográfico: ', '') || 'Concepto';

                        // Buscar el item correspondiente
                        const item = projectData?.items?.find(i =>
                            i.description === conceptName ||
                            i.id?.toString() === log.task_id
                        );

                        // Concepto general y descripciones opcionales por foto (no se repite el concepto bajo cada foto en PDF)
                        const { cleanContent, photoCaptions: savedCaptions } = PDFReportService.parsePhotoReportContent(log.content || '');
                        const numPhotos = (log.photos || []).length;
                        const photoCaptions = Array.from({ length: numPhotos }, (_, i) => savedCaptions[i] ?? '');
                        const entry = {
                            id: Date.now(),
                            logId: log.id,
                            itemId: item?.id || log.task_id,
                            itemName: conceptName,
                            itemCode: item?.code || '',
                            photos: [],
                            previewUrls: log.photos || [],
                            photoUrls: log.photos || [],
                            photoCaptions,
                            description: cleanContent || log.content || '',
                            progress: log.progress_percentage || 100,
                            isCompleted: log.progress_percentage === 100
                        };

                        setEntries([entry]);
                    }
                }
            } catch (error) {
                console.error('[Reporte] Error al cargar datos:', error);
            } finally {
                setLoading(false);
            }
        };

        loadData();
    }, [projectId, logId]);

    // Limpiar previews SOLO al salir de la página.
    // Se usa una ref porque con [entries] la limpieza corría en cada cambio y
    // liberaba blobs de fotos que seguían en pantalla (miniaturas rotas).
    const entriesRef = useRef(entries);
    entriesRef.current = entries;

    useEffect(() => {
        return () => {
            entriesRef.current.forEach(entry => {
                (entry.previewUrls || []).forEach(url => {
                    if (typeof url === 'string' && url.startsWith('blob:')) {
                        ImageUploadService.revokePreviewUrl(url);
                    }
                });
            });
        };
    }, []);

    // Liberar la vista previa del PDF al salir
    useEffect(() => {
        return () => {
            if (pdfPreviewUrl) URL.revokeObjectURL(pdfPreviewUrl);
        };
    }, [pdfPreviewUrl]);

    const handleAddBlock = () => {
        setEntries([...entries, {
            id: Date.now(),
            itemId: 'block-' + Date.now(),
            itemName: '',
            itemCode: '',
            photos: [],
            previewUrls: [],
            photoUrls: [],
            photoCaptions: [],
            description: '',
            progress: 100,
            isCompleted: true
        }]);
    };

    const handleRemoveEntry = (entryId) => {
        const entry = entries.find(e => e.id === entryId);
        if (entry) {
            entry.previewUrls.forEach(url => {
                if (url.startsWith('blob:')) {
                    ImageUploadService.revokePreviewUrl(url);
                }
            });
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
                    setAlertModal({
                        isOpen: true,
                        title: 'Error de validación',
                        message: `Error en ${file.name}: ${error.message}`,
                        type: 'error'
                    });
                }
            }

            setEntries(currentEntries => currentEntries.map(entry => {
                if (entry.id === entryId) {
                    const currentCaptions = entry.photoCaptions || [];
                    const newCaptions = new Array(newPreviewUrls.length).fill('');
                    return {
                        ...entry,
                        photos: [...entry.photos, ...validFiles],
                        previewUrls: [...entry.previewUrls, ...newPreviewUrls],
                        photoCaptions: [...currentCaptions, ...newCaptions]
                    };
                }
                return entry;
            }));
        })();
    };

    // Carga masiva: prepara todas las fotos elegidas y luego pregunta cómo repartirlas
    const handleBulkFileChange = async (e) => {
        const selectedFiles = Array.from(e.target.files || []);
        e.target.value = '';
        if (selectedFiles.length === 0) return;

        setPreparingBulk({ done: 0, total: selectedFiles.length });
        const files = [];
        const previewUrls = [];
        const failed = [];

        for (const file of selectedFiles) {
            try {
                const optimized = await ImageUploadService.prepareImageForApp(file);
                files.push(optimized.file);
                previewUrls.push(ImageUploadService.createPreviewUrl(optimized.file));
            } catch (error) {
                console.error('[Reporte] Error preparando foto:', file.name, error);
                failed.push(file.name);
            }
            setPreparingBulk(prev => (prev ? { ...prev, done: prev.done + 1 } : prev));
        }

        setPreparingBulk(null);

        if (files.length === 0) {
            setAlertModal({
                isOpen: true,
                title: 'No se pudo usar ninguna foto',
                message: 'Revisa que sean imágenes JPG, PNG o WEBP de menos de 25 MB.',
                type: 'error'
            });
            return;
        }

        setPhotosPerBlock(1);
        setBulkPhotos({ files, previewUrls, failed });
    };

    // Reparte las fotos cargadas en bloques de "perBlock" fotos cada uno
    const applyBulkPhotos = (perBlock) => {
        if (!bulkPhotos) return;

        const size = Math.max(1, Math.min(perBlock, bulkPhotos.files.length));
        const baseId = Date.now();
        const newEntries = [];

        for (let i = 0; i < bulkPhotos.files.length; i += size) {
            const blockId = baseId + i;
            const chunkFiles = bulkPhotos.files.slice(i, i + size);
            newEntries.push({
                id: blockId,
                itemId: 'block-' + blockId,
                itemName: '',
                itemCode: '',
                photos: chunkFiles,
                previewUrls: bulkPhotos.previewUrls.slice(i, i + size),
                photoUrls: [],
                photoCaptions: chunkFiles.map(() => ''),
                description: '',
                progress: 100,
                isCompleted: true
            });
        }

        setEntries(prev => [...prev, ...newEntries]);
        setBulkPhotos(null);

        if (bulkPhotos.failed.length > 0) {
            setAlertModal({
                isOpen: true,
                title: 'Algunas fotos no se pudieron usar',
                message: `Se agregaron ${bulkPhotos.files.length} fotos. No se pudieron leer: ${bulkPhotos.failed.join(', ')}`,
                type: 'warning'
            });
        }
    };

    const cancelBulkPhotos = () => {
        if (!bulkPhotos) return;
        bulkPhotos.previewUrls.forEach(url => ImageUploadService.revokePreviewUrl(url));
        setBulkPhotos(null);
    };

    // Logo del membrete: se comprime y se sube igual que las fotos
    const handleLogoChange = async (e) => {
        const file = e.target.files?.[0];
        e.target.value = '';
        if (!file) return;

        setUploadingLogo(true);
        try {
            const url = await ImageUploadService.uploadImage(file, resolvedProjectId, 'logo', { isPro });
            setPdfLayout(prev => ({ ...prev, logoUrl: url }));
        } catch (error) {
            setAlertModal({
                isOpen: true,
                title: 'No se pudo subir el logo',
                message: error.message,
                type: 'error'
            });
        } finally {
            setUploadingLogo(false);
        }
    };

    const updateEntry = (entryId, field, value) => {
        setEntries(entries.map(entry => {
            if (entry.id === entryId) {
                return { ...entry, [field]: value };
            }
            return entry;
        }));
    };

    // Actualizar varios campos de una entrada a la vez (útil para eliminar fotos sin estados intermedios)
    const updateEntryFields = (entryId, updates) => {
        setEntries(entries.map(entry =>
            entry.id === entryId ? { ...entry, ...updates } : entry
        ));
    };

    // Datos del membrete/diseño que consume el PDF, tomados de lo que hay en pantalla
    const buildProjectInfoForPdf = () => {
        const projectName = (headerData.obra || projectInfo?.project || projectInfo?.name || 'Sin nombre').trim() || 'Sin nombre';
        return {
            ...projectInfo,
            // Datos del membrete para el PDF fotográfico
            companyName: headerData.companyName || headerData.contractor || projectInfo?.companyName || '',
            companyRfc: headerData.companyRfc || projectInfo?.companyRfc || '',
            companyExtra: headerData.companyExtra || projectInfo?.companyExtra || '',
            contractor: headerData.contractor,
            contractNumber: headerData.contractNumber ?? 'S/N',
            project: projectName,
            name: projectName,
            concepts: headerData.concepts,
            ubicacion: headerData.ubicacion,
            lastReportDate: reportDate,
            // Diseño del PDF (lo usa también la exportación desde Bitácora)
            logoUrl: pdfLayout.logoUrl || '',
            photoGridCols: pdfLayout.gridCols,
            photoFit: pdfLayout.photoFit,
            contractorTitle: signatureData.contractorTitle,
            contractorName: signatureData.contractorName,
            contractorRole: signatureData.contractorRole,
            municipalityTitle: signatureData.municipalityTitle,
            supervisorName: signatureData.supervisorName,
            supervisorRole: signatureData.supervisorRole
        };
    };

    // Nombre del concepto y título tal como se guardarán en el log
    const getEntryNaming = (entry) => {
        const conceptNameFromBlock = (entry.itemName || '').trim() || '';
        const conceptName =
            (headerData.concepts || '').trim() ||
            conceptNameFromBlock ||
            'Concepto sin nombre';
        const reportTitle = (headerData.obra || headerData.concepts || conceptName).trim() || 'Reporte fotográfico';
        return { conceptName, reportTitle };
    };

    // Vista previa: arma el PDF con las fotos que están en pantalla, sin guardar nada
    const handlePreview = async () => {
        if (entries.length === 0) return;

        setGeneratingPreview(true);
        try {
            const pdfProjectInfo = buildProjectInfoForPdf();

            // Logs "de mentiras" con las fotos actuales (subidas o aún locales)
            const previewLogs = entries.map((entry, index) => {
                const { conceptName, reportTitle } = getEntryNaming(entry);
                return {
                    id: `preview-${index}`,
                    subject: `Reporte Fotográfico: ${reportTitle}`,
                    content: buildLogContent(entry, conceptName),
                    photos: entry.previewUrls || [],
                    progress_percentage: entry.isCompleted ? 100 : entry.progress,
                    log_date: reportDate
                };
            });

            const blob = await PDFReportService.generatePhotographicReportPreview(
                pdfProjectInfo,
                previewLogs,
                reportDate,
                {
                    concepts: (headerData.concepts || '').trim() || undefined,
                    obra: pdfProjectInfo.project,
                    gridCols: pdfLayout.gridCols,
                    photoFit: pdfLayout.photoFit,
                    logoUrl: pdfLayout.logoUrl || undefined
                }
            );

            if (pdfPreviewUrl) URL.revokeObjectURL(pdfPreviewUrl);
            setPdfPreviewUrl(URL.createObjectURL(blob));
        } catch (error) {
            console.error('[Reporte] Error al generar la vista previa:', error);
            setAlertModal({
                isOpen: true,
                title: 'No se pudo generar la vista previa',
                message: error.message,
                type: 'error'
            });
        } finally {
            setGeneratingPreview(false);
        }
    };

    const closePreview = () => {
        if (pdfPreviewUrl) URL.revokeObjectURL(pdfPreviewUrl);
        setPdfPreviewUrl(null);
    };

    const handleSave = async () => {
        if (entries.length === 0) {
            setAlertModal({
                isOpen: true,
                title: 'Reporte vacío',
                message: 'Agrega al menos un bloque (fotos y concepto).',
                type: 'warning'
            });
            return;
        }

        setUploading(true);
        if (import.meta.env.DEV) {
            console.debug('[Reporte] GUARDAR - projectId:', projectId, 'estado del formulario:', {
                headerData: { ...headerData },
                reportDate,
            })
        }
        try {
            let targetProjectId = resolvedProjectId || projectId;

            // Guardar encabezado, ubicación, fecha y firmas en projectInfo para que persistan al reabrir/editar
            const updatedProjectInfo = buildProjectInfoForPdf();
            const projectName = updatedProjectInfo.project;

            if (!targetProjectId) {
                const createdProject = await ProjectPersistenceService.saveProject({
                    projectInfo: {
                        project: projectName,
                        client: headerData.contractor || '',
                        contractor: headerData.contractor || '',
                        contractNumber: headerData.contractNumber ?? 'S/N',
                        location: headerData.ubicacion || 'México',
                        ubicacion: headerData.ubicacion || 'México',
                        type: projectInfo?.type || 'General',
                        concepts: headerData.concepts || '',
                        companyName: updatedProjectInfo.companyName || '',
                        companyRfc: updatedProjectInfo.companyRfc || '',
                        companyExtra: updatedProjectInfo.companyExtra || '',
                        logoUrl: pdfLayout.logoUrl || '',
                        photoGridCols: pdfLayout.gridCols,
                        photoFit: pdfLayout.photoFit,
                        lastReportDate: reportDate,
                        contractorTitle: signatureData.contractorTitle,
                        contractorName: signatureData.contractorName,
                        contractorRole: signatureData.contractorRole,
                        municipalityTitle: signatureData.municipalityTitle,
                        supervisorName: signatureData.supervisorName,
                        supervisorRole: signatureData.supervisorRole
                    },
                    items: [],
                    scheduleData: null,
                    materialList: [],
                    materialAssumptions: []
                });

                targetProjectId = createdProject.id;
                setResolvedProjectId(targetProjectId);
                setProjectInfo(updatedProjectInfo);
            }

            // Actualizar projectInfo en el proyecto (encabezado, conceptos, firma). Si falla, avisar al usuario.
            if (import.meta.env.DEV) {
                console.debug('[Reporte] GUARDAR - projectId:', targetProjectId, 'updatedProjectInfo a persistir:', {
                    contractor: updatedProjectInfo.contractor,
                    project: updatedProjectInfo.project,
                    concepts: updatedProjectInfo.concepts,
                    ubicacion: updatedProjectInfo.ubicacion,
                    lastReportDate: updatedProjectInfo.lastReportDate,
                })
            }
            try {
                const projectData = await ProjectPersistenceService.loadProject(targetProjectId);
                const updatedProjectData = {
                    ...projectData,
                    projectInfo: updatedProjectInfo
                };
                await ProjectPersistenceService.saveProject(updatedProjectData);
                if (import.meta.env.DEV) console.debug('[Reporte] GUARDAR - projectId:', targetProjectId, 'projectInfo guardado OK');
            } catch (err) {
                console.error('[Reporte] Error al guardar encabezado/firmas:', err);
                setAlertModal({
                    isOpen: true,
                    title: 'No se guardó el encabezado',
                    message: 'Los datos del encabezado (conceptos, ubicación, fecha, firmas) no se pudieron guardar. Comprueba la conexión e intenta de nuevo. Los datos de las fotos sí se guardarán al hacer clic en Guardar.',
                    type: 'warning'
                });
                // No salir: permitir que guarde al menos los logs (fotos) y que reintente
            }

            for (const entry of entries) {
                let newPhotoUrls = [];
                if (entry.photos.length > 0) {
                    newPhotoUrls = await ImageUploadService.uploadMultipleImages(
                        entry.photos,
                        targetProjectId,
                        'report-' + entry.itemId
                    );
                }

                const existingUrls = entry.photoUrls || [];
                const allPhotoUrls = [...existingUrls, ...newPhotoUrls];
                const logDate = new Date(reportDate + 'T12:00:00').toISOString();
                // Nombre del concepto y título del reporte (no mostrar ids internos tipo "block-...")
                // Las descripciones por foto se guardan dentro del contenido y no se repiten bajo cada foto en el PDF
                const { conceptName, reportTitle } = getEntryNaming(entry);
                const contentWithCaptions = buildLogContent(entry, conceptName);

                if (editingLog && entry.logId) {
                    await BitacoraService.updateLog(entry.logId, {
                        content: contentWithCaptions,
                        progressPercentage: entry.isCompleted ? 100 : entry.progress,
                        photos: allPhotoUrls,
                        subject: `Reporte Fotográfico: ${reportTitle}`
                    });
                } else {
                    if (!isPro) {
                        const limitCheck = await checkLimit('photoReports');
                        if (!limitCheck.allowed) {
                            setLimitModal({
                                isOpen: true,
                                actionType: 'photoReports',
                                usage: limitCheck.current,
                                limit: limitCheck.limit
                            });
                            setUploading(false);
                            return;
                        }
                    }

                    await BitacoraService.createLog({
                        projectId: targetProjectId,
                        taskId: entry.itemId.toString(),
                        content: contentWithCaptions,
                        progressPercentage: entry.isCompleted ? 100 : entry.progress,
                        photos: allPhotoUrls,
                        subject: `Reporte Fotográfico: ${reportTitle}`,
                        classification: 'Informe',
                        authorRole: 'Residente',
                        status: 'Abierta',
                        logDate: logDate
                    });

                    // Incrementar contador de uso
                    if (!isPro) {
                        await incrementUsage('photoReports');
                    }
                }
            }

            showToast('Reporte fotográfico guardado correctamente.', 'success');
            navigate(`/project/${targetProjectId}/bitacora`);
        } catch (error) {
            console.error('[Reporte] Error al guardar reporte:', error);
            setAlertModal({
                isOpen: true,
                title: 'Error',
                message: 'Error al guardar el reporte: ' + error.message,
                type: 'error'
            });
        } finally {
            setUploading(false);
        }
    };

    // CONCEPTOS del encabezado es el concepto general que escribe el usuario; NO se deriva de los nombres de bloque (itemName).
    // Se carga desde projectInfo.concepts al abrir la página y se guarda en handleSave. No sobrescribir con entries.

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-4 border-indigo-600 border-t-transparent mx-auto mb-4"></div>
                    <p className="text-slate-600">Cargando...</p>
                </div>
            </div>
        );
    }

    return (
        <>
        <div className="min-h-screen bg-slate-50">
            {/* Header de Navegación */}
            <div className="bg-white border-b border-slate-200 sticky top-0 z-10 shadow-sm">
                <div className="w-full max-w-[1600px] mx-auto px-3 sm:px-6 lg:px-8 py-3 sm:py-4">
                    <div className="flex flex-col xs:flex-row items-stretch xs:items-center justify-between gap-3">
                        <div className="flex items-center gap-2 sm:gap-4 min-w-0">
                            <button
                                type="button"
                                onClick={() => navigate(resolvedProjectId ? `/project/${resolvedProjectId}/bitacora` : '/reports')}
                                className="shrink-0 p-2.5 -ml-2 rounded-xl hover:bg-slate-100 transition touch-manipulation"
                                title={resolvedProjectId ? 'Volver a Bitácora' : 'Volver a Reportes'}
                                aria-label={resolvedProjectId ? 'Volver a Bitácora' : 'Volver a Reportes'}
                            >
                                <ArrowLeft size={22} className="text-slate-600" />
                            </button>
                            <div className="min-w-0">
                                <h1 className="text-base sm:text-xl font-bold text-slate-900 flex items-center gap-2 truncate">
                                    <Camera size={20} className="shrink-0 text-indigo-600" />
                                    <span>{editingLog ? 'Editar' : 'Nuevo'} Reporte Fotográfico</span>
                                </h1>
                                <p className="text-xs text-slate-500 hidden sm:block">
                                    {isFreeMode ? 'Mismo editor, aunque el proyecto no haya nacido en la app' : 'Obra y conceptos con evidencia'}
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
                            <button
                                type="button"
                                onClick={() => navigate(resolvedProjectId ? `/project/${resolvedProjectId}/bitacora` : '/reports')}
                                className="shrink-0 px-4 py-2.5 text-slate-700 hover:bg-slate-100 rounded-xl font-semibold transition border border-slate-200 text-sm min-h-[44px] touch-manipulation"
                            >
                                Cancelar
                            </button>
                            <button
                                type="button"
                                onClick={handlePreview}
                                disabled={generatingPreview || entries.length === 0}
                                className="shrink-0 px-4 py-2.5 text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-xl font-bold transition border border-indigo-200 text-sm min-h-[44px] flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed touch-manipulation"
                                title="Ver cómo quedará el PDF"
                            >
                                {generatingPreview ? (
                                    <span className="inline-block w-5 h-5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                                ) : (
                                    <Eye size={18} />
                                )}
                                <span className="hidden sm:inline">Vista previa</span>
                            </button>
                            <button
                                type="button"
                                onClick={handleSave}
                                disabled={uploading || entries.length === 0}
                                className="shrink-0 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-lg shadow-indigo-200/50 transition flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed text-sm min-h-[44px] touch-manipulation"
                            >
                                {uploading ? (
                                    <>
                                        <span className="inline-block w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                        <span>Guardando...</span>
                                    </>
                                ) : (
                                    <>
                                        <Save size={18} />
                                        <span>{editingLog ? 'Actualizar' : 'Guardar'}</span>
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="w-full max-w-[1600px] mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6">

                {/* Encabezado del Reporte - membrete + datos de proyecto */}
                <div className="bg-white border-2 border-slate-300 rounded-xl sm:rounded-2xl p-4 sm:p-6 mb-4 sm:mb-6 shadow-md">
                    {/* Plegable: en celular se entra directo a las fotos */}
                    <button
                        type="button"
                        onClick={() => setShowHeaderData(prev => !prev)}
                        className="w-full flex items-center justify-between gap-3 text-left md:hidden mb-1 -m-1 p-1 rounded-lg hover:bg-slate-50 transition"
                        aria-expanded={showHeaderData}
                    >
                        <span className="min-w-0">
                            <span className="block text-sm font-bold text-slate-800">Datos del reporte</span>
                            <span className="block text-xs text-slate-500 truncate">
                                {headerData.obra?.trim() || 'Membrete, obra, conceptos y diseño del PDF'}
                            </span>
                        </span>
                        <ChevronDown
                            size={20}
                            className={`shrink-0 text-slate-400 transition-transform ${showHeaderData ? 'rotate-180' : ''}`}
                        />
                    </button>

                    <div className={showHeaderData ? 'block' : 'hidden md:block'}>
                    {/* Membrete de la constructora (se usa en el PDF) */}
                    <div className="mb-5 sm:mb-6">
                        <h2 className="text-xs font-bold text-slate-500 uppercase tracking-[0.18em] mb-2">Membrete de la constructora (PDF)</h2>
                        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 md:gap-6">
                            <div className="md:col-span-5">
                                <label className="block text-[10px] md:text-xs font-bold text-slate-700 uppercase mb-1">Nombre comercial / Razón social</label>
                                <input
                                    type="text"
                                    value={headerData.companyName}
                                    onChange={(e) => setHeaderData({ ...headerData, companyName: e.target.value })}
                                    className="w-full text-xs md:text-sm font-medium text-slate-800 border-b-2 border-slate-400 pb-1 focus:outline-none focus:border-indigo-600 bg-transparent"
                                    placeholder="Nombre de la constructora (membrete)"
                                />
                            </div>
                            <div className="md:col-span-3">
                                <label className="block text-[10px] md:text-xs font-bold text-slate-700 uppercase mb-1">RFC</label>
                                <input
                                    type="text"
                                    value={headerData.companyRfc}
                                    onChange={(e) => setHeaderData({ ...headerData, companyRfc: e.target.value })}
                                    className="w-full text-xs md:text-sm font-medium text-slate-800 border-b-2 border-slate-400 pb-1 focus:outline-none focus:border-indigo-600 bg-transparent"
                                    placeholder="RFC"
                                />
                            </div>
                            <div className="md:col-span-4">
                                <label className="block text-[10px] md:text-xs font-bold text-slate-700 uppercase mb-1">Línea extra (dirección, contacto, etc.)</label>
                                <input
                                    type="text"
                                    value={headerData.companyExtra}
                                    onChange={(e) => setHeaderData({ ...headerData, companyExtra: e.target.value })}
                                    className="w-full text-xs md:text-sm font-medium text-slate-800 border-b-2 border-slate-400 pb-1 focus:outline-none focus:border-indigo-600 bg-transparent"
                                    placeholder="Dirección, teléfono, registro, etc."
                                />
                            </div>
                        </div>
                    </div>

                    {/* Diseño del PDF: logo, columnas y ajuste de fotos */}
                    <div className="mb-5 sm:mb-6 pt-5 border-t border-slate-200">
                        <h2 className="text-xs font-bold text-slate-500 uppercase tracking-[0.18em] mb-3 flex items-center gap-2">
                            <LayoutGrid size={14} />
                            Diseño del PDF
                        </h2>
                        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 md:gap-6">
                            {/* Logo del membrete */}
                            <div className="md:col-span-4">
                                <label className="block text-[10px] md:text-xs font-bold text-slate-700 uppercase mb-2">Logo del membrete</label>
                                <div className="flex items-center gap-3">
                                    <div className="w-20 h-14 shrink-0 rounded-lg border-2 border-slate-300 bg-slate-50 flex items-center justify-center overflow-hidden">
                                        {pdfLayout.logoUrl ? (
                                            <img
                                                src={pdfLayout.logoUrl}
                                                alt="Logo"
                                                className="w-full h-full object-contain"
                                                onError={(e) => { e.target.onerror = null; e.target.style.display = 'none'; }}
                                            />
                                        ) : (
                                            <ImageIcon size={20} className="text-slate-400" />
                                        )}
                                    </div>
                                    <div className="flex flex-col gap-1.5 min-w-0">
                                        <label className="inline-flex items-center gap-2 px-3 py-2 text-xs font-bold rounded-lg border-2 border-slate-300 text-slate-700 hover:bg-slate-50 cursor-pointer transition min-h-[38px] touch-manipulation">
                                            <Upload size={14} />
                                            {uploadingLogo ? 'Subiendo...' : (pdfLayout.logoUrl ? 'Cambiar' : 'Subir logo')}
                                            <input type="file" accept="image/*" className="hidden" disabled={uploadingLogo} onChange={handleLogoChange} />
                                        </label>
                                        {pdfLayout.logoUrl && (
                                            <button
                                                type="button"
                                                onClick={() => setPdfLayout(prev => ({ ...prev, logoUrl: '' }))}
                                                className="text-[11px] font-semibold text-slate-500 hover:text-red-500 text-left transition"
                                            >
                                                Quitar logo
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Fotos por hoja */}
                            <div className="md:col-span-4">
                                <label className="block text-[10px] md:text-xs font-bold text-slate-700 uppercase mb-2">Fotos por hoja</label>
                                <div className="flex gap-2">
                                    {[
                                        { cols: 2, label: '2 grandes' },
                                        { cols: 3, label: '6 normal' },
                                        { cols: 4, label: '8 compacto' }
                                    ].map(opt => (
                                        <button
                                            key={opt.cols}
                                            type="button"
                                            onClick={() => setPdfLayout(prev => ({ ...prev, gridCols: opt.cols }))}
                                            className={`flex-1 px-2 py-2 text-[11px] font-bold rounded-lg border-2 transition min-h-[38px] touch-manipulation ${pdfLayout.gridCols === opt.cols
                                                ? 'border-indigo-600 bg-indigo-50 text-indigo-700'
                                                : 'border-slate-300 text-slate-600 hover:bg-slate-50'}`}
                                        >
                                            {opt.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Ajuste de las fotos */}
                            <div className="md:col-span-4">
                                <label className="block text-[10px] md:text-xs font-bold text-slate-700 uppercase mb-2">Ajuste de las fotos</label>
                                <div className="flex gap-2">
                                    {[
                                        { value: 'auto', label: 'Automático' },
                                        { value: 'contain', label: 'Completa' },
                                        { value: 'cover', label: 'Llenar' }
                                    ].map(opt => (
                                        <button
                                            key={opt.value}
                                            type="button"
                                            onClick={() => setPdfLayout(prev => ({ ...prev, photoFit: opt.value }))}
                                            className={`flex-1 px-2 py-2 text-[11px] font-bold rounded-lg border-2 transition min-h-[38px] touch-manipulation ${pdfLayout.photoFit === opt.value
                                                ? 'border-indigo-600 bg-indigo-50 text-indigo-700'
                                                : 'border-slate-300 text-slate-600 hover:bg-slate-50'}`}
                                        >
                                            {opt.label}
                                        </button>
                                    ))}
                                </div>
                                <p className="mt-1.5 text-[11px] text-slate-500 leading-snug">
                                    {pdfLayout.photoFit === 'auto' && 'Cada foto se acomoda sola: llena el recuadro si su forma lo permite y se muestra completa si es muy vertical o panorámica.'}
                                    {pdfLayout.photoFit === 'contain' && 'Todas las fotos se ven completas, centradas y sin recortar.'}
                                    {pdfLayout.photoFit === 'cover' && 'Todas las fotos llenan el recuadro; se recortan los bordes sobrantes.'}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Título Principal */}
                    <div className="text-center mb-6">
                        <h2 className="text-xl md:text-2xl font-bold text-slate-900 uppercase tracking-wider">REPORTE FOTOGRÁFICO DE OBRA</h2>
                    </div>

                    {/* Información del Proyecto */}
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-6 md:gap-4 mb-4">
                        {/* Columna Izquierda - Contratista y Ubicación */}
                        <div className="col-span-12 md:col-span-3">
                            <div className="mb-4 md:mb-3">
                                <div className="text-[10px] md:text-xs font-bold text-slate-700 uppercase mb-1">CONTRATISTA:</div>
                                <input
                                    type="text"
                                    value={headerData.contractor}
                                    onChange={(e) => setHeaderData({ ...headerData, contractor: e.target.value })}
                                    className="w-full text-xs md:text-sm font-medium text-slate-800 border-b-2 border-slate-400 pb-1 focus:outline-none focus:border-indigo-600 bg-transparent"
                                    placeholder="Ing. Contratista"
                                />
                            </div>
                            <div>
                                <div className="text-[10px] md:text-xs font-bold text-slate-700 uppercase mb-1">UBICACIÓN:</div>
                                <input
                                    type="text"
                                    value={headerData.ubicacion}
                                    onChange={(e) => setHeaderData({ ...headerData, ubicacion: e.target.value })}
                                    className="w-full text-xs md:text-sm font-medium text-slate-800 border-b-2 border-slate-400 pb-1 focus:outline-none focus:border-indigo-600 bg-transparent"
                                    placeholder="Lugar o dirección de la obra"
                                />
                            </div>
                        </div>

                        {/* Columna Central - Obra y Conceptos */}
                        <div className="col-span-12 md:col-span-6">
                            <div className="mb-4 md:mb-3">
                                <div className="text-[10px] md:text-xs font-bold text-slate-700 uppercase mb-1">OBRA:</div>
                                <input
                                    type="text"
                                    value={headerData.obra}
                                    onChange={(e) => setHeaderData({ ...headerData, obra: e.target.value })}
                                    className="w-full text-xs md:text-sm font-medium text-slate-800 border-b-2 border-slate-400 pb-1 focus:outline-none focus:border-indigo-600 bg-transparent"
                                    placeholder="Descripción de la obra"
                                />
                            </div>
                            <div>
                                <div className="text-[10px] md:text-xs font-bold text-slate-700 uppercase mb-1">CONCEPTOS:</div>
                                <input
                                    type="text"
                                    value={headerData.concepts}
                                    onChange={(e) => setHeaderData({ ...headerData, concepts: e.target.value })}
                                    className="w-full text-xs md:text-sm font-medium text-slate-800 border-b-2 border-slate-400 pb-1 focus:outline-none focus:border-indigo-600 bg-transparent"
                                    placeholder="Conceptos del reporte"
                                />
                            </div>
                        </div>

                        {/* Columna Derecha - Contrato y Fecha */}
                        <div className="col-span-12 md:col-span-3">
                            <div className="mb-4 md:mb-3">
                                <div className="text-[10px] md:text-xs font-bold text-slate-700 uppercase mb-1">CONTRATO No.:</div>
                                <input
                                    type="text"
                                    value={headerData.contractNumber}
                                    onChange={(e) => setHeaderData({ ...headerData, contractNumber: e.target.value })}
                                    className="w-full text-xs md:text-sm font-medium text-slate-800 border-b-2 border-slate-400 pb-1 focus:outline-none focus:border-indigo-600 bg-transparent"
                                    placeholder="S/N"
                                />
                            </div>
                            <div>
                                <div className="text-[10px] md:text-xs font-bold text-slate-700 uppercase mb-1">FECHA:</div>
                                <input
                                    type="date"
                                    value={reportDate}
                                    onChange={(e) => setReportDate(e.target.value)}
                                    className="w-full text-xs md:text-sm font-medium text-slate-800 border-b-2 border-slate-400 pb-1 focus:outline-none focus:border-indigo-600 bg-transparent"
                                />
                            </div>
                        </div>
                    </div>
                    </div>

                </div>

                {/* Contenido: bloques de fotos + concepto debajo (sin barra lateral; fecha ya en encabezado) */}
                <div className="w-full min-w-0">

                        {entries.length === 0 ? (
                            <div className="bg-white rounded-xl shadow-sm border-2 border-slate-200 p-8 sm:p-12 text-center">
                                <div className="w-20 h-20 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-4">
                                    <Camera size={40} className="text-slate-400" />
                                </div>
                                <p className="font-semibold text-lg text-slate-600 mb-1">Agrega fotos y concepto</p>
                                <p className="text-sm text-slate-500 mb-6">Cada bloque tiene fotos y el concepto se escribe debajo.</p>
                                <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                                    <label className="sm:hidden w-full inline-flex items-center justify-center gap-2 px-5 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold transition shadow-lg shadow-indigo-200/50 min-h-[44px] cursor-pointer touch-manipulation">
                                        <Camera size={20} />
                                        Tomar foto
                                        <input type="file" accept="image/*" capture="environment" className="hidden" onChange={handleBulkFileChange} />
                                    </label>
                                    <label className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-3 bg-indigo-600 sm:bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold transition shadow-lg shadow-indigo-200/50 min-h-[44px] cursor-pointer touch-manipulation">
                                        <Images size={20} />
                                        Cargar varias fotos
                                        <input type="file" accept="image/*" multiple className="hidden" onChange={handleBulkFileChange} />
                                    </label>
                                    <button
                                        type="button"
                                        onClick={handleAddBlock}
                                        className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-3 bg-white border-2 border-slate-300 text-slate-700 hover:bg-slate-50 rounded-xl font-bold transition min-h-[44px] touch-manipulation"
                                    >
                                        <Plus size={20} />
                                        Agregar un bloque
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-6 sm:space-y-8">
                                {entries.map((entry, index) => (
                                    <div key={entry.id} className="bg-white rounded-xl border-2 border-slate-300 overflow-hidden shadow-sm">
                                        <div className="p-4 sm:p-6">
                                            <div className="flex items-center justify-between gap-3 mb-4">
                                                <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">Bloque {index + 1}</span>
                                                <button
                                                    type="button"
                                                    onClick={() => handleRemoveEntry(entry.id)}
                                                    className="p-2.5 text-slate-400 hover:text-red-500 hover:bg-red-50 transition rounded-xl touch-manipulation"
                                                    title="Eliminar bloque"
                                                >
                                                    <Trash2 size={20} />
                                                </button>
                                            </div>

                                            {/* Fotos */}
                                            <div className="mb-4">
                                                <label className="block text-xs font-bold text-slate-700 uppercase mb-2 tracking-wider">Evidencia fotográfica</label>
                                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                                    {entry.previewUrls.map((url, idx) => (
                                                        <div key={idx} className="relative group">
                                                            <div className="aspect-square rounded-lg overflow-hidden border-2 border-slate-300 bg-slate-100">
                                                                <img
                                                                    src={typeof url === 'string' && url.includes('/uploads/') ? url.replace(/^https?:\/\/[^/]+/, '') : url}
                                                                    className="w-full h-full object-cover"
                                                                    alt={`Foto ${idx + 1}`}
                                                                    onError={(e) => {
                                                                        e.target.onerror = null;
                                                                        e.target.src = 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100"><rect fill="%23e2e8f0" width="100" height="100"/><text x="50" y="55" font-size="10" fill="%2364758b" text-anchor="middle" font-family="sans-serif">Sin imagen</text></svg>');
                                                                    }}
                                                                />
                                                                <button
                                                                    type="button"
                                                                    onClick={() => {
                                                                        // Si es un blob URL, liberar memoria del navegador
                                                                        if (typeof url === 'string' && url.startsWith('blob:')) {
                                                                            ImageUploadService.revokePreviewUrl(url);
                                                                        }
                                                                        const newPreviewUrls = entry.previewUrls.filter((_, i) => i !== idx);
                                                                        const existingCount = (entry.photoUrls || []).length;
                                                                        const newPhotoUrls = (entry.photoUrls || []).filter((_, i) => i !== idx);
                                                                        let newPhotos = entry.photos || [];
                                                                        // Para fotos nuevas (después de las existentes), también eliminar el File correspondiente
                                                                        if (idx >= existingCount) {
                                                                            const newIndex = idx - existingCount;
                                                                            newPhotos = (entry.photos || []).filter((_, i) => i !== newIndex);
                                                                        }
                                                                        const newCaptions = (entry.photoCaptions || []).filter((_, i) => i !== idx);
                                                                        updateEntryFields(entry.id, {
                                                                            previewUrls: newPreviewUrls,
                                                                            photoUrls: newPhotoUrls,
                                                                            photos: newPhotos,
                                                                            photoCaptions: newCaptions
                                                                        });
                                                                    }}
                                                                    className="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition shadow-lg hover:bg-red-600 z-10"
                                                                    title="Eliminar foto"
                                                                >
                                                                    <X size={14} />
                                                                </button>
                                                            </div>
                                                            <input
                                                                type="text"
                                                                value={entry.photoCaptions?.[idx] || ''}
                                                                onChange={(e) => {
                                                                    const newCaptions = [...(entry.photoCaptions || [])];
                                                                    newCaptions[idx] = e.target.value;
                                                                    updateEntry(entry.id, 'photoCaptions', newCaptions);
                                                                }}
                                                                placeholder={`Descripción foto ${idx + 1}`}
                                                                className="w-full mt-1.5 text-xs font-medium text-slate-700 border-b border-slate-300 pb-1 focus:outline-none focus:border-indigo-500 bg-transparent"
                                                            />
                                                        </div>
                                                    ))}
                                                    {/* Cámara: en celular abre la cámara directo; en escritorio no se muestra */}
                                                    <label className="sm:hidden aspect-square border-2 border-dashed border-indigo-400 rounded-lg flex flex-col items-center justify-center cursor-pointer bg-indigo-50/50 hover:bg-indigo-50 transition text-indigo-600 touch-manipulation">
                                                        <Camera size={28} className="mb-1" />
                                                        <span className="text-xs font-bold">Tomar foto</span>
                                                        <input
                                                            type="file"
                                                            accept="image/*"
                                                            capture="environment"
                                                            className="hidden"
                                                            onChange={(e) => handleFileChange(entry.id, e)}
                                                        />
                                                    </label>
                                                    <label className="aspect-square border-2 border-dashed border-slate-400 rounded-lg flex flex-col items-center justify-center cursor-pointer hover:bg-indigo-50 hover:border-indigo-500 transition text-slate-500 hover:text-indigo-600 touch-manipulation">
                                                        <Upload size={28} className="mb-1" />
                                                        <span className="text-xs font-bold">Subir</span>
                                                        <input type="file" accept="image/*" multiple className="hidden" onChange={(e) => handleFileChange(entry.id, e)} />
                                                    </label>
                                                </div>
                                            </div>

                                            {/* Concepto debajo de las fotos (input, no select) */}
                                            <div className="mb-4">
                                                <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5 tracking-wider">Concepto</label>
                                                <input
                                                    type="text"
                                                    value={entry.itemName}
                                                    onChange={(e) => updateEntry(entry.id, 'itemName', e.target.value)}
                                                    className="w-full border-2 border-slate-300 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                                                    placeholder="Nombre del concepto o partida"
                                                />
                                            </div>

                                            <div className="mb-4">
                                                <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5 tracking-wider">Concepto general</label>
                                                <textarea
                                                    value={entry.description}
                                                    onChange={(e) => updateEntry(entry.id, 'description', e.target.value)}
                                                    className="w-full border-2 border-slate-300 rounded-xl p-3 text-sm outline-none focus:ring-2 focus:ring-indigo-500 resize-none min-h-[80px]"
                                                    placeholder="Concepto general de todas las fotos de este bloque..."
                                                    rows={2}
                                                />
                                            </div>

                                            <div className="flex items-center gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200">
                                                <button
                                                    type="button"
                                                    onClick={() => updateEntry(entry.id, 'isCompleted', !entry.isCompleted)}
                                                    className={`shrink-0 w-6 h-6 rounded border-2 flex items-center justify-center transition ${entry.isCompleted ? 'bg-green-500 border-green-600 text-white' : 'bg-white border-slate-400'}`}
                                                >
                                                    <Check size={16} strokeWidth={3} />
                                                </button>
                                                <span className="text-sm font-bold text-slate-700">Terminado (100%)</span>
                                            </div>
                                        </div>
                                    </div>
                                ))}

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    <label className="py-4 border-2 border-dashed border-indigo-300 rounded-xl text-indigo-600 hover:border-indigo-500 hover:bg-indigo-50/50 font-bold transition flex items-center justify-center gap-2 cursor-pointer touch-manipulation">
                                        <Images size={22} /> Cargar varias fotos
                                        <input type="file" accept="image/*" multiple className="hidden" onChange={handleBulkFileChange} />
                                    </label>
                                    <button
                                        type="button"
                                        onClick={handleAddBlock}
                                        className="py-4 border-2 border-dashed border-slate-300 rounded-xl text-slate-500 hover:border-indigo-400 hover:text-indigo-600 hover:bg-indigo-50/30 font-bold transition flex items-center justify-center gap-2 touch-manipulation"
                                    >
                                        <Plus size={22} /> Agregar un bloque
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Footer con Firmas */}
                        {entries.length > 0 && (
                            <div className="mt-6 sm:mt-8 bg-white border-2 border-slate-300 rounded-xl sm:rounded-2xl p-5 sm:p-8 shadow-md">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 sm:gap-12">
                                    {/* Firma del Contratista */}
                                    <div className="text-center space-y-2">
                                        <div className="border-t-2 border-slate-600 pt-2 mb-3" style={{ width: '220px', margin: '0 auto' }}></div>
                                        <input
                                            type="text"
                                            value={signatureData.contractorTitle}
                                            onChange={(e) => setSignatureData({ ...signatureData, contractorTitle: e.target.value })}
                                            className="text-xs font-bold text-slate-700 uppercase mb-2 border-b-2 border-slate-400 pb-1 focus:outline-none focus:border-indigo-600 bg-transparent text-center w-full max-w-xs mx-auto"
                                            placeholder="EL CONTRATISTA"
                                        />
                                        <input
                                            type="text"
                                            value={signatureData.contractorName}
                                            onChange={(e) => setSignatureData({ ...signatureData, contractorName: e.target.value })}
                                            className="text-sm font-medium text-slate-800 mb-1 border-b-2 border-slate-400 pb-1 focus:outline-none focus:border-indigo-600 bg-transparent text-center w-full max-w-xs mx-auto"
                                            placeholder="Nombre del contratista"
                                        />
                                        <input
                                            type="text"
                                            value={signatureData.contractorRole}
                                            onChange={(e) => setSignatureData({ ...signatureData, contractorRole: e.target.value })}
                                            className="text-xs text-slate-600 mt-2 border-b-2 border-slate-400 pb-1 focus:outline-none focus:border-indigo-600 bg-transparent text-center w-full max-w-xs mx-auto"
                                            placeholder="ADMINISTRADOR ÚNICO"
                                        />
                                    </div>

                                    {/* Firma del H. Ayuntamiento */}
                                    <div className="text-center space-y-2">
                                        <div className="border-t-2 border-slate-600 pt-2 mb-3" style={{ width: '220px', margin: '0 auto' }}></div>
                                        <input
                                            type="text"
                                            value={signatureData.municipalityTitle}
                                            onChange={(e) => setSignatureData({ ...signatureData, municipalityTitle: e.target.value })}
                                            className="text-xs font-bold text-slate-700 uppercase mb-2 border-b-2 border-slate-400 pb-1 focus:outline-none focus:border-indigo-600 bg-transparent text-center w-full max-w-xs mx-auto"
                                            placeholder="H. AYUNTAMIENTO"
                                        />
                                        <input
                                            type="text"
                                            value={signatureData.supervisorName}
                                            onChange={(e) => setSignatureData({ ...signatureData, supervisorName: e.target.value })}
                                            className="text-sm font-medium text-slate-800 mb-1 border-b-2 border-slate-400 pb-1 focus:outline-none focus:border-indigo-600 bg-transparent text-center w-full max-w-xs mx-auto"
                                            placeholder="Nombre del supervisor"
                                        />
                                        <input
                                            type="text"
                                            value={signatureData.supervisorRole}
                                            onChange={(e) => setSignatureData({ ...signatureData, supervisorRole: e.target.value })}
                                            className="text-xs text-slate-600 mt-2 border-b-2 border-slate-400 pb-1 focus:outline-none focus:border-indigo-600 bg-transparent text-center w-full max-w-xs mx-auto"
                                            placeholder="DIRECTOR DE OBRAS PÚBLICAS"
                                        />
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Modal de Alerta */}
            <AlertModal
                isOpen={alertModal.isOpen}
                onClose={() => setAlertModal({ ...alertModal, isOpen: false })}
                title={alertModal.title}
                message={alertModal.message}
                type={alertModal.type}
            />

            {/* Limit Modal */}
            <LimitModal
                isOpen={limitModal.isOpen}
                onClose={() => setLimitModal({ isOpen: false, actionType: null, usage: 0, limit: 0 })}
                actionType={limitModal.actionType}
                usage={limitModal.usage}
                limit={limitModal.limit}
            />

            {/* Preparando las fotos de la carga masiva */}
            {preparingBulk && (
                <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm text-center">
                        <Loader2 size={32} className="text-indigo-600 mx-auto mb-3 animate-spin" />
                        <p className="font-bold text-slate-800">Preparando fotos</p>
                        <p className="text-sm text-slate-500 mt-1">
                            {preparingBulk.done} de {preparingBulk.total}
                        </p>
                        <div className="mt-4 h-2 rounded-full bg-slate-200 overflow-hidden">
                            <div
                                className="h-full bg-indigo-600 transition-all"
                                style={{ width: `${Math.round((preparingBulk.done / preparingBulk.total) * 100)}%` }}
                            />
                        </div>
                    </div>
                </div>
            )}

            {/* ¿Cómo repartir las fotos cargadas? */}
            {bulkPhotos && (
                <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
                        <div className="p-5 sm:p-6">
                            <div className="flex items-start gap-3 mb-4">
                                <div className="w-11 h-11 shrink-0 rounded-xl bg-indigo-50 flex items-center justify-center">
                                    <Images size={22} className="text-indigo-600" />
                                </div>
                                <div className="min-w-0">
                                    <h3 className="font-bold text-slate-900">
                                        {bulkPhotos.files.length} fotos listas
                                    </h3>
                                    <p className="text-sm text-slate-500">
                                        ¿Cómo las acomodo? Cada bloque lleva su propio concepto.
                                    </p>
                                </div>
                            </div>

                            {/* Miniaturas de lo que se cargó */}
                            <div className="flex gap-2 overflow-x-auto pb-2 mb-4">
                                {bulkPhotos.previewUrls.slice(0, 12).map((url, idx) => (
                                    <img
                                        key={idx}
                                        src={url}
                                        alt={`Foto ${idx + 1}`}
                                        className="w-16 h-16 shrink-0 rounded-lg object-cover border border-slate-200"
                                    />
                                ))}
                                {bulkPhotos.previewUrls.length > 12 && (
                                    <div className="w-16 h-16 shrink-0 rounded-lg border border-slate-200 bg-slate-50 flex items-center justify-center text-xs font-bold text-slate-500">
                                        +{bulkPhotos.previewUrls.length - 12}
                                    </div>
                                )}
                            </div>

                            {/* Fotos por bloque */}
                            <label className="block text-xs font-bold text-slate-700 uppercase mb-2">Fotos por bloque</label>
                            <div className="flex flex-wrap gap-2 mb-3">
                                {[1, 2, 3, 4, 6].map(n => (
                                    <button
                                        key={n}
                                        type="button"
                                        onClick={() => setPhotosPerBlock(n)}
                                        className={`px-4 py-2.5 text-sm font-bold rounded-xl border-2 transition min-h-[42px] touch-manipulation ${photosPerBlock === n
                                            ? 'border-indigo-600 bg-indigo-50 text-indigo-700'
                                            : 'border-slate-300 text-slate-600 hover:bg-slate-50'}`}
                                    >
                                        {n === 1 ? '1 (una por bloque)' : n}
                                    </button>
                                ))}
                                <button
                                    type="button"
                                    onClick={() => setPhotosPerBlock(bulkPhotos.files.length)}
                                    className={`px-4 py-2.5 text-sm font-bold rounded-xl border-2 transition min-h-[42px] touch-manipulation ${photosPerBlock === bulkPhotos.files.length && bulkPhotos.files.length > 1
                                        ? 'border-indigo-600 bg-indigo-50 text-indigo-700'
                                        : 'border-slate-300 text-slate-600 hover:bg-slate-50'}`}
                                >
                                    Todas en uno
                                </button>
                            </div>

                            <p className="text-sm text-slate-600 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 mb-5">
                                Se crearán{' '}
                                <span className="font-bold text-slate-800">
                                    {Math.ceil(bulkPhotos.files.length / Math.max(1, photosPerBlock))} bloques
                                </span>{' '}
                                con {photosPerBlock} foto{photosPerBlock === 1 ? '' : 's'} cada uno.
                            </p>

                            <div className="flex flex-col-reverse sm:flex-row gap-2 sm:justify-end">
                                <button
                                    type="button"
                                    onClick={cancelBulkPhotos}
                                    className="px-4 py-2.5 rounded-xl font-bold text-slate-700 border-2 border-slate-200 hover:bg-slate-50 transition min-h-[44px] touch-manipulation"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="button"
                                    onClick={() => applyBulkPhotos(photosPerBlock)}
                                    className="px-5 py-2.5 rounded-xl font-bold text-white bg-indigo-600 hover:bg-indigo-700 shadow-lg shadow-indigo-200/50 transition min-h-[44px] touch-manipulation"
                                >
                                    Crear bloques
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Vista previa del PDF */}
            {pdfPreviewUrl && (
                <div className="fixed inset-0 bg-slate-900/95 z-50 flex flex-col">
                    <div className="bg-white w-full h-full flex flex-col overflow-hidden">
                        <div className="flex items-center justify-between px-3 sm:px-4 py-2.5 sm:py-3 bg-slate-50 border-b border-slate-200 shrink-0">
                            <div className="flex items-center gap-2 min-w-0">
                                <FileText size={20} className="text-indigo-600 shrink-0" />
                                <h3 className="text-sm font-bold text-slate-700 truncate">Vista previa del PDF</h3>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                                <button
                                    type="button"
                                    onClick={() => window.open(pdfPreviewUrl, '_blank')}
                                    className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-indigo-600 hover:bg-indigo-50 rounded-xl transition touch-manipulation"
                                    title="Abrir en nueva pestaña"
                                >
                                    <ExternalLink size={14} />
                                    <span className="hidden sm:inline">Abrir en pestaña</span>
                                </button>
                                <button
                                    type="button"
                                    onClick={closePreview}
                                    className="p-2.5 hover:bg-slate-200 rounded-xl transition text-slate-500 touch-manipulation"
                                    title="Cerrar"
                                    aria-label="Cerrar vista previa"
                                >
                                    <X size={20} />
                                </button>
                            </div>
                        </div>
                        <div className="flex-1 min-h-0 overflow-hidden bg-slate-100">
                            <iframe
                                src={pdfPreviewUrl}
                                className="w-full h-full border-0"
                                title="Vista previa del PDF"
                            />
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

export default PhotographicReportPage;
