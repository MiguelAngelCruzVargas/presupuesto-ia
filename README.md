# 📊 PresuGenius - Sistema de Presupuestos con Inteligencia Artificial

**PresuGenius** es una aplicación web moderna y completa para la creación y gestión de presupuestos de construcción e ingeniería, potenciada con Inteligencia Artificial. Permite generar presupuestos profesionales de manera rápida y eficiente, con análisis automático, gestión de bitácoras de obra y reportes fotográficos.

## ✨ Características Principales

### 🤖 Inteligencia Artificial
- **Generación de Presupuestos desde Lenguaje Natural**: Describe tu proyecto y la IA genera las partidas automáticamente
- **Generador de Descripciones Inteligentes**: Genera descripciones profesionales para partidas de presupuesto
- **Sugerencias de Precios Inteligentes**: Recomendaciones de precios basadas en tu catálogo y datos históricos
- **Análisis Automático de Presupuestos**: Auditoría inteligente que detecta errores, omisiones y optimizaciones

### 📝 Editor de Presupuestos
- Interfaz intuitiva y moderna con arrastrar y soltar
- Gestión completa de partidas con categorías y subcategorías
- Cálculos automáticos de subtotales, IVA, costos indirectos y utilidad
- Análisis de Precios Unitarios (APU) con desglose detallado
- Importación y exportación de datos (Excel/CSV)
- Plantillas reutilizables para proyectos similares

### 📚 Base de Datos Maestra (Catálogo)
- Catálogo personalizado de materiales, mano de obra y equipos
- Búsqueda rápida e inteligente
- Actualización masiva de precios con IA
- Compartir items públicos con la comunidad

### 📋 Bitácora de Obra
- Cronograma interactivo de actividades
- Registro detallado de avances de obra
- Reportes fotográficos con imágenes y descripciones
- Exportación de reportes en PDF profesional
- Vinculación con presupuestos

### 📄 Exportación y Documentos
- Generación de PDFs profesionales con plantillas personalizables
- Vista previa antes de exportar
- Configuración personalizada de encabezados, logos y estilos
- Exportación a Excel para análisis adicional

### 👥 Sistema de Suscripciones
- **Plan Gratuito**: Funcionalidades básicas con límites
- **Plan Pro**: Acceso ilimitado a todas las funciones
- Dashboard de uso y estadísticas
- Control de límites por funcionalidad

### 🎨 Interfaz de Usuario
- Diseño moderno y responsive (TailwindCSS)
- Modo claro/oscuro (tema configurable)
- Navegación intuitiva con sidebar
- Notificaciones en tiempo real
- Feedback visual en todas las acciones

## 🛠️ Tecnologías Utilizadas

### Frontend
- **React 19** - Biblioteca de UI
- **Vite 7** - Build tool y dev server
- **React Router DOM 7** - Enrutamiento
- **TailwindCSS 3** - Framework de estilos
- **Lucide React** - Iconos
- **React Hot Toast** - Notificaciones
- **@dnd-kit** - Drag and drop para reordenamiento

### Backend y Servicios
- **Supabase** - Base de datos PostgreSQL, autenticación y almacenamiento
- **Google Gemini AI** - Motor de IA para generación y análisis
- **Express.js** - Servidor proxy para API de Gemini
- **Node.js** - Runtime del servidor proxy

### Librerías de Utilidad
- **jsPDF + jsPDF-autotable** - Generación de PDFs
- **xlsx** - Importación/Exportación de Excel
- **date-fns** - Manipulación de fechas
- **multer** - Manejo de archivos en el proxy

## 📋 Requisitos Previos

- **Node.js** 18+ y npm
- Cuenta de **Supabase** (gratuita)
- **API Key de Google Gemini** (gratuita en [Google AI Studio](https://aistudio.google.com/app/apikey))

## 🚀 Instalación y Configuración

### 1. Clonar el Repositorio

```bash
git clone <url-del-repositorio>
cd presupuesto-ia
```

### 2. Instalar Dependencias

```bash
npm install
```

### 3. Configurar Variables de Entorno

Crea un archivo `.env` en la raíz del proyecto:

```env
# Supabase
VITE_SUPABASE_URL=tu_url_de_supabase
VITE_SUPABASE_ANON_KEY=tu_clave_anonima_de_supabase

# Google Gemini API (para el proxy)
GEMINI_API_KEY=tu_api_key_de_gemini
```

#### Obtener Credenciales de Supabase:
1. Ve a [supabase.com](https://supabase.com) y crea un proyecto
2. En Settings > API, copia:
   - `Project URL` → `VITE_SUPABASE_URL`
   - `anon public` key → `VITE_SUPABASE_ANON_KEY`

#### Obtener API Key de Gemini:
1. Ve a [Google AI Studio](https://aistudio.google.com/app/apikey)
2. Inicia sesión con tu cuenta de Google
3. Crea una API key y cópiala a `GEMINI_API_KEY`

### 4. Configurar Base de Datos

Ejecuta las migraciones de Supabase:

1. En el panel de Supabase, ve a **SQL Editor**
2. Ejecuta los archivos SQL en este orden:
   - `supabase/migrations.sql`
   - `supabase/migrations_subscriptions.sql`
   - `supabase/enable_rls.sql` (si aplica)

### 5. Iniciar la Aplicación

**Opción A - Todo junto (Recomendado):**
```bash
npm run dev:all
```

Este comando inicia tanto el servidor de desarrollo como el proxy de Gemini simultáneamente.

**Opción B - Terminales separadas:**

Terminal 1 (Proxy de Gemini):
```bash
npm run gemini-proxy
```

Terminal 2 (Servidor de Desarrollo):
```bash
npm run dev
```

### 6. Acceder a la Aplicación

Abre tu navegador en: **http://localhost:3005**

## 📁 Estructura del Proyecto

```
presupuesto-ia/
├── public/                 # Archivos estáticos
├── src/
│   ├── components/         # Componentes React
│   │   ├── ai/            # Componentes de IA
│   │   ├── auth/          # Autenticación
│   │   ├── bitacora/      # Bitácora de obra
│   │   ├── budget/        # Editor de presupuestos
│   │   ├── layout/        # Layout y Sidebar
│   │   ├── subscription/  # Sistema de suscripciones
│   │   └── ui/            # Componentes UI reutilizables
│   ├── context/           # Context API (Estado global)
│   │   ├── AuthContext.jsx
│   │   ├── ProjectContext.jsx
│   │   ├── SubscriptionContext.jsx
│   │   └── ThemeContext.jsx
│   ├── hooks/             # Custom hooks
│   ├── lib/               # Librerías y configuraciones
│   │   ├── geminiServer.js    # Servidor proxy de Gemini
│   │   ├── supabaseClient.js  # Cliente de Supabase
│   │   └── *.sql              # Esquemas SQL
│   ├── pages/             # Páginas principales
│   │   ├── Dashboard.jsx
│   │   ├── Editor.jsx
│   │   ├── Catalog.jsx
│   │   ├── BitacoraPage.jsx
│   │   ├── Login.jsx
│   │   └── ...
│   ├── services/          # Servicios de negocio
│   │   ├── AIBudgetService.js
│   │   ├── BitacoraService.js
│   │   ├── PDFService.js
│   │   ├── SubscriptionService.js
│   │   └── ...
│   ├── utils/             # Utilidades
│   ├── App.jsx            # Componente raíz
│   └── main.jsx           # Punto de entrada
├── supabase/              # Migraciones SQL
├── uploads/               # Archivos subidos temporalmente
├── package.json
├── vite.config.js
└── README.md
```

## 🎯 Funcionalidades Detalladas

### 1. Dashboard
- Vista general del proyecto actual
- Métricas clave (total, partidas, cliente)
- Gráficos de distribución por categoría
- Acceso rápido al editor
- Generación rápida con IA

### 2. Editor de Presupuestos
- **Agregar/Editar Partidas**: 
  - Descripción, unidad, cantidad, precio unitario
  - Categorías: Materiales, Mano de Obra, Equipos, Instalaciones, Obra Civil
  - Subcategorías personalizables
  - Notas y tags
- **Generación con IA**:
  - Input de lenguaje natural
  - Generación automática de partidas
  - Validación de datos generados
- **Análisis de Precios Unitarios (APU)**:
  - Desglose en materiales, mano de obra y equipos
  - Cálculo automático de rendimientos
  - Generación con IA
- **Cálculos Automáticos**:
  - Subtotal
  - Costos indirectos (configurable %)
  - Utilidad (configurable %)
  - IVA (configurable %)
  - Total general
- **Importar/Exportar**:
  - Importar desde Excel/CSV
  - Exportar a Excel/CSV
  - Exportar a PDF con plantilla personalizable

### 3. Catálogo (Base de Datos Maestra)
- Gestión de items reutilizables
- Búsqueda avanzada
- Actualización masiva de precios
- Compartir items públicos
- Vinculación con presupuestos

### 4. Plantillas
- Crear plantillas de presupuestos
- Reutilizar en nuevos proyectos
- Compartir plantillas públicas
- Categorización

### 5. Bitácora de Obra
- **Cronograma**:
  - Actividades con fechas de inicio y fin
  - Dependencias entre actividades
  - Generación automática desde presupuesto
- **Registro de Avances**:
  - Entradas de bitácora con fecha, actividad y descripción
  - Estado de avance (%)
  - Fotos asociadas
- **Reportes Fotográficos**:
  - Múltiples fotos por reporte
  - Descripciones detalladas
  - Exportación a PDF profesional

### 6. Historial
- Ver todos los presupuestos guardados
- Filtros y búsqueda
- Abrir, duplicar o eliminar proyectos
- Ordenamiento por fecha

### 7. Configuración de PDF
- Personalizar plantillas de exportación
- Logo de empresa
- Encabezados y pies de página
- Estilos y colores

## 💳 Sistema de Suscripciones

### Plan Gratuito
- ✅ 1 presupuesto
- ✅ 3 generaciones con IA
- ✅ 5 descripciones con IA
- ✅ 10 sugerencias de precio
- ✅ 1 bitácora
- ✅ 1 reporte fotográfico
- ✅ 5 exportaciones PDF
- ✅ 50 items en catálogo

### Plan Pro ($299 MXN/mes)
- ✅ Presupuestos ilimitados
- ✅ Generaciones con IA ilimitadas
- ✅ Descripciones con IA ilimitadas
- ✅ Sugerencias de precio ilimitadas
- ✅ Bitácoras ilimitadas
- ✅ Reportes fotográficos ilimitados
- ✅ Exportaciones PDF ilimitadas
- ✅ Catálogo ilimitado

## 🔧 Scripts Disponibles

```bash
# Desarrollo
npm run dev              # Inicia solo el servidor de desarrollo
npm run gemini-proxy     # Inicia solo el proxy de Gemini
npm run dev:all          # Inicia ambos (proxy + dev server)

# Producción
npm run build            # Construye para producción
npm run preview          # Preview de la build de producción

# Linting
npm run lint             # Ejecuta ESLint
```

## 🗄️ Base de Datos

### Tablas Principales

- **projects**: Proyectos de presupuesto
- **budget_items**: Partidas de presupuesto
- **catalog_items**: Items del catálogo
- **apu_breakdown**: Desglose de APU
- **project_templates**: Plantillas de proyectos
- **user_subscriptions**: Suscripciones de usuarios
- **user_usage**: Uso y límites de usuarios
- **bitacora_schedule**: Cronogramas de obra
- **bitacora_logs**: Entradas de bitácora
- **photographic_reports**: Reportes fotográficos

### Seguridad (RLS)
Todas las tablas tienen Row Level Security (RLS) habilitado, asegurando que los usuarios solo accedan a sus propios datos.

## 🔐 Configuración de Seguridad

- **API Keys**: Nunca se exponen en el frontend. El proxy de Gemini maneja todas las llamadas.
- **Autenticación**: Supabase Auth con flujo PKCE
- **RLS**: Row Level Security en todas las tablas
- **Validación**: Validación client-side y server-side

## 📚 Documentación Adicional

- `INICIO_RAPIDO.md` - Guía de inicio rápido
- `GEMINI_API_SETUP.md` - Configuración detallada de Gemini
- `MEJORAS_IMPLEMENTADAS.md` - Historial de mejoras
- `ANALISIS_BITACORA_OBRA.md` - Análisis de funcionalidad de bitácora

## 🐛 Solución de Problemas

### Error: "GEMINI_API_KEY not set"
- Verifica que el archivo `.env` existe
- Verifica que tenga la línea `GEMINI_API_KEY=tu_key`
- Reinicia el proxy

### Error: "404 Not Found" en /api/gemini
- El proxy no está corriendo
- Ejecuta: `npm run gemini-proxy`
- Verifica que esté en el puerto 4001 (configurable en `vite.config.js`)

### Error: "Supabase credentials not found"
- Verifica que `.env` tenga `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY`
- Reinicia el servidor de desarrollo

### Errores de RLS (Row Level Security)
- Verifica que las políticas RLS estén correctamente configuradas
- Revisa los logs en la consola del navegador
- Ejecuta `supabase/fix_rls_policies.sql` si es necesario

## 🚧 Estado del Proyecto

Este proyecto está en desarrollo activo. Las funcionalidades principales están implementadas y en funcionamiento.

### Próximas Mejoras
- [ ] Tests unitarios y de integración
- [ ] Migración gradual a TypeScript
- [ ] Autoguardado automático
- [ ] Colaboración en tiempo real
- [ ] Integración con más servicios de IA
- [ ] App móvil

## 👥 Contribución

Las contribuciones son bienvenidas. Por favor:

1. Fork el proyecto
2. Crea una rama para tu feature (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abre un Pull Request

## 📝 Licencia

Este proyecto es privado y de uso personal. Todos los derechos reservados.

## 📧 Contacto

Para preguntas o soporte, contacta al equipo de desarrollo.

---

**Desarrollado con ❤️ usando React, Supabase y Google Gemini AI**
# presupuesto-ia
