import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Calendar, Lock, Eye, Download, ArrowLeft, Clock, User, Building2, Package, Calendar as CalendarIcon } from 'lucide-react';
import { ShareService } from '../services/ShareService';
import { PDFService } from '../services/PDFService';
import { formatCurrency } from '../utils/format';

const SharedProjectPage = () => {
    const { token } = useParams();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [projectData, setProjectData] = useState(null);
    const [shareInfo, setShareInfo] = useState(null);
    const [passwordRequired, setPasswordRequired] = useState(false);
    const [password, setPassword] = useState('');
    const [passwordError, setPasswordError] = useState('');
    const [error, setError] = useState(null);

    useEffect(() => {
        loadSharedProject();
    }, [token]);

    const loadSharedProject = async () => {
        try {
            setLoading(true);
            setError(null);

            const shareData = await ShareService.getShareByToken(token);

            // Verificar si requiere contraseña
            if (shareData.password) {
                // Verificar si ya se verificó (usando sessionStorage)
                const verified = sessionStorage.getItem(`share_verified_${token}`);
                if (!verified) {
                    setPasswordRequired(true);
                    setShareInfo(shareData);
                    setLoading(false);
                    return;
                }
            }

            setShareInfo(shareData);

            // Extraer datos del proyecto
            const project = shareData.projects;
            if (!project || !project.data) {
                throw new Error('Proyecto no encontrado o no disponible');
            }

            const fullProjectData = project.data;
            
            // Normalizar projectInfo para asegurar que todos los campos se carguen correctamente
            const normalizedProjectInfo = {
                project: fullProjectData.projectInfo?.project || project.name,
                client: fullProjectData.projectInfo?.client || project.client,
                type: fullProjectData.projectInfo?.type || project.type,
                taxRate: fullProjectData.projectInfo?.taxRate ?? 16, // Usar ?? para permitir 0
                currency: fullProjectData.projectInfo?.currency || 'MXN',
                date: fullProjectData.projectInfo?.date || new Date().toISOString().split('T')[0],
                location: fullProjectData.projectInfo?.location || 'México',
                ...fullProjectData.projectInfo // Preservar otros campos
            };
            
            setProjectData({
                projectInfo: normalizedProjectInfo,
                items: fullProjectData.items || [],
                scheduleData: fullProjectData.scheduleData,
                materialList: fullProjectData.materialList,
                apuData: fullProjectData.apuData
            });

        } catch (error) {
            console.error('Error loading shared project:', error);
            setError(error.message || 'No se pudo cargar el proyecto compartido');
        } finally {
            setLoading(false);
        }
    };

    const handlePasswordSubmit = async (e) => {
        e.preventDefault();
        setPasswordError('');

        try {
            const isValid = await ShareService.verifyPassword(token, password);
            if (isValid) {
                // Guardar en sessionStorage para esta sesión
                sessionStorage.setItem(`share_verified_${token}`, 'true');
                setPasswordRequired(false);
                // Recargar con contraseña verificada
                await loadSharedProject();
            } else {
                setPasswordError('Contraseña incorrecta');
            }
        } catch (error) {
            setPasswordError('Error al verificar contraseña');
        }
    };

    const calculateTotals = () => {
        if (!projectData || !projectData.items || projectData.items.length === 0) {
            return { subtotal: 0, tax: 0, total: 0 };
        }

        const subtotal = projectData.items.reduce((sum, item) => {
            return sum + (item.quantity || 0) * (item.unitPrice || 0);
        }, 0);

        // Usar nullish coalescing para permitir taxRate = 0
        const taxRateValue = projectData.projectInfo?.taxRate ?? 16;
        const taxRate = taxRateValue / 100;
        const tax = subtotal * taxRate;
        const total = subtotal + tax;

        return { subtotal, tax, total };
    };

    const handleExportPDF = () => {
        if (!projectData) return;

        const { subtotal, tax, total } = calculateTotals();
        PDFService.exportBudget(
            projectData.projectInfo,
            projectData.items,
            total,
            subtotal,
            tax
        );
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-4 border-emerald-500 border-t-transparent mx-auto mb-4"></div>
                    <p className="text-slate-600 font-medium">Cargando presupuesto...</p>
                </div>
            </div>
        );
    }

    if (passwordRequired) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4">
                <div className="bg-white rounded-xl shadow-xl p-8 max-w-md w-full">
                    <div className="text-center mb-6">
                        <div className="bg-emerald-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                            <Lock className="text-emerald-600" size={32} />
                        </div>
                        <h2 className="text-2xl font-bold text-slate-800 mb-2">Presupuesto Protegido</h2>
                        <p className="text-slate-600">Este presupuesto está protegido con contraseña</p>
                    </div>

                    <form onSubmit={handlePasswordSubmit} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-2">
                                Contraseña
                            </label>
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none"
                                placeholder="Ingresa la contraseña"
                                required
                                autoFocus
                            />
                            {passwordError && (
                                <p className="text-red-600 text-sm mt-2">{passwordError}</p>
                            )}
                        </div>

                        <button
                            type="submit"
                            className="w-full px-6 py-3 bg-emerald-600 text-white rounded-lg font-medium hover:bg-emerald-700 transition shadow-lg shadow-emerald-200"
                        >
                            Acceder
                        </button>
                    </form>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4">
                <div className="bg-white rounded-xl shadow-xl p-8 max-w-md w-full text-center">
                    <div className="bg-red-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                        <Lock className="text-red-600" size={32} />
                    </div>
                    <h2 className="text-2xl font-bold text-slate-800 mb-2">No disponible</h2>
                    <p className="text-slate-600 mb-6">{error}</p>
                    <button
                        onClick={() => navigate('/')}
                        className="px-6 py-2 bg-slate-600 text-white rounded-lg font-medium hover:bg-slate-700 transition"
                    >
                        Ir al Inicio
                    </button>
                </div>
            </div>
        );
    }

    if (!projectData) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
                <div className="text-center">
                    <p className="text-slate-600">No hay datos disponibles</p>
                </div>
            </div>
        );
    }

    const { subtotal, tax, total } = calculateTotals();
    const items = projectData.items || [];

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
            {/* Header */}
            <div className="bg-white border-b border-slate-200 shadow-sm sticky top-0 z-10">
                <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                        <div>
                            <h1 className="text-xl sm:text-2xl font-bold text-slate-800 tracking-tight">
                                {projectData.projectInfo?.project || 'Presupuesto'}
                            </h1>
                            <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 mt-2 text-xs sm:text-sm text-slate-500">
                                {projectData.projectInfo?.client && (
                                    <div className="flex items-center gap-1.5">
                                        <User size={14} className="text-slate-400" />
                                        <span>{projectData.projectInfo.client}</span>
                                    </div>
                                )}
                                {projectData.projectInfo?.type && (
                                    <div className="flex items-center gap-1.5">
                                        <Building2 size={14} className="text-slate-400" />
                                        <span>{projectData.projectInfo.type}</span>
                                    </div>
                                )}
                                {shareInfo?.last_accessed_at && (
                                    <div className="flex items-center gap-1.5">
                                        <Clock size={14} className="text-slate-400" />
                                        <span>Visto {new Date(shareInfo.last_accessed_at).toLocaleDateString('es-MX')}</span>
                                    </div>
                                )}
                            </div>
                        </div>
                        <div className="flex items-center w-full sm:w-auto">
                            <button
                                onClick={handleExportPDF}
                                className="w-full sm:w-auto justify-center px-5 py-2.5 bg-emerald-600 text-white rounded-lg font-semibold hover:bg-emerald-700 transition flex items-center gap-2 shadow-lg shadow-emerald-100"
                            >
                                <Download size={18} />
                                Descargar PDF
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Content */}
            <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
                {/* Resumen */}
                <div className="bg-white rounded-xl shadow-lg p-5 sm:p-6 mb-6">
                    <h2 className="text-base sm:text-lg font-bold text-slate-800 mb-4">Resumen del Presupuesto</h2>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div className="bg-slate-50 p-4 rounded-lg">
                            <div className="text-xs sm:text-sm text-slate-500 font-medium mb-1">Subtotal</div>
                            <div className="text-xl sm:text-2xl font-bold text-slate-800">{formatCurrency(subtotal)}</div>
                        </div>
                        <div className="bg-slate-50 p-4 rounded-lg">
                            <div className="text-xs sm:text-sm text-slate-500 font-medium mb-1">IVA ({projectData.projectInfo?.taxRate ?? 16}%)</div>
                            <div className="text-xl sm:text-2xl font-bold text-slate-800">{formatCurrency(tax)}</div>
                        </div>
                        <div className="bg-emerald-50 p-4 rounded-lg border-2 border-emerald-200">
                            <div className="text-xs sm:text-sm text-emerald-600 font-medium mb-1">Total</div>
                            <div className="text-2xl sm:text-3xl font-bold text-emerald-700">{formatCurrency(total)}</div>
                        </div>
                    </div>
                </div>

                {/* Partidas */}
                <div className="bg-white rounded-xl shadow-lg overflow-hidden mb-6">
                    <div className="p-5 sm:p-6 border-b border-slate-200">
                        <h2 className="text-base sm:text-lg font-bold text-slate-800">Partidas del Presupuesto</h2>
                    </div>

                    {/* Mobile Card List (Hidden on desktop) */}
                    <div className="block sm:hidden divide-y divide-slate-100">
                        {items.map((item, index) => (
                            <div key={item.id || index} className="p-4 hover:bg-slate-50 transition">
                                <div className="flex justify-between items-start gap-2 mb-2">
                                    <div className="font-medium text-slate-800 text-sm leading-snug">{item.description}</div>
                                    <span className="text-xs font-semibold text-slate-400">#{index + 1}</span>
                                </div>
                                {item.category && (
                                    <span className="inline-block bg-slate-100 text-slate-600 text-[10px] px-2 py-0.5 rounded-full mb-3 font-medium">
                                        {item.category}
                                    </span>
                                )}
                                <div className="grid grid-cols-3 gap-2 text-xs text-slate-600 bg-slate-50 p-2.5 rounded-lg">
                                    <div>
                                        <span className="block text-slate-400 text-[10px] uppercase font-semibold mb-0.5">Cant/Uni</span>
                                        <span className="font-semibold text-slate-700">{item.quantity?.toFixed(2) || '0.00'} <span className="text-[10px] font-normal text-slate-500">{item.unit || 'pza'}</span></span>
                                    </div>
                                    <div>
                                        <span className="block text-slate-400 text-[10px] uppercase font-semibold mb-0.5">P. Unit</span>
                                        <span className="font-semibold text-slate-700">{formatCurrency(item.unitPrice || 0)}</span>
                                    </div>
                                    <div className="text-right">
                                        <span className="block text-slate-400 text-[10px] uppercase font-semibold mb-0.5">Total</span>
                                        <span className="font-bold text-emerald-600">{formatCurrency((item.quantity || 0) * (item.unitPrice || 0))}</span>
                                    </div>
                                </div>
                            </div>
                        ))}
                        
                        {/* Mobile Summary Block */}
                        <div className="bg-slate-50 p-4 border-t border-slate-200 space-y-2 text-xs text-slate-600">
                            <div className="flex justify-between">
                                <span className="font-medium">Subtotal:</span>
                                <span className="font-semibold text-slate-800">{formatCurrency(subtotal)}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="font-medium">IVA ({projectData.projectInfo?.taxRate ?? 16}%):</span>
                                <span className="font-semibold text-slate-800">{formatCurrency(tax)}</span>
                            </div>
                            <div className="flex justify-between pt-2 border-t border-slate-200 text-sm font-bold text-emerald-700">
                                <span>Total:</span>
                                <span>{formatCurrency(total)}</span>
                            </div>
                        </div>
                    </div>

                    {/* Desktop Table View (Hidden on mobile) */}
                    <div className="hidden sm:block overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-slate-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-bold text-slate-600 uppercase">#</th>
                                    <th className="px-6 py-3 text-left text-xs font-bold text-slate-600 uppercase">Descripción</th>
                                    <th className="px-6 py-3 text-left text-xs font-bold text-slate-600 uppercase">Unidad</th>
                                    <th className="px-6 py-3 text-right text-xs font-bold text-slate-600 uppercase">Cantidad</th>
                                    <th className="px-6 py-3 text-right text-xs font-bold text-slate-600 uppercase">P. Unit.</th>
                                    <th className="px-6 py-3 text-right text-xs font-bold text-slate-600 uppercase">Total</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-200">
                                {items.map((item, index) => (
                                    <tr key={item.id || index} className="hover:bg-slate-50 transition">
                                        <td className="px-6 py-4 text-sm text-slate-600">{index + 1}</td>
                                        <td className="px-6 py-4">
                                            <div className="text-sm font-medium text-slate-800">{item.description}</div>
                                            {item.category && (
                                                <div className="text-xs text-slate-500 mt-1">{item.category}</div>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-sm text-slate-600">{item.unit || 'pza'}</td>
                                        <td className="px-6 py-4 text-sm text-slate-800 text-right">{item.quantity?.toFixed(2) || '0.00'}</td>
                                        <td className="px-6 py-4 text-sm text-slate-800 text-right">{formatCurrency(item.unitPrice || 0)}</td>
                                        <td className="px-6 py-4 text-sm font-medium text-slate-800 text-right">
                                            {formatCurrency((item.quantity || 0) * (item.unitPrice || 0))}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                            <tfoot className="bg-slate-50">
                                <tr>
                                    <td colSpan="4" className="px-6 py-4 text-right text-sm font-bold text-slate-700">Subtotal:</td>
                                    <td colSpan="2" className="px-6 py-4 text-right text-sm font-bold text-slate-800">{formatCurrency(subtotal)}</td>
                                </tr>
                                <tr>
                                    <td colSpan="4" className="px-6 py-4 text-right text-sm font-bold text-slate-700">
                                        IVA ({projectData.projectInfo?.taxRate ?? 16}%):
                                    </td>
                                    <td colSpan="2" className="px-6 py-4 text-right text-sm font-bold text-slate-800">{formatCurrency(tax)}</td>
                                </tr>
                                <tr className="bg-emerald-50">
                                    <td colSpan="4" className="px-6 py-4 text-right text-lg font-bold text-emerald-700">Total:</td>
                                    <td colSpan="2" className="px-6 py-4 text-right text-lg font-bold text-emerald-700">{formatCurrency(total)}</td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>
                </div>

                {/* Lista de Materiales/Insumos */}
                {projectData.materialList && projectData.materialList.length > 0 && (
                    <div className="bg-white rounded-xl shadow-lg overflow-hidden mb-6">
                        <div className="p-5 sm:p-6 border-b border-slate-200">
                            <h2 className="text-base sm:text-lg font-bold text-slate-800 flex items-center gap-2">
                                <Package size={20} className="text-indigo-600" />
                                Lista de Insumos y Materiales
                            </h2>
                        </div>
                        {projectData.materialAssumptions && projectData.materialAssumptions.length > 0 && (
                            <div className="bg-amber-50 border-b border-amber-100 p-4">
                                <h4 className="text-xs sm:text-sm font-bold text-amber-800 mb-2">Notas Importantes</h4>
                                <ul className="list-disc list-inside text-[11px] sm:text-xs text-amber-700 space-y-1">
                                    {projectData.materialAssumptions.map((assumption, idx) => (
                                        <li key={idx}>{assumption}</li>
                                    ))}
                                </ul>
                            </div>
                        )}

                        {/* Mobile Card List (Hidden on desktop) */}
                        <div className="block sm:hidden divide-y divide-slate-100">
                            {projectData.materialList.map((mat, idx) => (
                                <div key={idx} className="p-4 hover:bg-slate-50 transition">
                                    <div className="font-medium text-slate-800 text-sm leading-snug mb-1.5">{mat.material}</div>
                                    <div className="flex gap-2 mb-2.5">
                                        <span className="inline-block bg-slate-100 text-slate-500 text-[10px] px-2 py-0.5 rounded-full font-medium">
                                            {mat.category || 'Materiales'}
                                        </span>
                                    </div>
                                    <div className="grid grid-cols-3 gap-2 text-xs text-slate-600 bg-slate-50 p-2.5 rounded-lg">
                                        <div>
                                            <span className="block text-slate-400 text-[10px] uppercase font-semibold mb-0.5">Cant/Uni</span>
                                            <span className="font-semibold text-slate-700">{mat.quantity?.toFixed(2) || '0.00'} <span className="text-[10px] font-normal text-slate-500">{mat.unit || 'pza'}</span></span>
                                        </div>
                                        <div>
                                            <span className="block text-slate-400 text-[10px] uppercase font-semibold mb-0.5">Costo Est</span>
                                            <span className="font-semibold text-slate-700">{formatCurrency(mat.unitPrice || 0)}</span>
                                        </div>
                                        <div className="text-right">
                                            <span className="block text-slate-400 text-[10px] uppercase font-semibold mb-0.5">Total</span>
                                            <span className="font-bold text-indigo-600">{formatCurrency((mat.quantity || 0) * (mat.unitPrice || 0))}</span>
                                        </div>
                                    </div>
                                    {mat.notes && (
                                        <div className="mt-2 text-[10px] sm:text-xs text-slate-500 italic bg-amber-50/50 p-2 rounded border border-amber-100/50">
                                            <span className="font-medium text-amber-700 not-italic">Nota:</span> {mat.notes}
                                        </div>
                                    )}
                                </div>
                            ))}
                            <div className="bg-slate-50 p-4 border-t border-slate-200 flex justify-between text-xs font-bold text-slate-700">
                                <span>Total Estimado:</span>
                                <span className="text-slate-800">
                                    {formatCurrency(
                                        projectData.materialList.reduce((sum, m) => sum + ((m.quantity || 0) * (m.unitPrice || 0)), 0)
                                    )}
                                </span>
                            </div>
                        </div>

                        {/* Desktop Table View (Hidden on mobile) */}
                        <div className="hidden sm:block overflow-x-auto">
                            <table className="w-full">
                                <thead className="bg-slate-50">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-bold text-slate-600 uppercase">Material</th>
                                        <th className="px-6 py-3 text-left text-xs font-bold text-slate-600 uppercase">Categoría</th>
                                        <th className="px-6 py-3 text-center text-xs font-bold text-slate-600 uppercase">Unidad</th>
                                        <th className="px-6 py-3 text-right text-xs font-bold text-slate-600 uppercase">Cantidad</th>
                                        <th className="px-6 py-3 text-right text-xs font-bold text-slate-600 uppercase">Costo Est.</th>
                                        <th className="px-6 py-3 text-right text-xs font-bold text-slate-600 uppercase">Total</th>
                                        {projectData.materialList.some(m => m.notes) && (
                                            <th className="px-6 py-3 text-left text-xs font-bold text-slate-600 uppercase">Notas</th>
                                        )}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-200">
                                    {projectData.materialList.map((mat, idx) => (
                                        <tr key={idx} className="hover:bg-slate-50 transition">
                                            <td className="px-6 py-4 text-sm font-medium text-slate-800">{mat.material}</td>
                                            <td className="px-6 py-4 text-sm text-slate-600">{mat.category || 'Materiales'}</td>
                                            <td className="px-6 py-4 text-sm text-slate-600 text-center">{mat.unit || 'pza'}</td>
                                            <td className="px-6 py-4 text-sm text-slate-800 text-right">{mat.quantity?.toFixed(2) || '0.00'}</td>
                                            <td className="px-6 py-4 text-sm text-slate-800 text-right">{formatCurrency(mat.unitPrice || 0)}</td>
                                            <td className="px-6 py-4 text-sm font-medium text-slate-800 text-right">
                                                {formatCurrency((mat.quantity || 0) * (mat.unitPrice || 0))}
                                            </td>
                                            {projectData.materialList.some(m => m.notes) && (
                                                <td className="px-6 py-4 text-xs text-slate-500 italic">{mat.notes || '-'}</td>
                                            )}
                                        </tr>
                                    ))}
                                </tbody>
                                <tfoot className="bg-slate-50">
                                    <tr>
                                        <td colSpan={projectData.materialList.some(m => m.notes) ? 5 : 4} className="px-6 py-4 text-right text-sm font-bold text-slate-700">
                                            Total Estimado:
                                        </td>
                                        <td colSpan={2} className="px-6 py-4 text-right text-sm font-bold text-slate-800">
                                            {formatCurrency(
                                                projectData.materialList.reduce((sum, m) => sum + ((m.quantity || 0) * (m.unitPrice || 0)), 0)
                                            )}
                                        </td>
                                    </tr>
                                </tfoot>
                            </table>
                        </div>
                    </div>
                )}

                {/* Cronograma */}
                {shareInfo?.metadata?.showSchedule !== false && projectData.scheduleData && projectData.scheduleData.tasks && projectData.scheduleData.tasks.length > 0 && (
                    <div className="bg-white rounded-xl shadow-lg overflow-hidden mb-6">
                        <div className="p-6 border-b border-slate-200">
                            <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                                <CalendarIcon size={20} className="text-blue-600" />
                                Cronograma de Obra
                            </h2>
                        </div>
                        <div className="p-6">
                            <div className="space-y-4">
                                {projectData.scheduleData.tasks.map((task, idx) => (
                                    <div key={task.id || idx} className="border border-slate-200 rounded-lg p-3 sm:p-4 hover:bg-slate-50 transition">
                                        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between mb-2 gap-2">
                                            <div className="flex-1">
                                                <h3 className="text-sm font-bold text-slate-800 leading-snug">{task.name || `Tarea ${idx + 1}`}</h3>
                                                {task.description && (
                                                    <p className="text-xs text-slate-500 mt-1 leading-relaxed">{task.description}</p>
                                                )}
                                            </div>
                                            {task.progress !== undefined && (
                                                <div className="flex sm:block items-center gap-2 sm:gap-0 sm:text-right bg-slate-50 sm:bg-transparent px-2.5 py-1.5 sm:p-0 rounded-md sm:rounded-none">
                                                    <div className="text-[10px] sm:text-xs text-slate-500 mb-0.5 font-semibold sm:font-normal uppercase sm:normal-case">Progreso:</div>
                                                    <div className="text-xs sm:text-sm font-bold text-blue-600">{task.progress || 0}%</div>
                                                </div>
                                            )}
                                        </div>
                                        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mt-3 pt-3 border-t border-slate-100 sm:border-none sm:pt-0 text-xs text-slate-500">
                                            {task.startDate && (
                                                <div className="flex items-center gap-1">
                                                    <Calendar size={12} className="text-slate-400" />
                                                    <span>Inicio: {new Date(task.startDate).toLocaleDateString('es-MX')}</span>
                                                </div>
                                            )}
                                            {task.endDate && (
                                                <div className="flex items-center gap-1">
                                                    <Calendar size={12} className="text-slate-400" />
                                                    <span>Fin: {new Date(task.endDate).toLocaleDateString('es-MX')}</span>
                                                </div>
                                            )}
                                            {task.duration && (
                                                <div className="bg-slate-100/70 sm:bg-transparent px-2 py-0.5 sm:p-0 rounded text-[11px] sm:text-xs font-medium sm:font-normal text-slate-600 sm:text-slate-500">
                                                    <span>Duración: {task.duration} {task.durationUnit || 'días'}</span>
                                                </div>
                                            )}
                                        </div>
                                        {task.dependencies && task.dependencies.length > 0 && (
                                            <div className="mt-2 text-[11px] sm:text-xs text-slate-500">
                                                <span className="font-semibold sm:font-medium text-slate-600">Depende de:</span> {task.dependencies.join(', ')}
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {/* Footer */}
                <div className="mt-8 text-center text-sm text-slate-500">
                    <p>Este presupuesto fue compartido contigo desde PresuGenius</p>
                    <p className="mt-1">Generado el {new Date().toLocaleDateString('es-MX', { 
                        year: 'numeric', 
                        month: 'long', 
                        day: 'numeric' 
                    })}</p>
                </div>
            </div>
        </div>
    );
};

export default SharedProjectPage;

