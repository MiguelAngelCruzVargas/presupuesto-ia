#!/usr/bin/env python3
"""
Analizar una página específica del PDF
"""

import pdfplumber
from pathlib import Path

def analizar_pagina(pdf_path, num_pagina):
    """Analizar una página específica"""
    pdf_path = Path(pdf_path)
    
    print(f"Analizando página {num_pagina} de: {pdf_path.name}")
    print("=" * 60)
    
    with pdfplumber.open(pdf_path) as pdf:
        if num_pagina > len(pdf.pages):
            print(f"El PDF solo tiene {len(pdf.pages)} páginas")
            return
        
        pagina = pdf.pages[num_pagina - 1]
        
        # Intentar extraer tablas con diferentes configuraciones
        print("\n1. Extracción de tablas (método estándar):")
        tablas = pagina.extract_tables()
        print(f"   Tablas encontradas: {len(tablas)}")
        
        if tablas:
            for j, tabla in enumerate(tablas):
                print(f"\n   Tabla {j+1}: {len(tabla)} filas")
                if tabla and len(tabla) > 0:
                    # Mostrar primeras 5 filas
                    for k, fila in enumerate(tabla[:5]):
                        if fila:
                            fila_limpia = [str(cell)[:40] if cell else "" for cell in fila]
                            print(f"   Fila {k+1}: {' | '.join(fila_limpia)}")
        
        # Extraer texto completo
        print("\n2. Texto completo de la página:")
        texto = pagina.extract_text()
        if texto:
            lineas = texto.split('\n')
            print(f"   Total de líneas: {len(lineas)}")
            print("\n   Primeras 20 líneas:")
            for i, linea in enumerate(lineas[:20], 1):
                if linea.strip():
                    print(f"   {i:3d}: {linea[:100]}")
        
        # Intentar extraer tablas con configuración de bordes
        print("\n3. Extracción de tablas (con bordes):")
        tablas_bordes = pagina.extract_tables(table_settings={
            "vertical_strategy": "lines",
            "horizontal_strategy": "lines"
        })
        print(f"   Tablas encontradas: {len(tablas_bordes)}")
        
        if tablas_bordes and len(tablas_bordes) > 0:
            tabla = tablas_bordes[0]
            if tabla and len(tabla) > 1:
                print(f"   Filas en tabla: {len(tabla)}")
                print("\n   Primeras 5 filas de datos:")
                for k, fila in enumerate(tabla[:5], 1):
                    if fila:
                        fila_limpia = [str(cell)[:40] if cell else "" for cell in fila]
                        print(f"   Fila {k}: {' | '.join(fila_limpia)}")

def main():
    pdf_dir = Path("pdf de precios")
    pdfs = list(pdf_dir.glob("*tabulador*septiembre*.pdf"))
    
    if not pdfs:
        print("No se encontró PDF de septiembre")
        pdfs = list(pdf_dir.glob("*tabulador*.pdf"))
        if not pdfs:
            print("No se encontraron PDFs")
            return
    
    pdf_path = pdfs[0]
    
    # Analizar páginas 5, 10 y 15 (donde deberían haber datos)
    for pagina in [5, 10, 15]:
        print(f"\n{'='*60}")
        analizar_pagina(pdf_path, pagina)
        print()

if __name__ == "__main__":
    main()

