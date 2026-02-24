-- Migration: Project Sharing Functionality
-- Permite compartir proyectos con clientes mediante enlaces seguros

-- Extender tabla project_shares si no existe completamente
CREATE TABLE IF NOT EXISTS project_shares (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    share_token TEXT UNIQUE NOT NULL,
    share_code TEXT UNIQUE, -- Código corto opcional (ej: ABC123)
    expires_at TIMESTAMP WITH TIME ZONE,
    can_edit BOOLEAN DEFAULT FALSE,
    password TEXT, -- Contraseña opcional para proteger el enlace
    access_count INTEGER DEFAULT 0,
    last_accessed_at TIMESTAMP WITH TIME ZONE,
    allowed_emails TEXT[], -- Emails permitidos (opcional)
    metadata JSONB DEFAULT '{}'::jsonb, -- Datos adicionales
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabla para tracking de accesos
CREATE TABLE IF NOT EXISTS project_share_access (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    share_id UUID REFERENCES project_shares(id) ON DELETE CASCADE,
    accessed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    ip_address TEXT,
    user_agent TEXT,
    metadata JSONB DEFAULT '{}'::jsonb
);

-- Índices para mejor rendimiento
CREATE INDEX IF NOT EXISTS idx_project_shares_token ON project_shares(share_token);
CREATE INDEX IF NOT EXISTS idx_project_shares_code ON project_shares(share_code);
CREATE INDEX IF NOT EXISTS idx_project_shares_project_id ON project_shares(project_id);
CREATE INDEX IF NOT EXISTS idx_project_share_access_share_id ON project_share_access(share_id);
CREATE INDEX IF NOT EXISTS idx_project_share_access_accessed_at ON project_share_access(accessed_at);

-- Habilitar RLS
ALTER TABLE project_shares ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_share_access ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para project_shares
CREATE POLICY "Users can view their own shares" ON project_shares
    FOR SELECT USING (
        created_by = auth.uid() OR
        EXISTS (
            SELECT 1 FROM projects 
            WHERE projects.id = project_shares.project_id 
            AND projects.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can create shares for their projects" ON project_shares
    FOR INSERT WITH CHECK (
        created_by = auth.uid() AND
        EXISTS (
            SELECT 1 FROM projects 
            WHERE projects.id = project_shares.project_id 
            AND projects.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update their own shares" ON project_shares
    FOR UPDATE USING (
        created_by = auth.uid() OR
        EXISTS (
            SELECT 1 FROM projects 
            WHERE projects.id = project_shares.project_id 
            AND projects.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete their own shares" ON project_shares
    FOR DELETE USING (
        created_by = auth.uid() OR
        EXISTS (
            SELECT 1 FROM projects 
            WHERE projects.id = project_shares.project_id 
            AND projects.user_id = auth.uid()
        )
    );

-- Políticas RLS para project_share_access (solo lectura para creador)
CREATE POLICY "Users can view access logs of their shares" ON project_share_access
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM project_shares
            WHERE project_shares.id = project_share_access.share_id
            AND (
                project_shares.created_by = auth.uid() OR
                EXISTS (
                    SELECT 1 FROM projects
                    WHERE projects.id = project_shares.project_id
                    AND projects.user_id = auth.uid()
                )
            )
        )
    );

-- Política para permitir insertar accesos (público con token)
CREATE POLICY "Anyone can log share access with valid token" ON project_share_access
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM project_shares
            WHERE project_shares.id = project_share_access.share_id
            AND (project_shares.expires_at IS NULL OR project_shares.expires_at > NOW())
        )
    );

-- Política para permitir lectura pública de shares válidos (sin autenticación)
CREATE POLICY "Public can view valid shares by token" ON project_shares
    FOR SELECT USING (
        (expires_at IS NULL OR expires_at > NOW())
    );

-- Las funciones de generación de tokens se manejan en el código JavaScript
-- para mayor flexibilidad y evitar dependencias de funciones RPC

-- Trigger para actualizar updated_at
CREATE OR REPLACE FUNCTION update_project_shares_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_project_shares_timestamp
    BEFORE UPDATE ON project_shares
    FOR EACH ROW
    EXECUTE FUNCTION update_project_shares_updated_at();

-- Comentarios para documentación
COMMENT ON TABLE project_shares IS 'Enlaces compartidos para proyectos. Permite compartir presupuestos con clientes sin necesidad de cuenta.';
COMMENT ON TABLE project_share_access IS 'Registro de accesos a enlaces compartidos para tracking y analytics.';
COMMENT ON COLUMN project_shares.share_token IS 'Token único y seguro para acceder al proyecto compartido';
COMMENT ON COLUMN project_shares.share_code IS 'Código corto opcional (6 caracteres) para compartir fácilmente';
COMMENT ON COLUMN project_shares.expires_at IS 'Fecha de expiración del enlace. NULL = sin expiración';

