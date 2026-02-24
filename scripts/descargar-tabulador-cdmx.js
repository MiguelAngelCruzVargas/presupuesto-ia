/**
 * Script para descargar el Tabulador CDMX desde la URL oficial
 * 
 * NOTA: Este script descarga el PDF. Necesitarás convertirlo a CSV después
 * usando herramientas como Tabula, Adobe Acrobat, o Python.
 * 
 * Uso:
 *   node scripts/descargar-tabulador-cdmx.js
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

        console.log(`📥 Descargando desde: ${url}`);
        console.log(`📁 Guardando en: ${outputPath}`);

        protocol.get(url, (response) => {
            // Verificar redirecciones
            if (response.statusCode === 301 || response.statusCode === 302) {
                console.log(`🔄 Redirección detectada, siguiendo a: ${response.headers.location}`);
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
                    process.stdout.write(`\r   Progreso: ${progress}% (${(downloadedSize / 1024 / 1024).toFixed(2)} MB)`);
                }
            });

            response.on('end', () => {
                file.end();
                console.log('\n   ✅ Descarga completada');
                resolve();
            });

            response.on('error', (error) => {
                fs.unlinkSync(outputPath);
                reject(error);
            });
        }).on('error', (error) => {
            fs.unlinkSync(outputPath);
            reject(error);
        });

        file.on('error', (error) => {
            fs.unlinkSync(outputPath);
            reject(error);
        });
    });
}

/**
 * Función principal
 */
async function main() {
    console.log('\n📥 DESCARGA DEL TABULADOR CDMX');
    console.log('═'.repeat(60));

    const outputDir = path.resolve(__dirname, '../data');
    const outputPath = path.join(outputDir, 'cdmx-tabulador-2025.pdf');

    // Crear directorio si no existe
    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
    }

    try {
        await downloadFile(TABULADOR_CDMX_URL, outputPath);
        
        const stats = fs.statSync(outputPath);
        const fileSizeMB = (stats.size / 1024 / 1024).toFixed(2);

        console.log('\n✅ DESCARGA COMPLETADA');
        console.log('═'.repeat(60));
        console.log(`📁 Archivo: ${path.basename(outputPath)}`);
        console.log(`📊 Tamaño: ${fileSizeMB} MB`);
        console.log(`📍 Ubicación: ${outputPath}`);
        console.log('\n⚠️  PRÓXIMO PASO:');
        console.log('   El archivo está en formato PDF.');
        console.log('   Necesitas convertirlo a CSV para importarlo.');
        console.log('\n💡 Opciones para convertir:');
        console.log('   1. Tabula (herramienta open source): https://tabula.technology/');
        console.log('   2. Adobe Acrobat (exportar tabla)');
        console.log('   3. Python con pdfplumber o camelot');
        console.log('   4. Herramientas online de conversión PDF a Excel');
        console.log('\n📝 Una vez convertido, ejecuta:');
        console.log(`   node scripts/import-tabulador.js data/cdmx-tabulador-2025.csv --source cdmx --location CDMX\n`);

    } catch (error) {
        console.error('\n❌ ERROR al descargar:', error.message);
        console.error('\n💡 Alternativa:');
        console.error('   1. Descargar manualmente desde:');
        console.error('      https://www.obras.cdmx.gob.mx/normas-tabulador/tabulador-general-de-precios-unitarios');
        console.error('   2. Convertir PDF a CSV');
        console.error('   3. Guardar en: data/cdmx-tabulador-2025.csv\n');
        process.exit(1);
    }
}

main();

