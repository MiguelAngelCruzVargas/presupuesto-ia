# 🔧 Solución: RLS para Importación Masiva

## ❌ Problema Encontrado

El script de importación falla con error:
```
new row violates row-level security policy for table "market_price_reference"
```

**Causa**: Las políticas RLS requieren autenticación (`auth.uid() IS NOT NULL`), pero el script usa la clave anónima sin usuario autenticado.

## ✅ Soluciones Implementadas

### Opción 1: Usar Service Role Key (Recomendado) ⭐

**Ventaja**: Bypassa RLS completamente, perfecto para scripts de importación.

**Pasos**:

1. **Obtener Service Role Key**:
   - Ir a Supabase Dashboard → Settings → API
   - Copiar `service_role` key (⚠️ SECRETA, no exponer públicamente)

2. **Agregar al `.env`**:
   ```env
   VITE_SUPABASE_URL=tu_url
   VITE_SUPABASE_ANON_KEY=tu_anon_key
   VITE_SUPABASE_SERVICE_ROLE_KEY=tu_service_role_key  # ← Nueva línea
   ```

3. **El script automáticamente usará la service_role key** si está disponible

### Opción 2: Ajustar Políticas RLS (Alternativa)

**Para permitir inserción sin autenticación** (ya que los precios de referencia son datos públicos):

Ejecutar en Supabase SQL Editor:

```sql
-- Eliminar políticas restrictivas
DROP POLICY IF EXISTS "Authenticated users can insert market prices" ON market_price_reference;
DROP POLICY IF EXISTS "Authenticated users can update market prices" ON market_price_reference;

-- Crear políticas permisivas (datos públicos de referencia)
CREATE POLICY "Allow insert/update for market prices" ON market_price_reference
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow update for market prices" ON market_price_reference
    FOR UPDATE USING (true);
```

**O ejecutar el archivo SQL**:
```bash
# En Supabase SQL Editor, ejecutar:
supabase/fix_market_prices_rls.sql
```

## 🎯 Recomendación

**Usar Service Role Key** es la mejor opción porque:

1. ✅ No modifica las políticas de seguridad para usuarios normales
2. ✅ Es la forma estándar de hacer importaciones masivas
3. ✅ Mantiene la seguridad del sistema
4. ✅ Solo disponible en servidor/scripts (no en frontend)

## 🚀 Verificar que Funciona

Después de configurar, ejecutar:

```bash
node scripts/import-tabulador.js data/ejemplo-construbase.csv --source construbase --location México
```

Debería mostrar:
```
✅ Creados:    5
🔄 Actualizados: 0
❌ Errores:    0
```

## ⚠️ Seguridad

- **Service Role Key**: ⚠️ NUNCA exponer en el frontend
- **Solo usar en scripts**: Backend o scripts de servidor
- **Mantener secreto**: No commitear en git

---

**Estado**: ✅ Script actualizado para usar service_role key automáticamente

