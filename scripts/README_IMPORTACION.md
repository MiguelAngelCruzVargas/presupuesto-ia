# 📦 Scripts de Importación de Tabuladores

## 🎯 Propósito

Script para importar precios desde tabuladores oficiales (CDMX y CONSTRUBASE-LIBRE) a la base de datos de precios de referencia.

## 📋 Requisitos Previos

1. **Variables de entorno configuradas** (`.env`):
   ```
   VITE_SUPABASE_URL=tu_url_de_supabase
   VITE_SUPABASE_ANON_KEY=tu_clave_anon
   ```

2. **Dependencias instaladas**:
   ```bash
   npm install
   ```

3. **Archivo CSV o Excel** con los precios del tabulador

## 🚀 Uso

### Formato Básico

```bash
node scripts/import-tabulador.js <archivo> --source <tipo> [--location <ubicación>]
```

### Ejemplos

#### Importar Tabulador CDMX:
```bash
node scripts/import-tabulador.js data/cdmx-tabulador-2025.csv --source cdmx --location CDMX
```

#### Importar CONSTRUBASE-LIBRE:
```bash
node scripts/import-tabulador.js data/construbase-libre.xlsx --source construbase --location México
```

#### Sin especificar ubicación (usa default):
```bash
node scripts/import-tabulador.js tabulador.csv --source cdmx
```

## 📊 Formato del Archivo

### Columnas Requeridas

El script detecta automáticamente estas columnas (con variaciones de mayúsculas/minúsculas):

- **Descripción**: Descripción del concepto
  - Acepta: `Descripción`, `DESCRIPCION`, `Descripción Completa`, `Concepto`
  
- **Unidad**: Unidad de medida
  - Acepta: `Unidad`, `UNIDAD`, `U`, `UM`
  - Normaliza automáticamente: M2→m2, PZA→pza, JOR→jor, etc.

- **Precio**: Precio unitario
  - Acepta: `Precio`, `Precio Unitario`, `Precio Unitario (MXN)`, `Importe`, `Costo`

### Columnas Opcionales

- **Categoría**: Clasificación
  - Si no existe, se infiere de la descripción
  
- **Partida**: Código de partida (para CDMX)
- **Renglón**: Sub-código (para CDMX)

### Ejemplo de CSV

```csv
Partida,Renglón,Descripción,Unidad,Precio,Categoría
A0101,10,Trazo y nivelación manual para establecer ejes,M2,9.46,Obra Civil
A0101,90,Tapial de 2.00 m de altura a base de lámina,M,1003.37,Obra Civil
A0102,20,Tala de árbol hasta de 10 cm de diámetro,PZA,173.71,Obra Civil
```

## 🔧 Opciones

### `--source`
Tipo de tabulador a importar:
- `cdmx` - Tabulador Oficial CDMX
- `construbase` - CONSTRUBASE-LIBRE

### `--location`
Ubicación geográfica (opcional):
- Si es `cdmx`: default es `CDMX`
- Si es `construbase`: default es `México`
- Puedes especificar: `CDMX`, `México`, `Ciudad de México`, etc.

### `--help` o `-h`
Muestra la ayuda del script

## 📈 Proceso de Importación

1. **Lectura**: Lee el archivo CSV/Excel
2. **Validación**: Valida y normaliza cada registro
3. **Mapeo**: Convierte a formato de precio de referencia
4. **Importación**: Inserta o actualiza en Supabase
5. **Reporte**: Muestra resumen de importación

### Normalizaciones Automáticas

- **Unidades**: Normaliza a formato estándar (m2, m3, pza, jor, hora, etc.)
- **Categorías**: Mapea a categorías estándar (Materiales, Mano de Obra, Obra Civil, etc.)
- **Precios**: Elimina caracteres no numéricos y valida que sea > 0

## 📊 Salida del Script

El script muestra:

```
📊 INICIANDO IMPORTACIÓN
════════════════════════════════════════════════════════════
📁 Archivo: cdmx-tabulador-2025.csv
🔖 Fuente: Tabulador Oficial CDMX
📍 Ubicación: CDMX
📅 Año: 2025
════════════════════════════════════════════════════════════

📖 Leyendo archivo...
   ✅ 8181 registros leídos

🔄 Procesando registros...
   ✅ 8100 precios válidos procesados
   ⚠️  81 registros con errores

💾 Importando a base de datos...
   Importados: 8100/8100 (C: 7850, U: 250, E: 0)

✅ IMPORTACIÓN COMPLETADA
════════════════════════════════════════════════════════════
✅ Creados:    7850
🔄 Actualizados: 250
❌ Errores:    0
📊 Total:      8100
════════════════════════════════════════════════════════════
```

## ⚠️ Errores Comunes

### "Variables de entorno requeridas"
- **Solución**: Crea un archivo `.env` en la raíz del proyecto con tus credenciales de Supabase

### "Archivo no encontrado"
- **Solución**: Verifica que la ruta al archivo sea correcta (relativa o absoluta)

### "Formato no soportado"
- **Solución**: Usa archivos `.csv`, `.xlsx` o `.xls`

### "Fuente desconocida"
- **Solución**: Usa `--source cdmx` o `--source construbase`

## 🔄 Actualización de Precios

Si importas el mismo archivo varias veces:
- Los precios **existentes se actualizarán** automáticamente
- Se comparan por: descripción + unidad + categoría + ubicación + fuente
- Se actualiza el precio y la fecha de última actualización

## 📝 Notas Importantes

1. **Año Actual**: El script usa automáticamente el año actual (2025) en los metadatos
2. **Duplicados**: Se detectan y actualizan automáticamente
3. **Validación**: Solo se importan precios válidos (> 0)
4. **Metadata**: Se guarda información adicional (partida, renglón, año, etc.)

## 🚀 Próximos Pasos

Después de importar:

1. **Verificar datos**: Revisa en Supabase que los precios se importaron correctamente
2. **Probar generación**: Genera un presupuesto para verificar que los precios se usan
3. **Actualizar mensualmente**: Re-importa el tabulador cuando haya actualizaciones

---

**¿Necesitas ayuda?** Revisa los logs del script o consulta la documentación de Supabase.

