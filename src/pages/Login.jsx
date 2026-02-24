import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Hammer, Mail, Lock, User, AlertCircle, Loader, CheckCircle, Sparkles } from 'lucide-react';

const Login = () => {
    const navigate = useNavigate();
    const { signIn, signUp } = useAuth();

    const [isSignUp, setIsSignUp] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [rememberMe, setRememberMe] = useState(false);
    const [loginSuccess, setLoginSuccess] = useState(false);
    const [particles, setParticles] = useState([]);

    const [formData, setFormData] = useState({
        email: '',
        password: '',
        confirmPassword: '',
        fullName: ''
    });

    // Generate confetti particles
    const generateParticles = () => {
        const colors = ['#3b82f6', '#8b5cf6', '#06b6d4', '#10b981', '#f59e0b', '#ef4444', '#ec4899'];
        const newParticles = [];
        for (let i = 0; i < 50; i++) {
            newParticles.push({
                id: i,
                x: Math.random() * 100,
                y: Math.random() * 100,
                size: Math.random() * 8 + 4,
                color: colors[Math.floor(Math.random() * colors.length)],
                delay: Math.random() * 0.5,
                duration: Math.random() * 1 + 1.5,
                rotation: Math.random() * 360
            });
        }
        setParticles(newParticles);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            if (isSignUp) {
                if (formData.password !== formData.confirmPassword) {
                    setError('Las contraseñas no coinciden');
                    setLoading(false);
                    return;
                }

                if (formData.password.length < 6) {
                    setError('La contraseña debe tener al menos 6 caracteres');
                    setLoading(false);
                    return;
                }

                const { error: signUpError } = await signUp(
                    formData.email,
                    formData.password,
                    { full_name: formData.fullName }
                );

                if (signUpError) throw signUpError;

                setError('');
                alert('Cuenta creada! Por favor revisa tu email para confirmar tu cuenta.');
                setIsSignUp(false);
            } else {
                const { error: signInError } = await signIn(formData.email, formData.password);

                if (signInError) throw signInError;

                // Show success animation
                setLoginSuccess(true);
                generateParticles();
                
                // Navigate after animation
                setTimeout(() => {
                    navigate('/dashboard');
                }, 2000);
            }
        } catch (err) {
            console.error('Auth error:', err);

            if (err.message?.includes('Failed to fetch') || err.message?.includes('ERR_NAME_NOT_RESOLVED')) {
                setError('⚠️ No se puede conectar con Supabase. Usa el modo local para continuar.');
            } else {
                setError(err.message || 'Error de autenticación');
            }
        } finally {
            setLoading(false);
        }
    };

    const handleChange = (e) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value
        });
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 flex items-center justify-center p-4 overflow-hidden relative">
            {/* Success Overlay */}
            {loginSuccess && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/90 backdrop-blur-md animate-success-overlay">
                    {/* Confetti Particles */}
                    <div className="absolute inset-0 overflow-hidden pointer-events-none">
                        {particles.map((particle) => (
                            <div
                                key={particle.id}
                                className="absolute animate-confetti"
                                style={{
                                    left: `${particle.x}%`,
                                    top: '-10%',
                                    width: `${particle.size}px`,
                                    height: `${particle.size}px`,
                                    backgroundColor: particle.color,
                                    borderRadius: Math.random() > 0.5 ? '50%' : '2px',
                                    animationDelay: `${particle.delay}s`,
                                    animationDuration: `${particle.duration}s`,
                                    transform: `rotate(${particle.rotation}deg)`
                                }}
                            />
                        ))}
                    </div>

                    {/* Success Content */}
                    <div className="relative z-10 text-center animate-success-content">
                        {/* Animated Circle with Checkmark */}
                        <div className="relative mx-auto mb-8">
                            {/* Outer Ring */}
                            <div className="w-32 h-32 rounded-full border-4 border-green-500/30 animate-success-ring"></div>
                            
                            {/* Inner Circle */}
                            <div className="absolute inset-0 flex items-center justify-center">
                                <div className="w-24 h-24 bg-gradient-to-br from-green-500 to-emerald-600 rounded-full flex items-center justify-center shadow-2xl shadow-green-500/50 animate-success-circle">
                                    <CheckCircle className="w-12 h-12 text-white animate-success-check" />
                                </div>
                            </div>

                            {/* Sparkles */}
                            <Sparkles className="absolute -top-2 -right-2 w-8 h-8 text-yellow-400 animate-sparkle" />
                            <Sparkles className="absolute -bottom-2 -left-2 w-6 h-6 text-blue-400 animate-sparkle-delayed" />
                            <Sparkles className="absolute top-1/2 -right-4 w-5 h-5 text-purple-400 animate-sparkle" />
                        </div>

                        {/* Success Text */}
                        <h2 className="text-3xl font-bold text-white mb-3 animate-success-text">
                            ¡Bienvenido!
                        </h2>
                        <p className="text-slate-300 text-lg mb-6 animate-success-text-delayed">
                            Inicio de sesión exitoso
                        </p>

                        {/* Loading Bar */}
                        <div className="w-64 h-1.5 bg-slate-700 rounded-full mx-auto overflow-hidden">
                            <div className="h-full bg-gradient-to-r from-blue-500 via-purple-500 to-green-500 rounded-full animate-success-bar"></div>
                        </div>
                        <p className="text-slate-500 text-sm mt-3 animate-success-text-delayed">
                            Redirigiendo al dashboard...
                        </p>
                    </div>
                </div>
            )}

            {/* Animated Background Elements */}
            <div className="absolute inset-0 overflow-hidden">
                {/* Diagonal Lines/Shapes */}
                <div className="absolute -top-20 -left-20 w-96 h-96 bg-gradient-to-br from-blue-600/20 to-transparent rounded-full blur-3xl animate-float"></div>
                <div className="absolute top-1/4 -left-10 w-64 h-64 bg-gradient-to-r from-purple-600/15 to-transparent rounded-full blur-2xl animate-float-delayed"></div>
                <div className="absolute bottom-1/4 left-1/4 w-48 h-48 bg-gradient-to-tr from-blue-500/15 to-transparent rounded-full blur-2xl animate-float"></div>
                
                {/* Diagonal Stripes */}
                <div className="absolute inset-0 opacity-10">
                    <div className="absolute top-0 left-0 w-full h-full">
                        <div className="absolute top-20 -left-20 w-[600px] h-3 bg-gradient-to-r from-transparent via-blue-400 to-transparent transform rotate-45 animate-slide"></div>
                        <div className="absolute top-40 -left-10 w-[500px] h-2 bg-gradient-to-r from-transparent via-purple-400/70 to-transparent transform rotate-45 animate-slide-delayed"></div>
                        <div className="absolute top-60 left-0 w-[400px] h-4 bg-gradient-to-r from-transparent via-blue-300/50 to-transparent transform rotate-45 animate-slide"></div>
                        <div className="absolute top-80 left-10 w-[300px] h-2 bg-gradient-to-r from-transparent via-purple-300/60 to-transparent transform rotate-45 animate-slide-delayed"></div>
                        <div className="absolute bottom-40 -left-20 w-[550px] h-3 bg-gradient-to-r from-transparent via-blue-400/40 to-transparent transform rotate-45 animate-slide"></div>
                    </div>
                </div>

                {/* Floating Circles */}
                <div className="absolute top-1/3 left-1/6 w-4 h-4 bg-blue-400/40 rounded-full animate-bounce-slow"></div>
                <div className="absolute top-2/3 left-1/4 w-3 h-3 bg-purple-400/40 rounded-full animate-bounce-delayed"></div>
                <div className="absolute bottom-1/4 left-1/3 w-5 h-5 bg-indigo-400/30 rounded-full animate-bounce-slow"></div>
            </div>

            {/* Main Card Container */}
            <div className="relative z-10 w-full max-w-5xl bg-slate-800/50 backdrop-blur-sm rounded-3xl shadow-2xl overflow-hidden flex flex-col lg:flex-row min-h-[600px] border border-slate-700/50">
                
                {/* Left Side - Welcome Panel */}
                <div className="lg:w-1/2 p-8 lg:p-12 flex flex-col justify-center relative overflow-hidden bg-gradient-to-br from-blue-900/40 to-purple-900/40">
                    {/* Decorative Elements */}
                    <div className="absolute inset-0 overflow-hidden">
                        <div className="absolute -top-10 -right-10 w-40 h-40 bg-blue-500/15 rounded-full blur-2xl"></div>
                        <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-purple-500/15 rounded-full blur-2xl"></div>
                        
                        {/* Diagonal Decorative Lines */}
                        <svg className="absolute inset-0 w-full h-full opacity-20" viewBox="0 0 400 400" preserveAspectRatio="none">
                            <defs>
                                <linearGradient id="lineGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                                    <stop offset="0%" stopColor="#60a5fa" stopOpacity="0" />
                                    <stop offset="50%" stopColor="#60a5fa" stopOpacity="0.5" />
                                    <stop offset="100%" stopColor="#60a5fa" stopOpacity="0" />
                                </linearGradient>
                            </defs>
                            <line x1="0" y1="100" x2="400" y2="300" stroke="url(#lineGrad)" strokeWidth="3" className="animate-draw" />
                            <line x1="0" y1="150" x2="350" y2="350" stroke="url(#lineGrad)" strokeWidth="2" className="animate-draw-delayed" />
                            <line x1="50" y1="0" x2="400" y2="250" stroke="url(#lineGrad)" strokeWidth="4" className="animate-draw" />
                            <line x1="0" y1="250" x2="300" y2="400" stroke="url(#lineGrad)" strokeWidth="2" className="animate-draw-delayed" />
                        </svg>
                    </div>

                    <div className="relative z-10 text-white">
                        {/* Logo */}
                        <div className="mb-8 inline-flex items-center justify-center w-16 h-16 bg-blue-500/20 backdrop-blur-lg rounded-2xl border border-blue-400/30 shadow-xl">
                            <Hammer className="text-blue-300" size={32} />
                        </div>

                        <h1 className="text-4xl lg:text-5xl font-bold mb-4 leading-tight animate-fade-in-up">
                            Bienvenido a<br />
                            <span className="text-blue-400">PresuGenius</span>
                        </h1>

                        <p className="text-lg text-slate-300 mb-8 leading-relaxed max-w-md animate-fade-in-up animation-delay-200">
                            La plataforma inteligente que revoluciona la creación de presupuestos de construcción con IA avanzada.
                        </p>

                        {/* Feature Pills */}
                        <div className="flex flex-wrap gap-3 animate-fade-in-up animation-delay-400">
                            <span className="px-4 py-2 bg-slate-700/50 backdrop-blur-sm rounded-full text-sm border border-slate-600/50 flex items-center gap-2">
                                <span className="text-yellow-400">⚡</span> Rápido
                            </span>
                            <span className="px-4 py-2 bg-slate-700/50 backdrop-blur-sm rounded-full text-sm border border-slate-600/50 flex items-center gap-2">
                                <span className="text-green-400">🎯</span> Preciso
                            </span>
                            <span className="px-4 py-2 bg-slate-700/50 backdrop-blur-sm rounded-full text-sm border border-slate-600/50 flex items-center gap-2">
                                <span className="text-blue-400">🛡️</span> Seguro
                            </span>
                        </div>
                    </div>

                    {/* Mobile Only - Show on small screens */}
                    <div className="lg:hidden mt-8 text-center text-slate-500 text-xs">
                        © 2025 PresuGenius Pro
                    </div>
                </div>

                {/* Right Side - Form Panel */}
                <div className="lg:w-1/2 bg-slate-900 p-8 lg:p-12 flex flex-col justify-center">
                    <div className="max-w-sm mx-auto w-full">
                        {/* Form Header */}
                        <div className="text-center mb-8">
                            <h2 className="text-2xl font-bold text-white mb-2">
                                {isSignUp ? 'CREAR CUENTA' : 'INICIAR SESIÓN'}
                            </h2>
                            <div className="w-12 h-1 bg-gradient-to-r from-blue-500 to-purple-500 mx-auto rounded-full"></div>
                        </div>

                        {/* Error Message */}
                        {error && (
                            <div className="mb-6 p-4 bg-red-900/30 border border-red-500/30 rounded-xl flex items-start gap-3 text-red-300 animate-shake">
                                <AlertCircle size={20} className="text-red-400 flex-shrink-0 mt-0.5" />
                                <span className="text-sm leading-relaxed">{error}</span>
                            </div>
                        )}

                        {/* Form */}
                        <form onSubmit={handleSubmit} className="space-y-5">
                            {isSignUp && (
                                <div className="animate-fade-in">
                                    <div className="relative">
                                        <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={20} />
                                        <input
                                            type="text"
                                            name="fullName"
                                            value={formData.fullName}
                                            onChange={handleChange}
                                            required={isSignUp}
                                            className="w-full pl-12 pr-4 py-3.5 bg-slate-800 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 outline-none transition-all"
                                            placeholder="Nombre completo"
                                        />
                                    </div>
                                </div>
                            )}

                            <div className="relative">
                                <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={20} />
                                <input
                                    type="email"
                                    name="email"
                                    value={formData.email}
                                    onChange={handleChange}
                                    required
                                    className="w-full pl-12 pr-4 py-3.5 bg-slate-800 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 outline-none transition-all"
                                    placeholder="Correo electrónico"
                                />
                            </div>

                            <div className="relative">
                                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={20} />
                                <input
                                    type="password"
                                    name="password"
                                    value={formData.password}
                                    onChange={handleChange}
                                    required
                                    className="w-full pl-12 pr-4 py-3.5 bg-slate-800 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 outline-none transition-all"
                                    placeholder="Contraseña"
                                />
                            </div>

                            {isSignUp && (
                                <div className="animate-fade-in relative">
                                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={20} />
                                    <input
                                        type="password"
                                        name="confirmPassword"
                                        value={formData.confirmPassword}
                                        onChange={handleChange}
                                        required={isSignUp}
                                        className="w-full pl-12 pr-4 py-3.5 bg-slate-800 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 outline-none transition-all"
                                        placeholder="Confirmar contraseña"
                                    />
                                </div>
                            )}

                            {/* Remember Me & Forgot Password */}
                            {!isSignUp && (
                                <div className="flex items-center justify-between text-sm">
                                    <label className="flex items-center gap-2 cursor-pointer group">
                                        <input
                                            type="checkbox"
                                            checked={rememberMe}
                                            onChange={(e) => setRememberMe(e.target.checked)}
                                            className="w-4 h-4 rounded border-slate-600 bg-slate-800 text-blue-500 focus:ring-blue-500/30"
                                        />
                                        <span className="text-slate-400 group-hover:text-slate-300 transition-colors">Recordarme</span>
                                    </label>
                                    <button
                                        type="button"
                                        className="text-blue-400 hover:text-blue-300 font-medium transition-colors"
                                    >
                                        ¿Olvidaste tu contraseña?
                                    </button>
                                </div>
                            )}

                            {/* Submit Button */}
                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-bold py-3.5 rounded-xl transition-all shadow-lg shadow-blue-900/50 flex items-center justify-center gap-2 disabled:opacity-50 transform hover:scale-[1.02] active:scale-[0.98]"
                            >
                                {loading ? (
                                    <>
                                        <Loader size={20} className="animate-spin" />
                                        Procesando...
                                    </>
                                ) : (
                                    isSignUp ? 'CREAR CUENTA' : 'INICIAR SESIÓN'
                                )}
                            </button>
                        </form>

                        {/* Toggle Sign Up / Sign In */}
                        <div className="mt-8 text-center">
                            <p className="text-slate-400 text-sm">
                                {isSignUp ? '¿Ya tienes una cuenta?' : '¿No tienes cuenta?'}
                                <button
                                    onClick={() => setIsSignUp(!isSignUp)}
                                    className="ml-2 text-blue-400 hover:text-blue-300 font-semibold transition-colors"
                                >
                                    {isSignUp ? 'Inicia sesión' : 'Regístrate'}
                                </button>
                            </p>
                        </div>

                        {/* Desktop Footer */}
                        <div className="hidden lg:block mt-8 text-center text-slate-500 text-xs">
                            © 2025 PresuGenius Pro. Todos los derechos reservados.
                        </div>
                    </div>
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
                @keyframes slide {
                    0% { transform: translateX(-100%) rotate(45deg); opacity: 0; }
                    50% { opacity: 1; }
                    100% { transform: translateX(200%) rotate(45deg); opacity: 0; }
                }
                @keyframes bounce-slow {
                    0%, 100% { transform: translateY(0); }
                    50% { transform: translateY(-15px); }
                }
                @keyframes draw {
                    0% { stroke-dasharray: 0, 1000; }
                    100% { stroke-dasharray: 1000, 0; }
                }
                @keyframes fadeInUp {
                    from { opacity: 0; transform: translateY(30px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                @keyframes fadeIn {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
                @keyframes shake {
                    0%, 100% { transform: translateX(0); }
                    25% { transform: translateX(-5px); }
                    75% { transform: translateX(5px); }
                }
                
                /* Success Animation Keyframes */
                @keyframes successOverlay {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
                @keyframes successContent {
                    0% { opacity: 0; transform: scale(0.8) translateY(20px); }
                    100% { opacity: 1; transform: scale(1) translateY(0); }
                }
                @keyframes successRing {
                    0% { transform: scale(0.5); opacity: 0; }
                    50% { transform: scale(1.2); opacity: 1; }
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
                    0% { opacity: 0; transform: translateY(20px); }
                    100% { opacity: 1; transform: translateY(0); }
                }
                @keyframes successBar {
                    0% { width: 0%; }
                    100% { width: 100%; }
                }
                @keyframes confetti {
                    0% {
                        transform: translateY(0) rotate(0deg);
                        opacity: 1;
                    }
                    100% {
                        transform: translateY(100vh) rotate(720deg);
                        opacity: 0;
                    }
                }
                @keyframes sparkle {
                    0%, 100% { transform: scale(0) rotate(0deg); opacity: 0; }
                    50% { transform: scale(1) rotate(180deg); opacity: 1; }
                }
                @keyframes pulse-glow {
                    0%, 100% { box-shadow: 0 0 20px rgba(34, 197, 94, 0.5); }
                    50% { box-shadow: 0 0 40px rgba(34, 197, 94, 0.8), 0 0 60px rgba(34, 197, 94, 0.4); }
                }
                
                .animate-float { animation: float 6s ease-in-out infinite; }
                .animate-float-delayed { animation: float-delayed 8s ease-in-out infinite; }
                .animate-slide { animation: slide 8s linear infinite; }
                .animate-slide-delayed { animation: slide 10s linear infinite 2s; }
                .animate-bounce-slow { animation: bounce-slow 3s ease-in-out infinite; }
                .animate-bounce-delayed { animation: bounce-slow 4s ease-in-out infinite 1s; }
                .animate-draw { animation: draw 3s ease-in-out infinite; }
                .animate-draw-delayed { animation: draw 4s ease-in-out infinite 1s; }
                .animate-fade-in-up { animation: fadeInUp 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
                .animate-fade-in { animation: fadeIn 0.8s ease-out forwards; }
                .animate-shake { animation: shake 0.4s ease-in-out; }
                .animation-delay-200 { animation-delay: 0.2s; opacity: 0; }
                .animation-delay-400 { animation-delay: 0.4s; opacity: 0; }
                
                /* Success Animation Classes */
                .animate-success-overlay { animation: successOverlay 0.3s ease-out forwards; }
                .animate-success-content { animation: successContent 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) 0.2s forwards; opacity: 0; }
                .animate-success-ring { animation: successRing 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) 0.3s forwards, pulse-glow 2s ease-in-out infinite 1s; opacity: 0; }
                .animate-success-circle { animation: successCircle 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) 0.4s forwards; transform: scale(0); }
                .animate-success-check { animation: successCheck 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) 0.6s forwards; opacity: 0; }
                .animate-success-text { animation: successText 0.5s ease-out 0.7s forwards; opacity: 0; }
                .animate-success-text-delayed { animation: successText 0.5s ease-out 0.9s forwards; opacity: 0; }
                .animate-success-bar { animation: successBar 1.8s ease-out 0.5s forwards; width: 0; }
                .animate-confetti { animation: confetti 2s ease-out forwards; }
                .animate-sparkle { animation: sparkle 1s ease-in-out infinite; }
                .animate-sparkle-delayed { animation: sparkle 1s ease-in-out infinite 0.5s; }
            `}</style>
        </div>
    );
};

export default Login;
