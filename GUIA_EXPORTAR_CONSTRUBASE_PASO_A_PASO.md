# 📋 Guía Paso a Paso: Exportar CONSTRUBASE-LIBRE

## 🎯 Objetivo

Exportar el catálogo completo de precios desde CONSTRUBASE-LIBRE para importarlo a nuestra plataforma.

## 🔑 Credenciales

- **URL**: https://neodatapu.appspot.com
- **Usuario**: vargasmiguelangelc@gmail.com
- **Estado**: ✅ Registrado

## 📝 Pasos Detallados

### Paso 1: Acceder a CONSTRUBASE-LIBRE

1. Abre tu navegador
2. Ve a: **https://neodatapu.appspot.com**
3. Inicia sesión con: **vargasmiguelangelc@gmail.com**
4. Espera a que cargue la interfaz

### Paso 2: Buscar Opción de Exportar

Desde la interfaz que viste (con la tabla de 8,181 partidas):

#### Opción A: Desde el Menú Principal
1. Mira la barra superior: "Inicio", "Presupuesto", **"Catálogos"**, "Maestro", etc.
2. Haz clic en **"Catálogos"**
3. Busca opciones como:
   - "Exportar Catálogo"
   - "Descargar"
   - "Exportar a Excel"
   - "Exportar a CSV"

#### Opción B: Desde la Tabla de Presupuesto
1. En la sección "M-Consulta de Presupuesto"
2. Marca el checkbox **"Ver todas las partidas"** (esto mostrará las 8,181 partidas)
3. Busca botones como:
   - **"Copiar"** (copiar toda la tabla)
   - **"Exportar"**
   - **"Descargar"**

#### Opción C: Usar la Función "Copiar"
1. Selecciona todas las filas (si hay opción de seleccionar todo)
2. O usa Ctrl+A para seleccionar todo
3. Copia (Ctrl+C)
4. Pega en Excel (Ctrl+V)
5. Guarda como CSV

### Paso 3: Guardar el Archivo

1. **Si descargas directamente**:
   - Guarda como: `data/construbase-libre-2025.csv` o `.xlsx`

2. **Si copias y pegas**:
   - Abre Excel
   - Pega los datos (Ctrl+V)
   - Verifica que todas las columnas se pegaron correctamente:
     - Partida
     - Renglón
     - Código
     - Descripción Completa
     - Unidad
     - Cantidad
     - Precio
     - Importe
   - Guarda como: `data/construbase-libre-2025.csv`

### Paso 4: Verificar el Archivo

Abre el archivo y verifica que tenga:
- ✅ Al menos 3 columnas: Descripción, Unidad, Precio
- ✅ Primera fila con encabezados
- ✅ Múltiples filas con datos (no solo encabezados)
- ✅ Precios en formato numérico

## 📊 Ejemplo de Formato Esperado

Tu archivo debería verse así:

```csv
Partida,Renglón,Descripción Completa,Unidad,Cantidad,Precio,Importe
A0101,10,"Trazo y nivelación manual...",M2,1.0000,9.46,9.46
A0101,90,"Tapial de 2.00 m...",M,1.0000,1003.37,1003.37
...
```

## 🚀 Una Vez Tengas el Archivo

Ejecuta:

```bash
node scripts/import-tabulador.js data/construbase-libre-2025.csv --source construbase --location México
```

## ⚠️ Si No Encuentras Opción de Exportar

### Alternativa 1: Captura Manual Selectiva
- Exportar por categorías (Materiales, Mano de Obra, etc.)
- Combinar archivos después

### Alternativa 2: Contactar Soporte Neodata
- Buscar opción de "Soporte" o "Contacto" en la plataforma
- Solicitar exportación masiva del catálogo

### Alternativa 3: Usar la Tabla Directamente
- Seleccionar toda la tabla (8,181 filas)
- Copiar y pegar en Excel
- Limpiar formato si es necesario
- Guardar como CSV

---

**Nota**: Desafortunadamente no puedo acceder directamente a la plataforma web para exportar automáticamente. Necesitas hacerlo manualmente desde tu navegador.

