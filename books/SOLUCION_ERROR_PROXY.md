# 🔧 Solución: Error 404 en /api/gemini

## Problema
El error `404 (Not Found)` en `/api/gemini` indica que el **proxy de Gemini no está corriendo**.

## ✅ Solución Rápida

### Opción 1: Ejecutar ambos servidores (Recomendado)
```bash
npm run dev:all
```

Este comando ejecuta:
- El proxy de Gemini en el puerto **4000**
- El servidor de desarrollo en el puerto **3005**

### Opción 2: Ejecutar en terminales separadas

**Terminal 1 - Proxy de Gemini:**
```bash
npm run gemini-proxy
```

**Terminal 2 - Servidor de desarrollo:**
```bash
npm run dev
```

## ⚙️ Configuración Requerida

### 1. Variables de Entorno

Crea un archivo `.env` en la raíz del proyecto:

```env
GEMINI_API_KEY=tu_api_key_aqui
```

**Nota:** El proxy usa `GEMINI_API_KEY` (no `VITE_GEMINI_API_KEY`)

### 2. Verificar que el Proxy Esté Corriendo

Deberías ver este mensaje en la terminal:
```
Gemini proxy server listening on port 4000
```

### 3. Verificar la Configuración de Vite

El archivo `vite.config.js` ahora tiene configurado el proxy:
```js
proxy: {
  '/api/gemini': {
    target: 'http://localhost:4000',
    changeOrigin: true,
  }
}
```

## 🐛 Verificación

1. **Verifica que el proxy esté corriendo:**
   ```bash
   # En otra terminal
   curl http://localhost:4000/api/gemini
   # Debería dar un error de método, no 404
   ```

2. **Verifica que Vite esté redirigiendo:**
   - Abre DevTools en el navegador
   - Ve a la pestaña Network
   - Intenta generar un presupuesto
   - La petición a `/api/gemini` debería ir al puerto 4000

## 📝 Notas

- El proxy debe estar corriendo **antes** de usar las funciones de IA
- Si cambias el puerto del proxy, actualiza `vite.config.js`
- El proxy necesita la variable `GEMINI_API_KEY` en el archivo `.env`

## 🚀 Comando Rápido

Para desarrollo, siempre usa:
```bash
npm run dev:all
```

Esto inicia ambos servidores automáticamente.

