/**
 * Script simple para extraer PDFs usando herramientas del sistema
 * 
 * NOTA: Para extraer tablas de PDFs en Node.js necesitamos:
 * - pdf-parse para texto simple
 * - O usar Python con pdfplumber (mejor para tablas)
 * 
 * Este script proporciona instrucciones y verifica dependencias
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function listarPDFs() {
    const pdfDir = path.resolve(__dirname, '../pdf de precios');
    
    console.log('\n📄 PDFs DEL TABULADOR CDMX ENCONTRADOS');
    console.log('═'.repeat(60));
    
    if (!fs.existsSync(pdfDir)) {
        console.error(`\n❌ No se encontró la carpeta: ${pdfDir}`);
        return [];
    }
    
    const archivos = fs.readdirSync(pdfDir);
    const pdfs = archivos.filter(f => f.toLowerCase().endsWith('.pdf') && f.toLowerCase().includes('tabulador'));
    
    if (pdfs.length === 0) {
        console.log('\n❌ No se encontraron PDFs del tabulador');
        return [];
    }
    
    console.log(`\n📁 Total: ${pdfs.length} PDF(s)\n`);
    
    pdfs.forEach((pdf, idx) => {
        const pdfPath = path.join(pdfDir, pdf);
        const stats = fs.statSync(pdfPath);
        const sizeMB = (stats.size / 1024 / 1024).toFixed(2);
        const fecha = stats.mtime.toLocaleDateString('es-MX');
        
        console.log(`${idx + 1}. ${pdf}`);
        console.log(`   📊 Tamaño: ${sizeMB} MB`);
        console.log(`   📅 Modificado: ${fecha}`);
        console.log();
    });
    
    return pdfs.map(pdf => path.join(pdfDir, pdf));
}

function verificarPython() {
    console.log('\n🔍 VERIFICANDO HERRAMIENTAS...');
    console.log('─'.repeat(60));
    
    const { execSync } = require('child_process');
    
    try {
        // Verificar Python
        const pythonVersion = execSync('python --version', { encoding: 'utf-8' }).trim();
        console.log(`✅ Python: ${pythonVersion}`);
        
        // Verificar pdfplumber
        try {
            execSync('python -c "import pdfplumber"', { stdio: 'ignore' });
            console.log('✅ pdfplumber: Instalado');
            return true;
        } catch {
            console.log('❌ pdfplumber: NO instalado');
            console.log('\n💡 Instalar con: pip install pdfplumber pandas');
            return false;
        }
    } catch (error) {
        console.log('❌ Python: NO encontrado');
        console.log('\n💡 Instala Python desde: https://www.python.org/downloads/');
        return false;
    }
}

function mostrarInstrucciones() {
    console.log('\n' + '='.repeat(60));
    console.log('📋 OPCIONES PARA EXTRAER PDFs');
    console.log('='.repeat(60));
    
    console.log('\n1️⃣  SCRIPT PYTHON (Recomendado) ⭐');
    console.log('─'.repeat(60));
    console.log('\nPrimero instala las dependencias:');
    console.log('   pip install pdfplumber pandas');
    console.log('\nLuego ejecuta:');
    console.log('   python scripts/extraer-pdf-cdmx.py');
    console.log('\nEste script:');
    console.log('   ✅ Extrae tablas de todos los PDFs automáticamente');
    console.log('   ✅ Limpia y normaliza los datos');
    console.log('   ✅ Genera CSV listo para importar');
    
    console.log('\n\n2️⃣  TABULA (Herramienta Visual)');
    console.log('─'.repeat(60));
    console.log('\n1. Descargar Tabula: https://tabula.technology/');
    console.log('2. Abrir PDF en Tabula');
    console.log('3. Seleccionar tablas con el cursor');
    console.log('4. Exportar como CSV');
    console.log('5. Guardar en data/cdmx-tabulador-2025.csv');
    
    console.log('\n\n3️⃣  ADOBE ACROBAT');
    console.log('─'.repeat(60));
    console.log('\n1. Abrir PDF en Adobe Acrobat');
    console.log('2. Herramientas → Exportar PDF');
    console.log('3. Seleccionar "Hoja de cálculo" → Excel o CSV');
    console.log('4. Guardar en data/');
    
    console.log('\n\n4️⃣  HERRAMIENTAS ONLINE');
    console.log('─'.repeat(60));
    console.log('\n1. Buscar "PDF to Excel converter" online');
    console.log('2. Subir PDF');
    console.log('3. Descargar CSV/Excel');
    console.log('4. Guardar en data/');
}

function main() {
    const pdfs = listarPDFs();
    
    if (pdfs.length === 0) {
        return;
    }
    
    // Intentar verificar Python
    try {
        const tienePython = verificarPython();
        
        if (tienePython) {
            console.log('\n✅ TODO LISTO PARA EXTRAER PDFs');
            console.log('\n🚀 Ejecuta:');
            console.log('   python scripts/extraer-pdf-cdmx.py');
            console.log('\nEsto procesará todos los PDFs automáticamente.\n');
        } else {
            mostrarInstrucciones();
        }
    } catch {
        mostrarInstrucciones();
    }
    
    console.log('\n📝 DESPUÉS DE EXTRAER LOS PDFs:');
    console.log('─'.repeat(60));
    console.log('\nEjecuta el script de importación:');
    console.log('   node scripts/import-tabulador.js data/<archivo-csv>.csv --source cdmx --location CDMX');
    console.log();
}

main();

