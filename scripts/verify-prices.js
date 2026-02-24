
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function verify() {
    console.log('🔍 Verificando precios importados...');

    // Contar total
    const { count, error: countError } = await supabase
        .from('market_price_reference')
        .select('*', { count: 'exact', head: true });

    if (countError) {
        console.error('❌ Error contando registros:', countError);
        return;
    }

    console.log(`📊 Total de registros: ${count}`);

    // Buscar ejemplos
    const queries = ['Concreto', 'Acero', 'Muro', 'Excavación'];

    for (const q of queries) {
        const { data, error } = await supabase
            .from('market_price_reference')
            .select('description, base_price, unit, source, location')
            .ilike('description', `%${q}%`)
            .limit(3);

        if (error) {
            console.error(`❌ Error buscando "${q}":`, error);
            continue;
        }

        console.log(`\n🔎 Resultados para "${q}":`);
        if (data.length === 0) {
            console.log('   (Sin resultados)');
        } else {
            data.forEach(item => {
                console.log(`   - ${item.description.substring(0, 50)}... | $${item.base_price} / ${item.unit} | ${item.source} (${item.location})`);
            });
        }
    }
}

verify();
