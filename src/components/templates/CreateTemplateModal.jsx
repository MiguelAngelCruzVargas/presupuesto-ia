import React, { useState, useEffect } from 'react';
import { X, Save, Loader, Globe, Lock, AlertTriangle } from 'lucide-react';
import { TemplateService } from '../../services/TemplateService';
import { ErrorService } from '../../services/ErrorService';

const CreateTemplateModal = ({ project, onClose, onSuccess }) => {
    // Safety check
    if (!project) return null;

    const [loading, setLoading] = useState(false);
    const [categories, setCategories] = useState([]);
    const [error, setError] = useState(null);
    const [formData, setFormData] = useState({
        name: project.name || '',
        description: '',
        categoryId: '',
        isPublic: false
    });

    useEffect(() => {
        loadCategories();
    }, []);

    const loadCategories = async () => {
        try {
            const cats = await TemplateService.getCategories();
            if (cats && cats.length > 0) {
                setCategories(cats);
                setFormData(prev => ({ ...prev, categoryId: cats[0].id }));
            } else {
                setError('No se encontraron categorías disponibles.');
            }
        } catch (error) {
            console.error('Error loading categories:', error);
            setError('Error al cargar las categorías. Por favor recarga la página.');
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        // Validate category
        if (!formData.categoryId) {
            setError('Por favor selecciona una categoría.');
            return;
        }

        setLoading(true);
        setError(null); // Limpiar errores anteriores

        try {
            await TemplateService.createTemplate(project.id, formData);
            onSuccess();
            onClose();
        } catch (error) {
            // Capturar el error con ErrorService
            ErrorService.logError(error, 'CreateTemplateModal.handleSubmit', {
                projectId: project.id,
                formData: formData
            });

            // Obtener mensaje amigable
            let userMessage = 'Error al crear la plantilla. Por favor intenta de nuevo.';

            // Mensajes específicos según el tipo de error
            if (error?.code === 'PGRST204') {
                userMessage = 'Error de configuración en la base de datos. Por favor contacta a soporte.';
            } else if (error?.message?.includes('Could not find')) {
                userMessage = 'Error de configuración del servidor. El equipo técnico ha sido notificado.';
            } else if (error?.message) {
                // Usar mensaje del error si es amigable
                userMessage = ErrorService.getErrorMessage(error);
            }

            setError(userMessage);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full">
                {/* Header */}
                <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-6 text-white rounded-t-xl">
                    <div className="flex items-center justify-between">
                        <h3 className="text-xl font-bold">Guardar como Plantilla</h3>
                        <button
                            onClick={onClose}
                            className="hover:bg-white/20 p-2 rounded-lg transition"
                        >
                            <X size={20} />
                        </button>
                    </div>
                    <p className="text-indigo-100 text-sm mt-2">
                        Convierte este presupuesto en una plantilla reutilizable
                    </p>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    {/* Error Message */}
                    {error && (
                        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
                            <AlertTriangle className="text-red-600 flex-shrink-0 mt-0.5" size={20} />
                            <div className="flex-1">
                                <p className="text-sm font-medium text-red-800">{error}</p>
                                <p className="text-xs text-red-600 mt-1">
                                    Si el problema persiste, puedes contactar a soporte desde el chat de ayuda.
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setError(null)}
                                className="text-red-400 hover:text-red-600 transition"
                            >
                                <X size={16} />
                            </button>
                        </div>
                    )}

                    {/* Name */}
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                            Nombre de la Plantilla *
                        </label>
                        <input
                            type="text"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            required
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-slate-800 bg-white placeholder:text-slate-400"
                            placeholder="Ej: Casa Habitación Estándar"
                        />
                    </div>

                    {/* Description */}
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                            Descripción
                        </label>
                        <textarea
                            value={formData.description}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            rows={3}
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none resize-none text-slate-800 bg-white placeholder:text-slate-400"
                            placeholder="Describe para qué tipo de proyectos es útil esta plantilla..."
                        />
                    </div>

                    {/* Category */}
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                            Categoría *
                        </label>
                        <select
                            value={formData.categoryId}
                            onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
                            required
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none bg-white text-slate-800"
                        >
                            {categories.map(cat => (
                                <option key={cat.id} value={cat.id}>{cat.name}</option>
                            ))}
                        </select>
                    </div>

                    {/* Public/Private */}
                    <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
                        <label className="flex items-center gap-3 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={formData.isPublic}
                                onChange={(e) => setFormData({ ...formData, isPublic: e.target.checked })}
                                className="w-4 h-4 text-indigo-600 rounded focus:ring-2 focus:ring-indigo-500"
                            />
                            <div className="flex-1">
                                <div className="flex items-center gap-2">
                                    {formData.isPublic ? (
                                        <>
                                            <Globe size={16} className="text-green-600" />
                                            <span className="font-medium text-slate-800">Plantilla Pública</span>
                                        </>
                                    ) : (
                                        <>
                                            <Lock size={16} className="text-slate-600" />
                                            <span className="font-medium text-slate-800">Plantilla Privada</span>
                                        </>
                                    )}
                                </div>
                                <p className="text-xs text-slate-500 mt-1">
                                    {formData.isPublic
                                        ? 'Otros usuarios podrán ver y usar esta plantilla'
                                        : 'Solo tú podrás ver y usar esta plantilla'}
                                </p>
                            </div>
                        </label>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-3 pt-4">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition font-medium"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition font-medium flex items-center justify-center gap-2 disabled:opacity-50"
                        >
                            {loading ? (
                                <>
                                    <Loader size={18} className="animate-spin" />
                                    Guardando...
                                </>
                            ) : (
                                <>
                                    <Save size={18} />
                                    Crear Plantilla
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default CreateTemplateModal;
