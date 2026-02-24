-- Migration: User Subscriptions Table
-- Para gestionar usuarios FREE vs PRO y controlar acceso a APIs pagas

-- Tabla de suscripciones de usuarios
CREATE TABLE IF NOT EXISTS user_subscriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
    tier TEXT DEFAULT 'free' CHECK (tier IN ('free', 'pro', 'enterprise')),
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'cancelled', 'expired', 'trial')),
    expires_at TIMESTAMP WITH TIME ZONE,
    
    -- Límites de uso (para controlar consumo de API)
    requests_per_month INTEGER DEFAULT 0,           -- Contador de requests este mes
    requests_limit INTEGER DEFAULT 50,              -- Límite mensual de requests
    requests_reset_date TIMESTAMP WITH TIME ZONE DEFAULT NOW() + INTERVAL '1 month', -- Cuándo resetear contador
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índice para búsquedas rápidas
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_user_id ON user_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_tier ON user_subscriptions(tier);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_status ON user_subscriptions(status);

-- RLS Policies
ALTER TABLE user_subscriptions ENABLE ROW LEVEL SECURITY;

-- Los usuarios pueden ver su propia suscripción
CREATE POLICY "Users can view their own subscription" ON user_subscriptions
    FOR SELECT USING (auth.uid() = user_id);

-- Solo el sistema puede insertar/actualizar suscripciones (usar service role key)
-- Para frontend, crear una función que el admin use

-- Función helper para obtener el tier de un usuario
CREATE OR REPLACE FUNCTION get_user_tier(p_user_id UUID)
RETURNS TEXT AS $$
DECLARE
    v_tier TEXT;
    v_status TEXT;
    v_expires_at TIMESTAMP WITH TIME ZONE;
BEGIN
    SELECT tier, status, expires_at
    INTO v_tier, v_status, v_expires_at
    FROM user_subscriptions
    WHERE user_id = p_user_id;

    -- Si no existe suscripción, es FREE
    IF v_tier IS NULL THEN
        RETURN 'free';
    END IF;

    -- Si está cancelada o expirada, es FREE
    IF v_status IN ('cancelled', 'expired') THEN
        RETURN 'free';
    END IF;

    -- Si tiene fecha de expiración y ya pasó, es FREE
    IF v_expires_at IS NOT NULL AND v_expires_at < NOW() THEN
        RETURN 'free';
    END IF;

    RETURN v_tier;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función para verificar si un usuario puede hacer una request
CREATE OR REPLACE FUNCTION can_user_make_request(p_user_id UUID)
RETURNS JSONB AS $$
DECLARE
    v_subscription RECORD;
    v_can_make BOOLEAN;
    v_remaining INTEGER;
BEGIN
    -- Obtener suscripción del usuario
    SELECT * INTO v_subscription
    FROM user_subscriptions
    WHERE user_id = p_user_id;

    -- Si no tiene suscripción, es FREE (sin límite, pero usa API gratis)
    IF v_subscription IS NULL THEN
        RETURN jsonb_build_object(
            'can_make', true,
            'tier', 'free',
            'remaining', null,
            'limit', null
        );
    END IF;

    -- Verificar si necesita resetear contador mensual
    IF v_subscription.requests_reset_date < NOW() THEN
        -- Resetear contador
        UPDATE user_subscriptions
        SET requests_per_month = 0,
            requests_reset_date = NOW() + INTERVAL '1 month',
            updated_at = NOW()
        WHERE user_id = p_user_id;
        v_subscription.requests_per_month := 0;
    END IF;

    -- Verificar límite
    v_remaining := GREATEST(0, v_subscription.requests_limit - v_subscription.requests_per_month);
    v_can_make := v_subscription.requests_per_month < v_subscription.requests_limit;

    RETURN jsonb_build_object(
        'can_make', v_can_make,
        'tier', v_subscription.tier,
        'remaining', v_remaining,
        'limit', v_subscription.requests_limit,
        'used', v_subscription.requests_per_month
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función para incrementar el contador de requests
CREATE OR REPLACE FUNCTION increment_user_request(p_user_id UUID)
RETURNS INTEGER AS $$
DECLARE
    v_current_count INTEGER;
    v_new_count INTEGER;
BEGIN
    -- Obtener suscripción
    SELECT requests_per_month INTO v_current_count
    FROM user_subscriptions
    WHERE user_id = p_user_id;

    -- Si no existe, crear suscripción FREE
    IF v_current_count IS NULL THEN
        INSERT INTO user_subscriptions (user_id, tier, requests_per_month, requests_reset_date)
        VALUES (p_user_id, 'free', 1, NOW() + INTERVAL '1 month')
        ON CONFLICT (user_id) DO NOTHING;
        RETURN 1;
    END IF;

    -- Verificar si necesita resetear
    IF (SELECT requests_reset_date FROM user_subscriptions WHERE user_id = p_user_id) < NOW() THEN
        UPDATE user_subscriptions
        SET requests_per_month = 1,
            requests_reset_date = NOW() + INTERVAL '1 month',
            updated_at = NOW()
        WHERE user_id = p_user_id;
        RETURN 1;
    END IF;

    -- Incrementar contador
    UPDATE user_subscriptions
    SET requests_per_month = requests_per_month + 1,
        updated_at = NOW()
    WHERE user_id = p_user_id
    RETURNING requests_per_month INTO v_new_count;

    RETURN v_new_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Índices adicionales para límites
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_reset_date ON user_subscriptions(requests_reset_date);

-- Comentarios
COMMENT ON TABLE user_subscriptions IS 'Gestiona las suscripciones y tiers de usuarios (FREE/PRO/ENTERPRISE)';
COMMENT ON COLUMN user_subscriptions.tier IS 'Nivel de suscripción: free, pro, enterprise';
COMMENT ON COLUMN user_subscriptions.status IS 'Estado: active, cancelled, expired, trial';
COMMENT ON COLUMN user_subscriptions.requests_per_month IS 'Contador de requests realizadas este mes';
COMMENT ON COLUMN user_subscriptions.requests_limit IS 'Límite máximo de requests por mes';
COMMENT ON FUNCTION get_user_tier(UUID) IS 'Función helper para obtener el tier de un usuario (retorna free si no tiene suscripción activa)';
COMMENT ON FUNCTION can_user_make_request(UUID) IS 'Verifica si un usuario puede hacer una request y retorna información de límites';
COMMENT ON FUNCTION increment_user_request(UUID) IS 'Incrementa el contador de requests de un usuario';
