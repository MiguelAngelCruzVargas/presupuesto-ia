/**
 * ImageUploadService
 * Servicio para subida y gestión de imágenes
 * Soporta múltiples imágenes, compresión y validación
 */

export class ImageUploadService {
    // Configuración
    static MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB (actualizado)
    static ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

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
                error: `El archivo es demasiado grande (${fileSizeMB}MB). El tamaño máximo permitido es ${maxSizeMB}MB. Los usuarios Pro pueden comprimir imágenes automáticamente.` 
            };
        }

        return { valid: true, error: null };
    }

    /**
     * Comprime una imagen antes de subirla (compresión básica)
     * @param {File} file - Archivo de imagen
     * @param {number} maxWidth - Ancho máximo (default: 1920)
     * @param {number} quality - Calidad de compresión (0-1, default: 0.8)
     * @returns {Promise<File>} - Archivo comprimido
     */
    static async compressImage(file, maxWidth = 1920, quality = 0.8) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                const img = new Image();
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    let width = img.width;
                    let height = img.height;

                    // Redimensionar si es necesario
                    if (width > maxWidth) {
                        height = (height * maxWidth) / width;
                        width = maxWidth;
                    }

                    canvas.width = width;
                    canvas.height = height;

                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0, width, height);

                    canvas.toBlob(
                        (blob) => {
                            if (!blob) {
                                reject(new Error('Error al comprimir la imagen'));
                                return;
                            }
                            const compressedFile = new File([blob], file.name, {
                                type: file.type,
                                lastModified: Date.now()
                            });
                            resolve(compressedFile);
                        },
                        file.type,
                        quality
                    );
                };
                img.onerror = () => reject(new Error('Error al cargar la imagen'));
                img.src = e.target.result;
            };
            reader.onerror = () => reject(new Error('Error al leer el archivo'));
            reader.readAsDataURL(file);
        });
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

        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                const img = new Image();
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    let width = img.width;
                    let height = img.height;

                    // Calcular dimensiones optimizadas
                    if (width > maxWidth) {
                        height = (height * maxWidth) / width;
                        width = maxWidth;
                    }

                    canvas.width = width;
                    canvas.height = height;
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0, width, height);

                    // Intentar diferentes niveles de calidad
                    const tryCompress = (quality) => {
                        return new Promise((resolveQuality) => {
                            canvas.toBlob(
                                (blob) => {
                                    if (!blob) {
                                        resolveQuality(null);
                                        return;
                                    }
                                    resolveQuality({
                                        blob,
                                        size: blob.size,
                                        quality
                                    });
                                },
                                file.type === 'image/png' ? 'image/jpeg' : file.type, // Convertir PNG a JPEG para mejor compresión
                                quality
                            );
                        });
                    };

                    // Búsqueda binaria de la calidad óptima
                    const findOptimalQuality = async (minQ, maxQ) => {
                        if (maxQ - minQ < 0.05) {
                            // Si la diferencia es muy pequeña, usar la calidad mínima
                            return await tryCompress(minQ);
                        }

                        const midQ = (minQ + maxQ) / 2;
                        const result = await tryCompress(midQ);

                        if (!result || result.size <= 0) {
                            return await tryCompress(minQ);
                        }

                        if (result.size <= targetSizeBytes) {
                            // Si es menor al objetivo, intentar calidad más alta
                            const higher = await tryCompress((midQ + maxQ) / 2);
                            if (higher && higher.size <= targetSizeBytes && higher.quality > result.quality) {
                                return higher;
                            }
                            return result;
                        } else {
                            // Si es mayor, reducir calidad
                            return await findOptimalQuality(minQ, midQ);
                        }
                    };

                    // Iniciar compresión
                    findOptimalQuality(minQuality, 0.95)
                        .then((result) => {
                            if (!result || !result.blob) {
                                reject(new Error('No se pudo comprimir la imagen'));
                                return;
                            }

                            const compressedFile = new File(
                                [result.blob],
                                file.name.replace(/\.png$/i, '.jpg'), // Cambiar extensión si era PNG
                                {
                                    type: result.blob.type,
                                    lastModified: Date.now()
                                }
                            );

                            const reduction = ((originalSize - compressedFile.size) / originalSize) * 100;

                            resolve({
                                file: compressedFile,
                                originalSize,
                                compressedSize: compressedFile.size,
                                reduction: Math.round(reduction * 100) / 100,
                                quality: result.quality
                            });
                        })
                        .catch((error) => {
                            reject(new Error(`Error al comprimir: ${error.message}`));
                        });
                };
                img.onerror = () => reject(new Error('Error al cargar la imagen'));
                img.src = e.target.result;
            };
            reader.onerror = () => reject(new Error('Error al leer el archivo'));
            reader.readAsDataURL(file);
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
                // Si el archivo excede el límite y es usuario Pro, usar compresión avanzada
                if (file.size > this.MAX_FILE_SIZE && isPro) {
                    const compressed = await this.compressImageAdvanced(file, 5, 1920, 0.6);
                    fileToUpload = compressed.file;
                    console.log(`Imagen comprimida: ${(file.size / 1024 / 1024).toFixed(2)}MB → ${(compressed.compressedSize / 1024 / 1024).toFixed(2)}MB (${compressed.reduction.toFixed(1)}% reducción)`);
                } else if (file.size > this.MAX_FILE_SIZE) {
                    // Usuario Free con archivo grande
                    throw new Error(`El archivo es demasiado grande (${(file.size / 1024 / 1024).toFixed(2)}MB). El tamaño máximo permitido es ${(this.MAX_FILE_SIZE / 1024 / 1024).toFixed(1)}MB. Los usuarios Pro pueden comprimir imágenes automáticamente.`);
                } else {
                    // Compresión básica para optimizar
                    fileToUpload = await this.compressImage(file, 1920, 0.85);
                }
            } catch (error) {
                // Si falla la compresión pero el archivo es válido, intentar subir el original
                if (file.size <= this.MAX_FILE_SIZE) {
                    console.warn('Error comprimiendo imagen, subiendo original:', error);
                    fileToUpload = file;
                } else {
                    // Si el archivo es demasiado grande y no se pudo comprimir, lanzar error
                    throw error;
                }
            }
        }

        try {
            // Usar la API existente /api/upload
            const formData = new FormData();
            formData.append('file', fileToUpload);

            // Usar la API existente (mismo servidor que Gemini)
            // El servidor corre en el puerto 4001 por defecto
            const apiBaseUrl = import.meta.env.VITE_API_URL || 'http://localhost:4001';
            const uploadUrl = `${apiBaseUrl}/api/upload`;

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

