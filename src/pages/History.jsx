import React, { useState, useEffect, useMemo } from 'react';
import { History as HistoryIcon, Trash2, Search, Filter, X, Calendar, DollarSign, ChevronUp, ChevronDown } from 'lucide-react';
import { useProject } from '../context/ProjectContext';
import { formatCurrency } from '../utils/format';
import Card from '../components/ui/Card';

const History = () => {
    const { loadBudget, deleteBudget: contextDeleteBudget } = useProject();
    const [projects, setProjects] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [sortBy, setSortBy] = useState('date'); // 'date', 'name', 'total', 'items'
    const [sortOrder, setSortOrder] = useState('desc'); // 'asc', 'desc'
    const [filterType, setFilterType] = useState('all');
    const [showFilters, setShowFilters] = useState(false);
    const [dateRange, setDateRange] = useState({ start: '', end: '' });
    const [priceRange, setPriceRange] = useState({ min: '', max: '' });

    useEffect(() => {
        loadProjects();
    }, []);

    const loadProjects = async () => {
        try {
            setLoading(true);
            // Import dynamically to avoid circular dependencies if any, or just use the imported service
            const { default: ProjectPersistenceService } = await import('../services/ProjectPersistenceService');
            const data = await ProjectPersistenceService.listProjects();
            setProjects(data);
        } catch (error) {
            console.error('Error loading history:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id, name) => {
        if (window.confirm(`¿Eliminar el proyecto "${name}"?`)) {
            await contextDeleteBudget(id);
            // Reload list to ensure sync
            loadProjects();
        }
    };

    // Filtrar y ordenar proyectos
    const filteredAndSortedProjects = useMemo(() => {
        let filtered = [...projects];

        // Búsqueda por texto
        if (searchTerm) {
            const searchLower = searchTerm.toLowerCase();
            filtered = filtered.filter(p => 
                p.project?.toLowerCase().includes(searchLower) ||
                p.client?.toLowerCase().includes(searchLower) ||
                p.type?.toLowerCase().includes(searchLower)
            );
        }

        // Filtro por tipo
        if (filterType !== 'all') {
            filtered = filtered.filter(p => p.type === filterType);
        }

        // Filtro por rango de fechas
        if (dateRange.start || dateRange.end) {
            filtered = filtered.filter(p => {
                if (!p.lastModified) return false;
                const projectDate = new Date(p.lastModified);
                if (dateRange.start && projectDate < new Date(dateRange.start)) return false;
                if (dateRange.end && projectDate > new Date(dateRange.end + 'T23:59:59')) return false;
                return true;
            });
        }

        // Filtro por rango de precios
        if (priceRange.min || priceRange.max) {
            filtered = filtered.filter(p => {
                const total = p.total || 0;
                if (priceRange.min && total < parseFloat(priceRange.min)) return false;
                if (priceRange.max && total > parseFloat(priceRange.max)) return false;
                return true;
            });
        }

        // Ordenamiento
        filtered.sort((a, b) => {
            let aVal, bVal;
            switch (sortBy) {
                case 'name':
                    aVal = (a.project || '').toLowerCase();
                    bVal = (b.project || '').toLowerCase();
                    break;
                case 'total':
                    aVal = a.total || 0;
                    bVal = b.total || 0;
                    break;
                case 'items':
                    aVal = a.items?.length || 0;
                    bVal = b.items?.length || 0;
                    break;
                case 'date':
                default:
                    aVal = new Date(a.lastModified || 0).getTime();
                    bVal = new Date(b.lastModified || 0).getTime();
                    break;
            }

            if (sortOrder === 'asc') {
                return aVal > bVal ? 1 : aVal < bVal ? -1 : 0;
            } else {
                return aVal < bVal ? 1 : aVal > bVal ? -1 : 0;
            }
        });

        return filtered;
    }, [projects, searchTerm, filterType, dateRange, priceRange, sortBy, sortOrder]);

    // Obtener tipos únicos para el filtro
    const projectTypes = useMemo(() => {
        const types = new Set(projects.map(p => p.type).filter(Boolean));
        return ['all', ...Array.from(types)];
    }, [projects]);

    const handleSort = (field) => {
        if (sortBy === field) {
            setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
        } else {
            setSortBy(field);
            setSortOrder('desc');
        }
    };

    const clearFilters = () => {
        setSearchTerm('');
        setFilterType('all');
        setDateRange({ start: '', end: '' });
        setPriceRange({ min: '', max: '' });
    };

    const hasActiveFilters = searchTerm || filterType !== 'all' || dateRange.start || dateRange.end || priceRange.min || priceRange.max;

    return (
        <div className="space-y-6 animate-fadeIn">
            <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-50">Historial de Proyectos</h2>
                <button 
                    onClick={loadProjects} 
                    className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
                >
                    Actualizar
                </button>
            </div>

            {/* Búsqueda y Filtros */}
            <Card className="p-4">
                <div className="space-y-4">
                    {/* Barra de búsqueda */}
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={20} />
                        <input
                            type="text"
                            placeholder="Buscar por nombre, cliente o tipo..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                        />
                    </div>

                    {/* Botón de filtros */}
                    <div className="flex items-center justify-between">
                        <button
                            onClick={() => setShowFilters(!showFilters)}
                            className="flex items-center gap-2 px-4 py-2 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 rounded-lg transition"
                        >
                            <Filter size={18} />
                            Filtros Avanzados
                            {hasActiveFilters && (
                                <span className="bg-blue-500 text-white text-xs px-2 py-0.5 rounded-full">
                                    {[searchTerm && 1, filterType !== 'all' && 1, dateRange.start && 1, dateRange.end && 1, priceRange.min && 1, priceRange.max && 1].filter(Boolean).length}
                                </span>
                            )}
                        </button>
                        {hasActiveFilters && (
                            <button
                                onClick={clearFilters}
                                className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
                            >
                                <X size={16} />
                                Limpiar filtros
                            </button>
                        )}
                    </div>

                    {/* Panel de filtros expandible */}
                    {showFilters && (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 pt-4 border-t border-slate-200 dark:border-slate-700">
                            {/* Filtro por tipo */}
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                                    Tipo de Proyecto
                                </label>
                                <select
                                    value={filterType}
                                    onChange={(e) => setFilterType(e.target.value)}
                                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                                >
                                    {projectTypes.map(type => (
                                        <option key={type} value={type}>
                                            {type === 'all' ? 'Todos los tipos' : type}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* Rango de fechas - Inicio */}
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                                    <Calendar size={14} className="inline mr-1" />
                                    Fecha Desde
                                </label>
                                <input
                                    type="date"
                                    value={dateRange.start}
                                    onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
                                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                                />
                            </div>

                            {/* Rango de fechas - Fin */}
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                                    <Calendar size={14} className="inline mr-1" />
                                    Fecha Hasta
                                </label>
                                <input
                                    type="date"
                                    value={dateRange.end}
                                    onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
                                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                                />
                            </div>

                            {/* Rango de precios */}
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                                    <DollarSign size={14} className="inline mr-1" />
                                    Rango de Precio
                                </label>
                                <div className="flex gap-2">
                                    <input
                                        type="number"
                                        placeholder="Mín"
                                        value={priceRange.min}
                                        onChange={(e) => setPriceRange({ ...priceRange, min: e.target.value })}
                                        className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                                    />
                                    <input
                                        type="number"
                                        placeholder="Máx"
                                        value={priceRange.max}
                                        onChange={(e) => setPriceRange({ ...priceRange, max: e.target.value })}
                                        className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                                    />
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Ordenamiento */}
                    <div className="flex items-center gap-4 pt-2 border-t border-slate-200 dark:border-slate-700">
                        <span className="text-sm text-slate-600 dark:text-slate-400">Ordenar por:</span>
                        <div className="flex gap-2">
                            {[
                                { key: 'date', label: 'Fecha' },
                                { key: 'name', label: 'Nombre' },
                                { key: 'total', label: 'Total' },
                                { key: 'items', label: 'Partidas' }
                            ].map(option => (
                                <button
                                    key={option.key}
                                    onClick={() => handleSort(option.key)}
                                    className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm transition ${
                                        sortBy === option.key
                                            ? 'bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 font-medium'
                                            : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'
                                    }`}
                                >
                                    {option.label}
                                    {sortBy === option.key && (
                                        sortOrder === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />
                                    )}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            </Card>

            {/* Contador de resultados */}
            {!loading && projects.length > 0 && (
                <div className="text-sm text-slate-600 dark:text-slate-400">
                    Mostrando {filteredAndSortedProjects.length} de {projects.length} proyectos
                    {hasActiveFilters && ' (filtrados)'}
                </div>
            )}

            {loading ? (
                <div className="text-center py-20">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                </div>
            ) : projects.length === 0 ? (
                <Card className="text-center py-20">
                    <HistoryIcon size={48} className="mx-auto mb-4 text-slate-300 dark:text-slate-600 opacity-50" />
                    <p className="text-slate-500 dark:text-slate-400">No hay proyectos guardados aún.</p>
                </Card>
            ) : filteredAndSortedProjects.length === 0 ? (
                <Card className="text-center py-20">
                    <Search size={48} className="mx-auto mb-4 text-slate-300 dark:text-slate-600 opacity-50" />
                    <p className="text-slate-500 dark:text-slate-400 mb-2">No se encontraron proyectos con los filtros seleccionados.</p>
                    <button
                        onClick={clearFilters}
                        className="text-blue-600 dark:text-blue-400 hover:underline"
                    >
                        Limpiar filtros
                    </button>
                </Card>
            ) : (
                <div className="grid gap-4">
                    {filteredAndSortedProjects.map(b => (
                        <Card key={b.id} className="p-6 hover:shadow-md transition">
                            <div className="flex justify-between items-center">
                                <div className="flex-1">
                                    <h3 className="font-bold text-lg text-slate-800 dark:text-slate-100 mb-1">{b.project}</h3>
                                    <p className="text-sm text-slate-600 dark:text-slate-400 mb-2">
                                        Cliente: {b.client || 'Sin cliente'} • {b.lastModified ? new Date(b.lastModified).toLocaleDateString('es-MX', { 
                                            year: 'numeric', 
                                            month: 'long', 
                                            day: 'numeric' 
                                        }) : 'Fecha desconocida'}
                                    </p>
                                    <div className="flex gap-2 flex-wrap">
                                        <span className="text-xs bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 px-2 py-1 rounded font-medium">{b.type || 'General'}</span>
                                        <span className="text-xs bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 px-2 py-1 rounded">{b.items?.length || 0} partidas</span>
                                    </div>
                                </div>
                                <div className="text-right ml-4">
                                    <p className="font-bold text-xl text-blue-600 dark:text-blue-400 font-mono mb-3">{formatCurrency(b.total || 0)}</p>
                                    <div className="flex gap-2 justify-end">
                                        <button 
                                            onClick={() => loadBudget(b)} 
                                            className="px-4 py-2 text-sm bg-blue-600 dark:bg-blue-500 hover:bg-blue-700 dark:hover:bg-blue-600 text-white font-bold rounded-lg transition"
                                        >
                                            Abrir
                                        </button>
                                        <button
                                            onClick={() => handleDelete(b.id, b.project)}
                                            className="p-2 text-slate-400 dark:text-slate-500 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition"
                                            title="Eliminar proyecto"
                                        >
                                            <Trash2 size={18} />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
};

export default History;
