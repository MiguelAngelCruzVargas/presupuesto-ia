#!/usr/bin/env python3
"""
Script para analizar la estructura de un PDF del tabulador
"""

import pdfplumber
from pathlib import Path

def analizar_pdf(pdf_path):
    """Analizar estructura del PDF"""
    pdf_path = Path(pdf_path)
    
    print(f"Analizando: {pdf_path.name}")
    print("=" * 60)
    
    with pdfplumber.open(pdf_path) as pdf:
        print(f"Total de páginas: {len(pdf.pages)}\n")
        
        # Analizar primeras 3 páginas
        for i in range(min(3, len(pdf.pages))):
            pagina = pdf.pages[i]
            print(f"\n--- PAGINA {i+1} ---")
            
            # Intentar extraer tablas
            tablas = pagina.extract_tables()
            print(f"Tablas encontradas: {len(tablas)}")
            
            if tablas:
                for j, tabla in enumerate(tablas):
                    print(f"\n  Tabla {j+1}:")
                    print(f"    Filas: {len(tabla) if tabla else 0}")
                    if tabla and len(tabla) > 0:
                        print(f"    Columnas en primera fila: {len(tabla[0]) if tabla[0] else 0}")
                        # Mostrar primeras 3 filas
                        for k, fila in enumerate(tabla[:3]):
                            if fila:
                                fila_str = " | ".join([str(cell)[:30] if cell else "" for cell in fila[:6]])
                                print(f"    Fila {k+1}: {fila_str}")
            
            # Extraer texto
            texto = pagina.extract_text()
            if texto:
                lineas = texto.split('\n')[:10]
                print(f"\n  Primeras 10 lineas de texto:")
                for linea in lineas:
                    print(f"    {linea[:80]}")

def main():
    pdf_dir = Path("pdf de precios")
    pdfs = list(pdf_dir.glob("*tabulador*.pdf"))
    
    if not pdfs:
        print("No se encontraron PDFs")
        return
    
    # Analizar el más reciente (septiembre 2025)
    pdf_mas_reciente = None
    for pdf in pdfs:
        if "septiembre" in pdf.name.lower():
            pdf_mas_reciente = pdf
            break
    
    if not pdf_mas_reciente:
        pdf_mas_reciente = pdfs[0]
    
    analizar_pdf(pdf_mas_reciente)

if __name__ == "__main__":
    main()

