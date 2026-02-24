import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { formatCurrency } from '../utils/format';
import { CalculationsService } from './CalculationsService';

export class ExportService {
    /**
     * Export budget to PDF
     */
    static exportToPDF(projectInfo, items, calculations) {
        const doc = new jsPDF();

        // Header
        doc.setFontSize(20);
        doc.setTextColor(30, 41, 59); // slate-800
        doc.text('PresuGenius Pro', 14, 20);

        doc.setFontSize(10);
        doc.setTextColor(100, 116, 139); // slate-500
        doc.text('Presupuesto Profesional de Construcción', 14, 27);

        // Project Info
        doc.setFontSize(12);
        doc.setTextColor(30, 41, 59);
        doc.text(`Proyecto: ${projectInfo.project}`, 14, 40);
        doc.text(`Cliente: ${projectInfo.client || 'N/A'}`, 14, 47);
        doc.text(`Tipo: ${projectInfo.type}`, 14, 54);
        doc.text(`Fecha: ${new Date().toLocaleDateString('es-MX')}`, 14, 61);

        // Items Table
        const tableData = items.map((item, index) => [
            index + 1,
            item.description,
            item.unit,
            item.quantity.toFixed(2),
            formatCurrency(item.unitPrice),
            formatCurrency(item.quantity * item.unitPrice)
        ]);

        autoTable(doc, {
            startY: 70,
            head: [['#', 'Descripción', 'Unidad', 'Cantidad', 'P.U.', 'Total']],
            body: tableData,
            theme: 'striped',
            headStyles: { fillColor: [59, 130, 246] }, // blue-600
            styles: { fontSize: 9 },
            columnStyles: {
                0: { cellWidth: 10 },
                1: { cellWidth: 80 },
                2: { cellWidth: 20 },
                3: { cellWidth: 25, halign: 'right' },
                4: { cellWidth: 30, halign: 'right' },
                5: { cellWidth: 30, halign: 'right' }
            }
        });

        // Summary
        const finalY = doc.lastAutoTable.finalY + 10;

        doc.setFontSize(10);
        doc.text('Subtotal:', 140, finalY);
        doc.text(formatCurrency(calculations.subtotal), 180, finalY, { align: 'right' });

        if (calculations.indirectCosts > 0) {
            doc.text(`Indirectos (${projectInfo.indirect_percentage}%):`, 140, finalY + 7);
            doc.text(formatCurrency(calculations.indirectCosts), 180, finalY + 7, { align: 'right' });
        }

        if (calculations.profit > 0) {
            doc.text(`Utilidad (${projectInfo.profit_percentage}%):`, 140, finalY + 14);
            doc.text(formatCurrency(calculations.profit), 180, finalY + 14, { align: 'right' });
        }

        doc.text(`IVA (${projectInfo.taxRate}%):`, 140, finalY + 21);
        doc.text(formatCurrency(calculations.tax), 180, finalY + 21, { align: 'right' });

        doc.setFontSize(12);
        doc.setFont(undefined, 'bold');
        doc.text('TOTAL:', 140, finalY + 30);
        doc.text(formatCurrency(calculations.total), 180, finalY + 30, { align: 'right' });

        // Footer
        doc.setFontSize(8);
        doc.setFont(undefined, 'normal');
        doc.setTextColor(148, 163, 184);
        doc.text('Generado con PresuGenius Pro - www.presugenius.com', 105, 285, { align: 'center' });

        // Save
        doc.save(`${projectInfo.project.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`);
    }

    /**
     * Export budget to Excel
     */
    static exportToExcel(projectInfo, items, calculations) {
        const workbook = XLSX.utils.book_new();

        // Project Info Sheet
        const infoData = [
            ['PresuGenius Pro - Presupuesto'],
            [],
            ['Proyecto:', projectInfo.project],
            ['Cliente:', projectInfo.client || 'N/A'],
            ['Tipo:', projectInfo.type],
            ['Fecha:', new Date().toLocaleDateString('es-MX')],
            ['Moneda:', projectInfo.currency],
            []
        ];

        // Items data
        const itemsHeader = ['#', 'Descripción', 'Categoría', 'Unidad', 'Cantidad', 'Precio Unitario', 'Total'];
        const itemsData = items.map((item, index) => [
            index + 1,
            item.description,
            item.category,
            item.unit,
            item.quantity,
            item.unitPrice,
            item.quantity * item.unitPrice
        ]);

        // Summary
        const summaryData = [
            [],
            ['', '', '', '', '', 'Subtotal:', calculations.subtotal],
        ];

        if (calculations.indirectCosts > 0) {
            summaryData.push(['', '', '', '', '', `Indirectos (${projectInfo.indirect_percentage}%):`, calculations.indirectCosts]);
        }

        if (calculations.profit > 0) {
            summaryData.push(['', '', '', '', '', `Utilidad (${projectInfo.profit_percentage}%):`, calculations.profit]);
        }

        summaryData.push(['', '', '', '', '', `IVA (${projectInfo.taxRate}%):`, calculations.tax]);
        summaryData.push(['', '', '', '', '', 'TOTAL:', calculations.total]);

        const sheetData = [...infoData, itemsHeader, ...itemsData, ...summaryData];

        const worksheet = XLSX.utils.aoa_to_sheet(sheetData);

        // Column widths
        worksheet['!cols'] = [
            { wch: 5 },
            { wch: 50 },
            { wch: 15 },
            { wch: 10 },
            { wch: 12 },
            { wch: 15 },
            { wch: 15 }
        ];

        XLSX.utils.book_append_sheet(workbook, worksheet, 'Presupuesto');

        // Save
        XLSX.writeFile(workbook, `${projectInfo.project.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.xlsx`);
    }

    /**
     * Export catalog to Excel
     */
    static exportCatalogToExcel(catalogItems) {
        const workbook = XLSX.utils.book_new();

        const header = ['Descripción', 'Unidad', 'Precio Unitario', 'Categoría', 'Subcategoría'];
        const data = catalogItems.map(item => [
            item.description,
            item.unit,
            item.unitPrice,
            item.category,
            item.subcategory || ''
        ]);

        const sheetData = [header, ...data];
        const worksheet = XLSX.utils.aoa_to_sheet(sheetData);

        worksheet['!cols'] = [
            { wch: 60 },
            { wch: 10 },
            { wch: 15 },
            { wch: 20 },
            { wch: 20 }
        ];

        XLSX.utils.book_append_sheet(workbook, worksheet, 'Catálogo');
        XLSX.writeFile(workbook, `Catalogo_${new Date().toISOString().split('T')[0]}.xlsx`);
    }
}

export default ExportService;
