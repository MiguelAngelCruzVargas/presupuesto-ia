import React, { useState } from 'react';
import { Compress, Loader2, CheckCircle, AlertCircle, Zap } from 'lucide-react';
import { useSubscription } from '../../context/SubscriptionContext';
import { ImageUploadService } from '../../services/ImageUploadService';

/**
 * Componente para comprimir imágenes automáticamente
 * Para usuarios Pro: compresión avanzada automática
 * Para usuarios Free: compresión básica o mensaje de error
 */
const ImageCompressor = ({ file, onCompressed, onError, showDetails = false }) => {
    const { isPro } = useSubscription();
    const [compressing, setCompressing] = useState(false);
    const [compressionResult, setCompressionResult] = useState(null);
    const [error, setError] = useState(null);

    const handleCompress = async () => {
        if (!file) {
            const errMsg = 'No se proporcionó ningún archivo';
            setError(errMsg);
            if (onError) onError(errMsg);
            return;
        }

        // Validar tamaño primero
        const validation = ImageUploadService.validateImage(file);
        if (!validation.valid) {
            const errMsg = validation.error;
            setError(errMsg);
            if (onError) onError(errMsg);
            return;
        }

        setCompressing(true);
        setError(null);
        setCompressionResult(null);

        try {
            let result;

            if (isPro) {
                // Usuarios Pro: compresión avanzada
                result = await ImageUploadService.compressImageAdvanced(
                    file,
                    5, // 5MB objetivo
                    1920, // Max width
                    0.6 // Min quality
                );

                setCompressionResult({
                    originalSize: result.originalSize,
                    compressedSize: result.compressedSize,
                    reduction: result.reduction,
                    quality: result.quality,
                    file: result.file
                });

                if (onCompressed) {
                    onCompressed(result.file, {
                        originalSize: result.originalSize,
                        compressedSize: result.compressedSize,
                        reduction: result.reduction
                    });
                }
            } else {
                // Usuarios Free: compresión básica
                if (file.size > ImageUploadService.MAX_FILE_SIZE) {
                    const errMsg = `Tu imagen es demasiado grande (${(file.size / 1024 / 1024).toFixed(2)}MB). El plan Gratis permite máximo 5MB. Actualiza a Pro para compresión automática de imágenes grandes.`;
                    setError(errMsg);
                    if (onError) onError(errMsg);
                    return;
                }

                // Compresión básica para usuarios Free
                result = await ImageUploadService.compressImage(file, 1920, 0.8);
                
                setCompressionResult({
                    originalSize: file.size,
                    compressedSize: result.size,
                    reduction: ((file.size - result.size) / file.size) * 100,
                    file: result
                });

                if (onCompressed) {
                    onCompressed(result, {
                        originalSize: file.size,
                        compressedSize: result.size,
                        reduction: ((file.size - result.size) / file.size) * 100
                    });
                }
            }
        } catch (err) {
            const errMsg = err.message || 'Error al comprimir la imagen';
            console.error('Error comprimiendo imagen:', err);
            setError(errMsg);
            if (onError) onError(errMsg);
        } finally {
            setCompressing(false);
        }
    };

    // Auto-comprimir si es usuario Pro y el archivo es mayor a 5MB
    React.useEffect(() => {
        if (file && isPro && file.size > ImageUploadService.MAX_FILE_SIZE) {
            handleCompress();
        }
    }, [file, isPro]);

    const formatBytes = (bytes) => {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
    };

    if (!file) return null;

    const fileSizeMB = file.size / 1024 / 1024;
    const exceedsLimit = file.size > ImageUploadService.MAX_FILE_SIZE;

    return (
        <div className="w-full">
            {/* Información del archivo */}
            <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-4 mb-3 border border-slate-200 dark:border-slate-700">
                <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                        {file.name}
                    </span>
                    <span className={`text-sm font-bold ${
                        exceedsLimit 
                            ? 'text-red-600 dark:text-red-400' 
                            : 'text-slate-600 dark:text-slate-400'
                    }`}>
                        {formatBytes(file.size)}
                    </span>
                </div>
                
                {exceedsLimit && (
                    <div className="flex items-start gap-2 mt-2 p-2 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded">
                        <AlertCircle className="text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" size={16} />
                        <div className="flex-1">
                            <p className="text-xs font-medium text-amber-800 dark:text-amber-300">
                                {isPro 
                                    ? 'La imagen será comprimida automáticamente'
                                    : `La imagen excede el límite de 5MB. ${fileSizeMB.toFixed(2)}MB detectado.`
                                }
                            </p>
                        </div>
                    </div>
                )}
            </div>

            {/* Resultado de compresión */}
            {compressionResult && (
                <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-lg p-3 mb-3">
                    <div className="flex items-center gap-2 mb-2">
                        <CheckCircle className="text-emerald-600 dark:text-emerald-400" size={18} />
                        <span className="text-sm font-bold text-emerald-800 dark:text-emerald-300">
                            Imagen comprimida exitosamente
                        </span>
                    </div>
                    {showDetails && (
                        <div className="text-xs text-emerald-700 dark:text-emerald-400 space-y-1 mt-2">
                            <div className="flex justify-between">
                                <span>Tamaño original:</span>
                                <span className="font-bold">{formatBytes(compressionResult.originalSize)}</span>
                            </div>
                            <div className="flex justify-between">
                                <span>Tamaño comprimido:</span>
                                <span className="font-bold">{formatBytes(compressionResult.compressedSize)}</span>
                            </div>
                            <div className="flex justify-between">
                                <span>Reducción:</span>
                                <span className="font-bold">{compressionResult.reduction.toFixed(1)}%</span>
                            </div>
                            {compressionResult.quality && (
                                <div className="flex justify-between">
                                    <span>Calidad:</span>
                                    <span className="font-bold">{(compressionResult.quality * 100).toFixed(0)}%</span>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}

            {/* Error */}
            {error && (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3 mb-3">
                    <div className="flex items-start gap-2">
                        <AlertCircle className="text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" size={18} />
                        <p className="text-sm text-red-800 dark:text-red-300">{error}</p>
                    </div>
                </div>
            )}

            {/* Botón de compresión manual (si no es Pro o no se auto-comprimió) */}
            {!isPro && exceedsLimit && !compressing && !compressionResult && (
                <button
                    onClick={handleCompress}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition flex items-center justify-center gap-2"
                >
                    <Compress size={18} />
                    Intentar Comprimir
                </button>
            )}

            {/* Loading */}
            {compressing && (
                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                    <div className="flex items-center justify-center gap-3">
                        <Loader2 className="text-blue-600 dark:text-blue-400 animate-spin" size={20} />
                        <span className="text-sm font-medium text-blue-800 dark:text-blue-300">
                            {isPro ? 'Comprimiendo imagen...' : 'Comprimiendo imagen (básico)...'}
                        </span>
                    </div>
                    {isPro && (
                        <p className="text-xs text-blue-600 dark:text-blue-400 text-center mt-2">
                            Usando compresión avanzada Pro
                        </p>
                    )}
                </div>
            )}
        </div>
    );
};

export default ImageCompressor;

