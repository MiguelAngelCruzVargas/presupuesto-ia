import React, { useState, useEffect, useMemo } from 'react';
import {
    History as HistoryIcon,
    Trash2,
    Search,
    Filter,
    X,
    Calendar,
    DollarSign,
    ChevronUp,
    ChevronDown,
    FolderKanban,
    ArrowUpRight,
    Layers3,
    UserRound,
    Clock3
} from 'lucide-react';
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

    const historyStats = useMemo(() => {
        const totalProjects = projects.length;
        const totalItems = projects.reduce((sum, project) => sum + (project.items?.length || 0), 0);
        const totalValue = projects.reduce((sum, project) => sum + (project.total || 0), 0);
        return { totalProjects, totalItems, totalValue };
    }, [projects]);

    const formatProjectDate = (date) => {
        if (!date) return 'Fecha desconocida';
        return new Date(date).toLocaleDateString('es-MX', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    };

    return (
        <div className="space-y-6 animate-fadeIn">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                <div>
                    <div className="inline-flex items-center gap-2 rounded-full border border-blue-200/80 bg-blue-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-blue-700 dark:border-blue-800 dark:bg-blue-950/40 dark:text-blue-300">
                        <FolderKanban size={14} />
                        Archivo inteligente
                    </div>
                    <h2 className="mt-3 text-3xl font-bold text-slate-800 dark:text-slate-50">Historial de Proyectos</h2>
                    <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                        Tus presupuestos guardados en formato de expediente para abrirlos, compararlos o depurarlos rápido.
                    </p>
                </div>
                <button
                    onClick={loadProjects}
                    className="inline-flex items-center gap-2 self-start rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:-translate-y-0.5 hover:border-blue-200 hover:text-blue-700 hover:shadow-md dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:border-blue-800 dark:hover:text-blue-300"
                >
                    <Clock3 size={16} />
                    Actualizar
                </button>
            </div>

            {!loading && projects.length > 0 && (
                <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                    <Card className="border-0 bg-gradient-to-br from-slate-900 via-slate-800 to-blue-950 text-white shadow-xl shadow-slate-950/10">
                        <div className="flex items-start justify-between">
                            <div>
                                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-200/80">Proyectos</p>
                                <p className="mt-3 text-3xl font-bold">{historyStats.totalProjects}</p>
                                <p className="mt-2 text-sm text-slate-300">Expedientes guardados en tu historial.</p>
                            </div>
                            <div className="rounded-2xl bg-white/10 p-3">
                                <FolderKanban size={22} />
                            </div>
                        </div>
                    </Card>
                    <Card className="border border-emerald-200/80 bg-gradient-to-br from-emerald-50 via-white to-teal-50 shadow-lg shadow-emerald-500/5 dark:border-emerald-900/60 dark:from-emerald-950/30 dark:via-slate-900 dark:to-slate-900">
                        <div className="flex items-start justify-between">
                            <div>
                                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-700 dark:text-emerald-300">Partidas totales</p>
                                <p className="mt-3 text-3xl font-bold text-slate-900 dark:text-slate-50">{historyStats.totalItems}</p>
                                <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">Conceptos acumulados entre todos los proyectos.</p>
                            </div>
                            <div className="rounded-2xl bg-emerald-100 p-3 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300">
                                <Layers3 size={22} />
                            </div>
                        </div>
                    </Card>
                    <Card className="border border-amber-200/80 bg-gradient-to-br from-amber-50 via-white to-orange-50 shadow-lg shadow-amber-500/5 dark:border-amber-900/60 dark:from-amber-950/30 dark:via-slate-900 dark:to-slate-900">
                        <div className="flex items-start justify-between">
                            <div>
                                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-700 dark:text-amber-300">Valor acumulado</p>
                                <p className="mt-3 text-2xl font-bold text-slate-900 dark:text-slate-50">{formatCurrency(historyStats.totalValue)}</p>
                                <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">Suma total de los presupuestos guardados.</p>
                            </div>
                            <div className="rounded-2xl bg-amber-100 p-3 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300">
                                <DollarSign size={22} />
                            </div>
                        </div>
                    </Card>
                </div>
            )}

            {/* Búsqueda y Filtros */}
            <Card className="border border-slate-200/80 bg-gradient-to-br from-white via-slate-50 to-slate-100/80 shadow-lg shadow-slate-900/5 dark:border-slate-700 dark:from-slate-900 dark:via-slate-900 dark:to-slate-800/80">
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
                <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
                    {filteredAndSortedProjects.map(b => (
                        <Card
                            key={b.id}
                            className="group relative overflow-visible border border-slate-200/80 bg-gradient-to-br from-white via-slate-50 to-blue-50/60 shadow-lg shadow-slate-900/5 transition duration-300 hover:-translate-y-1 hover:border-blue-200 hover:shadow-2xl hover:shadow-blue-950/10 dark:border-slate-700 dark:from-slate-900 dark:via-slate-900 dark:to-slate-800"
                        >
                            <div className="absolute left-6 top-0 h-4 w-28 -translate-y-[60%] rounded-t-2xl border border-b-0 border-slate-200/80 bg-gradient-to-r from-blue-100 via-white to-slate-100 dark:border-slate-700 dark:from-blue-950/60 dark:via-slate-900 dark:to-slate-900" />
                            <div className="flex h-full flex-col gap-6">
                                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                                    <div className="flex min-w-0 flex-1 gap-4">
                                        <div className="hidden shrink-0 rounded-2xl bg-blue-600 p-3 text-white shadow-lg shadow-blue-900/20 sm:flex">
                                            <FolderKanban size={22} />
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <div className="flex flex-wrap items-center gap-2">
                                                <span className="inline-flex items-center rounded-full bg-blue-100 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">
                                                    {b.type || 'General'}
                                                </span>
                                                <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                                                    {b.items?.length || 0} partidas
                                                </span>
                                            </div>
                                            <h3 className="mt-3 truncate text-xl font-bold text-slate-900 dark:text-slate-50">
                                                {b.project || 'Proyecto sin nombre'}
                                            </h3>
                                            <div className="mt-3 grid grid-cols-1 gap-2 text-sm text-slate-600 dark:text-slate-400 sm:grid-cols-2">
                                                <p className="flex items-center gap-2">
                                                    <UserRound size={15} className="text-slate-400" />
                                                    Cliente: <span className="font-medium text-slate-700 dark:text-slate-200">{b.client || 'Sin cliente'}</span>
                                                </p>
                                                <p className="flex items-center gap-2">
                                                    <Calendar size={15} className="text-slate-400" />
                                                    {formatProjectDate(b.lastModified)}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="rounded-2xl border border-blue-100 bg-white/80 px-4 py-3 text-left shadow-sm backdrop-blur dark:border-blue-900/50 dark:bg-slate-900/70 lg:min-w-[210px] lg:text-right">
                                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">Total del presupuesto</p>
                                        <p className="mt-2 font-mono text-2xl font-bold text-blue-600 dark:text-blue-400">
                                            {formatCurrency(b.total || 0)}
                                        </p>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                                    <div className="rounded-2xl border border-slate-200/80 bg-white/70 p-4 dark:border-slate-700 dark:bg-slate-900/60">
                                        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">Estado</p>
                                        <p className="mt-2 text-sm font-semibold text-slate-800 dark:text-slate-100">Listo para abrir</p>
                                    </div>
                                    <div className="rounded-2xl border border-slate-200/80 bg-white/70 p-4 dark:border-slate-700 dark:bg-slate-900/60">
                                        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">Captura</p>
                                        <p className="mt-2 text-sm font-semibold text-slate-800 dark:text-slate-100">{b.items?.length || 0} conceptos registrados</p>
                                    </div>
                                    <div className="rounded-2xl border border-slate-200/80 bg-white/70 p-4 dark:border-slate-700 dark:bg-slate-900/60">
                                        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">Última edición</p>
                                        <p className="mt-2 text-sm font-semibold text-slate-800 dark:text-slate-100">{formatProjectDate(b.lastModified)}</p>
                                    </div>
                                </div>

                                <div className="flex flex-col gap-3 border-t border-slate-200/80 pt-4 dark:border-slate-700 sm:flex-row sm:items-center sm:justify-between">
                                    <p className="text-sm text-slate-500 dark:text-slate-400">
                                        Expediente listo para continuar trabajando o revisar historial.
                                    </p>
                                    <div className="flex gap-2 sm:justify-end">
                                        <button
                                            onClick={() => loadBudget(b)}
                                            className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600"
                                        >
                                            Abrir proyecto
                                            <ArrowUpRight size={16} />
                                        </button>
                                        <button
                                            onClick={() => handleDelete(b.id, b.project)}
                                            className="rounded-xl border border-slate-200 p-2.5 text-slate-400 transition hover:border-red-200 hover:bg-red-50 hover:text-red-500 dark:border-slate-700 dark:text-slate-500 dark:hover:border-red-900 dark:hover:bg-red-900/20 dark:hover:text-red-400"
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
