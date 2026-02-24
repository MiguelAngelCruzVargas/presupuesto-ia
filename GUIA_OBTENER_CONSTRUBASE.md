# 📥 Guía: Obtener Datos de CONSTRUBASE-LIBRE

## 🎯 Objetivo

Obtener los precios unitarios de CONSTRUBASE-LIBRE para importarlos a nuestra plataforma.

## 🔑 Accesos Obtenidos

- **Usuario**: vargasmiguelangelc@gmail.com
- **Plataforma**: Neodata S.A. de C.V. - CONSTRUBASE-LIBRE
- **Registro**: Completado exitosamente

## 📋 Pasos para Obtener los Datos

### Opción 1: Exportar desde la Web (Recomendado)

1. **Acceder a CONSTRUBASE-LIBRE**:
   - Ir a: https://neodatapu.appspot.com (o la URL específica de CONSTRUBASE-LIBRE)
   - Iniciar sesión con: `vargasmiguelangelc@gmail.com`

2. **Buscar opción de Exportar**:
   - Navegar a la sección de "Catálogo" o "Precios Unitarios"
   - Buscar opciones como:
     - "Exportar"
     - "Descargar"
     - "Exportar a Excel"
     - "Exportar a CSV"
     - "Generar Reporte"

3. **Exportar Catálogo Completo**:
   - Seleccionar "Exportar todo el catálogo" o "Catálogo completo"
   - Elegir formato: **Excel (.xlsx)** o **CSV (.csv)**
   - Descargar el archivo

### Opción 2: Exportar por Secciones

Si no hay exportación completa:

1. **Exportar por Categorías**:
   - Materiales
   - Mano de Obra
   - Obra Civil
   - Instalaciones
   - Equipos

2. **Combinar archivos**:
   - Descargar cada categoría por separado
   - El script puede procesar múltiples archivos

### Opción 3: Consulta de Presupuesto (Si aplica)

Si CONSTRUBASE tiene una función de "Consulta de Presupuesto":

1. Crear un presupuesto de prueba con todas las categorías
2. Exportar el presupuesto completo
3. El script puede extraer los precios del presupuesto

## 📊 Formato Esperado del Archivo

El script acepta archivos con estas columnas:

### Mínimo Requerido:
- **Descripción** (o "Descripción Completa", "Concepto")
- **Unidad** ("Unidad", "UM", "U")
- **Precio** ("Precio", "Precio Unitario", "Importe", "Costo")

### Opcionales (mejoran la importación):
- **Categoría** ("Categoría", "Clase")
- **Partida** (código de partida)
- **Renglón** (sub-código)

### Ejemplo de Estructura Esperada:

```csv
Descripción,Unidad,Precio,Categoría
Trazo y nivelación manual para establecer ejes,M2,9.46,Obra Civil
Tapial de 2.00 m de altura a base de lámina,M,1003.37,Obra Civil
Tala de árbol hasta de 10 cm de diámetro,PZA,173.71,Obra Civil
```

## 🔍 Verificación del Archivo

Antes de importar, verificar que el archivo tenga:

1. ✅ Encabezados en la primera fila
2. ✅ Al menos 3 columnas: Descripción, Unidad, Precio
3. ✅ Datos válidos (no solo encabezados)
4. ✅ Formato legible (CSV con comas o punto y coma, o Excel)

## 📝 Preparar el Archivo (Si es necesario)

Si el archivo exportado no tiene el formato correcto:

### Desde Excel:
1. Abrir el archivo en Excel
2. Verificar que las columnas estén en el orden correcto
3. Guardar como CSV o Excel

### Desde CSV:
1. Abrir en un editor de texto o Excel
2. Verificar separadores (comas o punto y coma)
3. Asegurar que no haya caracteres especiales que rompan el formato

## 🚀 Proceso de Importación

Una vez que tengas el archivo:

### Paso 1: Guardar el archivo
```bash
# Guardar en la carpeta del proyecto (opcional)
# Por ejemplo: data/construbase-libre-2025.csv
```

### Paso 2: Ejecutar el script
```bash
node scripts/import-tabulador.js data/construbase-libre-2025.csv --source construbase --location México
```

### Paso 3: Verificar resultados
- El script mostrará un reporte detallado
- Verificar en Supabase que los datos se importaron

## 🔗 URL de Acceso

**Plataforma Neodata CONSTRUBASE-LIBRE:**
- URL: https://neodatapu.appspot.com
- Usuario: vargasmiguelangelc@gmail.com
- Estado: ✅ Registrado

## ⚠️ Notas Importantes

1. **Año Actual**: El script automáticamente usa el año 2025
2. **Duplicados**: Si re-importas, los precios existentes se actualizarán
3. **Validación**: Solo se importan precios válidos (> 0)
4. **Metadata**: Se guarda información de la fuente (CONSTRUBASE-LIBRE, año, etc.)

## 🆘 Si No Encuentras Opción de Exportar

### Alternativa: Captura Manual de Datos

1. **Navegar por categorías** en CONSTRUBASE-LIBRE
2. **Copiar datos** manualmente (toma tiempo pero funciona)
3. **Pegar en Excel** siguiendo el formato esperado
4. **Guardar como CSV**
5. **Importar con el script**

### Alternativa: Contactar Soporte

- Contactar a Neodata para solicitar exportación masiva
- Explicar que necesitas el catálogo completo para integración

## 📞 Contacto Neodata

Si necesitas ayuda para obtener los datos:
- **Plataforma**: Neodata S.A. de C.V.
- **Usuario registrado**: vargasmiguelangelc@gmail.com
- Buscar opción de "Soporte" o "Contacto" en la plataforma

---

**Próximo paso**: Acceder a CONSTRUBASE-LIBRE y buscar la opción de exportar/descargar el catálogo completo.

