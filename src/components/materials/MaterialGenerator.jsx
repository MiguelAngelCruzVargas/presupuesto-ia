import React, { useState, useEffect } from 'react';
import { Package, Sparkles, X, AlertTriangle, Loader } from 'lucide-react';
import { AIBudgetService } from '../../services/AIBudgetService';
import ProjectPersistenceService from '../../services/ProjectPersistenceService';
import MaterialModal from './MaterialModal';

/**
 * MaterialGenerator
 * Componente independiente para generar listas de materiales/insumos con IA
 * Maneja toda la lógica de generación, validación y persistencia
 */
const MaterialGenerator = ({
    items = [],
    projectInfo = {},
    projectId = null,
    materialList: initialMaterialList = [],
    materialAssumptions: initialMaterialAssumptions = [],
    onMaterialsGenerated = null,
    onClose = null,
    showToast = null
}) => {
    const [materialList, setMaterialList] = useState(initialMaterialList);
    const [materialAssumptions, setMaterialAssumptions] = useState(initialMaterialAssumptions);
    const [isGenerating, setIsGenerating] = useState(false);
    const [showModal, setShowModal] = useState(false);
    const [error, setError] = useState(null);

    // Sincronizar cuando cambien las props
    useEffect(() => {
        if (initialMaterialList !== null) {
            setMaterialList(initialMaterialList);
        }
        if (initialMaterialAssumptions !== null) {
            setMaterialAssumptions(initialMaterialAssumptions);
        }
    }, [initialMaterialList, initialMaterialAssumptions]);

    // Validar items antes de generar
    const validateItems = () => {
        if (!items || items.length === 0) {
            return { valid: false, message: 'Agrega partidas antes de generar la lista de insumos' };
        }
        return { valid: true };
    };

    // Abrir modal o generar
    const handleOpenMaterials = () => {
        const validation = validateItems();
        if (!validation.valid) {
            if (showToast) {
                showToast(validation.message, 'warning');
            } else {
                setError(validation.message);
            }
            return;
        }

        // Si ya existe lista de materiales VÁLIDA, abrir el visualizador
        const hasValidMaterials = materialList && Array.isArray(materialList) && materialList.length > 0;

        if (hasValidMaterials) {
            setShowModal(true);
            return;
        }

        // Si no existe, generar directamente
        handleGenerateMaterials();
    };

    // Generar materiales con IA
    const handleGenerateMaterials = async (forceRegenerate = false) => {
        if (items.length === 0) {
            if (showToast) {
                showToast('Agrega partidas primero para generar insumos', 'warning');
            }
            return;
        }

        // Si ya existe y no se fuerza regeneración, solo mostrar
        if (materialList.length > 0 && !forceRegenerate) {
            setShowModal(true);
            return;
        }

        setIsGenerating(true);
        setError(null);
        setShowModal(true);

        try {
            const { materials, assumptions } = await AIBudgetService.generateMaterialTakeoff(items);
            setMaterialList(materials);
            setMaterialAssumptions(assumptions || []);

            // Auto-guardar si hay projectId
            if (projectId && materials) {
                try {
                    // Guardar mediante el guardado del proyecto completo
                    // El autoguardado se encargará de guardarlo
                    if (showToast) {
                        showToast('Lista de insumos generada exitosamente. Se guardará automáticamente.', 'success');
                    }
                } catch (err) {
                    console.error('Error saving materials:', err);
                }
            }

            // Callback opcional
            if (onMaterialsGenerated) {
                onMaterialsGenerated(materials, assumptions || []);
            }
        } catch (error) {
            console.error('Error generating materials:', error);
            const errorMessage = error.message || 'Error al generar la lista de insumos';
            setError(errorMessage);
            if (showToast) {
                showToast(errorMessage, 'error');
            }
            setMaterialList([]);
            setMaterialAssumptions([]);
        } finally {
            setIsGenerating(false);
        }
    };

    const handleClose = () => {
        setShowModal(false);
        if (onClose) {
            onClose();
        }
    };

    // Función para regenerar materiales
    const handleRegenerate = () => {
        setShowModal(false);
        handleGenerateMaterials(true);
    };

    // Actualizar materiales cuando se editen
    const handleMaterialsUpdate = (updatedList, updatedAssumptions) => {
        setMaterialList(updatedList);
        setMaterialAssumptions(updatedAssumptions || []);
        
        // Callback para notificar al componente padre
        if (onMaterialsGenerated) {
            onMaterialsGenerated(updatedList, updatedAssumptions || []);
        }
    };

    return (
        <>
            {/* Botón de Generar/Ver Insumos */}
            <button
                onClick={handleOpenMaterials}
                disabled={isGenerating || !items || items.length === 0}
                className={`
                    flex items-center gap-2 px-4 py-2 rounded-lg font-bold shadow-lg transition-all text-sm
                    ${isGenerating || !items || items.length === 0
                        ? 'bg-slate-700 text-slate-500 cursor-not-allowed shadow-none'
                        : 'bg-indigo-500 hover:bg-indigo-600 text-white shadow-indigo-900/20'
                    }
                `}
                title={!items || items.length === 0 ? 'Agrega partidas primero' : materialList.length > 0 ? 'Ver Lista de Insumos' : 'Generar Lista de Insumos con IA'}
            >
                {isGenerating ? (
                    <>
                        <Loader className="animate-spin" size={16} />
                        <span>Generando...</span>
                    </>
                ) : (
                    <>
                        <Package size={16} />
                        <span className="hidden sm:inline">Insumos</span>
                    </>
                )}
            </button>

            {/* Modal de Materiales */}
            {showModal && (
                <MaterialModal
                    isOpen={showModal}
                    onClose={handleClose}
                    materialList={materialList}
                    materialAssumptions={materialAssumptions}
                    isGenerating={isGenerating}
                    onRegenerate={handleRegenerate}
                    onMaterialsUpdate={handleMaterialsUpdate}
                    projectInfo={projectInfo}
                    error={error}
                />
            )}

            {/* Mensaje de Error (si no hay showToast) */}
            {error && !showToast && (
                <div className="fixed bottom-4 right-4 bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg shadow-lg flex items-center gap-2 z-50 animate-fadeIn">
                    <AlertTriangle size={20} />
                    <span className="text-sm font-medium">{error}</span>
                    <button
                        onClick={() => setError(null)}
                        className="text-red-600 hover:text-red-800"
                    >
                        <X size={16} />
                    </button>
                </div>
            )}
        </>
    );
};

export default MaterialGenerator;

