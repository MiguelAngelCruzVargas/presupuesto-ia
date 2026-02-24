
import pdfplumber
import pandas as pd
from pathlib import Path
import sys

def extract_custom(pdf_path):
    print(f"Extracting from: {pdf_path}")
    data = []
    headers = ["Código", "Descripción", "Unidad", "Precio"]
    
    with pdfplumber.open(pdf_path) as pdf:
        total = len(pdf.pages)
        for i, page in enumerate(pdf.pages):
            if (i+1) % 10 == 0:
                print(f"Processing page {i+1}/{total}...")
                
            tables = page.extract_tables()
            for table in tables:
                for row in table:
                    # Clean row
                    row = [str(cell).strip() if cell else "" for cell in row]
                    if not any(row): continue
                    
                    # Check if it's a data row
                    # Expecting: Clave, Concepto, Unidad, P.U. (4 cols)
                    if len(row) >= 4:
                        # Relaxed checks
                        # Col 1 (Concepto) should have some length
                        # Col 3 (Price) should look like a number
                        desc = row[1]
                        price_str = row[3].replace("$", "").replace(",", "").strip()
                        
                        is_price = price_str.replace(".", "").isdigit()
                        
                        if len(desc) > 3 and is_price:
                            # Add to data
                            data.append([row[0], desc, row[2], price_str])
    
    print(f"Total rows extracted: {len(data)}")
    
    if data:
        df = pd.DataFrame(data, columns=headers)
        output_file = Path("data/extracted-sept-2025.csv")
        df.to_csv(output_file, index=False, encoding='utf-8-sig')
        print(f"Saved to {output_file}")
    else:
        print("No data extracted")

if __name__ == "__main__":
    pdf_dir = Path("pdf de precios")
    files = list(pdf_dir.glob("*septiembre*2025*.pdf"))
    if files:
        extract_custom(files[0])
    else:
        print("File not found")
