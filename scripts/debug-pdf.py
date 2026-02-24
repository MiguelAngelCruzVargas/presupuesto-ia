
import pdfplumber
import sys
from pathlib import Path

def debug_pdf(pdf_path):
    print(f"Debugging: {pdf_path}")
    with pdfplumber.open(pdf_path) as pdf:
        for i in range(3):  # Check first 3 pages
            if i >= len(pdf.pages): break
            page = pdf.pages[i]
            print(f"\n--- Page {i+1} ---")
            
            # Check text
            text = page.extract_text()
            print("Text sample:")
            print(text[:200] if text else "No text found")
            
            # Check tables
            tables = page.extract_tables()
            print(f"\nTables found: {len(tables)}")
            if tables:
                for table in tables:
                    for row in table:
                        # Clean row
                        row = [str(cell).strip() if cell else "" for cell in row]
                        if not any(row): continue
                        
                        print(f"Row: {row}")
                        
                        # Test header detection
                        is_header = any(k in str(c) for c in row for k in ["Partida", "Descripción", "Concepto", "Clave"])
                        if is_header:
                            print("  -> Detected as HEADER")
                        
                        # Test data detection
                        if len(row) >= 4:
                             has_desc = len(str(row[1])) > 5
                             has_price = any(str(c).replace(".", "").replace(",", "").isdigit() for c in row[3:])
                             if has_desc and has_price:
                                 print("  -> Detected as DATA")
                             else:
                                 print(f"  -> Rejected (Desc: {has_desc}, Price: {has_price})")

if __name__ == "__main__":
    pdf_dir = Path("pdf de precios")
    # Find the september file
    files = list(pdf_dir.glob("*septiembre*2025*.pdf"))
    if files:
        debug_pdf(files[0])
    else:
        print("File not found")
