import XLSX from 'xlsx';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const excelPath = path.resolve(__dirname, '../pdf de precios/precios neodata.xlsx');

console.log('\n📊 CONTANDO CONCEPTOS ÚNICOS EN EXCEL');
console.log('═'.repeat(60));

const workbook = XLSX.readFile(excelPath);
const worksheet = workbook.Sheets[workbook.SheetNames[0]];
const excelData = XLSX.utils.sheet_to_json(worksheet);

console.log(`📊 Total de filas en Excel: ${excelData.length}`);

// Contar únicos por descripción + unidad
const unicos = new Set();
const conDescripcion = excelData.filter(row => {
    const desc = (row['Descripción Completa'] || row['Descripción'] || '').trim();
    const unit = (row['Unidad'] || 'pza').trim();
    const price = parseFloat((row['Precio'] || row['Precio Unitario'] || 0).toString().replace(/[^0-9.-]/g, ''));
    
    if (!desc || desc.length === 0) return false;
    if (isNaN(price) || price <= 0) return false;
    
    const key = `${desc.toLowerCase()}_${unit.toLowerCase()}`;
    unicos.add(key);
    return true;
});

console.log(`✅ Conceptos válidos con precio: ${conDescripcion.length}`);
console.log(`🔑 Conceptos únicos (descripción + unidad): ${unicos.size}`);
console.log(`\n💡 Diferencia: ${conDescripcion.length - unicos.size} conceptos duplicados\n`);

