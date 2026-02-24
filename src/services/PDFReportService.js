import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export class PDFReportService {
    // Version: Fix autoTable import
    /**
     * Genera un reporte fotográfico en PDF con formato profesional (solo fotos)
     * Formato exacto del ejemplo: Header, grid 2x3 de fotos, descripciones, footer con firmas
     * @param {Object} projectInfo - Información del proyecto
     * @param {Array} logs - Lista de logs con fotos agrupados por concepto
     * @param {string} reportDate - Fecha del reporte
     * @param {Object} options - Opciones adicionales (contractor, contractNumber, concepts, supervisorName, supervisorRole)
     */
    static async generatePhotographicReport(projectInfo, logs, reportDate, options = {}) {
        const doc = new jsPDF('landscape', 'mm', 'a4');
        const pageWidth = doc.internal.pageSize.width; // 297mm (horizontal)
        const pageHeight = doc.internal.pageSize.height; // 210mm (horizontal)
        const margin = 15;

        const contractor = options.contractor || projectInfo.contractor || projectInfo.client || 'Contratista';
        const contractNumber = options.contractNumber || projectInfo.contractNumber || 'S/N';
        const supervisorName = options.supervisorName || projectInfo.supervisorName || 'Ing. Responsable';
        const supervisorRole = options.supervisorRole || projectInfo.supervisorRole || 'DIRECTOR DE OBRAS PÚBLICAS';
        const concepts = options.concepts || this.extractConceptsFromLogs(logs);
        
        // Valores editables de las firmas
        const contractorTitle = options.contractorTitle || projectInfo.contractorTitle || 'EL CONTRATISTA';
        const contractorName = options.contractorName || projectInfo.contractorName || contractor;
        const contractorRole = options.contractorRole || projectInfo.contractorRole || 'ADMINISTRADOR ÚNICO';
        const municipalityTitle = options.municipalityTitle || projectInfo.municipalityTitle || 'H. AYUNTAMIENTO';

        // --- Helper Functions ---
        const addHeader = () => {
            // Título principal en recuadro con borde grueso
            const titleBoxHeight = 10;
            const titleY = margin + 1; // Subido un poco más arriba

            // Dibujar recuadro del título con borde grueso
            doc.setLineWidth(1.2);
            doc.setDrawColor(0);
            doc.rect(margin, titleY, pageWidth - (margin * 2), titleBoxHeight);

            // Título centrado dentro del recuadro
            doc.setFontSize(13);
            doc.setFont('helvetica', 'bold');
            doc.text("REPORTE FOTOGRAFICO DE OBRA", pageWidth / 2, titleY + 6.5, { align: 'center' });

            // Preparar datos para la tabla
            const obraText = projectInfo.project || projectInfo.name || 'Proyecto';
            const obraLocation = projectInfo.location ? `, ${projectInfo.location}` : '';
            const fullObraText = `${obraText}${obraLocation}`;
            const conceptsText = Array.isArray(concepts) ? concepts.join(', ') : concepts;

            // Crear tabla real usando autoTable
            const tableStartY = titleY + titleBoxHeight + 5;

            // Verificar que autoTable esté disponible
            if (typeof autoTable !== 'function') {
                throw new Error('autoTable no está disponible. Verifica que jspdf-autotable esté correctamente instalado.');
            }

            autoTable(doc, {
                startY: tableStartY,
                margin: { left: margin, right: margin },
                tableWidth: pageWidth - (margin * 2),
                head: [],
                body: [
                    [
                        { content: 'CONTRATISTA:\n' + contractor, styles: { fontSize: 7.5, cellPadding: 2 } },
                        { content: 'OBRA:\n' + fullObraText, styles: { fontSize: 7.5, cellPadding: 2 } },
                        { content: 'CONTRATO No.:\n' + contractNumber, styles: { fontSize: 7.5, cellPadding: 2 } }
                    ],
                    [
                        { content: '', styles: { cellPadding: 2 } },
                        { content: 'CONCEPTOS:\n' + conceptsText, styles: { fontSize: 7.5, cellPadding: 2 } },
                        { content: '', styles: { cellPadding: 2 } }
                    ]
                ],
                columnStyles: {
                    0: { cellWidth: 42, halign: 'left', valign: 'top' },
                    1: { cellWidth: 'auto', halign: 'left', valign: 'top' },
                    2: { cellWidth: 48, halign: 'left', valign: 'top' }
                },
                styles: {
                    lineWidth: 0.3,
                    lineColor: [0, 0, 0],
                    fontSize: 7,
                    cellPadding: 2
                },
                theme: 'grid',
                headStyles: {
                    fillColor: false,
                    textColor: [0, 0, 0]
                },
                bodyStyles: {
                    fillColor: false,
                    textColor: [0, 0, 0]
                }
            });

            // Retornar la posición Y final del header
            return doc.lastAutoTable.finalY + 3;
        };

        const addFooter = () => {
            const footerY = pageHeight - 30; // Subido un poco para que no queden tan a la orilla

            // Signatures Section (formato exacto del ejemplo)
            doc.setLineWidth(0.5);
            doc.setDrawColor(0);

            // Left Signature - El Contratista (usando valores editables)
            const leftSigX = margin + 42.5;
            doc.line(leftSigX - 25, footerY, leftSigX + 25, footerY);
            doc.setFontSize(8);
            doc.setFont('helvetica', 'bold');
            doc.text(contractorTitle, leftSigX, footerY + 5, { align: 'center' });
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(7);
            doc.text(contractorName, leftSigX, footerY + 10, { align: 'center' });
            doc.setFontSize(6);
            doc.text(contractorRole, leftSigX, footerY + 15, { align: 'center' });

            // Right Signature - H. Ayuntamiento (usando valores editables)
            const rightSigX = pageWidth - margin - 42.5;
            doc.line(rightSigX - 25, footerY, rightSigX + 25, footerY);
            doc.setFontSize(8);
            doc.setFont('helvetica', 'bold');
            doc.text(municipalityTitle, rightSigX, footerY + 5, { align: 'center' });
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(7);
            doc.text(supervisorName, rightSigX, footerY + 10, { align: 'center' });
            doc.setFontSize(6);
            doc.text(supervisorRole, rightSigX, footerY + 15, { align: 'center' });

            // Espacio para sello (centro, entre las dos firmas)
            const centerX = pageWidth / 2;
            doc.setLineWidth(0.3);
            doc.setDrawColor(200, 200, 200);
            doc.circle(centerX, footerY + 8, 8, 'S'); // Círculo para sello
        };

        // Agrupar logs por concepto/tarea
        const logsByConcept = this.groupLogsByConcept(logs);

        // --- Content Generation ---
        const headerEndY = addHeader(); // Obtener posición final del header

        // Configuración de fotos (formato 2 filas x 4 columnas para formato horizontal)
        let yPos = headerEndY + 3; // Inicio después del header con menos espacio
        const photoWidth = 52; // mm (imágenes más pequeñas)
        const photoHeight = 38; // mm (imágenes más pequeñas)
        const gapX = 8; // Espacio horizontal entre fotos
        const gapY = 50; // Espacio vertical (foto + caption) ajustado para imágenes más pequeñas
        const photosPerRow = 4; // 4 fotos por fila en formato horizontal
        const photosPerPage = 8; // 2 filas x 4 columnas

        // Recolectar todas las fotos con sus captions (usando content como descripción)
        const allPhotos = [];
        for (const [conceptName, conceptLogs] of Object.entries(logsByConcept)) {
            for (const log of conceptLogs) {
                if (!log.photos || log.photos.length === 0) continue;
                // Usar el content como descripción (que es lo que el usuario escribe en el modal)
                const description = log.content || log.subject || `Fotografía del concepto: ${conceptName}`;
                for (const photoUrl of log.photos) {
                    allPhotos.push({
                        url: photoUrl,
                        caption: description, // Descripción que el usuario escribió
                        concept: conceptName
                    });
                }
            }
        }

        // Procesar fotos en grid 2x4 (formato horizontal)
        let photoIndex = 0;
        let pageStartIndex = 0;

        for (const photo of allPhotos) {
            // Verificar si necesitamos nueva página (cada 8 fotos = 2 filas x 4 columnas)
            if (photoIndex > 0 && (photoIndex - pageStartIndex) >= photosPerPage) {
                addFooter();
                doc.addPage('landscape'); // Nueva página también en horizontal
                const newHeaderEndY = addHeader(); // Obtener posición final del header en nueva página
                yPos = newHeaderEndY + 3; // Inicio después del header con menos espacio
                pageStartIndex = photoIndex;
            }

            // Calcular posición dentro de la página actual (grid 2x4)
            const indexInPage = photoIndex - pageStartIndex;
            const col = indexInPage % photosPerRow; // 0, 1, 2, 3
            const row = Math.floor(indexInPage / photosPerRow); // 0 o 1
            const xPos = margin + (col * (photoWidth + gapX));
            const currentYPos = yPos + (row * gapY);

            try {
                // Agregar imagen
                console.log(`Cargando imagen ${photoIndex + 1}/${allPhotos.length}:`, photo.url);
                const imgData = await this.fetchImage(photo.url);

                if (!imgData) {
                    throw new Error('No se pudo obtener datos de la imagen');
                }

                // Agregar imagen al PDF
                doc.addImage(imgData, 'JPEG', xPos, currentYPos, photoWidth, photoHeight);

                // Borde alrededor de la imagen (más visible como en el ejemplo)
                doc.setLineWidth(0.3);
                doc.setDrawColor(0);
                doc.rect(xPos, currentYPos, photoWidth, photoHeight);

                // Caption debajo de la foto (formato del ejemplo: texto descriptivo)
                doc.setFontSize(7);
                doc.setFont('helvetica', 'normal');
                const splitCaption = doc.splitTextToSize(photo.caption.toUpperCase(), photoWidth - 2);
                const captionY = currentYPos + photoHeight + 5;
                doc.text(splitCaption, xPos + 1, captionY);

                console.log(`✓ Imagen ${photoIndex + 1} agregada correctamente`);

            } catch (err) {
                console.error(`Error adding image ${photoIndex + 1} to PDF:`, err);
                console.error('Image URL:', photo.url);
                // Placeholder si falla la carga
                doc.setLineWidth(0.3);
                doc.setDrawColor(200, 200, 200);
                doc.rect(xPos, currentYPos, photoWidth, photoHeight);
                doc.setFontSize(5);
                doc.setTextColor(150, 150, 150);
                doc.text("Error al cargar imagen", xPos + 2, currentYPos + photoHeight / 2);
                doc.setTextColor(0, 0, 0);
            }

            photoIndex++;
        }

        addFooter();

        // Guardar PDF (cada reporte es un PDF individual)
        const fileName = `REPORTE_FOTOGRAFICO_${projectInfo.project?.replace(/\s+/g, '_') || 'OBRA'}_${reportDate}.pdf`;
        doc.save(fileName);
    }

    /**
     * Genera un reporte fotográfico en PDF y devuelve el blob (para preview)
     * Misma funcionalidad que generatePhotographicReport pero devuelve blob en lugar de descargar
     */
    static async generatePhotographicReportPreview(projectInfo, logs, reportDate, options = {}) {
        const doc = new jsPDF('landscape', 'mm', 'a4');
        const pageWidth = doc.internal.pageSize.width; // 297mm (horizontal)
        const pageHeight = doc.internal.pageSize.height; // 210mm (horizontal)
        const margin = 15;

        const contractor = options.contractor || projectInfo.contractor || projectInfo.client || 'Contratista';
        const contractNumber = options.contractNumber || projectInfo.contractNumber || 'S/N';
        const supervisorName = options.supervisorName || projectInfo.supervisorName || 'Ing. Responsable';
        const supervisorRole = options.supervisorRole || projectInfo.supervisorRole || 'DIRECTOR DE OBRAS PÚBLICAS';
        const concepts = options.concepts || this.extractConceptsFromLogs(logs);
        const obra = options.obra || projectInfo.project || projectInfo.name || 'Proyecto';
        
        // Valores editables de las firmas
        const contractorTitle = options.contractorTitle || projectInfo.contractorTitle || 'EL CONTRATISTA';
        const contractorName = options.contractorName || projectInfo.contractorName || contractor;
        const contractorRole = options.contractorRole || projectInfo.contractorRole || 'ADMINISTRADOR ÚNICO';
        const municipalityTitle = options.municipalityTitle || projectInfo.municipalityTitle || 'H. AYUNTAMIENTO';

        // --- Helper Functions ---
        const addHeader = () => {
            // Título principal en recuadro con borde grueso (formato exacto del ejemplo)
            const titleBoxHeight = 10;
            const titleY = margin + 1; // Subido un poco más arriba

            // Dibujar recuadro del título con borde grueso
            doc.setLineWidth(1);
            doc.setDrawColor(0);
            doc.rect(margin, titleY, pageWidth - (margin * 2), titleBoxHeight);

            // Título centrado dentro del recuadro
            doc.setFontSize(14);
            doc.setFont('helvetica', 'bold');
            doc.text("REPORTE FOTOGRAFICO DE OBRA", pageWidth / 2, titleY + 6, { align: 'center' });

            // Preparar datos para la tabla
            const obraLocation = projectInfo.location ? `, ${projectInfo.location}` : '';
            const fullObraText = `${obra}${obraLocation}`;
            const conceptsText = Array.isArray(concepts) ? concepts.join(', ') : concepts;

            // Crear tabla real usando autoTable
            const tableStartY = titleY + titleBoxHeight + 5;

            // Verificar que autoTable esté disponible
            if (typeof autoTable !== 'function') {
                throw new Error('autoTable no está disponible. Verifica que jspdf-autotable esté correctamente instalado.');
            }

            autoTable(doc, {
                startY: tableStartY,
                margin: { left: margin, right: margin },
                tableWidth: pageWidth - (margin * 2),
                head: [],
                body: [
                    [
                        { content: 'CONTRATISTA:\n' + contractor, styles: { fontSize: 8, cellPadding: 2 } },
                        { content: 'OBRA:\n' + fullObraText, styles: { fontSize: 8, cellPadding: 2 } },
                        { content: 'CONTRATO No.:\n' + contractNumber, styles: { fontSize: 8, cellPadding: 2 } }
                    ],
                    [
                        { content: '', styles: { cellPadding: 2 } },
                        { content: 'CONCEPTOS:\n' + conceptsText, styles: { fontSize: 8, cellPadding: 2 } },
                        { content: '', styles: { cellPadding: 2 } }
                    ]
                ],
                columnStyles: {
                    0: { cellWidth: 50, halign: 'left', valign: 'top' },
                    1: { cellWidth: 'auto', halign: 'left', valign: 'top' },
                    2: { cellWidth: 50, halign: 'left', valign: 'top' }
                },
                styles: {
                    lineWidth: 0.3,
                    lineColor: [0, 0, 0],
                    fontSize: 7,
                    cellPadding: 2
                },
                theme: 'grid',
                headStyles: {
                    fillColor: false,
                    textColor: [0, 0, 0]
                },
                bodyStyles: {
                    fillColor: false,
                    textColor: [0, 0, 0]
                }
            });

            // Retornar la posición Y final del header
            return doc.lastAutoTable.finalY + 3;
        };

        const addFooter = () => {
            const footerY = pageHeight - 30; // Subido un poco para que no queden tan a la orilla

            // Signatures Section (formato exacto del ejemplo)
            doc.setLineWidth(0.5);
            doc.setDrawColor(0);

            // Left Signature - El Contratista (usando valores editables)
            const leftSigX = margin + 42.5;
            doc.line(leftSigX - 25, footerY, leftSigX + 25, footerY);
            doc.setFontSize(8);
            doc.setFont('helvetica', 'bold');
            doc.text(contractorTitle, leftSigX, footerY + 5, { align: 'center' });
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(7);
            doc.text(contractorName, leftSigX, footerY + 10, { align: 'center' });
            doc.setFontSize(6);
            doc.text(contractorRole, leftSigX, footerY + 15, { align: 'center' });

            // Right Signature - H. Ayuntamiento (usando valores editables)
            const rightSigX = pageWidth - margin - 42.5;
            doc.line(rightSigX - 25, footerY, rightSigX + 25, footerY);
            doc.setFontSize(8);
            doc.setFont('helvetica', 'bold');
            doc.text(municipalityTitle, rightSigX, footerY + 5, { align: 'center' });
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(7);
            doc.text(supervisorName, rightSigX, footerY + 10, { align: 'center' });
            doc.setFontSize(6);
            doc.text(supervisorRole, rightSigX, footerY + 15, { align: 'center' });
        };

        // Agrupar logs por concepto/tarea
        const logsByConcept = this.groupLogsByConcept(logs);

        // --- Content Generation ---
        const headerEndY = addHeader(); // Obtener posición final del header

        // Configuración de fotos (formato 2 filas x 4 columnas para formato horizontal)
        let yPos = headerEndY + 3; // Inicio después del header con menos espacio
        const photoWidth = 52; // mm (imágenes más pequeñas)
        const photoHeight = 38; // mm (imágenes más pequeñas)
        const gapX = 8; // Espacio horizontal entre fotos
        const gapY = 50; // Espacio vertical (foto + caption) ajustado para imágenes más pequeñas
        const photosPerRow = 4; // 4 fotos por fila en formato horizontal
        const photosPerPage = 8; // 2 filas x 4 columnas

        // Recolectar todas las fotos con sus captions
        const allPhotos = [];
        for (const [conceptName, conceptLogs] of Object.entries(logsByConcept)) {
            for (const log of conceptLogs) {
                if (!log.photos || log.photos.length === 0) continue;
                // Usar photoCaptions si están disponibles, sino usar content
                const photos = log.photos || [];
                const captions = log.photoCaptions || [];
                for (let i = 0; i < photos.length; i++) {
                    const caption = captions[i] || log.content || log.subject || `Fotografía del concepto: ${conceptName}`;
                    allPhotos.push({
                        url: photos[i],
                        caption: caption,
                        concept: conceptName
                    });
                }
            }
        }

        // Procesar fotos en grid 2x4 (formato horizontal)
        let photoIndex = 0;
        let pageStartIndex = 0;

        for (const photo of allPhotos) {
            // Verificar si necesitamos nueva página (cada 8 fotos = 2 filas x 4 columnas)
            if (photoIndex > 0 && (photoIndex - pageStartIndex) >= photosPerPage) {
                addFooter();
                doc.addPage('landscape'); // Nueva página también en horizontal
                const newHeaderEndY = addHeader(); // Obtener posición final del header en nueva página
                yPos = newHeaderEndY + 3; // Inicio después del header con menos espacio
                pageStartIndex = photoIndex;
            }

            // Calcular posición dentro de la página actual (grid 2x4)
            const indexInPage = photoIndex - pageStartIndex;
            const col = indexInPage % photosPerRow; // 0, 1, 2, 3
            const row = Math.floor(indexInPage / photosPerRow); // 0 o 1
            const xPos = margin + (col * (photoWidth + gapX));
            const currentYPos = yPos + (row * gapY);

            try {
                // Agregar imagen
                const imgData = await this.fetchImage(photo.url);

                if (!imgData) {
                    throw new Error('No se pudo obtener datos de la imagen');
                }

                // Agregar imagen al PDF
                doc.addImage(imgData, 'JPEG', xPos, currentYPos, photoWidth, photoHeight);

                // Borde alrededor de la imagen (más visible como en el ejemplo)
                doc.setLineWidth(0.3);
                doc.setDrawColor(0);
                doc.rect(xPos, currentYPos, photoWidth, photoHeight);

                // Caption debajo de la foto (formato del ejemplo: texto descriptivo)
                doc.setFontSize(7);
                doc.setFont('helvetica', 'normal');
                const splitCaption = doc.splitTextToSize(photo.caption.toUpperCase(), photoWidth - 2);
                const captionY = currentYPos + photoHeight + 5;
                doc.text(splitCaption, xPos + 1, captionY);

            } catch (err) {
                console.error(`Error adding image ${photoIndex + 1} to PDF:`, err);
                // Placeholder si falla la carga
                doc.setLineWidth(0.3);
                doc.setDrawColor(200, 200, 200);
                doc.rect(xPos, currentYPos, photoWidth, photoHeight);
                doc.setFontSize(5);
                doc.setTextColor(150, 150, 150);
                doc.text("Error al cargar imagen", xPos + 2, currentYPos + photoHeight / 2);
                doc.setTextColor(0, 0, 0);
            }

            photoIndex++;
        }

        addFooter();

        // Devolver blob en lugar de descargar
        return doc.output('blob');
    }

    /**
     * Extrae los conceptos únicos de los logs
     */
    static extractConceptsFromLogs(logs) {
        const concepts = new Set();
        logs.forEach(log => {
            if (log.subject) {
                // Extraer nombre del concepto del subject
                const match = log.subject.match(/Reporte Fotográfico:\s*(.+)/);
                if (match) {
                    concepts.add(match[1]);
                } else {
                    concepts.add(log.subject);
                }
            }
        });
        return Array.from(concepts);
    }

    /**
     * Agrupa logs por concepto/tarea
     */
    static groupLogsByConcept(logs) {
        const grouped = {};
        logs.forEach(log => {
            const conceptName = log.subject?.replace('Reporte Fotográfico: ', '') ||
                log.task_id ||
                'Concepto General';
            if (!grouped[conceptName]) {
                grouped[conceptName] = [];
            }
            grouped[conceptName].push(log);
        });
        return grouped;
    }

    // Helper to fetch image and convert to base64
    static async fetchImage(url) {
        try {
            // Si la URL es relativa o local, intentar cargarla directamente
            if (url.startsWith('blob:') || url.startsWith('data:')) {
                return url;
            }

            // Si es una URL completa, hacer fetch
            const response = await fetch(url, {
                mode: 'cors',
                credentials: 'omit'
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const blob = await response.blob();
            return new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onloadend = () => {
                    if (reader.result) {
                        resolve(reader.result);
                    } else {
                        reject(new Error('Failed to convert image to base64'));
                    }
                };
                reader.onerror = () => reject(new Error('Error reading image'));
                reader.readAsDataURL(blob);
            });
        } catch (error) {
            console.error('Error fetching image:', error);
            console.error('Image URL:', url);
            throw error;
        }
    }

    /**
     * Genera un reporte completo de bitácora en PDF (notas, textos, avances)
     * @param {Object} projectInfo - Información del proyecto
     * @param {Array} logs - Lista completa de logs de bitácora
     * @param {string} reportDate - Fecha del reporte
     * @param {Object} options - Opciones adicionales
     */
    // Helper para extraer metadata de bitácora
    static extractBitacoraMetadata(content) {
        if (!content) return null;
        const metadataMatch = content.match(/<!--BITACORA_METADATA:(.*?)-->/);
        if (metadataMatch) {
            try {
                return JSON.parse(metadataMatch[1]);
            } catch (e) {
                return null;
            }
        }
        return null;
    }

    // Helper para limpiar contenido de metadata
    static getCleanContent(content) {
        if (!content) return '';
        return content.replace(/<!--BITACORA_METADATA:.*?-->/, '').trim();
    }

    static async generateBitacoraReport(projectInfo, logs, reportDate, options = {}) {
        // Validar y depurar logs
        console.log('generateBitacoraReport llamado con', logs?.length || 0, 'logs');
        if (!logs || logs.length === 0) {
            throw new Error('No hay notas de bitácora para generar el reporte');
        }
        console.log('Logs recibidos:', logs.map(l => ({
            id: l.id,
            subject: l.subject,
            content: l.content?.substring(0, 50),
            note_number: l.note_number,
            photos: l.photos?.length || 0,
            isDiaryEntry: l.isDiaryEntry,
            task_id: l.task_id
        })));

        const doc = new jsPDF('landscape', 'mm', 'a4');
        const pageWidth = doc.internal.pageSize.width; // 297mm en horizontal
        const pageHeight = doc.internal.pageSize.height; // 210mm en horizontal
        const margin = 15;
        const gutter = 8; // Espacio entre columnas
        const columnWidth = (pageWidth - (margin * 2) - gutter) / 2; // Dos columnas con espacio entre ellas
        
        // Colores profesionales
        const primaryColor = [79, 70, 229]; // Indigo
        const secondaryColor = [251, 191, 36]; // Amber
        const lightAmber = [255, 251, 235];
        const darkGray = [51, 65, 85];
        const mediumGray = [100, 116, 139];

        // Helper para agregar header en cada página
        const addHeader = () => {
            // Fondo del header con gradiente
            doc.setFillColor(...primaryColor);
            doc.rect(0, 0, pageWidth, 35, 'F');
            
            // Título principal
            doc.setFontSize(20);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(255, 255, 255);
            doc.text("BITÁCORA DE OBRA", pageWidth / 2, 18, { align: 'center' });
            
            // Subtítulo
            doc.setFontSize(9);
            doc.setFont('helvetica', 'normal');
            doc.text("DOCUMENTO OFICIAL DE SEGUIMIENTO", pageWidth / 2, 26, { align: 'center' });
            
            // Línea decorativa
            doc.setDrawColor(255, 255, 255);
            doc.setLineWidth(0.5);
            doc.line(margin, 32, pageWidth - margin, 32);
            
            return 40; // Retornar posición Y después del header
        };

        // Helper para agregar footer con firma
        const addFooter = (pageNum, totalPages) => {
            const footerY = pageHeight - 50;
            
            // Línea separadora
            doc.setLineWidth(0.3);
            doc.setDrawColor(200, 200, 200);
            doc.line(margin, footerY, pageWidth - margin, footerY);
            
            // Sección de firma
            const signatureY = footerY + 8;
            doc.setLineWidth(0.5);
            doc.setDrawColor(0, 0, 0);
            
            // Línea de firma izquierda
            const leftSigX = margin + 50;
            doc.line(leftSigX - 40, signatureY, leftSigX + 40, signatureY);
            doc.setFontSize(8);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(0, 0, 0);
            doc.text("RESIDENTE", leftSigX, signatureY + 6, { align: 'center' });
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(7);
            doc.text("Firma y Sello", leftSigX, signatureY + 11, { align: 'center' });
            
            // Línea de firma derecha
            const rightSigX = pageWidth - margin - 50;
            doc.line(rightSigX - 40, signatureY, rightSigX + 40, signatureY);
            doc.setFontSize(8);
            doc.setFont('helvetica', 'bold');
            doc.text("SUPERVISOR", rightSigX, signatureY + 6, { align: 'center' });
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(7);
            doc.text("Firma y Sello", rightSigX, signatureY + 11, { align: 'center' });
            
            // Información de página
            doc.setFontSize(7);
            doc.setTextColor(150, 150, 150);
            doc.text(`Página ${pageNum}`, pageWidth / 2, pageHeight - 5, { align: 'center' });
        };

        // Ordenar logs por fecha
        const sortedLogs = [...logs].sort((a, b) =>
            new Date(a.log_date || a.created_at) - new Date(b.log_date || b.created_at)
        );

        let yPos = addHeader();
        let pageNum = 1;
        const totalPages = Math.ceil(sortedLogs.length / 2) + 1; // Estimación

        // Información del proyecto con estilo elegante (solo en primera página)
        doc.setFillColor(...lightAmber);
        doc.setDrawColor(...secondaryColor);
        doc.setLineWidth(0.5);
        doc.rect(margin, yPos, pageWidth - (margin * 2), 18, 'FD');
        
        yPos += 5;
        doc.setFontSize(9);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...darkGray);
        doc.text("PROYECTO:", margin + 5, yPos);
        doc.setFont('helvetica', 'normal');
        doc.text(projectInfo.project || projectInfo.name || 'Proyecto', margin + 28, yPos);

        yPos += 5;
        doc.setFont('helvetica', 'bold');
        doc.text("UBICACIÓN:", margin + 5, yPos);
        doc.setFont('helvetica', 'normal');
        doc.text(projectInfo.location || 'No especificada', margin + 28, yPos);

        yPos += 5;
        doc.setFont('helvetica', 'bold');
        doc.text("FECHA:", margin + 5, yPos);
        doc.setFont('helvetica', 'normal');
        doc.text(new Date(reportDate).toLocaleDateString('es-MX', { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
        }), margin + 28, yPos);

        yPos += 12;

        // Variables para control de columnas (simular libro abierto)
        let currentColumn = 0; // 0 = izquierda, 1 = derecha
        let leftY = yPos;
        let rightY = yPos;
        const columnMargin = 2;

        // Procesar cada nota en dos columnas
        for (const log of sortedLogs) {
            let logProcessed = false;
            
            while (!logProcessed) {
                // Determinar en qué columna colocar la nota
                const useLeftColumn = currentColumn === 0;
                const columnX = useLeftColumn ? margin : (margin + columnWidth + gutter);
                let currentY = useLeftColumn ? leftY : rightY;
                const noteStartY = currentY;

                // Verificar si necesitamos nueva página o cambiar de columna
                // Ajustar límite a 60mm para dar más espacio (antes era 100mm)
                if (currentY > pageHeight - 60) {
                    if (useLeftColumn && rightY <= pageHeight - 60) {
                        // Columna izquierda llena, cambiar a derecha
                        currentColumn = 1;
                        continue; // Reintentar en columna derecha
                    } else {
                        // Ambas columnas llenas o columna derecha llena, nueva página
                        addFooter(pageNum, totalPages);
                        doc.addPage('landscape');
                        pageNum++;
                        yPos = addHeader();
                        leftY = yPos;
                        rightY = yPos;
                        currentColumn = 0;
                        continue; // Reintentar en nueva página
                    }
                }

                // Extraer metadata y limpiar contenido
                const metadata = this.extractBitacoraMetadata(log.content);
                const cleanContent = this.getCleanContent(log.content);

                // Tarjeta de nota con diseño elegante
                const noteWidth = columnWidth - (columnMargin * 2);
                
                // Header de la nota con fondo de color
                doc.setFillColor(...primaryColor);
                doc.rect(columnX + columnMargin, currentY, noteWidth, 10, 'F');
                
                doc.setFontSize(9);
                doc.setFont('helvetica', 'bold');
                doc.setTextColor(255, 255, 255);
                doc.text(`FOLIO #${log.note_number || 'N/A'}`, columnX + columnMargin + 3, currentY + 6);
                
                doc.setFontSize(7);
                doc.setFont('helvetica', 'normal');
                const classification = (log.classification || 'Informe').toUpperCase();
                doc.text(classification, columnX + columnMargin + 35, currentY + 6);
                
                currentY += 12;

                // Asunto
                doc.setFontSize(10);
                doc.setFont('helvetica', 'bold');
                doc.setTextColor(...darkGray);
                const subject = log.subject || log.content?.substring(0, 50) || 'Sin asunto';
                const subjectLines = doc.splitTextToSize(subject, noteWidth - 6);
                doc.text(subjectLines, columnX + columnMargin + 3, currentY);
                currentY += subjectLines.length * 5 + 3;

                // Línea decorativa
                doc.setLineWidth(0.2);
                doc.setDrawColor(200, 200, 200);
                doc.line(columnX + columnMargin + 3, currentY, columnX + noteWidth - columnMargin - 3, currentY);
                currentY += 3;

                // Contenido principal
                const contentToShow = cleanContent || log.content || '';
                if (contentToShow && contentToShow.trim()) {
                    doc.setFontSize(8);
                    doc.setFont('helvetica', 'normal');
                    doc.setTextColor(51, 65, 85);
                    const contentLines = doc.splitTextToSize(contentToShow, noteWidth - 6);
                    doc.text(contentLines, columnX + columnMargin + 3, currentY);
                    currentY += contentLines.length * 4 + 3;
                } else if (!log.subject && !log.content) {
                    // Si no hay asunto ni contenido, mostrar al menos un mensaje
                    doc.setFontSize(8);
                    doc.setFont('helvetica', 'italic');
                    doc.setTextColor(150, 150, 150);
                    doc.text('(Nota sin contenido)', columnX + columnMargin + 3, currentY);
                    currentY += 5;
                }

                // Metadata adicional
                if (metadata && (metadata.weather || metadata.materials || metadata.personnel)) {
                    doc.setFontSize(7);
                    doc.setFont('helvetica', 'bold');
                    doc.setTextColor(...primaryColor);
                    doc.text("INFO ADICIONAL:", columnX + columnMargin + 3, currentY);
                    currentY += 4;
                    
                    doc.setFontSize(7);
                    doc.setFont('helvetica', 'normal');
                    doc.setTextColor(51, 65, 85);
                    
                    if (metadata.weather) {
                        doc.text(`• Clima: ${metadata.weather}`, columnX + columnMargin + 5, currentY);
                        currentY += 4;
                    }
                    if (metadata.materials) {
                        doc.text(`• Materiales: ${metadata.materials}`, columnX + columnMargin + 5, currentY);
                        currentY += 4;
                    }
                    if (metadata.personnel) {
                        doc.text(`• Personal: ${metadata.personnel}`, columnX + columnMargin + 5, currentY);
                        currentY += 4;
                    }
                    currentY += 2;
                }

                // Observaciones
                if (metadata && metadata.observations) {
                    doc.setFontSize(7);
                    doc.setFont('helvetica', 'bold');
                    doc.setTextColor(139, 92, 246);
                    doc.text("OBSERVACIONES:", columnX + columnMargin + 3, currentY);
                    currentY += 4;
                    
                    doc.setFontSize(7);
                    doc.setFont('helvetica', 'italic');
                    doc.setTextColor(71, 85, 105);
                    const obsLines = doc.splitTextToSize(metadata.observations, noteWidth - 6);
                    doc.text(obsLines, columnX + columnMargin + 5, currentY);
                    currentY += obsLines.length * 4 + 3;
                }

                // Footer de la nota con badges
                doc.setLineWidth(0.2);
                doc.setDrawColor(220, 220, 220);
                doc.line(columnX + columnMargin + 3, currentY, columnX + noteWidth - columnMargin - 3, currentY);
                currentY += 4;

                // Badges de información (más pequeños para caber)
                const badgeY = currentY;
                let badgeX = columnX + columnMargin + 3;
                
                // Badge de avance
                doc.setFillColor(...primaryColor);
                doc.rect(badgeX, badgeY, 22, 6, 'F');
                doc.setFontSize(6);
                doc.setFont('helvetica', 'bold');
                doc.setTextColor(255, 255, 255);
                doc.text(`${log.progress_percentage || 0}%`, badgeX + 1, badgeY + 4.5);
                badgeX += 24;

                // Badge de autor
                doc.setFillColor(139, 92, 246);
                doc.rect(badgeX, badgeY, 25, 6, 'F');
                doc.text(log.author_role || 'N/A', badgeX + 1, badgeY + 4.5);
                badgeX += 27;

                // Badge de estatus
                const statusColor = log.status === 'Cerrada' ? [34, 197, 94] : [251, 191, 36];
                doc.setFillColor(...statusColor);
                doc.rect(badgeX, badgeY, 20, 6, 'F');
                doc.text(log.status || 'Abierta', badgeX + 1, badgeY + 4.5);

                currentY += 9;

                // Dibujar borde de la tarjeta completa
                const noteCardHeight = currentY - noteStartY;
                doc.setFillColor(255, 255, 255);
                doc.setDrawColor(...secondaryColor);
                doc.setLineWidth(0.5);
                doc.rect(columnX + columnMargin, noteStartY, noteWidth, noteCardHeight, 'FD');

                // Actualizar posición Y de la columna correspondiente
                if (useLeftColumn) {
                    leftY = currentY + 5;
                    currentColumn = 1; // Cambiar a columna derecha para la próxima nota
                } else {
                    rightY = currentY + 5;
                    currentColumn = 0; // Cambiar a columna izquierda para la próxima nota
                }
                
                logProcessed = true; // Marcar como procesado
                console.log(`  Nota ${log.note_number} renderizada exitosamente en Y=${noteStartY} a Y=${currentY}`);
            }
        }
        
        console.log('Renderizado completado. Total de notas procesadas:', sortedLogs.length);

        // Footer final
        addFooter(pageNum, totalPages);

        // Guardar
        const fileName = `BITACORA_${projectInfo.project?.replace(/\s+/g, '_') || 'OBRA'}_${reportDate}.pdf`;
        doc.save(fileName);
    }

    /**
     * Genera un preview del reporte de bitácora en PDF (retorna blob en lugar de descargar)
     * @param {Object} projectInfo - Información del proyecto
     * @param {Array} logs - Lista completa de logs de bitácora
     * @param {string} reportDate - Fecha del reporte
     * @param {Object} options - Opciones adicionales
     * @returns {Blob} - Blob del PDF generado
     */
    static async generateBitacoraReportPreview(projectInfo, logs, reportDate, options = {}) {
        const doc = new jsPDF('landscape', 'mm', 'a4');
        const pageWidth = doc.internal.pageSize.width; // 297mm en horizontal
        const pageHeight = doc.internal.pageSize.height; // 210mm en horizontal
        const margin = 15;
        const gutter = 8; // Espacio entre columnas
        const columnWidth = (pageWidth - (margin * 2) - gutter) / 2; // Dos columnas con espacio entre ellas
        
        // Colores profesionales
        const primaryColor = [79, 70, 229]; // Indigo
        const secondaryColor = [251, 191, 36]; // Amber
        const lightAmber = [255, 251, 235];
        const darkGray = [51, 65, 85];
        const mediumGray = [100, 116, 139];

        // Helper para agregar header en cada página
        const addHeader = () => {
            // Fondo del header con gradiente
            doc.setFillColor(...primaryColor);
            doc.rect(0, 0, pageWidth, 35, 'F');
            
            // Título principal
            doc.setFontSize(20);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(255, 255, 255);
            doc.text("BITÁCORA DE OBRA", pageWidth / 2, 18, { align: 'center' });
            
            // Subtítulo
            doc.setFontSize(9);
            doc.setFont('helvetica', 'normal');
            doc.text("DOCUMENTO OFICIAL DE SEGUIMIENTO", pageWidth / 2, 26, { align: 'center' });
            
            // Línea decorativa
            doc.setDrawColor(255, 255, 255);
            doc.setLineWidth(0.5);
            doc.line(margin, 32, pageWidth - margin, 32);
            
            return 40; // Retornar posición Y después del header
        };

        // Helper para agregar footer con firma
        const addFooter = (pageNum, totalPages) => {
            const footerY = pageHeight - 50;
            
            // Línea separadora
            doc.setLineWidth(0.3);
            doc.setDrawColor(200, 200, 200);
            doc.line(margin, footerY, pageWidth - margin, footerY);
            
            // Sección de firma
            const signatureY = footerY + 8;
            doc.setLineWidth(0.5);
            doc.setDrawColor(0, 0, 0);
            
            // Línea de firma izquierda
            const leftSigX = margin + 50;
            doc.line(leftSigX - 40, signatureY, leftSigX + 40, signatureY);
            doc.setFontSize(8);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(0, 0, 0);
            doc.text("RESIDENTE", leftSigX, signatureY + 6, { align: 'center' });
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(7);
            doc.text("Firma y Sello", leftSigX, signatureY + 11, { align: 'center' });
            
            // Línea de firma derecha
            const rightSigX = pageWidth - margin - 50;
            doc.line(rightSigX - 40, signatureY, rightSigX + 40, signatureY);
            doc.setFontSize(8);
            doc.setFont('helvetica', 'bold');
            doc.text("SUPERVISOR", rightSigX, signatureY + 6, { align: 'center' });
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(7);
            doc.text("Firma y Sello", rightSigX, signatureY + 11, { align: 'center' });
            
            // Información de página
            doc.setFontSize(7);
            doc.setTextColor(150, 150, 150);
            doc.text(`Página ${pageNum}`, pageWidth / 2, pageHeight - 5, { align: 'center' });
        };

        // Ordenar logs por fecha
        const sortedLogs = [...logs].sort((a, b) =>
            new Date(a.log_date || a.created_at) - new Date(b.log_date || b.created_at)
        );

        let yPos = addHeader();
        let pageNum = 1;
        const totalPages = Math.ceil(sortedLogs.length / 2) + 1; // Estimación

        // Información del proyecto con estilo elegante (solo en primera página)
        doc.setFillColor(...lightAmber);
        doc.setDrawColor(...secondaryColor);
        doc.setLineWidth(0.5);
        doc.rect(margin, yPos, pageWidth - (margin * 2), 18, 'FD');
        
        yPos += 5;
        doc.setFontSize(9);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...darkGray);
        doc.text("PROYECTO:", margin + 5, yPos);
        doc.setFont('helvetica', 'normal');
        doc.text(projectInfo.project || projectInfo.name || 'Proyecto', margin + 28, yPos);

        yPos += 5;
        doc.setFont('helvetica', 'bold');
        doc.text("UBICACIÓN:", margin + 5, yPos);
        doc.setFont('helvetica', 'normal');
        doc.text(projectInfo.location || 'No especificada', margin + 28, yPos);

        yPos += 5;
        doc.setFont('helvetica', 'bold');
        doc.text("FECHA:", margin + 5, yPos);
        doc.setFont('helvetica', 'normal');
        doc.text(new Date(reportDate).toLocaleDateString('es-MX', { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
        }), margin + 28, yPos);

        yPos += 12;

        // Variables para control de columnas (simular libro abierto)
        let currentColumn = 0; // 0 = izquierda, 1 = derecha
        let leftY = yPos;
        let rightY = yPos;
        const columnMargin = 2;

        // Procesar cada nota en dos columnas
        for (const log of sortedLogs) {
            let logProcessed = false;
            
            while (!logProcessed) {
                // Determinar en qué columna colocar la nota
                const useLeftColumn = currentColumn === 0;
                const columnX = useLeftColumn ? margin : (margin + columnWidth + gutter);
                let currentY = useLeftColumn ? leftY : rightY;
                const noteStartY = currentY;

                // Verificar si necesitamos nueva página o cambiar de columna
                // Ajustar límite a 60mm para dar más espacio (antes era 100mm)
                if (currentY > pageHeight - 60) {
                    if (useLeftColumn && rightY <= pageHeight - 60) {
                        // Columna izquierda llena, cambiar a derecha
                        currentColumn = 1;
                        continue; // Reintentar en columna derecha
                    } else {
                        // Ambas columnas llenas o columna derecha llena, nueva página
                        addFooter(pageNum, totalPages);
                        doc.addPage('landscape');
                        pageNum++;
                        yPos = addHeader();
                        leftY = yPos;
                        rightY = yPos;
                        currentColumn = 0;
                        continue; // Reintentar en nueva página
                    }
                }

                // Extraer metadata y limpiar contenido
                const metadata = this.extractBitacoraMetadata(log.content);
                const cleanContent = this.getCleanContent(log.content);

            // Tarjeta de nota con diseño elegante
            const noteWidth = columnWidth - (columnMargin * 2);
            
            // Header de la nota con fondo de color
            doc.setFillColor(...primaryColor);
            doc.rect(columnX + columnMargin, currentY, noteWidth, 10, 'F');
            
            doc.setFontSize(9);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(255, 255, 255);
            doc.text(`FOLIO #${log.note_number || 'N/A'}`, columnX + columnMargin + 3, currentY + 6);
            
            doc.setFontSize(7);
            doc.setFont('helvetica', 'normal');
            const classification = (log.classification || 'Informe').toUpperCase();
            doc.text(classification, columnX + columnMargin + 35, currentY + 6);
            
            currentY += 12;

            // Asunto
            doc.setFontSize(10);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(...darkGray);
            const subjectLines = doc.splitTextToSize(log.subject || 'Sin asunto', noteWidth - 6);
            doc.text(subjectLines, columnX + columnMargin + 3, currentY);
            currentY += subjectLines.length * 5 + 3;

            // Línea decorativa
            doc.setLineWidth(0.2);
            doc.setDrawColor(200, 200, 200);
            doc.line(columnX + columnMargin + 3, currentY, columnX + noteWidth - columnMargin - 3, currentY);
            currentY += 3;

            // Contenido principal
            if (cleanContent) {
                doc.setFontSize(8);
                doc.setFont('helvetica', 'normal');
                doc.setTextColor(51, 65, 85);
                const contentLines = doc.splitTextToSize(cleanContent, noteWidth - 6);
                doc.text(contentLines, columnX + columnMargin + 3, currentY);
                currentY += contentLines.length * 4 + 3;
            }

            // Metadata adicional
            if (metadata && (metadata.weather || metadata.materials || metadata.personnel)) {
                doc.setFontSize(7);
                doc.setFont('helvetica', 'bold');
                doc.setTextColor(...primaryColor);
                doc.text("INFO ADICIONAL:", columnX + columnMargin + 3, currentY);
                currentY += 4;
                
                doc.setFontSize(7);
                doc.setFont('helvetica', 'normal');
                doc.setTextColor(51, 65, 85);
                
                if (metadata.weather) {
                    doc.text(`• Clima: ${metadata.weather}`, columnX + columnMargin + 5, currentY);
                    currentY += 4;
                }
                if (metadata.materials) {
                    doc.text(`• Materiales: ${metadata.materials}`, columnX + columnMargin + 5, currentY);
                    currentY += 4;
                }
                if (metadata.personnel) {
                    doc.text(`• Personal: ${metadata.personnel}`, columnX + columnMargin + 5, currentY);
                    currentY += 4;
                }
                currentY += 2;
            }

            // Observaciones
            if (metadata && metadata.observations) {
                doc.setFontSize(7);
                doc.setFont('helvetica', 'bold');
                doc.setTextColor(139, 92, 246);
                doc.text("OBSERVACIONES:", columnX + columnMargin + 3, currentY);
                currentY += 4;
                
                doc.setFontSize(7);
                doc.setFont('helvetica', 'italic');
                doc.setTextColor(71, 85, 105);
                const obsLines = doc.splitTextToSize(metadata.observations, noteWidth - 6);
                doc.text(obsLines, columnX + columnMargin + 5, currentY);
                currentY += obsLines.length * 4 + 3;
            }

            // Footer de la nota con badges
            doc.setLineWidth(0.2);
            doc.setDrawColor(220, 220, 220);
            doc.line(columnX + columnMargin + 3, currentY, columnX + noteWidth - columnMargin - 3, currentY);
            currentY += 4;

            // Badges de información (más pequeños para caber)
            const badgeY = currentY;
            let badgeX = columnX + columnMargin + 3;
            
            // Badge de avance
            doc.setFillColor(...primaryColor);
            doc.rect(badgeX, badgeY, 22, 6, 'F');
            doc.setFontSize(6);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(255, 255, 255);
            doc.text(`${log.progress_percentage || 0}%`, badgeX + 1, badgeY + 4.5);
            badgeX += 24;

            // Badge de autor
            doc.setFillColor(139, 92, 246);
            doc.rect(badgeX, badgeY, 25, 6, 'F');
            doc.text(log.author_role || 'N/A', badgeX + 1, badgeY + 4.5);
            badgeX += 27;

            // Badge de estatus
            const statusColor = log.status === 'Cerrada' ? [34, 197, 94] : [251, 191, 36];
            doc.setFillColor(...statusColor);
            doc.rect(badgeX, badgeY, 20, 6, 'F');
            doc.text(log.status || 'Abierta', badgeX + 1, badgeY + 4.5);

            currentY += 9;

            // Dibujar borde de la tarjeta completa
            const noteCardHeight = currentY - noteStartY;
            doc.setFillColor(255, 255, 255);
            doc.setDrawColor(...secondaryColor);
            doc.setLineWidth(0.5);
            doc.rect(columnX + columnMargin, noteStartY, noteWidth, noteCardHeight, 'FD');

            // Actualizar posición Y de la columna correspondiente
            if (useLeftColumn) {
                leftY = currentY + 5;
                currentColumn = 1; // Cambiar a columna derecha para la próxima nota
            } else {
                rightY = currentY + 5;
                currentColumn = 0; // Cambiar a columna izquierda para la próxima nota
            }
            
            logProcessed = true; // Marcar como procesado
            }
        }

        // Footer final
        addFooter(pageNum, totalPages);

        // Devolver blob en lugar de descargar
        return doc.output('blob');
    }

    /**
     * Genera un reporte de diario tipo libro en PDF (solo texto, sin fotos)
     * Formato elegante tipo diario con firmas
     * @param {Object} projectInfo - Información del proyecto
     * @param {Array} diaryEntries - Lista de entradas del diario
     * @param {string} reportDate - Fecha del reporte
     * @param {Object} options - Opciones adicionales
     */
    static async generateDiaryReport(projectInfo, diaryEntries, reportDate, options = {}) {
        const doc = new jsPDF();
        const pageWidth = doc.internal.pageSize.width;
        const pageHeight = doc.internal.pageSize.height;
        const margin = 20;
        const contentWidth = pageWidth - (margin * 2);

        // Header elegante tipo libro
        doc.setFillColor(240, 240, 240);
        doc.rect(0, 0, pageWidth, 40, 'F');
        
        doc.setFontSize(18);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(0, 0, 0);
        doc.text("DIARIO DE OBRA", pageWidth / 2, 18, { align: 'center' });
        
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(100, 100, 100);
        doc.text(projectInfo.project || projectInfo.name || 'Proyecto', pageWidth / 2, 28, { align: 'center' });
        
        doc.setFontSize(8);
        doc.text(`Generado el ${new Date(reportDate).toLocaleDateString('es-MX')}`, pageWidth / 2, 35, { align: 'center' });

        let yPos = 50;

        // Ordenar entradas por fecha (más antiguas primero, como un diario)
        const sortedEntries = [...diaryEntries].sort((a, b) => {
            const dateA = new Date(a.log_date || a.created_at);
            const dateB = new Date(b.log_date || b.created_at);
            return dateA - dateB;
        });

        // Procesar cada entrada del diario
        for (let i = 0; i < sortedEntries.length; i++) {
            const entry = sortedEntries[i];
            
            // Verificar si necesitamos nueva página
            if (yPos > pageHeight - 80) {
                doc.addPage();
                // Repetir header en nueva página
                doc.setFillColor(240, 240, 240);
                doc.rect(0, 0, pageWidth, 40, 'F');
                doc.setFontSize(18);
                doc.setFont('helvetica', 'bold');
                doc.setTextColor(0, 0, 0);
                doc.text("DIARIO DE OBRA", pageWidth / 2, 18, { align: 'center' });
                doc.setFontSize(10);
                doc.setFont('helvetica', 'normal');
                doc.setTextColor(100, 100, 100);
                doc.text(projectInfo.project || projectInfo.name || 'Proyecto', pageWidth / 2, 28, { align: 'center' });
                yPos = 50;
            }

            // Número de entrada y fecha
            doc.setFontSize(10);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(59, 130, 246); // Azul
            const entryDate = new Date(entry.log_date || entry.created_at);
            const dateStr = entryDate.toLocaleDateString('es-MX', { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
            });
            doc.text(`ENTRADA #${entry.note_number || i + 1} - ${dateStr}`, margin, yPos);
            
            yPos += 8;

            // Línea decorativa
            doc.setLineWidth(0.5);
            doc.setDrawColor(200, 200, 200);
            doc.line(margin, yPos, pageWidth - margin, yPos);
            yPos += 5;

            // Contenido del diario
            if (entry.content) {
                doc.setFontSize(9);
                doc.setFont('helvetica', 'normal');
                doc.setTextColor(0, 0, 0);
                const contentLines = doc.splitTextToSize(entry.content, contentWidth);
                doc.text(contentLines, margin, yPos);
                yPos += contentLines.length * 4.5 + 5;
            }

            // Información del autor y firma
            yPos += 3;
            doc.setFontSize(7);
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(100, 100, 100);
            
            const authorInfo = [];
            if (entry.authorName) authorInfo.push(entry.authorName);
            if (entry.authorRole) authorInfo.push(entry.authorRole);
            if (entry.authorSignature) authorInfo.push(`Firma: ${entry.authorSignature}`);
            
            if (authorInfo.length > 0) {
                doc.text(authorInfo.join(' • '), margin, yPos);
                yPos += 6;
            }

            // Línea separadora entre entradas
            if (i < sortedEntries.length - 1) {
                doc.setLineWidth(0.2);
                doc.setDrawColor(220, 220, 220);
                doc.line(margin, yPos, pageWidth - margin, yPos);
                yPos += 10;
            }
        }

        // Footer con información del proyecto
        const footerY = pageHeight - 25;
        doc.setFontSize(7);
        doc.setTextColor(150, 150, 150);
        doc.text(`Diario de Obra - ${projectInfo.project || projectInfo.name || 'Proyecto'}`, pageWidth / 2, footerY, { align: 'center' });
        doc.text(`Total de entradas: ${sortedEntries.length}`, pageWidth / 2, footerY + 5, { align: 'center' });

        // Guardar
        const fileName = `DIARIO_DE_OBRA_${projectInfo.project?.replace(/\s+/g, '_') || 'OBRA'}_${reportDate}.pdf`;
        doc.save(fileName);
    }
}

export default PDFReportService;
