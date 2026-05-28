-- 1. Crear función auxiliar con SECURITY DEFINER para verificar si el proyecto está compartido
-- Esto evita recursión infinita en RLS al no evaluar RLS de project_shares con los permisos del usuario actual
CREATE OR REPLACE FUNCTION public.check_project_sharing(p_project_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.project_shares
        WHERE project_id = p_project_id
        AND (expires_at IS NULL OR expires_at > NOW())
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 2. Conceder permisos de ejecución a los roles anon y authenticated
GRANT EXECUTE ON FUNCTION public.check_project_sharing(UUID) TO authenticated, anon, public;

-- 3. Eliminar política anterior de selección pública si existiera
DROP POLICY IF EXISTS "Allow select for shared projects" ON projects;

-- 4. Crear nueva política en projects para permitir lectura si el proyecto tiene un enlace compartido activo
CREATE POLICY "Allow select for shared projects" ON projects
    FOR SELECT USING (
        public.check_project_sharing(id)
    );
