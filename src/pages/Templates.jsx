import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileText, Search, Filter, Plus, Sparkles, Download, Eye, Trash2, Lock, Globe } from 'lucide-react';
import Card from '../components/ui/Card';
import { useAuth } from '../context/AuthContext';
import { useProject } from '../context/ProjectContext';
import { TemplateService } from '../services/TemplateService';
import { formatCurrency } from '../utils/format';

const Templates = () => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const { showToast } = useProject();

    const [templates, setTemplates] = useState([]);
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCategory, setSelectedCategory] = useState(null);
    const [showOnlyMyTemplates, setShowOnlyMyTemplates] = useState(false);

    useEffect(() => {
        loadData();
    }, [selectedCategory, showOnlyMyTemplates, user]);

    // Listen for template creation events
    useEffect(() => {
        const handleTemplateCreated = () => {
            loadData();
        };
        window.addEventListener('templateCreated', handleTemplateCreated);
        return () => window.removeEventListener('templateCreated', handleTemplateCreated);
    }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            let templatesData;
            
            if (user) {
                // If user is logged in:
                if (showOnlyMyTemplates) {
                    // Show only user's own templates (private + public they created)
                    templatesData = await TemplateService.getUserTemplates(user.id);
                } else {
                    // Show user's templates + public templates from others
                    templatesData = await TemplateService.getUserTemplatesWithPublic(user.id, selectedCategory);
                }
            } else {
                // If not logged in, show only public templates
                templatesData = await TemplateService.getTemplates(selectedCategory, true);
            }

            const categoriesData = await TemplateService.getCategories();

            setTemplates(templatesData || []);
            setCategories(categoriesData || []);
        } catch (error) {
            console.error('Error loading templates:', error);
            showToast('Error al cargar plantillas', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleSearch = async () => {
        if (!searchQuery.trim()) {
            loadData();
            return;
        }

        setLoading(true);
        try {
            const results = await TemplateService.searchTemplates(searchQuery, user?.id || null);
            setTemplates(results);
        } catch (error) {
            console.error('Error en búsqueda:', error);
            showToast('Error en la búsqueda', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleUseTemplate = async (template) => {
        if (!user) {
            showToast('Inicia sesión para usar plantillas', 'warning');
            navigate('/login');
            return;
        }

        try {
            const customization = {
                projectName: `${template.name} - Copia`,
                client: '',
                location: ''
            };

            const result = await TemplateService.useTemplate(template.id, customization, user.id);
            showToast(`Proyecto creado con ${result.itemsCount} partidas`, 'success');
            navigate('/dashboard');
        } catch (error) {
            showToast('Error al crear proyecto desde plantilla', 'error');
        }
    };

    const handleDeleteTemplate = async (templateId) => {
        if (!confirm('¿Eliminar esta plantilla?')) return;

        try {
            await TemplateService.deleteTemplate(templateId, user.id);
            showToast('Plantilla eliminada', 'success');
            loadData();
        } catch (error) {
            showToast('Error al eliminar plantilla', 'error');
        }
    };

    const filteredTemplates = templates.filter(template =>
        template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        template.description?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="space-y-6 animate-fadeIn">
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 rounded-2xl p-8 shadow-xl relative overflow-hidden">
                {/* Decorative background elements */}
                <div className="absolute inset-0 opacity-10">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-white rounded-full -mr-32 -mt-32"></div>
                    <div className="absolute bottom-0 left-0 w-48 h-48 bg-white rounded-full -ml-24 -mb-24"></div>
                </div>
                
                <div className="relative z-10 flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold mb-2 flex items-center gap-3 text-white">
                            <div className="bg-white/20 backdrop-blur-sm p-2 rounded-lg">
                                <FileText size={32} className="text-white" />
                            </div>
                            Plantillas de Presupuesto
                        </h1>
                        <p className="text-blue-100 text-lg">
                            Comienza rápido con presupuestos predefinidos para diferentes tipos de obra
                        </p>
                    </div>
                    <div className="hidden md:block">
                        <Sparkles size={64} className="text-white/30" />
                    </div>
                </div>
            </div>

            {/* Search and Filters */}
            <Card className="p-6 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
                <div className="flex flex-col md:flex-row gap-4">
                    {/* Search */}
                    <div className="flex-1 relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" size={20} />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                            placeholder="Buscar plantillas..."
                            className="w-full pl-10 pr-4 py-2.5 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500"
                        />
                    </div>

                    {/* Category Filter */}
                    <select
                        value={selectedCategory || ''}
                        onChange={(e) => setSelectedCategory(e.target.value || null)}
                        className="px-4 py-2.5 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100"
                    >
                        <option value="">Todas las categorías</option>
                        {categories.map(cat => (
                            <option key={cat.id} value={cat.id}>{cat.name}</option>
                        ))}
                    </select>

                    {/* My Templates Toggle */}
                    {user && (
                        <button
                            onClick={() => setShowOnlyMyTemplates(!showOnlyMyTemplates)}
                            className={`px-4 py-2.5 rounded-lg font-medium transition flex items-center gap-2 ${showOnlyMyTemplates
                                ? 'bg-blue-600 text-white hover:bg-blue-700'
                                : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-600'
                                }`}
                        >
                            <Lock size={18} />
                            Mis Plantillas
                        </button>
                    )}
                </div>
            </Card>

            {/* Templates Grid */}
            {loading ? (
                <div className="text-center py-12">
                    <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent"></div>
                    <p className="mt-4 text-slate-600 dark:text-slate-400">Cargando plantillas...</p>
                </div>
            ) : filteredTemplates.length === 0 ? (
                <Card className="p-12 text-center bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
                    <FileText size={48} className="mx-auto text-slate-300 dark:text-slate-600 mb-4" />
                    <p className="text-slate-700 dark:text-slate-300 font-medium mb-2">No se encontraron plantillas</p>
                    <p className="text-slate-500 dark:text-slate-400 text-sm">
                        Puedes crear una plantilla desde el Editor de Presupuestos,<br />
                        abriendo un proyecto y haciendo clic en el botón "Guardar como Plantilla".
                    </p>
                </Card>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredTemplates.map(template => (
                        <TemplateCard
                            key={template.id}
                            template={template}
                            onUse={() => handleUseTemplate(template)}
                            onDelete={user?.id === template.user_id ? () => handleDeleteTemplate(template.id) : null}
                            isOwner={user?.id === template.user_id}
                        />
                    ))}
                </div>
            )}
        </div>
    );
};

// Template Card Component
const TemplateCard = ({ template, onUse, onDelete, isOwner }) => {
    const metadata = template.template_data?.metadata || {};

    return (
        <Card className="overflow-hidden hover:shadow-xl transition-shadow group bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
            {/* Header */}
            <div className="bg-gradient-to-br from-slate-50 to-blue-50 dark:from-slate-700 dark:to-slate-800 p-4 border-b border-slate-200 dark:border-slate-600">
                <div className="flex items-start justify-between mb-2">
                    <h3 className="font-bold text-lg text-slate-800 dark:text-slate-100 line-clamp-1">
                        {template.name}
                    </h3>
                    <div className="flex items-center gap-1">
                        {template.is_public ? (
                            <Globe size={16} className="text-green-600 dark:text-green-400" title="Pública" />
                        ) : (
                            <Lock size={16} className="text-slate-400 dark:text-slate-500" title="Privada" />
                        )}
                    </div>
                </div>
                <p className="text-sm text-slate-600 dark:text-slate-300 line-clamp-2 min-h-[40px]">
                    {template.description || 'Sin descripción'}
                </p>
            </div>

            {/* Stats */}
            <div className="p-4 space-y-3 bg-white dark:bg-slate-800">
                <div className="grid grid-cols-2 gap-3 text-sm">
                    <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-2">
                        <div className="text-blue-600 dark:text-blue-400 font-semibold">{metadata.totalItems || 0}</div>
                        <div className="text-blue-800 dark:text-blue-300 text-xs">Partidas</div>
                    </div>
                    <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-lg p-2">
                        <div className="text-emerald-600 dark:text-emerald-400 font-semibold font-mono text-xs">
                            {formatCurrency(metadata.estimatedTotal || 0)}
                        </div>
                        <div className="text-emerald-800 dark:text-emerald-300 text-xs">Estimado</div>
                    </div>
                </div>

                {/* Categories */}
                {metadata.categories && metadata.categories.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                        {metadata.categories.slice(0, 3).map((cat, i) => (
                            <span
                                key={i}
                                className="text-xs bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 px-2 py-1 rounded"
                            >
                                {cat}
                            </span>
                        ))}
                        {metadata.categories.length > 3 && (
                            <span className="text-xs text-slate-500 dark:text-slate-400">
                                +{metadata.categories.length - 3}
                            </span>
                        )}
                    </div>
                )}
            </div>

            {/* Actions */}
            <div className="p-4 pt-0 flex gap-2">
                <button
                    onClick={onUse}
                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg font-medium transition flex items-center justify-center gap-2 shadow-sm"
                >
                    <Download size={16} />
                    Usar Plantilla
                </button>
                {isOwner && onDelete && (
                    <button
                        onClick={onDelete}
                        className="p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition"
                        title="Eliminar"
                    >
                        <Trash2 size={18} />
                    </button>
                )}
            </div>
        </Card>
    );
};

export default Templates;
