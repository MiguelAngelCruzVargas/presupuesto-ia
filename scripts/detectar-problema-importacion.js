import { createClient } from '@supabase/supabase-js';
import XLSX from 'xlsx';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const envPath = path.resolve(__dirname, '../.env');
if (fs.existsSync(envPath)) {
    dotenv.config({ path: envPath });
}

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Variables de entorno no encontradas');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function detectarProblema() {
    console.log('\n🔍 DETECTANDO PROBLEMA DE IMPORTACIÓN');
    console.log('═'.repeat(60));
    
    // Leer Excel
    const excelPath = path.resolve(__dirname, '../pdf de precios/precios neodata.xlsx');
    const workbook = XLSX.readFile(excelPath);
    const worksheet = workbook.Sheets[workbook.SheetNames[0]];
    const excelData = XLSX.utils.sheet_to_json(worksheet);
    
    console.log(`📊 Conceptos en Excel: ${excelData.length}`);
    
    // Contar únicos por descripción + unidad
    const unicosExcel = new Map();
    excelData.forEach((row, idx) => {
        const desc = (row['Descripción Completa'] || row['Descripción'] || '').trim();
        const unit = (row['Unidad'] || 'pza').trim();
        const price = parseFloat((row['Precio'] || row['Precio Unitario'] || 0).toString().replace(/[^0-9.-]/g, ''));
        
        if (!desc || desc.length === 0) return;
        if (isNaN(price) || price <= 0) return;
        
        const key = `${desc.toLowerCase()}_${unit.toLowerCase()}`;
        if (!unicosExcel.has(key)) {
            unicosExcel.set(key, { desc, unit, price, row: idx + 2 });
        }
    });
    
    console.log(`🔑 Conceptos únicos en Excel (descripción + unidad): ${unicosExcel.size}`);
    
    // Obtener todos los conceptos de Construbase de Supabase
    const { data: supabaseData, error } = await supabase
        .from('market_price_reference')
        .select('description, unit, category, location')
        .eq('source', 'construbase_libre')
        .eq('is_active', true);
    
    if (error) {
        console.error('❌ Error:', error.message);
        return;
    }
    
    console.log(`📊 Conceptos de Construbase en Supabase: ${supabaseData.length}`);
    
    // Contar únicos en Supabase
    const unicosSupabase = new Set();
    supabaseData.forEach(item => {
        const key = `${(item.description || '').toLowerCase()}_${(item.unit || '').toLowerCase()}`;
        unicosSupabase.add(key);
    });
    
    console.log(`🔑 Conceptos únicos en Supabase (descripción + unidad): ${unicosSupabase.size}`);
    
    // Encontrar faltantes
    const faltantes = [];
    unicosExcel.forEach((value, key) => {
        if (!unicosSupabase.has(key)) {
            faltantes.push(value);
        }
    });
    
    console.log(`\n⚠️  Conceptos únicos del Excel que NO están en Supabase: ${faltantes.length}`);
    
    if (faltantes.length > 0 && faltantes.length <= 10) {
        console.log(`\n📋 Primeros ${faltantes.length} faltantes:`);
        faltantes.forEach((item, idx) => {
            console.log(`\n${idx + 1}. Fila ${item.row}: ${item.desc.substring(0, 60)}...`);
            console.log(`   Unidad: ${item.unit} | Precio: ${item.price}`);
        });
    } else if (faltantes.length > 10) {
        console.log(`\n📋 Mostrando primeros 10 de ${faltantes.length} faltantes:`);
        faltantes.slice(0, 10).forEach((item, idx) => {
            console.log(`\n${idx + 1}. Fila ${item.row}: ${item.desc.substring(0, 60)}...`);
            console.log(`   Unidad: ${item.unit} | Precio: ${item.price}`);
        });
    }
    
    console.log(`\n✅ Verificación completada\n`);
}

detectarProblema().catch(console.error);

