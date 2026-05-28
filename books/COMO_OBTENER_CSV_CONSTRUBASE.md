# 📋 Cómo Obtener CSV de CONSTRUBASE-LIBRE

## ⚠️ Importante

No puedo acceder directamente a CONSTRUBASE-LIBRE desde aquí porque requiere:
- Autenticación web interactiva
- Sesión de navegador activa
- Acceso a la interfaz web

**Necesitas exportar los datos manualmente desde tu navegador.**

## 📝 Pasos para Exportar

### Paso 1: Acceder a la Plataforma

1. Abre tu navegador
2. Ve a: **https://neodatapu.appspot.com**
3. Inicia sesión con: **vargasmiguelangelc@gmail.com**

### Paso 2: Buscar Opción de Exportar

Desde la interfaz de "M-Consulta de Presupuesto":

**Opción A: Desde Menú "Catálogos"**
- Haz clic en "Catálogos" en la barra superior
- Busca "Exportar" o "Descargar"

**Opción B: Desde la Tabla**
- Ver todas las partidas (8,181)
- Buscar botón "Exportar" o "Copiar"
- Si hay "Copiar": copia toda la tabla y pega en Excel

**Opción C: Seleccionar y Copiar**
- Seleccionar toda la tabla (Ctrl+A)
- Copiar (Ctrl+C)
- Pegar en Excel (Ctrl+V)
- Guardar como CSV

### Paso 3: Guardar Archivo

Guardar como: `data/construbase-libre-2025.csv`

## 🔄 Alternativa: Script de Extracción (Si hay API)

Si CONSTRUBASE-LIBRE tiene una API, podría crear un script para acceder. Por ahora, necesitas exportar manualmente.

## 📞 Una Vez Tengas el Archivo

Ejecuta:

```bash
node scripts/import-tabulador.js data/construbase-libre-2025.csv --source construbase --location México
```

---

**Resumen**: Necesitas exportar manualmente desde la web, pero el script de importación está 100% listo.

