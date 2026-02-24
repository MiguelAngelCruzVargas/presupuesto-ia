
import fs from 'fs';
import path from 'path';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);

const pdfPath = 'c:/Users/isc20/Desktop/cosas de miguel/presupuesto-ia/Presupuesto_prueba 2.pdf';
const outputPath = 'c:/Users/isc20/Desktop/cosas de miguel/presupuesto-ia/pdf-debug-output.txt';

(async () => {
    try {
        console.log(`Checking fancy pdf-parse usage...`);
        const dataBuffer = fs.readFileSync(pdfPath);
        let debugLog = "";

        let pdfPkg;
        try {
            pdfPkg = require('pdf-parse');
            debugLog += "Required 'pdf-parse' successfully.\n";
        } catch (e) {
            debugLog += `Failed to require 'pdf-parse': ${e.message}\n`;
        }

        if (pdfPkg && pdfPkg.PDFParse) {
            try {
                debugLog += "Instantiating new pdfPkg.PDFParse(buffer)...\n";
                const instance = new pdfPkg.PDFParse(dataBuffer);
                debugLog += `Instance created. Keys: ${Object.keys(instance).join(', ')}\n`;
                debugLog += `Prototype keys: ${Object.getOwnPropertyNames(Object.getPrototypeOf(instance)).join(', ')}\n`;

                // Try common method names
                const methods = ['getText', 'extract', 'parse', 'extractText'];
                for (const m of methods) {
                    if (typeof instance[m] === 'function') {
                        debugLog += `Calling method ${m}()...\n`;
                        try {
                            const res = await instance[m]();
                            debugLog += `Method ${m} returned: ${typeof res}\n`;
                            if (typeof res === 'string') debugLog += `Result len: ${res.length}\n`;
                            else if (res && res.text) debugLog += `Result.text len: ${res.text.length}\n`;
                        } catch (errM) {
                            debugLog += `Method ${m} failed: ${errM.message}\n`;
                        }
                    }
                }
            } catch (e) {
                debugLog += `Instantiation failed: ${e.message}\n`;
            }
        }

        // Also try 'pdf-parse/node' if available
        try {
            const pdfNode = require('pdf-parse/node');
            debugLog += "\nRequired 'pdf-parse/node' successfully.\n";
            debugLog += `Keys: ${Object.keys(pdfNode).join(', ')}\n`;

            // Maybe this one is different?
            if (typeof pdfNode.default === 'function') {
                debugLog += "pdfNode.default is function. Calling...\n";
                try {
                    const res = await pdfNode.default(dataBuffer);
                    debugLog += `Result: ${JSON.stringify(res).substring(0, 100)}\n`;
                } catch (e) { debugLog += `Call failed: ${e.message}\n`; }
            }
        } catch (e) {
            debugLog += `Failed to require 'pdf-parse/node': ${e.message}\n`;
        }

        fs.writeFileSync(outputPath, debugLog);
        console.log("Done.");

    } catch (error) {
        console.error('Fatal Error:', error);
        fs.writeFileSync(outputPath, `FATAL ERROR: ${error.message}`);
    }
})();
