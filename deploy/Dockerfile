# Backend de presupuesto-ia (proxy de IA + subida de fotos) para el VPS.
#
# Mismo patrón que fiscalia-backend en esta máquina: el contenedor escucha
# solo en 127.0.0.1 y Caddy hace de puerta con HTTPS automático.
#
# Node 22 y no 20: @supabase/supabase-js necesita WebSocket nativo, que
# Node añadió en la 22. Con la 20 el contenedor arranca y muere en bucle con
# "Node.js 20 detected without native WebSocket support".
FROM node:22-slim

WORKDIR /app

# Solo las dependencias del backend (deploy/package.json), no las del frontend.
# Se copia primero para que Docker reutilice la capa si no cambian.
COPY deploy/package.json ./package.json
RUN npm install --omit=dev --no-audit --no-fund

# El servidor importa ApiKeyManager -> SystemSettingsService -> supabaseClient,
# por eso se copia src/ completo y no solo lib/.
COPY src ./src

# aiProxyServer resuelve las subidas como __dirname/../../uploads, o sea
# /app/uploads. Se monta como volumen para que sobrevivan al redespliegue.
RUN mkdir -p /app/uploads
VOLUME ["/app/uploads"]

ENV NODE_ENV=production
ENV PORT=8011
EXPOSE 8011

CMD ["node", "src/lib/aiProxyServer.js"]
