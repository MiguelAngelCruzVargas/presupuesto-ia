-- Habilitar extensión para UUIDs si no existe
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Tabla Categories (Robustez: crear si no existe, alterar si existe)
CREATE TABLE IF NOT EXISTS categories (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Asegurar que exista la columna description
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'categories' AND column_name = 'description') THEN 
        ALTER TABLE categories ADD COLUMN description TEXT; 
    END IF; 
END $$;

-- Asegurar que exista la restricción UNIQUE en 'name' para que funcione el ON CONFLICT
-- Intentamos crear un índice único si no existe una restricción
DO $$ 
BEGIN 
    IF NOT EXISTS (
        SELECT 1 FROM pg_class c 
        JOIN pg_namespace n ON n.oid = c.relnamespace 
        WHERE c.relname = 'categories_name_key' AND n.nspname = 'public'
    ) THEN 
        -- Si hay duplicados, esto fallará, pero asumimos que en una tabla de categorías limpia no debería haberlos.
        -- Si falla, el usuario tendrá que limpiar duplicados manualmente.
        ALTER TABLE categories ADD CONSTRAINT categories_name_key UNIQUE (name);
    END IF; 
EXCEPTION 
    WHEN duplicate_table THEN 
        NULL; -- Ya existe
    WHEN OTHERS THEN
        RAISE NOTICE 'No se pudo crear la restricción única, verifique duplicados en categories.name';
END $$;


-- 2. Tabla Project Templates
CREATE TABLE IF NOT EXISTS project_templates (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id),
    category_id UUID REFERENCES categories(id),
    name TEXT NOT NULL,
    description TEXT,
    is_public BOOLEAN DEFAULT false,
    tags TEXT[] DEFAULT '{}',
    template_data JSONB NOT NULL,
    usage_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. RLS (Seguridad)
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_templates ENABLE ROW LEVEL SECURITY;

-- Políticas Categories
DROP POLICY IF EXISTS "Categories are viewable by everyone" ON categories;
CREATE POLICY "Categories are viewable by everyone" ON categories FOR SELECT USING (true);

-- Políticas Templates
DROP POLICY IF EXISTS "Templates are viewable by everyone if public or own" ON project_templates;
CREATE POLICY "Templates are viewable by everyone if public or own" ON project_templates
    FOR SELECT USING (is_public = true OR auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own templates" ON project_templates;
CREATE POLICY "Users can insert their own templates" ON project_templates
    FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own templates" ON project_templates;
CREATE POLICY "Users can update their own templates" ON project_templates
    FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own templates" ON project_templates;
CREATE POLICY "Users can delete their own templates" ON project_templates
    FOR DELETE USING (auth.uid() = user_id);

-- 4. Seeds (Datos iniciales)
-- Ahora que aseguramos el UNIQUE en name, el ON CONFLICT funcionará
INSERT INTO categories (name, description) VALUES
('Residencial', 'Casas, departamentos y vivienda en general'),
('Comercial', 'Locales, oficinas y plazas comerciales'),
('Industrial', 'Naves, bodegas y plantas industriales'),
('Remodelación', 'Reformas, ampliaciones y mantenimiento'),
('Obra Civil', 'Urbanización, calles y servicios'),
('Instalaciones', 'Eléctrica, hidráulica, sanitaria y especiales')
ON CONFLICT (name) DO NOTHING;
