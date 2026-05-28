# 🔧 Solución de Error al Compartir Proyectos

Si encuentras el error `400` al intentar crear un enlace compartido, sigue estos pasos:

## ✅ Verificaciones Necesarias

### 1. Ejecutar Migración SQL

**IMPORTANTE:** La tabla `project_shares` debe existir en Supabase.

Ejecuta la migración en Supabase SQL Editor:

```sql
-- Copiar y ejecutar el contenido completo de:
-- supabase/migrations_sharing.sql
```

O ejecuta manualmente:

```sql
-- Crear tabla project_shares
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

-- Crear tabla project_share_access
CREATE TABLE IF NOT EXISTS project_share_access (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    share_id UUID REFERENCES project_shares(id) ON DELETE CASCADE,
    accessed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    ip_address TEXT,
    user_agent TEXT,
    metadata JSONB DEFAULT '{}'::jsonb
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_project_shares_token ON project_shares(share_token);
CREATE INDEX IF NOT EXISTS idx_project_shares_code ON project_shares(share_code);
CREATE INDEX IF NOT EXISTS idx_project_shares_project_id ON project_shares(project_id);
CREATE INDEX IF NOT EXISTS idx_project_share_access_share_id ON project_share_access(share_id);

-- Habilitar RLS
ALTER TABLE project_shares ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_share_access ENABLE ROW LEVEL SECURITY;
```

### 2. Configurar Políticas RLS

Ejecuta las políticas RLS (están en el archivo de migración completo):

```sql
-- Políticas para project_shares
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

CREATE POLICY "Public can view valid shares by token" ON project_shares
    FOR SELECT USING (
        (expires_at IS NULL OR expires_at > NOW())
    );

-- Y las demás políticas del archivo migrations_sharing.sql
```

### 3. Verificar que el Proyecto Existe

Asegúrate de:
- ✅ El proyecto está guardado en Supabase
- ✅ El proyecto pertenece al usuario autenticado
- ✅ El `project_id` es válido (UUID)

### 4. Verificar Consola del Navegador

Revisa la consola del navegador (F12) para ver el error exacto:

- Si dice "Table project_shares does not exist" → Ejecutar migración SQL
- Si dice "Permission denied" → Verificar políticas RLS
- Si dice "Invalid token" → Problema con autenticación

## 🔍 Debug

Si el problema persiste:

1. **Verificar conexión a Supabase:**
   - Revisa que las variables de entorno estén configuradas
   - Verifica que el cliente de Supabase esté inicializado

2. **Verificar permisos:**
   - Asegúrate de estar autenticado
   - Verifica que el proyecto pertenezca al usuario

3. **Revisar logs de Supabase:**
   - Ve a Supabase Dashboard → Logs
   - Busca errores relacionados con `project_shares`

## 📝 Cambios Realizados

Se corrigieron los siguientes problemas en `ShareService.js`:

1. ✅ **Manejo de errores mejorado** - Mejor detección de errores específicos
2. ✅ **Verificación de proyecto** - Valida que el proyecto existe antes de crear share
3. ✅ **Validación de permisos** - Verifica que el usuario tenga permisos
4. ✅ **Consultas separadas** - Busca por token y código corto por separado (evita problemas con `.or()`)
5. ✅ **Mensajes de error claros** - Información más útil cuando falla

## ⚠️ Error Común: "400 Bad Request"

Si ves este error, normalmente significa:
- La tabla no existe → **Ejecutar migración SQL**
- Las políticas RLS están bloqueando → **Verificar políticas**
- El proyecto no existe → **Guardar el proyecto primero**
- Formato de datos inválido → **Verificar estructura de datos**

---

**Última actualización:** ${new Date().toLocaleDateString('es-MX')}

