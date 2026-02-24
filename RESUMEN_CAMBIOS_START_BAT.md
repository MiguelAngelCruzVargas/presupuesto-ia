# 📝 Resumen de Cambios - start.bat

## ✅ Archivo Modificado

El archivo `start.bat` ha sido actualizado para funcionar correctamente con el proyecto **PresuGenius**.

---

## 🔄 Cambios Realizados

### 1. **Nombre del Proyecto**
- ❌ Antes: `FISCAL-IA - Gestor de Servicios`
- ✅ Ahora: `PresuGenius - Gestor de Servicios IA`

### 2. **Puertos Actualizados**
- ❌ Antes: Puertos 3000 (Client) y 3001 (Server)
- ✅ Ahora: Puertos **3005** (Client Vite) y **4001** (Gemini Proxy)

### 3. **Estructura de Directorios**
- ❌ Antes: Intentaba acceder a carpeta `server` que no existe
- ✅ Ahora: Ejecuta comandos desde la raíz del proyecto

### 4. **Comandos NPM Corregidos**

#### Opción 1 - Iniciar Todo (Recomendado)
```batch
npm run dev:all
```
Este comando inicia automáticamente:
- Gemini Proxy en puerto 4001
- Client Vite en puerto 3005

#### Opción 4 - Solo Gemini Proxy
```batch
npm run gemini-proxy
```

#### Opción 5 - Solo Client Vite
```batch
npm run dev
```

---

## 📋 Opciones del Menú

```
[1] Iniciar Todo (Proxy + Client) - Recomendado
[2] Detener todos los procesos
[3] Reiniciar (Detener + Iniciar)
[4] Solo Gemini Proxy (puerto 4001)
[5] Solo Client Vite (puerto 3005)
[6] Ver procesos activos
[7] Limpiar puertos 3005 y 4001
[0] Salir
```

---

## 🚀 Cómo Usar

### Inicio Rápido
1. Haz doble clic en `start.bat`
2. Selecciona opción **[1]** para iniciar todo
3. Espera a que se abran las ventanas de terminal
4. Abre tu navegador en: **http://localhost:3005**

### Detener Servicios
- Opción **[2]** desde el menú
- O cierra las ventanas de terminal manualmente

---

## 🔧 Requisitos Previos

Antes de usar el `.bat`, asegúrate de tener:

1. **Node.js** instalado (v18+)
2. **Dependencias instaladas**:
   ```bash
   npm install
   ```
3. **Archivo `.env` configurado** con:
   ```env
   VITE_SUPABASE_URL=tu_url_de_supabase
   VITE_SUPABASE_ANON_KEY=tu_clave_anonima
   GEMINI_API_KEY=tu_api_key_de_gemini
   ```

---

## 📊 Arquitectura del Proyecto

```
PresuGenius
├── Puerto 3005: Vite Dev Server (Frontend React)
│   └── Comando: npm run dev
│
├── Puerto 4001: Gemini Proxy Server (Backend Express)
│   └── Comando: npm run gemini-proxy
│
└── Supabase: Base de datos PostgreSQL (Cloud)
```

---

## 🆚 Comparación Antes vs Ahora

| Aspecto | Antes (Fiscal-IA) | Ahora (PresuGenius) |
|---------|-------------------|---------------------|
| **Nombre** | Fiscal-IA | PresuGenius |
| **Puerto Client** | 3000 | 3005 |
| **Puerto Server** | 3001 | 4001 |
| **Carpeta Server** | `./server` | No existe (proxy en `src/lib`) |
| **Comando Server** | `npm start` (en ./server) | `npm run gemini-proxy` |
| **Comando Client** | `npm run dev` | `npm run dev` ✅ |
| **Comando Todo** | N/A | `npm run dev:all` ✅ |

---

## ⚠️ Notas Importantes

1. **El proxy de Gemini es esencial** para que funcionen las características de IA
2. Si solo inicias el client (opción 5), las funciones de IA no funcionarán
3. **Recomendación**: Usa siempre la opción **[1]** para iniciar todo junto
4. Los puertos 3005 y 4001 deben estar libres antes de iniciar

---

## 🐛 Solución de Problemas

### Error: "Puerto ya en uso"
- Usa la opción **[7]** para limpiar puertos
- O reinicia con opción **[3]**

### Error: "npm no reconocido"
- Asegúrate de tener Node.js instalado
- Reinicia tu terminal/CMD

### Error: "GEMINI_API_KEY not set"
- Verifica que el archivo `.env` existe
- Verifica que tenga la línea `GEMINI_API_KEY=tu_key`
- Reinicia los servicios

---

## 📚 Documentación Relacionada

- `README.md` - Documentación completa del proyecto
- `INICIO_RAPIDO.md` - Guía de inicio rápido
- `GEMINI_API_SETUP.md` - Configuración de Gemini API
- `package.json` - Scripts disponibles

---

**✅ El archivo `start.bat` ahora está completamente adaptado a PresuGenius y listo para usar.**
