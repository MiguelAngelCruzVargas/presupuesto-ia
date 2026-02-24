# 💰 Propuesta: Sistema de Precios Dinámicos

## 🎯 El Problema Actual

**Catálogo del Usuario**:
- Cada usuario tiene su propio catálogo personal
- Los precios son específicos del usuario
- Se actualiza manualmente
- ✅ Perfecto para precios de contratistas/empresas
- ❌ No sirve como referencia de mercado general

**Precios Dinámicos** (lo que necesitas):
- Base de datos de precios de referencia de mercado
- Se actualiza periódicamente (mensual, trimestral)
- Útil cuando el usuario NO tiene un concepto en su catálogo
- ✅ Referencia objetiva del mercado
- ✅ Basado en Neodata, CAPECO, CMIC, etc.

---

## 💡 Solución Propuesta: **Dos Capas de Precios**

### Capa 1: Catálogo del Usuario (Ya existe)
- Precios específicos del usuario
- Prioridad máxima cuando existe

### Capa 2: Base de Precios de Referencia (Nueva)
- Precios de mercado general
- Se usa cuando NO hay coincidencia en el catálogo
- Se actualiza automáticamente o semiautomáticamente

---

## 🏗️ Arquitectura Propuesta

### Opción 1: **Tabla en Supabase** (Recomendada - Más simple)

```sql
CREATE TABLE market_price_reference (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  description TEXT NOT NULL,
  unit VARCHAR(20) NOT NULL,
  category VARCHAR(50) NOT NULL,
  location VARCHAR(100) DEFAULT 'México',
  base_price DECIMAL(10,2) NOT NULL,
  price_range JSONB, -- {min: 100, max: 150}
  source VARCHAR(50), -- 'neodata', 'capeco', 'cmic'
  last_updated TIMESTAMP DEFAULT NOW(),
  is_active BOOLEAN DEFAULT true,
  metadata JSONB, -- Información adicional
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Índices para búsqueda rápida
CREATE INDEX idx_market_prices_category ON market_price_reference(category);
CREATE INDEX idx_market_prices_location ON market_price_reference(location);
CREATE INDEX idx_market_prices_description ON market_price_reference USING gin(to_tsvector('spanish', description));
```

**Ventajas**:
- ✅ Control total sobre los datos
- ✅ Rápido y eficiente
- ✅ No depende de APIs externas
- ✅ Puedes poblar con datos de Neodata manualmente

**Desventajas**:
- ⚠️ Requiere mantenimiento manual o semiautomático
- ⚠️ Necesitas importar datos de Neodata periódicamente

---

### Opción 2: **Integración con Neodata API** (Si existe)

Si Neodata tiene API pública o privada, podrías consultarla en tiempo real.

**Ventajas**:
- ✅ Precios siempre actualizados
- ✅ No necesitas mantener base de datos

**Desventajas**:
- ❌ Dependes de disponibilidad de API
- ❌ Puede tener costos
- ❌ Rate limiting

---

### Opción 3: **Híbrida** (La mejor para producción)

1. **Tabla de referencia** con precios comunes pre-cargados
2. **Cache** en memoria para búsquedas frecuentes
3. **Actualización periódica** con script o manual
4. **Fallback a IA** si no hay coincidencia

---

## 🚀 Implementación Recomendada (Opción 1 - Híbrida)

### Paso 1: Crear tabla en Supabase

### Paso 2: Crear servicio `MarketPriceService.js`

```javascript
export class MarketPriceService {
  // Buscar precio de referencia por descripción/categoría
  static async findReferencePrice(description, category, location = 'México') {
    // Buscar en base de datos
    // Si no encuentra, usar IA para estimar basado en estándares
  }

  // Actualizar precios desde fuente externa (Neodata, etc.)
  static async updatePricesFromSource(source = 'neodata') {
    // Lógica de importación
  }

  // Obtener precios por categoría y ubicación
  static async getPricesByCategory(category, location) {
    // Retornar array de precios de referencia
  }
}
```

### Paso 3: Integrar en `AIBudgetService.js`

```javascript
// En generateBudgetFromPrompt:
const referencePrices = await MarketPriceService.findReferencePrice(...);
const config = {
  basePrices: referencePrices,
  location: projectInfo.location
};
```

### Paso 4: Poblar datos iniciales

Opción A: **Importar desde Neodata manualmente**
- Descargar catálogo de Neodata (Excel, CSV)
- Crear script de importación

Opción B: **Generar datos iniciales con IA**
- Usar IA para generar precios de referencia comunes
- Validar y ajustar manualmente

---

## 📊 Flujo de Prioridad de Precios

```
1. ¿Existe en catálogo del usuario?
   └─ SÍ → Usar precio del catálogo del usuario ✅
   └─ NO → Continuar

2. ¿Existe en base de precios de referencia?
   └─ SÍ → Usar precio de referencia con ajuste por ubicación ✅
   └─ NO → Continuar

3. ¿Hay conceptos similares en catálogo?
   └─ SÍ → Calcular promedio y ajustar ✅
   └─ NO → Continuar

4. Generar precio con IA basado en estándares Neodata/CAPECO
   └─ Usar prompt con referencia a metodologías ✅
```

---

## 🔄 Actualización de Precios

### Estrategia de Actualización:

**Opción 1: Manual (Recomendado para empezar)**
- Botón en admin: "Actualizar Precios de Referencia"
- Subir CSV/Excel con datos de Neodata
- Procesar y actualizar base de datos

**Opción 2: Semiautomática**
- Script que corre mensualmente
- Consulta fuentes públicas
- Requiere validación manual

**Opción 3: Automática** (Futuro)
- API que consulta Neodata/CAPECO
- Actualización automática cada mes
- Requiere suscripción/API key

---

## 📝 Datos Iniciales Sugeridos

Puedes empezar con precios comunes de construcción:

### Categorías prioritarias:
1. **Materiales básicos** (cemento, varilla, block, etc.)
2. **Mano de obra** (jornales por especialidad)
3. **Obra civil** (excavación, mampostería, concreto)
4. **Instalaciones** (eléctrica, hidráulica, sanitaria)

### Precios por ubicación:
- México (general)
- CDMX
- Monterrey
- Guadalajara
- Otras ciudades principales

---

## 🎯 Recomendación Final

**Para empezar (MVP)**:
1. ✅ Crear tabla `market_price_reference` en Supabase
2. ✅ Crear servicio `MarketPriceService`
3. ✅ Integrar en `AIBudgetService` con prioridad correcta
4. ✅ Poblar con 100-200 precios comunes (manual o con IA)
5. ✅ Botón "Actualizar Precios" para admin

**Para producción**:
- Integrar actualización periódica
- Añadir más ubicaciones
- Considerar suscripción a Neodata para datos oficiales

---

## ❓ ¿Neodata tiene API?

**Necesitas investigar**:
- ¿Neodata ofrece API pública/privada?
- ¿Cuál es el costo?
- ¿Qué formato de datos usan?
- ¿Con qué frecuencia actualizan?

**Alternativas si no hay API**:
- Importar CSV/Excel manualmente
- Web scraping (con permisos)
- Datos de CMIC (Cámara Mexicana de la Industria de la Construcción)
- CAPECO (Catálogo de Precios de Construcción)

---

## 🚦 Próximos Pasos

1. **Decidir**: ¿Tabla propia o API externa?
2. **Crear**: Migración SQL para tabla de precios
3. **Implementar**: `MarketPriceService`
4. **Integrar**: En `AIBudgetService`
5. **Poblar**: Datos iniciales
6. **Probar**: Flujo completo

¿Te ayudo a implementar alguna de estas opciones?

