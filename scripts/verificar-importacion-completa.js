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

async function verificar() {
    console.log('\n📊 VERIFICANDO IMPORTACIÓN');
    console.log('═'.repeat(60));
    
    // Contar todos los conceptos de construbase
    const { data: construba seData, error, count } = await supabase
        .from('market_price_reference')
        .select('*', { count: 'exact' })
        .eq('source', 'construbase_libre')
        .eq('is_active', true);
    
    if (error) {
        console.error('❌ Error:', error.message);
        return;
    }
    
    console.log(`\n✅ Conceptos de CONSTRUBASE en Supabase: ${count}`);
    
    // Contar únicos por descripción + unidad
    const unicos = new Set();
    if (construbaseData && Array.isArray(construbaseData)) {
        construba seData.forEach(item => {
            const key = `${(item.description || '').toLowerCase()}_${(item.unit || '').toLowerCase()}`;
            unicos.add(key);
        });
    }
    
    console.log(`🔑 Conceptos únicos (descripción + unidad): ${unicos.size}`);
    console.log(`\n📝 El Excel tiene 281 conceptos únicos`);
    console.log(`📝 Supabase tiene ${unicos.size} conceptos únicos de Construbase`);
    
    if (unicos.size < 281) {
        console.log(`\n⚠️  FALTAN ${281 - unicos.size} conceptos únicos por importar\n`);
    } else {
        console.log(`\n✅ Todos los conceptos únicos están importados\n`);
    }
}

verificar().catch(console.error);

