import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import { 
    Hammer, 
    Sparkles, 
    Bot, 
    FileText, 
    Calculator, 
    TrendingUp, 
    Shield, 
    Zap, 
    ArrowRight,
    CheckCircle,
    BarChart3,
    Cloud,
    Brain,
    Rocket,
    Clock,
    DollarSign,
    Users,
    X,
    Check,
    AlertCircle
} from 'lucide-react';

const LandingPage = () => {
    const navigate = useNavigate();
    const [currentFeature, setCurrentFeature] = useState(0);
    const [hoveredBenefit, setHoveredBenefit] = useState(null);
    const [projectSize, setProjectSize] = useState(50); // partidas
    const [timeSaved, setTimeSaved] = useState(0);
    const [costSaved, setCostSaved] = useState(0);

    const features = [
        {
            icon: Bot,
            title: 'Generación Inteligente',
            description: 'Crea presupuestos completos con solo describir tu proyecto en lenguaje natural',
            color: 'from-blue-500 to-cyan-500'
        },
        {
            icon: Calculator,
            title: 'Cálculos Automáticos',
            description: 'La IA calcula cantidades, precios unitarios y totales automáticamente',
            color: 'from-purple-500 to-pink-500'
        },
        {
            icon: TrendingUp,
            title: 'Análisis de Precios',
            description: 'Auditoría inteligente que detecta precios anómalos y sugiere mejoras',
            color: 'from-emerald-500 to-teal-500'
        },
        {
            icon: FileText,
            title: 'Documentos Profesionales',
            description: 'Genera PDFs profesionales con plantillas personalizables',
            color: 'from-amber-500 to-orange-500'
        }
    ];

    // Calcular ahorros en tiempo real
    useEffect(() => {
        // Tiempo tradicional: ~5 min por partida
        // Con IA: ~0.5 min por partida
        const traditionalTime = projectSize * 5;
        const aiTime = projectSize * 0.5;
        const savedMinutes = traditionalTime - aiTime;
        setTimeSaved(savedMinutes);

        // Costo estimado: $500 MXN/hora de trabajo
        const savedHours = savedMinutes / 60;
        const savedCost = savedHours * 500;
        setCostSaved(Math.round(savedCost));
    }, [projectSize]);

    useEffect(() => {
        const interval = setInterval(() => {
            setCurrentFeature((prev) => (prev + 1) % features.length);
        }, 4000);
        return () => clearInterval(interval);
    }, []);

    const benefits = [
        { 
            icon: Zap, 
            text: 'Ahorra tiempo significativamente en la creación de presupuestos',
            detail: 'Reduce el tiempo de creación de presupuestos de horas a minutos con generación automática'
        },
        { 
            icon: Shield, 
            text: 'Precios basados en estándares de la industria y tu catálogo',
            detail: 'La IA aprende de tu catálogo y sugiere precios competitivos basados en datos reales'
        },
        { 
            icon: Cloud, 
            text: 'Todo guardado en la nube, accesible desde cualquier lugar',
            detail: 'Accede a tus presupuestos desde cualquier dispositivo, en cualquier momento'
        },
        { 
            icon: Brain, 
            text: 'IA que aprende de tu catálogo y genera partidas profesionales',
            detail: 'Mejora continua basada en tus proyectos anteriores y preferencias'
        }
    ];

    const comparisonData = [
        {
            aspect: 'Tiempo de creación',
            traditional: '4-8 horas',
            ai: '15-30 minutos',
            icon: Clock,
            improvement: '90% más rápido'
        },
        {
            aspect: 'Costo por presupuesto',
            traditional: '$2,000 - $4,000 MXN',
            ai: '$299 MXN/mes ilimitado',
            icon: DollarSign,
            improvement: '85% de ahorro'
        },
        {
            aspect: 'Precisión de cálculos',
            traditional: 'Propensa a errores manuales',
            ai: '100% automática y precisa',
            icon: Calculator,
            improvement: 'Sin errores'
        },
        {
            aspect: 'Análisis de precios',
            traditional: 'Manual y subjetivo',
            ai: 'IA detecta anomalías',
            icon: TrendingUp,
            improvement: 'Inteligente'
        }
    ];

    return (
        <>
            {/* SEO Meta Tags */}
            <Helmet>
                <title>PresuGenius - Presupuestos de Construcción con IA | Genera en Minutos</title>
                <meta name="description" content="Crea presupuestos de construcción profesionales en minutos con Inteligencia Artificial. Ahorra 80% de tiempo, genera partidas automáticamente y exporta a PDF. Prueba gratis." />
                <meta name="keywords" content="presupuestos construcción, presupuestos obra, IA construcción, generador presupuestos, APU, análisis precios unitarios, software construcción, presupuestos automáticos" />
                
                {/* Open Graph / Facebook */}
                <meta property="og:type" content="website" />
                <meta property="og:url" content="https://presugenius.com/" />
                <meta property="og:title" content="PresuGenius - Presupuestos de Construcción con IA" />
                <meta property="og:description" content="Genera presupuestos profesionales de construcción en minutos con IA. Ahorra tiempo y dinero." />
                <meta property="og:image" content="https://presugenius.com/og-image.jpg" />

                {/* Twitter */}
                <meta property="twitter:card" content="summary_large_image" />
                <meta property="twitter:url" content="https://presugenius.com/" />
                <meta property="twitter:title" content="PresuGenius - Presupuestos de Construcción con IA" />
                <meta property="twitter:description" content="Genera presupuestos profesionales de construcción en minutos con IA." />
                <meta property="twitter:image" content="https://presugenius.com/twitter-image.jpg" />

                {/* Additional SEO */}
                <meta name="robots" content="index, follow" />
                <meta name="language" content="Spanish" />
                <meta name="author" content="PresuGenius" />
                <link rel="canonical" href="https://presugenius.com/" />
            </Helmet>

            <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 text-white overflow-hidden relative">
                {/* Animated Background Elements */}
                <div className="absolute inset-0 overflow-hidden">
                    <div className="absolute top-20 left-10 w-72 h-72 bg-blue-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob"></div>
                    <div className="absolute top-40 right-10 w-72 h-72 bg-purple-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-2000"></div>
                    <div className="absolute -bottom-8 left-1/2 w-72 h-72 bg-pink-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-4000"></div>
                </div>

                {/* Navigation */}
                <nav className="relative z-10 p-6 flex justify-between items-center">
                    <div className="flex items-center gap-3 cursor-pointer group" onClick={() => navigate('/')}>
                        <div className="bg-blue-600 p-2 rounded-lg shadow-lg group-hover:scale-110 transition-transform">
                            <Hammer className="text-white" size={28} />
                        </div>
                        <div>
                            <h1 className="font-bold text-2xl">PresuGenius</h1>
                            <p className="text-xs text-blue-300">Pro Edition</p>
                        </div>
                    </div>
                    <div className="flex gap-4">
                        <button
                            onClick={() => navigate('/login')}
                            className="px-6 py-2 text-blue-300 hover:text-white transition font-medium hover:scale-105 transform"
                        >
                            Iniciar Sesión
                        </button>
                        <button
                            onClick={() => navigate('/login')}
                            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg font-bold transition shadow-lg shadow-blue-900/50 hover:scale-105 transform"
                        >
                            Comenzar
                        </button>
                    </div>
                </nav>

                {/* Hero Section */}
                <div className="relative z-10 max-w-7xl mx-auto px-6 py-20">
                    <div className="text-center mb-16">
                        <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-500/20 rounded-full border border-blue-400/30 mb-6 hover:bg-blue-500/30 transition cursor-pointer">
                            <Sparkles className="text-blue-300 animate-pulse" size={16} />
                            <span className="text-sm font-medium text-blue-200">Potenciado por Inteligencia Artificial</span>
                        </div>
                        
                        <h1 className="text-6xl md:text-7xl font-bold mb-6 bg-gradient-to-r from-white via-blue-100 to-purple-100 bg-clip-text text-transparent">
                            Presupuestos de Construcción
                            <br />
                            <span className="bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                                en Minutos, no Horas
                            </span>
                        </h1>
                        
                        <p className="text-xl md:text-2xl text-blue-200 mb-8 max-w-3xl mx-auto">
                            Plataforma que usa IA para generar presupuestos profesionales de construcción
                            con velocidad. Genera, edita y ajusta tus presupuestos fácilmente.
                        </p>

                        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                            <button
                                onClick={() => navigate('/login')}
                                className="group px-8 py-4 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 rounded-xl font-bold text-lg shadow-2xl shadow-blue-900/50 transition-all transform hover:scale-105 flex items-center gap-2"
                            >
                                Comenzar Gratis
                                <ArrowRight className="group-hover:translate-x-1 transition-transform" size={20} />
                            </button>
                            <button
                                onClick={() => navigate('/demo')}
                                className="px-8 py-4 bg-white/10 hover:bg-white/20 backdrop-blur-sm rounded-xl font-bold text-lg border border-white/20 transition hover:scale-105 transform"
                            >
                                Ver Demo
                            </button>
                        </div>
                    </div>

                    {/* Interactive Savings Calculator */}
                    <div className="mt-16 mb-20 bg-gradient-to-br from-blue-600/10 to-purple-600/10 backdrop-blur-sm rounded-3xl p-8 border border-white/10">
                        <h3 className="text-2xl font-bold text-center mb-6">
                            <Calculator className="inline mr-2" size={24} />
                            Calcula tu Ahorro con PresuGenius
                        </h3>
                        <div className="max-w-2xl mx-auto">
                            <div className="mb-6">
                                <label className="block text-blue-200 mb-3 text-center">
                                    Número de partidas en tu presupuesto: <span className="text-white font-bold text-xl">{projectSize}</span>
                                </label>
                                <input
                                    type="range"
                                    min="10"
                                    max="200"
                                    value={projectSize}
                                    onChange={(e) => setProjectSize(parseInt(e.target.value))}
                                    className="w-full h-2 bg-blue-900/50 rounded-lg appearance-none cursor-pointer accent-blue-500"
                                />
                                <div className="flex justify-between text-xs text-blue-300 mt-1">
                                    <span>10 partidas</span>
                                    <span>200 partidas</span>
                                </div>
                            </div>
                            
                            <div className="grid md:grid-cols-2 gap-4">
                                <div className="bg-white/5 rounded-xl p-6 border border-white/10 hover:bg-white/10 transition">
                                    <Clock className="text-blue-400 mb-2" size={32} />
                                    <div className="text-3xl font-bold text-white mb-1">
                                        {Math.floor(timeSaved / 60)}h {Math.round(timeSaved % 60)}min
                                    </div>
                                    <div className="text-blue-200 text-sm">Tiempo ahorrado</div>
                                </div>
                                <div className="bg-white/5 rounded-xl p-6 border border-white/10 hover:bg-white/10 transition">
                                    <DollarSign className="text-emerald-400 mb-2" size={32} />
                                    <div className="text-3xl font-bold text-white mb-1">
                                        ${costSaved.toLocaleString()} MXN
                                    </div>
                                    <div className="text-blue-200 text-sm">Ahorro estimado</div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Comparison Section: Traditional vs AI */}
                    <div className="mt-20 mb-16">
                        <h2 className="text-4xl font-bold text-center mb-4">
                            Método Tradicional vs PresuGenius IA
                        </h2>
                        <p className="text-center text-blue-200 mb-12 max-w-2xl mx-auto">
                            Descubre cómo la inteligencia artificial revoluciona la creación de presupuestos
                        </p>
                        
                        <div className="grid gap-4 max-w-5xl mx-auto">
                            {comparisonData.map((item, index) => {
                                const Icon = item.icon;
                                return (
                                    <div
                                        key={index}
                                        className="bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 overflow-hidden hover:bg-white/10 transition-all group"
                                    >
                                        <div className="grid md:grid-cols-3 gap-4 p-6">
                                            {/* Aspecto */}
                                            <div className="flex items-center gap-3">
                                                <div className="bg-gradient-to-r from-blue-500 to-purple-500 rounded-lg p-3 group-hover:scale-110 transition-transform">
                                                    <Icon size={24} />
                                                </div>
                                                <div>
                                                    <div className="font-bold text-white">{item.aspect}</div>
                                                    <div className="text-xs text-emerald-400 font-medium">{item.improvement}</div>
                                                </div>
                                            </div>
                                            
                                            {/* Método Tradicional */}
                                            <div className="flex items-center gap-3 bg-red-500/10 rounded-lg p-4 border border-red-500/20">
                                                <X className="text-red-400 flex-shrink-0" size={20} />
                                                <div>
                                                    <div className="text-xs text-red-300 mb-1">Tradicional</div>
                                                    <div className="text-sm text-white font-medium">{item.traditional}</div>
                                                </div>
                                            </div>
                                            
                                            {/* Con IA */}
                                            <div className="flex items-center gap-3 bg-emerald-500/10 rounded-lg p-4 border border-emerald-500/20">
                                                <Check className="text-emerald-400 flex-shrink-0" size={20} />
                                                <div>
                                                    <div className="text-xs text-emerald-300 mb-1">Con PresuGenius IA</div>
                                                    <div className="text-sm text-white font-medium">{item.ai}</div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        {/* Summary Card */}
                        <div className="mt-8 bg-gradient-to-r from-emerald-600/20 to-teal-600/20 backdrop-blur-sm rounded-2xl p-8 border border-emerald-500/30 max-w-3xl mx-auto">
                            <div className="flex items-start gap-4">
                                <AlertCircle className="text-emerald-400 flex-shrink-0" size={32} />
                                <div>
                                    <h3 className="text-xl font-bold text-white mb-2">
                                        Resultado: Ahorra hasta 90% de tiempo y 85% de costos
                                    </h3>
                                    <p className="text-emerald-200">
                                        Con PresuGenius, lo que antes tomaba horas ahora toma minutos. 
                                        La IA hace el trabajo pesado mientras tú te enfocas en lo importante: tu proyecto.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Feature Showcase */}
                    <div className="mt-20 mb-16">
                        <div className="grid md:grid-cols-2 gap-8 items-center">
                            <div className="space-y-6">
                                <h2 className="text-4xl font-bold mb-6">
                                    ¿Cómo funciona?
                                </h2>
                                <div className="space-y-4">
                                    {features.map((feature, index) => {
                                        const Icon = feature.icon;
                                        const isActive = index === currentFeature;
                                        return (
                                            <div
                                                key={index}
                                                onClick={() => setCurrentFeature(index)}
                                                className={`p-6 rounded-xl border transition-all duration-500 cursor-pointer ${
                                                    isActive
                                                        ? 'bg-gradient-to-r ' + feature.color + ' border-transparent scale-105 shadow-2xl'
                                                        : 'bg-white/5 border-white/10 hover:bg-white/10 hover:scale-102'
                                                }`}
                                            >
                                                <div className="flex items-start gap-4">
                                                    <div className={`p-3 rounded-lg transition-transform ${
                                                        isActive ? 'bg-white/20 scale-110' : 'bg-white/10'
                                                    }`}>
                                                        <Icon size={24} className={isActive ? 'text-white' : 'text-blue-300'} />
                                                    </div>
                                                    <div className="flex-1">
                                                        <h3 className={`font-bold text-lg mb-2 ${
                                                            isActive ? 'text-white' : 'text-blue-200'
                                                        }`}>
                                                            {feature.title}
                                                        </h3>
                                                        <p className={`text-sm ${
                                                            isActive ? 'text-white/90' : 'text-blue-300/70'
                                                        }`}>
                                                            {feature.description}
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            <div className="relative">
                                <div className="bg-gradient-to-br from-blue-600/20 to-purple-600/20 rounded-3xl p-8 backdrop-blur-sm border border-white/10 hover:border-white/20 transition">
                                    <div className="bg-slate-900/50 rounded-2xl p-6 space-y-4">
                                        <div className="flex items-center gap-3 mb-4">
                                            <div className="w-3 h-3 rounded-full bg-red-500 hover:scale-125 transition-transform cursor-pointer"></div>
                                            <div className="w-3 h-3 rounded-full bg-yellow-500 hover:scale-125 transition-transform cursor-pointer"></div>
                                            <div className="w-3 h-3 rounded-full bg-green-500 hover:scale-125 transition-transform cursor-pointer"></div>
                                            <span className="ml-4 text-sm text-blue-300">Editor de Presupuestos</span>
                                        </div>
                                        
                                        <div className="space-y-3">
                                            <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700 hover:border-blue-500/50 transition">
                                                <div className="flex items-center gap-2 mb-2">
                                                    <Bot className="text-blue-400 animate-pulse" size={16} />
                                                    <span className="text-xs text-blue-300 font-medium">IA Generando...</span>
                                                </div>
                                                <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                                                    <div className="h-full bg-gradient-to-r from-blue-500 to-purple-500 rounded-full animate-pulse" style={{ width: '75%' }}></div>
                                                </div>
                                            </div>
                                            
                                            <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700 hover:border-purple-500/50 transition">
                                                <div className="text-sm text-slate-300 mb-2">Ejemplo de prompt:</div>
                                                <div className="text-xs text-blue-300 italic">
                                                    "Barda perimetral de 20m lineales x 2.5m de alto con cimentación y castillos"
                                                </div>
                                            </div>
                                            
                                            <div className="bg-emerald-500/20 rounded-lg p-4 border border-emerald-500/30 hover:bg-emerald-500/30 transition">
                                                <div className="flex items-center gap-2 text-emerald-300 text-sm font-medium">
                                                    <CheckCircle size={16} className="animate-pulse" />
                                                    <span>5 partidas generadas automáticamente</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                
                                {/* Floating Elements */}
                                <div className="absolute -top-4 -right-4 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full p-4 shadow-2xl animate-bounce hover:scale-110 transition-transform cursor-pointer">
                                    <Rocket size={24} />
                                </div>
                                <div className="absolute -bottom-4 -left-4 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full p-4 shadow-2xl animate-pulse hover:scale-110 transition-transform cursor-pointer">
                                    <Sparkles size={24} />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Benefits Section */}
                    <div className="mt-20 mb-16">
                        <h2 className="text-4xl font-bold text-center mb-12">
                            ¿Por qué PresuGenius?
                        </h2>
                        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
                            {benefits.map((benefit, index) => {
                                const Icon = benefit.icon;
                                const isHovered = hoveredBenefit === index;
                                return (
                                    <div
                                        key={index}
                                        onMouseEnter={() => setHoveredBenefit(index)}
                                        onMouseLeave={() => setHoveredBenefit(null)}
                                        className="bg-white/5 backdrop-blur-sm rounded-xl p-6 border border-white/10 hover:bg-white/10 transition-all group cursor-pointer transform hover:scale-105"
                                    >
                                        <div className="bg-gradient-to-r from-blue-500 to-purple-500 rounded-lg p-3 w-fit mb-4 group-hover:scale-110 transition-transform">
                                            <Icon size={24} />
                                        </div>
                                        <p className="text-blue-200 font-medium mb-2">{benefit.text}</p>
                                        {isHovered && (
                                            <p className="text-sm text-blue-300/70 animate-fadeIn">
                                                {benefit.detail}
                                            </p>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Stats Section */}
                    <div className="mt-20 mb-16 bg-white/5 backdrop-blur-sm rounded-3xl p-12 border border-white/10 hover:border-white/20 transition">
                        <div className="grid md:grid-cols-3 gap-8 text-center">
                            <div className="group cursor-pointer">
                                <div className="text-5xl font-bold bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent mb-2 group-hover:scale-110 transition-transform">
                                    80%
                                </div>
                                <p className="text-blue-200">Ahorro de tiempo</p>
                            </div>
                            <div className="group cursor-pointer">
                                <div className="text-5xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent mb-2 group-hover:scale-110 transition-transform">
                                    1000+
                                </div>
                                <p className="text-blue-200">Presupuestos generados</p>
                            </div>
                            <div className="group cursor-pointer">
                                <div className="text-5xl font-bold bg-gradient-to-r from-emerald-400 to-teal-400 bg-clip-text text-transparent mb-2 group-hover:scale-110 transition-transform">
                                    100%
                                </div>
                                <p className="text-blue-200">Editable y revisable</p>
                            </div>
                        </div>
                    </div>

                    {/* CTA Section */}
                    <div className="mt-20 text-center">
                        <h2 className="text-4xl font-bold mb-6">
                            ¿Listo para revolucionar tus presupuestos?
                        </h2>
                        <p className="text-xl text-blue-200 mb-8 max-w-2xl mx-auto">
                            Únete a profesionales que están usando IA para crear presupuestos más rápido. Genera, revisa y ajusta según tus necesidades.
                        </p>
                        <button
                            onClick={() => navigate('/login')}
                            className="group px-10 py-5 bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 hover:from-blue-700 hover:via-purple-700 hover:to-pink-700 rounded-xl font-bold text-xl shadow-2xl shadow-purple-900/50 transition-all transform hover:scale-105 flex items-center gap-3 mx-auto"
                        >
                            <Rocket size={24} />
                            Comenzar Ahora
                            <ArrowRight className="group-hover:translate-x-2 transition-transform" size={24} />
                        </button>
                    </div>
                </div>

                {/* Footer */}
                <footer className="relative z-10 border-t border-white/10 mt-20 py-8">
                    <div className="max-w-7xl mx-auto px-6 text-center text-blue-300 text-sm">
                        <p>© 2025 PresuGenius Pro. Todos los derechos reservados.</p>
                    </div>
                </footer>

                {/* CSS Animations */}
                <style>{`
                    @keyframes blob {
                        0%, 100% {
                            transform: translate(0, 0) scale(1);
                        }
                        33% {
                            transform: translate(30px, -50px) scale(1.1);
                        }
                        66% {
                            transform: translate(-20px, 20px) scale(0.9);
                        }
                    }
                    .animate-blob {
                        animation: blob 7s infinite;
                    }
                    .animation-delay-2000 {
                        animation-delay: 2s;
                    }
                    .animation-delay-4000 {
                        animation-delay: 4s;
                    }
                    @keyframes fadeIn {
                        from {
                            opacity: 0;
                            transform: translateY(-10px);
                        }
                        to {
                            opacity: 1;
                            transform: translateY(0);
                        }
                    }
                    .animate-fadeIn {
                        animation: fadeIn 0.3s ease-out;
                    }
                    .hover\:scale-102:hover {
                        transform: scale(1.02);
                    }
                `}</style>
            </div>
        </>
    );
};

export default LandingPage;

