/**
 * Script para encontrar y listar todos los textos con colores grises en modo oscuro
 * que necesitan mejor contraste
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dashboardPath = path.join(__dirname, '../src/pages/Dashboard.jsx');
const content = fs.readFileSync(dashboardPath, 'utf8');

// Encontrar todos los casos de dark:text-slate-300, 400, 500
const greyMatches = content.matchAll(/dark:text-slate-[3-5]00/g);

console.log('Textos grises encontrados que necesitan mejor contraste:');
let count = 0;
for (const match of greyMatches) {
    count++;
    console.log(`- ${match[0]}`);
}

console.log(`\nTotal encontrados: ${count}`);

