# 📤 Cómo Usar la Opción de Exportar en CONSTRUBASE

## 🎯 Si Encontraste Opción de "Exportar"

### Paso 1: Ejecutar Exportación

1. **Haz clic** en la opción "Exportar" o "Descargar"
2. **Selecciona formato**:
   - Excel (.xlsx) - Recomendado
   - CSV (.csv) - También funciona
   - PDF - NO recomendado (difícil de procesar)

### Paso 2: Guardar el Archivo

1. **Guarda el archivo descargado** en la carpeta `data/`
2. **Renombra** si es necesario:
   - `data/construbase-libre-2025.csv`
   - `data/construbase-libre-2025.xlsx`

### Paso 3: Importar a la Plataforma

Una vez guardado, ejecuta:

```bash
# Si es CSV:
node scripts/import-tabulador.js data/construbase-libre-2025.csv --source construbase --location México

# Si es Excel:
node scripts/import-tabulador.js data/construbase-libre-2025.xlsx --source construbase --location México
```

## 🔍 Dónde Buscar la Opción de Exportar

### En la Web (neodatapu.appspot.com):

1. **Menú superior**:
   - "Catálogos" → "Exportar"
   - "Descargas" → "Catálogo"
   - "Archivo" → "Exportar"

2. **En la tabla del catálogo**:
   - Botón "Exportar" o "Descargar"
   - Menú contextual (clic derecho) → "Exportar"
   - Icono de descarga (↓) en la barra de herramientas

3. **Configuración/Filtros**:
   - A veces está junto a los filtros
   - O en la configuración de la tabla

### En el Software (Neodata PU Win+):

1. **Menú Archivo**:
   - Archivo → Exportar → Excel/CSV

2. **En el módulo de Catálogos**:
   - Botón "Exportar Catálogo"
   - Herramientas → Exportar

3. **Atajo de teclado**:
   - Ctrl+E (común para Exportar)

## ⚠️ Si Exportas y el Formato No Es Correcto

Si el archivo exportado no tiene el formato esperado, puedo ayudarte a:

1. **Convertir el formato**
2. **Ajustar columnas**
3. **Normalizar datos**

**Solo necesitas decirme qué formato tiene el archivo exportado.**

## ✅ Verificación del Archivo Exportado

El archivo debería tener estas columnas:

- ✅ Descripción (o "Descripción Completa")
- ✅ Unidad (M2, M, PZA, etc.)
- ✅ Precio (o "Precio Unitario", "Importe")

**Columnas adicionales útiles**:
- Partida (código)
- Renglón
- Categoría

---

**¿Encontraste la opción de exportar?** Si sí, descarga el archivo y luego ejecutamos el script de importación.

