# Agent Task Pack: presupuesto-ia

## Tarea Solicitada
Ajusta el perfil del usuario y encuentra los archivos que debo modificar.

## Qué Hace el Proyecto
- Resumen: presupuesto-ia usa React, JavaScript, CSS, SCSS/Sass, Vite, Vue y tiene como entry points presupuesto-ia/src/App.jsx, presupuesto-ia/src/main.jsx.
- Stack: React, JavaScript, CSS, SCSS/Sass, Vite, Vue, Tailwind CSS, Express.js
- Entry points: presupuesto-ia/src/App.jsx, presupuesto-ia/src/main.jsx

## Archivos Primarios a Revisar
- `presupuesto-ia/src/pages/Login.jsx` (impacto: 0, score: 35)
  - Se alinea semánticamente con "login"
  - La ruta sugiere relación con "login"
  - Es un componente o pantalla de UI relevante para la tarea
- `presupuesto-ia/src/context/AuthContext.jsx` (impacto: 0, score: 24)
  - El contenido menciona "usuario"
  - Se alinea semánticamente con "auth"
  - La ruta sugiere relación con "auth"
- `presupuesto-ia/src/components/auth/AdminRoute.jsx` (impacto: 0, score: 20)
  - El contenido menciona "usuario"
  - La ruta sugiere relación con "auth"
  - Es un componente o pantalla de UI relevante para la tarea
- `presupuesto-ia/src/components/auth/InactivityHandler.jsx` (impacto: 0, score: 20)
  - El contenido menciona "usuario"
  - La ruta sugiere relación con "auth"
  - Es un componente o pantalla de UI relevante para la tarea
- `presupuesto-ia/src/components/auth/ChangePasswordModal.jsx` (impacto: 0, score: 18)
  - La ruta sugiere relación con "auth"
  - Es un componente o pantalla de UI relevante para la tarea
- `presupuesto-ia/src/services/UserSubscriptionService.js` (impacto: 0, score: 13)
  - El contenido menciona "usuario"
  - Se alinea semánticamente con "user"
  - La ruta sugiere relación con "user"

## Archivos Relacionados
- `presupuesto-ia/src/services/SubscriptionService.js`
  - Está conectado por dependencia con un archivo primario
  - Puede resolver la capa de integración o datos
- `presupuesto-ia/src/context/ProjectContext.jsx`
  - Está conectado por dependencia con un archivo primario
  - Puede propagar estado o contexto relacionado
- `presupuesto-ia/src/context/SubscriptionContext.jsx`
  - Está conectado por dependencia con un archivo primario
  - Puede propagar estado o contexto relacionado
- `presupuesto-ia/src/services/ApiKeyManager.js`
  - Está conectado por dependencia con un archivo primario
  - Puede resolver la capa de integración o datos
- `presupuesto-ia/src/App.jsx`
  - Está conectado por dependencia con un archivo primario
- `presupuesto-ia/src/components/layout/Sidebar.jsx`
  - Está conectado por dependencia con un archivo primario
- `presupuesto-ia/src/components/ProtectedRoute.jsx`
  - Está conectado por dependencia con un archivo primario
- `presupuesto-ia/src/components/support/SupportChat.jsx`
  - Está conectado por dependencia con un archivo primario

## Orden de Lectura Recomendado
1. `presupuesto-ia/src/App.jsx`
2. `presupuesto-ia/src/main.jsx`
3. `presupuesto-ia/src/pages/Login.jsx`
4. `presupuesto-ia/src/context/AuthContext.jsx`
5. `presupuesto-ia/src/components/auth/AdminRoute.jsx`
6. `presupuesto-ia/src/components/auth/InactivityHandler.jsx`
7. `presupuesto-ia/src/services/SubscriptionService.js`
8. `presupuesto-ia/src/context/ProjectContext.jsx`
9. `presupuesto-ia/src/context/SubscriptionContext.jsx`

## Instrucciones para el Agente
1. Empieza por los archivos primarios y confirma si contienen la UI, lógica o integración principal de la tarea.
2. Después revisa archivos relacionados para detectar dependencias laterales, estado compartido y posibles regresiones.
3. Si modificas un hotspot, valida entradas y salidas del módulo antes de aplicar cambios.
4. Términos guía detectados: ajusta, perfil, usuario, archivo, debo. Usa esos conceptos para seguir componentes, stores, contextos y APIs.
