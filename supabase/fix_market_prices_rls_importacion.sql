-- ============================================
-- FIX RLS POLICIES FOR MARKET PRICE REFERENCE
-- Permite importación masiva desde scripts
-- ============================================

-- Eliminar políticas existentes que requieren autenticación
DROP POLICY IF EXISTS "Authenticated users can insert market prices" ON market_price_reference;
DROP POLICY IF EXISTS "Authenticated users can update market prices" ON market_price_reference;

-- Nueva política: Permitir inserción/actualización para precios de referencia
-- Como son datos públicos de referencia del mercado, permitimos inserción desde scripts
CREATE POLICY "Allow insert for market prices" ON market_price_reference
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow update for market prices" ON market_price_reference
    FOR UPDATE USING (true);

-- La política de lectura ya existe y permite leer precios activos:
-- "Anyone can view market prices" (is_active = TRUE)

-- NOTA: Si prefieres usar service_role key en el script en lugar de cambiar políticas,
-- no ejecutes esta migración y usa VITE_SUPABASE_SERVICE_ROLE_KEY en .env

