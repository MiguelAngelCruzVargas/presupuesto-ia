# 🚀 Proceso Completo de Importación de Tabuladores

## 📋 Resumen del Proceso

Este documento describe el proceso completo para importar los tabuladores de precios (CDMX y CONSTRUBASE-LIBRE) a la plataforma.

## ✅ Estado Actual

### 1. Script de Importación
- ✅ **Creado**: `scripts/import-tabulador.js`
- ✅ **Documentación**: `scripts/README_IMPORTACION.md`
- ✅ **Soporte**: CDMX y CONSTRUBASE-LIBRE
- ✅ **Formato**: CSV y Excel

### 2. Integración en el Sistema
- ✅ **MarketPriceService**: Prioriza precios oficiales
- ✅ **AIBudgetService**: Usa precios del tabulador automáticamente
- ✅ **Año actual**: Sistema usa 2025 dinámicamente

### 3. Accesos Obtenidos
- ✅ **CONSTRUBASE-LIBRE**: Registrado (vargasmiguelangelc@gmail.com)
- ⏳ **CDMX Tabulador**: Necesita descarga del PDF

## 📥 Pasos para Completar la Importación

### Paso 1: Obtener Datos de CONSTRUBASE-LIBRE

1. **Acceder a la plataforma**:
   ```
   URL: https://neodatapu.appspot.com
   Usuario: vargasmiguelangelc@gmail.com
   ```

2. **Buscar opción de exportar**:
   - Navegar a "Catálogo" o "Precios Unitarios"
   - Buscar: "Exportar", "Descargar", "Exportar a Excel"
   - Descargar catálogo completo

3. **Guardar archivo**:
   ```bash
   # Guardar como:
   data/construbase-libre-2025.csv
   # o
   data/construbase-libre-2025.xlsx
   ```

### Paso 2: Obtener Datos del Tabulador CDMX

1. **Descargar PDF**:
   - URL: https://www.obras.cdmx.gob.mx/normas-tabulador/tabulador-general-de-precios-unitarios
   - Descargar edición más reciente (junio 2025)

2. **Convertir a CSV/Excel**:
   - Opción A: Usar Adobe Acrobat (exportar tabla)
   - Opción B: Usar Tabula (herramienta open source)
   - Opción C: Usar Python con pdfplumber o camelot

3. **Guardar archivo**:
   ```bash
   # Guardar como:
   data/cdmx-tabulador-2025.csv
   ```

### Paso 3: Verificar Formato de Archivos

Antes de importar, verificar que los archivos tengan:

**Columnas mínimas requeridas**:
- Descripción (o variantes: DESCRIPCION, Concepto, etc.)
- Unidad (o variantes: UNIDAD, U, UM)
- Precio (o variantes: Precio Unitario, Importe, Costo)

**Formato**:
- CSV con comas o punto y coma
- Excel (.xlsx o .xls)
- Primera fila = encabezados

### Paso 4: Crear Carpeta de Datos (Opcional)

```bash
mkdir -p data
```

### Paso 5: Importar CONSTRUBASE-LIBRE

```bash
# Desde la raíz del proyecto
node scripts/import-tabulador.js data/construbase-libre-2025.csv \
  --source construbase \
  --location México
```

**Ejemplo de salida esperada**:
```
📊 INICIANDO IMPORTACIÓN
════════════════════════════════════════════════════════════
📁 Archivo: construbase-libre-2025.csv
🔖 Fuente: CONSTRUBASE-LIBRE
📍 Ubicación: México
📅 Año: 2025
════════════════════════════════════════════════════════════

📖 Leyendo archivo...
   ✅ 5000 registros leídos

🔄 Procesando registros...
   ✅ 4950 precios válidos procesados
   ⚠️  50 registros con errores

💾 Importando a base de datos...
   Importados: 4950/4950 (C: 4950, U: 0, E: 0)

✅ IMPORTACIÓN COMPLETADA
════════════════════════════════════════════════════════════
✅ Creados:    4950
🔄 Actualizados: 0
❌ Errores:    0
📊 Total:      4950
════════════════════════════════════════════════════════════
```

### Paso 6: Importar Tabulador CDMX

```bash
node scripts/import-tabulador.js data/cdmx-tabulador-2025.csv \
  --source cdmx \
  --location CDMX
```

### Paso 7: Verificar Importación

1. **En Supabase**:
   - Ir a la tabla `market_price_reference`
   - Verificar que los registros estén ahí
   - Verificar `source = 'construbase_libre'` o `'cdmx_tabulador'`

2. **En la plataforma**:
   - Generar un presupuesto nuevo
   - Verificar que los precios sugeridos usen los tabuladores
   - Revisar que `calculation_basis` mencione la fuente

## 🔄 Proceso de Actualización

Cuando haya nuevas versiones de los tabuladores:

1. **Descargar nueva versión**
2. **Ejecutar script de importación** (actualiza automáticamente)
3. **Verificar cambios** en Supabase

## 📊 Estadísticas Esperadas

### CONSTRUBASE-LIBRE:
- **Estimado**: 5,000 - 10,000 conceptos
- **Categorías**: Todas (Materiales, Mano de Obra, etc.)
- **Cobertura**: Nacional (México)

### Tabulador CDMX:
- **Estimado**: 8,000+ conceptos (según imagen vista)
- **Categorías**: Todas
- **Cobertura**: CDMX (aplicable a todo México)

### Total Esperado:
- **Mínimo**: 13,000 precios de referencia
- **Máximo**: 18,000+ precios de referencia

## ⚙️ Configuración Requerida

### Variables de Entorno (.env)

Asegúrate de tener:
```env
VITE_SUPABASE_URL=tu_url_de_supabase
VITE_SUPABASE_ANON_KEY=tu_clave_anon
```

### Dependencias

Todas las dependencias ya están en `package.json`:
- ✅ `xlsx` - Para leer Excel
- ✅ `@supabase/supabase-js` - Para conectar a Supabase
- ✅ `dotenv` - Para variables de entorno

## 🎯 Resultado Final

Una vez completado el proceso:

1. ✅ Base de datos con miles de precios oficiales
2. ✅ Sistema usando automáticamente estos precios
3. ✅ Mayor precisión en presupuestos generados
4. ✅ Precios actualizados del año 2025
5. ✅ Fuentes oficiales confiables

## 🆘 Troubleshooting

### Error: "Archivo no encontrado"
- Verificar que la ruta al archivo sea correcta
- Usar ruta absoluta si es necesario

### Error: "Variables de entorno requeridas"
- Verificar archivo `.env` en la raíz del proyecto
- Verificar que tenga `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY`

### Error: "Formato no soportado"
- Verificar extensión del archivo (.csv, .xlsx, .xls)
- Abrir en Excel y guardar en formato correcto

### Precios no se importan
- Verificar que el archivo tenga las columnas requeridas
- Revisar el log de errores del script
- Verificar permisos en Supabase (RLS)

## 📞 Siguiente Paso Inmediato

1. **Acceder a CONSTRUBASE-LIBRE**:
   - Ir a: https://neodatapu.appspot.com
   - Iniciar sesión con: vargasmiguelangelc@gmail.com
   - Buscar opción de exportar catálogo

2. **Una vez tengas el archivo**, ejecutar:
   ```bash
   node scripts/import-tabulador.js <ruta-al-archivo> --source construbase --location México
   ```

---

**Estado**: ✅ Script listo - ⏳ Esperando archivos de datos
**Prioridad**: 🔥 Alta
**Tiempo estimado**: 30-60 minutos para obtener e importar ambos tabuladores

