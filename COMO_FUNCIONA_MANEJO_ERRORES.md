# 🔍 ¿Qué pasa cuando hay un error en el código?

## 📋 Flujo completo de manejo de errores

Tu aplicación tiene **múltiples capas de protección** para capturar errores:

### 1️⃣ **Error de JavaScript no capturado** 
```
Ejemplo: undefinedVariable.someMethod()
```

**¿Qué pasa?**
1. El handler global `window.onerror` lo captura automáticamente
2. Se envía a **ErrorContext** para almacenarlo
3. Se envía a **Sentry** (si está configurado)
4. Se muestra en la consola del navegador
5. El usuario **puede continuar usando la app** (el error no crashea todo)

### 2️⃣ **Error en un componente React**
```
Ejemplo: Un componente intenta renderizar undefined
```

**¿Qué pasa?**
1. El **ErrorBoundary** lo captura (envuelve toda la app)
2. Se muestra una **pantalla de error amigable** al usuario
3. El error se envía a **Sentry**
4. El usuario puede:
   - Recargar la página
   - Ir al inicio
   - Ver detalles del error (solo en desarrollo)

### 3️⃣ **Error en una Promesa rechazada**
```
Ejemplo: fetch().then() sin .catch()
```

**¿Qué pasa?**
1. El handler `unhandledrejection` lo captura
2. Se envía a **ErrorContext**
3. Se envía a **Sentry**
4. Se muestra en consola
5. La app **continúa funcionando**

### 4️⃣ **Error capturado manualmente**
```
Ejemplo: try/catch en tu código
```

**¿Qué pasa?**
1. Tú decides cómo manejarlo
2. Puedes usar **ErrorService.logError()** para registrarlo
3. Se muestra un **Toast** al usuario
4. Se guarda en **ErrorContext**
5. El usuario puede hacer clic en "Reportar error" en el Toast

## 🎯 Ejemplos Prácticos

### Error de JavaScript puro:
```javascript
// En algún lugar del código
function calcularTotal() {
    let precio = undefined;
    return precio.toFixed(2); // ❌ ERROR: Cannot read property 'toFixed' of undefined
}
```

**Resultado:**
- ✅ Se captura automáticamente
- ✅ Se guarda en ErrorContext
- ✅ Se envía a Sentry
- ✅ El usuario puede reportarlo desde el chat

### Error en React:
```javascript
function MiComponente() {
    const datos = null;
    return <div>{datos.nombre}</div>; // ❌ ERROR: Cannot read property 'nombre' of null
}
```

**Resultado:**
- ✅ ErrorBoundary lo captura
- ✅ Se muestra pantalla de error
- ✅ Usuario puede recargar o ir al inicio
- ✅ En desarrollo, puede ver el stack trace

### Error de API:
```javascript
async function cargarDatos() {
    try {
        const response = await fetch('/api/datos');
        // Si falla, el catch lo maneja
    } catch (error) {
        ErrorService.logError(error, 'cargarDatos');
        showToast('Error al cargar datos', 'error');
        // Ahora está guardado y el usuario puede reportarlo
    }
}
```

**Resultado:**
- ✅ Toast muestra mensaje amigable
- ✅ Error guardado en ErrorContext
- ✅ Botón "Reportar error" disponible
- ✅ Chat puede analizarlo automáticamente

## 🔄 ¿Cómo probar el sistema?

### Opción 1: Usar el componente de prueba
Abre el componente `ErrorTestPanel` (que crearemos) desde cualquier página para probar errores controlados.

### Opción 2: Desde la consola del navegador
```javascript
// Error de JavaScript
throw new Error("Error de prueba desde consola");

// Error de promesa
Promise.reject(new Error("Error de promesa de prueba"));

// Error en un componente
window.testError = true;
// Luego recarga la página si hay un componente que lo detecte
```

### Opción 3: Crear un error real en el código
```javascript
// En cualquier componente o función
function miFuncion() {
    // Esto causará un error
    const obj = null;
    console.log(obj.propiedad); // Error automático
}
```

## 📊 Dónde ver los errores capturados

1. **Consola del navegador**: Todos los errores aparecen aquí
2. **ErrorContext**: Almacena los últimos 10 errores
   - Puedes acceder con: `localStorage.getItem('presugenius_recent_errors')`
3. **Sentry Dashboard**: Si está configurado, todos los errores aparecen allí
4. **Chat de soporte**: El asistente puede ver y analizar los errores recientes

## 🛡️ Capas de protección

```
┌─────────────────────────────────────┐
│  ErrorBoundary (React)              │  ← Captura errores de componentes
│  └─ ErrorContext                    │  ← Almacena errores
│     └─ ErrorService                 │  ← Procesa errores
│        └─ Sentry                    │  ← Monitoreo en producción
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│  Global Error Handlers              │  ← Captura errores de JS
│  └─ window.onerror                  │
│  └─ unhandledrejection              │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│  Try/Catch manual                   │  ← Errores manejados por ti
│  └─ ErrorService.logError()         │
└─────────────────────────────────────┘
```

## ✅ Ventajas del sistema actual

1. **No crashea la app**: La mayoría de errores no detienen la aplicación
2. **Captura automática**: No necesitas hacer nada, se capturan solos
3. **Reporte fácil**: El usuario puede reportar errores con un clic
4. **Análisis inteligente**: El asistente puede analizar errores automáticamente
5. **Monitoreo en producción**: Sentry te notifica de errores en tiempo real

## 🧪 Prueba el sistema ahora

1. Abre la consola del navegador (F12)
2. Escribe: `throw new Error("Prueba de error")`
3. Verás que se captura y se guarda
4. Abre el chat de soporte
5. Di "Tengo un error"
6. El asistente debería detectarlo automáticamente

