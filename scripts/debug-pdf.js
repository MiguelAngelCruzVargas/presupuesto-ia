
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const pdf = require('pdf-parse');

console.log('Type of pdf:', typeof pdf);
console.log('Is pdf a class?', pdf.toString().startsWith('class'));
console.log('pdf.PDFParse:', typeof pdf.PDFParse);
if (pdf.PDFParse) {
    console.log('Is pdf.PDFParse a class?', pdf.PDFParse.toString().startsWith('class'));
}

const buffer = Buffer.from('%PDF-1.4\n%µµµµ\n1 0 obj\n<<\n/Type /Catalog\n/Pages 2 0 R\n>>\nendobj\n2 0 obj\n<<\n/Type /Pages\n/Kids [3 0 R]\n/Count 1\n>>\nendobj\n3 0 obj\n<<\n/Type /Page\n/Parent 2 0 R\n/Resources <<\n/Font <<\n/F1 4 0 R\n>>\n>>\n/MediaBox [0 0 612 792]\n/Contents 5 0 R\n>>\nendobj\n4 0 obj\n<<\n/Type /Font\n/Subtype /Type1\n/BaseFont /Helvetica\n>>\nendobj\n5 0 obj\n<<\n/Length 44\n>>\nstream\nBT\n/F1 24 Tf\n100 100 Td\n(Hello World) Tj\nET\nendstream\nendobj\nxref\n0 6\n0000000000 65535 f \n0000000015 00000 n \n0000000064 00000 n \n0000000121 00000 n \n0000000217 00000 n \n0000000305 00000 n \ntrailer\n<<\n/Size 6\n/Root 1 0 R\n>>\nstartxref\n399\n%%EOF');

(async () => {
    console.log('\n--- Tentative 1: pdf(buffer) ---');
    try {
        const data = await pdf(buffer);
        console.log('Success pdf(buffer)! Text:', data.text.substring(0, 20));
    } catch (e) {
        console.log('Error pdf(buffer):', e.message);
    }

    console.log('\n--- Tentative 2: new pdf(buffer) ---');
    try {
        const data = await new pdf(buffer); // Should fail if function
        console.log('Success new pdf(buffer)!');
    } catch (e) {
        console.log('Error new pdf(buffer):', e.message);
    }

    if (pdf.PDFParse) {
        console.log('\n--- Tentative 3: new pdf.PDFParse(buffer) ---');
        try {
            const instance = new pdf.PDFParse({ data: buffer });
            console.log('Instance created');
            if (instance.getText) {
                const data = await instance.getText();
                console.log('Success instance.getText()! Text:', data.text.substring(0, 20));
            } else {
                console.log('instance has no getText method');
            }
        } catch (e) {
            console.log('Error new pdf.PDFParse:', e.message);
        }
    }
})();
