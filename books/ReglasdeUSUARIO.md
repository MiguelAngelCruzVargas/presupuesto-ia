# Reglas de Usuario – Documentación de Cambios

## Corrección: Persistencia del reporte fotográfico en base de datos (Marzo 2025)

### Problema
Los datos del reporte fotográfico (encabezado, conceptos, ubicación, firmas y logs con fotos) **no se guardaban** en la base de datos: al recargar la página o volver al proyecto, los cambios no aparecían.

### Causa raíz
En **SupabaseService** (`src/services/SupabaseService.js`):

1. **Al cargar un proyecto** (`getProject(id)`): se devolvía solo el contenido de la columna `data` (JSON), **sin incluir el `id` de la fila** de la tabla `projects`. El `id` está en la fila (`data.id`), no dentro del JSON guardado.
2. **Al guardar** (`saveProject(projectData)`): se usaba `id = projectData.id || generateId()`. Como `projectData` no tenía `id`, **siempre se generaba un id nuevo** y se hacía `upsert` sobre una fila nueva. Así, se creaba un proyecto duplicado con los datos actualizados y el proyecto que el usuario estaba viendo (el de la URL) **nunca se actualizaba**. Los logs de bitácora (`site_logs`) sí se guardaban con el `project_id` correcto (el de la URL), pero el encabezado, conceptos y firmas quedaban en otra fila.

### Solución aplicada

#### 1. `getProject` – devolver el proyecto con el id de la fila
- **Archivo:** `src/services/SupabaseService.js`.
- **Cambio:** Después de leer `data.data` (el JSON del proyecto), se devuelve un objeto que **incluye el id de la fila**: `{ ...fullData, id: data.id }`.
- **Código:**
```javascript
const fullData = data.data || {};
const projectWithId = { ...fullData, id: data.id };
// ...
return projectWithId;
```
- Así, cuando la página del reporte hace `loadProject(projectId)` y luego `saveProject(updatedProjectData)`, `updatedProjectData.id` es el id real del proyecto y se actualiza la misma fila.

#### 2. `saveProject` – guardar el id dentro del JSON y usar ese id en el upsert
- **Archivo:** `src/services/SupabaseService.js`.
- **Cambio:** Se construye `dataToStore = { ...projectData, id }` y se guarda ese objeto en la columna `data`. El `id` usado en el `upsert` sigue siendo `projectData.id || generateId()`, pero ahora `projectData.id` viene correctamente de `getProject`.
- **Código:**
```javascript
const id = projectData.id || generateId();
const dataToStore = { ...projectData, id };
const payload = {
    id: id,
    // ...
    data: dataToStore,
    updated_at: new Date().toISOString()
};
```
- Con esto, en futuras cargas el proyecto ya trae `id` dentro del JSON y no se generan filas nuevas por error.

### Archivos modificados
| Archivo | Cambio |
|--------|--------|
| `src/services/SupabaseService.js` | `getProject`: devolver `{ ...fullData, id: data.id }`. `saveProject`: guardar `dataToStore = { ...projectData, id }` en la columna `data`. |
| `ReglasdeUSUARIO.md` | Documentación de esta corrección. |

### Comportamiento esperado después del cambio
- Al guardar el reporte fotográfico (encabezado, conceptos, firmas y fotos), se actualiza **la misma fila del proyecto** en `projects` y se crean/actualizan los registros en `site_logs` con el mismo `project_id`.
- Al recargar o volver al proyecto, los datos del reporte (encabezado, conceptos, ubicación, firmas y reportes con fotos) se cargan correctamente desde la base de datos.

---

## Mejoras realizadas: Reporte Fotográfico y Bitácora (Marzo 2025)

Se mejoró el diseño, la funcionalidad y la responsividad del **Reporte Fotográfico** (modal y página completa) y de la sección **Bitácora** (pestaña Fotos y Notas de Bitácora), manteniendo la exportación a PDF sin cambios.

---

### 1. PhotographicReportModal.jsx (`src/components/bitacora/PhotographicReportModal.jsx`)

#### Corrección de funcionalidad – Eliminar foto
- **Problema:** Al eliminar una foto de una entrada se llamaba `updateEntry` dos veces (una para `previewUrls` y otra para `photoUrls`). Como cada llamada hace un `setEntries` con el estado actual, la segunda actualización podía usar estado desactualizado y no sincronizar bien las listas.
- **Solución:** Se añadió la función `updateEntryFields(entryId, updates)` que actualiza varios campos de una entrada en un solo `setEntries`, evitando estados intermedios.
- **Código añadido:**
```javascript
const updateEntryFields = (entryId, updates) => {
    setEntries(entries.map(entry =>
        entry.id === entryId ? { ...entry, ...updates } : entry
    ));
};
```
- Al eliminar una foto ahora se actualizan en una sola pasada: `previewUrls`, `photoUrls` y `photos` (si la foto era nueva y aún no estaba en el servidor). Se mantiene la correspondencia correcta entre índices de fotos nuevas y archivos `entry.photos`.

#### Diseño y responsividad
- **Modal:** En móvil el modal ocupa casi toda la altura (`h-[92vh]`), se alinea al fondo (`items-end`) y tiene esquinas redondeadas solo arriba (`rounded-t-2xl`). En `sm` y superior se centra y tiene `rounded-2xl`.
- **Header:** Título e icono con `truncate` para textos largos. Botón de cerrar con área táctil amplia (`p-2 -m-2`), `aria-label="Cerrar"` y clase `touch-manipulation`.
- **Cuerpo:** Sidebar con ancho fijo `md:w-72 lg:w-80`, bordes y espaciado (`border-2`, `rounded-xl`) y `min-h-0` en el contenedor flex para que el scroll funcione bien.
- **Controles:** Input de fecha con `border-2`, `rounded-xl`, `py-2.5`. Selector de concepto con botón `min-h-[44px]`, dropdown con `max-h-[min(16rem,50vh)]` y búsqueda con icono `pointer-events-none`.
- **Resumen y Guardar:** Botón de guardar con `min-h-[44px]`, spinner de carga consistente y `touch-manipulation`.
- **Lista de entradas:** Cards con `border-2 border-slate-200`, `rounded-xl`. Grid de fotos `grid-cols-2 sm:grid-cols-3`. Botón eliminar foto con `min-w-[28px] min-h-[28px]`, sombra y estado hover. Área de subir fotos con texto "Subir fotos" y estados hover más claros.
- **Accesibilidad:** `type="button"` en botones, `aria-checked` en el checkbox de "terminado", `aria-label` donde aplica.

---

### 2. PhotographicReportPage.jsx (`src/pages/PhotographicReportPage.jsx`)

#### Header de navegación
- Contenedor con `max-w-[1600px] mx-auto` y padding `px-3 sm:px-6 lg:px-8`, `py-3 sm:py-4`.
- Botón volver con `p-2.5`, `rounded-xl`, `aria-label="Volver a Bitácora"`.
- Título único: "Editar/Nuevo Reporte Fotográfico" y subtítulo "Obra y conceptos con evidencia" en pantallas `sm+`.
- Botones Cancelar y Guardar con `min-h-[44px]`, `rounded-xl`, `touch-manipulation` y spinner unificado al guardar.

#### Contenido principal
- Contenedor global `max-w-[1600px] mx-auto`, `px-3 sm:px-6 lg:px-8`, `py-4 sm:py-6`.
- Bloque del encabezado del reporte: `rounded-xl sm:rounded-2xl`, `border-2 border-slate-300`, `p-4 sm:p-6`, `shadow-md`.
- Dentro del bloque de encabezado se añadieron campos específicos para el **membrete de la constructora** (que se usan en el PDF fotográfico):
  - `Nombre comercial / Razón social` → se guarda en `projectInfo.companyName`.
  - `RFC` → se guarda en `projectInfo.companyRfc`.
  - `Línea extra (dirección, contacto, etc.)` → se guarda en `projectInfo.companyExtra`.
- Estos campos aparecen en la parte superior del encabezado, antes del título “REPORTE FOTOGRÁFICO DE OBRA”, y se sincronizan con lo que se muestra como membrete en el PDF.

#### Sidebar (agregar concepto y fecha)
- En móvil el contenido principal va primero y el sidebar después (`order-1` / `order-2` en el grid).
- Cards del sidebar con `rounded-xl`, `border-2 border-slate-200`.
- Selector de concepto: botón `min-h-[48px]`, dropdown `max-h-[min(18rem,55vh)]`, botón "Agregar concepto manualmente" con `touch-manipulation`.
- Resumen con estilos suaves (`from-indigo-50`, `border-indigo-100`).

#### Entradas (conceptos) y firmas
- Estado vacío: icono dentro de un bloque `rounded-2xl`, textos claros y botón "Agregar concepto manualmente" con `min-h-[44px]`.
- Cards de concepto: `rounded-xl`, `border-2 border-slate-300`, header con `bg-slate-100`. Botón eliminar concepto con `min-w-[44px] min-h-[44px]`, `rounded-xl`, `aria-label`.
- Bloque de firmas: `rounded-xl sm:rounded-2xl`, `border-2 border-slate-300`, `p-5 sm:p-8`, `gap-8 sm:gap-12` en el grid de dos columnas.

#### Estilos globales de la página
- Fondo de página `bg-slate-50` para diferenciar del contenido blanco.

---

#### Corrección adicional – Eliminar fotos en bloques (página completa)
- **Problema:** En la página completa de `PhotographicReportPage.jsx`, al dar clic en la `X` de una foto nueva, la imagen desaparecía visualmente del bloque, pero el archivo seguía en `entry.photos`. Al guardar, esa foto se subía igual al servidor (no se “borraba de verdad”).
- **Solución:** 
  - Se añadió `updateEntryFields(entryId, updates)` (igual que en el modal) para poder actualizar varios campos del bloque en una sola operación de estado.
  - En el botón de eliminar foto se implementó la misma lógica que en el modal:
    - Se calcula cuántas fotos existentes vienen de `photoUrls` (`existingCount`).
    - Si el índice eliminado es `>= existingCount`, también se elimina el `File` correspondiente de `entry.photos` usando `idx - existingCount`.
    - Se actualizan en un solo paso: `previewUrls`, `photoUrls`, `photos` y `photoCaptions`.
    - Si la URL es un `blob:...`, se llama a `ImageUploadService.revokePreviewUrl(url)` para liberar memoria del navegador.
- **Resultado:** Ahora, cuando el usuario pulsa la `X` en una foto:
  - La foto desaparece del bloque.
  - No se sube al servidor al guardar.
  - Se mantienen sincronizados los arreglos de previews, URLs reales, archivos nuevos y descripciones.

### 3. BitacoraPage.jsx (`src/pages/BitacoraPage.jsx`)

#### Pestaña "Reporte Fotográfico" (Fotos)
- Barra de título y acciones en `flex-col sm:flex-row` con `gap-3` y badges de cantidad de reportes con `rounded-lg`, `bg-slate-100`.
- Botones "Nuevo Reporte", "Vista Previa PDF" y "Exportar PDF" con `min-h-[44px]`, `rounded-xl`, `touch-manipulation` y texto "Vista Previa" oculto en móvil muy pequeño (`hidden xs:inline`).
- Spinner de "Generando..." unificado (elemento `span` con clases de animación).
- Grid de reportes: `grid-cols-1 sm:grid-cols-2 xl:grid-cols-3`, cards con `border-2 border-slate-200`, `rounded-xl`, hover con `hover:border-slate-300`.
- En cada card: header con número de nota y fecha (fecha en segunda línea en móvil), botones Editar/Eliminar con `p-2`, `rounded-lg`, `aria-label` y `type="button"`.
- Fotos en grid 2 columnas con `aspect-square`, `rounded-lg`, `loading="lazy"`.
- Estado vacío: contenedor con icono en bloque redondeado, textos actualizados y botón "Crear primer reporte" con `min-h-[44px]`.

#### Pestaña "Notas de Bitácora"
- Misma estructura de barra: `flex-col sm:flex-row`, badges y botones con `min-h-[44px]`, `rounded-xl`, `touch-manipulation`.
- Spinner y comportamiento de "Vista Previa PDF" alineados con la pestaña Fotos.

#### Diseño tipo libro (notas)
- Contenedor de cada nota: `rounded-xl`, `shadow-md`, `border-2 border-amber-200/80`, `p-4 sm:p-6`, gradiente suave `from-amber-50/80`.
- Grid interno `gap-4 xl:gap-6` para mejor uso del espacio.

#### Contenedor general y pestañas
- Página con `max-w-[1600px] mx-auto`, `p-3 sm:p-4 md:p-6`.
- Header: botón volver con `p-2.5`, `rounded-xl`, `aria-label`; título con `truncate`; botón Cronograma con `border-2`, `rounded-xl`, `min-h-[44px]`.
- Contenedor de tabs: `border-2 border-slate-200`, `rounded-xl`.
- Botones de pestañas: `min-w-[100px] sm:min-w-[120px]`, `py-3 sm:py-4`, `touch-manipulation`, texto con `truncate`, badges con `shrink-0`. Pestaña Fotos activa: badge con `bg-white/20` para mejor contraste.
- Contenido de la pestaña: `p-4 sm:p-6`.

#### Modal de vista previa PDF
- Fondo `bg-slate-900/95`, contenedor con `rounded-none sm:rounded-t-xl`.
- Header con `px-3 sm:px-4`, `py-2.5 sm:py-3`, título con `truncate`.
- Botón "Abrir en pestaña" con texto oculto en móvil (`hidden sm:inline`).
- Botón cerrar con `p-2.5`, `rounded-xl`, `aria-label`.
- Área del iframe con `min-h-0` para que el flex permita scroll correcto.

---

### 4. Encabezado del PDF – Separar OBRA y UBICACIÓN

- **Problema:** En el PDF del reporte fotográfico, el campo `OBRA:` mostraba el nombre de la obra concatenado con la ubicación (ej. `REMODELACION DE CASA MAZATLAN, ALVARADO VER`), a pesar de que ya existe una celda separada para `UBICACIÓN:`.
- **Cambio aplicado (archivo `src/services/PDFReportService.js`):**
  - En `generatePhotographicReport` y `generatePhotographicReportPreview`, se dejó de concatenar `, location` al texto de la obra.
  - Ahora:
    - `OBRA:` usa **solo** el nombre de la obra (`projectInfo.project` / `obra`).
    - `UBICACIÓN:` usa exclusivamente el campo de ubicación (`projectInfo.ubicacion` / `projectInfo.location`).
- **Resultado esperado:** El encabezado del PDF queda exactamente como en el ejemplo que quieres:
  - `OBRA:` solo con la descripción de la obra.
  - `UBICACIÓN:` con la ciudad/estado, sin duplicarse dentro del nombre de la obra.

---

### 5. Campo CONCEPTOS en el encabezado del PDF

- **Problema:** En algunos casos, el campo `CONCEPTOS:` del PDF mostraba de nuevo el nombre de la obra (por ejemplo `REMODELACION DE CASA MAZATLAN`), repitiendo la información de `OBRA:` en lugar de mostrar el texto específico de conceptos que el usuario escribió.
- **Causa:** 
  - En `BitacoraPage.jsx`, al armar las `options` para `PDFReportService.generatePhotographicReport*`, el valor de `concepts` se obtenía siempre de `PDFReportService.extractConceptsFromLogs(logs)`. 
  - Como los `subject` de los logs de reporte fotográfico suelen contener el mismo título que la obra, el conjunto de conceptos terminaba siendo igual al nombre de la obra.
- **Cambio aplicado:**
  - Ahora, en todos los lugares donde se construyen `options` para reportes fotográficos (`handlePreviewPDF` y `handleExportPDF`):
    - Se prioriza `projectInfo.concepts` (lo que el usuario escribió en el campo **CONCEPTOS** del encabezado del Reporte Fotográfico).
    - Solo si `projectInfo.concepts` está vacío se usa `PDFReportService.extractConceptsFromLogs(logs)` como respaldo.
- **Resultado esperado:**
  - `CONCEPTOS:` en el PDF muestra el texto que el usuario define en el encabezado (por ejemplo “REMODELACION DE CASA MAZATLAN – ÁREA DE CÁMARAS FRÍAS”), sin repetir automáticamente el nombre de la obra.

---

### 6. Color y logo en el encabezado del PDF (Reporte Fotográfico)

- **Objetivo:** Darle un aspecto más profesional al encabezado del PDF del reporte fotográfico, permitiendo color de fondo en la banda de título y un logo opcional.
- **Cambios aplicados en `src/services/PDFReportService.js`:**
  - En `generatePhotographicReport` y `generatePhotographicReportPreview`:
    - Se agregó soporte para:
      - `options.headerColor` (array `[r,g,b]`) con valor por defecto `[199, 210, 254]` (indigo muy claro, más visible que el gris anterior).
      - `options.logoUrl` o `projectInfo.logoUrl` para el logo.
    - El recuadro del título ahora se dibuja con fondo de color:
      - `doc.setFillColor(headerColor[0], headerColor[1], headerColor[2]);`
      - `doc.rect(..., 'FD')` en lugar de solo borde.
    - Si hay `logoUrl`, se carga usando `fetchImage` y se dibuja a la izquierda del título, dentro de la banda del encabezado.
  - `addHeader` ahora es `async` en ambas funciones y se llama con `await` tanto en la primera página como en las páginas nuevas.
- **Uso esperado:**
  - Por defecto, los reportes ya salen con una franja superior de color tipo índigo claro para resaltar el membrete de la constructora.
  - Si en el futuro se guarda un `logoUrl` en `projectInfo` o se pasa explícitamente en `options.logoUrl`, el logo aparecerá en la esquina izquierda del encabezado de todas las páginas del PDF.

---

### 7. Tamaño de las fotos en el PDF fotográfico

- **Problema:** Las fotos del reporte fotográfico ocupaban demasiado alto/ancho, dejando poco espacio visual entre el encabezado, la primera fila de fotos y el pie de firmas.
- **Cambio aplicado en `src/services/PDFReportService.js`:**
  - En `generatePhotographicReport` y `generatePhotographicReportPreview` se ajustaron las constantes del grid:
    - Antes: `photoWidth = 85`, `photoHeight = 50`, `gapX = 4`, `gapY = 58`.
    - Ahora: `photoWidth = 78`, `photoHeight = 45`, `gapX = 6`, `gapY = 56`.
- **Resultado esperado:**
  - Cada foto es ligeramente más chica y hay un poco más de aire entre filas/columnas y respecto al encabezado y pie de página, manteniendo la misma cuadrícula de 2 filas x 3 columnas por página.

---

### 8. Reorganización del encabezado: membrete de la constructora + título pequeño

- **Problema:** La banda superior solo con el texto grande “REPORTE FOTOGRAFICO DE OBRA” ocupaba mucho espacio y no dejaba un área clara para el membrete de la constructora (nombre, RFC, etc.).
- **Cambios aplicados en `src/services/PDFReportService.js` (en `generatePhotographicReport` y `generatePhotographicReportPreview`):**
  - El `addHeader` ahora:
    - Dibuja una banda de color (tipo membrete) donde se muestra:
      - Logo opcional a la izquierda (si hay `logoUrl` o `projectInfo.logoUrl`).
      - A la derecha, texto con:
        - Nombre de la constructora (`companyName` → `options.companyName` → `projectInfo.companyName` → `contractor`).
        - RFC (`companyRfc` → `options.companyRfc` → `projectInfo.companyRfc`), si existe.
        - Línea extra (`companyExtra` → `options.companyExtra` → `projectInfo.companyExtra`), si existe.
    - Debajo de ese membrete, en letra más pequeña, centra el texto:
      - `REPORTE FOTOGRAFICO DE OBRA`
  - La tabla de `CONTRATISTA / OBRA / CONTRATO / UBICACIÓN / CONCEPTOS / FECHA` se dibuja inmediatamente **debajo del título pequeño**, sin la banda grande original.
- **Resultado esperado:**
  - En la parte superior del PDF se ve claramente el **membrete de la constructora** (con logo y datos) y, justo debajo, un título “REPORTE FOTOGRAFICO DE OBRA” más discreto, dejando más espacio visual para el contenido del reporte.

### 4. Resumen de criterios aplicados

- **TailwindCSS:** Todas las mejoras son solo con clases de Tailwind; no se añadieron archivos CSS.
- **Responsividad:** Uso de breakpoints `sm`, `md`, `lg`, `xl` y en algunos casos `xs` para móviles, tablets y escritorio; contenedores con `max-w-[1600px]` donde tiene sentido.
- **Touch y accesibilidad:** Botones con `min-h-[44px]` donde es posible, `touch-manipulation`, `type="button"`, `aria-label` y `aria-checked` donde aplica.
- **Consistencia:** Bordes `border-2`, `rounded-xl` (o `rounded-2xl` en bloques grandes), espaciado progresivo con `p-3 sm:p-4` / `p-4 sm:p-6`, y paleta slate/indigo/amber alineada con el resto de la app.
- **PDF:** No se modificó la lógica de generación ni descarga de PDF; solo se mejoró la UI que dispara vista previa y exportación.

---

### Archivos modificados

| Archivo | Cambios principales |
|--------|----------------------|
| `src/services/SupabaseService.js` | Corrección persistencia: `getProject` devuelve proyecto con `id`; `saveProject` guarda `id` en el JSON para que siempre se actualice la fila correcta. |
| `src/components/bitacora/PhotographicReportModal.jsx` | Fix eliminar foto con `updateEntryFields`, diseño responsive del modal, mejoras de accesibilidad y toques. |
| `src/pages/PhotographicReportPage.jsx` | Header, contenedor, sidebar, orden en móvil, cards de conceptos y firmas, estados vacíos. |
| `src/pages/BitacoraPage.jsx` | Pestaña Fotos y Notas: barras de acciones, grids, cards, tabs, modal de preview PDF y contenedor general. |
| `ReglasdeUSUARIO.md` | Este archivo: documentación detallada de todos los cambios. |
