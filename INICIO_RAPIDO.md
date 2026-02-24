# 🚀 Inicio Rápido - PresuGenius

## ⚡ Inicio en 3 Pasos

### 1. Instalar Dependencias (si no lo has hecho)
```bash
npm install
```

### 2. Configurar API Key de Gemini

Crea un archivo `.env` en la raíz del proyecto:
```env
GEMINI_API_KEY=tu_api_key_de_google_gemini
```

**Obtén tu API key gratis en:** https://aistudio.google.com/app/apikey

### 3. Iniciar el Proyecto

**Opción A - Todo junto (Recomendado):**
```bash
npm run dev:all
```

**Opción B - Terminales separadas:**

Terminal 1:
```bash
npm run gemini-proxy
```

Terminal 2:
```bash
npm run dev
```

## ✅ Verificación

Deberías ver:

**En la terminal del proxy:**
```
✅ GEMINI_API_KEY configurada correctamente
✅ Usando modelo: gemini-1.5-flash
🚀 ========================================
✅ Gemini proxy server corriendo en puerto 4000
✅ Endpoint: http://localhost:4000/api/gemini
🚀 ========================================
```

**En la terminal de Vite:**
```
VITE v7.x.x  ready in xxx ms
➜  Local:   http://localhost:3005/
```

## 🌐 Acceder a la Aplicación

Abre tu navegador en: **http://localhost:3005**

## 🐛 Solución de Problemas

### Error: "GEMINI_API_KEY not set"
- Verifica que el archivo `.env` existe en la raíz
- Verifica que tenga la línea: `GEMINI_API_KEY=tu_key`
- Reinicia el proxy

### Error: "404 Not Found" en /api/gemini
- El proxy no está corriendo
- Ejecuta: `npm run gemini-proxy`
- Verifica que esté en el puerto 4000

### Error: "500 Internal Server Error"
- Revisa los logs del proxy (terminal donde corre)
- Verifica que la API key sea válida
- Verifica que no hayas excedido los límites de la API

## 📝 Notas

- El proxy debe estar corriendo **antes** de usar funciones de IA
- La API key se guarda en `.env` (no se sube a Git)
- El proyecto funciona sin IA, pero las funciones de IA requieren el proxy

