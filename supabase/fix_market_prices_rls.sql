-- ============================================
-- FIX RLS POLICIES FOR MARKET PRICE REFERENCE
-- ============================================
-- Permite importación masiva de precios de referencia
-- Los precios de referencia son datos públicos, así que permitimos inserción sin autenticación

-- Eliminar políticas existentes
DROP POLICY IF EXISTS "Authenticated users can insert market prices" ON market_price_reference;
DROP POLICY IF EXISTS "Authenticated users can update market prices" ON market_price_reference;

-- Nueva política: Permitir inserción/actualización para precios de referencia
-- Como son datos públicos de referencia, permitimos inserción desde scripts
CREATE POLICY "Allow insert/update for market prices" ON market_price_reference
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow update for market prices" ON market_price_reference
    FOR UPDATE USING (true);

-- Mantener la política de lectura (todos pueden leer precios activos)
-- Esta ya existe: "Anyone can view market prices"

