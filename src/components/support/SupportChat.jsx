
import React, { useState, useEffect, useRef } from 'react';
import { systemSettingsService } from '../../services/SystemSettingsService';
import {
    MessageCircle,
    X,
    Send,
    Loader,
    Bot,
    User,
    Phone,
    Sparkles,
    ChevronDown,
    RefreshCw,
    ExternalLink,
    AlertTriangle
} from 'lucide-react';
import { SupportAIService } from '../../services/SupportAIService';
import { useSubscription } from '../../context/SubscriptionContext';
import { useProject } from '../../context/ProjectContext';
import { useAuth } from '../../context/AuthContext';
import { useError } from '../../context/ErrorContext';
import { ErrorService } from '../../services/ErrorService';
import { renderMarkdown } from '../../utils/markdownRenderer';
import { useLocation } from 'react-router-dom';

const SupportChat = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState([]);
    const [inputValue, setInputValue] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [showQuickReplies, setShowQuickReplies] = useState(true);
    const [isMinimized, setIsMinimized] = useState(false);
    const [unreadCount, setUnreadCount] = useState(0);
    const [errorReportMode, setErrorReportMode] = useState(false);
    const [whatsappNumber, setWhatsappNumber] = useState('522811975587'); // Default fallback

    const messagesEndRef = useRef(null);
    const inputRef = useRef(null);
    const { plan } = useSubscription();
    const { user } = useAuth();
    const { showRateLimitModal } = useProject();
    const errorContext = useError(); // Retorna funciones por defecto si no está disponible
    const location = useLocation();

    // Get user's first name
    const getUserFirstName = () => {
        if (!user) return '';

        // Try to get from user metadata
        const fullName = user.user_metadata?.full_name || user.email?.split('@')[0] || '';

        // Get first name only
        const firstName = fullName.split(' ')[0];

        // Capitalize first letter
        return firstName.charAt(0).toUpperCase() + firstName.slice(1).toLowerCase();
    };

    // Scroll to bottom when new messages arrive
    useEffect(() => {
        if (messagesEndRef.current) {
            messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [messages]);

    // Focus input when chat opens
    useEffect(() => {
        if (isOpen && inputRef.current) {
            inputRef.current.focus();
        }
    }, [isOpen]);

    // Initialize chat with personalized welcome message
    useEffect(() => {
        if (isOpen && messages.length === 0) {
            const firstName = getUserFirstName();
            const greeting = firstName
                ? `¡Hola ${firstName}! 👋`
                : '¡Hola! 👋';

            setMessages([{
                id: 1,
                type: 'bot',
                text: `${greeting} Soy Geni, tu asistente de PresuGenius. Estoy aquí para ayudarte con lo que necesites. ¿Cómo puedo apoyarte hoy?`,
                timestamp: new Date()
            }]);
        }
    }, [isOpen, user, messages]); // AÃ±adir 'messages' a las dependencias

    // Reset unread count when chat opens
    useEffect(() => {
        if (isOpen) {
            setUnreadCount(0);
        }
    }, [isOpen]);

    // Escuchar evento para abrir el chat desde otros componentes
    useEffect(() => {
        const handleOpenSupport = (event) => {
            if (event.detail?.errorReport) {
                setIsOpen(true);
                setErrorReportMode(true);
                // Auto-enviar mensaje sobre el error
                setTimeout(() => {
                    handleSendMessage('Tengo un error en la plataforma');
                }, 300);
            } else {
                setIsOpen(true);
            }
        };

        window.addEventListener('openSupportChat', handleOpenSupport);
        return () => window.removeEventListener('openSupportChat', handleOpenSupport);
    }, []);

    // Cargar configuración dinámica
    useEffect(() => {
        const loadSettings = async () => {
            const number = await systemSettingsService.getSetting('whatsapp_number');
            if (number) setWhatsappNumber(number);
        };
        loadSettings();
    }, []);

    const isProcessingRef = useRef(false);

    const handleSendMessage = async (text = inputValue) => {
        if (!text.trim() || isProcessingRef.current) return;

        isProcessingRef.current = true;
        setIsLoading(true);

        const userMessage = {
            id: Date.now(),
            type: 'user',
            text: text.trim(),
            timestamp: new Date()
        };

        setMessages(prev => [...prev, userMessage]);
        setInputValue('');
        setShowQuickReplies(false);

        // Check if user wants human support
        if (text.toLowerCase().includes('humano') || text.toLowerCase().includes('whatsapp') || text.toLowerCase().includes('persona')) {
            setTimeout(() => {
            setMessages(prev => [...prev, {
                id: Date.now(),
                type: 'bot',
                text: '¡Entendido! Con gusto te pongo en contacto con nuestro equipo. 🧑‍💻\n\nPara una atención más personalizada, puedes escribirnos directamente por WhatsApp. ¡Haz clic en el botón de abajo para empezar a chatear!',
                timestamp: new Date(),
                showWhatsApp: true
            }]);
                setIsLoading(false);
                isProcessingRef.current = false;
            }, 500);
            return;
        }

        // Check if user is reporting an error
        const errorKeywords = ['error', 'falla', 'no funciona', 'problema', 'bug', 'no carga', 'no abre', 'crashea', 'se traba'];
        const isReportingError = errorKeywords.some(keyword => text.toLowerCase().includes(keyword));

        if (isReportingError && !errorReportMode) {
            setErrorReportMode(true);

            // Intentar obtener el último error automáticamente
            const lastError = errorContext.getLastError ? errorContext.getLastError() : null;
            const errorDetails = lastError && errorContext.formatErrorForSupport ? errorContext.formatErrorForSupport() : null;

            setTimeout(() => {
                let helpMessage = `¡Oh no! Parece que hay un problema técnico. No te preocupes, estoy aquí para ayudarte a resolverlo. 🛠️\n\n`;

                if (errorDetails) {
                    helpMessage += `✅ **¡Buena noticia! He detectado un error reciente en tu sesión y lo estoy analizando automáticamente.** Esto nos ayudará mucho.\n\nPara que podamos darte la mejor solución, por favor cuéntame:\n\n1. **¿Qué estabas haciendo justo antes de que apareciera el error?**\n2. **¿Qué fue lo que viste o pasó exactamente?**\n\nSi tienes el mensaje de error exacto, ¡copiarlo y pegarlo sería genial!`;
                } else {
                    helpMessage += `Para que pueda ayudarte de la mejor manera, por favor cuéntame un poco más:\n\n1. **¿Qué estabas intentando hacer cuando ocurrió el problema?**\n2. **¿Apareció algún mensaje de error? Si es así, ¿cuál fue?**\n3. **¿En qué parte de la plataforma estabas?**\n\nCualquier detalle que me des, ¡por pequeño que sea, es de gran ayuda!`;
                }

                setMessages(prev => [...prev, {
                    id: Date.now(),
                    type: 'bot',
                    text: helpMessage,
                    timestamp: new Date(),
                    isErrorHelp: true,
                    hasAutoDetectedError: !!errorDetails,
                    autoErrorDetails: errorDetails
                }]);
                setIsLoading(false);
                isProcessingRef.current = false;
            }, 500);
            return;
        }

        try {
            // Obtener detalles del error si está en modo de reporte
            let errorDetails = null;
            if (errorReportMode && errorContext.getLastError && errorContext.formatErrorForSupport) {
                const lastError = errorContext.getLastError();
                if (lastError) {
                    errorDetails = errorContext.formatErrorForSupport();
                }
            }

            const response = await SupportAIService.sendMessage(text, {
                plan: plan?.name || 'Gratis',
                currentPage: location.pathname,
                userName: getUserFirstName(),
                userEmail: user?.email,
                isErrorReport: errorReportMode,
                errorDetails: errorDetails
            });

            // Reset error mode after getting response
            if (errorReportMode) {
                setErrorReportMode(false);
            }

            // Manejar errores de Rate Limit o mostrar respuesta exitosa
            if (!response.success && response.error && (response.message.includes('límite') || response.message.includes('espera'))) {
                const retryMatch = response.message.match(/espera (\d+)s/);
                const retryAfter = retryMatch ? parseInt(retryMatch[1]) : 60;
                showRateLimitModal(response.message, retryAfter);
            }

            // Detectar respuesta vacía, genérica o sin información útil
            const genericResponses = [
                '',
                'No tengo información suficiente para responder a eso.',
                'Lo siento, no tengo información sobre eso.',
                'Lo siento, tuve un problema al procesar tu mensaje.'
            ];
            const isGeneric =
                !response.message ||
                genericResponses.includes(response.message.trim()) ||
                (response.message.trim().toLowerCase().startsWith('lo siento') && response.message.trim().length < 80);

            let botMessage = {
                id: Date.now(),
                type: 'bot',
                text: response.message || "Lo siento, tuve un problema al procesar tu mensaje.",
                sender: 'bot',
                timestamp: new Date(),
                isError: !response.success || response.isError,
                showWhatsApp: response.showWhatsApp || false
            };

            if (isGeneric) {
                botMessage = {
                    ...botMessage,
                    text: 'No tengo información suficiente para responder a eso. Si lo deseas, puedes reformular tu pregunta o contactar a soporte humano por WhatsApp.',
                    showWhatsApp: true,
                    isError: true
                };
            }

            setMessages(prev => [...prev, botMessage]);

            if (!isOpen) {
                setUnreadCount(prev => prev + 1);
            }
        } catch (error) {
            console.error('Error sending message:', error);

            // Capturar el error para que pueda ser reportado
            ErrorService.logError(error, 'SupportChat.handleSendMessage');

            setMessages(prev => [...prev, {
                id: Date.now(),
                type: 'bot',
                text: '¡Ups! 😬 Parece que estoy teniendo algunos problemas técnicos en este momento. No te preocupes, nuestro equipo ya está al tanto y trabajando para solucionarlo.\n\nMientras tanto, si necesitas ayuda urgente, por favor contáctanos directamente por WhatsApp: +52 281 197 5587. ¡Estaremos encantados de ayudarte!',
                timestamp: new Date(),
                isError: true,
                showWhatsApp: true
            }]);
        } finally {
            setIsLoading(false);
            isProcessingRef.current = false;
        }
    };

    const handleQuickReply = (reply) => {
        if (reply.text === 'Hablar con soporte humano') {
            handleSendMessage('Quiero hablar con soporte humano');
        } else {
            handleSendMessage(reply.text);
        }
    };

    const handleKeyPress = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSendMessage();
        }
    };

    const resetChat = () => {
        SupportAIService.resetChat();
        setErrorReportMode(false);
        const firstName = getUserFirstName();
        const greeting = firstName ? `¡Hola de nuevo ${firstName}!` : '¡Hola de nuevo!';
        setMessages([{
            id: Date.now(),
            type: 'bot',
            text: `${greeting} 👋 ¡Listo para seguir ayudándote! ¿Qué tienes en mente hoy?`,
            timestamp: new Date()
        }]);
        setShowQuickReplies(true);
    };

    const openWhatsApp = () => {
        const message = encodeURIComponent('Hola, necesito ayuda con PresuGenius');
        window.open(`https://wa.me/${whatsappNumber}?text=${message}`, '_blank');
    };

    const quickReplies = SupportAIService.getQuickReplies();

    return (
        <>
            {/* Floating Button */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={`fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full shadow-2xl flex items-center justify-center transition-all duration-300 transform hover:scale-110 ${isOpen
                    ? 'bg-slate-700 rotate-0'
                    : 'bg-gradient-to-r from-blue-600 to-purple-600 animate-pulse-slow'
                    }`}
            >
                {isOpen ? (
                    <X className="w-6 h-6 text-white" />
                ) : (
                    <>
                        <MessageCircle className="w-6 h-6 text-white" />
                        {unreadCount > 0 && (
                            <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-bold animate-bounce">
                                {unreadCount}
                            </span>
                        )}
                    </>
                )}
            </button>

            {/* Chat Window */}
            {isOpen && (
                <div className={`fixed bottom-24 right-6 z-50 w-96 max-w-[calc(100vw-3rem)] bg-white dark:bg-slate-800 rounded-2xl shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-700 transition-all duration-300 flex flex-col ${isMinimized ? 'h-14' : 'h-[500px] max-h-[70vh]'
                    }`}>
                    {/* Header */}
                    <div
                        className="bg-gradient-to-r from-blue-600 via-purple-600 to-blue-600 p-4 flex items-center justify-between cursor-pointer shadow-xl relative overflow-hidden"
                        onClick={() => setIsMinimized(!isMinimized)}
                    >
                        {/* Efecto de brillo sutil animado */}
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-shimmer"></div>

                        <div className="flex items-center gap-3 relative z-10">
                            <div className="w-11 h-11 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center shadow-lg border border-white/30 ring-2 ring-white/20">
                                <Bot className="w-6 h-6 text-white drop-shadow-sm" />
                            </div>
                            <div>
                                <h3 className="text-white font-bold text-base leading-tight drop-shadow-sm">Geni - Soporte</h3>
                                <p className="text-white/95 text-xs flex items-center gap-1.5 mt-0.5">
                                    <span className="relative flex items-center justify-center">
                                        <span className="absolute w-2.5 h-2.5 bg-green-400 rounded-full animate-ping opacity-75"></span>
                                        <span className="relative w-2 h-2 bg-green-400 rounded-full block ring-2 ring-green-400/50"></span>
                                    </span>
                                    <span className="font-semibold">En línea</span>
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center gap-1 relative z-10">
                            <button
                                onClick={(e) => { e.stopPropagation(); resetChat(); }}
                                className="p-2.5 hover:bg-white/20 rounded-xl transition-all duration-200 hover:scale-110 active:scale-95 group"
                                title="Reiniciar chat"
                            >
                                <RefreshCw className="w-4 h-4 text-white group-hover:rotate-180 transition-transform duration-500" />
                            </button>
                            <button
                                onClick={(e) => { e.stopPropagation(); openWhatsApp(); }}
                                className="p-2.5 hover:bg-white/20 rounded-xl transition-all duration-200 hover:scale-110 active:scale-95"
                                title="WhatsApp"
                            >
                                <Phone className="w-4 h-4 text-white" />
                            </button>
                            <button
                                onClick={(e) => { e.stopPropagation(); setIsMinimized(!isMinimized); }}
                                className="p-2.5 hover:bg-white/20 rounded-xl transition-all duration-200 hover:scale-110 active:scale-95"
                                title={isMinimized ? 'Expandir' : 'Minimizar'}
                            >
                                <ChevronDown className={`w-5 h-5 text-white transition-transform duration-300 ${isMinimized ? 'rotate-180' : ''}`} />
                            </button>
                        </div>
                    </div>

                    {!isMinimized && (
                        <>
                            {/* Messages */}
                            <div className="flex-1 overflow-y-auto p-4 space-y-4 h-[calc(100%-140px)] bg-slate-50 dark:bg-slate-900 scrollbar-hide">
                                {messages.map((message) => (
                                    <div
                                        key={message.id}
                                        className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
                                    >
                                        <div className={`flex items-start gap-2 max-w-[85%] ${message.type === 'user' ? 'flex-row-reverse' : ''}`}>
                                            {/* Avatar */}
                                            <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${message.type === 'user'
                                                ? 'bg-blue-600'
                                                : 'bg-gradient-to-br from-purple-500 to-blue-500'
                                                }`}>
                                                {message.type === 'user' ? (
                                                    <User className="w-4 h-4 text-white" />
                                                ) : (
                                                    <Sparkles className="w-4 h-4 text-white" />
                                                )}
                                            </div>

                                            {/* Message Bubble */}
                                            <div className={`rounded-2xl px-4 py-2.5 ${message.type === 'user'
                                                ? 'bg-blue-600 text-white rounded-tr-sm'
                                                : message.isError
                                                    ? 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200 rounded-tl-sm'
                                                    : message.isErrorHelp
                                                        ? 'bg-amber-50 dark:bg-amber-900/30 text-amber-800 dark:text-amber-200 rounded-tl-sm border border-amber-200 dark:border-amber-700'
                                                        : 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 shadow-sm rounded-tl-sm'
                                                }`}>
                                                {message.isErrorHelp && (
                                                    <div className="flex items-center gap-2 mb-2 text-amber-600 dark:text-amber-400">
                                                        <AlertTriangle className="w-4 h-4" />
                                                        <span className="text-xs font-semibold">Modo Diagnóstico</span>
                                                    </div>
                                                )}
                                                <div className="text-sm leading-relaxed">
                                                    {renderMarkdown(message.text)}
                                                </div>

                                                {/* WhatsApp Button */}
                                                {message.showWhatsApp && (
                                                    <button
                                                        onClick={openWhatsApp}
                                                        className="mt-3 w-full bg-green-500 hover:bg-green-600 text-white font-medium py-2 px-4 rounded-xl flex items-center justify-center gap-2 transition-colors"
                                                    >
                                                        <Phone className="w-4 h-4" />
                                                        Abrir WhatsApp
                                                        <ExternalLink className="w-3 h-3" />
                                                    </button>
                                                )}

                                                <p className="text-[10px] opacity-50 mt-1">
                                                    {message.timestamp.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                ))}

                                {/* Loading indicator */}
                                {isLoading && (
                                    <div className="flex justify-start">
                                        <div className="flex items-start gap-2">
                                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center">
                                                <Sparkles className="w-4 h-4 text-white" />
                                            </div>
                                            <div className="bg-white dark:bg-slate-800 rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm">
                                                <div className="flex items-center gap-1">
                                                    <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                                                    <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                                                    <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Quick Replies */}
                                {showQuickReplies && messages.length <= 1 && !isLoading && (
                                    <div className="space-y-2">
                                        <p className="text-xs text-slate-500 dark:text-slate-400 text-center">Preguntas frecuentes:</p>
                                        <div className="flex flex-wrap gap-2 justify-center">
                                            {quickReplies.map((reply) => (
                                                <button
                                                    key={reply.id}
                                                    onClick={() => handleQuickReply(reply)}
                                                    className="px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-full text-xs text-slate-700 dark:text-slate-300 hover:bg-blue-50 dark:hover:bg-slate-700 hover:border-blue-300 transition-colors flex items-center gap-1"
                                                >
                                                    <span>{reply.icon}</span>
                                                    <span>{reply.text}</span>
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                <div ref={messagesEndRef} />
                            </div>

                            {/* Input */}
                            <div className="p-3 bg-white dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700">
                                <div className="flex items-center gap-2">
                                    <input
                                        ref={inputRef}
                                        type="text"
                                        value={inputValue}
                                        onChange={(e) => setInputValue(e.target.value)}
                                        onKeyPress={handleKeyPress}
                                        placeholder="Escribe tu mensaje..."
                                        disabled={isLoading}
                                        className="flex-1 px-4 py-2.5 bg-slate-100 dark:bg-slate-900 border-0 rounded-xl text-sm text-slate-800 dark:text-slate-200 placeholder-slate-500 focus:ring-2 focus:ring-blue-500/30 outline-none transition-all disabled:opacity-50"
                                    />
                                    <button
                                        onClick={() => handleSendMessage()}
                                        disabled={!inputValue.trim() || isLoading}
                                        className="w-10 h-10 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 rounded-xl flex items-center justify-center text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-105 active:scale-95"
                                    >
                                        {isLoading ? (
                                            <Loader className="w-5 h-5 animate-spin" />
                                        ) : (
                                            <Send className="w-5 h-5" />
                                        )}
                                    </button>
                                </div>
                                <p className="text-[10px] text-slate-400 text-center mt-2">
                                    Powered by AI • <button onClick={openWhatsApp} className="text-green-500 hover:underline">WhatsApp: +{whatsappNumber}</button>
                                </p>
                            </div>
                        </>
                    )}
                </div>
            )}

            {/* CSS for animations and scrollbar */}
            <style>{`
                @keyframes pulse-slow {
                    0%, 100% { box-shadow: 0 0 0 0 rgba(59, 130, 246, 0.5); }
                    50% { box-shadow: 0 0 0 10px rgba(59, 130, 246, 0); }
                }
                .animate-pulse-slow {
                    animation: pulse-slow 2s infinite;
                }
                
                @keyframes shimmer {
                    0% {
                        transform: translateX(-100%);
                    }
                    100% {
                        transform: translateX(100%);
                    }
                }
                .animate-shimmer {
                    animation: shimmer 3s ease-in-out infinite;
                }
                
                /* Ocultar scrollbar pero mantener funcionalidad */
                .scrollbar-hide {
                    -ms-overflow-style: none;  /* IE and Edge */
                    scrollbar-width: none;  /* Firefox */
                    scroll-behavior: smooth;
                }
                
                .scrollbar-hide::-webkit-scrollbar {
                    display: none;  /* Chrome, Safari and Opera */
                    width: 0;
                    height: 0;
                    background: transparent;
                }
            `}</style>
        </>
    );
};

export default SupportChat;
