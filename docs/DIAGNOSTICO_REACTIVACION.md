# Diagnostico de Reactivacion de `presupuesto-ia`

Fecha: 2026-05-13

## Objetivo

Retomar `presupuesto-ia` con una direccion clara para llevarlo a:

- uso personal confiable
- funcionamiento offline la mayor parte del tiempo
- instalacion simple en Windows
- compatibilidad futura con otros dispositivos
- base tecnica suficiente para evaluar luego una version comercial

## Resumen Ejecutivo

El proyecto no esta roto conceptualmente. Ya tiene una base funcional amplia:

- app React + Vite con estructura real de producto
- editor de presupuestos
- catalogo
- bitacora
- reportes fotograficos
- exportacion PDF
- soporte de IA
- autenticacion
- persistencia en Supabase

El problema principal no es "falta de idea", sino "arquitectura incompleta para el objetivo actual".

Hoy la app esta a medio camino entre:

1. web app conectada
2. app local/offline
3. producto con servicios remotos

Eso hace que tenga valor, pero todavia no tenga un modo de operacion claro.

## Estado Actual

### Stack detectado

- Frontend: React 19 + Vite
- UI: Tailwind CSS + CSS propio
- Backend local de apoyo: Express en [`src/lib/aiProxyServer.js`](C:/Users/MQerKAcademy/Desktop/proyectos/presupuesto-ia/src/lib/aiProxyServer.js)
- Persistencia remota: Supabase
- Exportacion: jsPDF
- Importacion: PDF/XLSX
- IA: Gemini / proxy local / servicios propios

### Archivos importantes para el nucleo

- [`src/App.jsx`](C:/Users/MQerKAcademy/Desktop/proyectos/presupuesto-ia/src/App.jsx)
- [`src/context/ProjectContext.jsx`](C:/Users/MQerKAcademy/Desktop/proyectos/presupuesto-ia/src/context/ProjectContext.jsx)
- [`src/context/AuthContext.jsx`](C:/Users/MQerKAcademy/Desktop/proyectos/presupuesto-ia/src/context/AuthContext.jsx)
- [`src/services/SupabaseService.js`](C:/Users/MQerKAcademy/Desktop/proyectos/presupuesto-ia/src/services/SupabaseService.js)
- [`src/services/ProjectPersistenceService.js`](C:/Users/MQerKAcademy/Desktop/proyectos/presupuesto-ia/src/services/ProjectPersistenceService.js)
- [`vite.config.js`](C:/Users/MQerKAcademy/Desktop/proyectos/presupuesto-ia/vite.config.js)

### Lo que ya existe y suma mucho

- Fallback parcial a `localStorage` en el contexto del proyecto
- Guardado local cuando no hay usuario autenticado
- Catalogo local basico
- Subida local de imagenes durante desarrollo
- Estructura modular suficiente para refactorizar por capas

## Diagnostico Tecnico

### 1. La app todavia no es offline-first

Existe persistencia local parcial en [`src/context/ProjectContext.jsx`](C:/Users/MQerKAcademy/Desktop/proyectos/presupuesto-ia/src/context/ProjectContext.jsx), pero el comportamiento principal sigue muy atado a Supabase.

Ejemplos:

- autenticacion depende de Supabase en [`src/context/AuthContext.jsx`](C:/Users/MQerKAcademy/Desktop/proyectos/presupuesto-ia/src/context/AuthContext.jsx)
- persistencia principal depende de Supabase en [`src/services/SupabaseService.js`](C:/Users/MQerKAcademy/Desktop/proyectos/presupuesto-ia/src/services/SupabaseService.js)
- sincronizacion de proyecto y cronograma depende de Supabase en [`src/services/ProjectPersistenceService.js`](C:/Users/MQerKAcademy/Desktop/proyectos/presupuesto-ia/src/services/ProjectPersistenceService.js)
- bitacora, plantillas, suscripciones y comparticion tambien tienen dependencia remota

Concluson:

La app tiene modo local, pero no esta diseñada todavia para que lo local sea la fuente principal de verdad.

### 2. `localStorage` ya no alcanza

Hoy `localStorage` se usa para:

- presupuestos
- catalogo
- templates PDF
- errores recientes
- UI state
- importaciones temporales

Eso sirve como puente, pero no como base seria para:

- muchos proyectos
- colas de sincronizacion
- versionado de datos
- adjuntos
- recuperacion ante fallos

Concluson:

Necesitamos migrar la persistencia local principal a `IndexedDB` si seguimos web/PWA.

### 3. No existe infraestructura real de sincronizacion

No hay hoy una cola de operaciones pendientes tipo:

- crear proyecto
- editar proyecto
- eliminar proyecto
- guardar bitacora
- subir evidencias
- actualizar cronograma

Tampoco vi deteccion formal de:

- `navigator.onLine`
- estado offline/online de UX
- reintentos programados
- conflictos de sincronizacion

Concluson:

Sin cola local, el objetivo "funciona sin internet y luego sincroniza" no esta resuelto.

### 4. No existe instalacion de app como producto

No vi:

- `manifest.webmanifest`
- service worker
- flujo PWA
- Electron
- Tauri

Concluson:

Hoy el proyecto es una app web de desarrollo, no una app instalable para usuario final.

### 5. El producto tiene alcance amplio

Esto es importante porque explica por que se siente "grande" o "inacabado".

El proyecto mezcla varios subproductos:

- presupuestos
- catalogo maestro
- bitacora de obra
- cronograma
- reportes fotograficos
- exportacion PDF
- IA para descripcion, precios y materiales
- administracion
- suscripciones
- comparticion

Concluson:

Para retomarlo bien, hay que definir primero el producto minimo personal y dejar fuera temporalmente lo no esencial.

## Dependencias Criticas Detectadas

### Dependencia fuerte a Supabase

Archivos claramente acoplados:

- [`src/context/AuthContext.jsx`](C:/Users/MQerKAcademy/Desktop/proyectos/presupuesto-ia/src/context/AuthContext.jsx)
- [`src/context/ProjectContext.jsx`](C:/Users/MQerKAcademy/Desktop/proyectos/presupuesto-ia/src/context/ProjectContext.jsx)
- [`src/services/SupabaseService.js`](C:/Users/MQerKAcademy/Desktop/proyectos/presupuesto-ia/src/services/SupabaseService.js)
- [`src/services/ProjectPersistenceService.js`](C:/Users/MQerKAcademy/Desktop/proyectos/presupuesto-ia/src/services/ProjectPersistenceService.js)
- [`src/services/BitacoraService.js`](C:/Users/MQerKAcademy/Desktop/proyectos/presupuesto-ia/src/services/BitacoraService.js)
- [`src/services/TemplateService.js`](C:/Users/MQerKAcademy/Desktop/proyectos/presupuesto-ia/src/services/TemplateService.js)
- [`src/services/ShareService.js`](C:/Users/MQerKAcademy/Desktop/proyectos/presupuesto-ia/src/services/ShareService.js)
- [`src/services/SubscriptionService.js`](C:/Users/MQerKAcademy/Desktop/proyectos/presupuesto-ia/src/services/SubscriptionService.js)

### Modulos que probablemente deben quedar online o degradables

- IA de presupuesto y asistencia
- busqueda dinamica de precios
- comparticion por enlaces
- panel admin
- suscripciones

Archivos clave:

- [`src/services/AIBudgetService.js`](C:/Users/MQerKAcademy/Desktop/proyectos/presupuesto-ia/src/services/AIBudgetService.js)
- [`src/services/BackendAIService.js`](C:/Users/MQerKAcademy/Desktop/proyectos/presupuesto-ia/src/services/BackendAIService.js)
- [`src/services/MarketPriceService.js`](C:/Users/MQerKAcademy/Desktop/proyectos/presupuesto-ia/src/services/MarketPriceService.js)
- [`src/services/SupportAIService.js`](C:/Users/MQerKAcademy/Desktop/proyectos/presupuesto-ia/src/services/SupportAIService.js)

### Modulos que deben ser offline si o si

- editor
- proyectos
- catalogo base
- cronograma
- bitacora
- reportes
- exportacion PDF

## Vision Recomendada

### Direccion de producto

Primero: herramienta personal profesional, confiable y local-first.

Despues: si queda solida, evaluar version comercial.

### Direccion tecnica

La fuente principal de verdad debe ser local.

Supabase debe pasar a ser:

- respaldo
- sincronizacion
- acceso multi-dispositivo futuro
- autenticacion opcional

No debe seguir siendo el centro operativo del producto.

## Arquitectura Objetivo

### Fase objetivo recomendada

1. Frontend React
2. Base local principal en `IndexedDB`
3. Capa de repositorios local/remoto
4. Cola de sincronizacion
5. Supabase como backend de sync
6. PWA como primer modo instalable
7. Tauri despues, si quieres instalador de Windows mas serio

### Por que PWA primero

Ventajas:

- mantiene compatibilidad con escritorio y movil
- instalacion mas rapida
- icono en escritorio o pantalla de inicio
- menor costo tecnico inmediato
- permite validar el modelo offline-first antes de empaquetar

Limite:

- experiencia de app Windows menos nativa que Tauri

### Por que no ir directo a Electron

Electron resolveria escritorio, pero meteria peso y complejidad antes de arreglar el problema real, que hoy es persistencia y sincronizacion.

## Roadmap Propuesto

### Fase 0. Auditoria de reentrada

Objetivo:

Entender que funciona hoy y que hay que congelar.

Entregables:

- mapa de modulos esenciales
- inventario de dependencias a Supabase
- lista de funciones que deben operar offline
- decision de alcance MVP personal

### Fase 1. Congelar el MVP personal

Objetivo:

Definir que entra y que se difiere.

MVP recomendado:

- login opcional o modo local sin login
- proyectos
- editor de presupuesto
- catalogo
- cronograma
- bitacora
- reporte fotografico
- exportacion PDF

Fuera del MVP inicial:

- admin
- suscripciones
- sharing publico
- features avanzadas de IA
- mejoras de monetizacion

### Fase 2. Persistencia local real

Objetivo:

Mover la data principal desde `localStorage` a `IndexedDB`.

Trabajo esperado:

- definir esquema local de datos
- crear repositorio local
- migrar proyectos
- migrar catalogo
- migrar bitacora
- migrar cronograma
- migrar configuraciones relevantes

### Fase 3. Cola offline y sync

Objetivo:

Que la app funcione sin internet y sincronice despues.

Trabajo esperado:

- tabla local de operaciones pendientes
- reintentos
- marcadores de sincronizacion
- resolucion basica de conflictos
- indicadores visuales de estado

### Fase 4. PWA instalable

Objetivo:

Permitir instalacion facil y acceso desde escritorio.

Trabajo esperado:

- `manifest.webmanifest`
- iconos
- service worker
- cache de shell y assets
- flujo de instalacion
- boton UI de "Instalar aplicacion"

### Fase 5. Mejorar UX y diseno

Objetivo:

Subir calidad visual y sensacion de producto terminado.

Trabajo esperado:

- jerarquia visual
- consistencia de layout
- limpieza de modales
- estados vacios
- feedback offline/online
- onboarding de primer uso

### Fase 6. Empaquetado Windows

Objetivo:

Dar experiencia mas cercana a app nativa.

Recomendacion:

Evaluar Tauri cuando la app PWA y offline-first ya este estable.

## Riesgos Principales

### Riesgo 1. Rehacer demasiado pronto

Si se intenta rediseñar, empaquetar y meter sync al mismo tiempo, se va a volver a abandonar.

Mitigacion:

Separar primero arquitectura, luego UX, luego empaque.

### Riesgo 2. Mantener Supabase como centro

Eso seguiria chocando con tu objetivo principal.

Mitigacion:

Invertir la arquitectura: local primero, nube despues.

### Riesgo 3. Querer conservar todo el alcance original

El proyecto tiene demasiadas areas.

Mitigacion:

Definir MVP personal y congelar lo secundario.

## Prioridad Recomendada

Orden sugerido realista:

1. definir MVP personal
2. aislar capa de persistencia
3. implementar base local seria
4. agregar cola de sincronizacion
5. instalar como PWA
6. pulir diseno
7. evaluar empaquetado Windows con Tauri

## Recomendacion Final

Este proyecto vale la pena retomarlo.

La base funcional ya existe y el objetivo es coherente, pero hay que cambiar el enfoque:

- menos "web conectada con parches offline"
- mas "aplicacion local profesional con sincronizacion opcional"

Si se sigue esa direccion, el proyecto puede servirte primero como herramienta personal fuerte y despues como candidato comercial.

## Siguiente paso sugerido

El siguiente entregable deberia ser un plan de implementacion fase 1 y fase 2 con tareas concretas por archivo:

- que desactivar temporalmente
- que extraer
- que persistencia local crear
- que componentes dependen demasiado de Supabase
- por donde empezar para no romper lo que ya sirve
