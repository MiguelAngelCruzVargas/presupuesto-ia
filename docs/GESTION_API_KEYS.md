# 🔑 Sistema de Gestión de API Keys Múltiples

## 📋 Resumen

Este sistema te permite:
1. **Usar múltiples API keys** para distribuir la carga y evitar límites
2. **Separar por funcionalidad**: presupuestos, cronograma, precios unitarios
3. **Sistema de tiering**: usuarios FREE usan API gratis, usuarios PRO usan API paga
4. **Escalabilidad**: fácil agregar más keys cuando crezcas

## 🏗️ Arquitectura

```
Usuario
  │
  ├─→ Tipo de Usuario (FREE/PRO) ──→ Selecciona API Key
  │                                          │
  ├─→ Funcionalidad ─────────────────────────┤
  │   ├─ Presupuestos                        │
  │   ├─ Cronograma                          │
  │   └─ Precios Unitarios                   │
  │                                          │
  └──────────────────────────────────────────┘
                      │
                      ▼
            API Key Manager
                      │
        ┌─────────────┼─────────────┐
        │             │             │
     FREE Keys    PRO Keys    Fallback
```

## 📦 Componentes

### 1. Configuración de API Keys (`.env`)

```env
# API Keys GRATUITAS (para usuarios FREE)
GEMINI_API_KEY_FREE_1=tu_key_gratis_1
GEMINI_API_KEY_FREE_2=tu_key_gratis_2  
GEMINI_API_KEY_FREE_3=tu_key_gratis_3

# API Keys PAGAS (para usuarios PRO)
GEMINI_API_KEY_PRO_1=tu_key_paga_1
GEMINI_API_KEY_PRO_2=tu_key_paga_2

# Configuración por funcionalidad (opcional)
GEMINI_API_KEY_BUDGET=tu_key_para_presupuestos
GEMINI_API_KEY_SCHEDULE=tu_key_para_cronograma
GEMINI_API_KEY_PRICES=tu_key_para_precios
```

### 2. Base de Datos - Tabla de Suscripciones

```sql
CREATE TABLE user_subscriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    tier TEXT DEFAULT 'free' CHECK (tier IN ('free', 'pro', 'enterprise')),
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'cancelled', 'expired')),
    expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### 3. API Key Manager

El servicio `ApiKeyManager` selecciona automáticamente:
- **Qué API key usar** según el usuario (FREE/PRO)
- **Qué API key usar** según la funcionalidad (budget/schedule/prices)
- **Balanceo de carga** entre múltiples keys del mismo tipo
- **Fallback** si una key falla

## 🚀 Flujo de Funcionamiento

### Usuario FREE hace una petición:

1. Usuario FREE → Petición de presupuesto
2. Sistema detecta: `user.tier = 'free'`
3. `ApiKeyManager` selecciona: `GEMINI_API_KEY_FREE_1` (balanceo de carga)
4. Proxy usa esa key para la petición

### Usuario PRO hace una petición:

1. Usuario PRO → Petición de presupuesto
2. Sistema detecta: `user.tier = 'pro'`
3. `ApiKeyManager` selecciona: `GEMINI_API_KEY_PRO_1` (mejor modelo, más rápido)
4. Proxy usa esa key para la petición

### Balanceo de Carga:

Si tienes 3 keys gratuitas:
- Petición 1 → Key 1
- Petición 2 → Key 2  
- Petición 3 → Key 3
- Petición 4 → Key 1 (rotación)

## 💡 Casos de Uso

### Escenario 1: Desarrollo Actual (Gratis)
- Usa 3 cuentas gratuitas
- Distribuye: Presupuestos, Cronograma, Precios
- Todos los usuarios son FREE por defecto

### Escenario 2: Cuando Tengas Usuarios PRO
- FREE → Usa keys gratuitas (límite: 15 req/min)
- PRO → Usa keys pagas (límite: 60 req/min, mejor modelo)
- Sistema automático, sin configuración manual

### Escenario 3: Escalado
- Si una key se agota → Fallback automático
- Si todas FREE se agotan → Mensaje al usuario FREE
- PRO siempre tiene prioridad en keys pagas

## 📊 Ventajas

✅ **Distribución de carga**: No sobrecargar una sola API key
✅ **Separación de funcionalidades**: Si falla una, otras siguen
✅ **Escalabilidad**: Fácil agregar más keys
✅ **Monetización**: FREE vs PRO automático
✅ **Redundancia**: Si una key falla, usa otra

## 🔧 Configuración Inicial

1. **Obtener API Keys**:
   - FREE: https://aistudio.google.com/app/apikey (múltiples cuentas)
   - PRO: Contratar plan de pago cuando tengas usuarios PRO

2. **Agregar al `.env`**:
   ```env
   GEMINI_API_KEY_FREE_1=...
   GEMINI_API_KEY_FREE_2=...
   GEMINI_API_KEY_FREE_3=...
   ```

3. **Migrar base de datos**:
   ```bash
   # Ejecutar migración para tabla de suscripciones
   ```

4. **Listo**: El sistema funciona automáticamente

## 📈 Próximos Pasos

- [ ] Implementar `ApiKeyManager`
- [ ] Actualizar proxy para usar múltiples keys
- [ ] Crear tabla de suscripciones
- [ ] Sistema de balanceo de carga
- [ ] Dashboard de monitoreo de uso de keys

