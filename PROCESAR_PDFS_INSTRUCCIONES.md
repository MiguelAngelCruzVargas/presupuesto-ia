# 📄 Instrucciones: Procesar PDFs del Tabulador CDMX

## 📁 Archivos Encontrados

En la carpeta `pdf de precios` encontré:

### PDFs del Tabulador CDMX:
- ✅ `tabulador-general-de-precios-unitarios-del-gobierno-de-la-ciudad-de-mexico-actualizacion-de-septiembre-20252pdf.pdf`
- ✅ `tabulador-general-de-precios-unitarios-del-gobierno-de-la-ciudad-de-mexico-enero-2025.pdf`
- ✅ `tabulador-general-de-precios-unitarios-del-gobierno-de-la-ciudad-de-mexico-febrero-de-2025-2.pdf`
- ✅ `tabulador-general-de-precios-unitarios-del-gobierno-de-la-ciudad-de-mexico-marzo-2025.pdf`

### Excel de Neodata (CONSTRUBASE):
- ✅ `precios neodata.xlsx` - **Este ya lo procesamos automáticamente**

## 🚀 Opciones para Extraer PDFs

### Opción 1: Script Python (Recomendado) ⭐

**Requisitos:**
```bash
pip install pdfplumber pandas
```

**Ejecutar:**
```bash
python scripts/extraer-pdf-cdmx.py
```

Este script:
- ✅ Extrae tablas de todos los PDFs automáticamente
- ✅ Limpia y normaliza los datos
- ✅ Genera CSV listo para importar

### Opción 2: Tabula (Herramienta Visual)

1. **Descargar Tabula**: https://tabula.technology/
2. **Abrir PDF** en Tabula
3. **Seleccionar tablas** con el cursor
4. **Exportar** como CSV
5. **Guardar** en `data/cdmx-tabulador-2025.csv`

### Opción 3: Adobe Acrobat

1. Abrir PDF en Adobe Acrobat
2. Herramientas → Exportar PDF
3. Seleccionar "Hoja de cálculo" → Excel o CSV
4. Guardar en `data/`

### Opción 4: Herramientas Online

1. Buscar "PDF to Excel converter" online
2. Subir PDF
3. Descargar CSV/Excel
4. Guardar en `data/`

## 📊 Procesar el Excel de Neodata (YA HECHO)

El Excel `precios neodata.xlsx` ya fue procesado automáticamente.

Si necesitas reprocesarlo:
```bash
node scripts/convertir-excel-neodata.js
```

## 🚀 Importar a la Plataforma

Una vez que tengas los CSVs:

### Importar CONSTRUBASE (Excel ya convertido):
```bash
node scripts/import-tabulador.js data/construbase-libre-2025.csv --source construbase --location México
```

### Importar Tabulador CDMX (después de extraer PDF):
```bash
# Usar el más reciente (marzo 2025)
node scripts/import-tabulador.js data/tabulador-general-...-marzo-2025.csv --source cdmx --location CDMX
```

## 💡 Recomendación

1. **Procesar Excel de Neodata** (ya hecho) ✅
2. **Extraer el PDF más reciente** (marzo 2025) usando Python o Tabula
3. **Importar ambos** a la plataforma

---

**¿Quieres que ejecute el script de Python para extraer los PDFs?** Solo necesitas tener Python y las librerías instaladas.

