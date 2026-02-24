/**
 * Utilidad para probar el sistema de manejo de errores
 * Solo usar en desarrollo para verificar que todo funciona
 */

/**
 * Probar ErrorService
 */
export function testErrorService() {
    const { ErrorService } = require('../services/ErrorService');
    
    console.log('🧪 Probando ErrorService...');
    
    // Error de red
    ErrorService.logError(new Error('Failed to fetch'), 'TestNetworkError');
    
    // Error de validación
    ErrorService.logError(new Error('validation: campo requerido'), 'TestValidation');
    
    // Error genérico
    ErrorService.logError(new Error('Error de prueba'), 'TestGeneric');
    
    console.log('✅ ErrorService probado');
}

/**
 * Probar Error Boundary (solo en componentes React)
 */
export function testErrorBoundary() {
    console.log('🧪 Para probar Error Boundary, crea un error en un componente React');
    console.log('Ejemplo: throw new Error("Error de prueba en componente")');
}

/**
 * Probar captura global de errores
 */
export function testGlobalErrorHandlers() {
    console.log('🧪 Probando handlers globales...');
    
    // Error no capturado
    setTimeout(() => {
        throw new Error('Error de prueba para handlers globales');
    }, 1000);
    
    console.log('⚠️ Se lanzará un error en 1 segundo para probar los handlers globales');
}

/**
 * Probar Sentry (solo si está configurado)
 */
export function testSentry() {
    import('../lib/sentry').then(({ captureException, isSentryInitialized }) => {
        if (isSentryInitialized()) {
            console.log('🧪 Probando Sentry...');
            captureException(new Error('Error de prueba para Sentry'), { test: true });
            console.log('✅ Error enviado a Sentry');
        } else {
            console.log('📝 Sentry no está configurado. Esto es normal en desarrollo.');
        }
    });
}

// Disponible en consola para pruebas
if (typeof window !== 'undefined' && import.meta.env.DEV) {
    window.testErrorHandling = {
        errorService: testErrorService,
        errorBoundary: testErrorBoundary,
        globalHandlers: testGlobalErrorHandlers,
        sentry: testSentry,
        all: () => {
            testErrorService();
            testGlobalErrorHandlers();
            testSentry();
        }
    };
    
    console.log('🧪 Utilidades de prueba disponibles en: window.testErrorHandling');
    console.log('   - testErrorHandling.errorService()');
    console.log('   - testErrorHandling.globalHandlers()');
    console.log('   - testErrorHandling.sentry()');
    console.log('   - testErrorHandling.all()');
}

