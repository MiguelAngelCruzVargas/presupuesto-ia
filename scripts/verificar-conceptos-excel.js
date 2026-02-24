import XLSX from 'xlsx';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const excelPath = path.resolve(__dirname, '../pdf de precios/precios neodata.xlsx');

console.log('\n📊 VERIFICANDO CONCEPTOS EN EXCEL');
console.log('═'.repeat(60));

try {
    const workbook = XLSX.readFile(excelPath);
    const firstSheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[firstSheetName];
    const jsonData = XLSX.utils.sheet_to_json(worksheet);
    
    console.log(`📁 Archivo: ${path.basename(excelPath)}`);
    console.log(`📋 Hoja: ${firstSheetName}`);
    console.log(`📊 Total de filas leídas: ${jsonData.length}`);
    
    // Filtrar solo las que tienen descripción
    const conDescripcion = jsonData.filter(row => {
        const desc = row['Descripción Completa'] || row['Descripción'] || row['descripcion'] || '';
        return desc && desc.trim().length > 0;
    });
    
    console.log(`✅ Conceptos con descripción válida: ${conDescripcion.length}`);
    
    // Contar por categoría si existe
    const porCategoria = {};
    const porPartida = {};
    
    conDescripcion.forEach(row => {
        const partida = row['Partida'] || row['PARTIDA'] || 'Sin Partida';
        porPartida[partida] = (porPartida[partida] || 0) + 1;
    });
    
    console.log(`\n📈 Conceptos únicos por Partida: ${Object.keys(porPartida).length}`);
    console.log(`\n💡 Resumen:`);
    console.log(`   - Total filas en Excel: ${jsonData.length}`);
    console.log(`   - Conceptos válidos: ${conDescripcion.length}`);
    console.log(`   - Partidas diferentes: ${Object.keys(porPartida).length}`);
    
    // Mostrar primeras 5 partidas
    console.log(`\n📝 Primeras 5 partidas encontradas:`);
    Object.entries(porPartida).slice(0, 5).forEach(([partida, count]) => {
        console.log(`   - ${partida}: ${count} conceptos`);
    });
    
    console.log('\n');
    
} catch (error) {
    console.error('❌ Error:', error.message);
}

