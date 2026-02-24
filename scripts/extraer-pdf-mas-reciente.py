#!/usr/bin/env python3
"""
Script para extraer precios del PDF más reciente del Tabulador CDMX
"""

import pdfplumber
import pandas as pd
from pathlib import Path
import re
from datetime import datetime

def obtener_pdf_mas_reciente(pdf_dir):
    """Encontrar el PDF más reciente basado en el nombre del archivo"""
    pdf_dir = Path(pdf_dir)
    pdfs = list(pdf_dir.glob("*tabulador*.pdf"))
    
    if not pdfs:
        return None
    
    # Extraer fechas de los nombres de archivo
    fechas_archivos = []
    for pdf in pdfs:
        # Buscar patrones de fecha en el nombre
        # Formato: ...-enero-2025.pdf, ...-febrero-2025.pdf, etc.
        meses = {
            'enero': 1, 'febrero': 2, 'marzo': 3, 'abril': 4,
            'mayo': 5, 'junio': 6, 'julio': 7, 'agosto': 8,
            'septiembre': 9, 'octubre': 10, 'noviembre': 11, 'diciembre': 12
        }
        
        nombre_lower = pdf.name.lower()
        
        # Buscar año
        año_match = re.search(r'20\d{2}', nombre_lower)
        año = int(año_match.group()) if año_match else 2025
        
        # Buscar mes
        mes = None
        for mes_nombre, mes_num in meses.items():
            if mes_nombre in nombre_lower:
                mes = mes_num
                break
        
        # Si no se encuentra mes, usar fecha de modificación
        if mes is None:
            fecha_mod = datetime.fromtimestamp(pdf.stat().st_mtime)
            fechas_archivos.append((pdf, fecha_mod))
        else:
            try:
                fecha = datetime(año, mes, 1)
                fechas_archivos.append((pdf, fecha))
            except:
                fecha_mod = datetime.fromtimestamp(pdf.stat().st_mtime)
                fechas_archivos.append((pdf, fecha_mod))
    
    # Ordenar por fecha y devolver el más reciente
    fechas_archivos.sort(key=lambda x: x[1], reverse=True)
    return fechas_archivos[0][0] if fechas_archivos else None

def extraer_precios(pdf_path):
    """Extraer precios de un PDF del tabulador CDMX"""
    print(f"\nProcesando: {Path(pdf_path).name}")
    print("=" * 60)
    
    datos = []
    headers = ["Código", "Descripción", "Unidad", "Precio"]
    
    try:
        with pdfplumber.open(pdf_path) as pdf:
            total_paginas = len(pdf.pages)
            print(f"Total de páginas: {total_paginas}")
            
            for i, pagina in enumerate(pdf.pages, 1):
                if i % 10 == 0:
                    print(f"Procesando página {i}/{total_paginas}...")
                
                # Extraer tablas
                tablas = pagina.extract_tables()
                
                for tabla in tablas:
                    if not tabla:
                        continue
                    
                    for fila in tabla:
                        # Limpiar fila
                        fila_limpia = [str(cell).strip() if cell else "" for cell in fila]
                        
                        # Filtrar filas vacías
                        if not any(fila_limpia):
                            continue
                        
                        # Detectar encabezados y saltarlos
                        if any(keyword in str(cell).lower() for cell in fila_limpia 
                               for keyword in ["partida", "clave", "concepto", "precio"]):
                            if any("precio" in str(cell).lower() for cell in fila_limpia):
                                continue  # Es un encabezado
                        
                        # Esperamos al menos 4 columnas: Código, Descripción, Unidad, Precio
                        if len(fila_limpia) >= 4:
                            codigo = fila_limpia[0]
                            descripcion = fila_limpia[1] if len(fila_limpia) > 1 else ""
                            unidad = fila_limpia[2] if len(fila_limpia) > 2 else ""
                            precio_str = fila_limpia[3] if len(fila_limpia) > 3 else ""
                            
                            # Limpiar precio
                            precio_str = precio_str.replace("$", "").replace(",", "").strip()
                            
                            # Validar que sea un precio válido
                            try:
                                precio = float(precio_str) if precio_str and precio_str.replace(".", "").isdigit() else None
                            except:
                                precio = None
                            
                            # Validar que tenemos datos válidos
                            if (len(codigo) > 0 and 
                                len(descripcion) > 3 and 
                                precio is not None and 
                                precio > 0):
                                datos.append([codigo, descripcion, unidad or "PZA", precio])
                
                # Si no hay tablas, intentar extraer texto estructurado
                if not tablas:
                    texto = pagina.extract_text()
                    if texto and ("Partida" in texto or "Precio" in texto):
                        # Intentar parsear texto (método alternativo)
                        lineas = texto.split('\n')
                        for linea in lineas:
                            # Buscar líneas con formato: Código Descripción Unidad Precio
                            partes = linea.strip().split()
                            if len(partes) >= 4:
                                # Intentar detectar patrón
                                codigo_candidato = partes[0]
                                precio_candidato = partes[-1].replace("$", "").replace(",", "")
                                
                                if re.match(r'^[A-Z]\d{3,4}', codigo_candidato):
                                    try:
                                        precio_valor = float(precio_candidato)
                                        descripcion_candidato = " ".join(partes[1:-2])
                                        unidad_candidato = partes[-2]
                                        
                                        if len(descripcion_candidato) > 3 and precio_valor > 0:
                                            datos.append([codigo_candidato, descripcion_candidato, unidad_candidato, precio_valor])
                                    except:
                                        pass
        
        print(f"\nTotal de registros extraídos: {len(datos)}")
        
        if datos:
            # Crear DataFrame
            df = pd.DataFrame(datos, columns=headers)
            
            # Eliminar duplicados
            df = df.drop_duplicates(subset=['Código'], keep='last')
            
            # Ordenar por código
            df = df.sort_values('Código')
            
            print(f"Registros después de limpieza: {len(df)}")
            
            return df
        else:
            print("No se extrajeron datos válidos")
            return None
            
    except Exception as e:
        print(f"Error al procesar PDF: {e}")
        import traceback
        traceback.print_exc()
        return None

def main():
    # Directorios
    script_dir = Path(__file__).parent
    project_root = script_dir.parent
    pdf_dir = project_root / "pdf de precios"
    output_dir = project_root / "data"
    
    # Crear directorio de salida
    output_dir.mkdir(exist_ok=True)
    
    print("\n" + "=" * 60)
    print("EXTRACCION DE PRECIOS - TABULADOR CDMX")
    print("=" * 60)
    
    # Buscar PDF más reciente
    pdf_mas_reciente = obtener_pdf_mas_reciente(pdf_dir)
    
    if not pdf_mas_reciente:
        print(f"\nNo se encontraron PDFs en: {pdf_dir}")
        return
    
    print(f"\nPDF mas reciente encontrado:")
    print(f"  {pdf_mas_reciente.name}")
    
    # Extraer datos
    df = extraer_precios(pdf_mas_reciente)
    
    if df is not None and len(df) > 0:
        # Guardar CSV
        nombre_base = pdf_mas_reciente.stem
        output_file = output_dir / f"{nombre_base}.csv"
        
        df.to_csv(output_file, index=False, encoding='utf-8-sig')
        
        print(f"\n" + "=" * 60)
        print("EXTRACCION COMPLETADA")
        print("=" * 60)
        print(f"\nCSV generado: {output_file.name}")
        print(f"Registros: {len(df)}")
        print(f"\nUbicacion: {output_file}")
        
        # Mostrar muestra de datos
        print("\nMuestra de datos extraidos (primeros 5 registros):")
        print("-" * 60)
        print(df.head().to_string(index=False))
        
        print("\nProximo paso:")
        print(f"  node scripts/import-tabulador.js data/{output_file.name} --source cdmx --location CDMX")
    else:
        print("\nNo se pudieron extraer datos del PDF")
        print("\nSugerencias:")
        print("  1. Verifica que el PDF contenga tablas")
        print("  2. Prueba usar Tabula (https://tabula.technology/)")
        print("  3. O exporta manualmente desde Adobe Acrobat")

if __name__ == "__main__":
    main()

