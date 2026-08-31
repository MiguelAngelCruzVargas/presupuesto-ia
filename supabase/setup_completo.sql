-- ============================================================
-- PRESUPUESTO-IA · ESQUEMA COMPLETO DE SUPABASE
-- ============================================================
-- Refleja el esquema REAL que corre en producción (proyecto
-- xodtehgeajfhytghhtkl, verificado el 2026-08-31 vía MCP) y sirve para
-- levantar un proyecto nuevo desde cero. Es idempotente: se puede volver
-- a ejecutar sin romper nada ni borrar datos.
--
-- OJO: sobre una base que YA existe, este archivo no altera las tablas
-- (CREATE TABLE IF NOT EXISTS no agrega columnas que falten) pero sí
-- reemplaza las políticas RLS por las de aquí. Para una base en marcha,
-- aplica cambios puntuales en vez de correr el archivo completo.
--
-- CÓMO USARLO EN UN PROYECTO NUEVO:
--   1. Supabase → tu proyecto → SQL Editor → New query
--   2. Pega TODO este archivo y dale Run
--   3. Actualiza VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY en .env
--
-- Sustituye a: migrations.sql, migrations_sharing.sql,
-- migrations_subscriptions.sql, migrations_market_prices.sql,
-- add_data_column.sql, bitacora_schema.sql y templates_schema.sql.
--
-- Correcciones respecto a esos archivos (la base de producción ya está
-- bien; los que estaban mal eran los archivos del repositorio):
--   · migrations.sql estaba corrupto: a apu_breakdown se le pegaron
--     columnas de categories (parent_id, color, icon) y la tabla
--     categories nunca se creaba, así que el script fallaba entero.
--   · profiles, user_usage y app_settings no aparecían en ningún .sql
--     del repo, aunque el código las usa (en la base sí existen).
--   · Faltaba la función increment_user_usage que llama la app.
--   · get_user_tier leía "tier" cuando la app escribe "plan": marcar a
--     alguien como Pro no surtía efecto. Ya corregido en producción.
--   · budget_items no tenía "code" ni "price", que sí inserta
--     TemplateService al usar una plantilla.
--   · El precio sembrado con f\'c rompía la sintaxis (ahora f''c).
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";


-- ============================================================
-- 1. PERFILES DE USUARIO
-- ============================================================
-- La app lista usuarios desde aquí (panel de Administración).
-- Se llena sola cuando alguien se registra.

CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT,
    full_name TEXT,
    avatar_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);


-- ============================================================
-- 2. CATEGORÍAS (globales, compartidas por todos)
-- ============================================================

CREATE TABLE IF NOT EXISTS categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    parent_id UUID REFERENCES categories(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    color TEXT DEFAULT '#3B82F6',
    icon TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- UNIQUE en name para que funcione el ON CONFLICT de los seeds
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'categories_name_key'
    ) THEN
        ALTER TABLE categories ADD CONSTRAINT categories_name_key UNIQUE (name);
    END IF;
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'No se pudo crear el UNIQUE en categories.name (¿hay duplicados?)';
END $$;


-- ============================================================
-- 3. PROYECTOS
-- ============================================================
-- El grueso del proyecto vive en la columna JSONB "data"
-- (partidas, cronograma, materiales, membrete del reporte...).

CREATE TABLE IF NOT EXISTS projects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    client TEXT,
    location TEXT,
    type TEXT DEFAULT 'General',
    currency TEXT DEFAULT 'MXN',
    tax_rate NUMERIC DEFAULT 16,
    indirect_percentage NUMERIC DEFAULT 0,
    profit_percentage NUMERIC DEFAULT 0,
    budget_number INTEGER,
    data JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_projects_user_id ON projects(user_id);
CREATE INDEX IF NOT EXISTS idx_projects_data ON projects USING GIN (data);

COMMENT ON COLUMN projects.data IS 'Proyecto completo en JSON: items, scheduleData, materialList, projectInfo, etc.';


-- ============================================================
-- 4. PARTIDAS DEL PRESUPUESTO
-- ============================================================

CREATE TABLE IF NOT EXISTS budget_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    code TEXT,
    description TEXT NOT NULL,
    unit TEXT DEFAULT 'pza',
    quantity NUMERIC DEFAULT 1,
    price NUMERIC DEFAULT 0,
    unit_price NUMERIC DEFAULT 0,
    category TEXT DEFAULT 'Materiales',
    subcategory TEXT,
    tags TEXT[],
    notes TEXT,
    is_catalog_item BOOLEAN DEFAULT FALSE,
    order_index INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_budget_items_project_id ON budget_items(project_id);
CREATE INDEX IF NOT EXISTS idx_budget_items_order ON budget_items(project_id, order_index);

COMMENT ON COLUMN budget_items.price IS 'Precio unitario que escribe TemplateService; unit_price se conserva por compatibilidad';


-- ============================================================
-- 5. CATÁLOGO PERSONAL DE CONCEPTOS
-- ============================================================

CREATE TABLE IF NOT EXISTS catalog_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    code TEXT,
    description TEXT NOT NULL,
    unit TEXT DEFAULT 'pza',
    unit_price NUMERIC DEFAULT 0,
    category TEXT DEFAULT 'Materiales',
    subcategory TEXT,
    is_public BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_catalog_items_user_id ON catalog_items(user_id);


-- ============================================================
-- 6. DESGLOSE APU (Análisis de Precios Unitarios)
-- ============================================================
-- Hoy la app guarda el APU dentro del JSON del proyecto; la tabla
-- queda disponible para cuando se quiera normalizar.

CREATE TABLE IF NOT EXISTS apu_breakdown (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    budget_item_id UUID REFERENCES budget_items(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('material', 'labor', 'equipment')),
    description TEXT NOT NULL,
    quantity NUMERIC DEFAULT 1,
    unit_price NUMERIC DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_apu_breakdown_item_id ON apu_breakdown(budget_item_id);


-- ============================================================
-- 7. PLANTILLAS DE PROYECTO
-- ============================================================

CREATE TABLE IF NOT EXISTS project_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    description TEXT,
    type TEXT DEFAULT 'General',
    is_public BOOLEAN DEFAULT FALSE,
    tags TEXT[] DEFAULT '{}',
    template_data JSONB NOT NULL,
    usage_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_project_templates_user_id ON project_templates(user_id);

-- Plantillas de marca para el PDF del presupuesto (encabezado, logo, colores).
-- Antes vivían solo en localStorage y se perdían al cambiar de navegador.
CREATE TABLE IF NOT EXISTS pdf_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    is_active BOOLEAN DEFAULT FALSE,
    config JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pdf_templates_user_id ON pdf_templates(user_id);
CREATE INDEX IF NOT EXISTS idx_pdf_templates_active ON pdf_templates(user_id) WHERE is_active;

COMMENT ON COLUMN pdf_templates.config IS 'Estilos: headerColor, headerTextColor, headerTextSize, logoUrl, logoPosition, logoSize, headerText, headerSubtext, footerText, showHeader';


-- ============================================================
-- 8. CRONOGRAMA Y BITÁCORA DE OBRA
-- ============================================================

CREATE TABLE IF NOT EXISTS project_schedules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    tasks JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_project_schedules_project_id ON project_schedules(project_id);

-- Notas de bitácora y reportes fotográficos (photos = URLs de las fotos)
CREATE TABLE IF NOT EXISTS site_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    task_id TEXT NOT NULL,
    log_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    content TEXT,
    photos JSONB DEFAULT '[]'::jsonb,
    progress_percentage INTEGER DEFAULT 0,
    note_number INTEGER,
    classification TEXT CHECK (classification IN ('Apertura', 'Orden', 'Solicitud', 'Autorización', 'Informe', 'Cierre', 'Otro')),
    author_role TEXT CHECK (author_role IN ('Supervisor', 'Residente', 'Superintendente', 'Otro')),
    status TEXT DEFAULT 'Abierta' CHECK (status IN ('Abierta', 'Cerrada')),
    subject TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_site_logs_project_id ON site_logs(project_id);
CREATE INDEX IF NOT EXISTS idx_site_logs_task_id ON site_logs(task_id);
CREATE INDEX IF NOT EXISTS idx_site_logs_date ON site_logs(project_id, log_date DESC);


-- ============================================================
-- 9. COMPARTIR PROYECTOS POR ENLACE
-- ============================================================

CREATE TABLE IF NOT EXISTS project_shares (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    share_token TEXT UNIQUE NOT NULL,
    share_code TEXT UNIQUE,
    expires_at TIMESTAMP WITH TIME ZONE,
    can_edit BOOLEAN DEFAULT FALSE,
    password TEXT,
    access_count INTEGER DEFAULT 0,
    last_accessed_at TIMESTAMP WITH TIME ZONE,
    allowed_emails TEXT[],
    metadata JSONB DEFAULT '{}'::jsonb,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS project_share_access (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    share_id UUID REFERENCES project_shares(id) ON DELETE CASCADE,
    accessed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    ip_address TEXT,
    user_agent TEXT,
    metadata JSONB DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_project_shares_token ON project_shares(share_token);
CREATE INDEX IF NOT EXISTS idx_project_shares_code ON project_shares(share_code);
CREATE INDEX IF NOT EXISTS idx_project_shares_project_id ON project_shares(project_id);
CREATE INDEX IF NOT EXISTS idx_project_share_access_share_id ON project_share_access(share_id);


-- ============================================================
-- 10. REGISTRO DE ACTIVIDAD
-- ============================================================

CREATE TABLE IF NOT EXISTS activity_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    action TEXT NOT NULL,
    details JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_activity_log_project_id ON activity_log(project_id);


-- ============================================================
-- 11. PRECIOS DE REFERENCIA DEL MERCADO
-- ============================================================

CREATE TABLE IF NOT EXISTS market_price_reference (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    description TEXT NOT NULL,
    unit VARCHAR(20) NOT NULL,
    category VARCHAR(50) NOT NULL,
    location VARCHAR(100) DEFAULT 'México',
    base_price DECIMAL(12,2) NOT NULL,
    price_range JSONB,
    source VARCHAR(50) DEFAULT 'manual',
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_active BOOLEAN DEFAULT TRUE,
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_market_prices_category ON market_price_reference(category);
CREATE INDEX IF NOT EXISTS idx_market_prices_location ON market_price_reference(location);
CREATE INDEX IF NOT EXISTS idx_market_prices_active ON market_price_reference(is_active) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_market_prices_description_fts ON market_price_reference USING gin(to_tsvector('spanish', description));
CREATE INDEX IF NOT EXISTS idx_market_prices_category_location ON market_price_reference(category, location, is_active);


-- ============================================================
-- 12. SUSCRIPCIONES, USO Y AJUSTES DEL SISTEMA
-- ============================================================

-- Plan de cada usuario. La columna que manda es "plan": es la que lee y
-- escribe el código (SubscriptionService, AdminDashboard). "tier" y los
-- contadores requests_* quedaron de un diseño anterior y ya no se usan.
CREATE TABLE IF NOT EXISTS user_subscriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
    plan TEXT DEFAULT 'free' CHECK (plan IN ('free', 'pro')),
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'cancelled', 'expired', 'trial')),
    expires_at TIMESTAMP WITH TIME ZONE,
    tier TEXT DEFAULT 'free' CHECK (tier IN ('free', 'pro', 'enterprise')),
    requests_per_month INTEGER DEFAULT 0,
    requests_limit INTEGER DEFAULT 50,
    requests_reset_date TIMESTAMP WITH TIME ZONE DEFAULT NOW() + INTERVAL '1 month',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_subscriptions_user_id ON user_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_plan ON user_subscriptions(plan);

-- Contadores mensuales de uso por usuario (límites del plan gratis)
CREATE TABLE IF NOT EXISTS user_usage (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
    budgets_created INTEGER DEFAULT 0,
    ai_generations INTEGER DEFAULT 0,
    ai_descriptions INTEGER DEFAULT 0,
    ai_price_suggestions INTEGER DEFAULT 0,
    bitacora_entries INTEGER DEFAULT 0,
    photo_reports INTEGER DEFAULT 0,
    pdf_exports INTEGER DEFAULT 0,
    catalog_items INTEGER DEFAULT 0,
    last_reset TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_usage_user_id ON user_usage(user_id);

-- Ajustes globales editables desde el panel de Administración
-- (precios de planes, límites, api_keys cifradas...)
CREATE TABLE IF NOT EXISTS app_settings (
    key TEXT PRIMARY KEY,
    value JSONB,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_by TEXT
);


-- ============================================================
-- 13. FUNCIONES
-- ============================================================

-- updated_at automático
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Crear el perfil en cuanto alguien se registra
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    INSERT INTO public.profiles (id, email, full_name)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data ->> 'full_name', NEW.raw_user_meta_data ->> 'name', '')
    )
    ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email;
    RETURN NEW;
END;
$$;

-- Plan efectivo de un usuario (free si no tiene, si está cancelado o si expiró)
CREATE OR REPLACE FUNCTION get_user_tier(p_user_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_plan TEXT;
    v_status TEXT;
    v_expires_at TIMESTAMP WITH TIME ZONE;
BEGIN
    SELECT plan, status, expires_at
    INTO v_plan, v_status, v_expires_at
    FROM user_subscriptions
    WHERE user_id = p_user_id;

    IF v_plan IS NULL THEN
        RETURN 'free';
    END IF;

    IF v_status IN ('cancelled', 'expired') THEN
        RETURN 'free';
    END IF;

    IF v_expires_at IS NOT NULL AND v_expires_at < NOW() THEN
        RETURN 'free';
    END IF;

    RETURN v_plan;
END;
$$;

-- Suma 1 al contador indicado. p_type se valida contra una lista
-- blanca para que no se pueda inyectar un nombre de columna.
CREATE OR REPLACE FUNCTION increment_user_usage(p_user_id UUID, p_type TEXT)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_new INTEGER;
BEGIN
    IF p_type NOT IN (
        'budgets_created', 'ai_generations', 'ai_descriptions',
        'ai_price_suggestions', 'bitacora_entries', 'photo_reports',
        'pdf_exports', 'catalog_items'
    ) THEN
        RAISE EXCEPTION 'Tipo de uso no válido: %', p_type;
    END IF;

    INSERT INTO user_usage (user_id) VALUES (p_user_id)
    ON CONFLICT (user_id) DO NOTHING;

    EXECUTE format(
        'UPDATE user_usage SET %I = COALESCE(%I, 0) + 1, updated_at = NOW() WHERE user_id = $1 RETURNING %I',
        p_type, p_type, p_type
    )
    USING p_user_id
    INTO v_new;

    RETURN v_new;
END;
$$;


-- ============================================================
-- 14. TRIGGERS
-- ============================================================

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION handle_new_user();

DROP TRIGGER IF EXISTS update_profiles_updated_at ON profiles;
CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_projects_updated_at ON projects;
CREATE TRIGGER update_projects_updated_at
    BEFORE UPDATE ON projects
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_project_templates_updated_at ON project_templates;
CREATE TRIGGER update_project_templates_updated_at
    BEFORE UPDATE ON project_templates
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_pdf_templates_updated_at ON pdf_templates;
CREATE TRIGGER update_pdf_templates_updated_at
    BEFORE UPDATE ON pdf_templates
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_project_schedules_updated_at ON project_schedules;
CREATE TRIGGER update_project_schedules_updated_at
    BEFORE UPDATE ON project_schedules
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_project_shares_updated_at ON project_shares;
CREATE TRIGGER update_project_shares_updated_at
    BEFORE UPDATE ON project_shares
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_market_prices_updated_at ON market_price_reference;
CREATE TRIGGER update_market_prices_updated_at
    BEFORE UPDATE ON market_price_reference
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_user_subscriptions_updated_at ON user_subscriptions;
CREATE TRIGGER update_user_subscriptions_updated_at
    BEFORE UPDATE ON user_subscriptions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_user_usage_updated_at ON user_usage;
CREATE TRIGGER update_user_usage_updated_at
    BEFORE UPDATE ON user_usage
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();


-- ============================================================
-- 15. SEGURIDAD POR FILA (RLS)
-- ============================================================

ALTER TABLE profiles              ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories            ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects              ENABLE ROW LEVEL SECURITY;
ALTER TABLE budget_items          ENABLE ROW LEVEL SECURITY;
ALTER TABLE catalog_items         ENABLE ROW LEVEL SECURITY;
ALTER TABLE apu_breakdown         ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_templates     ENABLE ROW LEVEL SECURITY;
ALTER TABLE pdf_templates         ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_schedules     ENABLE ROW LEVEL SECURITY;
ALTER TABLE site_logs             ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_shares        ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_share_access  ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_log          ENABLE ROW LEVEL SECURITY;
ALTER TABLE market_price_reference ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_subscriptions    ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_usage            ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_settings          ENABLE ROW LEVEL SECURITY;

-- ---------- profiles ----------
-- Cada quien ve su perfil; el administrador ve todos (panel de usuarios)
DROP POLICY IF EXISTS "profiles_select" ON profiles;
CREATE POLICY "profiles_select" ON profiles
    FOR SELECT TO authenticated
    USING (auth.uid() = id OR (auth.jwt() ->> 'email') = 'isc20350265@gmail.com');

DROP POLICY IF EXISTS "profiles_update_own" ON profiles;
CREATE POLICY "profiles_update_own" ON profiles
    FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- ---------- categories (catálogo global de solo lectura) ----------
DROP POLICY IF EXISTS "categories_select" ON categories;
CREATE POLICY "categories_select" ON categories
    FOR SELECT USING (true);

-- ---------- projects ----------
DROP POLICY IF EXISTS "projects_select_own" ON projects;
CREATE POLICY "projects_select_own" ON projects
    FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "projects_insert_own" ON projects;
CREATE POLICY "projects_insert_own" ON projects
    FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "projects_update_own" ON projects;
CREATE POLICY "projects_update_own" ON projects
    FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "projects_delete_own" ON projects;
CREATE POLICY "projects_delete_own" ON projects
    FOR DELETE USING (auth.uid() = user_id);

-- Los proyectos con enlace vigente se pueden leer sin cuenta
DROP POLICY IF EXISTS "projects_select_shared" ON projects;
CREATE POLICY "projects_select_shared" ON projects
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM project_shares s
            WHERE s.project_id = projects.id
              AND (s.expires_at IS NULL OR s.expires_at > NOW())
        )
    );

-- ---------- budget_items ----------
DROP POLICY IF EXISTS "budget_items_all_own" ON budget_items;
CREATE POLICY "budget_items_all_own" ON budget_items
    FOR ALL USING (
        EXISTS (SELECT 1 FROM projects p WHERE p.id = budget_items.project_id AND p.user_id = auth.uid())
    )
    WITH CHECK (
        EXISTS (SELECT 1 FROM projects p WHERE p.id = budget_items.project_id AND p.user_id = auth.uid())
    );

-- ---------- catalog_items ----------
DROP POLICY IF EXISTS "catalog_items_select" ON catalog_items;
CREATE POLICY "catalog_items_select" ON catalog_items
    FOR SELECT USING (auth.uid() = user_id OR is_public = TRUE);

DROP POLICY IF EXISTS "catalog_items_write_own" ON catalog_items;
CREATE POLICY "catalog_items_write_own" ON catalog_items
    FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ---------- apu_breakdown ----------
DROP POLICY IF EXISTS "apu_breakdown_all_own" ON apu_breakdown;
CREATE POLICY "apu_breakdown_all_own" ON apu_breakdown
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM budget_items b
            JOIN projects p ON p.id = b.project_id
            WHERE b.id = apu_breakdown.budget_item_id AND p.user_id = auth.uid()
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM budget_items b
            JOIN projects p ON p.id = b.project_id
            WHERE b.id = apu_breakdown.budget_item_id AND p.user_id = auth.uid()
        )
    );

-- ---------- project_templates ----------
DROP POLICY IF EXISTS "templates_select" ON project_templates;
CREATE POLICY "templates_select" ON project_templates
    FOR SELECT USING (is_public = TRUE OR auth.uid() = user_id);

DROP POLICY IF EXISTS "templates_write_own" ON project_templates;
CREATE POLICY "templates_write_own" ON project_templates
    FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ---------- pdf_templates ----------
DROP POLICY IF EXISTS "pdf_templates_own" ON pdf_templates;
CREATE POLICY "pdf_templates_own" ON pdf_templates
    FOR ALL TO authenticated
    USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ---------- project_schedules ----------
DROP POLICY IF EXISTS "schedules_all_own" ON project_schedules;
CREATE POLICY "schedules_all_own" ON project_schedules
    FOR ALL USING (
        EXISTS (SELECT 1 FROM projects p WHERE p.id = project_schedules.project_id AND p.user_id = auth.uid())
    )
    WITH CHECK (
        EXISTS (SELECT 1 FROM projects p WHERE p.id = project_schedules.project_id AND p.user_id = auth.uid())
    );

-- ---------- site_logs ----------
DROP POLICY IF EXISTS "site_logs_all_own" ON site_logs;
CREATE POLICY "site_logs_all_own" ON site_logs
    FOR ALL USING (
        EXISTS (SELECT 1 FROM projects p WHERE p.id = site_logs.project_id AND p.user_id = auth.uid())
    )
    WITH CHECK (
        EXISTS (SELECT 1 FROM projects p WHERE p.id = site_logs.project_id AND p.user_id = auth.uid())
    );

-- La bitácora de un proyecto compartido se puede leer con el enlace
DROP POLICY IF EXISTS "site_logs_select_shared" ON site_logs;
CREATE POLICY "site_logs_select_shared" ON site_logs
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM project_shares s
            WHERE s.project_id = site_logs.project_id
              AND (s.expires_at IS NULL OR s.expires_at > NOW())
        )
    );

-- ---------- project_shares ----------
DROP POLICY IF EXISTS "shares_select_public" ON project_shares;
CREATE POLICY "shares_select_public" ON project_shares
    FOR SELECT USING (expires_at IS NULL OR expires_at > NOW());

DROP POLICY IF EXISTS "shares_insert_own" ON project_shares;
CREATE POLICY "shares_insert_own" ON project_shares
    FOR INSERT WITH CHECK (
        EXISTS (SELECT 1 FROM projects p WHERE p.id = project_shares.project_id AND p.user_id = auth.uid())
    );

DROP POLICY IF EXISTS "shares_update_own" ON project_shares;
CREATE POLICY "shares_update_own" ON project_shares
    FOR UPDATE USING (
        created_by = auth.uid() OR
        EXISTS (SELECT 1 FROM projects p WHERE p.id = project_shares.project_id AND p.user_id = auth.uid())
    );

DROP POLICY IF EXISTS "shares_delete_own" ON project_shares;
CREATE POLICY "shares_delete_own" ON project_shares
    FOR DELETE USING (
        created_by = auth.uid() OR
        EXISTS (SELECT 1 FROM projects p WHERE p.id = project_shares.project_id AND p.user_id = auth.uid())
    );

-- ---------- project_share_access ----------
DROP POLICY IF EXISTS "share_access_insert" ON project_share_access;
CREATE POLICY "share_access_insert" ON project_share_access
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM project_shares s
            WHERE s.id = project_share_access.share_id
              AND (s.expires_at IS NULL OR s.expires_at > NOW())
        )
    );

DROP POLICY IF EXISTS "share_access_select_own" ON project_share_access;
CREATE POLICY "share_access_select_own" ON project_share_access
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM project_shares s
            WHERE s.id = project_share_access.share_id
              AND (
                  s.created_by = auth.uid() OR
                  EXISTS (SELECT 1 FROM projects p WHERE p.id = s.project_id AND p.user_id = auth.uid())
              )
        )
    );

-- ---------- activity_log ----------
DROP POLICY IF EXISTS "activity_log_own" ON activity_log;
CREATE POLICY "activity_log_own" ON activity_log
    FOR ALL USING (
        EXISTS (SELECT 1 FROM projects p WHERE p.id = activity_log.project_id AND p.user_id = auth.uid())
    )
    WITH CHECK (
        EXISTS (SELECT 1 FROM projects p WHERE p.id = activity_log.project_id AND p.user_id = auth.uid())
    );

-- ---------- market_price_reference ----------
-- Lectura pública; escritura solo con sesión iniciada.
-- Los scripts de importación masiva usan la service_role key, que se salta el RLS.
DROP POLICY IF EXISTS "market_prices_select" ON market_price_reference;
CREATE POLICY "market_prices_select" ON market_price_reference
    FOR SELECT USING (is_active = TRUE);

DROP POLICY IF EXISTS "market_prices_insert" ON market_price_reference;
CREATE POLICY "market_prices_insert" ON market_price_reference
    FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "market_prices_update" ON market_price_reference;
CREATE POLICY "market_prices_update" ON market_price_reference
    FOR UPDATE TO authenticated USING (true);

-- ---------- user_subscriptions ----------
DROP POLICY IF EXISTS "subscriptions_select_own" ON user_subscriptions;
CREATE POLICY "subscriptions_select_own" ON user_subscriptions
    FOR SELECT USING (auth.uid() = user_id);

-- El panel de Administración cambia planes desde el navegador
DROP POLICY IF EXISTS "subscriptions_admin_all" ON user_subscriptions;
CREATE POLICY "subscriptions_admin_all" ON user_subscriptions
    FOR ALL TO authenticated
    USING ((auth.jwt() ->> 'email') = 'isc20350265@gmail.com')
    WITH CHECK ((auth.jwt() ->> 'email') = 'isc20350265@gmail.com');

-- ---------- user_usage ----------
DROP POLICY IF EXISTS "usage_own" ON user_usage;
CREATE POLICY "usage_own" ON user_usage
    FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ---------- app_settings ----------
-- Cualquier usuario con sesión lee los ajustes públicos (precios, límites),
-- pero NO la fila 'api_keys', que solo ve el administrador.
DROP POLICY IF EXISTS "settings_select_public" ON app_settings;
CREATE POLICY "settings_select_public" ON app_settings
    FOR SELECT TO authenticated USING (key <> 'api_keys');

DROP POLICY IF EXISTS "settings_admin_all" ON app_settings;
CREATE POLICY "settings_admin_all" ON app_settings
    FOR ALL TO authenticated
    USING ((auth.jwt() ->> 'email') = 'isc20350265@gmail.com')
    WITH CHECK ((auth.jwt() ->> 'email') = 'isc20350265@gmail.com');


-- ============================================================
-- 16. DATOS INICIALES
-- ============================================================

-- Perfiles de los usuarios que ya existían antes de crear el trigger
INSERT INTO profiles (id, email, full_name)
SELECT
    u.id,
    u.email,
    COALESCE(u.raw_user_meta_data ->> 'full_name', u.raw_user_meta_data ->> 'name', '')
FROM auth.users u
ON CONFLICT (id) DO NOTHING;

-- Categorías de proyecto
INSERT INTO categories (name, description) VALUES
    ('Residencial',   'Casas, departamentos y vivienda en general'),
    ('Comercial',     'Locales, oficinas y plazas comerciales'),
    ('Industrial',    'Naves, bodegas y plantas industriales'),
    ('Remodelación',  'Reformas, ampliaciones y mantenimiento'),
    ('Obra Civil',    'Urbanización, calles y servicios'),
    ('Instalaciones', 'Eléctrica, hidráulica, sanitaria y especiales')
ON CONFLICT (name) DO NOTHING;

-- Precios de referencia de arranque
INSERT INTO market_price_reference (description, unit, category, location, base_price, price_range, source, metadata) VALUES
    ('Cemento gris Portland 50 kg', 'bulto', 'Materiales', 'México', 280.00, '{"min": 260, "max": 300, "avg": 280}', 'manual', '{"year": 2024, "common": true}'),
    ('Varilla corrugada #3 (3/8") 12 m', 'pieza', 'Materiales', 'México', 185.00, '{"min": 170, "max": 200, "avg": 185}', 'manual', '{"year": 2024, "common": true}'),
    ('Block hueco 15x20x40 cm', 'pieza', 'Materiales', 'México', 12.50, '{"min": 11, "max": 14, "avg": 12.5}', 'manual', '{"year": 2024, "common": true}'),
    ('Arena cernida m³', 'm3', 'Materiales', 'México', 450.00, '{"min": 400, "max": 500, "avg": 450}', 'manual', '{"year": 2024, "common": true}'),
    ('Grava triturada 3/4" m³', 'm3', 'Materiales', 'México', 520.00, '{"min": 480, "max": 560, "avg": 520}', 'manual', '{"year": 2024, "common": true}'),
    ('Oficial albañil', 'jornal', 'Mano de Obra', 'México', 500.00, '{"min": 450, "max": 550, "avg": 500}', 'manual', '{"year": 2024, "common": true}'),
    ('Ayudante de albañil', 'jornal', 'Mano de Obra', 'México', 350.00, '{"min": 300, "max": 400, "avg": 350}', 'manual', '{"year": 2024, "common": true}'),
    ('Plomero', 'jornal', 'Mano de Obra', 'México', 600.00, '{"min": 550, "max": 650, "avg": 600}', 'manual', '{"year": 2024, "common": true}'),
    ('Electricista', 'jornal', 'Mano de Obra', 'México', 650.00, '{"min": 600, "max": 700, "avg": 650}', 'manual', '{"year": 2024, "common": true}'),
    ('Carpintero', 'jornal', 'Mano de Obra', 'México', 550.00, '{"min": 500, "max": 600, "avg": 550}', 'manual', '{"year": 2024, "common": true}'),
    ('Excavación a mano en material tipo I', 'm3', 'Obra Civil', 'México', 280.00, '{"min": 250, "max": 320, "avg": 280}', 'manual', '{"year": 2024, "common": true}'),
    ('Cimentación de concreto f''c=150 kg/cm²', 'm3', 'Obra Civil', 'México', 2800.00, '{"min": 2600, "max": 3000, "avg": 2800}', 'manual', '{"year": 2024, "common": true}'),
    ('Mampostería de block 15x20x40 con mortero 1:4', 'm2', 'Obra Civil', 'México', 420.00, '{"min": 380, "max": 460, "avg": 420}', 'manual', '{"year": 2024, "common": true}'),
    ('Aplanado fino con mortero cemento-arena 1:3', 'm2', 'Obra Civil', 'México', 180.00, '{"min": 160, "max": 200, "avg": 180}', 'manual', '{"year": 2024, "common": true}'),
    ('Pintura vinílica en muros a dos manos', 'm2', 'Obra Civil', 'México', 65.00, '{"min": 55, "max": 75, "avg": 65}', 'manual', '{"year": 2024, "common": true}'),
    ('Salida eléctrica sencilla', 'pieza', 'Instalaciones', 'México', 450.00, '{"min": 400, "max": 500, "avg": 450}', 'manual', '{"year": 2024, "common": true}'),
    ('Contacto sencillo 127V', 'pieza', 'Instalaciones', 'México', 280.00, '{"min": 250, "max": 310, "avg": 280}', 'manual', '{"year": 2024, "common": true}'),
    ('Lavabo sencillo económico', 'pieza', 'Instalaciones', 'México', 850.00, '{"min": 750, "max": 950, "avg": 850}', 'manual', '{"year": 2024, "common": true}'),
    ('Taza de baño económica', 'pieza', 'Instalaciones', 'México', 1200.00, '{"min": 1100, "max": 1300, "avg": 1200}', 'manual', '{"year": 2024, "common": true}'),
    ('Revolvedora 1 saco', 'hora', 'Equipos', 'México', 120.00, '{"min": 100, "max": 140, "avg": 120}', 'manual', '{"year": 2024, "common": true}'),
    ('Vibrador para concreto', 'hora', 'Equipos', 'México', 80.00, '{"min": 70, "max": 90, "avg": 80}', 'manual', '{"year": 2024, "common": true}'),
    ('Cortadora de block', 'hora', 'Equipos', 'México', 150.00, '{"min": 130, "max": 170, "avg": 150}', 'manual', '{"year": 2024, "common": true}')
ON CONFLICT DO NOTHING;


-- ============================================================
-- 17. COMPROBACIÓN FINAL
-- ============================================================
-- Debe devolver 17 tablas y 4 funciones.

SELECT 'tablas creadas: ' || COUNT(*)::text AS resultado
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN (
      'profiles', 'categories', 'projects', 'budget_items', 'catalog_items',
      'apu_breakdown', 'project_templates', 'project_schedules', 'site_logs',
      'project_shares', 'project_share_access', 'activity_log',
      'market_price_reference', 'user_subscriptions', 'user_usage', 'app_settings',
      'pdf_templates'
  )
UNION ALL
SELECT 'funciones creadas: ' || COUNT(*)::text
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name IN ('update_updated_at_column', 'handle_new_user', 'get_user_tier', 'increment_user_usage');
