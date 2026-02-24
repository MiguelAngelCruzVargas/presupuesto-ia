/**
 * Script para descargar el Tabulador CDMX desde la URL oficial
 * 
 * Descarga el PDF del tabulador oficial de la CDMX.
 * Después necesitarás convertirlo a CSV usando Tabula, Adobe Acrobat, o Python.
 * 
 * Uso:
 *   node scripts/descargar-cdmx-pdf.js
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import https from 'https';
import http from 'http';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// URL del tabulador CDMX (actualización junio 2025)
const TABULADOR_CDMX_URL = 'https://obras.cdmx.gob.mx/storage/app/media/Tabulador%20General%20de%20Precios%20Unitarios%20del%20Gobierno%20de%20la%20Ciudad%20de%20Mexico%20de%20Junio%202025/tabulador-general-de-precios-unitarios-del-gobierno-de-la-ciudad-de-mexico-actualizacion-de-junio-2025.pdf';

/**
 * Descargar archivo desde URL
 */
function downloadFile(url, outputPath) {
    return new Promise((resolve, reject) => {
        const file = fs.createWriteStream(outputPath);
        const protocol = url.startsWith('https') ? https : http;

        console.log(`📥 Descargando PDF del Tabulador CDMX...`);
        console.log(`📁 URL: ${url}`);

        protocol.get(url, (response) => {
            // Manejar redirecciones
            if (response.statusCode === 301 || response.statusCode === 302) {
                console.log(`🔄 Redirección detectada, siguiendo...`);
                return downloadFile(response.headers.location, outputPath).then(resolve).catch(reject);
            }

            if (response.statusCode !== 200) {
                reject(new Error(`Error al descargar: ${response.statusCode} ${response.statusMessage}`));
                return;
            }

            const totalSize = parseInt(response.headers['content-length'], 10);
            let downloadedSize = 0;

            response.on('data', (chunk) => {
                downloadedSize += chunk.length;
                file.write(chunk);
                
                if (totalSize) {
                    const progress = ((downloadedSize / totalSize) * 100).toFixed(1);
                    const sizeMB = (downloadedSize / 1024 / 1024).toFixed(2);
                    const totalMB = (totalSize / 1024 / 1024).toFixed(2);
                    process.stdout.write(`\r   ⬇️  Descargando: ${progress}% (${sizeMB} MB / ${totalMB} MB)`);
                }
            });

            response.on('end', () => {
                file.end();
                console.log('\n   ✅ Descarga completada');
                resolve();
            });

            response.on('error', (error) => {
                if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath);
                reject(error);
            });
        }).on('error', (error) => {
            if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath);
            reject(error);
        });

        file.on('error', (error) => {
            if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath);
            reject(error);
        });
    });
}

/**
 * Función principal
 */
async function main() {
    console.log('\n📥 DESCARGA DEL TABULADOR OFICIAL CDMX');
    console.log('═'.repeat(60));

    const outputDir = path.resolve(__dirname, '../data');
    const outputPath = path.join(outputDir, 'cdmx-tabulador-2025.pdf');

    // Crear directorio si no existe
    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
        console.log(`📁 Directorio creado: ${outputDir}`);
    }

    try {
        await downloadFile(TABULADOR_CDMX_URL, outputPath);
        
        const stats = fs.statSync(outputPath);
        const fileSizeMB = (stats.size / 1024 / 1024).toFixed(2);

        console.log('\n✅ DESCARGA COMPLETADA EXITOSAMENTE');
        console.log('═'.repeat(60));
        console.log(`📁 Archivo: ${path.basename(outputPath)}`);
        console.log(`📊 Tamaño: ${fileSizeMB} MB`);
        console.log(`📍 Ubicación: ${outputPath}`);
        
        console.log('\n⚠️  PRÓXIMO PASO: CONVERTIR PDF A CSV');
        console.log('─'.repeat(60));
        console.log('\n💡 Opciones para convertir PDF a CSV:\n');
        console.log('1️⃣  TABULA (Recomendado - Open Source)');
        console.log('   - Descargar: https://tabula.technology/');
        console.log('   - Abrir PDF, seleccionar tabla, exportar CSV\n');
        
        console.log('2️⃣  ADOBE ACROBAT');
        console.log('   - Abrir PDF → Exportar → Excel/CSV\n');
        
        console.log('3️⃣  PYTHON (Si tienes Python instalado)');
        console.log('   - pip install pdfplumber');
        console.log('   - Crear script de conversión\n');
        
        console.log('4️⃣  HERRAMIENTAS ONLINE');
        console.log('   - Buscar "PDF to Excel converter" online\n');
        
        console.log('📝 Una vez convertido a CSV, ejecuta:');
        console.log(`   node scripts/import-tabulador.js data/cdmx-tabulador-2025.csv --source cdmx --location CDMX\n`);

    } catch (error) {
        console.error('\n❌ ERROR al descargar:', error.message);
        console.error('\n💡 Alternativas:');
        console.error('   1. Descargar manualmente desde:');
        console.error('      https://www.obras.cdmx.gob.mx/normas-tabulador/tabulador-general-de-precios-unitarios');
        console.error('   2. Buscar el PDF en la página y descargarlo');
        console.error('   3. Guardar en: data/cdmx-tabulador-2025.pdf');
        console.error('   4. Convertir a CSV usando las opciones mencionadas arriba\n');
        process.exit(1);
    }
}

main();

