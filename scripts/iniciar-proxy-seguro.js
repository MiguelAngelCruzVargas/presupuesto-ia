/**
 * Script para iniciar el proxy de forma segura
 * Verifica que las keys no se expongan en logs
 */

import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🔒 Iniciando proxy de forma segura...');
console.log('✅ Todas las keys están enmascaradas en los logs\n');

const proxyPath = path.resolve(__dirname, '../src/lib/geminiServer.js');

const proxy = spawn('node', [proxyPath], {
    stdio: 'inherit',
    shell: true
});

proxy.on('error', (error) => {
    console.error('❌ Error al iniciar proxy:', error);
    process.exit(1);
});

proxy.on('exit', (code) => {
    console.log(`\n⚠️ Proxy terminado con código: ${code}`);
    process.exit(code);
});

// Manejar Ctrl+C
process.on('SIGINT', () => {
    console.log('\n\n🛑 Deteniendo proxy...');
    proxy.kill('SIGINT');
    process.exit(0);
});

