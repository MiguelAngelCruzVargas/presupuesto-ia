import XLSX from 'xlsx';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Cargar .env
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

async function verificarFaltantes() {
    console.log('\n🔍 VERIFICANDO CONCEPTOS FALTANTES');
    console.log('═'.repeat(60));
    
    // Leer Excel
    const excelPath = path.resolve(__dirname, '../pdf de precios/precios neodata.xlsx');
    const workbook = XLSX.readFile(excelPath);
    const worksheet = workbook.Sheets[workbook.SheetNames[0]];
    const excelData = XLSX.utils.sheet_to_json(worksheet);
    
    console.log(`📊 Conceptos en Excel: ${excelData.length}`);
    
    // Obtener conceptos importados de Supabase
    const { data: supabaseData, error } = await supabase
        .from('market_price_reference')
        .select('description, unit, base_price')
        .eq('source', 'construbase_libre')
        .eq('is_active', true);
    
    if (error) {
        console.error('❌ Error consultando Supabase:', error.message);
        return;
    }
    
    console.log(`📊 Conceptos en Supabase: ${supabaseData.length}`);
    
    // Crear set de descripciones de Supabase para búsqueda rápida
    const supabaseDescriptions = new Set(
        supabaseData.map(item => `${item.description.trim().toLowerCase()}_${item.unit}`)
    );
    
    // Buscar faltantes
    const faltantes = [];
    
    for (const row of excelData) {
        const desc = (row['Descripción Completa'] || row['Descripción'] || '').trim();
        const unit = (row['Unidad'] || 'pza').trim();
        const price = parseFloat((row['Precio'] || row['Precio Unitario'] || 0).toString().replace(/[^0-9.-]/g, ''));
        
        if (!desc || desc.length === 0) continue;
        if (isNaN(price) || price <= 0) {
            faltantes.push({
                descripcion: desc.substring(0, 60),
                unidad: unit,
                precio: price,
                razon: 'Precio inválido o faltante'
            });
            continue;
        }
        
        const key = `${desc.toLowerCase()}_${unit}`;
        if (!supabaseDescriptions.has(key)) {
            faltantes.push({
                descripcion: desc.substring(0, 60),
                unidad: unit,
                precio: price,
                razon: 'No encontrado en Supabase'
            });
        }
    }
    
    console.log(`\n⚠️  Conceptos faltantes o con problemas: ${faltantes.length}`);
    
    if (faltantes.length > 0) {
        console.log('\n📋 Primeros 20 faltantes:');
        faltantes.slice(0, 20).forEach((item, idx) => {
            console.log(`\n${idx + 1}. ${item.descripcion}...`);
            console.log(`   Unidad: ${item.unidad} | Precio: ${item.precio} | Razón: ${item.razon}`);
        });
    }
    
    console.log(`\n✅ Verificación completada\n`);
}

verificarFaltantes().catch(console.error);

