import React from 'react';
import { X, Info, TrendingUp, DollarSign, Receipt } from 'lucide-react';

const CostConceptsModal = ({ isOpen, onClose, concept }) => {
    if (!isOpen) return null;

    const concepts = {
        indirectos: {
            title: 'Costos Indirectos',
            icon: <TrendingUp size={24} className="text-blue-500" />,
            description: 'Los costos indirectos son gastos que no están directamente relacionados con una partida específica, pero son necesarios para ejecutar el proyecto.',
            items: [
                {
                    title: '¿Qué incluyen?',
                    examples: [
                        'Gastos administrativos y de oficina',
                        'Supervisión de obra y personal técnico',
                        'Herramientas menores y equipos compartidos',
                        'Servicios generales (agua, luz, teléfono)',
                        'Seguros y permisos',
                        'Mantenimiento de equipo',
                        'Transporte y viáticos'
                    ]
                },
                {
                    title: '¿Cuándo aplicarlos?',
                    examples: [
                        'Siempre que tengas gastos administrativos o de supervisión',
                        'En proyectos grandes o medianos (típicamente 8-15%)',
                        'Cuando requieras equipo compartido entre varias partidas',
                        'Para cubrir gastos generales no asignables directamente'
                    ]
                },
                {
                    title: 'Rangos típicos:',
                    examples: [
                        'Proyectos pequeños: 5-10%',
                        'Proyectos medianos: 8-12%',
                        'Proyectos grandes: 10-15%',
                        'Obras públicas: 12-18%'
                    ]
                }
            ]
        },
        utilidad: {
            title: 'Utilidad o Ganancia',
            icon: <DollarSign size={24} className="text-emerald-500" />,
            description: 'La utilidad es el margen de ganancia que esperas obtener del proyecto después de cubrir todos los costos directos e indirectos.',
            items: [
                {
                    title: '¿Qué representa?',
                    examples: [
                        'Tu ganancia neta después de todos los costos',
                        'Retorno sobre la inversión en tiempo y recursos',
                        'Respaldo económico para imprevistos',
                        'Crecimiento y reinversión del negocio'
                    ]
                },
                {
                    title: '¿Cuándo aplicarla?',
                    examples: [
                        'En todos los proyectos comerciales',
                        'Para proyectos privados (típicamente 8-15%)',
                        'Para proyectos públicos (típicamente 5-10%)',
                        'Cuando buscas generar ingresos sostenibles'
                    ]
                },
                {
                    title: 'Rangos recomendados:',
                    examples: [
                        'Proyectos de mantenimiento: 8-12%',
                        'Proyectos nuevos: 10-15%',
                        'Proyectos públicos: 5-10%',
                        'Proyectos de alto riesgo: 15-20%'
                    ]
                }
            ]
        },
        iva: {
            title: 'IVA (Impuesto al Valor Agregado)',
            icon: <Receipt size={24} className="text-purple-500" />,
            description: 'El IVA es un impuesto que se aplica sobre el valor de los bienes y servicios. En México, la tasa general es del 16%.',
            items: [
                {
                    title: '¿Qué es?',
                    examples: [
                        'Impuesto al consumo que se cobra al cliente final',
                        'En México la tasa general es del 16%',
                        'Algunos productos y servicios tienen tasa del 0% o 8%',
                        'Se calcula sobre el subtotal más indirectos y utilidad'
                    ]
                },
                {
                    title: '¿Cuándo aplicarlo?',
                    examples: [
                        'Siempre que factures a un cliente final',
                        'Cuando trabajas como persona física o moral',
                        'En proyectos comerciales y de construcción',
                        'Si tu cliente puede deducir el IVA'
                    ]
                },
                {
                    title: 'Tasas en México:',
                    examples: [
                        'Tasa general: 16% (la más común)',
                        'Tasa reducida: 8% (frontera norte)',
                        'Tasa cero: 0% (algunos productos y servicios)',
                        'Exento: No aplica IVA'
                    ]
                },
                {
                    title: 'Importante:',
                    examples: [
                        'El IVA se suma al precio final del presupuesto',
                        'Debe estar claramente desglosado en tu factura',
                        'Consulta con tu contador para tu situación específica',
                        'Algunos clientes públicos requieren 0% IVA'
                    ]
                }
            ]
        }
    };

    const conceptData = concepts[concept];

    if (!conceptData) return null;

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fadeIn" onClick={onClose}>
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col animate-slideUp" onClick={(e) => e.stopPropagation()}>
                {/* Header */}
                <div className="p-6 border-b border-slate-200 dark:border-slate-700 flex justify-between items-start bg-slate-50 dark:bg-slate-800 rounded-t-xl">
                    <div className="flex items-center gap-3">
                        {conceptData.icon}
                        <div>
                            <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100">{conceptData.title}</h2>
                            <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">{conceptData.description}</p>
                        </div>
                    </div>
                    <button 
                        onClick={onClose} 
                        className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full text-slate-500 dark:text-slate-400 transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6">
                    <div className="space-y-6">
                        {conceptData.items.map((item, index) => (
                            <div key={index} className="bg-slate-50 dark:bg-slate-700/50 rounded-lg p-5 border border-slate-200 dark:border-slate-600">
                                <h3 className="font-bold text-lg text-slate-800 dark:text-slate-100 mb-3 flex items-center gap-2">
                                    <Info size={18} className="text-indigo-500" />
                                    {item.title}
                                </h3>
                                <ul className="space-y-2">
                                    {item.examples.map((example, exIndex) => (
                                        <li key={exIndex} className="flex items-start gap-2 text-slate-700 dark:text-slate-300">
                                            <span className="text-indigo-500 dark:text-indigo-400 mt-1">•</span>
                                            <span>{example}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        ))}
                    </div>

                    {/* Footer Tip */}
                    <div className="mt-6 p-4 bg-indigo-50 dark:bg-indigo-900/30 rounded-lg border border-indigo-200 dark:border-indigo-800">
                        <p className="text-sm text-indigo-800 dark:text-indigo-300 flex items-start gap-2">
                            <Info size={16} className="mt-0.5 flex-shrink-0" />
                            <span>
                                <strong>Tip:</strong> Estos porcentajes son guías generales. Ajusta según tu experiencia, tipo de proyecto, ubicación y condiciones del mercado. Consulta con un profesional contable o constructor para casos específicos.
                            </span>
                        </p>
                    </div>
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 rounded-b-xl">
                    <button
                        onClick={onClose}
                        className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-3 rounded-lg font-bold transition-colors"
                    >
                        Entendido
                    </button>
                </div>
            </div>
        </div>
    );
};

export default CostConceptsModal;

