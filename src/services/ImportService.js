import * as XLSX from 'xlsx';
import { generateId } from '../utils/helpers';

export class ImportService {
    /**
     * Import catalog from Excel/CSV
     */
    static async importCatalogFromFile(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();

            reader.onload = (e) => {
                try {
                    const data = new Uint8Array(e.target.result);
                    const workbook = XLSX.read(data, { type: 'array' });

                    const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
                    const jsonData = XLSX.utils.sheet_to_json(firstSheet);

                    // Map to catalog format
                    const catalogItems = jsonData.map(row => ({
                        id: generateId(),
                        description: row['Descripción'] || row['Description'] || row['descripcion'] || '',
                        unit: row['Unidad'] || row['Unit'] || row['unidad'] || 'pza',
                        unitPrice: parseFloat(row['Precio Unitario'] || row['Unit Price'] || row['precio'] || 0),
                        category: row['Categoría'] || row['Category'] || row['categoria'] || 'Materiales',
                        subcategory: row['Subcategoría'] || row['Subcategory'] || row['subcategoria'] || ''
                    })).filter(item => item.description); // Filter out empty rows

                    resolve(catalogItems);
                } catch (error) {
                    reject(new Error('Error al procesar el archivo. Verifica el formato.'));
                }
            };

            reader.onerror = () => reject(new Error('Error al leer el archivo'));
            reader.readAsArrayBuffer(file);
        });
    }

    /**
     * Import budget items from Excel/CSV
     */
    static async importBudgetFromFile(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();

            reader.onload = (e) => {
                try {
                    const data = new Uint8Array(e.target.result);
                    const workbook = XLSX.read(data, { type: 'array' });

                    const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
                    const jsonData = XLSX.utils.sheet_to_json(firstSheet);

                    // Map to budget items format
                    const budgetItems = jsonData.map((row, index) => ({
                        id: generateId(),
                        description: row['Descripción'] || row['Description'] || row['descripcion'] || '',
                        unit: row['Unidad'] || row['Unit'] || row['unidad'] || 'pza',
                        quantity: parseFloat(row['Cantidad'] || row['Quantity'] || row['cantidad'] || 1),
                        unitPrice: parseFloat(row['Precio Unitario'] || row['Unit Price'] || row['precio'] || 0),
                        category: row['Categoría'] || row['Category'] || row['categoria'] || 'Materiales',
                        subcategory: row['Subcategoría'] || row['Subcategory'] || row['subcategoria'] || '',
                        tags: [],
                        notes: row['Notas'] || row['Notes'] || row['notas'] || '',
                        order_index: index
                    })).filter(item => item.description);

                    resolve(budgetItems);
                } catch (error) {
                    reject(new Error('Error al procesar el archivo. Verifica el formato.'));
                }
            };

            reader.onerror = () => reject(new Error('Error al leer el archivo'));
            reader.readAsArrayBuffer(file);
        });
    }

    /**
     * Generate Excel template for catalog import
     */
    static downloadCatalogTemplate() {
        const template = [
            ['Descripción', 'Unidad', 'Precio Unitario', 'Categoría', 'Subcategoría'],
            ['Cemento gris 50kg', 'bulto', 250.00, 'Materiales', 'Aglomerantes'],
            ['Oficial albañil', 'jor', 450.00, 'Mano de Obra', 'Albañilería'],
            ['Revolvedora 1 saco', 'día', 180.00, 'Equipos', 'Mezclado']
        ];

        const workbook = XLSX.utils.book_new();
        const worksheet = XLSX.utils.aoa_to_sheet(template);

        worksheet['!cols'] = [
            { wch: 60 },
            { wch: 10 },
            { wch: 15 },
            { wch: 20 },
            { wch: 20 }
        ];

        XLSX.utils.book_append_sheet(workbook, worksheet, 'Plantilla');
        XLSX.writeFile(workbook, 'Plantilla_Catalogo.xlsx');
    }

    /**
     * Generate Excel template for budget import
     */
    static downloadBudgetTemplate() {
        const template = [
            ['Descripción', 'Unidad', 'Cantidad', 'Precio Unitario', 'Categoría', 'Subcategoría', 'Notas'],
            ['Trazo y nivelación', 'm2', 100, 15.50, 'Mano de Obra', 'Preliminares', ''],
            ['Excavación a mano', 'm3', 25, 280.00, 'Obra Civil', 'Cimentación', ''],
            ['Muro de block 15cm', 'm2', 80, 420.00, 'Obra Civil', 'Muros', '']
        ];

        const workbook = XLSX.utils.book_new();
        const worksheet = XLSX.utils.aoa_to_sheet(template);

        worksheet['!cols'] = [
            { wch: 60 },
            { wch: 10 },
            { wch: 12 },
            { wch: 15 },
            { wch: 20 },
            { wch: 20 },
            { wch: 30 }
        ];

        XLSX.utils.book_append_sheet(workbook, worksheet, 'Plantilla');
        XLSX.writeFile(workbook, 'Plantilla_Presupuesto.xlsx');
    }
}

export default ImportService;
