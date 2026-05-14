import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Camera, Save, Plus, Trash2, Check, Upload, X } from 'lucide-react';
import BitacoraService from '../services/BitacoraService';
import ImageUploadService from '../services/ImageUploadService';
import ProjectPersistenceService from '../services/ProjectPersistenceService';
import PDFReportService from '../services/PDFReportService';
import AlertModal from '../components/ui/AlertModal';
import { useSubscription } from '../context/SubscriptionContext';
import { useProject } from '../context/ProjectContext';
import LimitModal from '../components/subscription/LimitModal';

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

    // Limpiar previews al desmontar
    useEffect(() => {
        return () => {
            entries.forEach(entry => {
                entry.previewUrls.forEach(url => {
                    if (url.startsWith('blob:')) {
                        ImageUploadService.revokePreviewUrl(url);
                    }
                });
            });
        };
    }, [entries]);

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
            const projectName = (headerData.obra || projectInfo?.project || projectInfo?.name || 'Sin nombre').trim() || 'Sin nombre';
            const updatedProjectInfo = {
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
                contractorTitle: signatureData.contractorTitle,
                contractorName: signatureData.contractorName,
                contractorRole: signatureData.contractorRole,
                municipalityTitle: signatureData.municipalityTitle,
                supervisorName: signatureData.supervisorName,
                supervisorRole: signatureData.supervisorRole
            };

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
                // Nombre del concepto que se usa en el texto del log (no mostrar ids internos tipo "block-...")
                const conceptNameFromBlock = (entry.itemName || '').trim() || '';
                const conceptName =
                    (headerData.concepts || '').trim() ||
                    conceptNameFromBlock ||
                    'Concepto sin nombre';
                // Título del reporte: nombre de la obra/proyecto o concepto del encabezado (no "block-xxx")
                const reportTitle = (headerData.obra || headerData.concepts || conceptName).trim() || 'Reporte fotográfico';
                // Concepto general en texto; descripciones por foto opcionales se guardan en content (no se repiten bajo cada foto en PDF)
                const baseContent = entry.description || `Reporte fotográfico: ${conceptName}`;
                const photoCaptions = Array.isArray(entry.photoCaptions) ? entry.photoCaptions : [];
                const contentWithCaptions = baseContent + '\n\n<!--PHOTO_CAPTIONS:' + JSON.stringify(photoCaptions) + '-->';

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

                {/* Contenido: bloques de fotos + concepto debajo (sin barra lateral; fecha ya en encabezado) */}
                <div className="w-full min-w-0">

                        {entries.length === 0 ? (
                            <div className="bg-white rounded-xl shadow-sm border-2 border-slate-200 p-8 sm:p-12 text-center">
                                <div className="w-20 h-20 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-4">
                                    <Camera size={40} className="text-slate-400" />
                                </div>
                                <p className="font-semibold text-lg text-slate-600 mb-1">Agrega fotos y concepto</p>
                                <p className="text-sm text-slate-500 mb-6">Cada bloque tiene fotos y el concepto se escribe debajo.</p>
                                <button
                                    type="button"
                                    onClick={handleAddBlock}
                                    className="inline-flex items-center gap-2 px-5 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold transition shadow-lg shadow-indigo-200/50 min-h-[44px] touch-manipulation"
                                >
                                    <Plus size={20} />
                                    Agregar fotos y concepto
                                </button>
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

                                <button
                                    type="button"
                                    onClick={handleAddBlock}
                                    className="w-full py-4 border-2 border-dashed border-slate-300 rounded-xl text-slate-500 hover:border-indigo-400 hover:text-indigo-600 hover:bg-indigo-50/30 font-bold transition flex items-center justify-center gap-2 touch-manipulation"
                                >
                                    <Plus size={22} /> Agregar más fotos y concepto
                                </button>
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
        </>
    );
};

export default PhotographicReportPage;
