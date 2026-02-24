import React from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';
import { captureException } from '../lib/sentry';

/**
 * Error Boundary para capturar errores de React
 * Envía errores a Sentry automáticamente
 */
class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { 
            hasError: false, 
            error: null,
            errorInfo: null 
        };
    }

    static getDerivedStateFromError(error) {
        // Actualizar state para mostrar UI de error
        return { hasError: true };
    }

    componentDidCatch(error, errorInfo) {
        // Guardar información del error
        this.setState({
            error,
            errorInfo
        });

        // Enviar a Sentry
        captureException(error, {
            componentStack: errorInfo.componentStack,
            source: 'React Error Boundary',
            errorBoundary: true,
        }, 'error');

        // Log en consola para desarrollo
        console.error('Error capturado por ErrorBoundary:', error, errorInfo);
    }

    handleReset = () => {
        this.setState({ 
            hasError: false, 
            error: null, 
            errorInfo: null 
        });
        // Recargar la página para asegurar estado limpio
        window.location.reload();
    };

    handleGoHome = () => {
        window.location.href = '/';
    };

    render() {
        if (this.state.hasError) {
            // UI de error personalizada
            return (
                <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center p-4">
                    <div className="max-w-md w-full bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700 p-8 text-center">
                        <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-red-100 dark:bg-red-900/20 mb-4">
                            <AlertTriangle className="h-8 w-8 text-red-600 dark:text-red-400" />
                        </div>
                        
                        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-2">
                            Algo salió mal
                        </h1>
                        
                        <p className="text-slate-600 dark:text-slate-400 mb-6">
                            Ocurrió un error inesperado. Hemos sido notificados y estamos trabajando en solucionarlo.
                        </p>

                        {process.env.NODE_ENV === 'development' && this.state.error && (
                            <details className="mb-6 text-left">
                                <summary className="cursor-pointer text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                                    Detalles del error (solo desarrollo)
                                </summary>
                                <div className="bg-slate-50 dark:bg-slate-900 rounded-lg p-4 text-xs font-mono text-slate-800 dark:text-slate-200 overflow-auto max-h-48">
                                    <div className="mb-2">
                                        <strong>Error:</strong> {this.state.error.toString()}
                                    </div>
                                    {this.state.errorInfo && (
                                        <div>
                                            <strong>Stack:</strong>
                                            <pre className="whitespace-pre-wrap mt-1">
                                                {this.state.errorInfo.componentStack}
                                            </pre>
                                        </div>
                                    )}
                                </div>
                            </details>
                        )}

                        <div className="flex gap-3 justify-center">
                            <button
                                onClick={this.handleReset}
                                className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition"
                            >
                                <RefreshCw size={18} />
                                Recargar
                            </button>
                            
                            <button
                                onClick={this.handleGoHome}
                                className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300 rounded-lg font-medium transition"
                            >
                                <Home size={18} />
                                Ir al Inicio
                            </button>
                        </div>

                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-6">
                            Si el problema persiste, por favor contacta a soporte.
                        </p>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;

