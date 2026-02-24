import React, { useState } from 'react';
import { AlertTriangle, Bug, Zap, Code, Database, RefreshCw } from 'lucide-react';
import { ErrorService } from '../../services/ErrorService';

/**
 * Panel de prueba para simular diferentes tipos de errores
 * Útil para verificar que el sistema de manejo de errores funciona correctamente
 */
const ErrorTestPanel = () => {
    const [testResults, setTestResults] = useState([]);

    const addTestResult = (type, success) => {
        setTestResults(prev => [
            {
                id: Date.now(),
                type,
                success,
                timestamp: new Date().toLocaleTimeString()
            },
            ...prev
        ].slice(0, 5));
    };

    // 1. Error de JavaScript puro (no capturado)
    const testJavaScriptError = () => {
        try {
            addTestResult('JavaScript Error', true);
            // Crear un error que será capturado por window.onerror
            setTimeout(() => {
                // Esto será capturado por el handler global
                throw new Error('Error de prueba: JavaScript no capturado');
            }, 100);
        } catch (e) {
            // Este catch no capturará el error del setTimeout
        }
    };

    // 2. Error en una promesa rechazada
    const testPromiseError = () => {
        addTestResult('Promise Error', true);
        Promise.reject(new Error('Error de prueba: Promesa rechazada sin catch'))
            .catch(() => {
                // Ignorar para que sea unhandled
            });
        
        // Crear una promesa realmente sin catch
        setTimeout(() => {
            new Promise((resolve, reject) => {
                reject(new Error('Promesa rechazada no manejada'));
            });
        }, 100);
    };

    // 3. Error capturado manualmente
    const testManualError = () => {
        try {
            addTestResult('Manual Error', true);
            const error = new Error('Error de prueba: Capturado manualmente');
            ErrorService.logError(error, 'ErrorTestPanel.testManualError', {
                test: true,
                usuario: 'Testing'
            });
            alert('✅ Error capturado manualmente. Revisa la consola y el ErrorContext.');
        } catch (e) {
            console.error('Error al probar:', e);
        }
    };

    // 4. Error de validación
    const testValidationError = () => {
        addTestResult('Validation Error', true);
        const error = new Error('Error de validación: El campo nombre es requerido');
        ErrorService.logError(error, 'ErrorTestPanel.testValidationError', {
            field: 'nombre',
            validation: true
        });
        alert('✅ Error de validación capturado. Debería mostrarse un Toast.');
    };

    // 5. Error de red/API
    const testNetworkError = () => {
        addTestResult('Network Error', true);
        const error = new Error('Failed to fetch: NetworkError when attempting to fetch resource');
        ErrorService.logError(error, 'ErrorTestPanel.testNetworkError');
        alert('✅ Error de red simulado. Revisa cómo se maneja.');
    };

    // 6. Error que crashea un componente React
    const testReactError = () => {
        addTestResult('React Error', true);
        // Este error será capturado por ErrorBoundary
        throw new Error('Error de prueba: Esto crasheará el componente React');
    };

    // 7. Error de null/undefined
    const testNullError = () => {
        addTestResult('Null Error', true);
        try {
            const obj = null;
            const result = obj.propiedad.nested; // Esto causará un error
        } catch (error) {
            ErrorService.logError(error, 'ErrorTestPanel.testNullError');
            alert('✅ Error de null/undefined capturado.');
        }
    };

    const clearResults = () => {
        setTestResults([]);
    };

    const testButtons = [
        {
            name: 'Error JavaScript',
            icon: <Code size={18} />,
            color: 'bg-red-600 hover:bg-red-700',
            onClick: testJavaScriptError,
            description: 'Error de JS no capturado (se captura automáticamente)'
        },
        {
            name: 'Error de Promesa',
            icon: <Zap size={18} />,
            color: 'bg-orange-600 hover:bg-orange-700',
            onClick: testPromiseError,
            description: 'Promesa rechazada sin catch (unhandledrejection)'
        },
        {
            name: 'Error Manual',
            icon: <Bug size={18} />,
            color: 'bg-blue-600 hover:bg-blue-700',
            onClick: testManualError,
            description: 'Error capturado con ErrorService.logError()'
        },
        {
            name: 'Error Validación',
            icon: <AlertTriangle size={18} />,
            color: 'bg-amber-600 hover:bg-amber-700',
            onClick: testValidationError,
            description: 'Error de validación con contexto'
        },
        {
            name: 'Error de Red',
            icon: <Database size={18} />,
            color: 'bg-purple-600 hover:bg-purple-700',
            onClick: testNetworkError,
            description: 'Error de conexión/red simulado'
        },
        {
            name: 'Error Null',
            icon: <AlertTriangle size={18} />,
            color: 'bg-pink-600 hover:bg-pink-700',
            onClick: testNullError,
            description: 'Error por null/undefined'
        },
        {
            name: 'Error React (⚠️)',
            icon: <AlertTriangle size={18} />,
            color: 'bg-red-700 hover:bg-red-800',
            onClick: testReactError,
            description: 'Crashea el componente (ErrorBoundary lo captura)'
        }
    ];

    return (
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700 p-6 space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                        <Bug className="text-blue-600" size={24} />
                        Panel de Prueba de Errores
                    </h2>
                    <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                        Prueba diferentes tipos de errores para verificar el sistema de manejo
                    </p>
                </div>
                {testResults.length > 0 && (
                    <button
                        onClick={clearResults}
                        className="flex items-center gap-2 px-3 py-2 text-sm bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 rounded-lg transition"
                    >
                        <RefreshCw size={16} />
                        Limpiar
                    </button>
                )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {testButtons.map((btn, index) => (
                    <button
                        key={index}
                        onClick={btn.onClick}
                        className={`${btn.color} text-white p-4 rounded-lg shadow-md hover:shadow-lg transition-all transform hover:scale-105 active:scale-95 flex flex-col items-center gap-2`}
                        title={btn.description}
                    >
                        <div className="flex items-center gap-2">
                            {btn.icon}
                            <span className="font-semibold text-sm">{btn.name}</span>
                        </div>
                        <span className="text-xs opacity-90 text-center">{btn.description}</span>
                    </button>
                ))}
            </div>

            {testResults.length > 0 && (
                <div className="border-t border-slate-200 dark:border-slate-700 pt-4">
                    <h3 className="font-semibold text-slate-700 dark:text-slate-300 mb-2">
                        Resultados de pruebas:
                    </h3>
                    <div className="space-y-2">
                        {testResults.map((result) => (
                            <div
                                key={result.id}
                                className="flex items-center justify-between p-2 bg-slate-50 dark:bg-slate-900 rounded-lg text-sm"
                            >
                                <span className="text-slate-700 dark:text-slate-300">
                                    {result.type}
                                </span>
                                <div className="flex items-center gap-2">
                                    <span className="text-xs text-slate-500">
                                        {result.timestamp}
                                    </span>
                                    {result.success && (
                                        <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                <h3 className="font-semibold text-blue-900 dark:text-blue-200 mb-2">
                    💡 Cómo verificar los errores:
                </h3>
                <ul className="text-sm text-blue-800 dark:text-blue-300 space-y-1 list-disc list-inside">
                    <li>Abre la consola del navegador (F12) para ver los logs</li>
                    <li>Revisa ErrorContext: <code className="bg-blue-100 dark:bg-blue-900 px-1 rounded">localStorage.getItem('presugenius_recent_errors')</code></li>
                    <li>Prueba el chat de soporte: abre el chat y di "Tengo un error"</li>
                    <li>Verifica Sentry (si está configurado): los errores aparecerán en el dashboard</li>
                </ul>
            </div>
        </div>
    );
};

export default ErrorTestPanel;

