import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Camera, Save, Plus, Trash2, Calendar, Search, Check, Upload, X } from 'lucide-react';
import BitacoraService from '../services/BitacoraService';
import ImageUploadService from '../services/ImageUploadService';
import ProjectPersistenceService from '../services/ProjectPersistenceService';
import AlertModal from '../components/ui/AlertModal';
import { useSubscription } from '../context/SubscriptionContext';
import LimitModal from '../components/subscription/LimitModal';

const PhotographicReportPage = () => {
    const { projectId, logId } = useParams();
    const navigate = useNavigate();
    const { checkLimit, incrementUsage, isPro } = useSubscription();
    const [reportDate, setReportDate] = useState(new Date().toISOString().split('T')[0]);
    const [entries, setEntries] = useState([]);
    const [uploading, setUploading] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [showItemSelector, setShowItemSelector] = useState(false);
    const [items, setItems] = useState([]);
    const [projectInfo, setProjectInfo] = useState(null);
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
        contractor: '',
        contractNumber: '',
        obra: '',
        concepts: ''
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
        const loadData = async () => {
            try {
                setLoading(true);
                
                // Cargar items del proyecto
                const projectData = await ProjectPersistenceService.loadProject(projectId);
                setItems(projectData?.items || []);
                const loadedProjectInfo = projectData?.projectInfo || projectData || {};
                setProjectInfo(loadedProjectInfo);
                
                // Inicializar datos del encabezado
                setHeaderData({
                    contractor: loadedProjectInfo.contractor || loadedProjectInfo.client || '',
                    contractNumber: loadedProjectInfo.contractNumber || 'S/N',
                    obra: loadedProjectInfo.project || loadedProjectInfo.name || '',
                    concepts: ''
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

                        // Crear entrada con los datos del log
                        const entry = {
                            id: Date.now(),
                            logId: log.id,
                            itemId: item?.id || log.task_id,
                            itemName: conceptName,
                            itemCode: item?.code || '',
                            photos: [],
                            previewUrls: log.photos || [],
                            photoUrls: log.photos || [],
                            photoCaptions: log.photos ? log.photos.map(() => log.content || '') : [], // Usar content como caption inicial
                            description: log.content || '',
                            progress: log.progress_percentage || 100,
                            isCompleted: log.progress_percentage === 100
                        };

                        setEntries([entry]);
                    }
                }
            } catch (error) {
                console.error('Error loading data:', error);
            } finally {
                setLoading(false);
            }
        };

        if (projectId) {
            loadData();
        }
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

    const handleAddItem = (item) => {
        const newEntry = {
            id: Date.now(),
            itemId: item.id,
            itemName: item.description || item.concept || 'Concepto sin nombre',
            itemCode: item.code || '',
            photos: [],
            previewUrls: [],
            photoUrls: [],
            photoCaptions: [], // Array para captions individuales de cada foto
            description: '',
            progress: 100,
            isCompleted: true
        };
        setEntries([...entries, newEntry]);
        setShowItemSelector(false);
        setSearchTerm('');
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

        const validFiles = [];
        const newPreviewUrls = [];

        selectedFiles.forEach(file => {
            const validation = ImageUploadService.validateImage(file);
            if (validation.valid) {
                validFiles.push(file);
                newPreviewUrls.push(ImageUploadService.createPreviewUrl(file));
            } else {
                setAlertModal({
                    isOpen: true,
                    title: 'Error de validación',
                    message: `Error en ${file.name}: ${validation.error}`,
                    type: 'error'
                });
            }
        });

        setEntries(entries.map(entry => {
            if (entry.id === entryId) {
                // Inicializar photoCaptions si no existe
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
            setAlertModal({
                isOpen: true,
                title: 'Reporte vacío',
                message: 'Agrega al menos un concepto al reporte.',
                type: 'warning'
            });
            return;
        }

        setUploading(true);
        try {
            // Guardar los valores de las firmas en projectInfo
            const updatedProjectInfo = {
                ...projectInfo,
                contractor: headerData.contractor,
                contractNumber: headerData.contractNumber,
                project: headerData.obra,
                // Guardar todos los datos de las firmas
                contractorTitle: signatureData.contractorTitle,
                contractorName: signatureData.contractorName,
                contractorRole: signatureData.contractorRole,
                municipalityTitle: signatureData.municipalityTitle,
                supervisorName: signatureData.supervisorName,
                supervisorRole: signatureData.supervisorRole
            };

            // Actualizar projectInfo en el proyecto
            try {
                const projectData = await ProjectPersistenceService.loadProject(projectId);
                const updatedProjectData = {
                    ...projectData,
                    projectInfo: updatedProjectInfo
                };
                await ProjectPersistenceService.saveProject(updatedProjectData);
            } catch (error) {
                console.warn('No se pudo guardar la información del proyecto:', error);
                // Continuar aunque falle el guardado del proyecto
            }

            for (const entry of entries) {
                let newPhotoUrls = [];
                if (entry.photos.length > 0) {
                    newPhotoUrls = await ImageUploadService.uploadMultipleImages(
                        entry.photos,
                        projectId,
                        'report-' + entry.itemId
                    );
                }

                const existingUrls = entry.photoUrls || [];
                const allPhotoUrls = [...existingUrls, ...newPhotoUrls];
                // Guardar captions de fotos en el content o en un campo separado
                const photoCaptionsText = entry.photoCaptions?.filter(c => c).join(' | ') || '';
                const logDate = new Date(reportDate + 'T12:00:00').toISOString();

                if (editingLog && entry.logId) {
                    await BitacoraService.updateLog(entry.logId, {
                        content: entry.description || `Reporte fotográfico del concepto: ${entry.itemName}`,
                        progressPercentage: entry.isCompleted ? 100 : entry.progress,
                        photos: allPhotoUrls,
                        subject: `Reporte Fotográfico: ${entry.itemName}`
                    });
                } else {
                    // Verificar límite antes de crear nuevo reporte
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

                    // Incrementar contador de uso
                    if (!isPro) {
                        await incrementUsage('photoReports');
                    }
                }
            }

            navigate(`/project/${projectId}/bitacora`);
        } catch (error) {
            console.error('Error saving report:', error);
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

    const filteredItems = items.filter(item =>
        (item.description || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (item.code || '').toLowerCase().includes(searchTerm.toLowerCase())
    );

    // Actualizar conceptos en headerData cuando cambian las entries
    // IMPORTANTE: Este useEffect debe estar ANTES de cualquier return condicional
    useEffect(() => {
        const conceptsText = entries.map(e => e.itemName).join(', ');
        setHeaderData(prev => ({ ...prev, concepts: conceptsText }));
    }, [entries]);

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
        <div className="min-h-screen bg-white">
            {/* Header de Navegación */}
            <div className="bg-slate-50 border-b border-slate-200 sticky top-0 z-10">
                <div className="max-w-7xl mx-auto px-8 py-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <button
                                onClick={() => navigate(`/project/${projectId}/bitacora`)}
                                className="p-2 hover:bg-white rounded-lg transition"
                                title="Volver a Bitácora"
                            >
                                <ArrowLeft size={24} className="text-slate-600" />
                            </button>
                            <div>
                                <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                                    <Camera size={24} className="text-indigo-600" />
                                    {editingLog ? 'Editar' : 'Nuevo'} Reporte Fotográfico
                                </h1>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <button
                                onClick={() => navigate(`/project/${projectId}/bitacora`)}
                                className="px-5 py-2 text-slate-700 hover:bg-white rounded-lg font-bold transition border border-slate-300"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleSave}
                                disabled={uploading || entries.length === 0}
                                className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg shadow-lg shadow-indigo-200 transition flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {uploading ? (
                                    <>
                                        <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                                        Guardando...
                                    </>
                                ) : (
                                    <>
                                        <Save size={18} />
                                        {editingLog ? 'Actualizar' : 'Guardar'}
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Content - Ocupa todo el ancho disponible sin max-width */}
            <div className="w-full px-8 py-6">
                {/* Encabezado del Reporte - Formato exacto del ejemplo - TODOS LOS CAMPOS EDITABLES */}
                <div className="bg-white border-2 border-slate-400 rounded-lg p-6 mb-6 shadow-lg">
                    {/* Título Principal */}
                    <div className="text-center mb-6">
                        <h2 className="text-2xl font-bold text-slate-900 uppercase tracking-wider">REPORTE FOTOGRÁFICO DE OBRA</h2>
                    </div>

                    {/* Información del Proyecto - Grid como en el ejemplo - TODOS EDITABLES */}
                    <div className="grid grid-cols-12 gap-4 mb-4">
                        {/* Columna Izquierda - Contratista */}
                        <div className="col-span-12 md:col-span-3">
                            <div className="text-xs font-bold text-slate-700 uppercase mb-1">CONTRATISTA:</div>
                            <input
                                type="text"
                                value={headerData.contractor}
                                onChange={(e) => setHeaderData({ ...headerData, contractor: e.target.value })}
                                className="w-full text-sm font-medium text-slate-800 border-b-2 border-slate-400 pb-1 focus:outline-none focus:border-indigo-600 bg-transparent"
                                placeholder="Ing. Contratista"
                            />
                        </div>

                        {/* Columna Central - Obra y Conceptos */}
                        <div className="col-span-12 md:col-span-6">
                            <div className="mb-3">
                                <div className="text-xs font-bold text-slate-700 uppercase mb-1">OBRA:</div>
                                <input
                                    type="text"
                                    value={headerData.obra}
                                    onChange={(e) => setHeaderData({ ...headerData, obra: e.target.value })}
                                    className="w-full text-sm font-medium text-slate-800 border-b-2 border-slate-400 pb-1 focus:outline-none focus:border-indigo-600 bg-transparent"
                                    placeholder="Descripción de la obra"
                                />
                            </div>
                            <div>
                                <div className="text-xs font-bold text-slate-700 uppercase mb-1">CONCEPTOS:</div>
                                <input
                                    type="text"
                                    value={headerData.concepts}
                                    onChange={(e) => setHeaderData({ ...headerData, concepts: e.target.value })}
                                    className="w-full text-sm font-medium text-slate-800 border-b-2 border-slate-400 pb-1 focus:outline-none focus:border-indigo-600 bg-transparent"
                                    placeholder="Conceptos del reporte"
                                />
                            </div>
                        </div>

                        {/* Columna Derecha - Contrato y Fecha */}
                        <div className="col-span-12 md:col-span-3">
                            <div className="mb-3">
                                <div className="text-xs font-bold text-slate-700 uppercase mb-1">CONTRATO No.:</div>
                                <input
                                    type="text"
                                    value={headerData.contractNumber}
                                    onChange={(e) => setHeaderData({ ...headerData, contractNumber: e.target.value })}
                                    className="w-full text-sm font-medium text-slate-800 border-b-2 border-slate-400 pb-1 focus:outline-none focus:border-indigo-600 bg-transparent"
                                    placeholder="S/N"
                                />
                            </div>
                            <div>
                                <div className="text-xs font-bold text-slate-700 uppercase mb-1">FECHA:</div>
                                <input
                                    type="date"
                                    value={reportDate}
                                    onChange={(e) => setReportDate(e.target.value)}
                                    className="w-full text-sm font-medium text-slate-800 border-b-2 border-slate-400 pb-1 focus:outline-none focus:border-indigo-600 bg-transparent"
                                />
                            </div>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                    {/* Sidebar - Controls - Más compacto */}
                    <div className="lg:col-span-1 space-y-4">
                        <div className="bg-white rounded-lg shadow-sm border-2 border-slate-300 p-4">
                            <label className="block text-xs font-bold text-slate-700 uppercase mb-2 tracking-wider">FECHA DEL REPORTE</label>
                            <div className="relative">
                                <Calendar size={16} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                                <input
                                    type="date"
                                    value={reportDate}
                                    onChange={(e) => setReportDate(e.target.value)}
                                    className="w-full border-2 border-slate-300 rounded-lg px-3 py-2 pr-8 text-sm font-medium text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                                />
                            </div>
                        </div>

                        <div className="bg-white rounded-lg shadow-sm border-2 border-slate-300 p-4">
                            <label className="block text-xs font-bold text-slate-700 uppercase mb-3 tracking-wider">AGREGAR CONCEPTO</label>
                            <div className="relative">
                                <button
                                    onClick={() => setShowItemSelector(!showItemSelector)}
                                    className="w-full bg-slate-50 border-2 border-slate-300 hover:border-indigo-500 text-slate-600 px-4 py-3.5 rounded-xl flex items-center justify-between transition shadow-sm font-medium"
                                >
                                    <span>Seleccionar concepto...</span>
                                    <Plus size={20} className="text-indigo-600" />
                                </button>

                                {showItemSelector && (
                                    <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl shadow-xl border border-slate-200 z-50 max-h-96 flex flex-col">
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
                                        <div className="overflow-y-auto flex-1 p-1 max-h-64">
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

                        <div className="bg-gradient-to-br from-indigo-50 to-blue-50 rounded-lg border-2 border-indigo-200 p-4 shadow-sm">
                            <h4 className="font-bold text-indigo-900 text-xs mb-1 uppercase tracking-wide">Resumen</h4>
                            <p className="text-indigo-700 text-xs font-medium">
                                {entries.length} {entries.length === 1 ? 'concepto' : 'conceptos'}
                            </p>
                        </div>
                    </div>

                    {/* Main Content - Entries List con formato de reporte - Ocupa más espacio */}
                    <div className="lg:col-span-4">
                        {entries.length === 0 ? (
                            <div className="bg-white rounded-xl shadow-sm border-2 border-slate-200 p-12 text-center">
                                <Camera size={64} className="mx-auto text-slate-300 mb-4" />
                                <p className="font-medium text-lg text-slate-500 mb-2">No hay conceptos en el reporte</p>
                                <p className="text-sm text-slate-400">Selecciona conceptos del menú lateral para comenzar.</p>
                            </div>
                        ) : (
                            <div className="space-y-8">
                                {entries.map((entry, index) => (
                                    <div key={entry.id} className="bg-white rounded-lg border-2 border-slate-400 overflow-hidden shadow-md">
                                        {/* Concepto Header - Formato del ejemplo */}
                                        <div className="bg-slate-200 border-b-2 border-slate-400 p-4">
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-4 flex-1">
                                                    <div className="w-12 h-12 bg-indigo-600 text-white rounded-full flex items-center justify-center font-bold text-xl shrink-0">
                                                        {index + 1}
                                                    </div>
                                                    <div className="flex-1">
                                                        <div className="text-xs font-bold text-slate-600 uppercase mb-1">{entry.itemCode}</div>
                                                        <h4 className="font-bold text-slate-900 text-lg">{entry.itemName}</h4>
                                                    </div>
                                                </div>
                                                <button
                                                    onClick={() => handleRemoveEntry(entry.id)}
                                                    className="text-slate-400 hover:text-red-500 transition p-2 hover:bg-red-50 rounded-lg ml-4"
                                                    title="Eliminar concepto"
                                                >
                                                    <Trash2 size={22} />
                                                </button>
                                            </div>
                                        </div>

                                        {/* Contenido del Concepto */}
                                        <div className="p-6">
                                            {/* Grid de Fotos - Exactamente 3 por línea como en el ejemplo */}
                                            <div className="mb-6">
                                                <label className="block text-xs font-bold text-slate-700 uppercase mb-4 tracking-wider">EVIDENCIA FOTOGRÁFICA</label>
                                                <div className="grid grid-cols-3 gap-4">
                                                    {entry.previewUrls.map((url, idx) => (
                                                        <div key={idx} className="relative group">
                                                            <div className="aspect-square rounded-lg overflow-hidden border-2 border-slate-500 shadow-md bg-slate-100">
                                                                <img src={url} className="w-full h-full object-cover" alt={`Foto ${idx + 1}`} />
                                                                <button
                                                                    onClick={() => {
                                                                        const newPreviewUrls = entry.previewUrls.filter((_, i) => i !== idx);
                                                                        const newPhotoUrls = entry.photoUrls ? entry.photoUrls.filter((_, i) => i !== idx) : [];
                                                                        const newCaptions = entry.photoCaptions ? entry.photoCaptions.filter((_, i) => i !== idx) : [];
                                                                        updateEntry(entry.id, 'previewUrls', newPreviewUrls);
                                                                        updateEntry(entry.id, 'photoUrls', newPhotoUrls);
                                                                        updateEntry(entry.id, 'photoCaptions', newCaptions);
                                                                    }}
                                                                    className="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-lg hover:bg-red-600 z-10"
                                                                    title="Eliminar foto"
                                                                >
                                                                    <X size={14} />
                                                                </button>
                                                            </div>
                                                            {/* Caption debajo de la foto - Formato del ejemplo - EDITABLE */}
                                                            <div className="mt-2">
                                                                <input
                                                                    type="text"
                                                                    value={entry.photoCaptions?.[idx] || ''}
                                                                    onChange={(e) => {
                                                                        const newCaptions = [...(entry.photoCaptions || [])];
                                                                        newCaptions[idx] = e.target.value;
                                                                        updateEntry(entry.id, 'photoCaptions', newCaptions);
                                                                    }}
                                                                    placeholder={`Descripción foto ${idx + 1}...`}
                                                                    className="w-full text-xs font-bold text-slate-800 text-center border-b-2 border-slate-400 pb-1 focus:outline-none focus:border-indigo-600 bg-transparent uppercase"
                                                                />
                                                            </div>
                                                        </div>
                                                    ))}
                                                    {/* Botón para agregar más fotos - Solo se muestra si hay menos de 3 fotos o si el total no es múltiplo de 3 */}
                                                    {entry.previewUrls.length % 3 !== 0 && (
                                                        <label className="aspect-square border-2 border-dashed border-slate-500 rounded-lg flex flex-col items-center justify-center cursor-pointer hover:bg-indigo-50 hover:border-indigo-600 transition text-slate-500 hover:text-indigo-600 bg-slate-100">
                                                            <Upload size={32} className="mb-2 text-indigo-600" />
                                                            <span className="text-xs font-bold">Subir</span>
                                                            <input
                                                                type="file"
                                                                accept="image/*"
                                                                multiple
                                                                className="hidden"
                                                                onChange={(e) => handleFileChange(entry.id, e)}
                                                            />
                                                        </label>
                                                    )}
                                                    {/* Si hay exactamente múltiplo de 3, mostrar botón en nueva fila */}
                                                    {entry.previewUrls.length > 0 && entry.previewUrls.length % 3 === 0 && (
                                                        <label className="aspect-square border-2 border-dashed border-slate-500 rounded-lg flex flex-col items-center justify-center cursor-pointer hover:bg-indigo-50 hover:border-indigo-600 transition text-slate-500 hover:text-indigo-600 bg-slate-100 col-span-3">
                                                            <Upload size={32} className="mb-2 text-indigo-600" />
                                                            <span className="text-xs font-bold">Subir más fotos</span>
                                                            <input
                                                                type="file"
                                                                accept="image/*"
                                                                multiple
                                                                className="hidden"
                                                                onChange={(e) => handleFileChange(entry.id, e)}
                                                            />
                                                        </label>
                                                    )}
                                                    {/* Si no hay fotos, mostrar botón de subir */}
                                                    {entry.previewUrls.length === 0 && (
                                                        <label className="aspect-square border-2 border-dashed border-slate-500 rounded-lg flex flex-col items-center justify-center cursor-pointer hover:bg-indigo-50 hover:border-indigo-600 transition text-slate-500 hover:text-indigo-600 bg-slate-100">
                                                            <Upload size={32} className="mb-2 text-indigo-600" />
                                                            <span className="text-xs font-bold">Subir</span>
                                                            <input
                                                                type="file"
                                                                accept="image/*"
                                                                multiple
                                                                className="hidden"
                                                                onChange={(e) => handleFileChange(entry.id, e)}
                                                            />
                                                        </label>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Descripción del Concepto */}
                                            <div className="mb-4">
                                                <label className="block text-xs font-bold text-slate-700 uppercase mb-2 tracking-wider">DESCRIPCIÓN / OBSERVACIONES</label>
                                                <textarea
                                                    value={entry.description}
                                                    onChange={(e) => updateEntry(entry.id, 'description', e.target.value)}
                                                    className="w-full border-2 border-slate-400 rounded-lg p-4 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-600 outline-none resize-none h-28 font-medium"
                                                    placeholder="Describe los trabajos realizados para este concepto..."
                                                />
                                            </div>

                                            {/* Checkbox de Completado */}
                                            <div className="flex items-center gap-3 bg-slate-50 p-3 rounded-lg border border-slate-200">
                                                <button
                                                    onClick={() => updateEntry(entry.id, 'isCompleted', !entry.isCompleted)}
                                                    className={`w-6 h-6 rounded border-2 flex items-center justify-center transition ${
                                                        entry.isCompleted
                                                            ? 'bg-green-500 border-green-600 text-white'
                                                            : 'bg-white border-slate-400 text-transparent hover:border-green-500'
                                                    }`}
                                                >
                                                    <Check size={16} strokeWidth={3} />
                                                </button>
                                                <span className="text-sm font-bold text-slate-700">Marcar como Terminado (100%)</span>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Footer con Firmas - Formato del ejemplo - TODOS LOS CAMPOS EDITABLES */}
                        {entries.length > 0 && (
                            <div className="mt-8 bg-white border-2 border-slate-400 rounded-lg p-8 shadow-lg">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
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
        </div>
    );
};

export default PhotographicReportPage;

