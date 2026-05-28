# 📚 Guía: Sistema de Precios Dinámicos

## ✅ ¿Qué acabamos de implementar?

Has creado un **sistema de dos capas de precios**:

1. **Catálogo del Usuario** (Ya existía)
   - Precios específicos de cada usuario
   - Prioridad máxima cuando existe

2. **Base de Precios de Referencia** (NUEVO)
   - Precios de mercado general
   - Se usa cuando NO hay coincidencia en el catálogo
   - Actualizable periódicamente

---

## 🚀 Pasos para activar el sistema

### Paso 1: Ejecutar la migración SQL

1. Ve a tu panel de Supabase
2. Ejecuta el archivo `supabase/migrations_market_prices.sql`
3. Esto creará la tabla `market_price_reference` con datos iniciales

**O desde la terminal:**
```bash
# Si tienes Supabase CLI instalado
supabase db push
```

**O manualmente:**
- Copia el contenido de `supabase/migrations_market_prices.sql`
- Pégalo en el SQL Editor de Supabase
- Ejecuta

### Paso 2: Verificar que funciona

El sistema ya está integrado automáticamente. Cuando generes un presupuesto con IA:

1. ✅ Primero buscará en el catálogo del usuario
2. ✅ Si no encuentra, buscará en la base de precios de referencia
3. ✅ Si tampoco encuentra, usará estimaciones de la IA

---

## 📊 Cómo funciona ahora

### Flujo de prioridad de precios:

```
Usuario pide: "Presupuesto para muro de block"

1. ¿Existe en catálogo del usuario?
   └─ SÍ → Usa precio del catálogo ✅
   └─ NO → Continúa

2. ¿Existe en base de precios de referencia?
   └─ SÍ → Usa precio de referencia para ${location} ✅
   └─ NO → Continúa

3. ¿Hay conceptos similares en catálogo?
   └─ SÍ → Calcula promedio y ajusta ✅
   └─ NO → Continúa

4. Genera precio con IA basado en estándares Neodata/CAPECO ✅
```

---

## 🔧 Cómo poblar más precios

### Opción 1: Manual (Desde Supabase)

```sql
INSERT INTO market_price_reference 
(description, unit, category, location, base_price, source)
VALUES 
('Nuevo concepto', 'm2', 'Obra Civil', 'México', 150.00, 'manual');
```

### Opción 2: Desde la aplicación (Futuro)

Puedes crear un componente admin para agregar precios, pero por ahora puedes usar:

```javascript
import { MarketPriceService } from './services/MarketPriceService';

// Agregar un precio
await MarketPriceService.upsertPrice({
    description: 'Nuevo concepto',
    unit: 'm2',
    category: 'Obra Civil',
    location: 'México',
    base_price: 150.00,
    source: 'manual'
});
```

### Opción 3: Importar desde Neodata (Si tienes acceso)

1. Descarga el catálogo de Neodata (Excel/CSV)
2. Crea un script de importación (puedo ayudarte con esto)
3. Ejecuta el script para poblar la base de datos

---

## 📈 Actualizar precios existentes

### Actualizar todos los precios de una categoría:

```javascript
import { MarketPriceService } from './services/MarketPriceService';

// Obtener precios actuales
const prices = await MarketPriceService.getPricesByCategory('Materiales', 'México');

// Actualizar cada uno
for (const price of prices) {
    await MarketPriceService.upsertPrice({
        ...price,
        base_price: newPrice, // Precio actualizado
        last_updated: new Date()
    });
}
```

### Actualizar por ubicación:

El sistema busca primero por ubicación específica, y si no encuentra, usa "México" como fallback.

Para agregar precios para CDMX:
```sql
INSERT INTO market_price_reference 
(description, unit, category, location, base_price, source)
SELECT 
    description, 
    unit, 
    category, 
    'CDMX', 
    base_price * 1.15, -- Ajuste del 15% para CDMX
    source || '_cdmx'
FROM market_price_reference 
WHERE location = 'México' AND is_active = true;
```

---

## 🎯 Próximos pasos recomendados

### 1. **Poblar más datos iniciales**
   - Agregar más conceptos comunes de construcción
   - Agregar precios para diferentes ubicaciones (CDMX, Monterrey, etc.)

### 2. **Crear componente de administración** (Opcional)
   - Panel para agregar/editar precios de referencia
   - Importar desde CSV/Excel
   - Actualización masiva de precios

### 3. **Integrar con Neodata** (Si es posible)
   - Investigar si Neodata tiene API
   - Crear script de sincronización periódica
   - Actualizar precios automáticamente cada mes

### 4. **Mejorar búsqueda**
   - Implementar búsqueda semántica más avanzada
   - Ajustar precios por inflación automáticamente
   - Agregar factores de ajuste por región

---

## 🔍 Verificar que está funcionando

### Test 1: Ver precios en la base de datos

```sql
-- Ver cuántos precios tienes
SELECT category, COUNT(*) as total
FROM market_price_reference
WHERE is_active = true
GROUP BY category;
```

### Test 2: Buscar un precio específico

```javascript
import { MarketPriceService } from './services/MarketPriceService';

const prices = await MarketPriceService.findReferencePrice(
    'muro de block',
    'Obra Civil',
    'México'
);

console.log('Precios encontrados:', prices);
```

### Test 3: Generar presupuesto con IA

1. Ve al Dashboard
2. Usa el generador de IA
3. Pide algo que NO esté en tu catálogo
4. Verifica que use precios de referencia

---

## ❓ Preguntas frecuentes

### ¿Necesito tener suscripción a Neodata?

**No necesariamente**. Puedes:
- Empezar con precios manuales
- Usar datos públicos de construcción
- Actualizar periódicamente según necesites

### ¿Los precios se actualizan solos?

**No automáticamente**. Por ahora necesitas actualizarlos manualmente o con scripts. En el futuro podrías:
- Crear un job que actualice mensualmente
- Integrar con API de Neodata (si existe)
- Permitir a usuarios colaborar con precios

### ¿Puedo tener precios por ciudad?

**Sí**. El campo `location` puede ser cualquier ciudad. El sistema busca primero la ubicación específica, y si no encuentra, usa "México" como fallback.

### ¿Qué pasa si no hay precio de referencia?

El sistema usa la IA con estándares Neodata/CAPECO para estimar el precio, igual que antes.

---

## 💡 Recomendación final

**Para empezar:**
1. ✅ Ejecuta la migración SQL (ya tienes datos iniciales)
2. ✅ Prueba generar un presupuesto con IA
3. ✅ Agrega más precios conforme los necesites

**Para producción:**
- Pobla la base con 200-500 conceptos comunes
- Agrega precios para 5-10 ciudades principales
- Actualiza mensualmente o trimestralmente

¿Necesitas ayuda para poblar más datos o crear algún script de importación?

