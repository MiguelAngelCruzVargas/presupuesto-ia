import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { formatCurrency, numberToWords } from '../utils/format';
import { PDFTemplateService } from './PDFTemplateService';

export class PDFService {
    static exportBudget(projectInfo, items, total, subtotal, taxAmount) {
        const doc = new jsPDF();
        const primaryColor = [26, 35, 126]; // Dark Blue
        const secondaryColor = [69, 90, 100]; // Blue Grey

        // --- HEADER ---
        doc.setFillColor(...primaryColor);
        doc.rect(0, 0, 210, 35, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(18);
        doc.setFont('helvetica', 'bold');
        doc.text('PRESUPUESTO DE OBRA', 105, 18, { align: 'center' });
        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        doc.text('DOCUMENTO TÉCNICO', 105, 25, { align: 'center' });

        // --- PROJECT INFO ---
        const startY = 45;
        doc.setTextColor(0, 0, 0);
        doc.setFontSize(9);

        doc.setFont('helvetica', 'bold');
        doc.text('PROYECTO:', 14, startY);
        doc.setFont('helvetica', 'normal');
        doc.text(projectInfo.project || '---', 40, startY);

        doc.setFont('helvetica', 'bold');
        doc.text('CLIENTE:', 14, startY + 6);
        doc.setFont('helvetica', 'normal');
        doc.text(projectInfo.client || '---', 40, startY + 6);

        const currentDate = new Date();
        const options = { day: 'numeric', month: 'long', year: 'numeric' };
        const formattedDate = currentDate.toLocaleDateString('es-MX', options);
        const locationText = projectInfo.location || 'México';
        const fullLocationAndDateText = `${locationText} a ${formattedDate}`;

        doc.setFont('helvetica', 'normal');
        doc.text(fullLocationAndDateText, 140, startY, { maxWidth: 60 });

        // --- TABLE ---
        const groupedItems = items.reduce((acc, item) => {
            const cat = item.category || 'Sin Categoría';
            if (!acc[cat]) acc[cat] = [];
            acc[cat].push(item);
            return acc;
        }, {});

        const tableBody = [];
        let globalIndex = 1;

        Object.keys(groupedItems).forEach(category => {
            tableBody.push([{
                content: category.toUpperCase(),
                colSpan: 7,
                styles: { fillColor: [240, 240, 240], textColor: [0, 0, 0], fontStyle: 'bold', halign: 'left' }
            }]);

            groupedItems[category].forEach(item => {
                tableBody.push([
                    globalIndex++,
                    `C-${globalIndex.toString().padStart(3, '0')}`,
                    item.description,
                    item.unit,
                    item.quantity,
                    formatCurrency(item.unitPrice),
                    formatCurrency(item.quantity * item.unitPrice)
                ]);
            });
        });

        autoTable(doc, {
            head: [['#', 'CLAVE', 'CONCEPTO', 'UND', 'CANT', 'P.U.', 'IMPORTE']],
            body: tableBody,
            startY: 60,
            theme: 'grid',
            headStyles: { fillColor: primaryColor, textColor: 255, fontStyle: 'bold', halign: 'center', fontSize: 8 },
            columnStyles: {
                0: { halign: 'center', cellWidth: 8 },
                1: { halign: 'center', cellWidth: 15 },
                2: { halign: 'left' },
                3: { halign: 'center', cellWidth: 12 },
                4: { halign: 'right', cellWidth: 15 },
                5: { halign: 'right', cellWidth: 22 },
                6: { halign: 'right', cellWidth: 25, fontStyle: 'bold' }
            },
            styles: { fontSize: 8, cellPadding: 2, valign: 'middle' }
        });

        // --- TOTALS ---
        const finalY = doc.lastAutoTable.finalY + 10;
        doc.setFontSize(8);
        doc.setFont('helvetica', 'bold');
        doc.text(`IMPORTE CON LETRA: (${numberToWords(total)})`, 14, finalY);

        const totalsX = 140;
        doc.setFontSize(9);
        doc.setTextColor(...secondaryColor);
        doc.text('SUBTOTAL:', totalsX, finalY + 10);
        doc.setTextColor(0, 0, 0);
        doc.text(formatCurrency(subtotal), 195, finalY + 10, { align: 'right' });

        doc.setTextColor(...secondaryColor);
        doc.text(`IVA (${projectInfo.taxRate}%):`, totalsX, finalY + 16);
        doc.setTextColor(0, 0, 0);
        doc.text(formatCurrency(taxAmount), 195, finalY + 16, { align: 'right' });

        doc.setDrawColor(0, 0, 0);
        doc.line(totalsX, finalY + 20, 195, finalY + 20);

        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.text('TOTAL:', totalsX, finalY + 26);
        doc.text(formatCurrency(total), 195, finalY + 26, { align: 'right' });

        // --- SIGNATURES ---
        const pageHeight = doc.internal.pageSize.height;
        const signatureY = pageHeight - 40;
        doc.setDrawColor(150);
        doc.line(40, signatureY, 90, signatureY);
        doc.line(120, signatureY, 170, signatureY);
        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(100);
        doc.text('ELABORÓ', 65, signatureY + 5, { align: 'center' });
        doc.text('AUTORIZÓ', 145, signatureY + 5, { align: 'center' });

        doc.save(`Presupuesto_${projectInfo.project.replace(/\s+/g, '_')}.pdf`);
    }

    static async generateBudgetPDF(doc, { projectInfo, items, subtotal, indirectCosts = 0, profit = 0, tax, total, technicalDescription = '', isPreview = false }) {
        // Cargar plantilla activa
        const template = PDFTemplateService.getActiveTemplate();

        // Usar valores de la plantilla o valores por defecto
        const primaryColor = template?.headerColor || [26, 35, 126]; // Dark Blue por defecto
        const secondaryColor = [69, 90, 100]; // Blue Grey
        const headerTextColor = template?.headerTextColor || [255, 255, 255]; // Blanco por defecto
        const headerTextSize = template?.headerTextSize || 18; // Tamaño del título
        const headerSubtextSize = template?.headerSubtextSize || 9; // Tamaño del subtítulo
        const headerText = template?.headerText || 'PRESUPUESTO DE OBRA';
        const headerSubtext = template?.headerSubtext || 'DOCUMENTO TÉCNICO';
        const showHeader = template?.showHeader !== false;

        // --- HEADER ---
        if (showHeader) {
            const headerHeight = 35;
            const headerCenterY = headerHeight / 2;

            doc.setFillColor(...primaryColor);
            doc.rect(0, 0, 210, headerHeight, 'F');

            // Logo si existe
            let hasLogo = false;
            let logoX = 0;
            let logoY = 0;
            let logoWidth = 0;
            let logoHeight = 0;

            if (template?.logoUrl) {
                try {
                    const logoSize = template.logoSize || { width: 40, height: 40 };
                    // Limitar tamaño máximo del logo para que no ocupe todo el header
                    const maxLogoWidth = 50;
                    const maxLogoHeight = 25;
                    logoWidth = Math.min(logoSize.width, maxLogoWidth);
                    logoHeight = Math.min(logoSize.height, maxLogoHeight);

                    logoY = headerCenterY - (logoHeight / 2);

                    if (template.logoPosition === 'left') {
                        logoX = 5; // Margen izquierdo más pequeño para acercar el logo
                    } else if (template.logoPosition === 'center') {
                        logoX = 105 - (logoWidth / 2);
                    } else if (template.logoPosition === 'right') {
                        logoX = 205 - logoWidth; // Margen derecho más pequeño
                    }

                    // Detectar formato de imagen
                    let imageFormat = 'PNG';
                    if (template.logoUrl.startsWith('data:image/jpeg') || template.logoUrl.startsWith('data:image/jpg')) {
                        imageFormat = 'JPEG';
                    } else if (template.logoUrl.startsWith('data:image/png')) {
                        imageFormat = 'PNG';
                    }

                    // Agregar imagen
                    doc.addImage(
                        template.logoUrl,
                        imageFormat,
                        logoX,
                        logoY,
                        logoWidth,
                        logoHeight
                    );
                    hasLogo = true;
                } catch (error) {
                    console.error('Error adding logo to PDF:', error);
                    // Continuar sin logo si hay error
                }
            }

            // Calcular posición del texto según la posición del logo
            // Siempre centrar el texto en toda la página para mejor balance visual
            let textX = 105; // Centro de la página (210mm / 2)
            let textAlign = 'center';

            // El texto siempre se centra en toda la página, el logo simplemente se posiciona
            // Esto crea un mejor balance visual

            // Aplicar color del texto
            doc.setTextColor(...headerTextColor);

            // Calcular posiciones verticales - siempre centrado verticalmente en el header
            let titleY, subtextY;

            // Calcular altura aproximada del texto en mm
            // jsPDF usa puntos, donde 1 punto ≈ 0.352778mm, pero para posicionamiento vertical
            // usamos un factor más simple basado en el tamaño de fuente
            const titleLineHeight = headerTextSize * 0.4; // Factor de altura de línea
            const subtextLineHeight = headerSubtextSize * 0.4;
            const spacing = 1.5; // Espacio entre título y subtítulo en mm

            if (hasLogo && template.logoPosition === 'center') {
                // Logo en centro: texto arriba del logo
                titleY = headerCenterY - (logoHeight / 2) - spacing - subtextLineHeight;
                subtextY = titleY + titleLineHeight + spacing;
            } else {
                // Logo a los lados o sin logo: texto centrado verticalmente
                const totalTextHeight = titleLineHeight + spacing + subtextLineHeight;
                titleY = headerCenterY - (totalTextHeight / 2) + (titleLineHeight / 2);
                subtextY = titleY + titleLineHeight + spacing;
            }

            // Título con tamaño personalizado
            doc.setFontSize(headerTextSize);
            doc.setFont('helvetica', 'bold');
            doc.text(headerText, textX, titleY, { align: textAlign });

            // Subtítulo con tamaño personalizado
            doc.setFontSize(headerSubtextSize);
            doc.setFont('helvetica', 'normal');
            doc.text(headerSubtext, textX, subtextY, { align: textAlign });
        }

        // --- GENERAR NÚMERO DE PRESUPUESTO AUTOMÁTICO ---
        const getNextBudgetNumber = () => {
            const key = 'presugenius_last_budget_number';
            const lastNumber = parseInt(localStorage.getItem(key) || '0', 10);

            if (isPreview) {
                // En vista previa, mostramos el siguiente número pero NO lo guardamos
                return (lastNumber + 1).toString().padStart(2, '0');
            } else {
                // En descarga real, incrementamos y guardamos
                const nextNumber = lastNumber + 1;
                localStorage.setItem(key, nextNumber.toString());
                return nextNumber.toString().padStart(2, '0');
            }
        };
        const budgetNumber = getNextBudgetNumber();

        // --- PROJECT INFO ---
        const startY = 45;
        doc.setTextColor(0, 0, 0);
        doc.setFontSize(9);

        doc.setFont('helvetica', 'bold');
        doc.text('PROYECTO:', 14, startY);
        doc.setFont('helvetica', 'normal');
        const projectText = projectInfo.project || '---';
        doc.text(projectText, 40, startY, { maxWidth: 90 });

        doc.setFont('helvetica', 'bold');
        doc.text('CLIENTE:', 14, startY + 6);
        doc.setFont('helvetica', 'normal');
        // Ajustar ancho máximo para textos largos
        const clientText = projectInfo.client || '---';
        doc.text(clientText, 40, startY + 6, { maxWidth: 90 });

        // Fecha y Ubicación sin etiquetas, solo valores, más a la derecha
        const rightMargin = 10; // Margen derecho
        doc.setFont('helvetica', 'normal');
        const currentDate = new Date();
        const options = { day: 'numeric', month: 'long', year: 'numeric' };
        const formattedDate = currentDate.toLocaleDateString('es-MX', options); // Formato "3 de febrero de 2026"

        const locationText = projectInfo.location || 'México';
        const fullLocationAndDateText = `${locationText} a ${formattedDate}`;
        const maxRightWidth = 210 - 165 - rightMargin; // Ancho disponible (35mm)

        // Alinear a la derecha para que textos largos no se salgan
        doc.text(fullLocationAndDateText, 210 - rightMargin, startY, { align: 'right', maxWidth: maxRightWidth });

        // Número de presupuesto en letras pequeñas debajo de la ubicación
        doc.setFontSize(7);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(100, 100, 100); // Color gris
        doc.text(`Presupuesto No. ${budgetNumber}`, 210 - rightMargin, startY + 12, { align: 'right' });

        // --- TABLE ---
        const groupedItems = items.reduce((acc, item) => {
            const cat = item.category || 'Sin Categoría';
            if (!acc[cat]) acc[cat] = [];
            acc[cat].push(item);
            return acc;
        }, {});

        const tableBody = [];
        let globalIndex = 1;

        Object.keys(groupedItems).forEach(category => {
            tableBody.push([{
                content: category.toUpperCase(),
                colSpan: 7,
                styles: { fillColor: [240, 240, 240], textColor: [0, 0, 0], fontStyle: 'bold', halign: 'left' }
            }]);

            groupedItems[category].forEach(item => {
                let description = item.description;
                // Add source verification if available
                if (item.calculation_basis) {
                    // Check common keywords for offical sources to highlight them
                    const isOfficial = /neodata|catálogo|base maestra|oficial/i.test(item.calculation_basis);
                    const sourceText = item.calculation_basis.length > 50
                        ? item.calculation_basis.substring(0, 47) + '...'
                        : item.calculation_basis;

                    description += `\n(Ref: ${sourceText})`;
                }

                tableBody.push([
                    globalIndex++,
                    `C-${globalIndex.toString().padStart(3, '0')}`,
                    description,
                    item.unit,
                    item.quantity,
                    formatCurrency(item.unitPrice),
                    formatCurrency(item.quantity * item.unitPrice)
                ]);
            });
        });

        autoTable(doc, {
            head: [['#', 'CLAVE', 'CONCEPTO', 'UND', 'CANT', 'P.U.', 'IMPORTE']],
            body: tableBody,
            startY: 60,
            theme: 'grid',
            headStyles: { fillColor: primaryColor, textColor: 255, fontStyle: 'bold', halign: 'center', fontSize: 8 },
            columnStyles: {
                0: { halign: 'center', cellWidth: 8 },
                1: { halign: 'center', cellWidth: 15 },
                2: { halign: 'left' },
                3: { halign: 'center', cellWidth: 12 },
                4: { halign: 'right', cellWidth: 15 },
                5: { halign: 'right', cellWidth: 22 },
                6: { halign: 'right', cellWidth: 25, fontStyle: 'bold' }
            },
            styles: { fontSize: 8, cellPadding: 2, valign: 'middle' }
        });

        // --- TOTALS & SIGNATURES BLOCK ---
        const pageHeight = doc.internal.pageSize.height;
        const signatureHeight = 40;
        const signatureY = pageHeight - signatureHeight;

        // Calculate required space for Totals
        let requiredHeight = 20; // Initial padding + Amount in text
        requiredHeight += 6; // Subtotal
        if (indirectCosts > 0) requiredHeight += 6;
        if (profit > 0) requiredHeight += 6;
        requiredHeight += 6; // IVA
        requiredHeight += 10; // Total (with line)
        requiredHeight += 10; // Buffer before signatures

        // Initialize currentY safely
        let currentY = 20; // Default fallback
        const lastTableY = doc.lastAutoTable ? doc.lastAutoTable.finalY : 20;

        // Check if we need a new page
        if (lastTableY + requiredHeight > signatureY) {
            doc.addPage();
            currentY = 20; // Start fresh on new page
        } else {
            currentY = lastTableY + 10;
        }

        doc.setFontSize(8);
        doc.setFont('helvetica', 'bold');
        doc.text(`IMPORTE CON LETRA: (${numberToWords(total)})`, 14, currentY);

        // Align Totals Frame
        const totalsX = 130; // Moved slightly left for better alignment
        const valueX = 195;

        currentY += 8; // Spacing after text amount

        doc.setFontSize(9);

        // Helper for rows
        const addTotalRow = (label, value, isBold = false) => {
            doc.setTextColor(...secondaryColor);
            doc.setFont('helvetica', isBold ? 'bold' : 'bold'); // Labels always boldish
            doc.text(label, totalsX, currentY);

            doc.setTextColor(0, 0, 0);
            doc.setFont('helvetica', isBold ? 'bold' : 'normal');
            doc.text(formatCurrency(value), valueX, currentY, { align: 'right' });
            currentY += 6;
        };

        addTotalRow('SUBTOTAL:', subtotal);

        if (indirectCosts > 0) {
            addTotalRow(`INDIRECTOS (${projectInfo.indirect_percentage || 0}%):`, indirectCosts);
        }

        if (profit > 0) {
            addTotalRow(`UTILIDAD (${projectInfo.profit_percentage || 0}%):`, profit);
        }

        addTotalRow(`IVA (${projectInfo.taxRate || 0}%):`, tax);

        // Line for Total
        doc.setDrawColor(0, 0, 0);
        doc.setLineWidth(0.5);
        doc.line(totalsX, currentY - 2, valueX, currentY - 2);
        currentY += 2;

        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.text('TOTAL:', totalsX, currentY);
        doc.text(formatCurrency(total), valueX, currentY, { align: 'right' });

        // --- SIGNATURES ---
        // Always at bottom of the page
        doc.setDrawColor(150);
        doc.setLineWidth(0.2);
        doc.line(40, signatureY, 90, signatureY);
        doc.line(120, signatureY, 170, signatureY);

        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(100);
        doc.text('ELABORÓ', 65, signatureY + 5, { align: 'center' });
        doc.text('AUTORIZÓ', 145, signatureY + 5, { align: 'center' });

        // Footer text si está configurado en la plantilla
        if (template?.footerText) {
            doc.setFontSize(7);
            doc.setTextColor(150);
            doc.text(template.footerText, 105, pageHeight - 10, { align: 'center' });
        }
    }

    static exportMaterials(projectInfo, materials) {
        const doc = new jsPDF();
        const primaryColor = [230, 81, 0]; // Orange for Materials

        // --- HEADER ---
        doc.setFillColor(...primaryColor);
        doc.rect(0, 0, 210, 35, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(18);
        doc.setFont('helvetica', 'bold');
        doc.text('EXPLOSIÓN DE INSUMOS', 105, 18, { align: 'center' });
        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        doc.text('LISTADO DE MATERIALES REQUERIDOS', 105, 25, { align: 'center' });

        // --- PROJECT INFO ---
        const startY = 45;
        doc.setTextColor(0, 0, 0);
        doc.setFontSize(9);
        doc.setFont('helvetica', 'bold');
        doc.text('PROYECTO:', 14, startY);
        doc.setFont('helvetica', 'normal');
        doc.text(projectInfo.project || '---', 40, startY);

        const currentDate = new Date();
        const options = { day: 'numeric', month: 'long', year: 'numeric' };
        const formattedDate = currentDate.toLocaleDateString('es-MX', options);

        doc.setFont('helvetica', 'bold');
        doc.text('FECHA:', 140, startY);
        doc.setFont('helvetica', 'normal');
        doc.text(formattedDate, 160, startY);

        // --- TABLE ---
        // --- TABLE ---
        const tableBody = materials.map(mat => [
            mat.material,
            mat.unit,
            mat.quantity,
            formatCurrency(mat.unitPrice),
            formatCurrency(mat.quantity * mat.unitPrice),
            mat.notes || ''
        ]);

        const totalMaterials = materials.reduce((sum, m) => sum + (m.quantity * m.unitPrice), 0);

        autoTable(doc, {
            head: [['MATERIAL', 'UND', 'CANT', 'P.U. EST.', 'TOTAL', 'NOTAS']],
            body: tableBody,
            startY: 55,
            theme: 'grid',
            headStyles: { fillColor: primaryColor, textColor: 255, fontStyle: 'bold', halign: 'center', fontSize: 8 },
            columnStyles: {
                0: { halign: 'left', fontStyle: 'bold' }, // Material
                1: { halign: 'center' }, // Unit
                2: { halign: 'right' }, // Quantity
                3: { halign: 'right' }, // Unit Price
                4: { halign: 'right', fontStyle: 'bold' }, // Total
                5: { halign: 'left', fontSize: 7 } // Notes
            },
            styles: { fontSize: 8, cellPadding: 2, valign: 'middle' }
        });

        // --- TOTAL ---
        const finalY = doc.lastAutoTable.finalY + 10;
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.text('TOTAL ESTIMADO DE MATERIALES:', 100, finalY); // Moved left to avoid overlap
        doc.text(formatCurrency(totalMaterials), 195, finalY, { align: 'right' });

        doc.save(`Insumos_${projectInfo.project.replace(/\s+/g, '_')}.pdf`);
    }
}
