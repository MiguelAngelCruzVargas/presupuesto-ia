# 📤 Funcionalidad de Compartir Proyectos

Esta funcionalidad permite compartir presupuestos con clientes mediante enlaces seguros, sin necesidad de que el cliente tenga una cuenta.

## 🚀 Características Implementadas

### ✅ Funcionalidades Principales

1. **Enlaces Compartidos Seguros**
   - Token único por enlace
   - Código corto opcional (6 caracteres) para compartir fácilmente
   - Enlaces no expiran por defecto (configurable)

2. **Protección con Contraseña**
   - Opcional: proteger enlaces con contraseña
   - Solo lectura o edición según configuración

3. **Tracking de Accesos**
   - Contador de visualizaciones
   - Registro de último acceso
   - Historial de accesos (próximamente)

4. **Vista Pública Elegante**
   - Diseño limpio y profesional para clientes
   - Sin necesidad de crear cuenta
   - Descarga de PDF disponible

## 📁 Archivos Creados/Modificados

### Nuevos Archivos

1. **`supabase/migrations_sharing.sql`**
   - Tabla `project_shares`: Almacena enlaces compartidos
   - Tabla `project_share_access`: Tracking de accesos
   - Políticas RLS para seguridad

2. **`src/services/ShareService.js`**
   - Servicio completo para manejar shares
   - Crear, leer, actualizar, eliminar shares
   - Verificación de contraseñas
   - Tracking de accesos

3. **`src/pages/SharedProjectPage.jsx`**
   - Página pública para ver presupuestos compartidos
   - Manejo de contraseñas
   - Vista elegante para clientes

4. **`src/components/sharing/ShareProjectModal.jsx`**
   - Modal para gestionar enlaces compartidos
   - Crear nuevos enlaces
   - Ver enlaces existentes
   - Copiar enlaces al portapapeles

### Archivos Modificados

1. **`src/App.jsx`**
   - Rutas públicas para enlaces compartidos:
     - `/share/:token` - Enlace completo
     - `/s/:token` - Código corto

2. **`src/pages/Editor.jsx`**
   - Botón "Compartir" en el header
   - Integración del modal de compartir

## 🔧 Instalación

### 1. Ejecutar Migración SQL

Ejecuta la migración en Supabase:

```sql
-- Ejecutar el archivo: supabase/migrations_sharing.sql
```

O ejecuta manualmente desde el SQL Editor de Supabase.

### 2. Verificar Políticas RLS

Las políticas RLS están configuradas para:
- ✅ Usuarios pueden ver/gestionar sus propios shares
- ✅ Acceso público a shares válidos (sin autenticación)
- ✅ Tracking de accesos permitido públicamente

## 📖 Uso

### Para el Usuario (Constructor)

1. **Abrir el Editor** de un proyecto guardado
2. **Hacer clic en "Compartir"** en el header
3. **Configurar el enlace**:
   - Expiración (opcional)
   - Contraseña (opcional)
   - Código corto (opcional)
4. **Copiar el enlace** y enviarlo al cliente

### Para el Cliente

1. **Abrir el enlace** recibido
2. **Ingresar contraseña** (si está protegido)
3. **Ver el presupuesto** completo
4. **Descargar PDF** si lo desea

## 🔐 Seguridad

### Implementado

- ✅ Tokens únicos y seguros
- ✅ Verificación de expiración
- ✅ Protección con contraseña opcional
- ✅ RLS para proteger datos

### Mejoras Futuras

- [ ] Encriptación de contraseñas (hash)
- [ ] Límite de accesos por enlace
- [ ] Restricción por IP
- [ ] Notificaciones cuando se accede al enlace

## 🎯 Próximas Mejoras

1. **Comentarios del Cliente**
   - Permitir al cliente dejar comentarios en el presupuesto
   - Notificaciones de nuevos comentarios

2. **Aprobaciones**
   - El cliente puede aprobar/rechazar el presupuesto
   - Firma digital opcional

3. **Versiones**
   - Historial de cambios cuando se actualiza
   - Comparación de versiones

4. **Analytics Avanzados**
   - Gráficos de accesos
   - Tiempo promedio de visualización
   - Dispositivos desde los que se accede

## 📝 Notas Técnicas

### Estructura de Datos

**project_shares:**
- `id`: UUID único
- `project_id`: Referencia al proyecto
- `share_token`: Token único para el enlace
- `share_code`: Código corto opcional (6 caracteres)
- `expires_at`: Fecha de expiración (NULL = sin expiración)
- `password`: Contraseña opcional (sin hash por ahora)
- `access_count`: Contador de accesos
- `last_accessed_at`: Última vez que se accedió

**project_share_access:**
- `id`: UUID único
- `share_id`: Referencia al share
- `accessed_at`: Fecha y hora del acceso
- `ip_address`: IP del cliente
- `user_agent`: Navegador utilizado

### Generación de Tokens

Los tokens se generan en JavaScript usando:
- `crypto.getRandomValues()` para seguridad
- Base64URL encoding para URLs seguras
- Sin caracteres confusos en códigos cortos

### URLs

- Enlace completo: `https://tu-dominio.com/share/{token}`
- Código corto: `https://tu-dominio.com/s/{code}`

Ambos apuntan a la misma página y funcionan igual.

---

**Última actualización:** ${new Date().toLocaleDateString('es-MX')}

