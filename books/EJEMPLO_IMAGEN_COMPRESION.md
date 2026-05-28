# 📸 Guía de Uso: Compresión de Imágenes

## Componente ImageCompressor

El componente `ImageCompressor` permite comprimir imágenes automáticamente antes de subirlas, con diferentes niveles según el plan del usuario.

### Características

- ✅ **Límite de 5MB** para todas las imágenes
- ✅ **Compresión automática** para usuarios Pro
- ✅ **Validación de tamaño** antes de subir
- ✅ **Mensajes de error claros** cuando excede el límite
- ✅ **Compresión avanzada** para usuarios Pro

### Uso Básico

```jsx
import ImageCompressor from '../components/ui/ImageCompressor';

const MyComponent = () => {
    const [selectedFile, setSelectedFile] = useState(null);
    const [compressedFile, setCompressedFile] = useState(null);

    const handleFileSelect = (e) => {
        const file = e.target.files[0];
        setSelectedFile(file);
    };

    const handleCompressed = (file, metrics) => {
        setCompressedFile(file);
        console.log('Reducción:', metrics.reduction + '%');
    };

    const handleError = (error) => {
        alert(error);
    };

    return (
        <div>
            <input type="file" onChange={handleFileSelect} accept="image/*" />
            
            {selectedFile && (
                <ImageCompressor
                    file={selectedFile}
                    onCompressed={handleCompressed}
                    onError={handleError}
                    showDetails={true}
                />
            )}
        </div>
    );
};
```

### Integración en PhotographicReportModal

```jsx
import ImageCompressor from '../../components/ui/ImageCompressor';
import { useSubscription } from '../../context/SubscriptionContext';

const handleFileChange = async (entryId, e) => {
    const files = Array.from(e.target.files || []);
    const { isPro } = useSubscription();
    
    for (const file of files) {
        // Validar tamaño
        if (file.size > 5 * 1024 * 1024 && !isPro) {
            alert('La imagen es demasiado grande. Máximo 5MB.');
            continue;
        }
        
        // Subir con compresión automática
        try {
            const url = await ImageUploadService.uploadImage(file, projectId, null, {
                isPro,
                autoCompress: true
            });
            // Usar la URL...
        } catch (error) {
            alert(error.message);
        }
    }
};
```

### Integración Directa con ImageUploadService

```jsx
import { ImageUploadService } from '../../services/ImageUploadService';
import { useSubscription } from '../../context/SubscriptionContext';

const MyComponent = () => {
    const { isPro } = useSubscription();
    
    const handleUpload = async (file) => {
        try {
            const url = await ImageUploadService.uploadImage(
                file,
                projectId,
                taskId,
                {
                    isPro, // Pasa si es usuario Pro
                    autoCompress: true // Compresión automática
                }
            );
            console.log('Imagen subida:', url);
        } catch (error) {
            console.error('Error:', error.message);
        }
    };
};
```

### Compresión Avanzada Manual (Solo Pro)

```jsx
import { ImageUploadService } from '../../services/ImageUploadService';

const compressAndUpload = async (file) => {
    try {
        // Comprimir primero
        const result = await ImageUploadService.compressImageAdvanced(
            file,
            5, // 5MB objetivo
            1920, // Max width
            0.6 // Min quality
        );
        
        console.log(`Reducción: ${result.reduction}%`);
        console.log(`Tamaño original: ${result.originalSize} bytes`);
        console.log(`Tamaño comprimido: ${result.compressedSize} bytes`);
        
        // Subir la imagen comprimida
        const url = await ImageUploadService.uploadImage(result.file);
        return url;
    } catch (error) {
        console.error('Error:', error);
    }
};
```

## Límites y Validaciones

### Límites de Tamaño
- **Máximo permitido**: 5MB
- **Free**: No puede subir archivos > 5MB
- **Pro**: Compresión automática de archivos > 5MB

### Tipos de Archivo Permitidos
- JPEG/JPG
- PNG (se convierte a JPEG para mejor compresión)
- WebP

### Compresión

#### Usuarios Free
- Compresión básica (opcional)
- Redimensiona a máximo 1920px de ancho
- Calidad: 80%

#### Usuarios Pro
- Compresión avanzada automática
- Intenta alcanzar exactamente 5MB o menos
- Búsqueda binaria de calidad óptima
- Redimensiona a máximo 1920px de ancho
- Calidad mínima: 60%
- Convierte PNG a JPEG automáticamente

## Mensajes de Error

El componente muestra mensajes claros:

- **Archivo muy grande (Free)**: "El archivo es demasiado grande (X MB). El tamaño máximo permitido es 5MB. Los usuarios Pro pueden comprimir imágenes automáticamente."
- **Archivo muy grande (Pro)**: "La imagen será comprimida automáticamente"
- **Tipo no permitido**: "Tipo de archivo no permitido. Use: image/jpeg, image/png, image/webp"

## Rate Limiting en Upload

El servidor también tiene rate limiting para proteger contra abuso:
- **Límite por minuto**: Configurable en `geminiServer.js`
- **Límite diario**: Configurable en `geminiServer.js`
- **Por IP**: Se identifica por IP del cliente

