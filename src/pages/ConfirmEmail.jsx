import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { CheckCircle, XCircle, Loader, Mail, Sparkles, ArrowRight } from 'lucide-react';

const ConfirmEmail = () => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const [status, setStatus] = useState('verifying'); // verifying, success, error
    const [message, setMessage] = useState('');
    const [countdown, setCountdown] = useState(5);

    useEffect(() => {
        handleEmailConfirmation();
    }, []);

    useEffect(() => {
        if (status === 'success' && countdown > 0) {
            const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
            return () => clearTimeout(timer);
        } else if (status === 'success' && countdown === 0) {
            navigate('/login');
        }
    }, [status, countdown, navigate]);

    const handleEmailConfirmation = async () => {
        try {
            // Supabase maneja automáticamente la confirmación a través de los parámetros de URL
            // Verificamos si hay un token de acceso o error en los parámetros
            const hashParams = new URLSearchParams(window.location.hash.substring(1));
            const accessToken = hashParams.get('access_token');
            const errorDescription = hashParams.get('error_description');
            const type = hashParams.get('type');

            if (errorDescription) {
                setStatus('error');
                setMessage(decodeURIComponent(errorDescription));
                return;
            }

            if (accessToken || type === 'signup' || type === 'recovery' || type === 'email_change') {
                // La confirmación fue exitosa
                setStatus('success');
                setMessage('¡Tu correo electrónico ha sido verificado exitosamente!');
                return;
            }

            // Verificar si hay una sesión activa (el usuario ya confirmó)
            const { data: { session } } = await supabase.auth.getSession();
            
            if (session) {
                setStatus('success');
                setMessage('¡Tu cuenta está verificada y lista para usar!');
                return;
            }

            // Si no hay token ni sesión, puede ser que el enlace ya fue usado
            // o que el usuario llegó aquí directamente
            const token = searchParams.get('token');
            const tokenHash = searchParams.get('token_hash');
            
            if (token || tokenHash) {
                // Intentar verificar con el token
                const { error } = await supabase.auth.verifyOtp({
                    token_hash: tokenHash || token,
                    type: 'email'
                });

                if (error) {
                    if (error.message.includes('expired')) {
                        setStatus('error');
                        setMessage('El enlace de confirmación ha expirado. Por favor solicita uno nuevo.');
                    } else {
                        setStatus('error');
                        setMessage(error.message);
                    }
                } else {
                    setStatus('success');
                    setMessage('¡Tu correo electrónico ha sido verificado exitosamente!');
                }
            } else {
                // No hay parámetros de confirmación
                setStatus('success');
                setMessage('¡Bienvenido! Tu cuenta está lista para usar.');
            }
        } catch (error) {
            console.error('Error during email confirmation:', error);
            setStatus('error');
            setMessage('Ocurrió un error al verificar tu correo. Por favor intenta de nuevo.');
        }
    };

    const goToLogin = () => {
        navigate('/login');
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 flex items-center justify-center p-4 overflow-hidden relative">
            {/* Animated Background Elements */}
            <div className="absolute inset-0 overflow-hidden">
                <div className="absolute -top-20 -left-20 w-96 h-96 bg-gradient-to-br from-blue-600/20 to-transparent rounded-full blur-3xl animate-float"></div>
                <div className="absolute top-1/4 -right-10 w-64 h-64 bg-gradient-to-r from-purple-600/15 to-transparent rounded-full blur-2xl animate-float-delayed"></div>
                <div className="absolute bottom-1/4 left-1/4 w-48 h-48 bg-gradient-to-tr from-green-500/15 to-transparent rounded-full blur-2xl animate-float"></div>
            </div>

            {/* Main Card */}
            <div className="relative z-10 w-full max-w-md bg-slate-800/50 backdrop-blur-sm rounded-3xl shadow-2xl overflow-hidden border border-slate-700/50 p-8">
                {/* Verifying State */}
                {status === 'verifying' && (
                    <div className="text-center animate-fade-in">
                        <div className="relative mx-auto mb-8 w-24 h-24">
                            <div className="absolute inset-0 border-4 border-blue-500/30 rounded-full animate-ping"></div>
                            <div className="absolute inset-0 flex items-center justify-center">
                                <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center shadow-lg shadow-blue-500/30">
                                    <Mail className="w-10 h-10 text-white animate-pulse" />
                                </div>
                            </div>
                        </div>
                        <h2 className="text-2xl font-bold text-white mb-3">Verificando tu correo</h2>
                        <p className="text-slate-400 mb-6">Por favor espera un momento...</p>
                        <div className="flex justify-center">
                            <Loader className="w-8 h-8 text-blue-400 animate-spin" />
                        </div>
                    </div>
                )}

                {/* Success State */}
                {status === 'success' && (
                    <div className="text-center animate-success-content">
                        {/* Success Icon */}
                        <div className="relative mx-auto mb-8">
                            <div className="w-24 h-24 rounded-full border-4 border-green-500/30 animate-success-ring"></div>
                            <div className="absolute inset-0 flex items-center justify-center">
                                <div className="w-20 h-20 bg-gradient-to-br from-green-500 to-emerald-600 rounded-full flex items-center justify-center shadow-2xl shadow-green-500/50 animate-success-circle">
                                    <CheckCircle className="w-10 h-10 text-white animate-success-check" />
                                </div>
                            </div>
                            <Sparkles className="absolute -top-2 -right-2 w-6 h-6 text-yellow-400 animate-sparkle" />
                            <Sparkles className="absolute -bottom-2 -left-2 w-5 h-5 text-blue-400 animate-sparkle-delayed" />
                        </div>

                        <h2 className="text-2xl font-bold text-white mb-3 animate-success-text">
                            ¡Verificación Exitosa!
                        </h2>
                        <p className="text-slate-300 mb-6 animate-success-text-delayed">
                            {message}
                        </p>

                        {/* Countdown */}
                        <div className="mb-6 animate-success-text-delayed">
                            <p className="text-slate-400 text-sm mb-2">
                                Redirigiendo al inicio de sesión en...
                            </p>
                            <div className="w-16 h-16 mx-auto bg-slate-700/50 rounded-full flex items-center justify-center border-2 border-green-500/50">
                                <span className="text-2xl font-bold text-green-400">{countdown}</span>
                            </div>
                        </div>

                        {/* Progress Bar */}
                        <div className="w-full h-1.5 bg-slate-700 rounded-full overflow-hidden mb-6">
                            <div 
                                className="h-full bg-gradient-to-r from-green-500 to-emerald-500 rounded-full transition-all duration-1000"
                                style={{ width: `${((5 - countdown) / 5) * 100}%` }}
                            ></div>
                        </div>

                        <button
                            onClick={goToLogin}
                            className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white font-bold py-3.5 rounded-xl transition-all shadow-lg shadow-green-900/50 flex items-center justify-center gap-2 transform hover:scale-[1.02] active:scale-[0.98]"
                        >
                            Ir al Inicio de Sesión
                            <ArrowRight size={20} />
                        </button>
                    </div>
                )}

                {/* Error State */}
                {status === 'error' && (
                    <div className="text-center animate-fade-in">
                        {/* Error Icon */}
                        <div className="relative mx-auto mb-8">
                            <div className="w-24 h-24 rounded-full border-4 border-red-500/30"></div>
                            <div className="absolute inset-0 flex items-center justify-center">
                                <div className="w-20 h-20 bg-gradient-to-br from-red-500 to-rose-600 rounded-full flex items-center justify-center shadow-2xl shadow-red-500/50 animate-shake">
                                    <XCircle className="w-10 h-10 text-white" />
                                </div>
                            </div>
                        </div>

                        <h2 className="text-2xl font-bold text-white mb-3">
                            Error de Verificación
                        </h2>
                        <p className="text-slate-300 mb-6">
                            {message}
                        </p>

                        <div className="space-y-3">
                            <button
                                onClick={goToLogin}
                                className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-bold py-3.5 rounded-xl transition-all shadow-lg shadow-blue-900/50 flex items-center justify-center gap-2 transform hover:scale-[1.02] active:scale-[0.98]"
                            >
                                Ir al Inicio de Sesión
                                <ArrowRight size={20} />
                            </button>
                            <button
                                onClick={() => navigate('/')}
                                className="w-full bg-slate-700 hover:bg-slate-600 text-white font-medium py-3 rounded-xl transition-all"
                            >
                                Volver al Inicio
                            </button>
                        </div>
                    </div>
                )}

                {/* Footer */}
                <div className="mt-8 text-center text-slate-500 text-xs">
                    © 2025 PresuGenius Pro. Todos los derechos reservados.
                </div>
            </div>

            {/* CSS Animations */}
            <style>{`
                @keyframes float {
                    0%, 100% { transform: translateY(0) rotate(0deg); }
                    50% { transform: translateY(-20px) rotate(5deg); }
                }
                @keyframes float-delayed {
                    0%, 100% { transform: translateY(0) rotate(0deg); }
                    50% { transform: translateY(-15px) rotate(-5deg); }
                }
                @keyframes fadeIn {
                    from { opacity: 0; transform: translateY(20px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                @keyframes successContent {
                    0% { opacity: 0; transform: scale(0.9); }
                    100% { opacity: 1; transform: scale(1); }
                }
                @keyframes successRing {
                    0% { transform: scale(0.5); opacity: 0; }
                    50% { transform: scale(1.1); opacity: 1; }
                    100% { transform: scale(1); opacity: 1; }
                }
                @keyframes successCircle {
                    0% { transform: scale(0); }
                    50% { transform: scale(1.1); }
                    100% { transform: scale(1); }
                }
                @keyframes successCheck {
                    0% { transform: scale(0) rotate(-45deg); opacity: 0; }
                    50% { transform: scale(1.2) rotate(0deg); }
                    100% { transform: scale(1) rotate(0deg); opacity: 1; }
                }
                @keyframes successText {
                    0% { opacity: 0; transform: translateY(10px); }
                    100% { opacity: 1; transform: translateY(0); }
                }
                @keyframes sparkle {
                    0%, 100% { transform: scale(0) rotate(0deg); opacity: 0; }
                    50% { transform: scale(1) rotate(180deg); opacity: 1; }
                }
                @keyframes shake {
                    0%, 100% { transform: translateX(0); }
                    25% { transform: translateX(-5px); }
                    75% { transform: translateX(5px); }
                }
                @keyframes pulse-glow {
                    0%, 100% { box-shadow: 0 0 20px rgba(34, 197, 94, 0.5); }
                    50% { box-shadow: 0 0 40px rgba(34, 197, 94, 0.8); }
                }
                
                .animate-float { animation: float 6s ease-in-out infinite; }
                .animate-float-delayed { animation: float-delayed 8s ease-in-out infinite; }
                .animate-fade-in { animation: fadeIn 0.6s ease-out forwards; }
                .animate-success-content { animation: successContent 0.5s ease-out forwards; }
                .animate-success-ring { animation: successRing 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) forwards, pulse-glow 2s ease-in-out infinite 1s; }
                .animate-success-circle { animation: successCircle 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) 0.2s forwards; transform: scale(0); }
                .animate-success-check { animation: successCheck 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) 0.4s forwards; opacity: 0; }
                .animate-success-text { animation: successText 0.5s ease-out 0.5s forwards; opacity: 0; }
                .animate-success-text-delayed { animation: successText 0.5s ease-out 0.7s forwards; opacity: 0; }
                .animate-sparkle { animation: sparkle 1s ease-in-out infinite; }
                .animate-sparkle-delayed { animation: sparkle 1s ease-in-out infinite 0.5s; }
                .animate-shake { animation: shake 0.5s ease-in-out; }
            `}</style>
        </div>
    );
};

export default ConfirmEmail;