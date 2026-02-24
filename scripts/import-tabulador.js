/**
 * Script de Importación de Tabuladores de Precios
 * 
 * Permite importar precios desde archivos CSV/Excel de:
 * - Tabulador Oficial CDMX
 * - CONSTRUBASE-LIBRE
 * 
 * Uso:
 *   node scripts/import-tabulador.js <archivo.csv> --source <cdmx|construbase> --location <CDMX|México>
 * 
 * Ejemplo:
 *   node scripts/import-tabulador.js data/cdmx-tabulador-2025.csv --source cdmx --location CDMX
 *   node scripts/import-tabulador.js data/construbase-libre.xlsx --source construbase --location México
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import XLSX from 'xlsx';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
// Helper para obtener año actual (local para evitar dependencias)
function getCurrentYear() {
    return new Date().getFullYear();
}

// Configuración de rutas ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Cargar variables de entorno (buscar en múltiples ubicaciones)
const envPaths = [
    path.resolve(__dirname, '../.env'),
    path.resolve(process.cwd(), '.env')
];

for (const envPath of envPaths) {
    if (fs.existsSync(envPath)) {
        dotenv.config({ path: envPath });
        break;
    }
}

// Configurar Supabase
const supabaseUrl = process.env.VITE_SUPABASE_URL;
// Intentar usar service_role key (bypass RLS) o anon key
const supabaseKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Error: Variables de entorno requeridas:');
    console.error('   - VITE_SUPABASE_URL');
    console.error('   - VITE_SUPABASE_ANON_KEY (mínimo)');
    console.error('   - VITE_SUPABASE_SERVICE_ROLE_KEY (recomendado para importaciones masivas)');
    console.error('\n💡 Tip: Para importaciones masivas, usa VITE_SUPABASE_SERVICE_ROLE_KEY para bypassar RLS');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: {
        persistSession: false,
        autoRefreshToken: false
    }
});

// Configuración de fuentes
const SOURCES = {
    cdmx: {
        name: 'cdmx_tabulador',
        displayName: 'Tabulador Oficial CDMX',
        defaultLocation: 'CDMX'
    },
    construbase: {
        name: 'construbase_libre',
        displayName: 'CONSTRUBASE-LIBRE',
        defaultLocation: 'México'
    }
};

// Mapeo de unidades comunes
const UNIT_MAPPING = {
    'M2': 'm2',
    'M': 'm',
    'M3': 'm3',
    'M²': 'm2',
    'M³': 'm3',
    'PZA': 'pza',
    'PIEZA': 'pza',
    'JOR': 'jor',
    'JORNAL': 'jor',
    'HR': 'hora',
    'HORA': 'hora',
    'HRS': 'hora',
    'MES': 'mes',
    'KG': 'kg',
    'TON': 'ton',
    'L': 'l',
    'LITRO': 'l',
    'ML': 'ml',
    'MIL': 'ml',
    'GLB': 'glb',
    'GALON': 'glb'
};

// Mapeo de categorías
const CATEGORY_MAPPING = {
    'MATERIALES': 'Materiales',
    'MATERIAL': 'Materiales',
    'MANO DE OBRA': 'Mano de Obra',
    'MANO DE OBRA': 'Mano de Obra',
    'OBRA CIVIL': 'Obra Civil',
    'INSTALACIONES': 'Instalaciones',
    'INSTALACION': 'Instalaciones',
    'EQUIPOS': 'Equipos',
    'EQUIPO': 'Equipos',
    'HERRAMIENTA': 'Equipos'
};

/**
 * Normalizar unidad de medida
 */
function normalizeUnit(unit) {
    if (!unit) return 'pza';
    const normalized = unit.trim().toUpperCase();
    return UNIT_MAPPING[normalized] || normalized.toLowerCase();
}

/**
 * Normalizar categoría
 */
function normalizeCategory(category, description = '') {
    if (!category) {
        // Inferir categoría desde descripción
        const desc = (description || '').toLowerCase();
        if (desc.includes('oficial') || desc.includes('ayudante') || desc.includes('jornal')) {
            return 'Mano de Obra';
        }
        if (desc.includes('excavación') || desc.includes('cimentación') || desc.includes('mampostería') || desc.includes('aplanado')) {
            return 'Obra Civil';
        }
        if (desc.includes('eléctric') || desc.includes('hidráulic') || desc.includes('plomería')) {
            return 'Instalaciones';
        }
        if (desc.includes('revolvedora') || desc.includes('vibrador') || desc.includes('equipo')) {
            return 'Equipos';
        }
        return 'Materiales';
    }
    
    const normalized = category.trim().toUpperCase();
    return CATEGORY_MAPPING[normalized] || 'Materiales';
}

/**
 * Leer archivo CSV (mejorado para manejar diferentes formatos)
 */
function readCSV(filePath) {
    try {
        const content = fs.readFileSync(filePath, 'utf-8');
        const lines = content.split(/\r?\n/).filter(line => line.trim());
        
        if (lines.length === 0) {
            throw new Error('Archivo CSV vacío');
        }
        
        // Detectar delimitador (contar cuál tiene más ocurrencias)
        const commaCount = (lines[0].match(/,/g) || []).length;
        const semicolonCount = (lines[0].match(/;/g) || []).length;
        const tabCount = (lines[0].match(/\t/g) || []).length;
        
        let delimiter = ',';
        if (semicolonCount > commaCount && semicolonCount > tabCount) {
            delimiter = ';';
        } else if (tabCount > commaCount && tabCount > semicolonCount) {
            delimiter = '\t';
        }
        
        // Función para parsear línea CSV (maneja comillas y delimitadores dentro de comillas)
        function parseCSVLine(line) {
            const result = [];
            let current = '';
            let inQuotes = false;
            
            for (let i = 0; i < line.length; i++) {
                const char = line[i];
                const nextChar = line[i + 1];
                
                if (char === '"') {
                    if (inQuotes && nextChar === '"') {
                        current += '"';
                        i++; // Saltar siguiente comilla
                    } else {
                        inQuotes = !inQuotes;
                    }
                } else if (char === delimiter && !inQuotes) {
                    result.push(current.trim());
                    current = '';
                } else {
                    current += char;
                }
            }
            result.push(current.trim()); // Agregar último campo
            return result;
        }
        
        // Leer encabezados
        const headers = parseCSVLine(lines[0]).map(h => h.replace(/^"|"$/g, '').trim());
        
        if (headers.length === 0) {
            throw new Error('No se pudieron leer los encabezados del CSV');
        }
        
        // Leer datos
        const records = [];
        for (let i = 1; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line) continue; // Saltar líneas vacías
            
            const values = parseCSVLine(line).map(v => v.replace(/^"|"$/g, '').trim());
            
            // Validar que tenga suficientes campos
            if (values.length >= headers.length || (values.length > 0 && values.some(v => v))) {
                const record = {};
                headers.forEach((header, idx) => {
                    record[header] = values[idx] || '';
                });
                
                // Solo agregar si tiene al menos un campo con valor
                if (Object.values(record).some(v => v && v.toString().trim())) {
                    records.push(record);
                }
            }
        }
        
        return records;
    } catch (error) {
        throw new Error(`Error leyendo CSV: ${error.message}`);
    }
}

/**
 * Leer archivo Excel
 */
function readExcel(filePath) {
    try {
        const workbook = XLSX.readFile(filePath);
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        return XLSX.utils.sheet_to_json(worksheet);
    } catch (error) {
        throw new Error(`Error leyendo Excel: ${error.message}`);
    }
}

/**
 * Mapear registro a formato de precio de referencia
 */
function mapRecordToPrice(record, sourceConfig, location, year) {
    // Intentar diferentes nombres de columnas comunes
    const description = record['Descripción'] || record['DESCRIPCION'] || record['Descripción Completa'] || 
                        record['descripcion'] || record['Concepto'] || record['CONCEPTO'] || '';
    
    const unit = record['Unidad'] || record['UNIDAD'] || record['unidad'] || 
                 record['U'] || record['UM'] || 'pza';
    
    const priceStr = record['Precio'] || record['PRECIO'] || record['Precio Unitario'] || 
                     record['Precio Unitario (MXN)'] || record['precio'] || record['Importe'] || 
                     record['Costo'] || '0';
    
    const category = record['Categoría'] || record['CATEGORIA'] || record['Categoria'] || 
                     record['categoria'] || record['Clase'] || '';
    
    const partida = record['Partida'] || record['PARTIDA'] || record['partida'] || '';
    const renglon = record['Renglón'] || record['RENGLON'] || record['renglon'] || record['Renglon'] || '';
    const n = record['N'] || record['n'] || null;
    const codigo = record['Código'] || record['CODIGO'] || record['codigo'] || '';
    const codigoAuxiliar = record['Código Auxiliar'] || record['Codigo Auxiliar'] || record['CódigoAuxiliar'] || record['CodigoAuxiliar'] || '';
    const textoAuxiliar = record['Texto Auxiliar'] || record['TextoAuxiliar'] || record['Texto Auxiliar'] || '';
    const descripcionPartida = record['Descripción de la Partida'] || record['Descripcion de la Partida'] || record['DescripcionPartida'] || record['Descripción de la Partida'] || '';
    const tipo = record['Tipo'] || record['TIPO'] || record['tipo'] || null;
    const cantidad = record['Cantidad'] || record['CANTIDAD'] || record['cantidad'] || null;
    const importe = record['Importe'] || record['IMPORTE'] || record['importe'] || null;
    const costo = record['Costo'] || record['COSTO'] || record['costo'] || null;
    const correoNube = record['Correo Nube'] || record['CorreoNube'] || record['correo nube'] || null;
    const maestroNube = record['Maestro Nube'] || record['MaestroNube'] || record['maestro nube'] || null;

    // Validar campos requeridos
    if (!description || !description.trim()) {
        return null;
    }

    const price = parseFloat(priceStr.toString().replace(/[^0-9.-]/g, ''));
    if (isNaN(price) || price <= 0) {
        return null;
    }

    // Crear objeto de precio con metadata completo
    return {
        description: description.trim(),
        unit: normalizeUnit(unit),
        category: normalizeCategory(category, description),
        location: location || sourceConfig.defaultLocation,
        base_price: price,
        price_range: {
            min: price * 0.95,
            max: price * 1.05,
            avg: price
        },
        source: sourceConfig.name,
        metadata: {
            year: year,
            official: true,
            // Campos del Excel de Neodata
            partida: partida || null,
            renglon: renglon || null,
            n: n !== null ? (typeof n === 'number' ? n : parseInt(n)) : null,
            codigo: codigo || null,
            codigo_auxiliar: codigoAuxiliar || null,
            texto_auxiliar: textoAuxiliar || null,
            descripcion_partida: descripcionPartida || null,
            tipo: tipo !== null ? (typeof tipo === 'number' ? tipo : parseInt(tipo)) : null,
            cantidad: cantidad ? parseFloat(cantidad) : null,
            importe: importe ? parseFloat(importe.toString().replace(/[^0-9.-]/g, '')) : null,
            costo: costo ? parseFloat(costo.toString().replace(/[^0-9.-]/g, '')) : null,
            correo_nube: correoNube || null,
            maestro_nube: maestroNube || null,
            tabulador_version: `${sourceConfig.displayName} ${year}`,
            imported_at: new Date().toISOString()
        }
    };
}

/**
 * Importar precios a Supabase
 */
async function importPrice(priceData) {
    try {
        // Buscar si ya existe
        const { data: existing } = await supabase
            .from('market_price_reference')
            .select('id')
            .eq('description', priceData.description)
            .eq('unit', priceData.unit)
            .eq('category', priceData.category)
            .eq('location', priceData.location)
            .eq('source', priceData.source)
            .single();

        const priceRecord = {
            description: priceData.description,
            unit: priceData.unit,
            category: priceData.category,
            location: priceData.location,
            base_price: priceData.base_price,
            price_range: priceData.price_range,
            source: priceData.source,
            metadata: priceData.metadata,
            is_active: true,
            last_updated: new Date().toISOString()
        };

        if (existing) {
            // Actualizar existente
            const { error } = await supabase
                .from('market_price_reference')
                .update(priceRecord)
                .eq('id', existing.id);

            if (error) throw error;
            return { action: 'updated', data: priceRecord };
        } else {
            // Crear nuevo
            const { data, error } = await supabase
                .from('market_price_reference')
                .insert([priceRecord])
                .select()
                .single();

            if (error) throw error;
            return { action: 'created', data };
        }
    } catch (error) {
        if (error.code === 'PGRST116') {
            // No existe, crear nuevo
            const { data, error: insertError } = await supabase
                .from('market_price_reference')
                .insert([{
                    ...priceData,
                    is_active: true,
                    last_updated: new Date().toISOString()
                }])
                .select()
                .single();

            if (insertError) throw insertError;
            return { action: 'created', data };
        }
        throw error;
    }
}

/**
 * Procesar e importar archivo
 */
async function importFile(filePath, source, location) {
    const sourceConfig = SOURCES[source];
    if (!sourceConfig) {
        throw new Error(`Fuente desconocida: ${source}. Use 'cdmx' o 'construbase'`);
    }

    if (!fs.existsSync(filePath)) {
        throw new Error(`Archivo no encontrado: ${filePath}`);
    }

    console.log('\n📊 INICIANDO IMPORTACIÓN');
    console.log('═'.repeat(60));
    console.log(`📁 Archivo: ${path.basename(filePath)}`);
    console.log(`🔖 Fuente: ${sourceConfig.displayName}`);
    console.log(`📍 Ubicación: ${location || sourceConfig.defaultLocation}`);
    console.log(`📅 Año: ${getCurrentYear()}`);
    console.log('═'.repeat(60));

    // Leer archivo
    console.log('\n📖 Leyendo archivo...');
    const extension = path.extname(filePath).toLowerCase();
    let records;

    if (extension === '.csv') {
        records = readCSV(filePath);
    } else if (extension === '.xlsx' || extension === '.xls') {
        records = readExcel(filePath);
    } else {
        throw new Error(`Formato no soportado: ${extension}. Use .csv, .xlsx o .xls`);
    }

    console.log(`   ✅ ${records.length} registros leídos`);

    // Procesar registros
    console.log('\n🔄 Procesando registros...');
    const prices = [];
    const errors = [];
    const year = getCurrentYear();
    const finalLocation = location || sourceConfig.defaultLocation;

    for (let i = 0; i < records.length; i++) {
        const record = records[i];
        try {
            const priceData = mapRecordToPrice(record, sourceConfig, finalLocation, year);
            if (priceData) {
                prices.push(priceData);
            }
        } catch (error) {
            errors.push({ row: i + 2, error: error.message, record });
        }

        // Mostrar progreso cada 100 registros
        if ((i + 1) % 100 === 0) {
            process.stdout.write(`   Procesados: ${i + 1}/${records.length}\r`);
        }
    }

    console.log(`   ✅ ${prices.length} precios válidos procesados`);
    if (errors.length > 0) {
        console.log(`   ⚠️  ${errors.length} registros con errores`);
    }

    // Importar a Supabase
    console.log('\n💾 Importando a base de datos...');
    let imported = 0;
    let updated = 0;
    let failed = 0;

    for (let i = 0; i < prices.length; i++) {
        const price = prices[i];
        try {
            const result = await importPrice(price);
            if (result.action === 'created') {
                imported++;
            } else {
                updated++;
            }
        } catch (error) {
            failed++;
            errors.push({ 
                row: i + 1, 
                error: error.message, 
                description: price.description 
            });
        }

        // Mostrar progreso cada 50 precios
        if ((i + 1) % 50 === 0) {
            process.stdout.write(`   Importados: ${i + 1}/${prices.length} (C: ${imported}, U: ${updated}, E: ${failed})\r`);
        }
    }

    // Resumen
    console.log('\n\n✅ IMPORTACIÓN COMPLETADA');
    console.log('═'.repeat(60));
    console.log(`✅ Creados:    ${imported}`);
    console.log(`🔄 Actualizados: ${updated}`);
    console.log(`❌ Errores:    ${failed}`);
    console.log(`📊 Total:      ${prices.length}`);
    console.log('═'.repeat(60));

    if (errors.length > 0 && errors.length <= 20) {
        console.log('\n⚠️  ERRORES ENCONTRADOS:');
        errors.slice(0, 20).forEach(err => {
            console.log(`   Fila ${err.row}: ${err.error}`);
        });
        if (errors.length > 20) {
            console.log(`   ... y ${errors.length - 20} errores más`);
        }
    }

    return {
        imported,
        updated,
        failed,
        total: prices.length,
        errors
    };
}

// Ejecutar script
const args = process.argv.slice(2);

if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
    console.log(`
📦 Script de Importación de Tabuladores de Precios

Uso:
  node scripts/import-tabulador.js <archivo> [opciones]

Argumentos:
  <archivo>          Ruta al archivo CSV o Excel a importar

Opciones:
  --source <tipo>    Tipo de tabulador: 'cdmx' o 'construbase' (requerido)
  --location <loc>   Ubicación: 'CDMX', 'México', etc. (opcional, usa default según fuente)
  --help, -h         Mostrar esta ayuda

Ejemplos:
  node scripts/import-tabulador.js data/cdmx-2025.csv --source cdmx --location CDMX
  node scripts/import-tabulador.js data/construbase.xlsx --source construbase
  node scripts/import-tabulador.js tabulador.csv --source cdmx --location "Ciudad de México"

Notas:
  - El archivo debe tener columnas: Descripción, Unidad, Precio
  - Se detectarán automáticamente variaciones de nombres de columnas
  - Los precios duplicados se actualizarán automáticamente
    `);
    process.exit(0);
}

const filePath = args[0];
const sourceIndex = args.indexOf('--source');
const locationIndex = args.indexOf('--location');

if (!filePath) {
    console.error('❌ Error: Debes especificar la ruta al archivo');
    process.exit(1);
}

const source = sourceIndex !== -1 ? args[sourceIndex + 1] : null;
const location = locationIndex !== -1 ? args[locationIndex + 1] : null;

if (!source || !SOURCES[source]) {
    console.error('❌ Error: Debes especificar --source con valor "cdmx" o "construbase"');
    process.exit(1);
}

// Ejecutar importación
importFile(filePath, source, location)
    .then(() => {
        console.log('\n✨ Proceso completado exitosamente\n');
        process.exit(0);
    })
    .catch(error => {
        console.error('\n❌ ERROR:', error.message);
        if (error.stack) {
            console.error('\nStack trace:', error.stack);
        }
        process.exit(1);
    });

