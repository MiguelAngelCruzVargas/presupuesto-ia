/**
 * Script para verificar que las API keys estén configuradas correctamente
 * Ejecutar con: node scripts/verificar-api-keys.js
 */

import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Cargar variables de entorno
const envPath = path.resolve(__dirname, '../.env');
if (fs.existsSync(envPath)) {
    dotenv.config({ path: envPath });
} else {
    console.error('❌ No se encontró el archivo .env');
    process.exit(1);
}

console.log('\n🔍 VERIFICANDO CONFIGURACIÓN DE API KEYS');
console.log('═'.repeat(60));

// Verificar keys gratuitas
const freeKeys = [];
if (process.env.GEMINI_API_KEY_FREE_1) freeKeys.push('GEMINI_API_KEY_FREE_1');
if (process.env.GEMINI_API_KEY_FREE_2) freeKeys.push('GEMINI_API_KEY_FREE_2');
if (process.env.GEMINI_API_KEY_FREE_3) freeKeys.push('GEMINI_API_KEY_FREE_3');

console.log(`\n📋 Keys GRATUITAS encontradas: ${freeKeys.length}/3`);
freeKeys.forEach(key => {
    const value = process.env[key];
    const masked = value ? `${value.substring(0, 10)}...${value.slice(-4)}` : 'NO CONFIGURADA';
    console.log(`   ✅ ${key}: ${masked}`);
});

if (freeKeys.length === 0) {
    console.log('   ⚠️  No se encontraron keys gratuitas configuradas');
}

// Verificar keys PRO (opcionales por ahora)
const proKeys = [];
if (process.env.GEMINI_API_KEY_PRO_1) proKeys.push('GEMINI_API_KEY_PRO_1');
if (process.env.GEMINI_API_KEY_PRO_2) proKeys.push('GEMINI_API_KEY_PRO_2');

console.log(`\n📋 Keys PRO (pagas) encontradas: ${proKeys.length}`);
proKeys.forEach(key => {
    const value = process.env[key];
    const masked = value ? `${value.substring(0, 10)}...${value.slice(-4)}` : 'NO CONFIGURADA';
    console.log(`   ✅ ${key}: ${masked}`);
});

// Verificar keys por funcionalidad (opcionales)
const functionKeys = [];
if (process.env.GEMINI_API_KEY_BUDGET) functionKeys.push('GEMINI_API_KEY_BUDGET');
if (process.env.GEMINI_API_KEY_SCHEDULE) functionKeys.push('GEMINI_API_KEY_SCHEDULE');
if (process.env.GEMINI_API_KEY_PRICES) functionKeys.push('GEMINI_API_KEY_PRICES');

console.log(`\n📋 Keys por función encontradas: ${functionKeys.length}`);
functionKeys.forEach(key => {
    const value = process.env[key];
    const masked = value ? `${value.substring(0, 10)}...${value.slice(-4)}` : 'NO CONFIGURADA';
    console.log(`   ✅ ${key}: ${masked}`);
});

// Verificar key genérica (fallback)
const genericKey = process.env.GEMINI_API_KEY;
if (genericKey) {
    const masked = `${genericKey.substring(0, 10)}...${genericKey.slice(-4)}`;
    console.log(`\n📋 Key genérica (fallback): ${masked}`);
} else {
    console.log(`\n📋 Key genérica: No configurada (opcional si tienes keys específicas)`);
}

// Resumen
console.log('\n📊 RESUMEN:');
console.log('─'.repeat(60));

if (freeKeys.length >= 3) {
    console.log('✅ Excelente: Tienes 3 keys gratuitas configuradas');
    console.log('   → Podrás distribuir la carga entre ellas');
} else if (freeKeys.length >= 1) {
    console.log(`✅ Bien: Tienes ${freeKeys.length} key(s) gratuita(s) configurada(s)`);
    if (freeKeys.length < 3) {
        console.log('   💡 Tip: Puedes agregar más keys gratuitas para distribuir mejor la carga');
    }
} else {
    console.log('⚠️  No tienes keys gratuitas configuradas');
    console.log('   → Agrega al menos GEMINI_API_KEY_FREE_1 al archivo .env');
}

if (proKeys.length > 0) {
    console.log(`✅ Keys PRO configuradas: ${proKeys.length} (para usuarios premium)`);
}

console.log('\n💡 PRÓXIMOS PASOS:');
console.log('1. ✅ Variables de entorno configuradas (si ves las keys arriba)');
console.log('2. ⏳ Ejecutar migración de base de datos (para suscripciones)');
console.log('3. ⏳ Actualizar el proxy para usar ApiKeyManager');
console.log('4. ⏳ Probar que todo funcione');

console.log('\n✅ Verificación completada\n');

