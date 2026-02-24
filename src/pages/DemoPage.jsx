import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, AlertCircle, Sparkles, Rocket } from 'lucide-react';
import Editor from './Editor';
import { useProject } from '../context/ProjectContext';
import { generateId } from '../utils/helpers';

const DemoPage = () => {
    const navigate = useNavigate();
    const { setProjectInfo, setItems, showToast } = useProject();
    const [showWelcome, setShowWelcome] = useState(true);

    // Datos de ejemplo para la demo
    const demoData = {
        projectInfo: {
            id: 'demo-' + generateId(),
            project: 'Barda Perimetral - Demo',
            client: 'Cliente Ejemplo',
            location: 'Ciudad de México',
            type: 'Obra Civil',
            taxRate: 16,
            currency: 'MXN',
            indirect_percentage: 8,
            profit_percentage: 10,
            date: new Date().toISOString().split('T')[0]
        },
        items: [
            {
                id: generateId(),
                description: 'Trazo y nivelación de barda perimetral, con equipo topográfico simple y referencias. Incluye material menor.',
                unit: 'm',
                quantity: 20,
                unitPrice: 25.00,
                category: 'Mano de Obra',
                calculation_basis: 'Cálculo: 20m lineales. Precio basado en estándar Neodata para trazo y nivelación.'
            },
            {
                id: generateId(),
                description: 'Excavación en cepa a cielo abierto en material tipo II, hasta 0.80m de profundidad, para cimentación.',
                unit: 'm3',
                quantity: 6.4,
                unitPrice: 280.00,
                category: 'Obra Civil',
                calculation_basis: 'Cálculo: 20m × 0.40m × 0.80m = 6.4 m³. Precio basado en estándar CAPECO para excavación tipo II.'
            },
            {
                id: generateId(),
                description: 'Cimentación de mampostería de piedra braza, asentada con mortero cemento-arena 1:5. Incluye suministro de piedra y mortero.',
                unit: 'm3',
                quantity: 6.4,
                unitPrice: 2200.00,
                category: 'Obra Civil',
                calculation_basis: 'Cálculo: Mismo volumen de excavación. Precio basado en estándar Neodata para cimentación de piedra braza.'
            },
            {
                id: generateId(),
                description: 'Suministro y colado de Dala de Desplante (15x20cm) de concreto f\'c=200 kg/cm², incluye acero de refuerzo (4 varillas 3/8, estribos) y cimbra común.',
                unit: 'm3',
                quantity: 0.6,
                unitPrice: 4500.00,
                category: 'Obra Civil',
                calculation_basis: 'Cálculo: 20m × 0.15m × 0.20m = 0.6 m³. Precio incluye concreto, acero y cimbra según estándar CMIC.'
            },
            {
                id: generateId(),
                description: 'Habilitado, armado y colado de Castillos K-1 (15x20cm) de concreto f\'c=200 kg/cm², incluye acero de refuerzo y cimbra común.',
                unit: 'm',
                quantity: 20,
                unitPrice: 450.00,
                category: 'Obra Civil',
                calculation_basis: 'Cálculo: 20m lineales. Precio por metro lineal incluye concreto, acero y cimbra según estándar Neodata.'
            }
        ]
    };

    useEffect(() => {
        // Cargar datos de demo
        setProjectInfo(demoData.projectInfo);
        setItems(demoData.items);
        showToast('Modo Demo activado - Explora todas las funcionalidades', 'info');
    }, []);

    if (showWelcome) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 text-white flex items-center justify-center p-3 sm:p-4 md:p-6 relative overflow-hidden">
                {/* Animated Background */}
                <div className="absolute inset-0 overflow-hidden">
                    <div className="absolute top-10 sm:top-20 left-5 sm:left-10 w-48 sm:w-72 h-48 sm:h-72 bg-blue-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob"></div>
                    <div className="absolute top-20 sm:top-40 right-5 sm:right-10 w-48 sm:w-72 h-48 sm:h-72 bg-purple-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-2000"></div>
                    <div className="absolute bottom-10 left-1/2 w-32 sm:w-48 h-32 sm:h-48 bg-amber-500 rounded-full mix-blend-multiply filter blur-xl opacity-10 animate-blob animation-delay-4000"></div>
                </div>

                <div className="relative z-10 max-w-2xl w-full">
                    <div className="bg-white/10 backdrop-blur-lg rounded-2xl sm:rounded-3xl p-6 sm:p-8 md:p-12 border border-white/20 shadow-2xl">
                        <div className="text-center mb-6 sm:mb-8">
                            <div className="inline-flex items-center justify-center w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full mb-4 sm:mb-6 shadow-lg animate-pulse">
                                <Rocket className="w-8 h-8 sm:w-10 sm:h-10" />
                            </div>
                            <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-3 sm:mb-4 bg-gradient-to-r from-white to-blue-200 bg-clip-text text-transparent px-2">
                                Bienvenido a la Demo
                            </h1>
                            <p className="text-base sm:text-lg md:text-xl text-blue-200 mb-4 sm:mb-6 px-2">
                                Explora PresuGenius con datos de ejemplo
                            </p>
                        </div>

                        <div className="space-y-3 sm:space-y-4 mb-6 sm:mb-8">
                            <div className="bg-white/5 rounded-xl p-3 sm:p-4 border border-white/10">
                                <div className="flex items-start gap-2 sm:gap-3">
                                    <div className="flex-shrink-0 mt-0.5 sm:mt-1">
                                        <Sparkles className="text-blue-400 sm:w-5 sm:h-5" size={18} />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h3 className="font-bold text-base sm:text-lg mb-2 sm:mb-3">¿Qué puedes hacer en la demo?</h3>
                                        <ul className="space-y-1.5 sm:space-y-2 text-blue-200 text-xs sm:text-sm">
                                            <li className="flex items-start gap-2">
                                                <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-blue-400 rounded-full mt-1.5 sm:mt-2 flex-shrink-0"></span>
                                                <span>Ver un presupuesto completo pre-cargado</span>
                                            </li>
                                            <li className="flex items-start gap-2">
                                                <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-blue-400 rounded-full mt-1.5 sm:mt-2 flex-shrink-0"></span>
                                                <span>Probar la generación con IA (funcionalidad limitada)</span>
                                            </li>
                                            <li className="flex items-start gap-2">
                                                <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-blue-400 rounded-full mt-1.5 sm:mt-2 flex-shrink-0"></span>
                                                <span>Explorar todas las funciones del editor</span>
                                            </li>
                                            <li className="flex items-start gap-2">
                                                <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-blue-400 rounded-full mt-1.5 sm:mt-2 flex-shrink-0"></span>
                                                <span>Ver cómo se calculan los totales automáticamente</span>
                                            </li>
                                            <li className="flex items-start gap-2">
                                                <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-blue-400 rounded-full mt-1.5 sm:mt-2 flex-shrink-0"></span>
                                                <span>Generar PDFs de ejemplo</span>
                                            </li>
                                        </ul>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-amber-500/20 rounded-xl p-3 sm:p-4 border border-amber-500/30">
                                <div className="flex items-start gap-2 sm:gap-3">
                                    <div className="flex-shrink-0 mt-0.5 sm:mt-1">
                                        <AlertCircle className="text-amber-400 sm:w-5 sm:h-5" size={18} />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h3 className="font-bold text-amber-300 text-sm sm:text-base mb-1 sm:mb-2">Nota importante</h3>
                                        <p className="text-xs sm:text-sm text-amber-200 leading-relaxed">
                                            Esta es una versión de demostración. Los cambios no se guardarán permanentemente. 
                                            Para guardar tus proyectos, <span className="font-bold">crea una cuenta gratuita</span>.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                            <button
                                onClick={() => setShowWelcome(false)}
                                className="flex-1 px-6 sm:px-8 py-3 sm:py-4 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 rounded-xl font-bold text-base sm:text-lg shadow-2xl shadow-blue-900/50 transition-all transform hover:scale-105 active:scale-95 flex items-center justify-center gap-2"
                            >
                                <Sparkles size={18} className="sm:w-5 sm:h-5" />
                                <span>Comenzar Demo</span>
                            </button>
                            <button
                                onClick={() => navigate('/login')}
                                className="flex-1 px-6 sm:px-8 py-3 sm:py-4 bg-white/10 hover:bg-white/20 backdrop-blur-sm rounded-xl font-bold text-base sm:text-lg border border-white/20 transition-all hover:scale-105 active:scale-95"
                            >
                                Crear Cuenta
                            </button>
                        </div>
                    </div>
                </div>

                <style>{`
                    @keyframes blob {
                        0%, 100% { transform: translate(0, 0) scale(1); }
                        33% { transform: translate(30px, -50px) scale(1.1); }
                        66% { transform: translate(-20px, 20px) scale(0.9); }
                    }
                    .animate-blob { animation: blob 7s infinite ease-in-out; }
                    .animation-delay-2000 { animation-delay: 2s; }
                    .animation-delay-4000 { animation-delay: 4s; }
                    
                    @media (max-width: 640px) {
                        .animate-blob {
                            animation-duration: 10s;
                        }
                    }
                `}</style>
            </div>
        );
    }

    return (
        <div className="relative min-h-screen">
            {/* Demo Banner - Mejorado y Responsive */}
            <div className="fixed top-0 left-0 right-0 z-50 bg-gradient-to-r from-amber-500 via-orange-500 to-amber-500 text-white shadow-2xl border-b-2 border-amber-600/30">
                {/* Efecto de brillo animado */}
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-shimmer opacity-50"></div>
                
                <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 py-2.5 sm:py-3 relative z-10">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-4">
                        {/* Contenido Principal */}
                        <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
                            <div className="flex-shrink-0">
                                <div className="bg-white/20 backdrop-blur-sm rounded-lg p-1.5 sm:p-2 shadow-lg">
                                    <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 animate-pulse" />
                                </div>
                            </div>
                            <div className="min-w-0 flex-1">
                                <p className="font-bold text-xs sm:text-sm md:text-base leading-tight">
                                    Modo Demo Activo
                                </p>
                                <p className="text-[10px] sm:text-xs opacity-90 leading-tight mt-0.5 line-clamp-1 sm:line-clamp-none">
                                    Explorando con datos de ejemplo - Los cambios no se guardarán
                                </p>
                            </div>
                        </div>

                        {/* Botones de Acción */}
                        <div className="flex items-center gap-2 sm:gap-3 w-full sm:w-auto justify-end">
                            <button
                                onClick={() => navigate('/login')}
                                className="px-3 sm:px-4 py-1.5 sm:py-2 bg-white/20 hover:bg-white/30 backdrop-blur-sm rounded-lg font-medium text-[11px] sm:text-xs md:text-sm transition-all duration-200 hover:scale-105 active:scale-95 shadow-md hover:shadow-lg whitespace-nowrap border border-white/20"
                            >
                                <span className="hidden sm:inline">Crear Cuenta</span>
                                <span className="sm:hidden">Cuenta</span>
                            </button>
                            <button
                                onClick={() => navigate('/')}
                                className="p-1.5 sm:p-2 hover:bg-white/20 rounded-lg transition-all duration-200 hover:scale-110 active:scale-95 flex-shrink-0"
                                title="Cerrar Demo"
                            >
                                <X className="w-4 h-4 sm:w-5 sm:h-5" />
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Editor con margen superior para el banner */}
            <div className="pt-12 sm:pt-14 md:pt-16">
                <Editor />
            </div>

            {/* Estilos adicionales para animación */}
            <style>{`
                @keyframes shimmer {
                    0% { transform: translateX(-100%); }
                    100% { transform: translateX(100%); }
                }
                .animate-shimmer {
                    animation: shimmer 3s infinite;
                }
            `}</style>
        </div>
    );
};

export default DemoPage;

