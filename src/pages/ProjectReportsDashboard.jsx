import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Camera,
    Plus,
    Search,
    Folder,
    LayoutGrid,
    List,
    Clock,
    User,
    MapPin,
    Trash2
} from 'lucide-react';
import ConfirmModal from '../components/ui/ConfirmModal';

import Card from '../components/ui/Card';
import ProjectPersistenceService from '../services/ProjectPersistenceService';
import { formatCurrency } from '../utils/format';
import AlertModal from '../components/ui/AlertModal';
import { APP_CONFIG } from '../config/appConfig';

const ProjectReportsDashboard = () => {
    const navigate = useNavigate();
    const [projects, setProjects] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [viewMode, setViewMode] = useState('grid'); // 'grid' or 'list'
    const [showNewProjectModal, setShowNewProjectModal] = useState(false);
    const [alertModal, setAlertModal] = useState({ isOpen: false, title: '', message: '', type: 'info' });
    const [confirmModal, setConfirmModal] = useState({ isOpen: false, title: '', message: '', type: 'danger', onConfirm: () => { } });


    // Formulario para nuevo proyecto express (sin presupuesto)
    const [newProject, setNewProject] = useState({
        name: '',
        client: '',
        location: '',
        type: APP_CONFIG.defaultProjectType
    });

    useEffect(() => {
        loadProjects();
    }, []);

    const loadProjects = async () => {
        try {
            setLoading(true);
            const data = await ProjectPersistenceService.listProjects();
            setProjects(data);
        } catch (error) {
            console.error('Error loading projects:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleCreateProject = async (e) => {
        e.preventDefault();
        if (!newProject.name.trim()) {
            setAlertModal({
                isOpen: true,
                title: 'Campo requerido',
                message: 'El nombre del proyecto es obligatorio.',
                type: 'warning'
            });
            return;
        }

        try {
            const projectData = {
                projectInfo: {
                    project: newProject.name,
                    client: newProject.client,
                    location: newProject.location,
                    type: newProject.type,
                    taxRate: 16
                },
                items: [],
                lastModified: new Date().toISOString()
            };

            const saved = await ProjectPersistenceService.saveProject(projectData);
            setShowNewProjectModal(false);
            setNewProject({ name: '', client: '', location: '', type: APP_CONFIG.defaultProjectType });
            loadProjects();

            setAlertModal({
                isOpen: true,
                title: 'Proyecto Creado',
                message: `El proyecto "${newProject.name}" ha sido creado. Ahora puedes agregar bitácoras o reportes.`,
                type: 'success'
            });
        } catch (error) {
            console.error('Error creating project:', error);
            setAlertModal({
                isOpen: true,
                title: 'Error',
                message: 'No se pudo crear el proyecto: ' + error.message,
                type: 'error'
            });
        }
    };

    const handleDeleteProject = (project) => {
        setConfirmModal({
            isOpen: true,
            title: 'Eliminar Proyecto',
            message: `¿Estás seguro de que deseas eliminar el proyecto "${project.project}"? Se eliminarán también todas las bitácoras y reportes asociados. Esta acción no se puede deshacer.`,
            type: 'danger',
            onConfirm: async () => {
                try {
                    await ProjectPersistenceService.deleteProject(project.id);
                    loadProjects();
                    setAlertModal({
                        isOpen: true,
                        title: 'Proyecto Eliminado',
                        message: 'El proyecto y todos sus datos asociados han sido eliminados.',
                        type: 'success'
                    });
                } catch (error) {
                    console.error('Error deleting project:', error);
                    setAlertModal({
                        isOpen: true,
                        title: 'Error',
                        message: 'No se pudo eliminar el proyecto: ' + error.message,
                        type: 'error'
                    });
                }
            }
        });
    };


    const filteredProjects = useMemo(() => {
        return projects.filter(p =>
            p.project?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            p.client?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            p.location?.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [projects, searchTerm]);

    const formatDate = (dateString) => {
        if (!dateString) return 'N/A';
        return new Date(dateString).toLocaleDateString(APP_CONFIG.locale, {
            day: 'numeric',
            month: 'short',
            year: 'numeric'
        });
    };

    return (
        <div className="flex flex-col min-h-[calc(100vh-140px)] animate-fadeIn pb-4">

            {/* Header */}
                <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
                    <div>
                        <h1 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-slate-50 mb-1">Módulo de Reportes</h1>
                        <p className="text-sm md:text-base text-slate-600 dark:text-slate-300">Gestiona bitácoras, reportes fotográficos por proyecto y reportes libres sin presupuesto.</p>
                    </div>
                    <div className="flex w-full sm:w-auto flex-col sm:flex-row gap-3">
                        <button
                            onClick={() => navigate('/reports/photographic/free')}
                            className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-3 rounded-xl font-bold shadow-lg shadow-emerald-200 dark:shadow-emerald-900/50 transition flex items-center justify-center gap-2"
                        >
                            <Camera size={20} />
                            <span>Reporte Libre</span>
                        </button>
                        <button
                            onClick={() => setShowNewProjectModal(true)}
                            className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-bold shadow-lg shadow-blue-200 dark:shadow-blue-900/50 transition flex items-center justify-center gap-2"
                        >
                            <Plus size={20} />
                            <span>Nuevo Proyecto</span>
                        </button>
                    </div>
                </div>


            <div className="space-y-6 flex-1 flex flex-col">
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                    <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-sm p-5">
                        <div className="flex items-start gap-4">
                            <div className="p-3 rounded-2xl bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">
                                <Camera size={24} />
                            </div>
                            <div className="flex-1">
                                <h2 className="text-lg font-bold text-slate-900 dark:text-white">Reporte fotográfico libre</h2>
                                <p className="text-sm text-slate-600 dark:text-slate-300 mt-1">
                                    Usa el mismo editor del reporte ligado a proyecto. Si la obra no existe todavía, el sistema crea un proyecto ligero al guardar para no duplicar formularios.
                                </p>
                                <button
                                    onClick={() => navigate('/reports/photographic/free')}
                                    className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold transition shadow-lg shadow-emerald-200 dark:shadow-none"
                                >
                                    <Camera size={18} />
                                    Abrir constructor libre
                                </button>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-sm p-5">
                        <div className="flex items-start gap-4">
                            <div className="p-3 rounded-2xl bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
                                <Folder size={24} />
                            </div>
                            <div className="flex-1">
                                <h2 className="text-lg font-bold text-slate-900 dark:text-white">Reportes ligados a proyecto</h2>
                                <p className="text-sm text-slate-600 dark:text-slate-300 mt-1">
                                    Mantén este flujo para obras que sí nacen dentro del sistema y necesitan bitácora, cronograma y expediente completo.
                                </p>
                                <button
                                    onClick={() => setShowNewProjectModal(true)}
                                    className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold transition shadow-lg shadow-blue-200 dark:shadow-none"
                                >
                                    <Plus size={18} />
                                    Crear proyecto de reportes
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Toolbar */}
                <div className="flex flex-col md:flex-row gap-4 bg-white dark:bg-slate-800 p-4 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700">

                    <div className="flex-1 relative order-2 sm:order-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                        <input
                            type="text"
                            placeholder="Buscar proyecto..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-3 sm:py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition"
                        />
                    </div>

                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setViewMode('grid')}
                            className={`p-2 rounded-lg transition ${viewMode === 'grid' ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/50 dark:text-blue-300' : 'text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'}`}
                        >
                            <LayoutGrid size={20} />
                        </button>
                        <button
                            onClick={() => setViewMode('list')}
                            className={`p-2 rounded-lg transition ${viewMode === 'list' ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/50 dark:text-blue-300' : 'text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'}`}
                        >
                            <List size={20} />
                        </button>
                    </div>
                </div>

                {/* Projects Content */}
                {loading ? (
                    <div className="flex flex-col items-center justify-center py-20">
                        <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent mb-4"></div>
                        <p className="text-slate-500">Cargando proyectos...</p>
                    </div>
                ) : filteredProjects.length === 0 ? (
                    <div className="flex-1 flex flex-col items-center justify-center bg-white dark:bg-slate-800 rounded-2xl p-8 md:p-12 text-center border-2 border-dashed border-slate-200 dark:border-slate-700 my-4">
                        <Folder size={64} className="mx-auto text-slate-300 mb-4" />
                        <h3 className="text-xl font-bold text-slate-700 dark:text-slate-200">No se encontraron proyectos</h3>
                        <p className="text-slate-500 dark:text-slate-400 mb-8 max-w-md">Puedes crear un proyecto para manejar expediente completo o abrir un reporte libre cuando solo necesitas entregar evidencia fotográfica.</p>
                        <div className="flex flex-col sm:flex-row gap-3">
                            <button
                                onClick={() => navigate('/reports/photographic/free')}
                                className="bg-emerald-600 hover:bg-emerald-700 text-white px-8 py-3 rounded-xl font-bold transition shadow-lg shadow-emerald-200"
                            >
                                Crear reporte libre
                            </button>
                            <button
                                onClick={() => setShowNewProjectModal(true)}
                                className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-xl font-bold transition shadow-lg shadow-blue-200"
                            >
                                Crear mi primer proyecto
                            </button>
                        </div>
                    </div>
                ) : viewMode === 'grid' ? (

                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">

                        {filteredProjects.map(project => (
                            <Card key={project.id} className="group hover:shadow-xl transition-all duration-300 border-t-4 border-t-blue-500">
                                <div className="p-1">
                                    <div className="flex justify-between items-start mb-4">
                                        <div className="p-2 bg-blue-50 dark:bg-blue-900/30 rounded-lg text-blue-600 dark:text-blue-400">
                                            <Folder size={24} />
                                        </div>
                                        <span className="text-[10px] font-bold uppercase tracking-widest px-2 py-1 bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 rounded">
                                            {project.type || APP_CONFIG.defaultProjectType}
                                        </span>
                                    </div>
                                    <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2 line-clamp-1">{project.project}</h3>

                                    <div className="space-y-2 mb-6">
                                        <div className="flex items-center text-sm text-slate-600 dark:text-slate-400 gap-2">
                                            <User size={14} />
                                            <span className="truncate">{project.client || 'Sin cliente'}</span>
                                        </div>
                                        <div className="flex items-center text-sm text-slate-600 dark:text-slate-400 gap-2">
                                            <MapPin size={14} />
                                            <span className="truncate">{project.location || 'Sin ubicación'}</span>
                                        </div>
                                        <div className="flex items-center text-sm text-slate-500 dark:text-slate-500 gap-2">
                                            <Clock size={14} />
                                            <span>Última mod: {formatDate(project.lastModified)}</span>
                                        </div>
                                    </div>

                                    <div className="mt-4 flex gap-2">
                                        <button
                                            onClick={() => navigate(`/project/${project.id}/bitacora`)}
                                            className="flex-1 flex items-center justify-center gap-2 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold transition shadow-lg shadow-blue-200 dark:shadow-none"
                                        >
                                            <Folder size={18} />
                                            Gestionar
                                        </button>
                                        <button
                                            onClick={() => handleDeleteProject(project)}
                                            className="p-3 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition"
                                            title="Eliminar Proyecto"
                                        >
                                            <Trash2 size={20} />
                                        </button>
                                    </div>


                                </div>
                            </Card>
                        ))}
                    </div>
                ) : (
                    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-x-auto overflow-y-hidden">
                        <table className="w-full">
                            <thead>
                                <tr className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-700">
                                    <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Proyecto</th>
                                    <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Cliente</th>
                                    <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Última Modificación</th>
                                    <th className="px-6 py-4 text-center text-xs font-bold text-slate-500 uppercase tracking-wider">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                {filteredProjects.map(project => (
                                    <tr key={project.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="p-2 bg-blue-100 dark:bg-blue-900/50 text-blue-600 rounded-lg">
                                                    <Folder size={18} />
                                                </div>
                                                <div>
                                                    <p className="font-bold text-slate-900 dark:text-white">{project.project}</p>
                                                    <p className="text-xs text-slate-500">{project.type || APP_CONFIG.defaultProjectType}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-400">
                                            {project.client || 'N/A'}
                                        </td>
                                        <td className="px-6 py-4 text-sm text-slate-500">
                                            {formatDate(project.lastModified)}
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <div className="flex items-center justify-center gap-2">
                                                <button
                                                    onClick={() => navigate(`/project/${project.id}/bitacora`)}
                                                    className="px-4 py-2 bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-300 rounded-lg font-bold hover:bg-blue-100 transition flex items-center gap-2"
                                                >
                                                    <Folder size={16} />
                                                    Gestionar
                                                </button>
                                                <button
                                                    onClick={() => handleDeleteProject(project)}
                                                    className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition"
                                                    title="Eliminar"
                                                >
                                                    <Trash2 size={18} />
                                                </button>
                                            </div>
                                        </td>


                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Modal para Nuevo Proyecto Express */}
            {showNewProjectModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
                    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden transform transition-all scale-100 border border-slate-200 dark:border-slate-700">
                        <div className="p-6 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-slate-50 dark:bg-slate-900">
                            <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                <Plus className="text-blue-500" size={24} />
                                Nuevo Proyecto de Obra
                            </h2>
                            <button onClick={() => setShowNewProjectModal(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
                                <Plus size={24} className="rotate-45" />
                            </button>
                        </div>

                        <form onSubmit={handleCreateProject} className="p-6 space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1 tracking-wider">Nombre de la Obra *</label>
                                <input
                                    autoFocus
                                    type="text"
                                    required
                                    value={newProject.name}
                                    onChange={(e) => setNewProject({ ...newProject, name: e.target.value })}
                                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition"
                                    placeholder="Ej: Remodelación Casa Blanca"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1 tracking-wider">Cliente/Empresa</label>
                                <input
                                    type="text"
                                    value={newProject.client}
                                    onChange={(e) => setNewProject({ ...newProject, client: e.target.value })}
                                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition"
                                    placeholder="Nombre del cliente"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1 tracking-wider">Ubicación</label>
                                <input
                                    type="text"
                                    value={newProject.location}
                                    onChange={(e) => setNewProject({ ...newProject, location: e.target.value })}
                                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition"
                                    placeholder="Ubicación de la obra"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1 tracking-wider">Tipo de Proyecto</label>
                                <select
                                    value={newProject.type}
                                    onChange={(e) => setNewProject({ ...newProject, type: e.target.value })}
                                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition"
                                >
                                    <option value="General">General</option>
                                    <option value="Residencial">Residencial</option>
                                    <option value="Comercial">Comercial</option>
                                    <option value="Industrial">Industrial</option>
                                    <option value="Infraestructura">Infraestructura</option>
                                </select>
                            </div>

                            <div className="pt-4 flex gap-3">
                                <button
                                    type="button"
                                    onClick={() => setShowNewProjectModal(false)}
                                    className="flex-1 px-4 py-3 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl font-bold hover:bg-slate-200 transition"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 shadow-lg shadow-blue-200 dark:shadow-none transition"
                                >
                                    Crear Proyecto
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Confirm Modal */}
            <ConfirmModal
                isOpen={confirmModal.isOpen}
                onClose={() => setConfirmModal({ ...confirmModal, isOpen: false })}
                title={confirmModal.title}
                message={confirmModal.message}
                onConfirm={confirmModal.onConfirm}
                type={confirmModal.type}
            />

            {/* Alert Modal */}

            <AlertModal
                isOpen={alertModal.isOpen}
                onClose={() => setAlertModal({ ...alertModal, isOpen: false })}
                title={alertModal.title}
                message={alertModal.message}
                type={alertModal.type}
            />
        </div>
    );
};

export default ProjectReportsDashboard;
