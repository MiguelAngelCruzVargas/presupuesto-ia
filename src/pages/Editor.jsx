import React, { useState, useMemo, useCallback } from 'react';
import { Save, Bot, Sparkles, AlertTriangle, FileText, X, FolderOpen, Database, Trash2, Plus, Printer, Package, Ruler, Calendar, Calculator, Edit, Info, Camera, Share2, Upload, Wand2 } from 'lucide-react';
import Card from '../components/ui/Card';
import Badge from '../components/ui/Badge';
import { useProject } from '../context/ProjectContext';
import { useSubscription } from '../context/SubscriptionContext';
import LimitModal from '../components/subscription/LimitModal';
import { formatCurrency, numberToWords } from '../utils/format';
import { generateId } from '../utils/helpers';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import SupabaseService from '../services/SupabaseService';
import ProjectPersistenceService from '../services/ProjectPersistenceService';
import { AIBudgetService } from '../services/AIBudgetService';
import { ValidationService } from '../services/ValidationService';
import { ErrorService } from '../services/ErrorService';
import { PDFService } from '../services/PDFService';
import { APUService } from '../services/APUService';
import AIPriceHelper from '../components/ai/AIPriceHelper';
import AIDescriptionGenerator from '../components/ai/AIDescriptionGenerator';
import APUModal from '../components/budget/APUModal';
import GeneratorModal from '../components/budget/GeneratorModal';
import ScheduleGenerator from '../components/schedule/ScheduleGenerator';
import MaterialGenerator from '../components/materials/MaterialGenerator';
import CreateTemplateModal from '../components/templates/CreateTemplateModal';
import PDFPreviewModal from '../components/budget/PDFPreviewModal';
import BudgetAnalysisModal from '../components/budget/BudgetAnalysisModal';
import ShareProjectModal from '../components/sharing/ShareProjectModal';
import TechnicalDescriptionViewer from '../components/budget/TechnicalDescriptionViewer';
import CostConceptsModal from '../components/budget/CostConceptsModal';

import ConfirmModal from '../components/ui/ConfirmModal';

import { useParams, useNavigate, useLocation } from 'react-router-dom';

const Editor = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const location = useLocation();
    const isDemoMode = location.pathname === '/demo';
    const {
        projectInfo, setProjectInfo, items, setItems, saveBudget,
        calculateSubtotal, calculateTotal, getCalculations, showToast, catalog
    } = useProject();
    const { checkLimit, incrementUsage, isPro } = useSubscription();

    const [aiPrompt, setAiPrompt] = useState('');
    const [isAiLoading, setIsAiLoading] = useState(false);
    const [showAnalysisModal, setShowAnalysisModal] = useState(false);
    const [technicalDescription, setTechnicalDescription] = useState('');
    const [isWritingDesc, setIsWritingDesc] = useState(false);
    const [showAIDescModal, setShowAIDescModal] = useState(false);

    const [currentEditingItem, setCurrentEditingItem] = useState(null);
    const [materialList, setMaterialList] = useState([]);
    const [materialAssumptions, setMaterialAssumptions] = useState([]);

    const [showAPUModal, setShowAPUModal] = useState(false);
    const [currentAPUItem, setCurrentAPUItem] = useState(null);
    const [apuData, setApuData] = useState(null);
    const [isGeneratingAPU, setIsGeneratingAPU] = useState(false);

    const [showGeneratorModal, setShowGeneratorModal] = useState(false);
    const [currentGeneratorItem, setCurrentGeneratorItem] = useState(null);

    const [scheduleData, setScheduleData] = useState(null);

    const [showTemplateModal, setShowTemplateModal] = useState(false);
    const [showPDFPreview, setShowPDFPreview] = useState(false);
    const [showShareModal, setShowShareModal] = useState(false);
    const [showCostConceptsModal, setShowCostConceptsModal] = useState(false);
    const [currentCostConcept, setCurrentCostConcept] = useState(null);


    // Nuevos estados para Importar PDF y Ajustar Total
    const [isImporting, setIsImporting] = useState(false);
    const [showAdjustModal, setShowAdjustModal] = useState(false);
    const [targetTotal, setTargetTotal] = useState('');
    const [importedItemsCandidate, setImportedItemsCandidate] = useState(null); // Items extraídos par mostrar modal de confirmar
    const [showImportConfirmModal, setShowImportConfirmModal] = useState(false);


    // Subscription limits
    const [limitModal, setLimitModal] = useState({
        isOpen: false,
        actionType: null,
        usage: 0,
        limit: 0
    });

    // Auto-load project from URL
    React.useEffect(() => {
        if (id && id !== projectInfo.id && !isDemoMode) {
            const loadProjectFromUrl = async () => {
                try {
                    const fullData = await ProjectPersistenceService.loadProjectFromUrl(id);
                    if (fullData) {
                        // Normalizar projectInfo para asegurar que todos los campos tengan valores por defecto
                        const normalizedProjectInfo = {
                            id: fullData.projectInfo?.id || generateId(),
                            client: fullData.projectInfo?.client || '',
                            project: fullData.projectInfo?.project || 'Presupuesto Nuevo',
                            date: fullData.projectInfo?.date || new Date().toISOString().split('T')[0],
                            currency: fullData.projectInfo?.currency || 'MXN',
                            taxRate: fullData.projectInfo?.taxRate ?? 16,
                            type: fullData.projectInfo?.type || 'General',
                            indirect_percentage: fullData.projectInfo?.indirect_percentage ?? 0,
                            profit_percentage: fullData.projectInfo?.profit_percentage ?? 0,
                            location: fullData.projectInfo?.location || 'México'
                        };
                        setProjectInfo(normalizedProjectInfo);
                        setItems(fullData.items || []);
                        setMaterialList(fullData.materialList || []);
                        setMaterialAssumptions(fullData.materialAssumptions || []);
                        setTechnicalDescription(fullData.technicalDescription || '');
                        setApuData(fullData.apuData || null);
                        setScheduleData(fullData.scheduleData || null);

                        showToast('Proyecto cargado', 'success');
                    } else {
                        // Proyecto no encontrado o no tiene permisos
                        showToast('Proyecto no encontrado o no tienes permisos para acceder', 'error');
                        navigate('/dashboard');
                    }
                } catch (error) {
                    console.error('Error loading project from URL:', error);
                    const errorMessage = error.message?.includes('permisos') || error.message?.includes('permission')
                        ? 'No tienes permisos para acceder a este proyecto'
                        : 'Error al cargar el proyecto. Puede que no exista o no tengas permisos.';
                    showToast(errorMessage, 'error');
                    // Redirigir al dashboard si hay error de permisos
                    if (error.message?.includes('permisos') || error.message?.includes('permission')) {
                        setTimeout(() => navigate('/dashboard'), 2000);
                    }
                }
            };
            loadProjectFromUrl();
        }
    }, [id, projectInfo.id, setProjectInfo, setItems, showToast, isDemoMode, navigate]);

    // Check for pending PDF import from PDFEditorModal
    React.useEffect(() => {
        const pendingImport = localStorage.getItem('pendingPDFImport');
        if (pendingImport) {
            try {
                const data = JSON.parse(pendingImport);

                // Cargar datos del PDF
                if (data.projectInfo) {
                    setProjectInfo({
                        ...projectInfo,
                        ...data.projectInfo
                    });
                }

                if (data.items && Array.isArray(data.items)) {
                    setItems(data.items);
                }

                // Limpiar localStorage
                localStorage.removeItem('pendingPDFImport');

                showToast(`✅ Presupuesto cargado desde PDF: ${data.items.length} conceptos`, 'success');
            } catch (error) {
                console.error('Error loading pending PDF import:', error);
                localStorage.removeItem('pendingPDFImport');
            }
        }
    }, []); // Solo ejecutar una vez al montar

    // Persistence Logic (Supabase)
    const [showLoadModal, setShowLoadModal] = useState(false);
    const [savedProjects, setSavedProjects] = useState([]);
    const [deleteConfirmId, setDeleteConfirmId] = useState(null);
    const [isSaving, setIsSaving] = useState(false);
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
    const [lastSaved, setLastSaved] = useState(null);
    const [isAutoSaving, setIsAutoSaving] = useState(false);
    const savedStateRef = React.useRef(null);

    // Confirm Modal State
    const [confirmModal, setConfirmModal] = useState({
        isOpen: false,
        title: '',
        message: '',
        onConfirm: () => { },
        type: 'warning',
        confirmText: 'Confirmar'
    });

    const closeConfirmModal = () => setConfirmModal(prev => ({ ...prev, isOpen: false }));

    const handleSaveProject = async (isAuto = false) => {
        setIsAutoSaving(isAuto);
        // En modo demo, mostrar mensaje y redirigir a registro
        if (isDemoMode) {
            setConfirmModal({
                isOpen: true,
                title: 'Modo Demo',
                message: 'Para guardar proyectos necesitas crear una cuenta gratuita. ¿Te gustaría registrarte ahora?',
                confirmText: 'Crear Cuenta',
                type: 'info',
                onConfirm: () => {
                    navigate('/login');
                    closeConfirmModal();
                }
            });
            return;
        }

        if (!projectInfo.project) {
            showToast('Ingresa un nombre para el proyecto antes de guardar', 'warning');
            return;
        }

        // Verificar límite de presupuestos (solo si es un proyecto nuevo)
        if (!isPro && !projectInfo.id?.startsWith('demo-')) {
            // Verificar si ya existe en la base de datos
            const isNewProject = !id || id === projectInfo.id;

            if (isNewProject) {
                const limitCheck = await checkLimit('budgets');
                if (!limitCheck.allowed) {
                    setLimitModal({
                        isOpen: true,
                        actionType: 'budgets',
                        usage: limitCheck.current,
                        limit: limitCheck.limit
                    });
                    return;
                }
            }
        }

        setIsSaving(true);
        try {
            const projectData = {
                id: projectInfo.id,
                projectInfo,
                items,
                scheduleData,
                materialList,
                materialAssumptions,
                technicalDescription,
                apuData
            };

            const saved = await ProjectPersistenceService.saveProject(projectData);
            const wasNewProject = !id || id === projectInfo.id;

            setProjectInfo(prev => ({ ...prev, id: saved.id }));

            // Incrementar contador si es un proyecto nuevo
            if (!isPro && wasNewProject) {
                await incrementUsage('budgets');
            }

            const successMessage = isAutoSaving ? 'Guardado automático' : 'Proyecto y cronograma guardados';
            if (!isAutoSaving) {
                showToast(successMessage, 'success');
            }
            setHasUnsavedChanges(false);
            setLastSaved(new Date());
            savedStateRef.current = JSON.stringify({ projectInfo, items, scheduleData, materialList, materialAssumptions, technicalDescription, apuData });
        } catch (error) {
            console.error('Error al guardar proyecto:', error);
            if (!isAutoSaving) {
                showToast('Error al guardar el proyecto', 'error');
            }
        } finally {
            setIsSaving(false);
            setIsAutoSaving(false);
        }
    };

    const [projectToLoad, setProjectToLoad] = useState(null);

    // Rastrear cambios sin guardar
    React.useEffect(() => {
        const currentState = JSON.stringify({ projectInfo, items, scheduleData, materialList, materialAssumptions, technicalDescription, apuData });

        if (savedStateRef.current === null) {
            // Estado inicial - guardar como referencia
            savedStateRef.current = currentState;
            setHasUnsavedChanges(false);
        } else if (savedStateRef.current !== currentState) {
            setHasUnsavedChanges(true);
        }
    }, [projectInfo, items, scheduleData, materialList, materialAssumptions, technicalDescription, apuData]);

    // Ajustar alturas de textareas después del render
    React.useEffect(() => {
        const adjustTextareaHeights = () => {
            const textareas = document.querySelectorAll('textarea[data-item-id]');
            textareas.forEach(textarea => {
                if (textarea.value) {
                    textarea.style.height = 'auto';
                    textarea.style.height = Math.min(textarea.scrollHeight, 200) + 'px';
                }
            });
        };

        // Ajustar después de un pequeño delay para asegurar que el DOM esté actualizado
        const timeoutId = setTimeout(adjustTextareaHeights, 100);
        return () => clearTimeout(timeoutId);
    }, [items]);

    // Autoguardado automático cada 30 segundos
    React.useEffect(() => {
        if (isDemoMode || !projectInfo.project || !hasUnsavedChanges) return;

        const autoSaveInterval = setInterval(() => {
            if (hasUnsavedChanges && !isSaving && !isAutoSaving) {
                handleSaveProject(true);
            }
        }, 30000); // 30 segundos

        return () => clearInterval(autoSaveInterval);
    }, [hasUnsavedChanges, isSaving, isAutoSaving, isDemoMode, projectInfo.project]);

    // Confirmación al salir si hay cambios sin guardar
    React.useEffect(() => {
        const handleBeforeUnload = (e) => {
            if (hasUnsavedChanges && !isDemoMode) {
                e.preventDefault();
                e.returnValue = 'Tienes cambios sin guardar. ¿Estás seguro de que quieres salir?';
                return e.returnValue;
            }
        };

        window.addEventListener('beforeunload', handleBeforeUnload);
        return () => window.removeEventListener('beforeunload', handleBeforeUnload);
    }, [hasUnsavedChanges, isDemoMode]);

    // Resetear estado al cargar proyecto
    React.useEffect(() => {
        if (id && projectInfo.id) {
            savedStateRef.current = JSON.stringify({ projectInfo, items, scheduleData, materialList, materialAssumptions, technicalDescription, apuData });
            setHasUnsavedChanges(false);
            setLastSaved(new Date());
        }
    }, [id]); // Solo cuando cambia el ID del proyecto

    const handleOpenLoadModal = async () => {
        console.log('handleOpenLoadModal llamado');
        // Abrir modal inmediatamente
        setShowLoadModal(true);
        console.log('Modal abierto, showLoadModal = true');
        setIsSaving(true);

        // Cargar proyectos en segundo plano
        try {
            console.log('Cargando proyectos...');
            const projects = await ProjectPersistenceService.listProjects();
            console.log('Proyectos cargados:', projects);
            setSavedProjects(projects || []);
        } catch (error) {
            console.error('Error al cargar proyectos:', error);
            setSavedProjects([]);
            showToast('Error al cargar lista de proyectos', 'error');
        } finally {
            setIsSaving(false);
        }
    };

    const handleLoadProject = async (project) => {
        // Guardar el proyecto que se quiere cargar y mostrar confirmación
        setProjectToLoad(project);
        setConfirmModal({
            isOpen: true,
            title: 'Cargar Proyecto',
            message: `¿Cargar "${project.projectInfo?.project || 'Sin Nombre'}"? Se perderán los cambios no guardados del proyecto actual.`,
            confirmText: 'Cargar',
            type: 'warning',
            onConfirm: async () => {
                try {
                    const fullData = await ProjectPersistenceService.loadProject(project.id);
                    if (fullData) {
                        // Normalizar projectInfo para asegurar que todos los campos tengan valores por defecto
                        const normalizedProjectInfo = {
                            id: fullData.projectInfo?.id || generateId(),
                            client: fullData.projectInfo?.client || '',
                            project: fullData.projectInfo?.project || 'Presupuesto Nuevo',
                            date: fullData.projectInfo?.date || new Date().toISOString().split('T')[0],
                            currency: fullData.projectInfo?.currency || 'MXN',
                            taxRate: fullData.projectInfo?.taxRate ?? 16,
                            type: fullData.projectInfo?.type || 'General',
                            indirect_percentage: fullData.projectInfo?.indirect_percentage ?? 0,
                            profit_percentage: fullData.projectInfo?.profit_percentage ?? 0,
                            location: fullData.projectInfo?.location || 'México'
                        };
                        setProjectInfo(normalizedProjectInfo);
                        setItems(fullData.items || []);
                        setScheduleData(fullData.scheduleData || null);
                        setMaterialList(fullData.materialList || []);
                        setMaterialAssumptions(fullData.materialAssumptions || []);
                        setTechnicalDescription(fullData.technicalDescription || '');
                        setApuData(fullData.apuData || null);
                        setShowLoadModal(false);
                        showToast('Proyecto cargado exitosamente', 'success');
                    }
                } catch (error) {
                    console.error('Error loading project:', error);
                    showToast('Error al cargar el proyecto', 'error');
                } finally {
                    closeConfirmModal();
                    setProjectToLoad(null);
                }
            }
        });
    };

    const handleDeleteProject = async (id, e) => {
        e.stopPropagation();
        setDeleteConfirmId(id);
        setConfirmModal({
            isOpen: true,
            title: 'Eliminar Proyecto',
            message: '¿Estás seguro de eliminar este proyecto? Esta acción no se puede deshacer.',
            confirmText: 'Eliminar',
            type: 'danger',
            onConfirm: async () => {
                try {
                    await ProjectPersistenceService.deleteProject(id);
                    // Actualizar lista local inmediatamente
                    setSavedProjects(savedProjects.filter(p => p.id !== id));
                    // Recargar lista completa desde el servidor para asegurar sincronización
                    const updatedProjects = await ProjectPersistenceService.listProjects();
                    setSavedProjects(updatedProjects || []);
                    showToast('Proyecto eliminado', 'success');
                } catch (error) {
                    console.error(error);
                    showToast('Error al eliminar proyecto', 'error');
                } finally {
                    closeConfirmModal();
                }
            }
        });
    };

    const handleRenameProject = async (project, e) => {
        e.stopPropagation();
        const newName = prompt('Nuevo nombre del proyecto:', project.projectInfo?.project);
        if (newName && newName !== project.projectInfo?.project) {
            try {
                await ProjectPersistenceService.renameProject(project.id, newName);
                // Actualizar en la lista local
                setSavedProjects(savedProjects.map(p =>
                    p.id === project.id
                        ? { ...p, projectInfo: { ...p.projectInfo, project: newName } }
                        : p
                ));
                showToast('Proyecto renombrado', 'success');
            } catch (error) {
                console.error(error);
                showToast('Error al renombrar proyecto', 'error');
            }
        }
    };

    // Handler para cuando se genera un cronograma
    const handleScheduleGenerated = (data) => {
        setScheduleData(data);
    };

    const generateBudgetFromAI = async () => {
        if (!aiPrompt.trim()) return;

        // Verificar límite de generaciones con IA
        if (!isPro) {
            const limitCheck = await checkLimit('aiGenerations');
            if (!limitCheck.allowed) {
                setLimitModal({
                    isOpen: true,
                    actionType: 'aiGenerations',
                    usage: limitCheck.current,
                    limit: limitCheck.limit
                });
                return;
            }
        }

        setIsAiLoading(true);
        try {
            const generatedItems = await AIBudgetService.generateBudgetFromPrompt(aiPrompt, projectInfo);
            setItems(generatedItems);

            // Incrementar contador de uso
            if (!isPro) {
                await incrementUsage('aiGenerations');
            }

            setAiPrompt('');
            showToast('Presupuesto generado con éxito', 'success');
        } catch (error) {
            console.error(error);
            showToast('Error al generar presupuesto', 'error');
        } finally {
            setIsAiLoading(false);
        }
    };

    const generateTechnicalDescription = async () => {
        if (items.length === 0) {
            showToast('Agrega partidas primero', 'warning');
            return;
        }
        setIsWritingDesc(true);
        try {
            const desc = await AIBudgetService.generateTechnicalDescription(items, projectInfo);
            setTechnicalDescription(desc);
            // Marcar que hay cambios para que el autoguardado la guarde
            setHasUnsavedChanges(true);
            showToast('Memoria descriptiva generada. Se guardará automáticamente.', 'success');
        } catch (error) {
            console.error(error);
            showToast('Error al generar memoria', 'error');
        } finally {
            setIsWritingDesc(false);
        }
    };

    const handleExportPDF = () => {
        // Mostrar vista previa primero
        setShowPDFPreview(true);
    };

    const exportToPDF = async () => {
        try {
            const calc = getCalculations();
            const doc = new jsPDF();
            await PDFService.generateBudgetPDF(doc, {
                projectInfo,
                items,
                subtotal: calc.subtotal,
                indirectCosts: calc.indirectCosts,
                profit: calc.profit,
                tax: calc.tax,
                total: calc.total,
                technicalDescription
            });
            doc.save(`Presupuesto_${projectInfo.project || 'SinNombre'}.pdf`);
            setShowPDFPreview(false);
            showToast('PDF exportado correctamente', 'success');
        } catch (error) {
            console.error(error);
            showToast('Error al exportar PDF', 'error');
        }
    };

    // Callback cuando se generan o actualizan materiales desde MaterialGenerator
    const handleMaterialsGenerated = useCallback((materials, assumptions) => {
        setMaterialList(materials || []);
        setMaterialAssumptions(assumptions || []);
        // El autoguardado se encargará automáticamente de guardar cuando cambien estos estados
    }, []);

    const handleGenerateAPU = async (item, forceRegenerate = false) => {
        if (isGeneratingAPU) return;

        // Si ya existe un APU guardado y no se fuerza regenerar, mostrarlo directamente
        if (!forceRegenerate && item.apuData) {
            try {
                const loadedData = APUService.normalizeAPUData(item.apuData);
                setApuData(loadedData);
                setCurrentAPUItem(item);
                setShowAPUModal(true);
                return;
            } catch (error) {
                console.error('Error loading saved APU:', error);
                // Si hay error al cargar, continuar con la generación
            }
        }

        setIsGeneratingAPU(true);
        setCurrentAPUItem(item);
        try {
            const data = await AIBudgetService.generateAPU(item, projectInfo);
            setApuData(data);
            setShowAPUModal(true);

            // Guardar automáticamente el APU generado en el item
            const updatedItems = items.map(i =>
                i.id === item.id
                    ? {
                        ...i,
                        apuData: APUService.exportAPUData(data)
                    }
                    : i
            );
            setItems(updatedItems);

            showToast('APU generado y guardado automáticamente', 'success');
        } catch (error) {
            console.error('Error generating APU:', error);

            // Mensaje más específico según el tipo de error
            let errorMessage = 'Error al generar APU';

            if (error.message?.includes('sobrecargado') || error.message?.includes('overloaded')) {
                errorMessage = 'El servicio de IA está sobrecargado. Espera 30-60 segundos e intenta de nuevo.';
            } else if (error.message?.includes('límite') || error.message?.includes('limit') || error.message?.includes('quota')) {
                errorMessage = 'Has alcanzado el límite de uso. Intenta más tarde.';
            } else if (error.message?.includes('conexión') || error.message?.includes('conect')) {
                errorMessage = 'Error de conexión con el servicio de IA. Verifica tu internet.';
            } else if (error.message) {
                errorMessage = error.message;
            }

            showToast(errorMessage, 'error', error);
        } finally {
            setIsGeneratingAPU(false);
        }
    };

    const handleApplyAPUPrice = (price, analysis) => {
        if (currentAPUItem && apuData) {
            // Validar datos APU antes de aplicar
            const validation = APUService.validateAPUData(apuData);
            if (!validation.valid) {
                console.warn('APU validation errors:', validation.errors);
                showToast('Advertencia: El APU tiene algunos errores de validación', 'warning');
            }

            // Calcular precio final usando el servicio
            const finalPrice = APUService.calculateFinalPrice(apuData);
            const priceToApply = price || finalPrice;

            setItems(items.map(i =>
                i.id === currentAPUItem.id
                    ? {
                        ...i,
                        unitPrice: priceToApply,
                        calculation_basis: 'APU Detallado',
                        apuData: APUService.exportAPUData(apuData) // Guardar APU completo para referencia
                    }
                    : i
            ));
            showToast('Precio actualizado desde APU', 'success');
            setShowAPUModal(false);
        }
    };

    const handleOpenGenerator = (item) => {
        setCurrentGeneratorItem(item);
        setShowGeneratorModal(true);
    };

    const handleApplyGenerator = (quantity, calculation) => {
        if (currentGeneratorItem) {
            setItems(items.map(i => i.id === currentGeneratorItem.id ? { ...i, quantity, calculation_basis: calculation } : i));
            showToast('Cantidad actualizada', 'success');
            setShowGeneratorModal(false);
        }
    };

    const analyzeBudget = () => {
        if (items.length === 0) {
            showToast('Agrega partidas primero para analizar', 'warning');
            return;
        }
        setShowAnalysisModal(true);
    };

    const handleSaveToBitacora = async () => {
        if (!projectInfo.id) {
            showToast('Guarda el proyecto antes de ir a la bitácora', 'warning');
            return;
        }

        // Save first
        await handleSaveProject();

        // Navigate
        navigate(`/project/${projectInfo.id}/bitacora`);
    };

    const handleCreateTemplate = () => {
        if (!projectInfo.id) {
            showToast('Guarda el proyecto primero', 'warning');
            return;
        }
        setShowTemplateModal(true);
    };

    const handleUpdateItem = (id, field, value) => {
        const item = items.find(i => i.id === id);
        if (!item) return;

        const updatedValue = field === 'quantity' || field === 'unitPrice'
            ? ValidationService.validateNumber(value, { min: 0, allowNegative: false }) ?? 0
            : value;

        // Si está cambiando la unidad, recalcular para mantener el total constante
        if (field === 'unit' && value !== item.unit && value.trim() !== '') {
            const oldUnit = item.unit || '';
            const newUnit = value.trim();
            const currentQuantity = item.quantity || 0;
            const currentUnitPrice = item.unitPrice || 0;
            const currentTotal = currentQuantity * currentUnitPrice;

            // Factores de conversión comunes
            const conversionFactors = {
                'm²->m': (oldUnit === 'm²' || oldUnit === 'm2') && (newUnit === 'm' || newUnit === 'ml') ? 1 : null,
                'm->m²': (oldUnit === 'm' || oldUnit === 'ml') && (newUnit === 'm²' || newUnit === 'm2') ? 1 : null,
                'm³->m²': (oldUnit === 'm³' || oldUnit === 'm3') && (newUnit === 'm²' || newUnit === 'm2') ? 5 : null,
                'm²->m³': (oldUnit === 'm²' || oldUnit === 'm2') && (newUnit === 'm³' || newUnit === 'm3') ? 0.2 : null,
            };

            let conversionFactor = null;
            for (const [key, factor] of Object.entries(conversionFactors)) {
                if (factor !== null) {
                    conversionFactor = factor;
                    break;
                }
            }

            let newQuantity = currentQuantity;
            let newUnitPrice = currentUnitPrice;

            if (conversionFactor && currentQuantity > 0 && currentUnitPrice > 0) {
                newQuantity = currentQuantity * conversionFactor;
                newUnitPrice = currentUnitPrice / conversionFactor;
            } else {
                newUnitPrice = 0;
            }

            setItems(items.map(x =>
                x.id === id
                    ? {
                        ...x,
                        unit: newUnit,
                        quantity: newQuantity,
                        unitPrice: newUnitPrice
                    }
                    : x
            ));

            if (item.apuData) {
                showToast(`⚠️ Unidad cambiada a ${newUnit}. El precio se ha reiniciado. Regenera el APU.`, 'warning');
            } else if (currentTotal > 0) {
                if (conversionFactor) {
                    showToast(`Unidad cambiada. Cantidad y precio recalculados.`, 'success');
                } else {
                    showToast(`Unidad cambiada. El precio se ha reiniciado a $0.`, 'info');
                }
            }
        } else {
            setItems(items.map(x => x.id === id ? { ...x, [field]: updatedValue } : x));
        }
    };

    // ==========================================
    // NUEVAS FUNCIONES: IMPORTAR PDF Y AJUSTAR
    // ==========================================

    const handleImportPDF = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        setIsImporting(true);
        const formData = new FormData();
        formData.append('file', file);

        try {
            const serverUrl = '/api/ai/extract-pdf';

            const uploadRes = await fetch(serverUrl, {
                method: 'POST',
                body: formData
            });

            if (!uploadRes.ok) {
                const err = await uploadRes.json();
                throw new Error(err.error || 'Error al subir archivo');
            }

            const data = await uploadRes.json();

            if (data.success && Array.isArray(data.items)) {
                // Validación y normalización de items
                const validItems = data.items.map(item => ({
                    id: generateId(),
                    description: item.description || 'Sin descripción',
                    unit: item.unit || 'pza',
                    quantity: parseFloat(item.quantity) || 0,
                    unitPrice: parseFloat(item.unitPrice) || 0,
                    category: item.category || 'Materiales'
                }));

                // Guardar datos extraídos para el modal de confirmación
                setImportedItemsCandidate(validItems);

                // Guardar metadatos del proyecto si existen
                if (data.projectInfo) {
                    // Guardamos temporalmente para mostrar en el modal
                    window.__importedProjectInfo = data.projectInfo;
                }

                if (data.totals) {
                    window.__importedTotals = data.totals;
                }

                setShowImportConfirmModal(true);

                // Mostrar resumen en consola
                console.log('📄 PDF Importado:');
                console.log(`  - Items: ${validItems.length}`);
                if (data.projectInfo?.project) {
                    console.log(`  - Proyecto: ${data.projectInfo.project}`);
                }
                if (data.projectInfo?.client) {
                    console.log(`  - Cliente: ${data.projectInfo.client}`);
                }
                if (data.totals?.total) {
                    console.log(`  - Total: $${data.totals.total.toLocaleString('es-MX')}`);
                }
            } else {
                throw new Error('Formato de respuesta inválido');
            }

        } catch (error) {
            console.error(error);
            showToast(error.message || 'Error al importar PDF', 'error');
        } finally {
            setIsImporting(false);
            e.target.value = null; // Reset input
        }
    };

    const confirmImport = (mode) => {
        if (!importedItemsCandidate) return;

        // Importar items
        if (mode === 'replace') {
            setItems(importedItemsCandidate);
        } else {
            setItems([...items, ...importedItemsCandidate]);
        }

        // Importar metadatos del proyecto si están disponibles y el modo es 'replace'
        if (mode === 'replace' && window.__importedProjectInfo) {
            const imported = window.__importedProjectInfo;
            setProjectInfo({
                ...projectInfo,
                project: imported.project || projectInfo.project,
                client: imported.client || projectInfo.client,
                location: imported.location || projectInfo.location,
                taxRate: imported.taxRate ?? projectInfo.taxRate,
                indirect_percentage: imported.indirect_percentage ?? projectInfo.indirect_percentage,
                profit_percentage: imported.profit_percentage ?? projectInfo.profit_percentage
            });

            showToast(
                `✅ ${importedItemsCandidate.length} partidas importadas + metadatos del proyecto`,
                'success'
            );
        } else {
            showToast(
                `✅ ${importedItemsCandidate.length} partidas ${mode === 'replace' ? 'importadas' : 'agregadas'}`,
                'success'
            );
        }

        // Limpiar datos temporales
        setImportedItemsCandidate(null);
        delete window.__importedProjectInfo;
        delete window.__importedTotals;
        setShowImportConfirmModal(false);
    };

    const handleAdjustTotal = () => {
        if (!targetTotal) return;
        const target = parseFloat(targetTotal);
        if (isNaN(target) || target <= 0) {
            showToast('Ingresa un monto vÃ¡lido', 'warning');
            return;
        }

        const currentCalcs = getCalculations();
        const currentTotal = currentCalcs.total; // Total con IVA

        if (currentTotal === 0) {
            showToast('El total actual es 0, no se puede ajustar proporcionalmente', 'warning');
            return;
        }

        const factor = target / currentTotal;

        const newItems = items.map(item => ({
            ...item,
            unitPrice: item.unitPrice * factor
        }));

        setItems(newItems);
        showToast(`Presupuesto ajustado a ${formatCurrency(target)}`, 'success');
        setShowAdjustModal(false);
        setTargetTotal('');
    };

    return (
        <div className="space-y-6 animate-fadeIn pb-20">
            {/* Header Editor */}
            {/* Header Editor */}
            <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 space-y-6">
                {/* Top Row: Project Name & Actions */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div className="flex-1 w-full md:w-auto">
                        <label className="block text-xs font-bold text-slate-400 dark:text-slate-400 uppercase mb-1">Proyecto</label>
                        <input
                            value={projectInfo.project || ''}
                            onChange={(e) => setProjectInfo({ ...projectInfo, project: e.target.value })}
                            className="w-full font-bold text-2xl text-slate-800 dark:text-slate-100 bg-transparent border-b border-transparent hover:border-slate-200 dark:hover:border-slate-600 focus:border-blue-500 outline-none placeholder-slate-300 dark:placeholder-slate-500 transition-colors"
                            placeholder="Nombre del Proyecto"
                        />
                    </div>
                    <div className="flex gap-2 self-end md:self-center items-center">
                        {/* Indicador de cambios sin guardar */}
                        {hasUnsavedChanges && !isDemoMode && (
                            <div className="flex items-center gap-2 px-3 py-1.5 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 rounded-lg text-sm font-medium border border-amber-300 dark:border-amber-700">
                                <div className="w-2 h-2 bg-amber-500 rounded-full animate-pulse"></div>
                                Sin guardar
                                {isAutoSaving && <span className="text-xs">(Guardando...)</span>}
                            </div>
                        )}
                        {lastSaved && !hasUnsavedChanges && !isDemoMode && (
                            <div className="text-xs text-slate-500 dark:text-slate-400 hidden md:block">
                                Guardado {lastSaved.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}
                            </div>
                        )}
                        <button
                            onClick={() => handleSaveProject(false)}
                            disabled={isSaving || isAutoSaving}
                            className={`flex items-center gap-2 ${isDemoMode ? 'bg-amber-500 hover:bg-amber-600' : 'bg-blue-600 hover:bg-blue-700'} text-white px-4 py-2 rounded-lg transition shadow-sm font-medium ${isSaving || isAutoSaving ? 'opacity-50 cursor-not-allowed' : ''}`}
                            title={isDemoMode ? 'Crear cuenta para guardar' : isAutoSaving ? 'Guardando automáticamente...' : hasUnsavedChanges ? 'Guardar cambios' : 'Guardar en Nube'}
                        >
                            {isSaving || isAutoSaving ? (
                                <div className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full" />
                            ) : (
                                <Save size={18} />
                            )}
                            <span className="hidden md:inline">
                                {isDemoMode ? 'Guardar (Requiere Cuenta)' : isAutoSaving ? 'Guardando...' : 'Guardar'}
                            </span>
                        </button>

                        <button
                            onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                console.log('Botón Abrir clickeado');
                                handleOpenLoadModal();
                            }}
                            className="flex items-center gap-2 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 px-4 py-2 rounded-lg transition"
                            title="Abrir Proyecto"
                        >
                            <FolderOpen size={18} />
                            <span className="hidden md:inline">Abrir</span>
                        </button>
                        <button
                            onClick={handleCreateTemplate}
                            className="flex items-center gap-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 px-4 py-2 rounded-lg transition"
                            title="Guardar como Plantilla"
                        >
                            <FileText size={18} />
                            <span className="hidden md:inline">Plantilla</span>
                        </button>
                        <button
                            onClick={() => {
                                if (!projectInfo.id || projectInfo.id.startsWith('demo-')) {
                                    showToast('Guarda el proyecto primero antes de compartirlo', 'warning');
                                    return;
                                }
                                setShowShareModal(true);
                            }}
                            className="flex items-center gap-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-600 px-4 py-2 rounded-lg transition"
                            title="Compartir con Cliente"
                        >
                            <Share2 size={18} />
                            <span className="hidden md:inline">Compartir</span>
                        </button>
                    </div>
                </div>

                {/* Bottom Row: Details Grid */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6 pt-4 border-t border-slate-100">
                    <div className="md:col-span-1">
                        <label className="block text-xs font-bold text-slate-400 dark:text-slate-500 uppercase mb-1">Cliente</label>
                        <input
                            value={projectInfo.client || ''}
                            onChange={(e) => setProjectInfo({ ...projectInfo, client: e.target.value })}
                            className="w-full text-slate-600 dark:text-slate-300 bg-transparent border-b border-slate-200 dark:border-slate-600 focus:border-blue-500 outline-none py-1"
                            placeholder="Cliente"
                        />
                    </div>
                    <div className="md:col-span-1">
                        <label className="block text-xs font-bold text-slate-400 dark:text-slate-500 uppercase mb-1">Ubicación</label>
                        <input
                            value={projectInfo.location || ''}
                            onChange={(e) => setProjectInfo({ ...projectInfo, location: e.target.value })}
                            className="w-full text-slate-600 dark:text-slate-300 bg-transparent border-b border-slate-200 dark:border-slate-600 focus:border-blue-500 outline-none py-1"
                            placeholder="Ciudad, Estado"
                        />
                    </div>
                    <div className="md:col-span-1">
                        <label className="block text-xs font-bold text-slate-400 dark:text-slate-500 uppercase mb-1">Especialidad</label>
                        <select
                            value={projectInfo.type || 'General'}
                            onChange={(e) => setProjectInfo({ ...projectInfo, type: e.target.value })}
                            className="w-full bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg py-1.5 px-3 text-sm font-medium text-slate-700 dark:text-slate-200 outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            <option>General</option>
                            <option>Obra Civil</option>
                            <option>Albañilería</option>
                            <option>Instalación Eléctrica</option>
                            <option>Instalación Hidrosanitaria</option>
                            <option>Instalación de Gas</option>
                            <option>Acabados</option>
                            <option>Estructura</option>
                            <option>Herrería y Aluminio</option>
                            <option>Carpintería</option>
                            <option>Aire Acondicionado / Clima</option>
                            <option>Voz y Datos</option>
                            <option>Jardinería y Paisajismo</option>
                        </select>
                    </div>
                    <div className="md:col-span-1">
                        <label className="block text-xs font-bold text-slate-400 dark:text-slate-500 uppercase mb-1 flex items-center gap-2">
                            IVA (%)
                            <button
                                onClick={() => {
                                    setCurrentCostConcept('iva');
                                    setShowCostConceptsModal(true);
                                }}
                                className="text-slate-400 hover:text-indigo-500 dark:hover:text-indigo-400 transition-colors"
                                title="¿Qué es el IVA y cuándo aplicarlo?"
                            >
                                <Info size={14} />
                            </button>
                        </label>
                        <input
                            type="number"
                            min="0"
                            max="100"
                            value={projectInfo.taxRate ?? 16}
                            onChange={(e) => setProjectInfo({ ...projectInfo, taxRate: parseFloat(e.target.value) || 0 })}
                            className="w-full text-slate-600 dark:text-slate-300 bg-transparent border-b border-slate-200 dark:border-slate-600 focus:border-blue-500 outline-none py-1"
                            placeholder="16"
                        />
                    </div>
                    <div className="md:col-span-1">
                        <label className="block text-xs font-bold text-slate-400 dark:text-slate-500 uppercase mb-1 flex items-center gap-2">
                            Indirectos (%)
                            <button
                                onClick={() => {
                                    setCurrentCostConcept('indirectos');
                                    setShowCostConceptsModal(true);
                                }}
                                className="text-slate-400 hover:text-indigo-500 dark:hover:text-indigo-400 transition-colors"
                                title="¿Qué son los indirectos y cuándo aplicarlos?"
                            >
                                <Info size={14} />
                            </button>
                        </label>
                        <input
                            type="number"
                            min="0"
                            max="100"
                            value={projectInfo.indirect_percentage ?? 0}
                            onChange={(e) => setProjectInfo({ ...projectInfo, indirect_percentage: parseFloat(e.target.value) || 0 })}
                            className="w-full text-slate-600 dark:text-slate-300 bg-transparent border-b border-slate-200 dark:border-slate-600 focus:border-blue-500 outline-none py-1"
                            placeholder="0"
                        />
                    </div>
                    <div className="md:col-span-1">
                        <label className="block text-xs font-bold text-slate-400 dark:text-slate-500 uppercase mb-1 flex items-center gap-2">
                            Utilidad (%)
                            <button
                                onClick={() => {
                                    setCurrentCostConcept('utilidad');
                                    setShowCostConceptsModal(true);
                                }}
                                className="text-slate-400 hover:text-indigo-500 dark:hover:text-indigo-400 transition-colors"
                                title="¿Qué es la utilidad y cuándo aplicarla?"
                            >
                                <Info size={14} />
                            </button>
                        </label>
                        <input
                            type="number"
                            min="0"
                            max="100"
                            value={projectInfo.profit_percentage ?? 0}
                            onChange={(e) => setProjectInfo({ ...projectInfo, profit_percentage: parseFloat(e.target.value) || 0 })}
                            className="w-full text-slate-600 dark:text-slate-300 bg-transparent border-b border-slate-200 dark:border-slate-600 focus:border-blue-500 outline-none py-1"
                            placeholder="0"
                        />
                    </div>
                </div>
            </div>

            {/* AI Command Center */}
            <div className="bg-white dark:bg-slate-800 p-1 rounded-2xl shadow-xl shadow-indigo-100/50 dark:shadow-indigo-900/20 border border-slate-100 dark:border-slate-700 relative overflow-hidden group-focus-within:ring-2 ring-indigo-500/20 transition-all">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 opacity-0 group-focus-within:opacity-100 transition-opacity"></div>
                <div className="p-6">
                    <div className="flex flex-col md:flex-row gap-4 items-start">
                        <div className="flex-1 w-full relative">
                            <div className="relative group">
                                <div className="absolute -inset-0.5 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-xl opacity-0 group-focus-within:opacity-20 transition duration-500 blur"></div>
                                <div className="relative flex items-center">
                                    <Bot className="absolute left-4 text-indigo-500 w-6 h-6 animate-pulse" />
                                    <input
                                        value={aiPrompt}
                                        onChange={(e) => setAiPrompt(e.target.value)}
                                        onKeyDown={(e) => e.key === 'Enter' && generateBudgetFromAI()}
                                        placeholder="Ej: 'Barda de 20m lineales x 2.5m de alto' (Incluye medidas para calcular cantidades)..."
                                        className="w-full pl-14 pr-4 py-4 bg-slate-50 dark:bg-slate-700 border-2 border-slate-100 dark:border-slate-600 rounded-xl focus:border-indigo-500 dark:focus:border-indigo-400 focus:bg-white dark:focus:bg-slate-600 focus:outline-none focus:ring-0 transition-all text-lg shadow-inner placeholder:text-slate-400 dark:placeholder:text-slate-500 text-slate-700 dark:text-slate-200"
                                    />
                                </div>
                                <div className="mt-2 flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 px-2">
                                    <Info size={12} className="text-indigo-500" />
                                    <span><strong>Tip:</strong> Para obtener cantidades exactas, especifica dimensiones. Ej: <em>"Losa de 100m2"</em> o <em>"Zanja de 50m x 0.60m"</em>.</span>
                                </div>
                            </div>

                            {/* Quick Suggestions */}
                            <div className="flex gap-2 mt-3 overflow-x-auto pb-2 scrollbar-hide">
                                {['Cimentación', 'Muros de Block', 'Losa de Vigueta', 'Instalación Eléctrica', 'Acabados', 'Pintura'].map((suggestion) => (
                                    <button
                                        key={suggestion}
                                        onClick={() => setAiPrompt(suggestion)}
                                        className="px-3 py-1 bg-slate-100 dark:bg-slate-700 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 text-slate-500 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 rounded-full text-xs font-bold transition border border-transparent hover:border-indigo-200 dark:hover:border-indigo-700 whitespace-nowrap flex items-center"
                                    >
                                        <Plus size={10} className="mr-1" /> {suggestion}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="flex gap-3 w-full md:w-auto self-start">
                            <button
                                onClick={generateBudgetFromAI}
                                disabled={isAiLoading}
                                className="flex-1 md:flex-none bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white px-6 py-4 rounded-xl font-bold shadow-lg shadow-indigo-200 transform hover:-translate-y-0.5 transition-all flex items-center justify-center gap-2 min-w-[140px]"
                            >
                                {isAiLoading ? (
                                    <>
                                        <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                                        <span>Pensando...</span>
                                    </>
                                ) : (
                                    <>
                                        <Sparkles size={20} />
                                        <span>Generar</span>
                                    </>
                                )}
                            </button>
                            <button
                                onClick={analyzeBudget}
                                className="px-5 py-4 bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-300 border-2 border-slate-200 dark:border-slate-600 rounded-xl font-bold hover:border-amber-400 dark:hover:border-amber-500 hover:text-amber-600 dark:hover:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-900/30 transition flex items-center gap-2"
                                title="Auditar Presupuesto"
                            >
                                <AlertTriangle size={20} />
                            </button>
                        </div>
                    </div>
                </div>
            </div>


            {/* Description Generator */}
            {technicalDescription && (
                <TechnicalDescriptionViewer
                    content={technicalDescription}
                    onUpdate={(newContent) => {
                        setTechnicalDescription(newContent);
                        setHasUnsavedChanges(true);
                    }}
                    onDelete={() => setTechnicalDescription('')}
                />
            )}
            {!technicalDescription && (
                <button onClick={generateTechnicalDescription} disabled={isWritingDesc} className="text-xs text-indigo-600 font-medium hover:underline flex items-center ml-1">
                    {isWritingDesc ? 'Redactando...' : '+ Redactar memoria descriptiva con IA'}
                </button>
            )}

            {/* Main Table Card */}
            <Card className="p-0 overflow-visible bg-transparent shadow-none lg:bg-white lg:shadow-xl lg:dark:bg-slate-800">

                {/* Mobile View - Cards */}
                <div className="lg:hidden space-y-4">
                    {items.length === 0 && (
                        <div className="p-8 text-center bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
                            <div className="flex flex-col items-center text-slate-400 dark:text-slate-500">
                                <FolderOpen size={48} className="mb-2 opacity-20" />
                                <p>No hay partidas. Usa la IA o agrega manualmente.</p>
                            </div>
                        </div>
                    )}
                    {items.map((item, i) => (
                        <div key={item.id} className="bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 space-y-3 relative group">
                            {/* Header Row: ID & Delete */}
                            <div className="flex justify-between items-start mb-2">
                                <span className="w-6 h-6 rounded-full bg-slate-100 dark:bg-slate-700 text-xs font-bold text-slate-500 flex items-center justify-center">
                                    {i + 1}
                                </span>
                                <button
                                    onClick={() => {
                                        if (window.confirm('¿Eliminar esta partida?')) {
                                            setItems(items.filter(x => x.id !== item.id));
                                        }
                                    }}
                                    className="text-slate-400 hover:text-red-500 p-1"
                                >
                                    <Trash2 size={16} />
                                </button>
                            </div>

                            {/* Description Section */}
                            <div className="relative">
                                {item.isCatalogItem && <Database size={12} className="absolute -left-4 top-1 text-blue-500" title="De Catálogo" />}
                                <textarea
                                    value={item.description || ''}
                                    onChange={(e) => {
                                        handleUpdateItem(item.id, 'description', e.target.value);
                                        e.target.style.height = 'auto';
                                        e.target.style.height = Math.min(e.target.scrollHeight, 200) + 'px';
                                    }}
                                    className="w-full bg-transparent outline-none font-medium text-slate-700 dark:text-slate-200 resize-none overflow-hidden min-h-[40px] text-base"
                                    placeholder="Descripción de la partida..."
                                    rows={2}
                                />

                                {/* Tools Row */}
                                <div className="flex items-center gap-2 mt-2 border-b border-slate-100 dark:border-slate-700 pb-2 mb-2">
                                    <button
                                        onClick={() => handleGenerateAPU(item, false)}
                                        disabled={isGeneratingAPU && currentAPUItem?.id === item.id}
                                        className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-medium border transition-colors ${item.apuData
                                            ? 'bg-emerald-50 text-emerald-600 border-emerald-200'
                                            : 'bg-indigo-50 text-indigo-600 border-indigo-200'
                                            }`}
                                    >
                                        {isGeneratingAPU && currentAPUItem?.id === item.id ? <span className="animate-spin">⏳</span> : <Calculator size={14} />}
                                        {item.apuData ? 'Ver APU' : 'Generar APU'}
                                    </button>

                                    <button
                                        onClick={() => {
                                            setCurrentEditingItem(item);
                                            setShowAIDescModal(true);
                                        }}
                                        className="flex items-center gap-1 px-2 py-1 rounded text-xs font-medium bg-purple-50 text-purple-600 border border-purple-200"
                                    >
                                        <Sparkles size={14} /> Redactar
                                    </button>

                                    <div className="ml-auto">
                                        <AIPriceHelper
                                            itemData={item}
                                            catalogData={catalog}
                                            onSuggestionClick={(price) => handleUpdateItem(item.id, 'unitPrice', price)}
                                            small={true}
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Details Grid */}
                            <div className="grid grid-cols-2 gap-3">
                                <div className="col-span-2">
                                    <label className="text-[10px] uppercase text-slate-400 font-bold">Categoría</label>
                                    <select
                                        value={item.category || 'Materiales'}
                                        onChange={(e) => handleUpdateItem(item.id, 'category', e.target.value)}
                                        className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded px-2 py-1.5 text-sm outline-none"
                                    >
                                        {['Materiales', 'Mano de Obra', 'Equipos', 'Instalaciones', 'Obra Civil'].map(c => <option key={c}>{c}</option>)}
                                    </select>
                                </div>

                                <div>
                                    <label className="text-[10px] uppercase text-slate-400 font-bold">Unidad</label>
                                    <input
                                        value={item.unit || ''}
                                        onChange={(e) => handleUpdateItem(item.id, 'unit', e.target.value)}
                                        className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded px-2 py-1.5 text-sm outline-none text-center"
                                    />
                                </div>

                                <div>
                                    <label className="text-[10px] uppercase text-slate-400 font-bold">Cantidad</label>
                                    <div className="relative">
                                        <input
                                            type="number"
                                            value={item.quantity}
                                            onChange={(e) => handleUpdateItem(item.id, 'quantity', e.target.value)}
                                            className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded px-2 py-1.5 text-sm outline-none text-right font-bold pr-8"
                                        />
                                        <button
                                            onClick={() => handleOpenGenerator(item)}
                                            className="absolute right-1 top-1.5 text-slate-400 hover:text-indigo-500"
                                        >
                                            <Ruler size={14} />
                                        </button>
                                    </div>
                                </div>

                                <div className="col-span-2 grid grid-cols-2 gap-3 items-center pt-2 border-t border-slate-100 dark:border-slate-700">
                                    <div>
                                        <label className="text-[10px] uppercase text-slate-400 font-bold">P. Unitario</label>
                                        <input
                                            type="number"
                                            value={item.unitPrice}
                                            onChange={(e) => handleUpdateItem(item.id, 'unitPrice', e.target.value)}
                                            className="w-full bg-transparent border-b border-slate-200 dark:border-slate-600 py-1 text-sm outline-none font-mono text-slate-700 dark:text-slate-300"
                                            placeholder="0.00"
                                        />
                                    </div>
                                    <div className="text-right">
                                        <label className="text-[10px] uppercase text-slate-400 font-bold block">Total</label>
                                        <span className="font-mono font-bold text-lg text-slate-800 dark:text-slate-100">
                                            {formatCurrency(item.quantity * item.unitPrice)}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Desktop View - Table */}
                <div className="hidden lg:block overflow-x-auto rounded-t-2xl bg-white dark:bg-slate-800">
                    <table className="w-full text-left border-collapse">
                        <thead className="bg-slate-50 dark:bg-slate-700 text-xs uppercase text-slate-500 dark:text-slate-300 font-bold border-b border-slate-200 dark:border-slate-600">
                            <tr>
                                <th className="p-4 w-12 text-center">#</th>
                                <th className="p-4">Descripción</th>
                                <th className="p-4 w-32">Categoría</th>
                                <th className="p-4 w-20 text-center">Und.</th>
                                <th className="p-4 w-24 text-right">Cant.</th>
                                <th className="p-4 w-32 text-right">P.U.</th>
                                <th className="p-4 w-32 text-right">Total</th>
                                <th className="p-4 w-12"></th>
                            </tr>
                        </thead>
                        <tbody className="text-sm divide-y divide-slate-100 dark:divide-slate-700 bg-white dark:bg-slate-800">
                            {items.length === 0 && (
                                <tr>
                                    <td colSpan="8" className="p-12 text-center">
                                        <div className="flex flex-col items-center text-slate-400 dark:text-slate-500">
                                            <FolderOpen size={48} className="mb-2 opacity-20" />
                                            <p>No hay partidas. Usa la IA o agrega manualmente.</p>
                                        </div>
                                    </td>
                                </tr>
                            )}
                            {items.map((item, i) => {
                                const isZero = item.quantity === 0;
                                return (
                                    <tr key={item.id} className="hover:bg-blue-50/30 dark:hover:bg-slate-700/50 group transition-colors">
                                        <td className="p-4 text-center text-slate-300 dark:text-slate-400 text-xs">{i + 1}</td>
                                        <td className="p-2 min-w-[300px] max-w-[600px]">
                                            <div className="space-y-2">
                                                <div className="relative flex items-start gap-2">
                                                    {item.isCatalogItem && <Database size={10} className="absolute -left-3 top-1.5 text-blue-500" title="De Catálogo" />}
                                                    <textarea
                                                        value={item.description || ''}
                                                        onChange={(e) => {
                                                            handleUpdateItem(item.id, 'description', e.target.value);
                                                            const textarea = e.target;
                                                            textarea.style.height = 'auto';
                                                            textarea.style.height = Math.min(textarea.scrollHeight, 200) + 'px';
                                                        }}
                                                        className="w-full bg-transparent outline-none font-medium text-slate-700 dark:text-slate-200 focus:text-blue-700 dark:focus:text-blue-400 resize-none overflow-hidden min-h-[24px] leading-tight py-1"
                                                        style={{
                                                            height: 'auto',
                                                            minHeight: '24px',
                                                            maxHeight: '200px'
                                                        }}
                                                        onFocus={(e) => {
                                                            const textarea = e.target;
                                                            textarea.style.height = 'auto';
                                                            textarea.style.height = Math.min(textarea.scrollHeight, 200) + 'px';
                                                        }}
                                                        data-item-id={item.id}
                                                    />
                                                    <div className="relative flex items-start gap-1 pt-1 flex-shrink-0">
                                                        <button
                                                            onClick={() => handleGenerateAPU(item, false)}
                                                            disabled={isGeneratingAPU && currentAPUItem?.id === item.id}
                                                            className={`p-1 rounded transition-colors relative ${item.apuData
                                                                ? 'text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/30'
                                                                : 'text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/30'
                                                                }`}
                                                            title={item.apuData ? "Ver APU guardado (click derecho para regenerar)" : "Generar Matriz (APU)"}
                                                            onContextMenu={(e) => {
                                                                e.preventDefault();
                                                                handleGenerateAPU(item, true);
                                                            }}
                                                        >
                                                            {isGeneratingAPU && currentAPUItem?.id === item.id ? (
                                                                <span className="animate-spin text-xs">⏳</span>
                                                            ) : (
                                                                <>
                                                                    <Calculator size={16} />
                                                                    {item.apuData && <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-emerald-500 rounded-full border border-white"></span>}
                                                                </>
                                                            )}
                                                        </button>
                                                        {item.apuData && (
                                                            <button
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    handleGenerateAPU(item, true);
                                                                }}
                                                                disabled={isGeneratingAPU && currentAPUItem?.id === item.id}
                                                                className="p-1 text-orange-600 dark:text-orange-400 hover:bg-orange-50 dark:hover:bg-orange-900/30 rounded transition-colors text-xs"
                                                                title="Regenerar APU con IA"
                                                            >
                                                                {isGeneratingAPU && currentAPUItem?.id === item.id ? (
                                                                    <span className="animate-spin">⏳</span>
                                                                ) : (
                                                                    '↻'
                                                                )}
                                                            </button>
                                                        )}
                                                    </div>
                                                    <button
                                                        onClick={() => {
                                                            setCurrentEditingItem(item);
                                                            setShowAIDescModal(true);
                                                        }}
                                                        className="opacity-0 group-hover:opacity-100 transition-opacity text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 p-1 rounded hover:bg-purple-50 dark:hover:bg-purple-900/30 flex-shrink-0 mt-1"
                                                        title="Generar descripción con IA"
                                                    >
                                                        <Sparkles size={16} />
                                                    </button>
                                                </div>
                                                <AIPriceHelper
                                                    itemData={item}
                                                    catalogData={catalog}
                                                    onSuggestionClick={(price) => handleUpdateItem(item.id, 'unitPrice', price)}
                                                />
                                            </div>
                                        </td>
                                        <td className="p-2">
                                            <select
                                                value={item.category || 'Materiales'}
                                                onChange={(e) => handleUpdateItem(item.id, 'category', e.target.value)}
                                                className="w-full bg-transparent text-xs outline-none cursor-pointer text-slate-700 dark:text-slate-200"
                                            >
                                                {['Materiales', 'Mano de Obra', 'Equipos', 'Instalaciones', 'Obra Civil'].map(c => <option key={c}>{c}</option>)}
                                            </select>
                                            <div className="mt-1"><Badge type={item.category} /></div>
                                        </td>
                                        <td className="p-2"><input value={item.unit || ''} onChange={(e) => handleUpdateItem(item.id, 'unit', e.target.value)} className="w-full text-center bg-transparent outline-none text-slate-500 dark:text-slate-400" /></td>
                                        <td className="p-2">
                                            <div className="relative flex items-center">
                                                <input
                                                    type="number"
                                                    min="0"
                                                    step="0.01"
                                                    value={item.quantity === 0 ? '' : item.quantity}
                                                    onChange={(e) => {
                                                        const val = e.target.value;
                                                        if (val === '') {
                                                            handleUpdateItem(item.id, 'quantity', 0);
                                                            return;
                                                        }
                                                        handleUpdateItem(item.id, 'quantity', val);
                                                    }}
                                                    placeholder="0"
                                                    className={`w-full text-right outline-none py-1 px-2 rounded transition-all pr-8 ${isZero ? 'bg-amber-100 dark:bg-amber-900/30 ring-2 ring-amber-300 dark:ring-amber-600 font-bold text-amber-800 dark:text-amber-300 animate-pulse' : 'bg-transparent focus:bg-slate-100 dark:focus:bg-slate-700 text-slate-700 dark:text-slate-200'} `}
                                                />
                                                <button
                                                    onClick={() => handleOpenGenerator(item)}
                                                    className="absolute right-1 text-slate-300 dark:text-slate-500 hover:text-indigo-500 dark:hover:text-indigo-400 transition p-0.5 rounded hover:bg-indigo-50 dark:hover:bg-indigo-900/30"
                                                    title="Calcular con IA"
                                                >
                                                    <Ruler size={14} />
                                                </button>
                                                {item.calculation_basis && (
                                                    <button
                                                        onClick={() => showToast(`Cálculo: ${item.calculation_basis}`, 'info')}
                                                        className="absolute right-6 text-blue-400 dark:text-blue-400 hover:text-blue-600 dark:hover:text-blue-300 transition p-0.5 rounded hover:bg-blue-50 dark:hover:bg-blue-900/30"
                                                        title={item.calculation_basis}
                                                    >
                                                        <Info size={14} />
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                        <td className="p-2">
                                            <input
                                                type="number"
                                                min="0"
                                                step="0.01"
                                                value={item.unitPrice === 0 ? '' : item.unitPrice}
                                                onChange={(e) => {
                                                    const val = e.target.value;
                                                    if (val === '') {
                                                        handleUpdateItem(item.id, 'unitPrice', 0);
                                                        return;
                                                    }
                                                    handleUpdateItem(item.id, 'unitPrice', val);
                                                }}
                                                placeholder="0.00"
                                                className="w-full text-right bg-transparent outline-none font-mono text-slate-600 dark:text-slate-300 focus:bg-slate-100 dark:focus:bg-slate-700 rounded px-2"
                                            />
                                        </td>
                                        <td className="p-4 text-right font-mono font-bold text-slate-800 dark:text-slate-200">{formatCurrency(item.quantity * item.unitPrice)}</td>
                                        <td className="p-2 text-center">
                                            <button
                                                onClick={() => {
                                                    if (window.confirm('¿Eliminar esta partida?')) {
                                                        setItems(items.filter(x => x.id !== item.id));
                                                    }
                                                }}
                                                className="text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition"
                                                title="Eliminar partida"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </td>
                                    </tr>
                                )
                            })}
                        </tbody>
                    </table>
                </div>

                {/* Footer for Adding Items */}
                <div className="p-4 bg-slate-50 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-700 flex justify-between items-center rounded-b-2xl">
                    <button
                        onClick={() => setItems([...items, { id: generateId(), description: '', unit: 'pza', quantity: 1, unitPrice: 0, category: 'Materiales' }])}
                        className="text-blue-600 font-bold text-sm flex items-center hover:bg-blue-100 px-3 py-1.5 rounded-lg transition"
                    >
                        <Plus size={16} className="mr-1" /> Agregar Partida Manual
                    </button>
                    <div className="text-sm text-slate-500">
                        {items.length} Conceptos
                    </div>
                </div>
            </Card>

            {/* Footer flotante para Totales */}
            <div className="sticky bottom-4 z-30 px-4">
                <div className="bg-slate-900 text-white p-4 rounded-xl shadow-2xl flex flex-col lg:flex-row justify-between items-center gap-4 max-w-6xl mx-auto">
                    <div className="flex gap-4 text-sm w-full lg:w-auto justify-center lg:justify-start items-center">
                        <div className="flex items-center gap-2">
                            <button
                                onClick={handleExportPDF}
                                disabled={items.length === 0}
                                className={`px-4 py-2 rounded-lg font-bold shadow-lg transition flex items-center text-sm ${items.length === 0
                                    ? 'bg-slate-700 text-slate-500 cursor-not-allowed shadow-none'
                                    : 'bg-emerald-500 hover:bg-emerald-600 text-white shadow-emerald-900/20'
                                    }`}
                                title={items.length === 0 ? "Agrega partidas para generar PDF" : "Generar PDF"}
                            >
                                <Printer size={16} className="mr-2" /> <span className="hidden sm:inline">PDF</span>
                            </button>

                            <button
                                onClick={() => setShowAdjustModal(true)}
                                disabled={items.length === 0}
                                className={`px-4 py-2 rounded-lg font-bold shadow-lg transition flex items-center text-sm ${items.length === 0
                                    ? 'bg-slate-700 text-slate-500 cursor-not-allowed shadow-none'
                                    : 'bg-violet-600 hover:bg-violet-700 text-white shadow-violet-900/20'
                                    }`}
                                title="Ajustar Total (Varita Mágica)"
                            >
                                <Wand2 size={16} className="mr-2" /> <span className="hidden sm:inline">Ajustar</span>
                            </button>

                            <div className={items.length === 0 ? 'opacity-50 pointer-events-none' : ''}>
                                <ScheduleGenerator
                                    items={items}
                                    projectInfo={projectInfo}
                                    projectId={projectInfo.id}
                                    scheduleData={scheduleData}
                                    onScheduleGenerated={handleScheduleGenerated}
                                    showToast={showToast}
                                    onSaveToBitacora={handleSaveToBitacora}
                                />
                            </div>

                            <MaterialGenerator
                                items={items}
                                projectInfo={projectInfo}
                                projectId={projectInfo.id}
                                materialList={materialList}
                                materialAssumptions={materialAssumptions}
                                onMaterialsGenerated={handleMaterialsGenerated}
                                showToast={showToast}
                            />
                            <button
                                onClick={() => navigate(`/project/${projectInfo.id}/bitacora`)}
                                disabled={!projectInfo.id}
                                className={`px-4 py-2 rounded-lg font-bold shadow-lg transition flex items-center text-sm ${!projectInfo.id
                                    ? 'bg-slate-700 text-slate-500 cursor-not-allowed shadow-none'
                                    : 'bg-slate-700 hover:bg-slate-600 text-white shadow-slate-900/20'
                                    }`}
                                title={!projectInfo.id ? "Guarda el proyecto para ver la bitácora" : "Ir a Bitácora de Obra"}
                            >
                                <Camera size={16} className="mr-2" /> <span className="hidden sm:inline">Bitácora</span>
                            </button>
                        </div>
                    </div>

                    {/* Desktop Total Display */}
                    <div className="hidden lg:flex items-center gap-4">
                        <div className="text-right">
                            <span className="text-slate-400 block text-xs uppercase">Subtotal</span>
                            <span className="font-mono text-lg font-bold text-white">{formatCurrency(calculateSubtotal())}</span>
                        </div>
                        {(() => {
                            const calc = getCalculations();
                            return (
                                <>
                                    <div className="text-right">
                                        <span className="text-slate-400 block text-xs uppercase flex items-center justify-end gap-1">
                                            Indirectos ({projectInfo.indirect_percentage || 0}%)
                                            <button
                                                onClick={() => {
                                                    setCurrentCostConcept('indirectos');
                                                    setShowCostConceptsModal(true);
                                                }}
                                                className="text-slate-500 hover:text-indigo-400 dark:hover:text-indigo-400 transition-colors"
                                                title="¿Qué son los indirectos?"
                                            >
                                                <Info size={12} />
                                            </button>
                                        </span>
                                        <span className="font-mono text-lg font-bold text-slate-300">
                                            {formatCurrency(calc.indirectCosts)}
                                        </span>
                                    </div>
                                    <div className="text-right">
                                        <span className="text-slate-400 block text-xs uppercase flex items-center justify-end gap-1">
                                            Utilidad ({projectInfo.profit_percentage || 0}%)
                                            <button
                                                onClick={() => {
                                                    setCurrentCostConcept('utilidad');
                                                    setShowCostConceptsModal(true);
                                                }}
                                                className="text-slate-500 hover:text-indigo-400 dark:hover:text-indigo-400 transition-colors"
                                                title="¿Qué es la utilidad?"
                                            >
                                                <Info size={12} />
                                            </button>
                                        </span>
                                        <span className="font-mono text-lg font-bold text-slate-300">
                                            {formatCurrency(calc.profit)}
                                        </span>
                                    </div>
                                    <div className="text-right">
                                        <span className="text-slate-400 block text-xs uppercase flex items-center justify-end gap-1">
                                            IVA ({projectInfo.taxRate || 0}%)
                                            <button
                                                onClick={() => {
                                                    setCurrentCostConcept('iva');
                                                    setShowCostConceptsModal(true);
                                                }}
                                                className="text-slate-500 hover:text-indigo-400 dark:hover:text-indigo-400 transition-colors"
                                                title="¿Qué es el IVA?"
                                            >
                                                <Info size={12} />
                                            </button>
                                        </span>
                                        <span className="font-mono text-lg font-bold text-slate-300">
                                            {formatCurrency((projectInfo.taxRate || 0) === 0 ? 0 : calc.tax)}
                                        </span>
                                    </div>
                                </>
                            );
                        })()}
                        <div className="text-right bg-slate-800 px-4 py-2 rounded-lg border border-slate-700">
                            <span className="text-emerald-400 block text-xs uppercase font-bold">Total Neto</span>
                            <span className="font-mono text-2xl font-bold text-emerald-400">{formatCurrency(calculateTotal())}</span>
                        </div>
                    </div>

                    {/* Mobile Total Display */}
                    <div className="lg:hidden w-full border-t border-slate-700 pt-3 mt-3">
                        {(() => {
                            const calc = getCalculations();
                            return (
                                <div className="space-y-2 text-sm">
                                    <div className="flex justify-between items-center">
                                        <span className="text-slate-400 uppercase text-xs">Subtotal:</span>
                                        <span className="font-mono font-bold text-white">{formatCurrency(calc.subtotal)}</span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-slate-400 uppercase text-xs">
                                            Indirectos ({projectInfo.indirect_percentage || 0}%):
                                        </span>
                                        <span className="font-mono font-bold text-slate-300">{formatCurrency(calc.indirectCosts)}</span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-slate-400 uppercase text-xs">
                                            Utilidad ({projectInfo.profit_percentage || 0}%):
                                        </span>
                                        <span className="font-mono font-bold text-slate-300">{formatCurrency(calc.profit)}</span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-slate-400 uppercase text-xs">IVA ({projectInfo.taxRate || 0}%):</span>
                                        <span className="font-mono font-bold text-slate-300">
                                            {formatCurrency((projectInfo.taxRate || 0) === 0 ? 0 : calc.tax)}
                                        </span>
                                    </div>
                                    <div className="flex justify-between items-center pt-2 border-t border-slate-700">
                                        <span className="text-emerald-400 uppercase text-xs font-bold">Total Neto:</span>
                                        <span className="font-mono text-xl font-bold text-emerald-400">{formatCurrency(calc.total)}</span>
                                    </div>
                                </div>
                            );
                        })()}
                    </div>
                </div>
            </div>

            {/* Modal de Análisis (Modularizado) */}
            <BudgetAnalysisModal
                isOpen={showAnalysisModal}
                onClose={() => setShowAnalysisModal(false)}
                items={items}
                projectInfo={projectInfo}
            />

            {/* Load Project Modal */}
            {showLoadModal && (
                <div
                    className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm animate-fadeIn"
                    onClick={(e) => {
                        if (e.target === e.currentTarget) {
                            setShowLoadModal(false);
                        }
                    }}
                >
                    <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[80vh] flex flex-col overflow-hidden">
                        <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-800 text-white">
                            <h3 className="font-bold text-lg flex items-center">
                                <FolderOpen className="mr-2" size={20} /> Proyectos en la Nube
                            </h3>
                            <button onClick={() => setShowLoadModal(false)} className="text-white/60 hover:text-white"><X size={20} /></button>
                        </div>
                        <div className="p-4 overflow-y-auto flex-1 bg-slate-50">
                            {isSaving ? (
                                <div className="text-center py-10">
                                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                                    <p className="text-slate-400">Cargando proyectos...</p>
                                </div>
                            ) : savedProjects.length === 0 ? (
                                <div className="text-center py-10 text-slate-400">
                                    <p>No hay proyectos guardados aún.</p>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {savedProjects.map(p => (
                                        <div
                                            key={p.id}
                                            onClick={() => handleLoadProject(p)}
                                            className="bg-white p-4 rounded-xl border border-slate-200 hover:border-blue-400 hover:shadow-md transition cursor-pointer flex justify-between items-center group"
                                        >
                                            <div>
                                                <h4 className="font-bold text-slate-800">{p.projectInfo?.project || 'Sin Nombre'}</h4>
                                                <p className="text-xs text-slate-500">
                                                    {p.projectInfo?.client ? `${p.projectInfo.client} • ` : ''}
                                                    {new Date(p.lastModified).toLocaleDateString()} {new Date(p.lastModified).toLocaleTimeString()}
                                                </p>
                                            </div>
                                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition">
                                                <button
                                                    onClick={(e) => handleRenameProject(p, e)}
                                                    className="text-slate-300 hover:text-blue-500 p-2 rounded-full hover:bg-blue-50 transition"
                                                    title="Renombrar"
                                                >
                                                    <Edit size={18} />
                                                </button>
                                                <button
                                                    onClick={(e) => handleDeleteProject(p.id, e)}
                                                    className="text-slate-300 hover:text-red-500 p-2 rounded-full hover:bg-red-50 transition"
                                                    title="Eliminar"
                                                >
                                                    <Trash2 size={18} />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* AI Description Generator Modal */}{/* Import Confirm Modal */}
            {showImportConfirmModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm animate-fadeIn">
                    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl max-w-md w-full p-6 space-y-4 border border-slate-200 dark:border-slate-700">
                        <div className="flex items-center gap-3 text-indigo-600 dark:text-indigo-400">
                            <div className="p-2 bg-indigo-50 dark:bg-indigo-900/30 rounded-lg">
                                <FileText size={24} />
                            </div>
                            <h3 className="text-xl font-bold text-slate-800 dark:text-white">Importación Completada</h3>
                        </div>
                        <p className="text-slate-600 dark:text-slate-300">
                            Se han extraído <strong>{importedItemsCandidate?.length}</strong> partidas del PDF.
                            ¿Qué deseas hacer con ellas?
                        </p>
                        <div className="grid grid-cols-2 gap-3 pt-2">
                            <button
                                onClick={() => confirmImport('replace')}
                                className="px-4 py-3 bg-red-50 hover:bg-red-100 text-red-600 dark:bg-red-900/20 dark:hover:bg-red-900/40 dark:text-red-400 rounded-xl font-bold transition flex flex-col items-center gap-1 text-center"
                            >
                                <Trash2 size={20} />
                                <span className="text-sm">Reemplazar Todo</span>
                            </button>
                            <button
                                onClick={() => confirmImport('append')}
                                className="px-4 py-3 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 dark:bg-indigo-900/20 dark:hover:bg-indigo-900/40 dark:text-indigo-400 rounded-xl font-bold transition flex flex-col items-center gap-1 text-center"
                            >
                                <Plus size={20} />
                                <span className="text-sm">Agregar al Final</span>
                            </button>
                        </div>
                        <button
                            onClick={() => { setShowImportConfirmModal(false); setImportedItemsCandidate(null); }}
                            className="w-full py-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 text-sm font-medium transition"
                        >
                            Cancelar
                        </button>
                    </div>
                </div>
            )}

            {/* Adjust Total Modal */}
            {showAdjustModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm animate-fadeIn">
                    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl max-w-sm w-full p-6 space-y-6 border border-slate-200 dark:border-slate-700 relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-violet-500 to-fuchsia-500"></div>

                        <div className="text-center space-y-2">
                            <div className="w-12 h-12 bg-violet-100 dark:bg-violet-900/30 text-violet-600 dark:text-violet-400 rounded-2xl flex items-center justify-center mx-auto mb-2 transform rotate-12">
                                <Wand2 size={24} />
                            </div>
                            <h3 className="text-xl font-bold text-slate-800 dark:text-white">Ajustar Presupuesto</h3>
                            <p className="text-sm text-slate-500 dark:text-slate-400">
                                Ajusta proporcionalmente todos los precios unitarios para llegar al total deseado.
                            </p>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Monto Objetivo (Total con IVA)</label>
                                <div className="relative">
                                    <span className="absolute left-4 top-3.5 text-slate-400 font-bold">$</span>
                                    <input
                                        type="number"
                                        value={targetTotal}
                                        onChange={(e) => setTargetTotal(e.target.value)}
                                        className="w-full pl-8 pr-4 py-3 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl font-bold text-xl text-slate-800 dark:text-white focus:ring-2 focus:ring-violet-500 outline-none"
                                        placeholder="0.00"
                                        autoFocus
                                    />
                                </div>
                            </div>

                            <div className="flex gap-3">
                                <button
                                    onClick={() => setShowAdjustModal(false)}
                                    className="flex-1 py-3 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl font-medium transition"
                                >
                                    Cancelar
                                </button>
                                <button
                                    onClick={handleAdjustTotal}
                                    className="flex-1 py-3 bg-violet-600 hover:bg-violet-700 text-white rounded-xl font-bold shadow-lg shadow-violet-200 dark:shadow-none transition transform hover:scale-105"
                                >
                                    Aplicar Magia
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* AI Description Generator Modal */}
            {showAIDescModal && currentEditingItem && (
                <AIDescriptionGenerator
                    itemData={{
                        code: currentEditingItem.code,
                        unit: currentEditingItem.unit,
                        category: currentEditingItem.category,
                        partialDescription: currentEditingItem.description
                    }}
                    context={items}
                    onSelect={(description) => {
                        setItems(items.map(x =>
                            x.id === currentEditingItem.id
                                ? { ...x, description }
                                : x
                        ));
                    }}
                    onClose={() => {
                        setShowAIDescModal(false);
                        setCurrentEditingItem(null);
                    }}
                />
            )}

            {/* APU Modal */}
            {showAPUModal && currentAPUItem && apuData && (
                <APUModal
                    item={currentAPUItem}
                    apuData={apuData}
                    onClose={() => {
                        setShowAPUModal(false);
                        setCurrentAPUItem(null);
                        setApuData(null);
                    }}
                    onApply={handleApplyAPUPrice}
                />
            )}
            {/* Generator Modal */}
            {showGeneratorModal && currentGeneratorItem && (
                <GeneratorModal
                    isOpen={showGeneratorModal}
                    onClose={() => {
                        setShowGeneratorModal(false);
                        setCurrentGeneratorItem(null);
                    }}
                    onApply={handleApplyGenerator}
                    item={currentGeneratorItem}
                />
            )}

            {/* Cost Concepts Modal */}
            <CostConceptsModal
                isOpen={showCostConceptsModal}
                onClose={() => {
                    setShowCostConceptsModal(false);
                    setCurrentCostConcept(null);
                }}
                concept={currentCostConcept}
            />

            {/* Confirm Modal */}
            <ConfirmModal
                isOpen={confirmModal.isOpen}
                onClose={closeConfirmModal}
                onConfirm={confirmModal.onConfirm}
                title={confirmModal.title}
                message={confirmModal.message}
                confirmText={confirmModal.confirmText}
                type={confirmModal.type}
            />

            {/* Limit Modal */}
            <LimitModal
                isOpen={limitModal.isOpen}
                onClose={() => setLimitModal({ isOpen: false, actionType: null, usage: 0, limit: 0 })}
                actionType={limitModal.actionType}
                usage={limitModal.usage}
                limit={limitModal.limit}
            />
            {showTemplateModal && (
                <CreateTemplateModal
                    project={{ ...projectInfo, id: projectInfo.id }}
                    onClose={() => setShowTemplateModal(false)}
                    onSuccess={() => {
                        showToast('Plantilla creada exitosamente', 'success');
                        // Dispatch event to reload templates page if open
                        window.dispatchEvent(new CustomEvent('templateCreated'));
                    }}
                />
            )}

            {/* PDF Preview Modal */}
            {showPDFPreview && (
                <PDFPreviewModal
                    isOpen={showPDFPreview}
                    onClose={() => setShowPDFPreview(false)}
                    onDownload={exportToPDF}
                    projectInfo={projectInfo}
                    items={items}
                    calculations={getCalculations()}
                    technicalDescription={technicalDescription}
                />
            )}

            {/* Share Project Modal */}
            {showShareModal && (
                <ShareProjectModal
                    isOpen={showShareModal}
                    onClose={() => setShowShareModal(false)}
                    projectId={projectInfo.id}
                    projectName={projectInfo.project || 'Presupuesto'}
                />
            )}
        </div>
    );
};

export default Editor;
