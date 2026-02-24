-- ============================================
-- MARKET PRICE REFERENCE TABLE
-- ============================================
-- Esta tabla almacena precios de referencia del mercado
-- que se pueden usar cuando el usuario no tiene el concepto en su catálogo personal

CREATE TABLE IF NOT EXISTS market_price_reference (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    description TEXT NOT NULL,
    unit VARCHAR(20) NOT NULL,
    category VARCHAR(50) NOT NULL,
    location VARCHAR(100) DEFAULT 'México',
    base_price DECIMAL(10,2) NOT NULL,
    price_range JSONB, -- {min: 100, max: 150, avg: 125}
    source VARCHAR(50) DEFAULT 'manual', -- 'neodata', 'capeco', 'cmic', 'manual', 'ai_generated'
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_active BOOLEAN DEFAULT TRUE,
    metadata JSONB, -- Información adicional: año, mes, proveedor, etc.
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- INDEXES para búsqueda rápida
-- ============================================

CREATE INDEX IF NOT EXISTS idx_market_prices_category ON market_price_reference(category);
CREATE INDEX IF NOT EXISTS idx_market_prices_location ON market_price_reference(location);
CREATE INDEX IF NOT EXISTS idx_market_prices_active ON market_price_reference(is_active) WHERE is_active = TRUE;

-- Índice para búsqueda full-text en descripción (PostgreSQL)
CREATE INDEX IF NOT EXISTS idx_market_prices_description_fts ON market_price_reference 
    USING gin(to_tsvector('spanish', description));

-- Índice compuesto para búsquedas comunes
CREATE INDEX IF NOT EXISTS idx_market_prices_category_location ON market_price_reference(category, location, is_active);

-- ============================================
-- FUNCTIONS
-- ============================================

-- Función para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_market_prices_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para actualizar timestamp
CREATE TRIGGER update_market_prices_updated_at 
    BEFORE UPDATE ON market_price_reference
    FOR EACH ROW 
    EXECUTE FUNCTION update_market_prices_updated_at();

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================

ALTER TABLE market_price_reference ENABLE ROW LEVEL SECURITY;

-- Todos pueden leer precios de referencia (es información pública)
CREATE POLICY "Anyone can view market prices" ON market_price_reference
    FOR SELECT USING (is_active = TRUE);

-- Solo admins pueden insertar/actualizar (se puede configurar después)
-- Por ahora, permitimos que cualquier usuario autenticado pueda insertar
-- (para que puedas poblar datos iniciales fácilmente)
CREATE POLICY "Authenticated users can insert market prices" ON market_price_reference
    FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update market prices" ON market_price_reference
    FOR UPDATE USING (auth.uid() IS NOT NULL);

-- ============================================
-- DATOS INICIALES (Ejemplos comunes)
-- ============================================
-- Puedes ejecutar esto para tener datos iniciales de prueba

INSERT INTO market_price_reference (description, unit, category, location, base_price, price_range, source, metadata) VALUES
-- Materiales básicos
('Cemento gris Portland 50 kg', 'bulto', 'Materiales', 'México', 280.00, '{"min": 260, "max": 300, "avg": 280}', 'manual', '{"year": 2024, "common": true}'),
('Varilla corrugada #3 (3/8") 12 m', 'pieza', 'Materiales', 'México', 185.00, '{"min": 170, "max": 200, "avg": 185}', 'manual', '{"year": 2024, "common": true}'),
('Block hueco 15x20x40 cm', 'pieza', 'Materiales', 'México', 12.50, '{"min": 11, "max": 14, "avg": 12.5}', 'manual', '{"year": 2024, "common": true}'),
('Arena cernida m³', 'm3', 'Materiales', 'México', 450.00, '{"min": 400, "max": 500, "avg": 450}', 'manual', '{"year": 2024, "common": true}'),
('Grava triturada 3/4" m³', 'm3', 'Materiales', 'México', 520.00, '{"min": 480, "max": 560, "avg": 520}', 'manual', '{"year": 2024, "common": true}'),

-- Mano de Obra
('Oficial albañil', 'jornal', 'Mano de Obra', 'México', 500.00, '{"min": 450, "max": 550, "avg": 500}', 'manual', '{"year": 2024, "common": true}'),
('Ayudante de albañil', 'jornal', 'Mano de Obra', 'México', 350.00, '{"min": 300, "max": 400, "avg": 350}', 'manual', '{"year": 2024, "common": true}'),
('Plomero', 'jornal', 'Mano de Obra', 'México', 600.00, '{"min": 550, "max": 650, "avg": 600}', 'manual', '{"year": 2024, "common": true}'),
('Electricista', 'jornal', 'Mano de Obra', 'México', 650.00, '{"min": 600, "max": 700, "avg": 650}', 'manual', '{"year": 2024, "common": true}'),
('Carpintero', 'jornal', 'Mano de Obra', 'México', 550.00, '{"min": 500, "max": 600, "avg": 550}', 'manual', '{"year": 2024, "common": true}'),

-- Obra Civil
('Excavación a mano en material tipo I', 'm3', 'Obra Civil', 'México', 280.00, '{"min": 250, "max": 320, "avg": 280}', 'manual', '{"year": 2024, "common": true}'),
('Cimentación de concreto f\'c=150 kg/cm²', 'm3', 'Obra Civil', 'México', 2800.00, '{"min": 2600, "max": 3000, "avg": 2800}', 'manual', '{"year": 2024, "common": true}'),
('Mampostería de block 15x20x40 con mortero 1:4', 'm2', 'Obra Civil', 'México', 420.00, '{"min": 380, "max": 460, "avg": 420}', 'manual', '{"year": 2024, "common": true}'),
('Aplanado fino con mortero cemento-arena 1:3', 'm2', 'Obra Civil', 'México', 180.00, '{"min": 160, "max": 200, "avg": 180}', 'manual', '{"year": 2024, "common": true}'),
('Pintura vinílica en muros a dos manos', 'm2', 'Obra Civil', 'México', 65.00, '{"min": 55, "max": 75, "avg": 65}', 'manual', '{"year": 2024, "common": true}'),

-- Instalaciones
('Salida eléctrica sencilla', 'pieza', 'Instalaciones', 'México', 450.00, '{"min": 400, "max": 500, "avg": 450}', 'manual', '{"year": 2024, "common": true}'),
('Contacto sencillo 127V', 'pieza', 'Instalaciones', 'México', 280.00, '{"min": 250, "max": 310, "avg": 280}', 'manual', '{"year": 2024, "common": true}'),
('Lavabo sencillo económico', 'pieza', 'Instalaciones', 'México', 850.00, '{"min": 750, "max": 950, "avg": 850}', 'manual', '{"year": 2024, "common": true}'),
('Taza de baño económica', 'pieza', 'Instalaciones', 'México', 1200.00, '{"min": 1100, "max": 1300, "avg": 1200}', 'manual', '{"year": 2024, "common": true}'),

-- Equipos
('Revolvedora 1 saco', 'hora', 'Equipos', 'México', 120.00, '{"min": 100, "max": 140, "avg": 120}', 'manual', '{"year": 2024, "common": true}'),
('Vibrador para concreto', 'hora', 'Equipos', 'México', 80.00, '{"min": 70, "max": 90, "avg": 80}', 'manual', '{"year": 2024, "common": true}'),
('Cortadora de block', 'hora', 'Equipos', 'México', 150.00, '{"min": 130, "max": 170, "avg": 150}', 'manual', '{"year": 2024, "common": true}')

ON CONFLICT DO NOTHING;

-- ============================================
-- COMENTARIOS
-- ============================================

COMMENT ON TABLE market_price_reference IS 'Precios de referencia del mercado de construcción en México';
COMMENT ON COLUMN market_price_reference.price_range IS 'Rango de precios en formato JSON: {"min": 100, "max": 150, "avg": 125}';
COMMENT ON COLUMN market_price_reference.source IS 'Fuente del precio: neodata, capeco, cmic, manual, ai_generated';
COMMENT ON COLUMN market_price_reference.metadata IS 'Metadatos adicionales en formato JSON: año, mes, proveedor, etc.';

