# 🚀 Ejecutar Script de Importación

## ✅ Estado: TODO LISTO

El script de importación está completamente preparado y listo para usar.

## 📋 Pasos Rápidos

### 1. Obtener Archivos de Datos

**CONSTRUBASE-LIBRE:**
- ✅ Acceso: https://neodatapu.appspot.com
- ✅ Usuario: vargasmiguelangelc@gmail.com
- ⏳ **Acción**: Exportar catálogo completo
- ⏳ **Guardar como**: `data/construbase-libre-2025.csv` o `.xlsx`

**Tabulador CDMX:**
- ✅ URL: https://www.obras.cdmx.gob.mx/normas-tabulador/tabulador-general-de-precios-unitarios
- ⏳ **Acción**: Descargar PDF y convertir a CSV
- ⏳ **Guardar como**: `data/cdmx-tabulador-2025.csv`

### 2. Verificar Variables de Entorno

Asegúrate de tener `.env` con:
```env
VITE_SUPABASE_URL=tu_url
VITE_SUPABASE_ANON_KEY=tu_key
```

### 3. Ejecutar Importación

#### Importar CONSTRUBASE-LIBRE:
```bash
node scripts/import-tabulador.js data/construbase-libre-2025.csv \
  --source construbase \
  --location México
```

#### Importar Tabulador CDMX:
```bash
node scripts/import-tabulador.js data/cdmx-tabulador-2025.csv \
  --source cdmx \
  --location CDMX
```

## 📊 Resultado Esperado

Después de ejecutar verás:

```
📊 INICIANDO IMPORTACIÓN
════════════════════════════════════════════════════════════
📁 Archivo: construbase-libre-2025.csv
🔖 Fuente: CONSTRUBASE-LIBRE
📍 Ubicación: México
📅 Año: 2025
════════════════════════════════════════════════════════════

📖 Leyendo archivo...
   ✅ XXXX registros leídos

🔄 Procesando registros...
   ✅ XXXX precios válidos procesados

💾 Importando a base de datos...
   [Progreso en tiempo real...]

✅ IMPORTACIÓN COMPLETADA
════════════════════════════════════════════════════════════
✅ Creados:    XXXX
🔄 Actualizados: X
❌ Errores:    0
📊 Total:      XXXX
════════════════════════════════════════════════════════════
```

## ⚡ Ejecutar Ahora (Si ya tienes los archivos)

Si ya descargaste los archivos, puedes ejecutar inmediatamente:

```bash
# Primero CONSTRUBASE-LIBRE
node scripts/import-tabulador.js data/construbase-libre-2025.csv --source construbase --location México

# Luego CDMX (cuando lo tengas)
node scripts/import-tabulador.js data/cdmx-tabulador-2025.csv --source cdmx --location CDMX
```

## 📝 Notas

- El script valida y normaliza automáticamente
- Los duplicados se actualizan automáticamente
- Muestra progreso en tiempo real
- Genera reporte detallado al final

---

**¿Listo?** Una vez que tengas los archivos CSV/Excel, ejecuta los comandos arriba.

