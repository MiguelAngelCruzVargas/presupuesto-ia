# 🚀 Guía de Implementación: Sistema de API Keys Múltiples

## ✅ Componentes Creados

1. ✅ `src/services/ApiKeyManager.js` - Gestor de múltiples API keys
2. ✅ `src/services/UserSubscriptionService.js` - Servicio de suscripciones
3. ✅ `supabase/migrations_subscriptions.sql` - Tabla de suscripciones
4. ✅ Documentación completa

## 📝 Pasos para Implementar

### Paso 1: Configurar Variables de Entorno

Agrega al archivo `.env`:

```env
# API Keys GRATUITAS (múltiples para distribuir carga)
GEMINI_API_KEY_FREE_1=tu_key_gratis_1_de_google
GEMINI_API_KEY_FREE_2=tu_key_gratis_2_de_google
GEMINI_API_KEY_FREE_3=tu_key_gratis_3_de_google

# API Keys PAGAS (para cuando tengas usuarios PRO - opcional por ahora)
# GEMINI_API_KEY_PRO_1=tu_key_paga_1
# GEMINI_API_KEY_PRO_2=tu_key_paga_2

# Keys específicas por funcionalidad (opcional)
# GEMINI_API_KEY_BUDGET=tu_key_para_presupuestos
# GEMINI_API_KEY_SCHEDULE=tu_key_para_cronograma
# GEMINI_API_KEY_PRICES=tu_key_para_precios

# Key genérica (fallback si no hay específicas)
GEMINI_API_KEY=tu_key_genérica
```

**Nota:** Si solo tienes 1 key gratis por ahora, puedes usar:
```env
GEMINI_API_KEY_FREE_1=tu_única_key
```

### Paso 2: Ejecutar Migración de Base de Datos

Ejecuta el script SQL en Supabase:

```bash
# Opción 1: Desde Supabase Dashboard
# Ve a SQL Editor y pega el contenido de: supabase/migrations_subscriptions.sql

# Opción 2: Desde línea de comandos (si tienes CLI configurado)
supabase db push
```

El script crea:
- Tabla `user_subscriptions` para gestionar FREE/PRO
- Función `get_user_tier()` para obtener tier de usuario
- Índices y políticas RLS

### Paso 3: Actualizar el Proxy (PENDIENTE)

El proxy (`src/lib/geminiServer.js`) necesita actualizarse para usar `ApiKeyManager`. 

**Estado actual:** Usa `GEMINI_API_KEY` directamente
**Estado objetivo:** Usa `ApiKeyManager` con balanceo de carga

**Tareas pendientes:**
- [ ] Importar `ApiKeyManager` en el proxy
- [ ] Modificar endpoint `/api/gemini` para usar múltiples keys
- [ ] Agregar parámetros opcionales `userTier` y `functionType` al request
- [ ] Implementar fallback si una key falla

### Paso 4: Actualizar BackendGeminiService (PENDIENTE)

Modificar `src/services/BackendGeminiService.js` para enviar:
- `userTier`: Tier del usuario (FREE/PRO)
- `functionType`: Tipo de funcionalidad (BUDGET/SCHEDULE/PRICES)

**Ejemplo de cambio:**

```javascript
// Antes
async sendPrompt(prompt, systemInstruction) {
    const body = { prompt, systemInstruction };
    // ...
}

// Después
async sendPrompt(prompt, systemInstruction, options = {}) {
    const { userTier, functionType } = options;
    const body = { 
        prompt, 
        systemInstruction,
        userTier,      // 'free' o 'pro'
        functionType   // 'budget', 'schedule', 'prices', etc.
    };
    // ...
}
```

### Paso 5: Actualizar Servicios de IA (PENDIENTE)

Modificar `AIBudgetService.js` para pasar el tier del usuario:

```javascript
// Obtener tier del usuario
const userTier = await UserSubscriptionService.getCurrentUserTier(user);

// Llamar con tier y función
await BackendGeminiService.sendPrompt(prompt, systemPrompt, {
    userTier: userTier,
    functionType: FUNCTION_TYPE.BUDGET
});
```

## 🎯 Funcionamiento Esperado

### Caso 1: Usuario FREE genera presupuesto
1. Sistema detecta: `user.tier = 'free'`
2. `ApiKeyManager` selecciona: `GEMINI_API_KEY_FREE_1` (o la siguiente disponible)
3. Proxy usa esa key para la petición
4. Si falla → Intenta con `GEMINI_API_KEY_FREE_2`
5. Si todas fallan → Error amigable

### Caso 2: Usuario PRO genera presupuesto
1. Sistema detecta: `user.tier = 'pro'`
2. `ApiKeyManager` selecciona: `GEMINI_API_KEY_PRO_1`
3. Proxy usa key paga (mejor modelo, más rápido)

### Caso 3: Balanceo de Carga
Si tienes 3 keys gratuitas:
- Petición 1 → Key FREE 1
- Petición 2 → Key FREE 2
- Petición 3 → Key FREE 3
- Petición 4 → Key FREE 1 (rotación)

## 📊 Monitoreo

El `ApiKeyManager` registra estadísticas:
- Cuántas veces se usa cada key
- Última vez que se usó
- Errores por key

Puedes verlas con:
```javascript
import apiKeyManager from './services/ApiKeyManager';
console.log(apiKeyManager.getStats());
```

## 🔄 Cuando Tengas Usuarios PRO

1. **Contratar API de pago** en Google Cloud
2. **Agregar keys al `.env`**:
   ```env
   GEMINI_API_KEY_PRO_1=tu_key_paga_1
   ```
3. **Actualizar suscripción en DB**:
   ```sql
   UPDATE user_subscriptions 
   SET tier = 'pro', status = 'active' 
   WHERE user_id = 'user-id-here';
   ```
4. **Listo**: El sistema automáticamente usará keys PRO para esos usuarios

## ⚠️ Notas Importantes

1. **Seguridad**: Las keys nunca se exponen al frontend. Todo pasa por el proxy.

2. **Límites**: 
   - FREE: 15 req/min, 1,500 req/día
   - PRO: Depende del plan contratado

3. **Fallback**: Si no hay keys PRO configuradas, usuarios PRO usan keys FREE (con advertencia en logs)

4. **Desarrollo**: Puedes usar solo 1 key para desarrollo, el sistema funciona igual.

## 📈 Próximos Pasos (Después de Implementar Básico)

- [ ] Dashboard de monitoreo de uso de keys
- [ ] Alertas cuando una key se acerca al límite
- [ ] Rotación automática de keys
- [ ] Cache de respuestas para reducir llamadas
- [ ] Rate limiting más sofisticado por tier

## ❓ Preguntas Frecuentes

**P: ¿Puedo usar solo 1 key gratis?**
R: Sí, agrega solo `GEMINI_API_KEY_FREE_1` al `.env`.

**P: ¿Cómo sé qué key se está usando?**
R: Los logs del proxy muestran qué key se usó (enmascarada por seguridad).

**P: ¿Qué pasa si una key se agota?**
R: El sistema intenta con la siguiente automáticamente.

**P: ¿Puedo tener keys diferentes para diferentes funciones?**
R: Sí, usa `GEMINI_API_KEY_BUDGET`, `GEMINI_API_KEY_SCHEDULE`, etc.

