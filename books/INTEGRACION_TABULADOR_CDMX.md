# Integración del Tabulador Oficial de Precios Unitarios de CDMX

## 🎯 Objetivo

Integrar el **Tabulador General de Precios Unitarios del Gobierno de la Ciudad de México** como fuente oficial de precios de referencia para mejorar la precisión del sistema.

## 📋 Información del Recurso

**URL:** https://www.obras.cdmx.gob.mx/normas-tabulador/tabulador-general-de-precios-unitarios

**Características:**
- ✅ **Oficial**: Gobierno de la CDMX
- ✅ **Actualizado**: Edición 2025 disponible
- ✅ **Actualizaciones mensuales**: Se actualiza periódicamente
- ✅ **Completo**: Miles de conceptos de construcción
- ✅ **Estándar mexicano**: Aplicable a todo México

**Documento principal:**
- PDF del tabulador (actualización de junio 2025 disponible)
- Incluye: Partida, Descripción, Unidad, Precio Unitario
- Categorías: Materiales, Mano de Obra, Obra Civil, Instalaciones, Equipos, etc.

## 🏗️ Arquitectura de Integración

### 1. Estructura de Datos

El tabulador se almacenará en la tabla `market_price_reference` existente con:

```sql
-- Campos relevantes del tabulador CDMX
source = 'cdmx_tabulador'
location = 'CDMX' (o la ubicación específica)
metadata = {
  "year": 2025,
  "month": "junio",
  "edition": "2025",
  "official": true,
  "partida": "A0101",  -- Código de partida si existe
  "tabulador_version": "junio-2025"
}
```

### 2. Proceso de Importación

#### Opción A: Importación Manual (Inicial)
1. Descargar PDF del tabulador
2. Convertir a Excel/CSV (herramientas de OCR o extracción)
3. Procesar y normalizar datos
4. Importar a base de datos usando script

#### Opción B: Importación Automática (Futuro)
1. Script que descarga el PDF mensualmente
2. Extrae datos usando OCR/parsing
3. Normaliza y valida datos
4. Actualiza base de datos automáticamente

### 3. Estructura del Tabulador CDMX

Basado en la imagen proporcionada, el tabulador incluye:

- **Partida**: Código (ej: A0101)
- **Renglón**: Sub-código (ej: 10, 20, 30)
- **Código**: Código completo (ej: 301-PRE-01-...)
- **Descripción Completa**: Descripción detallada del concepto
- **Unidad**: M2, M, MES, PZA, etc.
- **Cantidad**: Generalmente 1.0000
- **Precio**: Precio unitario
- **Importe**: Total (Cantidad × Precio)
- **Costo**: Costo directo

## 📊 Plan de Implementación

### Fase 1: Preparación de Datos

1. **Descargar tabulador actual**
   ```bash
   # URL del PDF: https://obras.cdmx.gob.mx/storage/app/media/...
   # Edición junio 2025
   ```

2. **Convertir a formato procesable**
   - PDF → Excel/CSV
   - Herramientas sugeridas:
     - Adobe Acrobat (exportar tabla)
     - Tabula (herramienta open source)
     - Python + pdfplumber o camelot

3. **Estructura CSV esperada:**
   ```csv
   partida,renglon,codigo,descripcion,unidad,precio,importe,costo
   A0101,10,301-PRE-01-...,"Trazo y nivelación...",M2,9.46,9.46,9.46
   A0101,90,301-PRE-02-...,"Tapial de 2.00 m...",M,1003.37,1003.37,1003.37
   ```

### Fase 2: Script de Importación

Crear script para importar datos:

```javascript
// scripts/import-cdmx-tabulador.js
import { MarketPriceService } from '../src/services/MarketPriceService.js';
import fs from 'fs';
import csv from 'csv-parse/sync';

async function importCDMXTabulador(csvFilePath) {
    const fileContent = fs.readFileSync(csvFilePath, 'utf-8');
    const records = csv.parse(fileContent, {
        columns: true,
        skip_empty_lines: true
    });

    let imported = 0;
    let errors = 0;

    for (const record of records) {
        try {
            // Mapear categorías del tabulador a nuestras categorías
            const category = mapCategory(record.descripcion);
            
            // Crear precio de referencia
            await MarketPriceService.upsertPrice({
                description: record.descripcion.trim(),
                unit: normalizeUnit(record.unidad),
                category: category,
                location: 'CDMX',
                base_price: parseFloat(record.precio),
                price_range: {
                    min: parseFloat(record.precio) * 0.95,
                    max: parseFloat(record.precio) * 1.05,
                    avg: parseFloat(record.precio)
                },
                source: 'cdmx_tabulador',
                metadata: {
                    year: 2025,
                    month: 'junio',
                    edition: '2025',
                    official: true,
                    partida: record.partida,
                    codigo: record.codigo,
                    renglon: record.renglon,
                    tabulador_version: 'junio-2025'
                }
            });
            
            imported++;
        } catch (error) {
            console.error(`Error importing record: ${record.descripcion}`, error);
            errors++;
        }
    }

    console.log(`✅ Importados: ${imported} precios`);
    console.log(`❌ Errores: ${errors}`);
}

// Mapear descripción a categoría
function mapCategory(description) {
    const desc = description.toLowerCase();
    
    if (desc.includes('oficial') || desc.includes('ayudante') || desc.includes('jornal')) {
        return 'Mano de Obra';
    }
    if (desc.includes('excavación') || desc.includes('cimentación') || desc.includes('mampostería')) {
        return 'Obra Civil';
    }
    if (desc.includes('eléctric') || desc.includes('hidráulic') || desc.includes('plomería')) {
        return 'Instalaciones';
    }
    if (desc.includes('revolvedora') || desc.includes('vibrador') || desc.includes('equipo')) {
        return 'Equipos';
    }
    
    return 'Materiales'; // Por defecto
}

// Normalizar unidades
function normalizeUnit(unit) {
    const units = {
        'M2': 'm2',
        'M': 'm',
        'M3': 'm3',
        'PZA': 'pza',
        'MES': 'mes',
        'JOR': 'jor',
        'HR': 'hora',
        // ... más mapeos
    };
    return units[unit.toUpperCase()] || unit.toLowerCase();
}

export default importCDMXTabulador;
```

### Fase 3: Actualización Automática

Crear script para mantener actualizado:

```javascript
// scripts/update-cdmx-tabulador.js
import fetch from 'node-fetch';
import { importCDMXTabulador } from './import-cdmx-tabulador.js';

/**
 * Verifica si hay una nueva versión del tabulador disponible
 * y lo actualiza si es necesario
 */
async function checkAndUpdateTabulador() {
    const TABULADOR_URL = 'https://www.obras.cdmx.gob.mx/normas-tabulador/tabulador-general-de-precios-unitarios';
    
    // 1. Verificar última versión disponible
    const lastUpdate = await getLastUpdateDate();
    
    // 2. Descargar PDF si hay nueva versión
    // 3. Convertir a CSV
    // 4. Importar a base de datos
    
    console.log('Tabulador actualizado exitosamente');
}

// Ejecutar mensualmente
```

## 🔧 Integración con el Sistema Actual

### 1. Priorizar Precios CDMX

Modificar `AIBudgetService` para priorizar precios de CDMX:

```javascript
// En AIBudgetService.js

// Prioridad de precios:
// 1. Catálogo del usuario
// 2. Tabulador CDMX (source = 'cdmx_tabulador')
// 3. Otros precios de mercado
// 4. Estimaciones de IA
```

### 2. Mejorar MarketPriceService

Agregar método específico para CDMX:

```javascript
// En MarketPriceService.js

/**
 * Buscar precios en el tabulador oficial de CDMX
 * @param {string} description - Descripción del concepto
 * @param {string} category - Categoría
 * @returns {Promise<Array>} - Precios del tabulador CDMX
 */
static async findCDMXPrice(description, category) {
    return await this.findReferencePrice(
        description,
        category,
        'CDMX',
        10
    ).then(results => 
        results.filter(r => r.source === 'cdmx_tabulador')
    );
}
```

### 3. Actualizar Prompts de IA

En `AIBudgetService.generateBudgetFromPrompt()`:

```javascript
// Si hay precios de CDMX disponibles, mencionarlos en el prompt
const cdmxPrices = await MarketPriceService.findCDMXPrice(description, category);
if (cdmxPrices.length > 0) {
    systemPrompt += `\n\nPRECIOS OFICIALES CDMX (Referencia Gubernamental):\n${JSON.stringify(cdmxPrices)}\n\nPRIORIZA estos precios oficiales sobre estimaciones generales.`;
}
```

## 📈 Beneficios Esperados

### Precisión
- **Antes**: 60-75% (sin catálogo)
- **Después**: 85-95% (con tabulador CDMX)

### Confiabilidad
- ✅ Precios oficiales del gobierno
- ✅ Actualizaciones regulares
- ✅ Estándar de la industria mexicana
- ✅ Miles de conceptos cubiertos

### Ventaja Competitiva
- ✅ Única plataforma con tabulador oficial integrado
- ✅ Precios actualizados automáticamente
- ✅ Referencia confiable para usuarios

## 🚀 Próximos Pasos

### Inmediato:
1. ✅ Descargar PDF del tabulador (junio 2025)
2. ✅ Convertir a CSV/Excel
3. ✅ Crear script de importación
4. ✅ Importar primera versión (prueba con 100 conceptos)

### Corto Plazo (1-2 semanas):
1. ✅ Completar importación total
2. ✅ Probar integración con IA
3. ✅ Validar precios generados
4. ✅ Documentar proceso

### Mediano Plazo (1-2 meses):
1. 🔄 Automatizar descarga mensual
2. 🔄 Script de actualización automática
3. 🔄 Dashboard de estadísticas de precios
4. 🔄 Sistema de notificaciones de actualizaciones

## 📝 Notas Técnicas

### Desafíos Potenciales:

1. **Formato del PDF**: Puede requerir OCR o extracción manual
2. **Estructura variable**: El formato puede cambiar entre ediciones
3. **Volumen de datos**: Miles de registros requieren procesamiento eficiente
4. **Actualizaciones**: Necesita mantenimiento mensual

### Soluciones:

1. **Parsing robusto**: Manejar diferentes formatos de tabla
2. **Validación**: Verificar integridad de datos antes de importar
3. **Indexación**: Índices en base de datos para búsquedas rápidas
4. **Automatización**: Scripts para minimizar trabajo manual

## 🔗 Recursos

- **URL Oficial**: https://www.obras.cdmx.gob.mx/normas-tabulador/tabulador-general-de-precios-unitarios
- **PDF Directo**: https://obras.cdmx.gob.mx/storage/app/media/Tabulador%20General%20de%20Precios%20Unitarios%20del%20Gobierno%20de%20la%20Ciudad%20de%20Mexico%20de%20Junio%202025/tabulador-general-de-precios-unitarios-del-gobierno-de-la-ciudad-de-mexico-actualizacion-de-junio-2025.pdf
- **Actualizaciones**: Mensuales (verificar página oficial)

---

**Estado**: 📋 Planificado  
**Prioridad**: 🔥 Alta  
**Impacto**: ⭐⭐⭐⭐⭐ Muy Alto  
**Esfuerzo**: 🟡 Medio (primera importación), 🟢 Bajo (actualizaciones)

