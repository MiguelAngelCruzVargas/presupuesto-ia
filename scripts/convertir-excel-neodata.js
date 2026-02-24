/**
 * Script para convertir el Excel de Neodata a CSV para importación
 * 
 * Uso:
 *   node scripts/convertir-excel-neodata.js
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import XLSX from 'xlsx';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function convertirExcelACSV() {
    console.log('\n📊 CONVIRTIENDO EXCEL DE NEODATA A CSV');
    console.log('═'.repeat(60));
    
    const excelPath = path.resolve(__dirname, '../pdf de precios/precios neodata.xlsx');
    const outputDir = path.resolve(__dirname, '../data');
    const outputPath = path.join(outputDir, 'construbase-libre-2025.csv');
    
    // Verificar que existe
    if (!fs.existsSync(excelPath)) {
        console.error(`\n❌ No se encontró el archivo: ${excelPath}`);
        console.error('\n💡 Asegúrate de que el archivo "precios neodata.xlsx" esté en la carpeta "pdf de precios"');
        return;
    }
    
    console.log(`📁 Archivo Excel: ${path.basename(excelPath)}`);
    
    try {
        // Leer Excel
        console.log('\n📖 Leyendo archivo Excel...');
        const workbook = XLSX.readFile(excelPath);
        
        // Mostrar hojas disponibles
        console.log(`\n📋 Hojas encontradas: ${workbook.SheetNames.length}`);
        workbook.SheetNames.forEach((nombre, idx) => {
            console.log(`   ${idx + 1}. ${nombre}`);
        });
        
        // Usar la primera hoja (o buscar una que tenga datos de catálogo)
        let worksheet = null;
        let sheetName = null;
        
        // Buscar hoja con más datos
        for (const nombre of workbook.SheetNames) {
            const ws = workbook.Sheets[nombre];
            const jsonData = XLSX.utils.sheet_to_json(ws, { header: 1 });
            
            if (jsonData.length > 100) {  // Si tiene más de 100 filas, probablemente es el catálogo
                worksheet = ws;
                sheetName = nombre;
                break;
            }
        }
        
        // Si no encontró, usar la primera
        if (!worksheet) {
            sheetName = workbook.SheetNames[0];
            worksheet = workbook.Sheets[sheetName];
        }
        
        console.log(`\n📄 Usando hoja: "${sheetName}"`);
        
        // Convertir a JSON
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
        
        console.log(`   ✅ Filas leídas: ${jsonData.length}`);
        
        if (jsonData.length === 0) {
            console.error('\n❌ El archivo Excel está vacío o no contiene datos');
            return;
        }
        
        // Crear directorio de salida
        if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir, { recursive: true });
        }
        
        // Convertir a CSV
        const csv = XLSX.utils.sheet_to_csv(worksheet);
        
        // Guardar CSV
        fs.writeFileSync(outputPath, csv, 'utf-8');
        
        console.log(`\n✅ CSV generado: ${path.basename(outputPath)}`);
        console.log(`📁 Ubicación: ${outputPath}`);
        
        console.log('\n🚀 PRÓXIMO PASO:');
        console.log('   Ejecuta el script de importación:');
        console.log(`   node scripts/import-tabulador.js data/${path.basename(outputPath)} --source construbase --location México\n`);
        
    } catch (error) {
        console.error('\n❌ ERROR al convertir Excel:', error.message);
        console.error('\n💡 Verifica que:');
        console.error('   1. El archivo Excel no esté abierto en otro programa');
        console.error('   2. El archivo tenga el formato correcto');
        console.error('   3. Tengas permisos para leer el archivo\n');
    }
}

convertirExcelACSV();

