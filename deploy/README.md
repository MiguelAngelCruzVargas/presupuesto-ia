# Backend en el VPS

El proxy de IA y la subida de fotos corren en el VPS de Contabo
(`169.58.78.148`), en Docker detrás de Caddy.

| | |
|---|---|
| URL pública | https://presupuesto.169-58-78-148.sslip.io |
| Contenedor | `presupuesto-backend` (puerto interno 8011) |
| Código | `/opt/presupuesto` |
| Variables | `/opt/presupuesto/.env` (permisos 600, fuera del repo) |
| Fotos | volumen Docker `presupuesto-uploads` → `/app/uploads` |
| Logs de Caddy | `/var/log/caddy/presupuesto.log` |

Comparte la máquina con `fiscalia-backend` (puerto 8010), que no se toca.

## Por qué así

- **Volumen Docker para las fotos**: si vivieran dentro del contenedor se
  borrarían en cada redespliegue, y las URLs guardadas en `site_logs.photos`
  quedarían apuntando a archivos inexistentes.
- **Node 22 y no 20**: `@supabase/supabase-js` necesita WebSocket nativo, que
  llegó en la 22. Con la 20 el contenedor arranca y muere en bucle.
- **sslip.io**: `presupuesto.169-58-78-148.sslip.io` resuelve solo a la IP del
  VPS, así Let's Encrypt emite certificado sin comprar dominio.
- **Solo escucha en 127.0.0.1**: nadie llega al backend sin pasar por Caddy.

## Redesplegar

Desde la raíz del proyecto, en Git Bash:

```bash
# 1. Empaquetar (sin node_modules ni .env)
tar czf /tmp/backend.tgz src deploy

# 2. Subir  (MSYS_NO_PATHCONV evita que Git Bash traduzca la ruta remota)
cd ../../progrmas_de_python/crypto_oracle-main/contabo-mcp
MSYS_NO_PATHCONV=1 python contabo_mcp.py vps_subir /tmp/backend.tgz /opt/presupuesto/backend.tgz

# 3. Reconstruir y relanzar
MSYS_NO_PATHCONV=1 PYTHONIOENCODING=utf-8 python contabo_mcp.py vps_ssh \
  "cd /opt/presupuesto && tar xzf backend.tgz && rm backend.tgz && \
   docker build -f deploy/Dockerfile -t presupuesto-backend:latest . && \
   docker rm -f presupuesto-backend; \
   docker run -d --name presupuesto-backend --restart unless-stopped \
     --env-file /opt/presupuesto/.env \
     -v presupuesto-uploads:/app/uploads \
     -p 127.0.0.1:8011:8011 presupuesto-backend:latest"
```

Comprobar que quedó bien:

```bash
curl https://presupuesto.169-58-78-148.sslip.io/api/ai/health
```

## Cambiar una clave de IA

Editar `/opt/presupuesto/.env` en el VPS y reiniciar:
`docker restart presupuesto-backend`. Las claves nunca van al repositorio,
que es público.

## Pendientes conocidos

- **Sin respaldo de las fotos.** El volumen vive solo en este VPS. Un fallo de
  disco se las lleva. Falta contratar el backup de Contabo o montar un rsync.
- **`ImageUploadService.deleteImage` no borra nada**: es un `console.log` con un
  TODO, y el backend no tiene endpoint de borrado. Las fotos que el usuario
  quita del reporte se quedan ocupando disco para siempre.
