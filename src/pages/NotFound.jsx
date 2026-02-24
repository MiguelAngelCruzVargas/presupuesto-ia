import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Home, ArrowLeft, AlertTriangle } from 'lucide-react';
import Card from '../components/ui/Card';

const NotFound = () => {
    const navigate = useNavigate();
    const location = useLocation();

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 p-4">
            <Card className="max-w-2xl w-full text-center">
                <div className="py-12 px-6">
                    {/* Icono de error */}
                    <div className="inline-flex items-center justify-center w-24 h-24 bg-red-100 dark:bg-red-900/20 rounded-full mb-6">
                        <AlertTriangle size={48} className="text-red-600 dark:text-red-400" />
                    </div>

                    {/* Título */}
                    <h1 className="text-6xl font-bold text-slate-800 dark:text-slate-100 mb-4">
                        404
                    </h1>
                    <h2 className="text-2xl font-bold text-slate-700 dark:text-slate-200 mb-4">
                        Página no encontrada
                    </h2>
                    
                    {/* Mensaje */}
                    <p className="text-slate-600 dark:text-slate-400 mb-8 max-w-md mx-auto">
                        La ruta <code className="bg-slate-200 dark:bg-slate-700 px-2 py-1 rounded text-sm font-mono">{location.pathname}</code> no existe en esta aplicación.
                    </p>

                    {/* Botones de acción */}
                    <div className="flex flex-col sm:flex-row gap-4 justify-center">
                        <button
                            onClick={() => navigate('/')}
                            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-all flex items-center justify-center gap-2 shadow-lg hover:shadow-xl transform hover:scale-105"
                        >
                            <Home size={20} />
                            Ir al Inicio
                        </button>
                        <button
                            onClick={() => navigate(-1)}
                            className="px-6 py-3 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 rounded-lg font-medium transition-all flex items-center justify-center gap-2"
                        >
                            <ArrowLeft size={20} />
                            Volver Atrás
                        </button>
                    </div>

                    {/* Rutas disponibles (solo en desarrollo) */}
                    {import.meta.env.DEV && (
                        <div className="mt-8 pt-8 border-t border-slate-200 dark:border-slate-700">
                            <p className="text-xs text-slate-500 dark:text-slate-400 mb-2">Rutas disponibles (solo desarrollo):</p>
                            <div className="flex flex-wrap gap-2 justify-center text-xs">
                                <span className="bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded">/</span>
                                <span className="bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded">/demo</span>
                                <span className="bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded">/login</span>
                                <span className="bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded">/dashboard</span>
                                <span className="bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded">/editor</span>
                                <span className="bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded">/catalog</span>
                                <span className="bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded">/templates</span>
                                <span className="bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded">/history</span>
                            </div>
                        </div>
                    )}
                </div>
            </Card>
        </div>
    );
};

export default NotFound;

