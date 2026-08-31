import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export class PDFReportService {
    // Version: Fix autoTable import
    /**
     * Distribución de fotos por hoja según el número de columnas elegido.
     * Menos columnas = fotos más grandes; más columnas = más evidencia por hoja.
     */
    static PHOTO_GRID_PRESETS = {
        2: { rows: 1 },  // 2 fotos por hoja (grandes)
        3: { rows: 2 },  // 6 fotos por hoja (formato estándar)
        4: { rows: 2 }   // 8 fotos por hoja (compacto)
    };

    /**
     * Carga una imagen en un elemento <img> para poder medirla y redibujarla.
     */
    static loadImageElement(src) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.crossOrigin = 'anonymous';
            img.onload = () => resolve(img);
            img.onerror = () => reject(new Error('No se pudo decodificar la imagen'));
            img.src = src;
        });
    }

    /**
     * Ajusta una foto al recuadro del PDF sin deformarla.
     *
     * - Foto con proporción parecida a la del recuadro: se recorta lo mínimo para
     *   llenarlo por completo, sin franjas y sin estirar.
     * - Foto muy vertical o panorámica: se muestra completa y centrada sobre fondo
     *   blanco, en vez de aplastarla para que quepa.
     * - Foto de baja resolución: nunca se amplía más allá de su tamaño real, así no
     *   se ve pixeleada al imprimir (y de paso el PDF pesa menos).
     *
     * @param {string} imgData - Imagen en dataURL o blob URL
     * @param {number} boxWidthMm - Ancho del recuadro en el PDF
     * @param {number} boxHeightMm - Alto del recuadro en el PDF
     * @param {Object} options - fit ('auto' | 'cover' | 'contain'), dpi, coverTolerance,
     *                           background ('#ffffff' o 'transparent' para logos)
     * @returns {Promise<{data: string, format: string}>} Imagen lista para addImage
     */
    static async fitImageToBox(imgData, boxWidthMm, boxHeightMm, options = {}) {
        const {
            fit = 'auto',
            dpi = 150,
            coverTolerance = 1.3, // hasta 30% de diferencia de proporción se recorta
            maxSidePx = 2200,
            background = '#ffffff'
        } = options;
        const keepTransparency = background === 'transparent';

        // Sin DOM (pruebas / Node) no hay canvas: se usa la imagen tal cual
        if (typeof document === 'undefined') return { data: imgData, format: keepTransparency ? 'PNG' : 'JPEG' };

        try {
            const img = await this.loadImageElement(imgData);
            const srcW = img.naturalWidth || img.width;
            const srcH = img.naturalHeight || img.height;
            if (!srcW || !srcH) return { data: imgData, format: keepTransparency ? 'PNG' : 'JPEG' };

            const boxAspect = boxWidthMm / boxHeightMm;
            const srcAspect = srcW / srcH;

            // Qué tan lejos está la foto de la proporción del recuadro
            const aspectMismatch = Math.max(srcAspect / boxAspect, boxAspect / srcAspect);
            const mode = fit === 'auto'
                ? (aspectMismatch <= coverTolerance ? 'cover' : 'contain')
                : fit;

            // Tamaño del recuadro en píxeles a la resolución de impresión
            let targetW = Math.round((boxWidthMm / 25.4) * dpi);
            let targetH = Math.round((boxHeightMm / 25.4) * dpi);

            // Nunca ampliar una foto chica: se reduce el lienzo para conservar nitidez
            const neededScale = mode === 'cover'
                ? Math.max(targetW / srcW, targetH / srcH)
                : Math.min(targetW / srcW, targetH / srcH);
            let canvasScale = neededScale > 1 ? 1 / neededScale : 1;

            // Tope de memoria para fotos enormes
            const largestSide = Math.max(targetW, targetH) * canvasScale;
            if (largestSide > maxSidePx) canvasScale *= maxSidePx / largestSide;

            targetW = Math.max(1, Math.round(targetW * canvasScale));
            targetH = Math.max(1, Math.round(targetH * canvasScale));

            const canvas = document.createElement('canvas');
            canvas.width = targetW;
            canvas.height = targetH;
            const ctx = canvas.getContext('2d');
            if (!ctx) return { data: imgData, format: keepTransparency ? 'PNG' : 'JPEG' };

            // Los logos se dejan transparentes para no tapar la banda del membrete
            if (!keepTransparency) {
                ctx.fillStyle = background;
                ctx.fillRect(0, 0, targetW, targetH);
            }
            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = 'high';

            if (mode === 'cover') {
                // Llenar el recuadro recortando el sobrante por los lados
                const scale = Math.max(targetW / srcW, targetH / srcH);
                const cropW = targetW / scale;
                const cropH = targetH / scale;
                ctx.drawImage(
                    img,
                    (srcW - cropW) / 2, (srcH - cropH) / 2, cropW, cropH,
                    0, 0, targetW, targetH
                );
            } else {
                // Mostrar la foto completa, centrada, sin recortar nada
                const scale = Math.min(targetW / srcW, targetH / srcH);
                const drawW = srcW * scale;
                const drawH = srcH * scale;
                ctx.drawImage(img, (targetW - drawW) / 2, (targetH - drawH) / 2, drawW, drawH);
            }

            return keepTransparency
                ? { data: canvas.toDataURL('image/png'), format: 'PNG' }
                : { data: canvas.toDataURL('image/jpeg', 0.86), format: 'JPEG' };
        } catch (error) {
            // Imagen de otro origen sin CORS, formato raro, etc.: se usa la original
            console.warn('No se pudo ajustar la foto al recuadro, se usa la original:', error);
            return { data: imgData, format: keepTransparency ? 'PNG' : 'JPEG' };
        }
    }

    /**
     * Construye el documento del reporte fotográfico.
     * Lo usan tanto la descarga como la vista previa, para que sean idénticos.
     *
     * @param {Object} projectInfo - Información del proyecto
     * @param {Array} logs - Lista de logs con fotos agrupados por concepto
     * @param {string} reportDate - Fecha del reporte
     * @param {Object} options - contractor, contractNumber, concepts, obra, ubicacion,
     *                           firmas, logoUrl, headerColor, gridCols, photoFit
     * @returns {Promise<jsPDF>} Documento listo para guardar o exportar
     */
    static async buildPhotographicReportDoc(projectInfo, logs, reportDate, options = {}) {
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
        const ubicacion = options.ubicacion || projectInfo.ubicacion || projectInfo.location || '';
        const fechaFormateada = reportDate ? (() => {
            try {
                const d = new Date(reportDate);
                return isNaN(d.getTime()) ? reportDate : d.toLocaleDateString('es-MX', { day: '2-digit', month: '2-digit', year: 'numeric' });
            } catch (_) { return reportDate; }
        })() : '';

        // Valores editables de las firmas
        const contractorTitle = options.contractorTitle || projectInfo.contractorTitle || 'EL CONTRATISTA';
        const contractorName = options.contractorName || projectInfo.contractorName || contractor;
        const contractorRole = options.contractorRole || projectInfo.contractorRole || 'ADMINISTRADOR ÚNICO';
        const municipalityTitle = options.municipalityTitle || projectInfo.municipalityTitle || 'H. AYUNTAMIENTO';
        // Opcionales: color de encabezado y logo
        // Color más intenso para que se note claramente en pantalla y en impresión
        const headerColor = options.headerColor || [199, 210, 254]; // Indigo muy claro por defecto
        const logoUrl = options.logoUrl || projectInfo.logoUrl || null;

        // Diseño de la cuadrícula de fotos (configurable desde el editor del reporte)
        const gridCols = Math.min(4, Math.max(2, parseInt(options.gridCols ?? projectInfo.photoGridCols, 10) || 3));
        const photoFit = options.photoFit || projectInfo.photoFit || 'auto';

        // --- Helper Functions ---
        const addHeader = async () => {
            // Encabezado de constructora (membrete) + título pequeño del reporte
            const headerTop = margin;
            const headerHeight = 16;

            // Banda de color para el encabezado de la constructora
            doc.setLineWidth(0.8);
            doc.setDrawColor(0);
            doc.setFillColor(headerColor[0], headerColor[1], headerColor[2]);
            doc.rect(margin, headerTop, pageWidth - (margin * 2), headerHeight, 'FD');

            // Logo opcional a la izquierda del encabezado
            let textX = margin + 4;
            const textYBase = headerTop + 6;
            if (logoUrl) {
                try {
                    const logoData = await this.fetchImage(logoUrl);
                    const logoBoxHeight = headerHeight - 4;
                    const logoBoxWidth = logoBoxHeight * 1.5;
                    const logoX = margin + 3;
                    const logoY = headerTop + 2;
                    // El logo también se ajusta solo: se muestra completo, nunca estirado
                    const fittedLogo = await this.fitImageToBox(logoData, logoBoxWidth, logoBoxHeight, {
                        fit: 'contain',
                        background: 'transparent'
                    });
                    doc.addImage(fittedLogo.data, fittedLogo.format, logoX, logoY, logoBoxWidth, logoBoxHeight);
                    textX = logoX + logoBoxWidth + 4;
                } catch (e) {
                    console.error('Error cargando logo para encabezado PDF:', e);
                }
            }

            // Datos de la constructora (nombre, RFC u otros)
            const companyName = options.companyName || projectInfo.companyName || contractor;
            const companyRfc = options.companyRfc || projectInfo.companyRfc || '';
            const companyExtra = options.companyExtra || projectInfo.companyExtra || '';

            doc.setFont('helvetica', 'bold');
            doc.setFontSize(11);
            doc.text((companyName || '').toUpperCase(), textX, textYBase);

            doc.setFont('helvetica', 'normal');
            doc.setFontSize(7);
            let extraLineY = textYBase + 4;
            if (companyRfc) {
                doc.text(`RFC: ${companyRfc.toUpperCase()}`, textX, extraLineY);
                extraLineY += 3.5;
            }
            if (companyExtra) {
                doc.text(companyExtra.toUpperCase(), textX, extraLineY);
            }

            // Título del reporte, más pequeño, debajo del membrete
            const titleY = headerTop + headerHeight + 5;
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(10);
            doc.text("REPORTE FOTOGRAFICO DE OBRA", pageWidth / 2, titleY, { align: 'center' });

            // Preparar datos para la tabla
            // Solo mostrar el nombre de la obra; la ubicación va en su propia celda
            const conceptsText = Array.isArray(concepts) ? concepts.join(', ') : concepts;

            // Crear tabla real usando autoTable justo debajo del título
            const tableStartY = titleY + 4;

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
                        { content: 'OBRA:\n' + obra, styles: { fontSize: 7.5, cellPadding: 2 } },
                        { content: 'CONTRATO No.:\n' + contractNumber, styles: { fontSize: 7.5, cellPadding: 2 } }
                    ],
                    [
                        { content: 'UBICACIÓN:\n' + ubicacion, styles: { fontSize: 7.5, cellPadding: 2 } },
                        { content: 'CONCEPTOS:\n' + conceptsText, styles: { fontSize: 7.5, cellPadding: 2 } },
                        { content: 'FECHA:\n' + fechaFormateada, styles: { fontSize: 7.5, cellPadding: 2 } }
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
        const contentTop = await addHeader() + 4;

        // Geometría de la cuadrícula: las fotos ocupan todo el ancho útil de la hoja
        const gapX = 6;
        const captionHeight = 9;   // espacio bajo cada foto para su descripción
        const rowGap = 4;
        const usableWidth = pageWidth - (margin * 2);
        const photosPerRow = gridCols;
        const photoWidth = (usableWidth - gapX * (photosPerRow - 1)) / photosPerRow;
        const rowsPerPage = (this.PHOTO_GRID_PRESETS[gridCols] || { rows: 2 }).rows;
        const contentBottom = pageHeight - 34; // por encima de las firmas
        const availableHeight = contentBottom - contentTop;
        // La foto crece hasta llenar la hoja, sin pasar de una caja apaisada razonable
        const photoHeight = Math.max(
            20,
            Math.min(
                photoWidth * 0.7,
                (availableHeight - rowGap * (rowsPerPage - 1)) / rowsPerPage - captionHeight
            )
        );
        const rowPitch = photoHeight + captionHeight + rowGap;
        const photosPerPage = photosPerRow * rowsPerPage;

        let yPos = contentTop;

        // Recolectar fotos: concepto general va arriba (CONCEPTOS); bajo cada foto solo descripción opcional si existe
        const allPhotos = [];
        for (const [conceptName, conceptLogs] of Object.entries(logsByConcept)) {
            for (const log of conceptLogs) {
                if (!log.photos || log.photos.length === 0) continue;
                const { photoCaptions: savedCaptions } = this.parsePhotoReportContent(log.content || '');
                const photos = log.photos || [];
                for (let i = 0; i < photos.length; i++) {
                    const optionalCaption = (savedCaptions[i] || '').trim();
                    allPhotos.push({
                        url: photos[i],
                        caption: optionalCaption,
                        concept: conceptName
                    });
                }
            }
        }

        let photoIndex = 0;
        let pageStartIndex = 0;

        for (const photo of allPhotos) {
            // Nueva hoja cuando se llena la cuadrícula
            if (photoIndex > 0 && (photoIndex - pageStartIndex) >= photosPerPage) {
                addFooter();
                doc.addPage('landscape'); // Nueva página también en horizontal
                yPos = await addHeader() + 4;
                pageStartIndex = photoIndex;
            }

            // Posición dentro de la hoja actual
            const indexInPage = photoIndex - pageStartIndex;
            const col = indexInPage % photosPerRow;
            const row = Math.floor(indexInPage / photosPerRow);
            const xPos = margin + (col * (photoWidth + gapX));
            const currentYPos = yPos + (row * rowPitch);

            try {
                const imgData = await this.fetchImage(photo.url);

                if (!imgData) {
                    throw new Error('No se pudo obtener datos de la imagen');
                }

                // Ajuste automático: la foto llena el recuadro sin deformarse
                const fitted = await this.fitImageToBox(imgData, photoWidth, photoHeight, { fit: photoFit });
                doc.addImage(fitted.data, fitted.format, xPos, currentYPos, photoWidth, photoHeight);

                // Borde alrededor de la imagen (más visible como en el ejemplo)
                doc.setLineWidth(0.3);
                doc.setDrawColor(0);
                doc.rect(xPos, currentYPos, photoWidth, photoHeight);

                // Solo mostrar descripción opcional bajo la foto si el usuario puso algo (no repetir concepto general)
                if (photo.caption) {
                    doc.setFontSize(6);
                    doc.setFont('helvetica', 'normal');
                    const splitCaption = doc.splitTextToSize(photo.caption.toUpperCase(), photoWidth - 4);
                    const captionY = currentYPos + photoHeight + 4;
                    // Hasta dos líneas: el resto se recorta para no invadir la siguiente fila
                    doc.text(splitCaption.slice(0, 2), xPos + 2, captionY);
                }

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

        return doc;
    }

    /**
     * Genera un reporte fotográfico en PDF y lo descarga.
     * @param {Object} projectInfo - Información del proyecto
     * @param {Array} logs - Lista de logs con fotos agrupados por concepto
     * @param {string} reportDate - Fecha del reporte
     * @param {Object} options - Ver buildPhotographicReportDoc
     */
    static async generatePhotographicReport(projectInfo, logs, reportDate, options = {}) {
        const doc = await this.buildPhotographicReportDoc(projectInfo, logs, reportDate, options);

        // Guardar PDF (cada reporte es un PDF individual)
        const fileName = `REPORTE_FOTOGRAFICO_${projectInfo.project?.replace(/\s+/g, '_') || 'OBRA'}_${reportDate}.pdf`;
        doc.save(fileName);
    }

    /**
     * Genera el mismo reporte fotográfico pero devuelve el blob (para la vista previa).
     * Usa exactamente el mismo documento que la descarga.
     */
    static async generatePhotographicReportPreview(projectInfo, logs, reportDate, options = {}) {
        const doc = await this.buildPhotographicReportDoc(projectInfo, logs, reportDate, options);
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

    /**
     * Parsea content de un log de reporte fotográfico: extrae concepto general y descripciones opcionales por foto.
     * El concepto general va arriba (CONCEPTOS); bajo cada foto solo se muestra descripción opcional si la hay.
     * @param {string} content
     * @returns {{ cleanContent: string, photoCaptions: string[] }}
     */
    static parsePhotoReportContent(content) {
        if (!content) return { cleanContent: '', photoCaptions: [] };
        const match = content.match(/<!--PHOTO_CAPTIONS:(.*?)-->$/s);
        let photoCaptions = [];
        let cleanContent = content;
        if (match) {
            try {
                photoCaptions = JSON.parse(match[1].trim());
                if (!Array.isArray(photoCaptions)) photoCaptions = [];
            } catch (_) {}
            cleanContent = content.replace(/\n?\s*<!--PHOTO_CAPTIONS:.*?-->$/s, '').trim();
        }
        return { cleanContent, photoCaptions };
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
