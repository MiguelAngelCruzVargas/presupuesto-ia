import React, { createContext, useState, useEffect, useContext } from 'react';
// Context for managing project state
import { supabase } from '../lib/supabaseClient';
import { useAuth } from './AuthContext';
import { generateId } from '../utils/helpers';
import { CalculationsService } from '../services/CalculationsService';

const ProjectContext = createContext();

export const useProject = () => useContext(ProjectContext);

export const ProjectProvider = ({ children }) => {
    const { user, loading: authLoading } = useAuth();
    const [toast, setToast] = useState(null);

    // --- ESTADOS DEL PROYECTO ---
    const [projectInfo, setProjectInfo] = useState({
        id: generateId(),
        client: '',
        project: 'Presupuesto Nuevo',
        date: new Date().toISOString().split('T')[0],
        currency: 'MXN',
        taxRate: 16,
        type: 'General',
        indirect_percentage: 0,
        profit_percentage: 0,
        location: 'México'
    });

    const [items, setItems] = useState([]);
    const [savedBudgets, setSavedBudgets] = useState([]);
    const [catalog, setCatalog] = useState([]);
    const [loading, setLoading] = useState(false);

    // --- RATE LIMIT MODAL STATE ---
    const [rateLimitModal, setRateLimitModal] = useState({
        isOpen: false,
        message: '',
        retryAfter: 0
    });

    // --- FUNCIONES CORE ---
    const showToast = React.useCallback((msg, type = 'info', error = null) => {
        setToast({ message: msg, type, error });
    }, []);

    const showRateLimitModal = React.useCallback((message, retryAfter) => {
        setRateLimitModal({
            isOpen: true,
            message: message || 'Has excedido el límite de solicitudes.',
            retryAfter: retryAfter || 0
        });
    }, []);

    const closeRateLimitModal = React.useCallback(() => {
        setRateLimitModal(prev => ({ ...prev, isOpen: false }));
    }, []);

    // --- FUNCIONES DE CARGA ---
    const loadUserData = async () => {
        if (!user) return;

        setLoading(true);
        try {
            // Cargar proyectos guardados
            const { data: projects, error: projectsError } = await supabase
                .from('projects')
                .select('*')
                .eq('user_id', user.id)
                .order('updated_at', { ascending: false });

            if (projectsError) throw projectsError;

            // Cargar items de cada proyecto
            const projectsWithItems = await Promise.all(
                projects.map(async (project) => {
                    const { data: items } = await supabase
                        .from('budget_items')
                        .select('*')
                        .eq('project_id', project.id)
                        .order('order_index', { ascending: true });

                    return { ...project, items: items || [] };
                })
            );

            setSavedBudgets(projectsWithItems);

            // Cargar catálogo
            const { data: catalogData, error: catalogError } = await supabase
                .from('catalog_items')
                .select('*')
                .or(`user_id.eq.${user.id},is_public.eq.true`)
                .order('created_at', { ascending: false });

            if (catalogError) throw catalogError;

            // Si el catálogo está vacío, sembrar datos de ejemplo
            if (!catalogData || catalogData.length === 0) {
                const defaultItems = [
                    { description: 'Trazo y nivelación de terreno con equipo topográfico', unit: 'm2', unit_price: 15.50, category: 'Mano de Obra', user_id: user.id, is_public: false },
                    { description: 'Excavación a mano en cepas de cimentación material tipo II', unit: 'm3', unit_price: 280.00, category: 'Obra Civil', user_id: user.id, is_public: false },
                    { description: 'Salida eléctrica de centro para alumbrado con cable THW-LS calibre 12', unit: 'sal', unit_price: 650.00, category: 'Instalaciones', user_id: user.id, is_public: false },
                    { description: 'Muro de block hueco 15x20x40 cm asentado con mortero cemento-arena 1:4', unit: 'm2', unit_price: 420.00, category: 'Obra Civil', user_id: user.id, is_public: false },
                    { description: 'Pintura vinílica en muros a dos manos marca Comex', unit: 'm2', unit_price: 65.00, category: 'Materiales', user_id: user.id, is_public: false },
                ];

                const { data: seededData, error: seedError } = await supabase
                    .from('catalog_items')
                    .insert(defaultItems)
                    .select();

                if (!seedError && seededData) {
                    setCatalog(seededData.map(item => ({
                        id: item.id,
                        description: item.description,
                        unit: item.unit,
                        unitPrice: item.unit_price,
                        category: item.category
                    })));
                    showToast('Catálogo inicial cargado', 'success');
                } else {
                    setCatalog([]);
                }
            } else {
                setCatalog(catalogData.map(item => ({
                    id: item.id,
                    description: item.description,
                    unit: item.unit,
                    unitPrice: item.unit_price,
                    category: item.category
                })));
            }

        } catch (error) {
            console.error('Error loading user data:', error);
            showToast('Error al cargar datos', 'error');
        } finally {
            setLoading(false);
        }
    };

    const loadFromLocalStorage = () => {
        const saved = localStorage.getItem('presugenius_budgets');
        if (saved) {
            try {
                setSavedBudgets(JSON.parse(saved));
            } catch (e) {
                console.error('Error parsing localStorage:', e);
            }
        }

        // Cargar catálogo del localStorage o usar default
        const savedCatalog = localStorage.getItem('presugenius_catalog');
        if (savedCatalog) {
            try {
                setCatalog(JSON.parse(savedCatalog));
            } catch (e) {
                console.error('Error parsing catalog from localStorage:', e);
                setDefaultCatalog();
            }
        } else {
            setDefaultCatalog();
        }
    };

    const setDefaultCatalog = () => {
        setCatalog([
            { id: 'c1', description: 'Trazo y nivelación de terreno con equipo topográfico', unit: 'm2', unitPrice: 15.50, category: 'Mano de Obra' },
            { id: 'c2', description: 'Excavación a mano en cepas de cimentación material tipo II', unit: 'm3', unitPrice: 280.00, category: 'Obra Civil' },
            { id: 'c3', description: 'Salida eléctrica de centro para alumbrado con cable THW-LS calibre 12', unit: 'sal', unitPrice: 650.00, category: 'Instalaciones' },
            { id: 'c4', description: 'Muro de block hueco 15x20x40 cm asentado con mortero cemento-arena 1:4', unit: 'm2', unitPrice: 420.00, category: 'Obra Civil' },
            { id: 'c5', description: 'Pintura vinílica en muros a dos manos marca Comex', unit: 'm2', unitPrice: 65.00, category: 'Materiales' },
        ]);
    };

    // --- GESTIÓN DEL CATÁLOGO ---
    const addToCatalog = async (item) => {
        setLoading(true);
        try {
            const newItem = { ...item, id: generateId() };

            if (user) {
                // Guardar en Supabase
                const { data, error } = await supabase
                    .from('catalog_items')
                    .insert([{
                        user_id: user.id,
                        description: newItem.description,
                        unit: newItem.unit,
                        unit_price: newItem.unitPrice,
                        category: newItem.category,
                        is_public: false
                    }])
                    .select()
                    .single();

                if (error) throw error;

                // Actualizar estado local con el item devuelto (que tendrá el ID real de DB)
                const addedItem = {
                    id: data.id,
                    description: data.description,
                    unit: data.unit,
                    unitPrice: data.unit_price,
                    category: data.category
                };
                setCatalog([addedItem, ...catalog]);
            } else {
                // Guardar en LocalStorage
                const newCatalog = [newItem, ...catalog];
                setCatalog(newCatalog);
                localStorage.setItem('presugenius_catalog', JSON.stringify(newCatalog));
            }
            showToast('Concepto agregado al catálogo', 'success');
            return true;
        } catch (error) {
            console.error('Error adding to catalog:', error);
            showToast('Error al agregar al catálogo', 'error');
            return false;
        } finally {
            setLoading(false);
        }
    };

    const deleteFromCatalog = async (id) => {
        if (!window.confirm('¿Estás seguro de eliminar este concepto del catálogo?')) return;

        setLoading(true);
        try {
            if (user) {
                const { error } = await supabase
                    .from('catalog_items')
                    .delete()
                    .eq('id', id);

                if (error) throw error;
            }

            // Actualizar estado local (para ambos casos)
            const newCatalog = catalog.filter(item => item.id !== id);
            setCatalog(newCatalog);

            if (!user) {
                localStorage.setItem('presugenius_catalog', JSON.stringify(newCatalog));
            }

            showToast('Concepto eliminado del catálogo');
        } catch (error) {
            console.error('Error deleting from catalog:', error);
            showToast('Error al eliminar del catálogo', 'error');
        } finally {
            setLoading(false);
        }
    };

    const updateCatalogBulk = async (updatedItems) => {
        setLoading(true);
        try {
            if (user) {
                // Upsert to Supabase
                const itemsToUpsert = updatedItems.map(item => ({
                    id: item.id,
                    user_id: user.id,
                    description: item.description,
                    unit: item.unit,
                    unit_price: item.unitPrice,
                    category: item.category,
                    is_public: false,
                    updated_at: new Date().toISOString()
                }));

                const { error } = await supabase
                    .from('catalog_items')
                    .upsert(itemsToUpsert);

                if (error) throw error;
            } else {
                // Save to LocalStorage
                localStorage.setItem('presugenius_catalog', JSON.stringify(updatedItems));
            }

            setCatalog(updatedItems);
            showToast('Catálogo actualizado correctamente', 'success');
            return true;
        } catch (error) {
            console.error('Error updating catalog bulk:', error.message || error);
            if (error.details) console.error('Error details:', error.details);
            showToast('Error al actualizar el catálogo', 'error');
            return false;
        } finally {
            setLoading(false);
        }
    };

    // --- CARGAR DATOS AL INICIAR ---
    useEffect(() => {
        if (authLoading) return;

        if (user) {
            loadUserData();
        } else {
            // Si no hay usuario, cargar desde localStorage (modo offline)
            loadFromLocalStorage();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user, authLoading]);

    // --- Auto-timeout para toasts ---
    useEffect(() => {
        if (toast) {
            const timer = setTimeout(() => setToast(null), 3000);
            return () => clearTimeout(timer);
        }
    }, [toast]);

    const calculateSubtotal = () => CalculationsService.calculateSubtotal(items);

    const calculateTotal = () => {
        const calc = CalculationsService.calculateTotal(items, {
            indirectPercentage: projectInfo.indirect_percentage ?? 0,
            profitPercentage: projectInfo.profit_percentage ?? 0,
            taxRate: projectInfo.taxRate ?? 0  // Respetar 0, solo usar default si es null/undefined
        });
        return calc.total;
    };

    const getCalculations = () => {
        return CalculationsService.calculateTotal(items, {
            indirectPercentage: projectInfo.indirect_percentage ?? 0,
            profitPercentage: projectInfo.profit_percentage ?? 0,
            taxRate: projectInfo.taxRate ?? 0  // Respetar 0, solo usar default si es null/undefined
        });
    };

    // --- GUARDAR PROYECTO ---
    const saveBudget = async () => {
        setLoading(true);

        try {
            if (user) {
                // Guardar en Supabase
                const projectData = {
                    user_id: user.id,
                    name: projectInfo.project,
                    client: projectInfo.client,
                    type: projectInfo.type,
                    currency: projectInfo.currency,
                    tax_rate: projectInfo.taxRate,
                    indirect_percentage: projectInfo.indirect_percentage || 0,
                    profit_percentage: projectInfo.profit_percentage || 0,
                    updated_at: new Date().toISOString()
                };

                let projectId = projectInfo.id;

                // Verificar si el proyecto ya existe
                const { data: existingProject } = await supabase
                    .from('projects')
                    .select('id')
                    .eq('id', projectInfo.id)
                    .single();

                if (existingProject) {
                    // Actualizar proyecto existente
                    await supabase
                        .from('projects')
                        .update(projectData)
                        .eq('id', projectInfo.id);
                } else {
                    // Crear nuevo proyecto
                    const { data: newProject, error: projectError } = await supabase
                        .from('projects')
                        .insert([{ ...projectData, id: projectInfo.id }])
                        .select()
                        .single();

                    if (projectError) throw projectError;
                    projectId = newProject.id;
                }

                // Eliminar items antiguos
                await supabase
                    .from('budget_items')
                    .delete()
                    .eq('project_id', projectId);

                // Insertar items nuevos
                if (items.length > 0) {
                    const itemsData = items.map((item, index) => ({
                        project_id: projectId,
                        description: item.description,
                        unit: item.unit,
                        quantity: item.quantity,
                        unit_price: item.unitPrice,
                        category: item.category,
                        subcategory: item.subcategory || null,
                        tags: item.tags || [],
                        notes: item.notes || '',
                        is_catalog_item: item.isCatalogItem || false,
                        order_index: index
                    }));

                    await supabase
                        .from('budget_items')
                        .insert(itemsData);
                }

                // Recargar proyectos
                await loadUserData();
                showToast('Proyecto guardado en la nube', 'success');

            } else {
                // Guardar en localStorage (modo offline)
                const budgetData = {
                    ...projectInfo,
                    items,
                    lastModified: new Date().toISOString(),
                    total: calculateTotal()
                };

                const existingIndex = savedBudgets.findIndex(b => b.id === projectInfo.id);
                let newSaved;

                if (existingIndex >= 0) {
                    newSaved = [...savedBudgets];
                    newSaved[existingIndex] = budgetData;
                } else {
                    newSaved = [...savedBudgets, budgetData];
                }

                setSavedBudgets(newSaved);
                localStorage.setItem('presugenius_budgets', JSON.stringify(newSaved));
                showToast('Proyecto guardado localmente', 'success');
            }
        } catch (error) {
            console.error('Error saving budget:', error);
            showToast('Error al guardar proyecto', 'error');
        } finally {
            setLoading(false);
        }
    };

    // --- CARGAR PROYECTO ---
    const loadBudget = (budget) => {
        setProjectInfo({
            id: budget.id,
            client: budget.client,
            project: budget.name || budget.project,
            date: budget.date || new Date().toISOString().split('T')[0],
            currency: budget.currency,
            taxRate: budget.tax_rate || budget.taxRate,
            type: budget.type,
            indirect_percentage: budget.indirect_percentage || 0,
            profit_percentage: budget.profit_percentage || 0
        });
        setItems(budget.items || []);
        showToast(`Proyecto "${budget.name || budget.project}" cargado`);
    };

    // --- ELIMINAR PROYECTO ---
    const deleteBudget = async (id) => {
        setLoading(true);

        try {
            if (user) {
                // Eliminar de Supabase
                await supabase
                    .from('projects')
                    .delete()
                    .eq('id', id);

                await loadUserData();
                showToast('Proyecto eliminado de la nube', 'success');
            } else {
                // Eliminar de localStorage
                const newSaved = savedBudgets.filter(b => b.id !== id);
                setSavedBudgets(newSaved);
                localStorage.setItem('presugenius_budgets', JSON.stringify(newSaved));
                showToast('Proyecto eliminado');
            }
        } catch (error) {
            const errorMessage = error.message || 'Error al eliminar proyecto';
            console.error('Error deleting budget:', error);
            showToast(errorMessage, 'error');
        } finally {
            setLoading(false);
        }
    };

    // --- NUEVO PROYECTO ---
    const newProject = () => {
        setProjectInfo({
            id: generateId(),
            client: '',
            project: 'Presupuesto Nuevo',
            date: new Date().toISOString().split('T')[0],
            currency: 'MXN',
            taxRate: 16,
            type: 'General',
            indirect_percentage: 0,
            profit_percentage: 0
        });
        setItems([]);
        showToast('Nuevo proyecto creado');
    };

    const value = React.useMemo(() => ({
        projectInfo, setProjectInfo,
        items, setItems,
        savedBudgets, setSavedBudgets,
        catalog, setCatalog,
        toast, showToast, setToast,
        calculateSubtotal, calculateTotal, getCalculations,
        saveBudget, loadBudget, deleteBudget, newProject,
        addToCatalog, deleteFromCatalog, updateCatalogBulk,
        loading,
        rateLimitModal, showRateLimitModal, closeRateLimitModal
    }), [
        projectInfo, items, savedBudgets, catalog, toast, loading, rateLimitModal,
        showToast, showRateLimitModal, closeRateLimitModal
    ]);

    return <ProjectContext.Provider value={value}>{children}</ProjectContext.Provider>;
};
