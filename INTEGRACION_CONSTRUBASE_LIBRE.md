# Integración de CONSTRUBASE-LIBRE

## 🎯 Objetivo

Agregar **CONSTRUBASE-LIBRE** como fuente adicional de precios de referencia para complementar el Tabulador Oficial CDMX.

## 📋 Información sobre CONSTRUBASE-LIBRE

**Referencias encontradas:**
- En la imagen del tabulador aparece: "CONSTRUBASE-LIBRE"
- Parece ser un sistema/tabulador de precios unitarios de construcción mexicano
- Similar al Tabulador CDMX pero con cobertura más amplia

**Características:**
- ✅ Catálogo completo de conceptos de obra
- ✅ Precios unitarios actualizados
- ✅ Estándar de la industria mexicana
- ✅ Metodología similar a NEODATA/OPUS

## 🏗️ Arquitectura de Integración

### 1. Agregar como Fuente en `market_price_reference`

```sql
-- En la tabla market_price_reference, agregar:
source = 'construbase_libre'
metadata = {
  "year": 2025,
  "version": "CONSTRUBASE-LIBRE",
  "official": true,
  "methodology": "NEODATA/CONSTRUBASE"
}
```

### 2. Actualizar `MarketPriceService`

Agregar `construbase_libre` como fuente oficial adicional:

```javascript
const officialSources = ['cdmx_tabulador', 'construbase_libre'];
```

### 3. Prioridad de Fuentes

1. **Catálogo del usuario** - Máxima prioridad
2. **Tabulador Oficial CDMX** - Segunda prioridad
3. **CONSTRUBASE-LIBRE** - Tercera prioridad (nuevo)
4. **Otros precios de referencia**
5. **Estimaciones IA** - Último recurso

## 📊 Beneficios

### Complementariedad

- ✅ CDMX cubre principalmente Ciudad de México
- ✅ CONSTRUBASE-LIBRE cubre todo México
- ✅ Juntos proporcionan cobertura nacional completa

### Precisión Mejorada

- ✅ Más opciones de precios para cada concepto
- ✅ Comparación entre fuentes oficiales
- ✅ Validación cruzada de precios

### Actualizaciones

- ✅ Dos fuentes oficiales actualizadas
- ✅ Mayor probabilidad de tener precios recientes
- ✅ Cobertura de diferentes metodologías

## 🔧 Implementación

### Paso 1: Actualizar `MarketPriceService.js`

```javascript
static async findReferencePrice(description, category, location = 'México', limit = 5) {
    // Agregar construbase_libre como fuente oficial
    const officialSources = ['cdmx_tabulador', 'construbase_libre'];
    // ... resto del código
}
```

### Paso 2: Actualizar `AIBudgetService.js`

En los prompts del sistema, mencionar CONSTRUBASE-LIBRE:

```javascript
b) Tabulador Oficial CDMX o CONSTRUBASE-LIBRE (precios oficiales) - SEGUNDA PRIORIDAD
```

### Paso 3: Importar Datos

1. Obtener catálogo de CONSTRUBASE-LIBRE
2. Convertir a formato compatible
3. Importar a `market_price_reference` con `source = 'construbase_libre'`

## 📝 Notas Técnicas

### Formato Esperado

```json
{
  "description": "Descripción del concepto",
  "unit": "m2",
  "category": "Obra Civil",
  "location": "México",
  "base_price": 420.00,
  "source": "construbase_libre",
  "metadata": {
    "year": 2025,
    "version": "CONSTRUBASE-LIBRE",
    "official": true
  }
}
```

### Priorización

- Precios oficiales (CDMX + CONSTRUBASE) tienen +10 puntos de bonificación
- Ambos se consideran igualmente confiables
- Si hay ambos, se promedian o se usa el más reciente

## 🚀 Estado

**Estado**: 📋 Planificado  
**Prioridad**: 🔥 Alta  
**Impacto**: ⭐⭐⭐⭐ Alto  

---

**Próximo paso**: Obtener acceso a catálogo CONSTRUBASE-LIBRE y comenzar importación.

