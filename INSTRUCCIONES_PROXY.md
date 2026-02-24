# 🚀 Instrucciones para Ejecutar el Proxy de Gemini

## ⚠️ Error 500: Solución

Si estás viendo un error 500, sigue estos pasos:

### 1. Verificar que el Proxy Esté Corriendo

El proxy debe estar ejecutándose en el puerto **4000**. Deberías ver este mensaje:
```
Gemini proxy server listening on port 4000
```

### 2. Verificar la API Key

Asegúrate de tener un archivo `.env` en la raíz del proyecto con:
```env
GEMINI_API_KEY=tu_api_key_aqui
```

**Importante:** 
- El archivo debe llamarse `.env` (no `.env.local` ni otro nombre)
- Debe estar en la raíz del proyecto (mismo nivel que `package.json`)
- No debe tener espacios alrededor del `=`

### 3. Reiniciar el Proxy

Si ya estaba corriendo, deténlo (Ctrl+C) y reinícialo:

```bash
npm run gemini-proxy
```

### 4. Verificar los Logs

El proxy ahora muestra logs detallados. Si hay un error, verás:
- El URL que se está llamando (con la key oculta)
- El body de la petición
- El error específico de Gemini API

### 5. Verificar la API Key de Gemini

Si el error persiste, verifica que tu API key sea válida:
1. Ve a https://aistudio.google.com/app/apikey
2. Verifica que la key esté activa
3. Copia la key nuevamente y pégala en el `.env`

## 🔧 Comandos Útiles

### Ejecutar todo junto (Recomendado):
```bash
npm run dev:all
```

### Ejecutar por separado:

**Terminal 1:**
```bash
npm run gemini-proxy
```

**Terminal 2:**
```bash
npm run dev
```

## 📝 Verificación

1. Abre la terminal donde corre el proxy
2. Intenta generar un presupuesto desde la app
3. Deberías ver logs como:
   ```
   Enviando petición a Gemini API...
   URL: https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=***
   Respuesta exitosa de Gemini API
   ```

Si ves errores, los logs te dirán exactamente qué está mal.

## 🐛 Errores Comunes

### "GEMINI_API_KEY not set in environment"
- Crea el archivo `.env` con la key
- Reinicia el proxy

### "Error 400: Bad Request"
- La API key puede ser inválida
- Verifica el formato del `.env`

### "Error 403: Forbidden"
- La API key no tiene permisos
- Verifica en Google AI Studio que la key esté activa

### "Error 429: Too Many Requests"
- Has excedido el límite de requests
- Espera unos minutos e intenta de nuevo

## ✅ Después de Corregir

Una vez que el proxy esté funcionando correctamente:
1. Reinicia el servidor de desarrollo si es necesario
2. Intenta generar el presupuesto de nuevo
3. Deberías ver las partidas generadas correctamente

