import React, { useState, useEffect } from 'react';
import { Share2, X, Copy, Check, Lock, Calendar, Trash2, Eye, ExternalLink, Settings, Clock } from 'lucide-react';
import { ShareService } from '../../services/ShareService';

const ShareProjectModal = ({ isOpen, onClose, projectId, projectName }) => {
    const [shares, setShares] = useState([]);
    const [loading, setLoading] = useState(false);
    const [creating, setCreating] = useState(false);
    const [copiedToken, setCopiedToken] = useState(null);
    const [shareConfig, setShareConfig] = useState({
        expiresIn: null, // días
        password: '',
        includeShortCode: true,
        canEdit: false,
        showSchedule: true // Por defecto mostrar cronograma
    });

    useEffect(() => {
        if (isOpen && projectId) {
            loadShares();
        }
    }, [isOpen, projectId]);

    const loadShares = async () => {
        try {
            setLoading(true);
            const data = await ShareService.getProjectShares(projectId);
            setShares(data || []);
        } catch (error) {
            console.error('Error loading shares:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleCreateShare = async () => {
        if (!projectId) return;

        try {
            setCreating(true);
            
            const expiresAt = shareConfig.expiresIn 
                ? new Date(Date.now() + shareConfig.expiresIn * 24 * 60 * 60 * 1000).toISOString()
                : null;

            const share = await ShareService.createShare(projectId, {
                expiresAt,
                password: shareConfig.password || null,
                includeShortCode: shareConfig.includeShortCode,
                canEdit: shareConfig.canEdit,
                metadata: {
                    showSchedule: shareConfig.showSchedule
                }
            });

            // Recargar lista
            await loadShares();

            // Resetear config
            setShareConfig({
                expiresIn: null,
                password: '',
                includeShortCode: true,
                canEdit: false,
                showSchedule: true
            });

            // Copiar automáticamente
            copyToClipboard(share.shareUrl);
        } catch (error) {
            console.error('Error creating share:', error);
            const errorMessage = error.message || 'Error al crear el enlace compartido. Verifica que el proyecto esté guardado y que la tabla project_shares exista en Supabase.';
            alert(errorMessage);
        } finally {
            setCreating(false);
        }
    };

    const copyToClipboard = async (text) => {
        try {
            await navigator.clipboard.writeText(text);
            setCopiedToken(text);
            setTimeout(() => setCopiedToken(null), 2000);
        } catch (error) {
            console.error('Error copying to clipboard:', error);
        }
    };

    const handleDeleteShare = async (shareId) => {
        if (!confirm('¿Eliminar este enlace compartido?')) return;

        try {
            await ShareService.deleteShare(shareId);
            await loadShares();
        } catch (error) {
            console.error('Error deleting share:', error);
            alert('Error al eliminar el enlace');
        }
    };

    const formatExpiresAt = (date) => {
        if (!date) return 'Sin expiración';
        const expires = new Date(date);
        const now = new Date();
        const diffDays = Math.ceil((expires - now) / (1000 * 60 * 60 * 24));
        
        if (diffDays < 0) return 'Expirado';
        if (diffDays === 0) return 'Expira hoy';
        if (diffDays === 1) return 'Expira mañana';
        return `Expira en ${diffDays} días`;
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 dark:bg-slate-900/80 backdrop-blur-sm animate-fadeIn">
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] flex flex-col overflow-hidden border border-slate-200 dark:border-slate-700">
                {/* Header */}
                <div className="p-6 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center bg-gradient-to-r from-emerald-600 to-teal-600 text-white">
                    <div>
                        <h3 className="font-bold flex items-center text-xl">
                            <Share2 className="mr-2 text-emerald-200" size={24} />
                            Compartir Presupuesto
                        </h3>
                        <p className="text-sm text-emerald-100 mt-1">{projectName}</p>
                    </div>
                    <button onClick={onClose} className="text-white/80 hover:text-white transition">
                        <X size={24} />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6">
                    {/* Crear nuevo enlace */}
                    <div className="bg-slate-50 dark:bg-slate-700/50 rounded-xl p-6 mb-6 border border-slate-200 dark:border-slate-600">
                        <h4 className="font-bold text-slate-800 dark:text-slate-100 mb-4">Crear Nuevo Enlace Compartido</h4>
                        
                        <div className="space-y-4">
                            {/* Opciones de expiración */}
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                                    Expiración (opcional)
                                </label>
                                <select
                                    value={shareConfig.expiresIn || ''}
                                    onChange={(e) => setShareConfig({ ...shareConfig, expiresIn: e.target.value ? parseInt(e.target.value) : null })}
                                    className="w-full px-4 py-2 bg-white dark:bg-slate-800 border-2 border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none text-slate-800 dark:text-slate-200"
                                >
                                    <option value="">Sin expiración</option>
                                    <option value="1">1 día</option>
                                    <option value="7">7 días</option>
                                    <option value="30">30 días</option>
                                    <option value="90">90 días</option>
                                </select>
                            </div>

                            {/* Contraseña opcional */}
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                                    Contraseña (opcional)
                                </label>
                                <input
                                    type="password"
                                    value={shareConfig.password}
                                    onChange={(e) => setShareConfig({ ...shareConfig, password: e.target.value })}
                                    placeholder="Dejar vacío para sin contraseña"
                                    className="w-full px-4 py-2 bg-white dark:bg-slate-800 border-2 border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none text-slate-800 dark:text-slate-200 placeholder:text-slate-400 dark:placeholder:text-slate-500"
                                />
                            </div>

                            {/* Opciones adicionales */}
                            <div className="space-y-3">
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={shareConfig.includeShortCode}
                                        onChange={(e) => setShareConfig({ ...shareConfig, includeShortCode: e.target.checked })}
                                        className="w-4 h-4 text-emerald-600 border-slate-300 dark:border-slate-600 rounded focus:ring-emerald-500 bg-white dark:bg-slate-800"
                                    />
                                    <span className="text-sm text-slate-700 dark:text-slate-300">Generar código corto</span>
                                </label>
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={shareConfig.showSchedule}
                                        onChange={(e) => setShareConfig({ ...shareConfig, showSchedule: e.target.checked })}
                                        className="w-4 h-4 text-emerald-600 border-slate-300 dark:border-slate-600 rounded focus:ring-emerald-500 bg-white dark:bg-slate-800"
                                    />
                                    <span className="text-sm text-slate-700 dark:text-slate-300">
                                        Mostrar cronograma al cliente
                                        <span className="text-xs text-slate-500 dark:text-slate-400 ml-1">(si existe)</span>
                                    </span>
                                </label>
                            </div>

                            <button
                                onClick={handleCreateShare}
                                disabled={creating}
                                className="w-full px-6 py-3 bg-emerald-600 text-white rounded-lg font-medium hover:bg-emerald-700 transition flex items-center justify-center gap-2 shadow-lg shadow-emerald-200 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {creating ? (
                                    <>
                                        <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                                        Creando...
                                    </>
                                ) : (
                                    <>
                                        <Share2 size={20} />
                                        Crear Enlace Compartido
                                    </>
                                )}
                            </button>
                        </div>
                    </div>

                    {/* Lista de enlaces existentes */}
                    <div>
                        <h4 className="font-bold text-slate-800 dark:text-slate-100 mb-4">Enlaces Compartidos Activos</h4>
                        
                        {loading ? (
                            <div className="text-center py-8">
                                <div className="animate-spin rounded-full h-8 w-8 border-4 border-emerald-500 border-t-transparent mx-auto mb-2"></div>
                                <p className="text-slate-600 dark:text-slate-400 text-sm">Cargando...</p>
                            </div>
                        ) : shares.length === 0 ? (
                            <div className="text-center py-8 bg-slate-50 dark:bg-slate-700/50 rounded-lg border-2 border-dashed border-slate-300 dark:border-slate-600">
                                <Share2 className="mx-auto mb-3 text-slate-400 dark:text-slate-500" size={32} />
                                <p className="text-slate-600 dark:text-slate-300">No hay enlaces compartidos aún</p>
                                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Crea uno usando el formulario de arriba</p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {shares.map((share) => {
                                    const isExpired = share.expires_at && new Date(share.expires_at) < new Date();
                                    const isCopied = copiedToken === share.shareUrl;

                                    return (
                                        <div
                                            key={share.id}
                                            className={`rounded-lg border-2 p-4 ${
                                                isExpired 
                                                    ? 'border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20' 
                                                    : 'border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700/50'
                                            }`}
                                        >
                                            <div className="flex items-start justify-between gap-4">
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2 mb-2">
                                                        <ExternalLink size={16} className="text-slate-400 dark:text-slate-500" />
                                                        <span className="text-xs font-medium text-slate-500 dark:text-slate-400 truncate">
                                                            {share.shareUrl}
                                                        </span>
                                                        {share.password && (
                                                            <Lock size={14} className="text-amber-600 dark:text-amber-500" />
                                                        )}
                                                        {isExpired && (
                                                            <span className="px-2 py-0.5 bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-400 rounded text-xs font-bold">
                                                                Expirado
                                                            </span>
                                                        )}
                                                    </div>

                                                    {share.shortUrl && (
                                                        <div className="flex items-center gap-2 mb-2">
                                                            <span className="text-xs text-slate-400 dark:text-slate-500">Código corto:</span>
                                                            <span className="text-xs font-mono text-slate-600 dark:text-slate-300">{share.shortUrl}</span>
                                                        </div>
                                                    )}

                                                    <div className="flex items-center gap-4 text-xs text-slate-500 dark:text-slate-400">
                                                        <div className="flex items-center gap-1">
                                                            <Eye size={12} />
                                                            <span>{share.access_count || 0} vistas</span>
                                                        </div>
                                                        <div className="flex items-center gap-1">
                                                            <Calendar size={12} />
                                                            <span>{formatExpiresAt(share.expires_at)}</span>
                                                        </div>
                                                        {share.last_accessed_at && (
                                                            <div className="flex items-center gap-1">
                                                                <Clock size={12} />
                                                                <span>Último acceso: {new Date(share.last_accessed_at).toLocaleDateString('es-MX')}</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>

                                                <div className="flex items-center gap-2 shrink-0">
                                                    <button
                                                        onClick={() => copyToClipboard(share.shareUrl)}
                                                        className="p-2 hover:bg-slate-100 dark:hover:bg-slate-600 rounded-lg transition"
                                                        title="Copiar enlace"
                                                    >
                                                        {isCopied ? (
                                                            <Check size={18} className="text-emerald-600 dark:text-emerald-400" />
                                                        ) : (
                                                            <Copy size={18} className="text-slate-600 dark:text-slate-400" />
                                                        )}
                                                    </button>
                                                    <button
                                                        onClick={() => window.open(share.shareUrl, '_blank')}
                                                        className="p-2 hover:bg-slate-100 dark:hover:bg-slate-600 rounded-lg transition"
                                                        title="Abrir enlace"
                                                    >
                                                        <ExternalLink size={18} className="text-slate-600 dark:text-slate-400" />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDeleteShare(share.id)}
                                                        className="p-2 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition"
                                                        title="Eliminar enlace"
                                                    >
                                                        <Trash2 size={18} className="text-red-600 dark:text-red-400" />
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>

                {/* Footer */}
                <div className="p-4 bg-slate-50 dark:bg-slate-700/50 border-t border-slate-200 dark:border-slate-700 flex justify-between items-center text-xs text-slate-500 dark:text-slate-400">
                    <p>Los enlaces compartidos permiten ver el presupuesto sin crear cuenta</p>
                    <button onClick={onClose} className="px-4 py-2 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600 rounded-lg font-medium transition">
                        Cerrar
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ShareProjectModal;

