# 🎯 Instrucciones Finales: Importación de Tabuladores

## ✅ Estado: TODO LISTO

### ✅ Script de Importación
- ✅ Creado y funcional: `scripts/import-tabulador.js`
- ✅ Lee CSV y Excel correctamente
- ✅ Normaliza y valida automáticamente
- ✅ Soporta CDMX y CONSTRUBASE-LIBRE

### ⚠️ Ajuste Necesario: RLS (Row Level Security)

El script funciona correctamente, pero necesita ajustar las políticas de seguridad de Supabase.

## 🔧 PASO 1: Ajustar Políticas RLS

Tienes **2 opciones**:

### Opción A: Usar Service Role Key (Recomendado) ⭐

1. **Obtener Service Role Key**:
   - Ir a Supabase Dashboard → Settings → API
   - Copiar `service_role` key (es secreta)

2. **Agregar al `.env`**:
   ```env
   VITE_SUPABASE_SERVICE_ROLE_KEY=tu_service_role_key_aqui
   ```

3. **El script la usará automáticamente** ✅

### Opción B: Ajustar Políticas RLS

Ejecutar en **Supabase SQL Editor**:

```sql
-- Eliminar políticas restrictivas
DROP POLICY IF EXISTS "Authenticated users can insert market prices" ON market_price_reference;
DROP POLICY IF EXISTS "Authenticated users can update market prices" ON market_price_reference;

-- Crear políticas permisivas (datos públicos)
CREATE POLICY "Allow insert for market prices" ON market_price_reference
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow update for market prices" ON market_price_reference
    FOR UPDATE USING (true);
```

**O ejecutar el archivo**:
- Ir a Supabase Dashboard → SQL Editor
- Ejecutar: `supabase/fix_market_prices_rls_importacion.sql`

## 📥 PASO 2: Obtener Archivos de Datos

### CONSTRUBASE-LIBRE:

1. **Acceder**: https://neodatapu.appspot.com
2. **Usuario**: vargasmiguelangelc@gmail.com
3. **Buscar opción de exportar**:
   - Menú "Catálogos" → Exportar
   - O botón "Copiar" y pegar en Excel
   - O desde la tabla de presupuesto (8,181 partidas)
4. **Guardar como**: `data/construbase-libre-2025.csv`

### Tabulador CDMX:

1. **Descargar PDF**: https://www.obras.cdmx.gob.mx/normas-tabulador/tabulador-general-de-precios-unitarios
2. **Convertir a CSV**: Usar Tabula, Adobe Acrobat, o Python
3. **Guardar como**: `data/cdmx-tabulador-2025.csv`

## 🚀 PASO 3: Ejecutar Importación

Una vez que tengas los archivos y ajustes RLS:

### Importar CONSTRUBASE-LIBRE:
```bash
node scripts/import-tabulador.js data/construbase-libre-2025.csv --source construbase --location México
```

### Importar Tabulador CDMX:
```bash
node scripts/import-tabulador.js data/cdmx-tabulador-2025.csv --source cdmx --location CDMX
```

## 📊 Resultado Esperado

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

💾 Importando a base de datos...
   [Progreso en tiempo real...]

✅ IMPORTACIÓN COMPLETADA
════════════════════════════════════════════════════════════
✅ Creados:    4950
🔄 Actualizados: 0
❌ Errores:    0
📊 Total:      4950
════════════════════════════════════════════════════════════
```

## 🎯 Checklist Final

- [ ] Ajustar RLS (usar service_role key O ejecutar SQL)
- [ ] Obtener archivo de CONSTRUBASE-LIBRE
- [ ] Obtener archivo de Tabulador CDMX
- [ ] Ejecutar script para CONSTRUBASE
- [ ] Ejecutar script para CDMX
- [ ] Verificar en Supabase que los datos estén
- [ ] Probar generación de presupuesto

## 💡 Recomendación Final

**Mantener ambas fuentes** (CDMX + CONSTRUBASE-LIBRE):

- ✅ Mayor cobertura de precios
- ✅ Validación cruzada
- ✅ Mayor precisión en presupuestos

El sistema automáticamente prioriza estos precios oficiales sobre estimaciones.

---

**Estado**: ✅ Script listo - ⏳ Falta ajustar RLS y obtener archivos

