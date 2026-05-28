# 🔍 Configuración de Sentry - Monitoreo de Errores

## ¿Qué es Sentry?

Sentry es una plataforma de monitoreo de errores que captura excepciones y errores en tiempo real en producción. Te permite:

- ✅ Ver errores en tiempo real
- ✅ Stack traces completos
- ✅ Información del usuario afectado
- ✅ Performance monitoring
- ✅ Session replay (grabación de sesiones)

## 📋 Configuración

### 1. Crear cuenta en Sentry

1. Ve a [sentry.io](https://sentry.io)
2. Crea una cuenta gratuita (o inicia sesión)
3. Crea un nuevo proyecto seleccionando:
   - **Platform**: React
   - **Framework**: React

### 2. Obtener DSN (Data Source Name)

Después de crear el proyecto, Sentry te dará un DSN que se ve así:

```
https://abc123def456@o123456.ingest.sentry.io/1234567
```

### 3. Configurar en el proyecto

Agrega el DSN a tu archivo `.env`:

```env
VITE_SENTRY_DSN=https://abc123def456@o123456.ingest.sentry.io/1234567
```

**IMPORTANTE**: El archivo `.env` NO debe subirse a Git. Asegúrate de que esté en `.gitignore`.

### 4. Instalar dependencias

```bash
npm install
```

O si Sentry ya está en package.json:

```bash
npm install @sentry/react
```

### 5. Verificar que funciona

1. La aplicación funcionará normalmente sin Sentry si no hay DSN configurado
2. En desarrollo verás en consola: `📝 Sentry no configurado (VITE_SENTRY_DSN no encontrado). Esto es normal en desarrollo.`
3. En producción, si está configurado, verás: `✅ Sentry inicializado correctamente para: production`

## 🚀 Funcionamiento

### Automático

Sentry captura automáticamente:

- ✅ **Errores de React**: A través del ErrorBoundary
- ✅ **Errores de JavaScript**: window.error
- ✅ **Promesas rechazadas**: unhandledrejection
- ✅ **Errores en ErrorService**: Todos los errores logeados

### Manual

También puedes capturar errores manualmente:

```javascript
import { captureException, captureMessage } from './lib/sentry';

// Capturar excepción
try {
    // código que puede fallar
} catch (error) {
    captureException(error, { context: 'MiComponente' });
}

// Capturar mensaje
captureMessage('Algo importante ocurrió', 'info', { data: 'extra' });
```

## 📊 Configuración Avanzada

### Filtrado de Errores

Los siguientes errores se filtran automáticamente (no se envían a Sentry):

- Errores de red comunes (`Failed to fetch`, `NetworkError`)
- Errores de validación del usuario (no son bugs)
- Errores de extensiones del navegador
- Errores de recursos externos

### Performance Monitoring

Sentry rastrea automáticamente:

- **10% de transacciones** en producción
- **100% de transacciones** en desarrollo
- Rendimiento de componentes React

### Session Replay

- **10% de sesiones** en producción
- **100% de sesiones** en desarrollo
- **100% de sesiones con errores** (siempre)

## 🎯 Información del Usuario

El sistema automáticamente:

- ✅ Asocia errores con el usuario que los experimentó
- ✅ Incluye email e ID del usuario
- ✅ Limpia información al hacer logout

## 🔐 Privacidad y Seguridad

- ✅ **Datos sensibles**: Se enmascaran automáticamente en Session Replay
- ✅ **Solo producción**: Sentry solo se activa si `VITE_SENTRY_DSN` está configurado
- ✅ **Filtrado inteligente**: Errores de validación no se envían

## 📈 Dashboard de Sentry

En el dashboard de Sentry podrás ver:

1. **Issues**: Lista de errores agrupados
2. **Performance**: Tiempos de carga y rendimiento
3. **Releases**: Versiones desplegadas
4. **Users**: Usuarios afectados por errores
5. **Replays**: Grabaciones de sesiones con errores

## 🐛 Testing en Desarrollo

Para probar que Sentry funciona:

1. Configura `VITE_SENTRY_DSN` en `.env`
2. Reinicia el servidor
3. Agrega este código temporal en algún componente:

```javascript
const testError = () => {
    throw new Error('Test error for Sentry');
};
```

4. Ejecuta la función y verifica en Sentry que aparece el error

## 📝 Variables de Entorno

```env
# Sentry (opcional, solo para producción)
VITE_SENTRY_DSN=https://tu-dsn-aqui@sentry.io/project-id
```

## ✅ Verificación

### En Desarrollo (sin Sentry)
```
📝 Sentry no configurado (VITE_SENTRY_DSN no encontrado). Esto es normal en desarrollo.
```

### En Producción (con Sentry)
```
✅ Sentry inicializado correctamente para: production
```

## 🆘 Solución de Problemas

### Sentry no captura errores

1. Verifica que `VITE_SENTRY_DSN` esté en `.env`
2. Verifica que el DSN sea correcto
3. Reinicia el servidor después de cambiar `.env`
4. Revisa la consola del navegador para errores de inicialización

### Muchos errores duplicados

Sentry agrupa errores automáticamente. Si ves muchos duplicados:
- Verifica que estés en la misma release
- Revisa los filtros en Sentry

### Errores de CORS

Sentry no debería causar errores de CORS. Si los ves:
- Verifica que el DSN sea correcto
- Revisa la configuración de CORS en Sentry

## 💰 Costos

Sentry tiene un plan gratuito generoso:

- ✅ **5,000 errores/mes** gratis
- ✅ **10,000 sesiones/mes** gratis
- ✅ **Performance monitoring** incluido
- ✅ **Session Replay** incluido

Para proyectos pequeños/medianos, el plan gratuito es suficiente.

## 📚 Más Información

- [Documentación de Sentry React](https://docs.sentry.io/platforms/javascript/guides/react/)
- [Guía de configuración](https://docs.sentry.io/platforms/javascript/guides/react/configuration/)

