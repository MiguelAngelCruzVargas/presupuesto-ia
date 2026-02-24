-- Tabla para guardar el cronograma generado
CREATE TABLE IF NOT EXISTS project_schedules (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    tasks JSONB NOT NULL, -- Guardamos el array de tareas completo
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabla para la bitácora (logs diarios por tarea)
CREATE TABLE IF NOT EXISTS site_logs (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    task_id TEXT NOT NULL, -- ID de la tarea dentro del JSON del cronograma
    log_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    content TEXT, -- Notas o descripción del avance
    photos JSONB DEFAULT '[]'::jsonb, -- Array de URLs de fotos
    progress_percentage INTEGER DEFAULT 0,
    
    -- Nuevos campos para Bitácora Profesional
    note_number INTEGER, -- Folio consecutivo por proyecto
    classification TEXT CHECK (classification IN ('Apertura', 'Orden', 'Solicitud', 'Autorización', 'Informe', 'Cierre', 'Otro')),
    author_role TEXT CHECK (author_role IN ('Supervisor', 'Residente', 'Superintendente', 'Otro')),
    status TEXT DEFAULT 'Abierta' CHECK (status IN ('Abierta', 'Cerrada')),
    subject TEXT, -- Asunto de la nota
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Políticas de seguridad (RLS)
ALTER TABLE project_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE site_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own schedules" ON project_schedules
    FOR ALL USING (auth.uid() IN (SELECT user_id FROM projects WHERE id = project_schedules.project_id));

CREATE POLICY "Users can manage their own logs" ON site_logs
    FOR ALL USING (auth.uid() IN (SELECT user_id FROM projects WHERE id = site_logs.project_id));

-- Índices para mejorar rendimiento
CREATE INDEX IF NOT EXISTS idx_site_logs_project_id ON site_logs(project_id);
CREATE INDEX IF NOT EXISTS idx_site_logs_task_id ON site_logs(task_id);
