/**
 * ImageUploadService
 * Servicio para subida y gestión de imágenes
 * Soporta múltiples imágenes, compresión y validación
 */

export class ImageUploadService {
    // Configuración
    static MAX_FILE_SIZE = 25 * 1024 * 1024; // 25MB de entrada permitido
    static TARGET_FILE_SIZE_MB = 2; // 2MB objetivo de salida (uso general)
    static ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

    /**
     * Perfil para las fotos del reporte fotográfico.
     *
     * En el PDF la foto más grande posible mide 130 x 91 mm (2 columnas),
     * que a 150 ppp son ~770 x 540 px. Con 1600 px de lado largo sobra
     * resolución incluso para imprimir y para el recorte del ajuste
     * automático, así que guardar 2 MB por foto era desperdiciar disco:
     * este perfil las deja en ~400 KB, unas 5 veces menos.
     */
    static REPORT_PHOTO_PROFILE = {
        targetSizeMB: 0.4,
        maxDimension: 1600,
        minDimension: 1024,
        startQuality: 0.85,
        minQuality: 0.62
    };

    /**
     * Valida un archivo de imagen
     * @param {File} file - Archivo a validar
     * @returns {Object} - { valid: boolean, error: string|null }
     */
    static validateImage(file) {
        if (!file) {
            return { valid: false, error: 'No se seleccionó ningún archivo' };
        }

        if (!this.ALLOWED_TYPES.includes(file.type)) {
            return { 
                valid: false, 
                error: `Tipo de archivo no permitido. Use: ${this.ALLOWED_TYPES.join(', ')}` 
            };
        }

        if (file.size > this.MAX_FILE_SIZE) {
            const maxSizeMB = (this.MAX_FILE_SIZE / 1024 / 1024).toFixed(1);
            const fileSizeMB = (file.size / 1024 / 1024).toFixed(2);
            return { 
                valid: false, 
                error: `El archivo es demasiado grande (${fileSizeMB}MB). El tamaño máximo permitido es ${maxSizeMB}MB incluso antes de comprimir.` 
            };
        }

        return { valid: true, error: null };
    }

    static getTargetSizeBytes(targetSizeMB = this.TARGET_FILE_SIZE_MB) {
        return targetSizeMB * 1024 * 1024;
    }

    static async loadImageElement(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                const img = new Image();
                img.onload = () => resolve(img);
                img.onerror = () => reject(new Error('Error al cargar la imagen'));
                img.src = e.target.result;
            };
            reader.onerror = () => reject(new Error('Error al leer el archivo'));
            reader.readAsDataURL(file);
        });
    }

    static calculateDimensions(width, height, maxDimension) {
        if (Math.max(width, height) <= maxDimension) {
            return { width, height };
        }

        if (width >= height) {
            return {
                width: maxDimension,
                height: Math.round((height * maxDimension) / width)
            };
        }

        return {
            width: Math.round((width * maxDimension) / height),
            height: maxDimension
        };
    }

    static drawImageToCanvas(image, width, height) {
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
            throw new Error('No se pudo preparar la compresión de imagen');
        }

        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(image, 0, 0, width, height);

        return canvas;
    }

    static async canvasToBlob(canvas, mimeType, quality) {
        return new Promise((resolve, reject) => {
            canvas.toBlob(
                (blob) => {
                    if (!blob) {
                        reject(new Error('No se pudo generar la imagen comprimida'));
                        return;
                    }
                    resolve(blob);
                },
                mimeType,
                quality
            );
        });
    }

    static blobToFile(blob, originalFile, fallbackExtension = 'jpg') {
        const mimeType = blob.type || originalFile.type || 'image/jpeg';
        const extension = mimeType.split('/')[1] || fallbackExtension;
        const safeName = originalFile.name.replace(/\.[^.]+$/i, '');

        return new File([blob], `${safeName}.${extension}`, {
            type: mimeType,
            lastModified: Date.now()
        });
    }

    /**
     * Comprime una imagen antes de subirla (compresión básica)
     * @param {File} file - Archivo de imagen
     * @param {number} maxWidth - Ancho máximo (default: 1920)
     * @param {number} quality - Calidad de compresión (0-1, default: 0.8)
     * @returns {Promise<File>} - Archivo comprimido
     */
    static async compressImage(file, maxWidth = 1920, quality = 0.8) {
        const img = await this.loadImageElement(file);
        const dimensions = this.calculateDimensions(img.width, img.height, maxWidth);
        const canvas = this.drawImageToCanvas(img, dimensions.width, dimensions.height);
        const outputType = file.type === 'image/png' ? 'image/jpeg' : file.type;
        const blob = await this.canvasToBlob(canvas, outputType, quality);
        return this.blobToFile(blob, file);
    }

    /**
     * Comprime una imagen de forma avanzada (para usuarios Pro)
     * Intenta comprimir hasta alcanzar el tamaño máximo deseado
     * @param {File} file - Archivo de imagen
     * @param {number} targetSizeMB - Tamaño objetivo en MB (default: 5MB)
     * @param {number} maxWidth - Ancho máximo (default: 1920)
     * @param {number} minQuality - Calidad mínima permitida (default: 0.6)
     * @returns {Promise<{file: File, originalSize: number, compressedSize: number, reduction: number}>} - Archivo comprimido con métricas
     */
    static async compressImageAdvanced(file, targetSizeMB = 5, maxWidth = 1920, minQuality = 0.6) {
        const targetSizeBytes = targetSizeMB * 1024 * 1024;
        const originalSize = file.size;
        
        // Si ya es menor al tamaño objetivo, retornar original
        if (originalSize <= targetSizeBytes) {
            return {
                file,
                originalSize,
                compressedSize: originalSize,
                reduction: 0
            };
        }

        const img = await this.loadImageElement(file);
        const dimensions = this.calculateDimensions(img.width, img.height, maxWidth);
        const canvas = this.drawImageToCanvas(img, dimensions.width, dimensions.height);
        const outputType = file.type === 'image/png' ? 'image/jpeg' : file.type;

        const tryCompress = async (quality) => {
            const blob = await this.canvasToBlob(canvas, outputType, quality);
            return {
                blob,
                size: blob.size,
                quality
            };
        };

        const findOptimalQuality = async (minQ, maxQ) => {
            if (maxQ - minQ < 0.05) {
                return tryCompress(minQ);
            }

            const midQ = (minQ + maxQ) / 2;
            const result = await tryCompress(midQ);

            if (result.size <= targetSizeBytes) {
                const higher = await tryCompress((midQ + maxQ) / 2);
                if (higher.size <= targetSizeBytes && higher.quality > result.quality) {
                    return higher;
                }
                return result;
            }

            return findOptimalQuality(minQ, midQ);
        };

        const result = await findOptimalQuality(minQuality, 0.95);
        const compressedFile = this.blobToFile(result.blob, file);
        const reduction = ((originalSize - compressedFile.size) / originalSize) * 100;

        return {
            file: compressedFile,
            originalSize,
            compressedSize: compressedFile.size,
            reduction: Math.round(reduction * 100) / 100,
            quality: result.quality
        };
    }

    /**
     * Compresión inteligente para dejar la imagen cerca de 2MB sin degradación agresiva.
     * Ajusta calidad y, si hace falta, reduce dimensiones de forma progresiva.
     */
    static async compressImageSmart(file, options = {}) {
        const {
            targetSizeMB = this.TARGET_FILE_SIZE_MB,
            maxDimension = 2560,
            minDimension = 1280,
            startQuality = 0.92,
            minQuality = 0.72
        } = options;

        const validation = this.validateImage(file);
        if (!validation.valid) {
            throw new Error(validation.error);
        }

        const targetSizeBytes = this.getTargetSizeBytes(targetSizeMB);
        const originalSize = file.size;

        if (originalSize <= targetSizeBytes) {
            return {
                file,
                originalSize,
                compressedSize: originalSize,
                reduction: 0,
                quality: 1,
                width: null,
                height: null,
                skipped: true
            };
        }

        const image = await this.loadImageElement(file);
        const outputType = file.type === 'image/png' ? 'image/jpeg' : file.type;

        let currentMaxDimension = Math.min(maxDimension, Math.max(image.width, image.height));
        let bestResult = null;

        while (currentMaxDimension >= minDimension) {
            const dimensions = this.calculateDimensions(image.width, image.height, currentMaxDimension);
            const canvas = this.drawImageToCanvas(image, dimensions.width, dimensions.height);

            let quality = startQuality;
            let candidate = null;

            while (quality >= minQuality) {
                const blob = await this.canvasToBlob(canvas, outputType, quality);
                candidate = {
                    blob,
                    quality,
                    width: dimensions.width,
                    height: dimensions.height,
                    size: blob.size
                };

                if (blob.size <= targetSizeBytes) {
                    break;
                }

                quality = Number((quality - 0.06).toFixed(2));
            }

            if (candidate) {
                if (!bestResult || candidate.size < bestResult.size) {
                    bestResult = candidate;
                }

                if (candidate.size <= targetSizeBytes) {
                    const compressedFile = this.blobToFile(candidate.blob, file);
                    const reduction = ((originalSize - compressedFile.size) / originalSize) * 100;

                    return {
                        file: compressedFile,
                        originalSize,
                        compressedSize: compressedFile.size,
                        reduction: Math.round(reduction * 100) / 100,
                        quality: candidate.quality,
                        width: candidate.width,
                        height: candidate.height,
                        skipped: false
                    };
                }
            }

            currentMaxDimension = Math.round(currentMaxDimension * 0.85);
        }

        if (!bestResult) {
            throw new Error('No se pudo comprimir la imagen');
        }

        const compressedFile = this.blobToFile(bestResult.blob, file);
        const reduction = ((originalSize - compressedFile.size) / originalSize) * 100;

        return {
            file: compressedFile,
            originalSize,
            compressedSize: compressedFile.size,
            reduction: Math.round(reduction * 100) / 100,
            quality: bestResult.quality,
            width: bestResult.width,
            height: bestResult.height,
            skipped: false,
            targetNotMet: bestResult.size > targetSizeBytes
        };
    }

    static async prepareImageForApp(file, options = {}) {
        return this.compressImageSmart(file, {
            targetSizeMB: this.TARGET_FILE_SIZE_MB,
            ...options
        });
    }

    /**
     * Prepara una foto para el reporte fotográfico con el perfil ligero.
     * @param {File} file - Foto original de la cámara
     * @returns {Promise<Object>} - { file, originalSize, compressedSize, reduction, ... }
     */
    static async prepareReportPhoto(file, options = {}) {
        return this.compressImageSmart(file, {
            ...this.REPORT_PHOTO_PROFILE,
            ...options
        });
    }

    /**
     * Sube una imagen usando la API existente
     * @param {File} file - Archivo de imagen
     * @param {string} projectId - ID del proyecto (opcional, para organización)
     * @param {string} taskId - ID de la tarea (opcional)
     * @param {Object} options - Opciones adicionales
     * @param {boolean} options.isPro - Si el usuario es Pro (para compresión avanzada)
     * @param {boolean} options.autoCompress - Si debe comprimir automáticamente (default: true)
     * @returns {Promise<string>} - URL pública de la imagen
     */
    static async uploadImage(file, projectId = null, taskId = null, options = {}) {
        const { isPro = false, autoCompress = true } = options;
        
        // Validar archivo
        const validation = this.validateImage(file);
        if (!validation.valid) {
            throw new Error(validation.error);
        }

        // Comprimir imagen si es necesario
        let fileToUpload = file;
        
        if (autoCompress) {
            try {
                const compressed = await this.prepareImageForApp(file, {
                    targetSizeMB: this.TARGET_FILE_SIZE_MB,
                    maxDimension: isPro ? 2560 : 2200,
                    minDimension: 1280
                });
                fileToUpload = compressed.file;
                console.log(`Imagen preparada: ${(file.size / 1024 / 1024).toFixed(2)}MB → ${(compressed.compressedSize / 1024 / 1024).toFixed(2)}MB (${compressed.reduction.toFixed(1)}% reducción)`);
            } catch (error) {
                // Si falla la compresión pero el archivo es válido, intentar subir el original
                if (file.size <= this.MAX_FILE_SIZE) {
                    console.warn('Error comprimiendo imagen, subiendo original:', error);
                    fileToUpload = file;
                } else {
                    throw error;
                }
            }
        }

        try {
            const formData = new FormData();
            formData.append('file', fileToUpload);

            // En dev sin VITE_API_URL: subida local vía Vite (guardado en uploads/reporte). Con backend: usar su URL.
            const apiBaseUrl = import.meta.env.VITE_API_URL;
            const uploadUrl = apiBaseUrl ? `${apiBaseUrl}/api/upload` : '/api/upload';

            const response = await fetch(uploadUrl, {
                method: 'POST',
                body: formData
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ error: 'Error desconocido' }));
                throw new Error(errorData.error || 'Error al subir la imagen');
            }

            const data = await response.json();
            return data.url; // La API retorna { url: "...", filename: "..." }
        } catch (error) {
            console.error('Error uploading image:', error);
            throw new Error(`Error al subir la imagen: ${error.message}`);
        }
    }

    /**
     * Sube múltiples imágenes
     * @param {Array<File>} files - Array de archivos
     * @param {string} projectId - ID del proyecto
     * @param {string} taskId - ID de la tarea (opcional)
     * @returns {Promise<Array<string>>} - Array de URLs públicas
     */
    static async uploadMultipleImages(files, projectId, taskId = null) {
        if (!Array.isArray(files) || files.length === 0) {
            return [];
        }

        const uploadPromises = files.map(file => 
            this.uploadImage(file, projectId, taskId)
        );

        try {
            const urls = await Promise.all(uploadPromises);
            return urls.filter(Boolean); // Filtrar errores
        } catch (error) {
            console.error('Error uploading multiple images:', error);
            throw error;
        }
    }

    /**
     * Elimina una imagen (si se implementa en el backend)
     * @param {string} imageUrl - URL de la imagen
     * @returns {Promise<void>}
     */
    static async deleteImage(imageUrl) {
        if (!imageUrl) return;

        // Por ahora solo loguear, la eliminación se puede implementar en el backend si es necesario
        console.log('Delete image requested:', imageUrl);
        // TODO: Implementar endpoint de eliminación en el backend si es necesario
    }

    /**
     * Elimina múltiples imágenes
     * @param {Array<string>} imageUrls - Array de URLs
     * @returns {Promise<void>}
     */
    static async deleteMultipleImages(imageUrls) {
        if (!Array.isArray(imageUrls) || imageUrls.length === 0) return;

        const deletePromises = imageUrls.map(url => this.deleteImage(url));
        await Promise.allSettled(deletePromises);
    }

    /**
     * Crea una URL de preview local para mostrar antes de subir
     * @param {File} file - Archivo de imagen
     * @returns {string} - URL de preview
     */
    static createPreviewUrl(file) {
        if (!file) return null;
        return URL.createObjectURL(file);
    }

    /**
     * Revoca una URL de preview para liberar memoria
     * @param {string} url - URL de preview
     */
    static revokePreviewUrl(url) {
        if (url && url.startsWith('blob:')) {
            URL.revokeObjectURL(url);
        }
    }
}

export default ImageUploadService;

