#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Script para extraer datos del Tabulador CDMX desde PDFs

Requisitos:
    pip install pdfplumber pandas

Uso:
    python scripts/extraer-pdf-cdmx.py
"""

import os
import sys
import io

# Configurar codificación UTF-8 para Windows
if sys.platform == 'win32':
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')

import pdfplumber
import pandas as pd
from pathlib import Path

def extraer_tabla_desde_pdf(pdf_path):
    """Extraer tabla desde un PDF"""
    print(f"\n📄 Procesando: {Path(pdf_path).name}")
    
    datos_extraidos = []
    
    try:
        with pdfplumber.open(pdf_path) as pdf:
            total_paginas = len(pdf.pages)
            print(f"   📊 Total de páginas: {total_paginas}")
            
            for num_pagina, pagina in enumerate(pdf.pages, 1):
                # Intentar extraer tablas
                tablas = pagina.extract_tables()
                
                if tablas:
                    for tabla_idx, tabla in enumerate(tablas):
                        if tabla and len(tabla) > 1:  # Al menos encabezado + 1 fila
                            # Agregar todas las filas excepto si es encabezado duplicado
                            for fila_idx, fila in enumerate(tabla):
                                if fila and len([c for c in fila if c]) >= 3:  # Al menos 3 columnas con datos
                                    datos_extraidos.append(fila)
                            
                            print(f"   ✅ Página {num_pagina}: {len(tabla)} filas extraídas")
                else:
                    # Si no hay tablas, intentar extraer texto estructurado
                    texto = pagina.extract_text()
                    if texto and "Partida" in texto or "Precio" in texto:
                        print(f"   ⚠️  Página {num_pagina}: Solo texto (sin tablas detectadas)")
                
                # Progreso
                if num_pagina % 10 == 0:
                    print(f"   Procesando... {num_pagina}/{total_paginas} páginas")
    
    except Exception as e:
        print(f"   ❌ Error al procesar PDF: {e}")
        return None
    
    if not datos_extraidos:
        print(f"   ⚠️  No se extrajeron datos del PDF")
        return None
    
    print(f"   ✅ Total de filas extraídas: {len(datos_extraidos)}")
    return datos_extraidos

def limpiar_y_normalizar_datos(datos):
    """Limpiar y normalizar los datos extraídos"""
    print("\n🧹 Limpiando y normalizando datos...")
    
    datos_limpios = []
    encabezados_encontrados = False
    
    for fila in datos:
        if not fila:
            continue
        
        # Limpiar valores None y espacios
        fila_limpia = [str(cell).strip() if cell else "" for cell in fila]
        
        # Filtrar filas vacías
        if not any(fila_limpia):
            continue
        
        # Detectar encabezados
        if any(keyword in str(cell) for cell in fila_limpia for keyword in ["Partida", "Descripción", "Concepto", "Clave"]):
            if not encabezados_encontrados:
                # Normalizar encabezados
                # Si encontramos Clave/Concepto, mapeamos a nuestro formato estándar
                if any("Clave" in str(cell) or "Concepto" in str(cell) for cell in fila_limpia):
                     # Formato: Clave, Concepto, Unidad, P.U.
                     # Lo mapeamos a: Código, Descripción Completa, Unidad, Precio
                     encabezados = ["Código", "Descripción Completa", "Unidad", "Precio"]
                else:
                    encabezados = ["Partida", "Renglón", "Código", "Descripción Completa", "Unidad", "Cantidad", "Precio", "Importe"]
                
                datos_limpios.append(encabezados)
                encabezados_encontrados = True
            continue
        
        # Filtrar filas que parecen ser encabezados de página o separadores
        primera_col = fila_limpia[0] if fila_limpia else ""
        if "Partida" in primera_col or "Página" in primera_col or "Clave" in primera_col or len(primera_col) < 2:
            continue
        
        # Validar que tenga al menos descripción y precio
        # Ajustamos índices según el formato detectado (si es Clave/Concepto, son menos columnas)
        if len(fila_limpia) >= 4:
             # Asumimos que si tiene 4 columnas es Clave, Concepto, Unidad, PU
             tiene_descripcion = len(str(fila_limpia[1])) > 3
             tiene_precio = any(str(cell).replace(".", "").replace(",", "").isdigit() for cell in fila_limpia[3:])
             
             if tiene_descripcion and tiene_precio:
                 # Normalizar a 4 columnas
                 datos_limpios.append([fila_limpia[0], fila_limpia[1], fila_limpia[2], fila_limpia[3]])
                 continue

        # Lógica anterior para formato largo
        tiene_descripcion = any(len(str(cell)) > 10 for cell in fila_limpia[3:5] if cell)
        tiene_precio = any(str(cell).replace(".", "").replace(",", "").isdigit() for cell in fila_limpia[5:] if cell)
        
        if tiene_descripcion and tiene_precio:
            datos_limpios.append(fila_limpia)
    
    print(f"   ✅ Filas válidas: {len(datos_limpios)}")
    return datos_limpios

def procesar_pdf(pdf_path, output_dir):
    """Procesar un PDF y guardar como CSV"""
    print(f"\n{'='*60}")
    print(f"📄 PROCESANDO: {Path(pdf_path).name}")
    print(f"{'='*60}")
    
    # Extraer datos
    datos = extraer_tabla_desde_pdf(pdf_path)
    if not datos:
        print(f"   ⚠️  No se pudieron extraer datos de este PDF")
        return None
    
    # Limpiar y normalizar
    datos_limpios = limpiar_y_normalizar_datos(datos)
    if not datos_limpios or len(datos_limpios) < 2:
        print(f"   ⚠️  No hay suficientes datos válidos")
        return None
    
    # Crear DataFrame y guardar CSV
    try:
        # Intentar usar los primeros datos como encabezados
        max_columnas = max(len(fila) for fila in datos_limpios)
        
        # Asegurar que todas las filas tengan el mismo número de columnas
        datos_normalizados = []
        for fila in datos_limpios:
            while len(fila) < max_columnas:
                fila.append("")
            datos_normalizados.append(fila[:max_columnas])
        
        # Crear DataFrame
        df = pd.DataFrame(datos_normalizados[1:], columns=datos_normalizados[0] if datos_normalizados else None)
        
        # Guardar CSV
        nombre_base = Path(pdf_path).stem
        output_file = Path(output_dir) / f"{nombre_base}.csv"
        
        df.to_csv(output_file, index=False, encoding='utf-8-sig')
        
        print(f"\n✅ CSV generado: {output_file}")
        print(f"📊 Registros: {len(df)}")
        
        return str(output_file)
    
    except Exception as e:
        print(f"   ❌ Error al crear CSV: {e}")
        return None

def main():
    # Directorios
    script_dir = Path(__file__).parent
    project_root = script_dir.parent
    pdf_dir = project_root / "pdf de precios"
    output_dir = project_root / "data"
    
    # Crear directorio de salida
    output_dir.mkdir(exist_ok=True)
    
    print("\n" + "="*60)
    print("📥 EXTRACCIÓN DE DATOS DE PDFs - TABULADOR CDMX")
    print("="*60)
    
    # Filtrar si se especifica un archivo
    target_file = sys.argv[1] if len(sys.argv) > 1 else None
    
    # Si se pasó una ruta de archivo, procesarlo directamente
    if target_file:
        pdf_path = Path(target_file)
        if not pdf_path.is_absolute():
            pdf_path = project_root / target_file
        
        if not pdf_path.exists():
            print(f"\n❌ Archivo no encontrado: {pdf_path}")
            return
        
        if pdf_path.suffix.lower() != '.pdf':
            print(f"\n❌ El archivo no es un PDF: {pdf_path}")
            return
        
        print(f"\n📄 Procesando archivo específico: {pdf_path.name}")
        csvs_generados = []
        csv_file = procesar_pdf(pdf_path, output_dir)
        if csv_file:
            csvs_generados.append(csv_file)
    else:
        # Buscar todos los PDFs
        pdfs = list(pdf_dir.glob("*.pdf"))
        
        if not pdfs:
            print(f"\n❌ No se encontraron PDFs en: {pdf_dir}")
            print("\n💡 Asegúrate de que los PDFs estén en la carpeta 'pdf de precios'")
            return
        
        print(f"\n📁 PDFs encontrados: {len(pdfs)}")
        for pdf in pdfs:
            print(f"   - {pdf.name}")
        
        csvs_generados = []
        
        for pdf_path in pdfs:
            if "cdmx" in pdf_path.name.lower() or "tabulador" in pdf_path.name.lower():
                csv_file = procesar_pdf(pdf_path, output_dir)
                if csv_file:
                    csvs_generados.append(csv_file)
    
    # Resumen
    print("\n" + "="*60)
    print("✅ EXTRACCIÓN COMPLETADA")
    print("="*60)
    print(f"\n📊 CSVs generados: {len(csvs_generados)}")
    
    if csvs_generados:
        print("\n📁 Archivos CSV generados:")
        for csv_file in csvs_generados:
            print(f"   ✅ {Path(csv_file).name}")
        
        print("\n🚀 PRÓXIMO PASO:")
        print("   Ejecuta el script de importación para cada CSV:")
        print("   node scripts/import-tabulador.js data/<archivo>.csv --source cdmx --location CDMX")
        print("\n💡 O procesa el más reciente:")
        if csvs_generados:
            ultimo_csv = Path(csvs_generados[-1]).name
            print(f"   node scripts/import-tabulador.js data/{ultimo_csv} --source cdmx --location CDMX")
    else:
        print("\n⚠️  No se generaron CSVs válidos")
        print("\n💡 Sugerencias:")
        print("   1. Verifica que los PDFs contengan tablas")
        print("   2. Prueba usar Tabula (https://tabula.technology/)")
        print("   3. O exporta manualmente desde Adobe Acrobat")

if __name__ == "__main__":
    main()

