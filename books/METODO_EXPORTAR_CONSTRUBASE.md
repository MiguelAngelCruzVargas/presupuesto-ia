# 🎯 Métodos para Exportar CONSTRUBASE-LIBRE

## 📍 Ubicación Actual

Estás en: `neodata.mx/productos` → Página de **descargas de software**, no del catálogo.

## 🔄 Ir al Catálogo de Precios

### Opción A: Desde la Web (CONSTRUBASE-LIBRE Online)

1. **Ir a**: https://neodatapu.appspot.com
2. **Iniciar sesión**: vargasmiguelangelc@gmail.com
3. **Buscar**:
   - Sección "Catálogos"
   - Sección "Consulta de Presupuesto" (donde viste las 8,181 partidas)
   - Menú "Exportar" o "Descargar"

### Opción B: Desde el Software Neodata PU Win+

Si tienes instalado el software que viste en la página:

1. **Abrir** Neodata PU Win+ v25.5.0
2. **Ir a**: Catálogos o Precios Unitarios
3. **Exportar**:
   - Archivo → Exportar → Excel/CSV
   - O buscar botón "Exportar Catálogo"

## 📊 Método Recomendado: Copiar desde la Web

### Paso 1: Acceder al Catálogo

1. Ve a: https://neodatapu.appspot.com
2. Inicia sesión
3. Navega a la sección donde viste las 8,181 partidas

### Paso 2: Seleccionar Todo

1. **Marca el checkbox** "Ver todas las partidas"
2. O usa **Ctrl+A** para seleccionar toda la página

### Paso 3: Copiar

1. Presiona **Ctrl+C** (o botón derecho → Copiar)

### Paso 4: Pegar en Excel

1. Abre **Microsoft Excel** o **Google Sheets**
2. Presiona **Ctrl+V** para pegar
3. Verifica que todas las columnas se pegaron:
   - Partida
   - Renglón
   - Código
   - Descripción Completa
   - Unidad
   - Cantidad
   - Precio
   - Importe

### Paso 5: Guardar como CSV

1. En Excel: **Archivo → Guardar Como**
2. Formato: **CSV (delimitado por comas) (.csv)**
3. Nombre: `construbase-libre-2025.csv`
4. Guardar en: `data/construbase-libre-2025.csv`

## 🚀 Importar a la Plataforma

Una vez guardado el CSV:

```bash
node scripts/import-tabulador.js data/construbase-libre-2025.csv --source construbase --location México
```

## 🛠️ Si No Funciona el Método Manual

Si copiar/pegar no funciona bien, puedo crear un script que:

1. **Analice la página** del catálogo
2. **Extraiga** todas las partidas automáticamente
3. **Genere** el CSV

**¿Quieres que cree este script de extracción automática?**

---

**Próximo paso**: Ir a https://neodatapu.appspot.com y buscar la sección del catálogo (no la página de descargas de software).

