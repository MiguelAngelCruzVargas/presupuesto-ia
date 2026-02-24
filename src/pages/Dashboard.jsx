import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { ArrowRight, Info, Sparkles, PieChart, Bot, FolderOpen, TrendingUp, Calendar, DollarSign, FileText, Plus, Clock, BarChart3 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Card from '../components/ui/Card';
import { useProject } from '../context/ProjectContext';
import { useAuth } from '../context/AuthContext';
import { formatCurrency } from '../utils/format';
import { AIBudgetService } from '../services/AIBudgetService';
import { ValidationService } from '../services/ValidationService';
import { ErrorService } from '../services/ErrorService';
import { CalculationsService } from '../services/CalculationsService';
import ErrorTestPanel from '../components/testing/ErrorTestPanel';
import { supabase } from '../lib/supabaseClient';

const Dashboard = () => {
    const { items, projectInfo, calculateSubtotal, calculateTotal, showToast, setItems, catalog, savedBudgets } = useProject();
    const { user } = useAuth();
    const navigate = useNavigate();
    const [aiPrompt, setAiPrompt] = useState('');
    const [isAiLoading, setIsAiLoading] = useState(false);
    const [showErrorTestPanel, setShowErrorTestPanel] = useState(false);
    const [recentProjects, setRecentProjects] = useState([]);
    const [overallStats, setOverallStats] = useState(null);
    const [loadingProjects, setLoadingProjects] = useState(false);

    // Cargar proyectos recientes y estadísticas
    useEffect(() => {
        loadProjectsAndStats();
    }, [user, savedBudgets]);

    const loadProjectsAndStats = async () => {
        if (!user) return;
        
        setLoadingProjects(true);
        try {
            // Cargar proyectos con sus items
            const { data: projects, error: projectsError } = await supabase
                .from('projects')
                .select('*')
                .eq('user_id', user.id)
                .order('updated_at', { ascending: false })
                .limit(10);

            if (projectsError) throw projectsError;

            // Calcular estadísticas de cada proyecto
            const projectsWithStats = await Promise.all(
                (projects || []).map(async (project) => {
                    const { data: projectItems } = await supabase
                        .from('budget_items')
                        .select('*')
                        .eq('project_id', project.id);

                    const itemsList = projectItems || [];
                    const subtotal = CalculationsService.calculateSubtotal(itemsList);
                    const total = CalculationsService.calculateTotal(itemsList, {
                        indirectPercentage: project.indirect_percentage || 0,
                        profitPercentage: project.profit_percentage || 0,
                        taxRate: project.tax_rate || 16
                    });

                    return {
                        id: project.id,
                        name: project.name,
                        client: project.client || 'Sin cliente',
                        type: project.type || 'General',
                        location: project.location || '',
                        updatedAt: project.updated_at,
                        createdAt: project.created_at,
                        itemsCount: itemsList.length,
                        total: total.total,
                        subtotal: subtotal
                    };
                })
            );

            setRecentProjects(projectsWithStats);

            // Calcular estadísticas generales
            const stats = {
                totalProjects: projects?.length || 0,
                totalValue: projectsWithStats.reduce((sum, p) => sum + (p.total || 0), 0),
                totalItems: projectsWithStats.reduce((sum, p) => sum + (p.itemsCount || 0), 0),
                avgProjectValue: projectsWithStats.length > 0 
                    ? projectsWithStats.reduce((sum, p) => sum + (p.total || 0), 0) / projectsWithStats.length 
                    : 0,
                projectsByType: {},
                recentCount: projectsWithStats.filter(p => {
                    const daysSinceUpdate = (Date.now() - new Date(p.updatedAt).getTime()) / (1000 * 60 * 60 * 24);
                    return daysSinceUpdate <= 30;
                }).length
            };

            // Agrupar por tipo
            projectsWithStats.forEach(p => {
                stats.projectsByType[p.type] = (stats.projectsByType[p.type] || 0) + 1;
            });

            setOverallStats(stats);
        } catch (error) {
            console.error('Error loading projects:', error);
        } finally {
            setLoadingProjects(false);
        }
    };

    // Memoized calculations para proyecto actual
    const total = useMemo(() => calculateTotal(), [items, projectInfo, calculateTotal]);
    const subtotal = useMemo(() => calculateSubtotal(), [items, calculateSubtotal]);
    const categories = ['Materiales', 'Mano de Obra', 'Equipos', 'Instalaciones', 'Obra Civil'];

    // Memoized category data
    const catData = useMemo(() => {
        return categories.map(cat => {
            const amount = items.filter(i => i.category === cat).reduce((a, b) => a + (b.quantity * b.unitPrice), 0);
            return { cat, amount, percent: subtotal > 0 ? (amount / subtotal * 100) : 0 };
        }).filter(d => d.amount > 0);
    }, [items, subtotal]);

    // Generate budget from AI prompt
    const generateBudgetFromAI = useCallback(async () => {
        if (!aiPrompt.trim()) {
            showToast('Por favor, describe qué necesitas agregar', 'warning');
            return;
        }

        setIsAiLoading(true);
        try {
            const generatedItems = await AIBudgetService.generateBudgetFromPrompt(
                aiPrompt,
                projectInfo,
                catalog
            );

            if (generatedItems.length === 0) {
                showToast('No se pudieron generar partidas. Intenta con una descripción más específica.', 'warning');
                return;
            }

            // Validate generated items
            const validItems = generatedItems.filter(item => {
                const validation = ValidationService.validateItem(item);
                return validation.valid;
            });

            if (validItems.length === 0) {
                showToast('Las partidas generadas no son válidas', 'error');
                return;
            }

            setItems([...items, ...validItems]);
            setAiPrompt('');
            showToast(`Se generaron ${validItems.length} partidas`, 'success');
        } catch (error) {
            const errorMessage = ErrorService.getErrorMessage(error);
            ErrorService.logError(error, 'Dashboard.generateBudgetFromAI');
            showToast(errorMessage, 'error');
        } finally {
            setIsAiLoading(false);
        }
    }, [aiPrompt, projectInfo, catalog, items, setItems, showToast]);

    const formatDate = (dateString) => {
        if (!dateString) return 'N/A';
        const date = new Date(dateString);
        const now = new Date();
        const diffTime = Math.abs(now - date);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        if (diffDays === 0) return 'Hoy';
        if (diffDays === 1) return 'Ayer';
        if (diffDays < 7) return `Hace ${diffDays} días`;
        if (diffDays < 30) return `Hace ${Math.floor(diffDays / 7)} semanas`;
        return date.toLocaleDateString('es-MX', { day: 'numeric', month: 'short' });
    };

    const openProject = async (projectId) => {
        navigate(`/editor?project=${projectId}`);
    };

    return (
        <div className="space-y-6 animate-fadeIn">
            {/* Header */}
            <div className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-end">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-50 mb-1">Visión General</h1>
                    <p className="text-slate-700 dark:text-slate-200">Panel de Control - Resumen de tus proyectos y estadísticas</p>
                </div>
                <div className="flex gap-3">
                    <button 
                        onClick={() => navigate('/editor?new=true')}
                        className="bg-green-600 hover:bg-green-700 text-white px-5 py-2 rounded-xl font-semibold shadow-lg shadow-green-200 dark:shadow-green-900/50 transition flex items-center gap-2"
                    >
                        <Plus size={18} />
                        Nuevo Proyecto
                    </button>
                    {items.length > 0 && (
                        <button 
                            onClick={() => navigate('/editor')}
                            className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-xl font-semibold shadow-lg shadow-blue-200 dark:shadow-blue-900/50 transition flex items-center gap-2"
                        >
                            Ir al Editor <ArrowRight size={18} />
                        </button>
                    )}
                </div>
            </div>

            {/* Estadísticas Generales */}
            {overallStats && overallStats.totalProjects > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white border-none">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-blue-100 text-sm font-medium">Total Proyectos</p>
                                <p className="text-3xl font-bold mt-1">{overallStats.totalProjects}</p>
                            </div>
                            <FolderOpen size={32} className="text-blue-200 opacity-70" />
                        </div>
                    </Card>

                    <Card className="bg-gradient-to-br from-emerald-500 to-emerald-600 text-white border-none">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-emerald-100 text-sm font-medium">Valor Total</p>
                                <p className="text-3xl font-bold mt-1">{formatCurrency(overallStats.totalValue)}</p>
                            </div>
                            <DollarSign size={32} className="text-emerald-200 opacity-70" />
                        </div>
                    </Card>

                    <Card className="bg-gradient-to-br from-purple-500 to-purple-600 text-white border-none">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-purple-100 text-sm font-medium">Total Partidas</p>
                                <p className="text-3xl font-bold mt-1">{overallStats.totalItems}</p>
                            </div>
                            <FileText size={32} className="text-purple-200 opacity-70" />
                        </div>
                    </Card>

                    <Card className="bg-gradient-to-br from-orange-500 to-orange-600 text-white border-none">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-orange-100 text-sm font-medium">Promedio/Proyecto</p>
                                <p className="text-3xl font-bold mt-1">{formatCurrency(overallStats.avgProjectValue)}</p>
                            </div>
                            <TrendingUp size={32} className="text-orange-200 opacity-70" />
                        </div>
                    </Card>
                </div>
            )}

            {/* Proyecto Actual */}
            {items.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Tarjeta de Total del Proyecto Actual */}
                    <Card className="bg-gradient-to-br from-blue-600 to-indigo-700 text-white border-none relative overflow-hidden">
                        <div className="relative z-10">
                            <p className="text-blue-100 font-medium mb-1">Proyecto Actual</p>
                            <h3 className="text-2xl font-bold mb-2">{projectInfo.project || 'Sin nombre'}</h3>
                            <p className="text-4xl font-bold mb-4">{formatCurrency(total)}</p>
                            <div className="flex items-center text-sm bg-white/10 w-fit px-3 py-1 rounded-full">
                                <Info size={14} className="mr-2" /> Incluye {projectInfo.taxRate}% IVA
                            </div>
                        </div>
                        <Sparkles className="absolute -right-6 -bottom-6 text-white opacity-10" size={150} />
                    </Card>

                    {/* Estadísticas del Proyecto Actual */}
                    <Card title="Métricas del Proyecto">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="p-3 bg-slate-50 dark:bg-slate-800/80 rounded-lg border border-slate-200 dark:border-slate-700">
                                <p className="text-xs text-slate-600 dark:text-slate-200 uppercase font-bold">Partidas</p>
                                <p className="text-2xl font-bold text-slate-900 dark:text-slate-50">{items.length}</p>
                            </div>
                            <div className="p-3 bg-slate-50 dark:bg-slate-800/80 rounded-lg border border-slate-200 dark:border-slate-700">
                                <p className="text-xs text-slate-600 dark:text-slate-200 uppercase font-bold">Cliente</p>
                                <p className="text-lg font-bold text-slate-900 dark:text-slate-50 truncate">{projectInfo.client || "Sin asignar"}</p>
                            </div>
                            <div className="col-span-2 p-3 bg-slate-50 dark:bg-slate-800/80 rounded-lg border border-slate-200 dark:border-slate-700">
                                <p className="text-xs text-slate-600 dark:text-slate-200 uppercase font-bold">Tipo de Proyecto</p>
                                <p className="text-md font-bold text-blue-700 dark:text-blue-300">{projectInfo.type}</p>
                            </div>
                        </div>
                    </Card>

                    {/* Desglose por Categoría */}
                    <Card title="Desglose por Categoría">
                        {catData.length > 0 ? (
                            <div className="space-y-4">
                                {catData.map(d => (
                                    <div key={d.cat}>
                                        <div className="flex justify-between text-sm mb-1">
                                            <span className="font-medium text-slate-700 dark:text-slate-200">{d.cat}</span>
                                            <span className="text-slate-900 dark:text-slate-50 font-mono font-semibold">{formatCurrency(d.amount)}</span>
                                        </div>
                                        <div className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                                            <div className="h-full bg-blue-600 dark:bg-blue-500 rounded-full" style={{ width: `${d.percent}%` }}></div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="h-full flex flex-col items-center justify-center text-slate-400 dark:text-slate-500 py-8">
                                <PieChart size={40} className="mb-2 opacity-30 dark:opacity-50" />
                                <p className="text-sm text-slate-500 dark:text-slate-300">Sin datos aún</p>
                            </div>
                        )}
                    </Card>
                </div>
            )}

            {/* Sin Proyecto Actual */}
            {items.length === 0 && !loadingProjects && (
                <Card className="text-center py-12 bg-gradient-to-br from-slate-50 to-blue-50 dark:from-slate-800 dark:to-slate-900 border-2 border-dashed border-slate-400 dark:border-slate-600">
                    <FolderOpen size={64} className="mx-auto text-slate-400 dark:text-slate-500 mb-4" />
                    <h3 className="text-xl font-bold text-slate-800 dark:text-slate-50 mb-2">No hay proyecto activo</h3>
                    <p className="text-slate-600 dark:text-slate-200 mb-6">Crea un nuevo proyecto o abre uno existente para comenzar</p>
                    <button 
                        onClick={() => navigate('/editor?new=true')}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-semibold shadow-lg transition inline-flex items-center gap-2"
                    >
                        <Plus size={20} />
                        Crear Nuevo Proyecto
                    </button>
                </Card>
            )}

            {/* Proyectos Recientes */}
            {recentProjects.length > 0 && (
                <Card title="Proyectos Recientes" className="overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b-2 border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-800">
                                    <th className="text-left py-3 px-4 text-xs font-bold text-slate-700 dark:text-slate-200 uppercase">Proyecto</th>
                                    <th className="text-left py-3 px-4 text-xs font-bold text-slate-700 dark:text-slate-200 uppercase">Cliente</th>
                                    <th className="text-left py-3 px-4 text-xs font-bold text-slate-700 dark:text-slate-200 uppercase">Tipo</th>
                                    <th className="text-right py-3 px-4 text-xs font-bold text-slate-700 dark:text-slate-200 uppercase">Valor</th>
                                    <th className="text-center py-3 px-4 text-xs font-bold text-slate-700 dark:text-slate-200 uppercase">Partidas</th>
                                    <th className="text-left py-3 px-4 text-xs font-bold text-slate-700 dark:text-slate-200 uppercase">Última Modificación</th>
                                    <th className="text-center py-3 px-4 text-xs font-bold text-slate-700 dark:text-slate-200 uppercase">Acciones</th>
                                </tr>
                            </thead>
                            <tbody>
                                {recentProjects.map((project) => (
                                    <tr 
                                        key={project.id} 
                                        className="border-b border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800/80 transition cursor-pointer"
                                        onClick={() => openProject(project.id)}
                                    >
                                        <td className="py-4 px-4">
                                            <p className="font-semibold text-slate-900 dark:text-slate-50">{project.name}</p>
                                        </td>
                                        <td className="py-4 px-4 text-sm text-slate-700 dark:text-slate-200">{project.client}</td>
                                        <td className="py-4 px-4">
                                            <span className="inline-block px-3 py-1 bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-100 rounded-md text-xs font-semibold border border-blue-200 dark:border-blue-700">
                                                {project.type}
                                            </span>
                                        </td>
                                        <td className="py-4 px-4 text-right font-bold text-slate-900 dark:text-slate-50">
                                            {formatCurrency(project.total || 0)}
                                        </td>
                                        <td className="py-4 px-4 text-center text-sm text-slate-700 dark:text-slate-200 font-medium">
                                            {project.itemsCount}
                                        </td>
                                        <td className="py-4 px-4 text-sm text-slate-600 dark:text-slate-200 flex items-center gap-1">
                                            <Clock size={14} className="text-slate-500 dark:text-slate-200" />
                                            {formatDate(project.updatedAt)}
                                        </td>
                                        <td className="py-4 px-4 text-center">
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    openProject(project.id);
                                                }}
                                                className="text-blue-700 dark:text-blue-300 hover:text-blue-800 dark:hover:text-blue-200 font-semibold text-sm underline-offset-2 hover:underline"
                                            >
                                                Abrir →
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </Card>
            )}

            {/* Sin Proyectos */}
            {!loadingProjects && recentProjects.length === 0 && items.length === 0 && (
                <Card className="text-center py-12">
                    <FolderOpen size={64} className="mx-auto text-slate-400 dark:text-slate-500 mb-4" />
                    <h3 className="text-xl font-bold text-slate-800 dark:text-slate-50 mb-2">No tienes proyectos aún</h3>
                    <p className="text-slate-600 dark:text-slate-200 mb-6">Crea tu primer proyecto para comenzar a trabajar</p>
                    <button 
                        onClick={() => navigate('/editor?new=true')}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-semibold shadow-lg transition inline-flex items-center gap-2"
                    >
                        <Plus size={20} />
                        Crear Primer Proyecto
                    </button>
                </Card>
            )}

            {/* Gráfico de Distribución por Tipo (si hay proyectos) */}
            {overallStats && overallStats.totalProjects > 0 && Object.keys(overallStats.projectsByType).length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Card title="Distribución por Tipo de Proyecto">
                        <div className="space-y-3">
                            {Object.entries(overallStats.projectsByType).map(([type, count]) => {
                                const percent = (count / overallStats.totalProjects) * 100;
                                return (
                                    <div key={type}>
                                        <div className="flex justify-between text-sm mb-1">
                                            <span className="font-medium text-slate-700 dark:text-slate-200">{type}</span>
                                            <span className="text-slate-900 dark:text-slate-50 font-bold">{count} proyectos</span>
                                        </div>
                                        <div className="w-full h-3 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                                            <div className="h-full bg-gradient-to-r from-purple-600 to-pink-600 dark:from-purple-500 dark:to-pink-500 rounded-full" style={{ width: `${percent}%` }}></div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </Card>

                    <Card title="Actividad Reciente">
                        <div className="space-y-4">
                            <div className="flex items-center justify-between p-4 bg-slate-100 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-green-100 dark:bg-green-900/50 rounded-lg border border-green-200 dark:border-green-800">
                                        <Calendar size={20} className="text-green-700 dark:text-green-400" />
                                    </div>
                                    <div>
                                        <p className="font-semibold text-slate-900 dark:text-slate-50">Proyectos Activos</p>
                                        <p className="text-sm text-slate-600 dark:text-slate-200">Últimos 30 días</p>
                                    </div>
                                </div>
                                <p className="text-3xl font-bold text-green-700 dark:text-green-400">{overallStats.recentCount}</p>
                            </div>
                            {recentProjects.length > 0 && (
                                <div className="p-4 bg-blue-50 dark:bg-blue-900/30 rounded-lg border border-blue-200 dark:border-blue-800">
                                    <p className="text-sm text-slate-700 dark:text-slate-200 mb-2">Último proyecto modificado:</p>
                                    <p className="font-semibold text-slate-900 dark:text-slate-50">{recentProjects[0]?.name}</p>
                                    <p className="text-xs text-slate-600 dark:text-slate-200 mt-1">{formatDate(recentProjects[0]?.updatedAt)}</p>
                                </div>
                            )}
                        </div>
                    </Card>
                </div>
            )}

            {/* AI Quick Actions */}
            <Card className="bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-900/30 dark:to-purple-900/30 border-2 border-indigo-300 dark:border-indigo-700">
                <div className="flex flex-col md:flex-row items-center gap-6">
                    <div className="bg-white dark:bg-slate-800 p-4 rounded-full shadow-lg text-indigo-700 dark:text-indigo-300 border-2 border-indigo-200 dark:border-indigo-700">
                        <Bot size={32} />
                    </div>
                    <div className="flex-1">
                        <h3 className="font-bold text-indigo-900 dark:text-indigo-50 text-lg mb-1">Asistente Inteligente</h3>
                        <p className="text-indigo-800 dark:text-indigo-200 text-sm">Genera partidas rápidamente con inteligencia artificial. Describe tu proyecto y la IA creará el presupuesto.</p>
                    </div>
                    <div className="flex-1 w-full flex gap-2">
                        <input
                            value={aiPrompt}
                            onChange={(e) => setAiPrompt(e.target.value)}
                            placeholder="Ej: Remodelación de baño 2x2 metros con azulejo y regadera..."
                            className="w-full px-4 py-3 rounded-lg border-2 border-indigo-300 dark:border-indigo-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-50 placeholder:text-slate-500 dark:placeholder:text-slate-400 dark:placeholder:opacity-80 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 dark:focus:border-indigo-400 outline-none"
                            onKeyDown={(e) => e.key === 'Enter' && generateBudgetFromAI()}
                            disabled={isAiLoading}
                        />
                        <button
                            onClick={generateBudgetFromAI}
                            disabled={isAiLoading || !aiPrompt.trim()}
                            className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-lg font-bold shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center justify-center min-w-[60px]"
                        >
                            {isAiLoading ? (
                                <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                            ) : (
                                <Sparkles size={20} />
                            )}
                        </button>
                    </div>
                </div>
            </Card>

            {/* Panel de Prueba de Errores - Solo en desarrollo */}
            {import.meta.env.DEV && (
                <Card className="border-2 border-dashed border-amber-300 dark:border-amber-700 bg-amber-50/50 dark:bg-amber-900/10">
                    <div className="flex items-center justify-between mb-4">
                        <div>
                            <h3 className="font-bold text-amber-900 dark:text-amber-200 flex items-center gap-2">
                                <Info size={20} />
                                Panel de Prueba de Errores (Solo Desarrollo)
                            </h3>
                            <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
                                Prueba diferentes tipos de errores para verificar el sistema de manejo
                            </p>
                        </div>
                        <button
                            onClick={() => setShowErrorTestPanel(!showErrorTestPanel)}
                            className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-sm font-medium transition"
                        >
                            {showErrorTestPanel ? 'Ocultar' : 'Mostrar'}
                        </button>
                    </div>
                    {showErrorTestPanel && <ErrorTestPanel />}
                </Card>
            )}
        </div>
    );
};

export default Dashboard;
