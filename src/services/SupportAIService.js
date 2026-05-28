import { ErrorService } from './ErrorService';
import { systemSettingsService } from './SystemSettingsService.js';

/**
 * Servicio de Soporte con IA para PresuGenius
 * Proporciona asistencia inteligente a los usuarios
 */
export class SupportAIService {
    // Historial de conversación (almacenado en memoria)
    static chatHistory = [];

    // Rate limiting configuration
    static RATE_LIMIT_CONFIG = {
        maxRequestsPerMinute: 10,
        maxRequestsPerHour: 50,
        maxRequestsPerDay: 200
    };

    static RATE_LIMIT_STORAGE_KEY = 'support_ai_rate_limit';

    static getSettingsSnapshot() {
        return systemSettingsService.getCachedOrDefaultSettings();
    }

    static async getResolvedSettings() {
        return systemSettingsService.getAllSettings();
    }

    static formatPrice(price) {
        return new Intl.NumberFormat('es-MX', {
            style: 'currency',
            currency: 'MXN',
            maximumFractionDigits: 0
        }).format(price || 0);
    }

    static formatWhatsAppNumber(whatsappNumber) {
        const digits = (whatsappNumber || '').replace(/\D/g, '');
        if (digits.length === 12 && digits.startsWith('52')) {
            return `+${digits.slice(0, 2)} ${digits.slice(2, 5)} ${digits.slice(5, 8)} ${digits.slice(8)}`;
        }
        if (digits.length === 10) {
            return `+52 ${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6)}`;
        }
        return whatsappNumber ? `+${whatsappNumber}` : 'WhatsApp no configurado';
    }

    static buildPlatformDocumentation(settings) {
        const proPrice = this.formatPrice(settings.plan_pro_price);
        const whatsappDisplay = this.formatWhatsAppNumber(settings.whatsapp_number);
        const freeFeatures = (settings.plan_free_features || []).map(feature => `- ${feature}`).join('\n');
        const proFeatures = (settings.plan_pro_features || []).map(feature => `- ${feature}`).join('\n');

        return `
# PresuGenius Pro - Documentación de Soporte

## ¿Qué es PresuGenius?
PresuGenius es una plataforma de presupuestos de construcción potenciada por Inteligencia Artificial.

## Funcionalidades Principales

### 1. Editor de Presupuestos
- **Ubicación:** Menú lateral > "Editor"
- **Funciones:** Crear partidas, conceptos, calcular costos, APU, exportar PDF.

### 2. Generador con IA
- **Cómo usar:** En el Editor, clic en "Generar con IA".
- **Funciones:** Presupuestos desde descripción, sugerencia de precios.

### 3. Catálogo
- **Ubicación:** Menú lateral > "Catálogo".

### 4. Configurar PDF
- **Ubicación:** Menú lateral > "Configurar PDF".
- **Funciones:** Configurar logo, encabezado, pie de página.

## Planes y Precios
- **Plan Gratis:** ${settings.plan_free_description}
${freeFeatures}
- **Plan Pro (${proPrice}/mes):** ${settings.plan_pro_description}
${proFeatures}

## Solución de Problemas
- **Error "No se puede conectar":** Verificar internet.
- **Error "Límite alcanzado":** Esperar reinicio mensual o actualizar a Pro.
- **PDF no genera:** Verificar campos obligatorios.

## Contacto
- **WhatsApp:** ${whatsappDisplay}
- **Email:** soporte@presugenius.com
- **Horario:** Lunes a Viernes, 9:00 - 18:00 hrs.
`.trim();
    }

    static buildHumanSupportMessage(settings) {
        const whatsappDisplay = this.formatWhatsAppNumber(settings.whatsapp_number);
        return `👤 Claro, puedes contactar con nuestro equipo de soporte humano directamente por WhatsApp al: **${whatsappDisplay}** (Horario: 9:00 - 18:00 hrs).`;
    }

    static buildConnectionErrorMessage(settings) {
        const whatsappDisplay = this.formatWhatsAppNumber(settings.whatsapp_number);
        return `⚠️ Error de conexión. Por favor contacta a WhatsApp: ${whatsappDisplay}`;
    }

    static getSystemInstruction(settings = this.getSettingsSnapshot()) {
        const proPrice = this.formatPrice(settings.plan_pro_price);
        const whatsappDisplay = this.formatWhatsAppNumber(settings.whatsapp_number);

        return `Eres Geni, el asistente de PresuGenius.
INSTRUCCIONES:
- Responde en español directo y conciso.
- Plan Pro cuesta ${proPrice}/mes.
- Si no sabes, sugiere WhatsApp: ${whatsappDisplay}.

DOCUMENTACIÓN:
${this.buildPlatformDocumentation(settings)}`;
    }

    static initializeChatHistory() {
        if (this.chatHistory.length === 0) {
            this.chatHistory = [{ role: 'model', text: 'Hola 👋 Soy Geni. ¿En qué te puedo ayudar?' }];
        }
    }

    static resetChatHistory() {
        this.chatHistory = [];
        this.initializeChatHistory();
    }

    static checkRateLimit() {
        try {
            const stored = localStorage.getItem(this.RATE_LIMIT_STORAGE_KEY);
            const now = Date.now();
            let data = stored ? JSON.parse(stored) : { requests: [], dailyCount: 0, firstRequest: now };

            // Limpieza básica
            const oneDayAgo = now - 86400000;
            if (now - data.firstRequest > 86400000) { data.dailyCount = 0; data.firstRequest = now; }
            data.requests = data.requests.filter(t => t > oneDayAgo);

            if (data.dailyCount >= this.RATE_LIMIT_CONFIG.maxRequestsPerDay) {
                return { allowed: false, message: 'Límite diario alcanzado. Intenta mañana.' };
            }

            const oneMinAgo = now - 60000;
            const recentReqs = data.requests.filter(t => t > oneMinAgo);
            if (recentReqs.length >= this.RATE_LIMIT_CONFIG.maxRequestsPerMinute) {
                return { allowed: false, message: 'Demasiados mensajes. Espera un momento.', retryAfter: 60 };
            }

            data.requests.push(now);
            data.dailyCount++;
            localStorage.setItem(this.RATE_LIMIT_STORAGE_KEY, JSON.stringify(data));

            return { allowed: true };
        } catch (e) {
            console.error(e);
            return { allowed: true };
        }
    }

    static checkLocalKnowledgeBase(message, settings = this.getSettingsSnapshot()) {
        const lowerMsg = message.toLowerCase();
        const proPrice = this.formatPrice(settings.plan_pro_price);

        // Base de conocimiento local extendida con Regex para mejor coincidencia
        const extendedKnowledgeBase = [
            // Saludos
            {
                patterns: [/^hola/, /^buen(os|as)/, /^que tal/, /^hey/],
                answer: '¡Hola! 👋 Soy Geni, tu asistente virtual de PresuGenius. Estoy aquí para ayudarte con cualquier duda sobre la plataforma, tus presupuestos o la IA. ¿Cómo puedo apoyarte hoy?'
            },
            // Precios y Planes
            {
                patterns: [/precio/, /costo/, /cuesta/, /plan pro/, /suscripcion/],
                answer: `💰 **Precios y Planes:**\n- **Plan Gratis:** ${settings.plan_free_description}.\n- **Plan Pro (${proPrice}/mes):** ${settings.plan_pro_description}.\n\nPuedes ver más detalles en la sección "Mi Suscripción".`
            },
            // Pagos
            {
                patterns: [/pagar/, /factura/, /metodo de pago/, /tarjeta/],
                answer: '💳 Aceptamos tarjetas de crédito y débito. Para gestionar tu facturación o métodos de pago, ve a la sección "Mi Suscripción" en el menú lateral.'
            },
            // PDF
            {
                patterns: [/pdf/, /imprimir/, /descargar/, /exportar/],
                answer: '📄 **Para exportar a PDF:**\n1. Abre el presupuesto que quieres exportar.\n2. Busca el botón azul "Exportar PDF" en la parte superior derecha.\n3. Puedes elegir entre formato "Cliente" (sin desgloses internos) o "Técnico".'
            },
            // IA
            {
                patterns: [/ia/, /inteligencia/, /generar aut/, /como funciona la ia/],
                answer: '🤖 **Sobre la IA en PresuGenius:**\n\nLa IA se utiliza principalmente en el **Editor** para generar presupuestos completos a partir de una descripción (ej. "Construcción de baño 2x2"). Solo tienes que ir al Editor y hacer clic en el botón "Generar con IA".\n\nEn este chat de soporte, la IA actúa cuando tu pregunta no coincide con nuestras respuestas rápidas predefinidas. Si tu consulta es más compleja o específica, el asistente de IA usará la documentación de PresuGenius para intentar darte la mejor respuesta.'
            },
            // Soporte Humano
            {
                patterns: [/humano/, /persona/, /whatsapp/, /contacto/, /telefono/],
                answer: this.buildHumanSupportMessage(settings)
            },
            // Errores
            {
                patterns: [/error/, /falla/, /bug/, /no funciona/, /traba/],
                answer: `🔧 ¡Oh no! Lamento que estés experimentando un problema. Para intentar solucionarlo, por favor prueba:\n1. Recargar la página (presiona F5 o Ctrl+R).\n2. Cerrar tu sesión y volver a iniciarla.\n\nSi el problema continúa, por favor contáctanos por WhatsApp. ${this.buildHumanSupportMessage(settings).replace('👤 Claro, puedes contactar con nuestro equipo de soporte humano directamente por WhatsApp al: ', '')}`
            },
            // Contraseña
            {
                patterns: [/contraseña/, /password/, /clave/, /recuperar/],
                answer: '🔐 Si olvidaste tu contraseña, cierra sesión y usa la opción "¿Olvidaste tu contraseña?" en la pantalla de inicio de sesión para recibir un correo de recuperación.'
            }
        ];

        // Buscar coincidencia
        const match = extendedKnowledgeBase.find(item =>
            item.patterns.some(pattern => {
                if (pattern instanceof RegExp) return pattern.test(lowerMsg);
                return lowerMsg.includes(pattern);
            })
        );

        return match ? { found: true, response: match.answer } : { found: false };
    }

    static async sendMessage(message, userContext = {}) {
        try {
            const settings = await this.getResolvedSettings();
            const localCheck = this.checkLocalKnowledgeBase(message, settings);
            if (localCheck.found) {
                await new Promise(r => setTimeout(r, 600));
                this.initializeChatHistory();
                this.chatHistory.push({ role: 'user', text: message });
                this.chatHistory.push({ role: 'model', text: localCheck.response });
                return { success: true, message: localCheck.response };
            }

            const rateCheck = this.checkRateLimit();
            if (!rateCheck.allowed) return { success: false, message: rateCheck.message };

            this.initializeChatHistory();

            let contextMsg = message;
            if (userContext.userName) contextMsg = `[Usuario: ${userContext.userName}] ${message}`;

            this.chatHistory.push({ role: 'user', text: contextMsg });

            const response = await fetch('/api/ai/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    message: contextMsg,
                    history: this.chatHistory.slice(0, -1),
                    systemInstruction: this.getSystemInstruction(settings)
                })
            });

            if (!response.ok) throw new Error('Error de conexión con IA');

            const data = await response.json();
            if (!data.success) throw new Error(data.error || 'Error desconocido');

            this.chatHistory.push({ role: 'model', text: data.message });
            if (this.chatHistory.length > 20) {
                this.chatHistory = [this.chatHistory[0], ...this.chatHistory.slice(-19)];
            }

            return { success: true, message: data.message };

        } catch (error) {
            console.error('SupportAI Error:', error);
            ErrorService.logError(error, 'SupportAIService.sendMessage');
            return {
                success: false,
                message: this.buildConnectionErrorMessage(this.getSettingsSnapshot()),
                showWhatsApp: true,
                isError: true
            };
        }
    }

    static getQuickReplies() {
        return [
            { id: 1, text: '¿Cómo genero un presupuesto con IA?', icon: '🤖' },
            { id: 2, text: '¿Cuáles son los límites del plan gratis?', icon: '📊' },
            { id: 3, text: '¿Cómo exporto a PDF?', icon: '📄' },
            { id: 4, text: 'Tengo un error en la plataforma', icon: '🔧' },
            { id: 5, text: 'Hablar con soporte humano', icon: '👤' }
        ];
    }

    static resetChat() {
        this.resetChatHistory();
    }
}

export default SupportAIService;
