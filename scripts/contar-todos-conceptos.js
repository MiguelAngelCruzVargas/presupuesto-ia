import { createClient } from '@supabase/supabase-js';
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

async function contarTodos() {
    console.log('\n📊 CONTANDO TODOS LOS CONCEPTOS EN LA BASE MAESTRA');
    console.log('═'.repeat(60));
    
    // Contar todos los conceptos activos
    const { data: allData, error, count } = await supabase
        .from('market_price_reference')
        .select('source', { count: 'exact' })
        .eq('is_active', true);
    
    if (error) {
        console.error('❌ Error:', error.message);
        return;
    }
    
    console.log(`\n✅ TOTAL de conceptos activos en la base maestra: ${count}`);
    
    // Contar por fuente
    const porFuente = {};
    allData.forEach(item => {
        const fuente = item.source || 'sin_fuente';
        porFuente[fuente] = (porFuente[fuente] || 0) + 1;
    });
    
    console.log(`\n📊 Desglose por fuente:`);
    Object.entries(porFuente).forEach(([fuente, cantidad]) => {
        console.log(`   - ${fuente}: ${cantidad} conceptos`);
    });
    
    // Contar específicamente Construbase
    const { count: construbaseCount } = await supabase
        .from('market_price_reference')
        .select('*', { count: 'exact', head: true })
        .eq('source', 'construbase_libre')
        .eq('is_active', true);
    
    console.log(`\n🔍 Conceptos de CONSTRUBASE: ${construbaseCount}`);
    
    console.log(`\n💡 Nota: El Excel tiene 281 conceptos únicos de Construbase`);
    if (construbaseCount < 281) {
        console.log(`⚠️  FALTAN ${281 - construbaseCount} conceptos de Construbase por importar\n`);
    } else {
        console.log(`✅ Todos los conceptos de Construbase están importados\n`);
    }
}

contarTodos().catch(console.error);

