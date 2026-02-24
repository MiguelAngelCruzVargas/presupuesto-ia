// src/lib/aiProxyServer.js
// Simple Express server that proxies AI API calls to keep the API key secret.
// Run with: node src/lib/aiProxyServer.js (or via npm script)

import 'dotenv/config'; // Load env vars BEFORE other imports
import express from 'express';
import multer from 'multer';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { apiKeyManager, FUNCTION_TYPE, USER_TIER, PROVIDERS } from '../services/ApiKeyManager.js';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const pdf = require('pdf-parse');
// In this environment, pdf is an object { PDFParse: [Function] }, so we use that.
const pdfParse = pdf.PDFParse || pdf;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json());
app.use(cors());

// ============================================
// RATE LIMITING - Protección de API
// ============================================
const rateLimitMap = new Map(); // Almacena requests por IP

// Configuración de rate limiting
// Configuración de rate limiting avanzada
const RATE_LIMIT_CONFIG = {
    global: {
        windowMs: 60 * 1000,
        maxRequestsPerWindow: 20,
        maxRequestsPerDay: 2000,
    },
    // Límites específicos por tipo de función
    byFunction: {
        [FUNCTION_TYPE.BUDGET]: {
            dailyLimit: 20,
            cooldownMs: 60 * 1000, // 1 minuto entre presupuestos
            name: "Generación de Presupuestos"
        },
        [FUNCTION_TYPE.SCHEDULE]: {
            dailyLimit: 20,
            cooldownMs: 60 * 1000, // 1 minuto entre cronogramas
            name: "Generación de Cronogramas"
        },
        [FUNCTION_TYPE.PRICES]: {
            dailyLimit: 50,
            cooldownMs: 10 * 1000, // 10 segundos entre consultas
            name: "Consulta de Precios"
        },
        [FUNCTION_TYPE.PRICE_SEARCH]: {
            dailyLimit: 50,
            cooldownMs: 15 * 1000, // 15 segundos entre búsquedas
            name: "Búsqueda de Mercado"
        },
        [FUNCTION_TYPE.ANALYSIS]: {
            dailyLimit: 30,
            cooldownMs: 30 * 1000, // 30 segundos entre análisis
            name: "Análisis de Proyecto"
        },
        [FUNCTION_TYPE.GENERAL]: { // Chat y otros
            dailyLimit: 500,
            cooldownMs: 2 * 1000,  // 2 segundos (chat fluido)
            name: "Chat Asistente"
        }
    },
    cleanupInterval: 60 * 1000
};

// Limpiar entradas antiguas periódicamente
setInterval(() => {
    const now = Date.now();
    for (const [ip, data] of rateLimitMap.entries()) {
        if (now - data.firstRequest > 24 * 60 * 60 * 1000) {
            rateLimitMap.delete(ip);
        }
    }
}, RATE_LIMIT_CONFIG.cleanupInterval);

app.set('trust proxy', 1);

// Middleware de rate limiting mejorado
const rateLimiter = (req, res, next) => {
    const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.connection.remoteAddress || 'unknown';
    const now = Date.now();

    // Identificar el tipo de función del request (si existe)
    let functionType = FUNCTION_TYPE.GENERAL;
    if (req.body && req.body.functionType) {
        functionType = req.body.functionType;
    } else if (req.url.includes('/chat')) {
        functionType = FUNCTION_TYPE.GENERAL;
    } else if (req.url.includes('/pricesearch')) {
        functionType = FUNCTION_TYPE.PRICE_SEARCH;
    }

    if (!rateLimitMap.has(ip)) {
        rateLimitMap.set(ip, {
            requests: [],
            firstRequest: now,
            dailyCount: 0,
            functionUsage: {} // Track usage per function
        });
    }

    const ipData = rateLimitMap.get(ip);

    // Reset diario
    if (now - ipData.firstRequest > 24 * 60 * 60 * 1000) {
        ipData.dailyCount = 0;
        ipData.firstRequest = now;
        ipData.functionUsage = {};
    }

    // 1. Verificar Límite Global Diario
    if (ipData.dailyCount >= RATE_LIMIT_CONFIG.global.maxRequestsPerDay) {
        console.warn(`⚠️ Límite global diario excedido para IP: ${ip}`);
        return res.status(429).json({
            error: 'Has excedido el límite diario total de consultas al sistema.',
            retryAfter: 3600
        });
    }

    // 2. Verificar Límite por Función (Daily + Cooldown)
    const config = RATE_LIMIT_CONFIG.byFunction[functionType] || RATE_LIMIT_CONFIG.byFunction[FUNCTION_TYPE.GENERAL];

    // Inicializar usage para esta función si no existe
    if (!ipData.functionUsage[functionType]) {
        ipData.functionUsage[functionType] = {
            count: 0,
            lastRequest: 0
        };
    }
    const funcUsage = ipData.functionUsage[functionType];

    // Check Daily Limit per Function
    if (funcUsage.count >= config.dailyLimit) {
        console.warn(`⚠️ Límite diario de ${config.name} excedido para IP: ${ip}`);
        return res.status(429).json({
            error: `Has alcanzado el límite diario para ${config.name} (${config.dailyLimit} usos). Intenta mañana.`,
            retryAfter: 3600
        });
    }

    // Check Cooldown per Function
    const timeSinceLast = now - funcUsage.lastRequest;
    if (timeSinceLast < config.cooldownMs) {
        const waitTime = Math.ceil((config.cooldownMs - timeSinceLast) / 1000);
        console.warn(`⚠️ Cooldown activo para ${config.name} (IP: ${ip})`);
        return res.status(429).json({
            error: `Por favor espera ${waitTime}s antes de usar ${config.name} nuevamente.`,
            retryAfter: waitTime
        });
    }

    // Actualizar contadores
    ipData.requests.push(now);
    ipData.dailyCount++;

    funcUsage.count++;
    funcUsage.lastRequest = now;

    // Headers informativos
    res.setHeader('X-RateLimit-Limit', config.dailyLimit);
    res.setHeader('X-RateLimit-Remaining', config.dailyLimit - funcUsage.count);

    next();
};

// --- FILE UPLOAD CONFIG ---
// Ensure uploads directory exists
const uploadDir = path.join(__dirname, '../../uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

// Serve static files from uploads directory
app.use('/uploads', express.static(uploadDir));

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});

// Configuración de límite de tamaño para uploads
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

const upload = multer({
    storage: storage,
    limits: {
        fileSize: MAX_FILE_SIZE
    },
    fileFilter: (req, file, cb) => {
        // Validar tipo de archivo
        const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'application/pdf'];
        if (allowedTypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error(`Tipo de archivo no permitido. Solo se permiten: ${allowedTypes.join(', ')}`));
        }
    }
});

app.post('/api/upload', upload.single('file'), (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
    }

    // Validación adicional de tamaño (por si acaso)
    if (req.file.size > MAX_FILE_SIZE) {
        // Eliminar archivo si excede el límite
        try {
            fs.unlinkSync(req.file.path);
        } catch (unlinkError) {
            console.warn('Error eliminando archivo excedido:', unlinkError);
        }
        return res.status(400).json({
            error: `El archivo es demasiado grande (${(req.file.size / 1024 / 1024).toFixed(2)}MB). El tamaño máximo permitido es 5MB.`
        });
    }

    const fileUrl = `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`;
    res.json({
        url: fileUrl,
        filename: req.file.filename,
        size: req.file.size,
        originalName: req.file.originalname
    });
});

// Key genérica como fallback (compatibilidad hacia atrás)
const AI_API_KEY_FALLBACK = process.env.AI_API_KEY || process.env.GEMINI_API_KEY; // Soporte para AI_API_KEY o GEMINI_API_KEY

// Usar el modelo más reciente disponible (gemini-flash-latest es un alias estable)
const GEMINI_ENDPOINT = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent';
const GROQ_ENDPOINT = 'https://api.groq.com/openai/v1/chat/completions';
const GROQ_MODEL = "llama-3.3-70b-versatile"; // Modelo de Groq actualizado a Llama 3.3 70B

// Verificar que haya al menos una key disponible para Gemini o Groq
if (
    (!apiKeyManager.hasAvailableKeys(PROVIDERS.GEMINI, USER_TIER.FREE) && !AI_API_KEY_FALLBACK) &&
    !apiKeyManager.hasAvailableKeys(PROVIDERS.GROQ, USER_TIER.FREE)
) {
    console.error('\n❌ ERROR: No hay API keys configuradas para Gemini o Groq.');
    console.error('\n📝 Pasos para solucionarlo:');
    console.error('1. Agrega al menos una de estas al archivo .env:');
    console.error('   - GEMINI_API_KEY_FREE_1=tu_api_key (o AI_API_KEY=tu_api_key como fallback)');
    console.error('   - GROQ_API_KEY_FREE_1=tu_api_key');
    console.error('2. Obtén tu API key de Gemini en: https://aistudio.google.com/app/apikey');
    console.error('3. Obtén tu API key de Groq en: https://console.groq.com/keys');
    console.error('4. Reinicia el proxy con: npm run ai-proxy\n');
    process.exit(1);
}

const stats = apiKeyManager.getStats();
console.log(`\n✅ Sistema de API Keys configurado:`);
console.log(`   - Keys FREE disponibles: ${stats.totalKeys.free}`);
console.log(`   - Keys PRO disponibles: ${stats.totalKeys.pro}`);
if (AI_API_KEY_FALLBACK) {
    console.log(`   - Key genérica (fallback): Configurada`);
}
console.log(`✅ Modelos disponibles: Gemini (gemini-flash-latest), Groq (${GROQ_MODEL})`);
console.log(`✅ Directorio de uploads: ${uploadDir}`);


app.post('/api/ai', rateLimiter, async (req, res) => {
    try {
        const { prompt, systemInstruction, userTier, functionType } = req.body;

        if (!prompt) {
            return res.status(400).json({ error: 'Prompt es requerido' });
        }

        const tier = userTier || USER_TIER.FREE;
        const funcType = functionType || FUNCTION_TYPE.GENERAL;
        let apiKey;
        let providerUsed;
        let endpointUsed;
        let requestBody;
        let maskedKey;

        // PRIORIDAD: Intentar con Groq primero (Solicitud del usuario)
        apiKey = apiKeyManager.getApiKey(PROVIDERS.GROQ, tier, funcType);
        if (apiKey) {
            providerUsed = PROVIDERS.GROQ;
            endpointUsed = GROQ_ENDPOINT;
            maskedKey = apiKeyManager.maskKey(apiKey);

            requestBody = {
                model: GROQ_MODEL,
                messages: [
                    { role: "system", content: systemInstruction || "You are a helpful AI assistant." },
                    { role: "user", content: prompt }
                ],
                temperature: 0.2,
                max_tokens: 8192,
            };
        } else {
            // Si no hay Groq, intentar con Gemini
            apiKey = apiKeyManager.getApiKey(PROVIDERS.GEMINI, tier, funcType);
            if (apiKey) {
                providerUsed = PROVIDERS.GEMINI;
                endpointUsed = GEMINI_ENDPOINT;
                maskedKey = apiKeyManager.maskKey(apiKey);

                requestBody = {
                    contents: [{
                        parts: [{ text: prompt }]
                    }]
                };
                if (systemInstruction) {
                    requestBody.systemInstruction = {
                        parts: [{ text: systemInstruction }]
                    };
                }
                requestBody.generationConfig = {
                    temperature: 0.2,
                    topP: 0.9,
                    topK: 32,
                    maxOutputTokens: 8192,
                };
                requestBody.safetySettings = [
                    { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_ONLY_HIGH' },
                    { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_ONLY_HIGH' },
                    { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_ONLY_HIGH' },
                    { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_ONLY_HIGH' },
                ];
            } else {
                return res.status(500).json({
                    error: 'No hay API keys disponibles para la función general (Gemini o Groq). Contacta al administrador.'
                });
            }
        }

        console.log('\n=== Nueva petición a IA API ===');
        console.log(`🔑 Usando key: ${maskedKey} (Proveedor: ${providerUsed}, Tier: ${tier}, Función: ${funcType})`);
        console.log('Body (primeros 300 chars):', JSON.stringify(requestBody, null, 2).substring(0, 300));

        let response;
        let attempts = 0;
        const maxAttempts = 3;
        let lastError = null;
        let currentApiKey = apiKey;

        while (attempts < maxAttempts) {
            try {
                const fetchOptions = {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(requestBody),
                };

                let currentUrl = endpointUsed;

                if (providerUsed === PROVIDERS.GEMINI) {
                    currentUrl = `${endpointUsed}?key=${currentApiKey}`;
                } else if (providerUsed === PROVIDERS.GROQ) {
                    fetchOptions.headers['Authorization'] = `Bearer ${currentApiKey}`;
                }

                response = await fetch(currentUrl, fetchOptions);

                if (response.ok) {
                    break;
                }

                const errorText = await response.text();
                let errorData;
                try {
                    errorData = JSON.parse(errorText);
                } catch (e) {
                    errorData = { error: errorText || `HTTP ${response.status}: ${response.statusText}` };
                }

                const errorMessage = errorData.error?.message || errorData.error || '';
                const lowerError = errorMessage.toLowerCase();

                if (attempts < maxAttempts - 1 && (
                    lowerError.includes('quota') ||
                    lowerError.includes('limit exceeded') ||
                    lowerError.includes('key not valid') ||
                    lowerError.includes('invalid api key') ||
                    response.status === 429
                )) {
                    console.warn(`⚠️ Key ${apiKeyManager.maskKey(currentApiKey)} de ${providerUsed} alcanzó límite, intentando con otra...`);
                    apiKeyManager.recordError(currentApiKey);

                    const previousKey = currentApiKey;
                    currentApiKey = apiKeyManager.getApiKey(providerUsed, tier, funcType);

                    if (!currentApiKey || currentApiKey === previousKey) {
                        const otherProvider = providerUsed === PROVIDERS.GEMINI ? PROVIDERS.GROQ : PROVIDERS.GEMINI;
                        currentApiKey = apiKeyManager.getApiKey(otherProvider, tier, funcType);
                        if (currentApiKey) {
                            providerUsed = otherProvider;
                            endpointUsed = otherProvider === PROVIDERS.GEMINI ? GEMINI_ENDPOINT : GROQ_ENDPOINT;
                            if (providerUsed === PROVIDERS.GROQ) {
                                requestBody = {
                                    model: GROQ_MODEL,
                                    messages: [
                                        { role: "system", content: systemInstruction || "You are a helpful AI assistant." },
                                        { role: "user", content: prompt }
                                    ],
                                    temperature: 0.2,
                                    max_tokens: 8192,
                                };
                            }
                        } else {
                            break;
                        }
                    }
                    attempts++;
                    continue;
                }

                lastError = { response, errorData };
                break;

            } catch (fetchError) {
                console.error('Error en fetch:', fetchError);
                lastError = { error: fetchError.message };
                attempts++;

                if (attempts < maxAttempts) {
                    const previousKey = currentApiKey;
                    currentApiKey = apiKeyManager.getApiKey(providerUsed, tier, funcType);
                    if (!currentApiKey || currentApiKey === previousKey) {
                        const otherProvider = providerUsed === PROVIDERS.GEMINI ? PROVIDERS.GROQ : PROVIDERS.GEMINI;
                        currentApiKey = apiKeyManager.getApiKey(otherProvider, tier, funcType);
                        if (currentApiKey) {
                            providerUsed = otherProvider;
                            endpointUsed = otherProvider === PROVIDERS.GEMINI ? GEMINI_ENDPOINT : GROQ_ENDPOINT;
                            if (providerUsed === PROVIDERS.GROQ) {
                                requestBody = {
                                    model: GROQ_MODEL,
                                    messages: [
                                        { role: "system", content: systemInstruction || "You are a helpful AI assistant." },
                                        { role: "user", content: prompt }
                                    ],
                                    temperature: 0.2,
                                    max_tokens: 8192,
                                };
                            }
                        }
                    }
                }
            }
        }

        if (!response || !response.ok) {
            const errorText = lastError?.errorData ? JSON.stringify(lastError.errorData) : (lastError?.error || 'Error desconocido');
            let errorData;
            try {
                errorData = typeof errorText === 'string' ? JSON.parse(errorText) : errorText;
            } catch (e) {
                errorData = { error: errorText || `HTTP ${response?.status || '500'}: ${response?.statusText || 'Error'}` };
            }

            console.error(`${providerUsed} API Error (después de reintentos):`, {
                status: response?.status,
                statusText: response?.statusText,
                error: errorData,
                attempts
            });

            let errorMessage = errorData.error?.message ||
                errorData.error ||
                `Error del API de ${providerUsed}: ${response?.status || '500'} ${response?.statusText || 'Error'}`;

            const lowerError = errorMessage.toLowerCase();
            if (lowerError.includes('overloaded') || lowerError.includes('model is overloaded')) {
                errorMessage = 'El modelo está sobrecargado. Por favor intenta más tarde.';
            } else if (lowerError.includes('quota') || lowerError.includes('limit exceeded')) {
                errorMessage = 'Límite de cuota excedido. Se intentó con múltiples keys. Por favor intenta más tarde.';
            } else if (lowerError.includes('resource') && lowerError.includes('exhausted')) {
                errorMessage = 'Recursos del servicio agotados. Por favor intenta en unos minutos.';
            }

            const statusCode = (response?.status >= 400 && response?.status < 500)
                ? (lowerError.includes('overloaded') ? 503 : response.status)
                : 500;

            return res.status(statusCode).json({
                error: errorMessage,
                originalStatus: response?.status
            });
        }

        const responseText = await response.text();
        let data;
        try {
            data = JSON.parse(responseText);
        } catch (parseError) {
            console.error(`Error parsing ${providerUsed} response:`, parseError);
            console.error('Response text:', responseText.substring(0, 500));
            return res.status(500).json({
                error: `Respuesta inválida del API de ${providerUsed}`,
                details: process.env.NODE_ENV === 'development' ? responseText.substring(0, 200) : undefined
            });
        }

        if (data.error) {
            console.error(`${providerUsed} API Response Error:`, data.error);
            return res.status(500).json({
                error: data.error.message || data.error.status || `Error en la respuesta de ${providerUsed}`,
                details: data.error
            });
        }

        let finalResponseData;
        if (providerUsed === PROVIDERS.GEMINI) {
            if (!data.candidates || data.candidates.length === 0) {
                return res.status(500).json({
                    error: 'La IA (Gemini) no generó una respuesta válida'
                });
            }
            finalResponseData = data;
        } else if (providerUsed === PROVIDERS.GROQ) {
            if (!data.choices || data.choices.length === 0) {
                return res.status(500).json({
                    error: 'La IA (Groq) no generó una respuesta válida'
                });
            }
            // Adaptar la respuesta de Groq para que sea similar a la de Gemini si es posible
            finalResponseData = {
                candidates: [{
                    content: {
                        parts: [{ text: data.choices[0]?.message?.content || '' }]
                    }
                }],
                // Otros campos relevantes de Groq si es necesario
            };
        }

        console.log(`Respuesta exitosa de ${providerUsed} API`);
        res.json(finalResponseData);
    } catch (error) {
        console.error('\n❌ ERROR en proxy de IA:');
        console.error('Mensaje:', error.message);
        console.error('Stack:', error.stack);
        console.error('================================\n');

        res.status(500).json({
            error: error.message || 'Error interno del servidor',
            details: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
});

// ============================================
// ENDPOINT PARA CHAT DE SOPORTE (con historial)
// ============================================
app.post('/api/ai/chat', rateLimiter, async (req, res) => {
    try {
        const { message, history, systemInstruction, userTier } = req.body;

        if (!message) {
            return res.status(400).json({ error: 'Mensaje es requerido' });
        }

        const tier = userTier || USER_TIER.FREE;
        let apiKey;
        let providerUsed;
        let endpointUsed;
        let requestBody;
        let maskedKey;

        // PRIORIDAD: Intentar con Groq primero
        apiKey = apiKeyManager.getApiKey(PROVIDERS.GROQ, tier, FUNCTION_TYPE.GENERAL);
        if (apiKey) {
            providerUsed = PROVIDERS.GROQ;
            endpointUsed = GROQ_ENDPOINT;
            maskedKey = apiKeyManager.maskKey(apiKey);

            const messages = [];
            if (systemInstruction) {
                messages.push({ role: "system", content: systemInstruction });
            }
            if (history && Array.isArray(history)) {
                history.forEach(msg => {
                    if (msg.role && msg.text) {
                        messages.push({
                            role: msg.role === 'user' ? 'user' : 'assistant',
                            content: msg.text
                        });
                    }
                });
            }
            messages.push({ role: "user", content: message });

            requestBody = {
                model: GROQ_MODEL,
                messages: messages,
                temperature: 0.7,
                max_tokens: 1024,
            };
        } else {
            // Si no hay Groq, intentar con Gemini
            apiKey = apiKeyManager.getApiKey(PROVIDERS.GEMINI, tier, FUNCTION_TYPE.GENERAL);
            if (apiKey) {
                providerUsed = PROVIDERS.GEMINI;
                endpointUsed = GEMINI_ENDPOINT;
                maskedKey = apiKeyManager.maskKey(apiKey);

                const contents = [];
                if (history && Array.isArray(history)) {
                    history.forEach(msg => {
                        if (msg.role && msg.text) {
                            contents.push({
                                role: msg.role === 'user' ? 'user' : 'model',
                                parts: [{ text: msg.text }]
                            });
                        }
                    });
                }
                contents.push({
                    role: 'user',
                    parts: [{ text: message }]
                });

                requestBody = { contents: contents };
                if (systemInstruction) {
                    requestBody.systemInstruction = {
                        parts: [{ text: systemInstruction }]
                    };
                }
                requestBody.generationConfig = {
                    temperature: 0.7,
                    topP: 0.95,
                    topK: 40,
                    maxOutputTokens: 1024,
                };
                requestBody.safetySettings = [
                    { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_ONLY_HIGH' },
                    { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_ONLY_HIGH' },
                    { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_ONLY_HIGH' },
                    { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_ONLY_HIGH' },
                ];
            } else {
                return res.status(500).json({
                    error: 'No hay API keys disponibles para chat (Gemini o Groq). Contacta al administrador.'
                });
            }
        }

        console.log('\n=== Nueva petición de chat de soporte ===');
        console.log(`🔑 Usando key: ${maskedKey} (Proveedor: ${providerUsed}, Tier: ${tier})`);
        console.log('Mensaje:', message.substring(0, 100));
        console.log('Historial:', history ? `${history.length} mensajes` : 'Sin historial');

        const fetchOptions = {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestBody),
        };

        let currentUrl = endpointUsed;

        if (providerUsed === PROVIDERS.GEMINI) {
            currentUrl = `${endpointUsed}?key=${apiKey}`;
        } else if (providerUsed === PROVIDERS.GROQ) {
            fetchOptions.headers['Authorization'] = `Bearer ${apiKey}`;
        }

        const response = await fetch(currentUrl, fetchOptions);

        if (!response.ok) {
            const errorText = await response.text();
            let errorData;
            try {
                errorData = JSON.parse(errorText);
            } catch (e) {
                errorData = { error: errorText || `HTTP ${response.status}: ${response.statusText}` };
            }

            console.error(`${providerUsed} API Error (Chat):`, {
                status: response.status,
                statusText: response.statusText,
                error: errorData
            });

            const errorMessage = errorData.error?.message ||
                errorData.error ||
                `Error del API de ${providerUsed}: ${response.status} ${response.statusText}`;

            return res.status(response.status >= 400 && response.status < 500 ? response.status : 500).json({
                error: errorMessage
            });
        }

        const responseText = await response.text();
        let data;
        try {
            data = JSON.parse(responseText);
        } catch (parseError) {
            console.error(`Error parsing ${providerUsed} response (Chat):`, parseError);
            return res.status(500).json({
                error: `Respuesta inválida del API de ${providerUsed}`
            });
        }

        if (data.error) {
            console.error(`${providerUsed} API Response Error (Chat):`, data.error);
            return res.status(500).json({
                error: data.error.message || data.error.status || `Error en la respuesta de ${providerUsed}`
            });
        }

        let responseText_result = '';
        if (providerUsed === PROVIDERS.GEMINI) {
            if (!data.candidates || data.candidates.length === 0) {
                return res.status(500).json({
                    error: 'La IA (Gemini) no generó una respuesta válida para el chat'
                });
            }
            responseText_result = data.candidates[0]?.content?.parts?.[0]?.text || '';
        } else if (providerUsed === PROVIDERS.GROQ) {
            if (!data.choices || data.choices.length === 0) {
                return res.status(500).json({
                    error: 'La IA (Groq) no generó una respuesta válida para el chat'
                });
            }
            responseText_result = data.choices[0]?.message?.content || '';
        }

        console.log(`Respuesta exitosa de chat de soporte con ${providerUsed}`);

        res.json({
            message: responseText_result,
            success: true
        });
    } catch (error) {
        console.error('\n❌ ERROR en proxy de IA (Chat):');
        console.error('Mensaje:', error.message);
        console.error('Stack:', error.stack);

        res.status(500).json({
            error: error.message || 'Error interno del servidor',
            success: false
        });
    }
});

// ============================================
// ENDPOINT PARA EXTRACCIÓN DE PDF CON IA
// ============================================
app.post('/api/ai/extract-pdf', upload.single('file'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No PDF file uploaded' });
        }

        console.log(`\n=== Processing PDF: ${req.file.originalname} (${req.file.size} bytes) ===`);

        // 1. Leer y extraer texto del PDF
        const dataBuffer = fs.readFileSync(req.file.path);

        let pdfText;
        try {
            // ✅ CORRECCIÓN: Usar la clase pdfParse con Uint8Array y llamar a getText()
            // La librería instalada (mehmet-kozan/pdf-parse) requiere Uint8Array, no Buffer directo
            const uint8Array = new Uint8Array(dataBuffer);
            const instance = new pdfParse(uint8Array);

            pdfText = await instance.getText();

            console.log('--- EXTRACTED TEXT PREVIEW (first 800 chars) ---');
            console.log(pdfText ? pdfText.substring(0, 800) : 'NO TEXT EXTRACTED');
            console.log('--- END PREVIEW ---');
            console.log(`Total text length: ${pdfText ? pdfText.length : 0} characters`);
        } catch (pdfError) {
            console.error('PDF Parse error:', pdfError);
            // Intento de fallback o mensaje más detallado
            if (pdfError.message.includes('invoked without \'new\'')) {
                throw new Error(`Error de compatibilidad librería PDF: ${pdfError.message}`);
            }
            throw new Error(`Error parsing PDF: ${pdfError.message}`);
        }

        // Limpiar archivo temporal
        try {
            fs.unlinkSync(req.file.path);
        } catch (e) {
            console.warn('Error deleting temp PDF:', e);
        }

        if (!pdfText || pdfText.trim().length === 0) {
            return res.status(400).json({ error: 'No se pudo extraer texto del PDF. Verifica que no esté protegido o sea una imagen escaneada.' });
        }

        // 2. Preparar Prompt MEJORADO para IA
        const prompt = 'Eres un experto en análisis de presupuestos de construcción en México. Analiza el siguiente texto extraído de un PDF de presupuesto.\n\n' +
            'TEXTO EXTRAÍDO DEL PDF:\n' +
            '"""\n' +
            pdfText.substring(0, 35000) + '\n' +
            '"""\n' +
            (pdfText.length > 35000 ? '(Texto truncado a 35k caracteres)\n\n' : '\n') +
            'INSTRUCCIONES DETALLADAS:\n\n' +
            '1. **METADATOS DEL PROYECTO**: Identifica toda la información del encabezado:\n' +
            '   - Nombre del proyecto\n' +
            '   - Cliente\n' +
            '   - Ubicación (ciudad, estado)\n' +
            '   - Fecha (si está disponible)\n' +
            '   - Porcentaje de IVA (busca "IVA", "I.V.A.", o calcula del total)\n' +
            '   - Porcentaje de indirectos (busca "indirectos", "costos indirectos")\n' +
            '   - Porcentaje de utilidad (busca "utilidad", "profit")\n\n' +
            '2. **PARTIDAS/CONCEPTOS**: Extrae TODOS los conceptos del presupuesto:\n' +
            '   - Descripción completa y técnica\n' +
            '   - Unidad de medida (normaliza: m2, m3, pza, kg, ton, ml, m, lote, etc.)\n' +
            '   - Cantidad (número limpio, sin comas)\n' +
            '   - Precio unitario (número limpio, sin símbolos de moneda ni comas)\n' +
            '   - Categoría (Materiales, Mano de Obra, Equipo, Preliminares, Acabados, etc.)\n\n' +
            '3. **TOTALES FINANCIEROS**: Identifica los totales del presupuesto:\n' +
            '   - Subtotal (antes de IVA)\n' +
            '   - IVA (monto)\n' +
            '   - Total general\n\n' +
            'REGLAS IMPORTANTES:\n' +
            '- Normaliza unidades: m² → m2, m³ → m3, pieza → pza, metro lineal → ml\n' +
            '- Limpia números: elimina comas, símbolos de moneda ($), solo deja números y punto decimal\n' +
            '- Si no encuentras un dato, usa valores por defecto razonables (IVA: 16%, indirectos: 0%, utilidad: 0%)\n' +
            '- Mantén descripciones completas y técnicas, no las acortes\n' +
            '- Si hay partidas y subpartidas, incluye TODO en el array de items\n' +
            '- Ignora encabezados de tabla, pies de página, números de página\n\n' +
            'FORMATO DE SALIDA (JSON PURO, SIN MARKDOWN):\n' +
            '{\n' +
            '  "projectInfo": {\n' +
            '    "project": "Nombre del proyecto o \'Presupuesto Importado\'",\n' +
            '    "client": "Nombre del cliente o \'\'",\n' +
            '    "location": "Ciudad, Estado o \'\'",\n' +
            '    "taxRate": 16,\n' +
            '    "indirect_percentage": 0,\n' +
            '    "profit_percentage": 0\n' +
            '  },\n' +
            '  "items": [\n' +
            '    {\n' +
            '      "description": "Descripción completa del concepto",\n' +
            '      "unit": "m2",\n' +
            '      "quantity": 100.5,\n' +
            '      "unitPrice": 250.00,\n' +
            '      "category": "Materiales"\n' +
            '    }\n' +
            '  ],\n' +
            '  "totals": {\n' +
            '    "subtotal": 25000,\n' +
            '    "tax": 4000,\n' +
            '    "total": 29000\n' +
            '  }\n' +
            '}\n\n' +
            'IMPORTANTE: Devuelve SOLO el objeto JSON, sin bloques de código markdown, sin explicaciones adicionales.';

        // 3. Llamar a la IA
        const tier = USER_TIER.FREE;
        const funcType = FUNCTION_TYPE.GENERAL;

        let apiKey = apiKeyManager.getApiKey(PROVIDERS.GROQ, tier, funcType);
        let providerUsed = PROVIDERS.GROQ;
        let endpointUsed = GROQ_ENDPOINT;
        let requestBody;

        if (apiKey) {
            console.log('Using Groq for PDF extraction');
            requestBody = {
                model: GROQ_MODEL,
                messages: [
                    { role: "system", content: "Eres un experto en análisis de presupuestos de construcción. Devuelve SOLO JSON válido, sin markdown." },
                    { role: "user", content: prompt }
                ],
                temperature: 0.1,
                max_tokens: 8192,
                response_format: { type: "json_object" }
            };
        } else {
            // Fallback a Gemini
            console.log('Using Gemini for PDF extraction');
            providerUsed = PROVIDERS.GEMINI;
            apiKey = apiKeyManager.getApiKey(PROVIDERS.GEMINI, tier, funcType);
            endpointUsed = GEMINI_ENDPOINT;

            if (!apiKey) {
                return res.status(500).json({ error: 'No hay API keys disponibles para extracción de PDF.' });
            }

            requestBody = {
                contents: [{ parts: [{ text: prompt }] }],
                generationConfig: {
                    temperature: 0.1,
                    responseMimeType: "application/json"
                }
            };
        }

        const fetchOptions = {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestBody),
        };

        let currentUrl = endpointUsed;
        if (providerUsed === PROVIDERS.GEMINI) {
            currentUrl = `${endpointUsed}?key = ${apiKey} `;
        } else {
            fetchOptions.headers['Authorization'] = `Bearer ${apiKey} `;
        }

        console.log('Calling AI for extraction...');
        const response = await fetch(currentUrl, fetchOptions);

        if (!response.ok) {
            const errorText = await response.text();
            console.error('AI API Error:', errorText);
            throw new Error(`Error del API de IA: ${response.status} ${response.statusText} `);
        }

        const responseData = await response.json();

        let extractedJsonString = '';

        if (providerUsed === PROVIDERS.GROQ) {
            extractedJsonString = responseData.choices?.[0]?.message?.content;
        } else {
            extractedJsonString = responseData.candidates?.[0]?.content?.parts?.[0]?.text;
        }

        if (!extractedJsonString) {
            throw new Error('La IA no devolvió respuesta');
        }

        console.log('--- AI RESPONSE PREVIEW (first 500 chars) ---');
        console.log(extractedJsonString.substring(0, 500));
        console.log('--- END AI RESPONSE ---');

        // Limpieza de markdown si la IA lo incluye
        extractedJsonString = extractedJsonString.replace(/```json/g, '').replace(/```/g, '').trim();

        // Parsear JSON
        let result;
        try {
            result = JSON.parse(extractedJsonString);
        } catch (e) {
            console.error('Error parsing AI JSON:', e);
            console.error('Raw string:', extractedJsonString.substring(0, 1000));
            return res.status(500).json({
                error: 'La IA devolvió una respuesta inválida. Intenta con otro PDF o contacta soporte.',
                details: process.env.NODE_ENV === 'development' ? extractedJsonString.substring(0, 500) : undefined
            });
        }

        // Validar y normalizar estructura
        const projectInfo = result.projectInfo || {};
        let items = [];

        if (Array.isArray(result.items)) {
            items = result.items;
        } else if (Array.isArray(result)) {
            // Fallback: si la IA devolvió un array directo
            items = result;
        } else if (result.items && Array.isArray(result.items)) {
            items = result.items;
        }

        const totals = result.totals || {};

        console.log(`✅ Extraction successful: ${items.length} items found`);
        console.log(`Project: ${projectInfo.project || 'N/A'}`);
        console.log(`Client: ${projectInfo.client || 'N/A'}`);

        res.json({
            success: true,
            projectInfo,
            items,
            totals
        });

    } catch (error) {
        console.error('❌ Error in PDF extraction:', error);
        res.status(500).json({ error: error.message || 'Error interno del servidor' });
    }
});

// ============================================
// ENDPOINT PARA BÚSQUEDA DE PRECIOS CON IA
// ============================================
app.post('/api/ai/pricesearch', rateLimiter, async (req, res) => {
    try {
        const { material, locations, userTier } = req.body;

        if (!material || !locations) {
            return res.status(400).json({ error: 'Material y ubicaciones son requeridos' });
        }

        const tier = userTier || USER_TIER.FREE;
        let apiKey;
        let providerUsed;
        let endpointUsed;
        let requestBody;
        let maskedKey;

        // PRIORIDAD: Intentar con Groq primero
        apiKey = apiKeyManager.getApiKey(PROVIDERS.GROQ, tier, FUNCTION_TYPE.PRICE_SEARCH);
        if (apiKey) {
            providerUsed = PROVIDERS.GROQ;
            endpointUsed = GROQ_ENDPOINT; // Endpoint de Groq
            maskedKey = apiKeyManager.maskKey(apiKey);

            const systemInstruction = `Eres un asistente experto en estimación de costos de construcción en México.
Tu OBJETIVO PRINCIPAL es SIEMPRE proporcionar al menos 3 referencias de precios útiles, NUNCA devolver resultados vacíos.

INSTRUCCIONES OBLIGATORIAS:
1. Busca primero datos reales de tiendas mexicanas (Home Depot, Construrama, Coppel, Liverpool, etc.)
2. Si NO encuentras datos exactos actuales, DEBES generar estimaciones basadas en:
   - Precios históricos conocidos del material
   - Rangos de mercado típicos en México para ese tipo de material
   - Variaciones por región (urbano vs rural, norte vs sur)
3. SIEMPRE devuelve EXACTAMENTE 3 opciones mínimo con diferentes rangos de precio
4. Usa nombres descriptivos como: "Opción Económica", "Opción Estándar", "Opción Premium" O nombres de tiendas reales
5. En "source" indica: nombre de tienda real O "Estimación de Mercado [Ciudad/Región]"
6. Los precios deben ser realistas para México 2024-2025

REGLA CRÍTICA DE UBICACIONES:
- PRIORIDAD MÁXIMA: Usa las ubicaciones EXACTAS que el usuario especificó
- Si el usuario pidió "San Juan Bautista Tuxtepec, Oaxaca", TODAS las opciones deben ser de esa ciudad/región
- Solo si es IMPOSIBLE encontrar o estimar precios para esa ubicación específica, puedes incluir 1 opción de una ciudad cercana (indicando claramente que es alternativa)
- NUNCA ignores las ubicaciones solicitadas y des precios de ciudades completamente diferentes

FORMATO DE RESPUESTA (JSON PURO, SIN MARKDOWN):
[
  {
    "name": "Nombre del producto o categoría",
    "price": "$XXX.XX MXN" o "$XXX - $YYY MXN",
    "location": "Ciudad o Región específica (DEBE COINCIDIR con la solicitada)",
    "source": "Nombre de tienda o 'Estimación de Mercado [Región]'"
  }
]

IMPORTANTE: Devuelve SOLO el array JSON, sin texto adicional, sin markdown, sin explicaciones.`;

            const prompt = `Necesito precios de "${material}" en las siguientes ubicaciones ESPECÍFICAS: "${locations}".

REQUISITOS ESTRICTOS:
1. TODAS las opciones de precio deben ser para las ubicaciones que especifiqué arriba
2. Busca primero tiendas reales en esas ubicaciones exactas (Home Depot, Construrama, ferreterías locales)
3. Si no hay datos exactos, genera estimaciones de precio (Económico, Estándar, Premium) ESPECÍFICAS para esas ubicaciones
4. Considera el costo de vida y mercado local de esas ciudades/regiones específicas
5. Incluye la unidad de medida típica (m², kg, pieza, bulto, etc.)
6. En el campo "location" usa EXACTAMENTE las ubicaciones que solicité

PROHIBIDO: No me des precios de Ciudad de México, Guadalajara u otras ciudades si no las pedí.

Devuelve SOLO un array JSON con mínimo 3 opciones de precio para las ubicaciones solicitadas.`;

            requestBody = {
                model: GROQ_MODEL, // Modelo de Groq actualizado
                messages: [
                    { role: "system", content: systemInstruction },
                    { role: "user", content: prompt }
                ],
                temperature: 0.5, // Un poco más creativo para permitir estimaciones
                max_tokens: 2048,
                response_format: { type: "json_object" } // Solicitar JSON
            };
        } else {
            // Si no hay Groq, intentar con Gemini
            apiKey = apiKeyManager.getApiKey(PROVIDERS.GEMINI, tier, FUNCTION_TYPE.PRICE_SEARCH);
            if (apiKey) {
                providerUsed = PROVIDERS.GEMINI;
                endpointUsed = GEMINI_ENDPOINT;
                maskedKey = apiKeyManager.maskKey(apiKey);

                const systemInstruction = `Eres un asistente experto en estimación de costos de construcción en México.
Tu OBJETIVO PRINCIPAL es SIEMPRE proporcionar al menos 3 referencias de precios útiles, NUNCA devolver resultados vacíos.

INSTRUCCIONES OBLIGATORIAS:
1. Busca primero datos reales de tiendas mexicanas (Home Depot, Construrama, Coppel, Liverpool, etc.)
2. Si NO encuentras datos exactos actuales, DEBES generar estimaciones basadas en:
   - Precios históricos conocidos del material
   - Rangos de mercado típicos en México para ese tipo de material
   - Variaciones por región (urbano vs rural, norte vs sur)
3. SIEMPRE devuelve EXACTAMENTE 3 opciones mínimo con diferentes rangos de precio
4. Usa nombres descriptivos como: "Opción Económica", "Opción Estándar", "Opción Premium" O nombres de tiendas reales
5. En "source" indica: nombre de tienda real O "Estimación de Mercado [Ciudad/Región]"
6. Los precios deben ser realistas para México 2024-2025

REGLA CRÍTICA DE UBICACIONES:
- PRIORIDAD MÁXIMA: Usa las ubicaciones EXACTAS que el usuario especificó
- Si el usuario pidió "San Juan Bautista Tuxtepec, Oaxaca", TODAS las opciones deben ser de esa ciudad/región
- Solo si es IMPOSIBLE encontrar o estimar precios para esa ubicación específica, puedes incluir 1 opción de una ciudad cercana (indicando claramente que es alternativa)
- NUNCA ignores las ubicaciones solicitadas y des precios de ciudades completamente diferentes

FORMATO DE RESPUESTA (JSON PURO, SIN MARKDOWN):
[
  {
    "name": "Nombre del producto o categoría",
    "price": "$XXX.XX MXN" o "$XXX - $YYY MXN",
    "location": "Ciudad o Región específica (DEBE COINCIDIR con la solicitada)",
    "source": "Nombre de tienda o 'Estimación de Mercado [Región]'"
  }
]

IMPORTANTE: Devuelve SOLO el array JSON, sin texto adicional, sin markdown, sin explicaciones.`;

                const prompt = `Necesito precios de "${material}" en las siguientes ubicaciones ESPECÍFICAS: "${locations}".

REQUISITOS ESTRICTOS:
1. TODAS las opciones de precio deben ser para las ubicaciones que especifiqué arriba
2. Busca primero tiendas reales en esas ubicaciones exactas (Home Depot, Construrama, ferreterías locales)
3. Si no hay datos exactos, genera estimaciones de precio (Económico, Estándar, Premium) ESPECÍFICAS para esas ubicaciones
4. Considera el costo de vida y mercado local de esas ciudades/regiones específicas
5. Incluye la unidad de medida típica (m², kg, pieza, bulto, etc.)
6. En el campo "location" usa EXACTAMENTE las ubicaciones que solicité

PROHIBIDO: No me des precios de Ciudad de México, Guadalajara u otras ciudades si no las pedí.

Devuelve SOLO un array JSON con mínimo 3 opciones de precio para las ubicaciones solicitadas.`;

                requestBody = {
                    contents: [{
                        parts: [{ text: prompt }]
                    }],
                    systemInstruction: {
                        parts: [{ text: systemInstruction }]
                    },
                    generationConfig: {
                        temperature: 0.5,
                        topP: 0.9,
                        topK: 32,
                        maxOutputTokens: 2048,
                        responseMimeType: "application/json",
                    },
                    safetySettings: [
                        { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_ONLY_HIGH' },
                        { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_ONLY_HIGH' },
                        { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_ONLY_HIGH' },
                        { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_ONLY_HIGH' },
                    ],
                };
            } else {
                return res.status(500).json({
                    error: 'No hay API keys disponibles para búsqueda de precios (Gemini o Groq). Contacta al administrador.'
                });
            }
        }

        console.log('\n=== Nueva petición de búsqueda de precios ===');
        console.log(`🔑 Usando key: ${maskedKey} (Proveedor: ${providerUsed}, Tier: ${tier})`);
        console.log('Material:', material);
        console.log('Ubicaciones:', locations);

        const fetchOptions = {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}` // Groq usa Authorization header
            },
            body: JSON.stringify(requestBody),
        };

        // Para Gemini, la API key va en la URL
        if (providerUsed === PROVIDERS.GEMINI) {
            fetchOptions.headers = { 'Content-Type': 'application/json' }; // Eliminar Auth header para Gemini
            endpointUsed = `${endpointUsed}?key=${apiKey}`;
        }

        const response = await fetch(endpointUsed, fetchOptions);

        if (!response.ok) {
            const errorText = await response.text();
            let errorData;
            try {
                errorData = JSON.parse(errorText);
            } catch (e) {
                errorData = { error: errorText || `HTTP ${response.status}: ${response.statusText}` };
            }

            console.error(`${providerUsed} API Error (Price Search):`, {
                status: response.status,
                statusText: response.statusText,
                error: errorData
            });

            const errorMessage = errorData.error?.message ||
                errorData.error ||
                `Error del API de ${providerUsed}: ${response.status} ${response.statusText}`;

            return res.status(response.status >= 400 && response.status < 500 ? response.status : 500).json({
                error: errorMessage
            });
        }

        const responseText = await response.text();
        let data;
        try {
            data = JSON.parse(responseText);
        } catch (parseError) {
            console.error(`Error parsing ${providerUsed} response (Price Search):`, parseError);
            return res.status(500).json({
                error: `Respuesta inválida del API de ${providerUsed}`
            });
        }

        if (data.error) {
            console.error(`${providerUsed} API Response Error (Price Search):`, data.error);
            return res.status(500).json({
                error: data.error.message || data.error.status || `Error en la respuesta de ${providerUsed}`
            });
        }

        let rawResponseText;
        if (providerUsed === PROVIDERS.GEMINI) {
            if (!data.candidates || data.candidates.length === 0) {
                return res.status(500).json({
                    error: 'La IA (Gemini) no generó una respuesta válida para la búsqueda de precios'
                });
            }
            rawResponseText = data.candidates[0]?.content?.parts?.[0]?.text || '';
        } else if (providerUsed === PROVIDERS.GROQ) {
            if (!data.choices || data.choices.length === 0) {
                return res.status(500).json({
                    error: 'La IA (Groq) no generó una respuesta válida para la búsqueda de precios'
                });
            }
            rawResponseText = data.choices[0]?.message?.content || '';
        }

        let parsedPrices = [];
        try {
            console.log('Raw AI response:', rawResponseText.substring(0, 500));

            let jsonText = rawResponseText.trim();

            // Try to extract JSON from markdown code blocks
            const jsonMatch = jsonText.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
            if (jsonMatch && jsonMatch[1]) {
                jsonText = jsonMatch[1].trim();
                console.log('Extracted JSON from markdown block');
            }

            // Parse the JSON
            const parsed = JSON.parse(jsonText);
            console.log('Parsed JSON type:', typeof parsed, 'isArray:', Array.isArray(parsed));

            // Handle different response formats
            if (Array.isArray(parsed)) {
                // Direct array response
                parsedPrices = parsed;
            } else if (typeof parsed === 'object' && parsed !== null) {
                // Object response - try to find the array
                // Common keys: prices, data, results, items, precios
                const possibleKeys = ['prices', 'data', 'results', 'items', 'precios', 'opciones', 'options'];
                for (const key of possibleKeys) {
                    if (Array.isArray(parsed[key])) {
                        parsedPrices = parsed[key];
                        console.log(`Found array in property: ${key}`);
                        break;
                    }
                }

                // If still no array found, check if any property is an array
                if (parsedPrices.length === 0) {
                    for (const key in parsed) {
                        if (Array.isArray(parsed[key]) && parsed[key].length > 0) {
                            parsedPrices = parsed[key];
                            console.log(`Found array in property: ${key}`);
                            break;
                        }
                    }
                }
            }

            // Validate the array has the expected structure
            if (!Array.isArray(parsedPrices) || parsedPrices.length === 0) {
                console.warn('No valid price array found in response');
                parsedPrices = [];
            } else {
                console.log(`Successfully parsed ${parsedPrices.length} price items`);
            }
        } catch (parseError) {
            console.warn(`Advertencia: La respuesta de la IA (${providerUsed}) no es un JSON válido o no está en el formato esperado.`);
            console.warn('Parse error:', parseError.message);
            console.warn('Respuesta cruda de la IA:', rawResponseText.substring(0, 1000));
            return res.status(500).json({
                error: `La IA (${providerUsed}) no devolvió los precios en el formato JSON esperado. Por favor intenta con una búsqueda más específica.`,
                details: process.env.NODE_ENV === 'development' ? rawResponseText : undefined
            });
        }

        console.log(`Respuesta exitosa de búsqueda de precios con ${providerUsed} API`);

        // Warn if the AI returned empty results despite our instructions
        if (parsedPrices.length === 0) {
            console.warn('⚠️ ADVERTENCIA: La IA devolvió un array vacío a pesar de las instrucciones de siempre devolver al menos 3 opciones');
            console.warn('Material solicitado:', material);
            console.warn('Ubicaciones solicitadas:', locations);
        }

        res.json({
            success: true,
            data: parsedPrices
        });

    } catch (error) {
        console.error('\n❌ ERROR en proxy de IA (Price Search):');
        console.error('Mensaje:', error.message);
        console.error('Stack:', error.stack);

        res.status(500).json({
            error: error.message || 'Error interno del servidor',
            success: false
        });
    }
});


const PORT = process.env.PORT || 4001;
app.listen(PORT, () => {
    console.log('\n🚀 ========================================');
    console.log(`✅ AI proxy server corriendo en puerto ${PORT}`);
    console.log(`✅ Endpoints: http://localhost:${PORT}/api/ai, http://localhost:${PORT}/api/ai/chat, http://localhost:${PORT}/api/ai/pricesearch`);
    console.log('🚀 ========================================\n');
});
