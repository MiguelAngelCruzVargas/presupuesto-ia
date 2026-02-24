/**
 * Script para extraer tablas de PDFs del Tabulador CDMX
 * 
 * Extrae las tablas de precios de los PDFs y las convierte a CSV
 * 
 * Uso:
 *   node scripts/extraer-pdf-cdmx.js [ruta-al-pdf]
 * 
 * Si no se especifica ruta, procesa todos los PDFs en "pdf de precios/"
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pdfParse from 'pdf-parse';
import * as XLSX from 'xlsx';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Extraer texto del PDF
 */
async function extractTextFromPDF(pdfPath) {
    try {
        const dataBuffer = fs.readFileSync(pdfPath);
        const data = await pdfParse(dataBuffer);
        return data.text;
    } catch (error) {
        throw new Error(`Error al leer PDF: ${error.message}`);
    }
}

/**
 * Parsear texto del PDF y extraer tablas
 * Asume formato: Partida | Descripción | Unidad | Precio
 */
function parseTableFromText(text) {
    const lines = text.split('\n').map(line => line.trim()).filter(line => line);
    
    const records = [];
    let currentPartida = '';
    let currentDescription = '';
    let currentUnit = '';
    let currentPrice = '';
    
    // Patrones comunes en tabuladores
    const partidaPattern = /^[A-Z]\d{3,4}/; // Ej: A0101, B0203
    const pricePattern = /^\$?\s*\d{1,3}(?:[,\s]\d{3})*(?:\.\d{2})?$/; // Precios con formato
    const unitPattern = /^(M2|M3|ML|PZA|JOR|HORA|KG|TON|LT|SACO|BULTO|MES|M|M²|M³|M2|M3|PZ|PIEZA)$/i;
    
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        
        // Detectar partida
        if (partidaPattern.test(line)) {
            // Guardar registro anterior si existe
            if (currentPartida && currentDescription && currentPrice) {
                records.push({
                    partida: currentPartida,
                    descripcion: currentDescription.trim(),
                    unidad: currentUnit || 'PZA',
                    precio: parseFloat(currentPrice.replace(/[,$\s]/g, ''))
                });
            }
            
            // Nueva partida
            const parts = line.split(/\s+/);
            currentPartida = parts[0];
            currentDescription = parts.slice(1).join(' ');
            currentUnit = '';
            currentPrice = '';
        }
        // Detectar unidad
        else if (unitPattern.test(line)) {
            currentUnit = line.toUpperCase();
        }
        // Detectar precio (línea con número que parece precio)
        else if (/^\d{1,3}(?:[,\s]\d{3})*(?:\.\d{2})?$/.test(line)) {
            currentPrice = line;
        }
        // Continuar descripción
        else if (currentPartida && !currentPrice) {
            currentDescription += ' ' + line;
        }
    }
    
    // Guardar último registro
    if (currentPartida && currentDescription && currentPrice) {
        records.push({
            partida: currentPartida,
            descripcion: currentDescription.trim(),
            unidad: currentUnit || 'PZA',
            precio: parseFloat(currentPrice.replace(/[,$\s]/g, ''))
        });
    }
    
    return records;
}

/**
 * Método alternativo: Buscar líneas estructuradas
 */
function parseStructuredLines(text) {
    const lines = text.split('\n').map(line => line.trim()).filter(line => line);
    const records = [];
    
    // Buscar líneas que parecen registros de tabulador
    // Formato típico: Partida Descripción [Unidad] [Cantidad] Precio
    for (const line of lines) {
        // Intentar extraer partida (letra + números al inicio)
        const partidaMatch = line.match(/^([A-Z]\d{3,4})/);
        if (!partidaMatch) continue;
        
        const partida = partidaMatch[1];
        
        // Buscar precio al final (último número)
        const priceMatch = line.match(/(\d{1,3}(?:[,\s]\d{3})*(?:\.\d{2})?)$/);
        if (!priceMatch) continue;
        
        const precio = parseFloat(priceMatch[1].replace(/[,\s]/g, ''));
        
        // Extraer descripción (todo entre partida y precio)
        let descripcion = line.substring(partida.length, line.lastIndexOf(priceMatch[1])).trim();
        
        // Buscar unidad en la línea
        const unitMatch = descripcion.match(/\b(M2|M3|ML|PZA|JOR|HORA|KG|TON|LT|SACO|BULTO|MES|M|M²|M³|PZ|PIEZA)\b/i);
        const unidad = unitMatch ? unitMatch[1].toUpperCase() : 'PZA';
        
        // Limpiar descripción de unidades repetidas
        descripcion = descripcion.replace(/\b(M2|M3|ML|PZA|JOR|HORA|KG|TON|LT|SACO|BULTO|MES|M|M²|M³|PZ|PIEZA)\b/gi, '').trim();
        
        if (descripcion.length > 5 && precio > 0) {
            records.push({
                partida: partida,
                descripcion: descripcion,
                unidad: unidad,
                precio: precio
            });
        }
    }
    
    return records;
}

/**
 * Guardar como CSV
 */
function saveToCSV(records, outputPath) {
    // Encabezados
    const headers = ['Partida', 'Descripción', 'Unidad', 'Precio'];
    
    // Crear líneas CSV
    const csvLines = [
        headers.join(',')
    ];
    
    for (const record of records) {
        // Escapar comillas en descripción
        const desc = record.descripcion.replace(/"/g, '""');
        csvLines.push([
            record.partida || '',
            `"${desc}"`,
            record.unidad || 'PZA',
            record.precio || 0
        ].join(','));
    }
    
    fs.writeFileSync(outputPath, csvLines.join('\n'), 'utf-8');
}

/**
 * Procesar un PDF
 */
async function processPDF(pdfPath) {
    console.log(`\n📄 Procesando: ${path.basename(pdfPath)}`);
    console.log('─'.repeat(60));
    
    try {
        // Extraer texto
        console.log('📖 Extrayendo texto del PDF...');
        const text = await extractTextFromPDF(pdfPath);
        
        console.log(`   ✅ Texto extraído (${text.length} caracteres)`);
        
        // Intentar método estructurado primero
        console.log('🔍 Parseando tablas...');
        let records = parseStructuredLines(text);
        
        if (records.length === 0) {
            console.log('   ⚠️  Método estructurado no encontró datos, intentando alternativo...');
            records = parseTableFromText(text);
        }
        
        if (records.length === 0) {
            console.log('   ⚠️  No se pudieron extraer registros automáticamente');
            console.log('   💡 El PDF puede requerir procesamiento manual o usar Tabula');
            
            // Guardar texto extraído para análisis
            const textFile = pdfPath.replace('.pdf', '_texto_extraido.txt');
            fs.writeFileSync(textFile, text, 'utf-8');
            console.log(`   📝 Texto extraído guardado en: ${path.basename(textFile)}`);
            return null;
        }
        
        console.log(`   ✅ ${records.length} registros encontrados`);
        
        // Guardar CSV
        const csvPath = pdfPath.replace('.pdf', '.csv');
        saveToCSV(records, csvPath);
        
        console.log(`\n✅ CSV generado: ${path.basename(csvPath)}`);
        console.log(`📊 Registros: ${records.length}`);
        
        return csvPath;
        
    } catch (error) {
        console.error(`\n❌ Error procesando PDF: ${error.message}`);
        return null;
    }
}

/**
 * Función principal
 */
async function main() {
    const args = process.argv.slice(2);
    const pdfPath = args[0];
    
    console.log('\n📄 EXTRACTOR DE TABLAS DE PDF - TABULADOR CDMX');
    console.log('═'.repeat(60));
    
    const pdfDir = path.resolve(__dirname, '../pdf de precios');
    
    if (pdfPath) {
        // Procesar PDF específico
        if (!fs.existsSync(pdfPath)) {
            console.error(`❌ Archivo no encontrado: ${pdfPath}`);
            process.exit(1);
        }
        await processPDF(pdfPath);
    } else {
        // Procesar todos los PDFs en la carpeta
        if (!fs.existsSync(pdfDir)) {
            console.error(`❌ Carpeta no encontrada: ${pdfDir}`);
            process.exit(1);
        }
        
        const pdfFiles = fs.readdirSync(pdfDir)
            .filter(file => file.toLowerCase().endsWith('.pdf'))
            .map(file => path.join(pdfDir, file));
        
        if (pdfFiles.length === 0) {
            console.error('❌ No se encontraron archivos PDF en la carpeta');
            process.exit(1);
        }
        
        console.log(`\n📁 Encontrados ${pdfFiles.length} archivos PDF:`);
        pdfFiles.forEach(file => console.log(`   - ${path.basename(file)}`));
        
        const results = [];
        for (const pdfFile of pdfFiles) {
            const csvPath = await processPDF(pdfFile);
            if (csvPath) {
                results.push(csvPath);
            }
        }
        
        console.log('\n' + '═'.repeat(60));
        console.log(`\n✅ PROCESO COMPLETADO`);
        console.log(`📊 PDFs procesados: ${pdfFiles.length}`);
        console.log(`✅ CSVs generados: ${results.length}`);
        
        if (results.length > 0) {
            console.log('\n📁 Archivos CSV generados:');
            results.forEach(csv => console.log(`   ✅ ${path.basename(csv)}`));
            
            console.log('\n💡 PRÓXIMO PASO:');
            console.log('   Revisa los CSVs generados y luego importa con:');
            console.log(`   node scripts/import-tabulador.js <archivo.csv> --source cdmx --location CDMX\n`);
        }
    }
}

main().catch(error => {
    console.error('\n❌ ERROR FATAL:', error.message);
    if (error.stack) {
        console.error('\nStack trace:', error.stack);
    }
    process.exit(1);
});

