# 🚀 Setup Rápido de Sentry

## Paso 1: Instalar Sentry

```bash
npm install @sentry/react
```

## Paso 2: Crear proyecto en Sentry.io

1. Ve a [sentry.io](https://sentry.io) y crea una cuenta
2. Crea un nuevo proyecto: **React**
3. Copia el **DSN** que te proporciona

## Paso 3: Configurar DSN

Agrega a tu archivo `.env`:

```env
VITE_SENTRY_DSN=https://tu-dsn-aqui@o123456.ingest.sentry.io/1234567
```

## Paso 4: Listo ✅

Reinicia el servidor y Sentry estará activo.

**Nota**: La aplicación funciona perfectamente sin Sentry. Solo se activa si configuras el DSN.

## Verificar que funciona

1. Abre la consola del navegador
2. Deberías ver: `✅ Sentry inicializado correctamente para: development` (o `production`)
3. Crea un error de prueba y verifica en sentry.io que aparece

## Sin configuración

Si no configuras Sentry:
- ✅ La app funciona normalmente
- ✅ Verás: `📝 Sentry no configurado (VITE_SENTRY_DSN no encontrado). Esto es normal en desarrollo.`
- ✅ No se enviará ningún error a Sentry

## Más información

Ver `SENTRY_CONFIG.md` para documentación completa.

