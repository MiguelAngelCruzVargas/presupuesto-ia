-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- TABLES
-- ============================================

-- Projects table
CREATE TABLE IF NOT EXISTS projects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    client TEXT,
    type TEXT DEFAULT 'General',
    currency TEXT DEFAULT 'MXN',
    tax_rate NUMERIC DEFAULT 16,
    indirect_percentage NUMERIC DEFAULT 0,
    profit_percentage NUMERIC DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Budget items table
CREATE TABLE IF NOT EXISTS budget_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    description TEXT NOT NULL,
    unit TEXT DEFAULT 'pza',
    quantity NUMERIC DEFAULT 1,
    unit_price NUMERIC DEFAULT 0,
    category TEXT DEFAULT 'Materiales',
    subcategory TEXT,
    tags TEXT[],
    notes TEXT,
    is_catalog_item BOOLEAN DEFAULT FALSE,
    order_index INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Catalog items table
CREATE TABLE IF NOT EXISTS catalog_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    description TEXT NOT NULL,
    unit TEXT DEFAULT 'pza',
    unit_price NUMERIC DEFAULT 0,
    category TEXT DEFAULT 'Materiales',
    subcategory TEXT,
    is_public BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- APU (Análisis de Precios Unitarios) breakdown table
CREATE TABLE IF NOT EXISTS apu_breakdown (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    budget_item_id UUID REFERENCES budget_items(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('material', 'labor', 'equipment')),
    name TEXT NOT NULL,
    parent_id UUID REFERENCES categories(id) ON DELETE CASCADE,
    color TEXT DEFAULT '#3B82F6',
    icon TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Project templates table
CREATE TABLE IF NOT EXISTS project_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
    type TEXT DEFAULT 'General',
    template_data JSONB,
    is_public BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Project shares table
CREATE TABLE IF NOT EXISTS project_shares (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    share_token TEXT UNIQUE NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE,
    can_edit BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Activity log table
CREATE TABLE IF NOT EXISTS activity_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    action TEXT NOT NULL,
    details JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- INDEXES
-- ============================================

CREATE INDEX IF NOT EXISTS idx_projects_user_id ON projects(user_id);
CREATE INDEX IF NOT EXISTS idx_budget_items_project_id ON budget_items(project_id);
CREATE INDEX IF NOT EXISTS idx_budget_items_order ON budget_items(project_id, order_index);
CREATE INDEX IF NOT EXISTS idx_catalog_items_user_id ON catalog_items(user_id);
CREATE INDEX IF NOT EXISTS idx_apu_breakdown_item_id ON apu_breakdown(budget_item_id);
CREATE INDEX IF NOT EXISTS idx_activity_log_project_id ON activity_log(project_id);
CREATE INDEX IF NOT EXISTS idx_project_shares_token ON project_shares(share_token);

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================

-- Enable RLS on all tables
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE budget_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE catalog_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE apu_breakdown ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_shares ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_log ENABLE ROW LEVEL SECURITY;

-- Projects policies
CREATE POLICY "Users can view their own projects" ON projects
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own projects" ON projects
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own projects" ON projects
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own projects" ON projects
    FOR DELETE USING (auth.uid() = user_id);

-- Budget items policies
CREATE POLICY "Users can view budget items of their projects" ON budget_items
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM projects 
            WHERE projects.id = budget_items.project_id 
            AND projects.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert budget items to their projects" ON budget_items
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM projects 
            WHERE projects.id = budget_items.project_id 
            AND projects.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update budget items of their projects" ON budget_items
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM projects 
            WHERE projects.id = budget_items.project_id 
            AND projects.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete budget items of their projects" ON budget_items
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM projects 
            WHERE projects.id = budget_items.project_id 
            AND projects.user_id = auth.uid()
        )
    );

-- Catalog items policies
CREATE POLICY "Users can view their own and public catalog items" ON catalog_items
    FOR SELECT USING (auth.uid() = user_id OR is_public = TRUE);

CREATE POLICY "Users can insert their own catalog items" ON catalog_items
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own catalog items" ON catalog_items
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own catalog items" ON catalog_items
    FOR DELETE USING (auth.uid() = user_id);

-- APU breakdown policies
CREATE POLICY "Users can view APU of their budget items" ON apu_breakdown
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM budget_items 
            JOIN projects ON projects.id = budget_items.project_id
            WHERE budget_items.id = apu_breakdown.budget_item_id 
            AND projects.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert APU to their budget items" ON apu_breakdown
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM budget_items 
            JOIN projects ON projects.id = budget_items.project_id
            WHERE budget_items.id = apu_breakdown.budget_item_id 
            AND projects.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update APU of their budget items" ON apu_breakdown
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM budget_items 
            JOIN projects ON projects.id = budget_items.project_id
            WHERE budget_items.id = apu_breakdown.budget_item_id 
            AND projects.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete APU of their budget items" ON apu_breakdown
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM budget_items 
            JOIN projects ON projects.id = budget_items.project_id
            WHERE budget_items.id = apu_breakdown.budget_item_id 
            AND projects.user_id = auth.uid()
        )
    );

-- Project templates policies
CREATE POLICY "Users can view their own and public templates" ON project_templates
    FOR SELECT USING (auth.uid() = user_id OR is_public = TRUE);

CREATE POLICY "Users can insert their own templates" ON project_templates
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own templates" ON project_templates
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own templates" ON project_templates
    FOR DELETE USING (auth.uid() = user_id);

-- Categories policies
CREATE POLICY "Users can view their own categories" ON categories
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own categories" ON categories
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own categories" ON categories
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own categories" ON categories
    FOR DELETE USING (auth.uid() = user_id);

-- Project shares policies (anyone with token can view)
CREATE POLICY "Anyone can view shared projects with valid token" ON project_shares
    FOR SELECT USING (TRUE);

CREATE POLICY "Users can create shares for their projects" ON project_shares
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM projects 
            WHERE projects.id = project_shares.project_id 
            AND projects.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete shares of their projects" ON project_shares
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM projects 
            WHERE projects.id = project_shares.project_id 
            AND projects.user_id = auth.uid()
        )
    );

-- Activity log policies
CREATE POLICY "Users can view activity of their projects" ON activity_log
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM projects 
            WHERE projects.id = activity_log.project_id 
            AND projects.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert activity for their projects" ON activity_log
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM projects 
            WHERE projects.id = activity_log.project_id 
            AND projects.user_id = auth.uid()
        )
    );

-- ============================================
-- FUNCTIONS
-- ============================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for projects table
CREATE TRIGGER update_projects_updated_at BEFORE UPDATE ON projects
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- SEED DATA (Optional default categories)
-- ============================================

-- Note: This will only work if there's at least one user
-- You can run this manually after creating your first user
-- INSERT INTO categories (user_id, name, color, icon) VALUES
-- ((SELECT id FROM auth.users LIMIT 1), 'Materiales', '#3B82F6', 'package'),
-- ((SELECT id FROM auth.users LIMIT 1), 'Mano de Obra', '#10B981', 'users'),
-- ((SELECT id FROM auth.users LIMIT 1), 'Equipos', '#F59E0B', 'truck'),
-- ((SELECT id FROM auth.users LIMIT 1), 'Instalaciones', '#8B5CF6', 'zap'),
-- ((SELECT id FROM auth.users LIMIT 1), 'Obra Civil', '#F97316', 'hammer');
