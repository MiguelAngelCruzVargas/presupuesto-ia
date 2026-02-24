# 🔑 Configuración de Gemini API Key

Para habilitar las funciones de IA en PresuGenius, necesitas una API key de Google Gemini.

## Obtener tu API Key (GRATIS)

1. **Ve a Google AI Studio**
   - Abre: https://aistudio.google.com/app/apikey
   - Inicia sesión con tu cuenta de Google

2. **Crear API Key**
   - Click en "Create API Key"
   - Selecciona un proyecto o crea uno nuevo
   - Copia la API key generada

3. **Agregar al proyecto**
   - Abre el archivo `.env` en la raíz del proyecto
   - Pega tu API key:
   ```
   VITE_GEMINI_API_KEY=tu_api_key_aqui
   ```

4. **Reiniciar el servidor**
   ```bash
   # Detener el servidor actual (Ctrl+C)
   npm run dev
   ```

## Límites del Plan Gratuito

- ✅ **15 solicitudes por minuto**
- ✅ **1,500 solicitudes por día**
- ✅ **1 millón de tokens por mes**

Suficiente para desarrollo y uso personal.

## Funciones Habilitadas

Una vez configurada la API key, tendrás acceso a:

### 1. **Generador de Descripciones IA** ✨
- Hover sobre cualquier partida en el Editor
- Click en el ícono ✨ (Sparkles)
- Selecciona entre 3 descripciones profesionales generadas

### 2. **Sugerencias de Precio Inteligentes** 💰
- Se muestran automáticamente al editar partidas
- Basadas en tu catálogo y datos históricos
- Incluyen rango de precios y nivel de confianza

### 3. **Análisis de Presupuesto** (Ya existente)
- Auditoría automática de presupuestos
- Detección de errores y omisiones
- Recomendaciones de optimización

### 4. **Generación desde Lenguaje Natural** (Ya existente)
- Describe tu proyecto en texto simple
- La IA genera partidas automáticamente

## Solución de Problemas

### "API key not configured"
- Verifica que el archivo `.env` tenga la línea `VITE_GEMINI_API_KEY=...`
- Asegúrate de haber reiniciado el servidor después de agregar la key

### "Failed to fetch" o errores de red
- Verifica tu conexión a internet
- Confirma que la API key es válida
- Revisa que no hayas excedido los límites gratuitos

### Los botones de IA no aparecen
- Recarga la página en el navegador
- Verifica que la API key esté configurada correctamente
- Revisa la consola del navegador para errores

## Seguridad

⚠️ **IMPORTANTE**: 
- El archivo `.env` está en `.gitignore` y NO se subirá a GitHub
- Nunca compartas tu API key públicamente
- Si la expones accidentalmente, regenera una nueva en Google AI Studio

## Uso Responsable

- Las llamadas a la API se hacen desde el navegador del usuario
- Cada usuario debe tener su propia API key para producción
- Para aplicaciones públicas, considera implementar un backend proxy

---

**¿Listo?** Una vez configurada tu API key, las funciones de IA estarán disponibles inmediatamente. ¡Disfruta de PresuGenius potenciado por IA! 🚀
