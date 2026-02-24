# 📥 Guía: Exportar Datos de CONSTRUBASE-LIBRE (Neodata)

## 🎯 Objetivo

Obtener el catálogo completo de precios unitarios de CONSTRUBASE-LIBRE para importarlo a nuestra plataforma.

## 🔑 Credenciales

- **URL**: https://neodatapu.appspot.com
- **Usuario**: vargasmiguelangelc@gmail.com
- **Estado**: ✅ Registrado y activo

## 📋 Pasos para Exportar

### Paso 1: Acceder a CONSTRUBASE-LIBRE

1. Abrir navegador en: https://neodatapu.appspot.com
2. Iniciar sesión con: `vargasmiguelangelc@gmail.com`
3. Esperar a que cargue el dashboard/consulta de presupuesto

### Paso 2: Buscar Opción de Exportar

Desde la interfaz que vimos en la imagen ("M-Consulta de Presupuesto"):

**Opción A: Exportar Catálogo Directo**
- Buscar menú "Catálogos" en la barra superior
- Buscar opciones como:
  - "Exportar Catálogo"
  - "Descargar Catálogo"
  - "Exportar a Excel"
  - "Exportar a CSV"

**Opción B: Desde Consulta de Presupuesto**
- En la tabla de presupuesto que vimos (con 8181 partidas)
- Buscar botón "Exportar" o "Copiar"
- Si hay opción "Copiar", copiar todos los datos y pegarlos en Excel

**Opción C: Exportar por Partidas**
- Usar la función "Ver todas las partidas" (checkbox en la interfaz)
- Seleccionar todas (Ctrl+A si es posible)
- Copiar y pegar en Excel
- Guardar como CSV

### Paso 3: Guardar Archivo

1. **Si descargas directamente**:
   - Guardar como: `data/construbase-libre-2025.csv` o `.xlsx`

2. **Si copias y pegas**:
   - Pegar en Excel
   - Verificar columnas: Partida, Renglón, Código, Descripción Completa, Unidad, Cantidad, Precio, Importe
   - Guardar como CSV o Excel

### Paso 4: Verificar Formato

El archivo debe tener estas columnas (el script detecta variaciones):

**Requeridas**:
- ✅ Descripción (o "Descripción Completa")
- ✅ Unidad (M2, M, PZA, etc.)
- ✅ Precio (o "Importe", "Costo")

**Opcionales (mejoran la importación)**:
- Partida (código)
- Renglón (sub-código)
- Categoría

## 🔍 Formato Esperado

### Ejemplo de CSV:

```csv
Partida,Renglón,Descripción Completa,Unidad,Cantidad,Precio,Importe
A0101,10,"Trazo y nivelación manual para establecer ejes, banco de nivel y referencias",M2,1.0000,9.46,9.46
A0101,90,"Tapial de 2.00 m, de altura a base de lámina pintro y postes metálicos",M,1.0000,1003.37,1003.37
A0102,20,"Tala de árbol hasta de 10 cm de diámetro, Incluye: troceo",PZA,1.0000,173.71,173.71
```

### Si el formato es diferente:

El script es inteligente y detectará:
- "Descripción Completa" → lo usará como descripción
- "Precio" o "Importe" → lo usará como precio base
- "Unidad" → lo normalizará automáticamente

## 📊 Proceso Alternativo: Exportación Manual

Si no encuentras opción de exportar:

### Método 1: Copiar desde la Tabla

1. En la interfaz de CONSTRUBASE-LIBRE:
   - Ir a "Ver todas las partidas"
   - Seleccionar todas las filas (puede ser mucho, como 8181)
   - Copiar (Ctrl+C)

2. En Excel:
   - Pegar (Ctrl+V)
   - Verificar que todas las columnas se pegaron correctamente
   - Guardar como CSV

### Método 2: Exportar por Categorías

1. Filtrar por categoría (si hay opción)
2. Exportar cada categoría por separado
3. Combinar archivos después

## ✅ Checklist Pre-Importación

Antes de ejecutar el script, verificar:

- [ ] Archivo descargado/exportado
- [ ] Archivo tiene al menos 3 columnas: Descripción, Unidad, Precio
- [ ] Primera fila contiene encabezados
- [ ] Al menos 100 registros (para validar que sea el catálogo completo)
- [ ] Formato legible (CSV con comas/punto y coma o Excel)

## 🚀 Una vez Tengas el Archivo

Ejecutar:

```bash
# Desde la raíz del proyecto
node scripts/import-tabulador.js data/construbase-libre-2025.csv \
  --source construbase \
  --location México
```

O si está en Excel:

```bash
node scripts/import-tabulador.js data/construbase-libre-2025.xlsx \
  --source construbase \
  --location México
```

## 📝 Notas Especiales

### Desde la Imagen Vista:

La interfaz muestra:
- Tabla con 8181 partidas
- Columnas: Partida, Renglón, Código, Descripción Completa, Unidad, Cantidad, Precio, Importe
- Total: 8,181 registros disponibles

**Recomendación**:
1. Usar el botón "Copiar" si está disponible
2. O seleccionar todo (Ctrl+A) y copiar la tabla completa
3. Pegar en Excel y guardar como CSV

## 🔄 Actualizaciones

Cuando haya nuevas versiones:

1. Acceder nuevamente a CONSTRUBASE-LIBRE
2. Exportar nueva versión
3. Ejecutar script de importación (actualizará automáticamente)

---

**Próximo paso**: Acceder a https://neodatapu.appspot.com y buscar/exportar el catálogo completo.

