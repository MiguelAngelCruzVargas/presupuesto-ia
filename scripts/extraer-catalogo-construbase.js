/**
 * Script para extraer catálogo de CONSTRUBASE-LIBRE
 * 
 * Este script puede extraer datos de:
 * - Tabla HTML en la página web
 * - API si está disponible
 * - Datos copiados desde la interfaz
 * 
 * NOTA: Puede requerir ajustes según la estructura real de la página
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import https from 'https';
import http from 'http';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Opción 1: Extraer desde URL de catálogo
 */
async function extractFromURL(catalogURL) {
    return new Promise((resolve, reject) => {
        const protocol = catalogURL.startsWith('https') ? https : http;
        
        protocol.get(catalogURL, (response) => {
            let html = '';
            
            response.on('data', (chunk) => {
                html += chunk;
            });
            
            response.on('end', () => {
                // Parsear HTML y extraer tabla
                // Esto requiere análisis de la estructura real
                console.log('📄 HTML recibido, parseando...');
                resolve(html);
            });
        }).on('error', reject);
    });
}

/**
 * Opción 2: Convertir datos copiados desde la interfaz
 */
function convertCopiedDataToCSV(inputFile) {
    console.log('\n📋 CONVIRTIENDO DATOS COPIADOS A CSV');
    console.log('═'.repeat(60));
    
    // Leer archivo con datos copiados
    const content = fs.readFileSync(inputFile, 'utf-8');
    
    // Intentar parsear como tabla separada por tabs o espacios
    const lines = content.split('\n').filter(line => line.trim());
    
    if (lines.length === 0) {
        console.error('❌ Archivo vacío o sin datos');
        return;
    }
    
    console.log(`📊 Líneas detectadas: ${lines.length}`);
    
    // Crear CSV
    const csvLines = [];
    
    for (const line of lines) {
        // Intentar dividir por tabs o múltiples espacios
        const columns = line.split(/\t+/).map(col => col.trim());
        
        if (columns.length > 1) {
            // Formatear como CSV
            const csvLine = columns.map(col => {
                // Escapar comillas y envolver si contiene comas
                if (col.includes(',') || col.includes('"')) {
                    return `"${col.replace(/"/g, '""')}"`;
                }
                return col;
            }).join(',');
            
            csvLines.push(csvLine);
        }
    }
    
    // Guardar CSV
    const outputFile = path.join(__dirname, '../data/construbase-libre-2025.csv');
    fs.writeFileSync(outputFile, csvLines.join('\n'), 'utf-8');
    
    console.log(`\n✅ CSV generado: ${outputFile}`);
    console.log(`📊 Registros: ${csvLines.length}`);
}

/**
 * Opción 3: Generar template para datos manuales
 */
function generateTemplate() {
    console.log('\n📝 GENERANDO TEMPLATE PARA DATOS MANUALES');
    console.log('═'.repeat(60));
    
    const template = [
        'Partida,Renglón,Descripción Completa,Unidad,Cantidad,Precio,Importe',
        'A0101,10,"Ejemplo: Trazo y nivelación manual...",M2,1.0000,9.46,9.46',
        'A0101,90,"Ejemplo: Tapial de 2.00 m...",M,1.0000,1003.37,1003.37'
    ].join('\n');
    
    const templateFile = path.join(__dirname, '../data/template-construbase.csv');
    fs.writeFileSync(templateFile, template, 'utf-8');
    
    console.log(`\n✅ Template creado: ${templateFile}`);
    console.log('\n💡 Instrucciones:');
    console.log('   1. Copiar datos desde CONSTRUBASE-LIBRE');
    console.log('   2. Pegar en Excel siguiendo el formato del template');
    console.log('   3. Guardar como CSV');
    console.log('   4. Ejecutar script de importación\n');
}

/**
 * Función principal
 */
function main() {
    const args = process.argv.slice(2);
    const command = args[0];
    
    if (command === 'template') {
        generateTemplate();
    } else if (command === 'convert' && args[1]) {
        convertCopiedDataToCSV(args[1]);
    } else {
        console.log('\n📋 EXTRACCIÓN DE CATÁLOGO CONSTRUBASE-LIBRE');
        console.log('═'.repeat(60));
        console.log('\n💡 Este script puede ayudarte de varias formas:\n');
        console.log('1️⃣  Generar template:');
        console.log('   node scripts/extraer-catalogo-construbase.js template\n');
        console.log('2️⃣  Convertir datos copiados:');
        console.log('   node scripts/extraer-catalogo-construbase.js convert <archivo.txt>\n');
        console.log('3️⃣  Si tienes URL del catálogo:');
        console.log('   (Requiere análisis de la estructura HTML)\n');
        console.log('📝 RECOMENDACIÓN:');
        console.log('   1. Accede a https://neodatapu.appspot.com');
        console.log('   2. Copia la tabla completa (Ctrl+A, Ctrl+C)');
        console.log('   3. Pega en Excel y guarda como CSV');
        console.log('   4. Usa el script de importación normal\n');
    }
}

main();

