# Sistema IA para Presupuestos Vagamente Descritos

## Objetivo

Hacer que PresuGenius genere presupuestos útiles aunque el usuario escriba instrucciones incompletas o pobres, por ejemplo:

- `hazme una barda de 20 metros`
- `quiero presupuesto de una casa pequeña`
- `desarrollame una losa de 100 m2`
- `hazme una remodelacion de baño`

La app no debe depender de que el usuario sepa estructurar prompts con rol, objetivo, alcance o formato técnico.  
La responsabilidad de estructurar la petición debe pasar al sistema.

## Diagnóstico del estado actual

Hoy [AIBudgetService.js](C:/Users/MQerKAcademy/Desktop/proyectos/presupuesto-ia/src/services/AIBudgetService.js) usa un modelo de `prompt único grande`:

- mezcla contexto del catálogo
- mezcla reglas técnicas
- mezcla precios oficiales
- mezcla instrucciones de salida JSON
- genera directamente las partidas finales

Eso tiene ventajas:

- ya produce partidas técnicamente aceptables en muchos casos
- ya usa catálogo y tabulador
- ya obliga a devolver JSON

Pero tiene debilidades claras:

- si el usuario escribe algo muy ambiguo, la IA rellena demasiado por su cuenta
- no existe una fase formal de detección de faltantes
- no hay política explícita de supuestos
- no hay distinción entre `puedo generar ya` y `debo preguntar antes`
- no hay nivel de confianza estructurado
- el modelo puede “desvariar” sin dejar trazabilidad clara

## Principio rector

La IA no debe pasar de texto libre a partidas finales de un solo salto.

Debe existir un flujo de 4 capas:

1. Interpretar el texto del usuario
2. Detectar información faltante
3. Decidir si pregunta o genera preliminar
4. Generar el presupuesto técnico con supuestos explícitos

## Arquitectura propuesta

### Fase 1. Normalizador de intención

Entrada:

- prompt del usuario
- `projectInfo`
- ubicación actual
- tipo de especialidad si existe

Salida esperada:

```json
{
  "intent": "generate_budget",
  "project_type": "albanileria",
  "work_type": "barda de block",
  "scope_summary": "Construccion de barda perimetral de block",
  "measurements": {
    "length_m": 20,
    "height_m": null,
    "width_m": null,
    "area_m2": null,
    "volume_m3": null
  },
  "location": "Tuxtla Gutierrez, Chiapas",
  "finish_level": null,
  "detected_requirements": [
    "muro de block"
  ],
  "missing_data": [
    "altura",
    "tipo de block",
    "cimentacion",
    "acabado"
  ],
  "can_generate_preliminary": true,
  "confidence": 0.71
}
```

Función:

- entender qué quiere hacer el usuario
- extraer dimensiones y pistas técnicas
- clasificar el tipo de obra
- listar faltantes sin inventar todavía

### Fase 2. Evaluador de completitud

Esta fase decide si el pedido ya está suficientemente completo para generar presupuesto final o si conviene preguntar algo.

Salida esperada:

```json
{
  "decision": "ask_clarifying_questions",
  "reason": "faltan datos estructurales clave para evitar suposiciones fuertes",
  "missing_critical": [
    "altura",
    "tipo de block",
    "incluye cimentacion"
  ],
  "missing_optional": [
    "acabado",
    "pintura"
  ],
  "questions": [
    "¿Qué altura tendrá la barda en metros?",
    "¿Será de block de 12, 15 o 20 cm?",
    "¿La quieres solo en muro o también con cimentación, castillos y dala?"
  ],
  "allow_preliminary_budget": true
}
```

Regla práctica:

- si faltan 1 a 3 datos críticos: preguntar
- si faltan demasiados pero el usuario solo quiere avanzar: generar preliminar con supuestos
- si el texto ya es suficiente: generar directo

### Fase 3. Constructor de supuestos

Cuando falte información, la app puede seguir adelante, pero no de forma silenciosa.

Salida esperada:

```json
{
  "assumptions": [
    "Se asume altura de 2.50 m",
    "Se asume block hueco de 15x20x40 cm",
    "Se asume cimentacion corrida de concreto armado",
    "Se asume castillo cada 3.00 m",
    "Se asume acabado aparente sin pintura"
  ],
  "assumption_level": "medium",
  "warnings": [
    "Presupuesto preliminar sujeto a validacion de medidas y sistema constructivo"
  ]
}
```

Esto es obligatorio para evitar que la IA invente y el usuario crea que son datos confirmados.

### Fase 4. Generador técnico de partidas

Solo aquí se usa el prompt largo tipo Neodata.

Entrada:

- prompt original
- JSON normalizado
- decisión de completitud
- supuestos aprobados
- catálogo relevante
- precios oficiales
- reglas por especialidad

Salida:

- partidas JSON
- notas de cálculo
- supuestos usados
- advertencias

Formato mínimo recomendado:

```json
{
  "generation_mode": "preliminary",
  "summary": "Presupuesto preliminar para barda de block de 20.00 m de longitud",
  "assumptions_used": [
    "Altura de 2.50 m",
    "Block de 15 cm",
    "Incluye cimentacion y castillos"
  ],
  "items": [
    {
      "description": "Trazo y nivelacion para desplante de barda de block...",
      "unit": "ml",
      "quantity": 20,
      "unitPrice": 45,
      "category": "Obra Civil",
      "calculation_basis": "20.00 ml de longitud de barda",
      "isCatalogItem": false
    }
  ],
  "warnings": [
    "Validar altura final de la barda antes de usar para cotizacion cerrada"
  ]
}
```

## Modo de uso recomendado en la interfaz

### Modo 1. Entrada rápida

El usuario escribe libremente:

- `hazme una barda de 20 metros`
- `quiero una casa de 60 m2 con dos cuartos`

La app debe responder con una de estas dos rutas:

- `Te faltan 3 datos clave. ¿Te los pregunto o te genero una versión preliminar?`
- o generar directo si hay suficientes datos

### Modo 2. Entrada guiada

Después de detectar el tipo de obra, la app muestra campos mínimos inteligentes.

Ejemplo para barda:

- largo
- alto
- espesor o tipo de block
- cimentación sí/no
- castillos y dala sí/no
- acabado
- ubicación

### Modo 3. Entrada experta

Para usuarios avanzados:

- dejan texto largo
- pegan especificación
- pegan memoria descriptiva

Aquí el sistema también pasa por normalización, pero probablemente no hará preguntas.

## Política de preguntas

No conviene bombardear al usuario con un formulario completo.

Regla:

- máximo 3 preguntas por ciclo
- preguntas concretas y técnicas
- siempre ofrecer botón alterno: `Generar preliminar con supuestos`

Ejemplos de preguntas buenas:

- `¿Qué altura tendrá la barda?`
- `¿Incluye cimentación y castillos?`
- `¿La losa será maciza, aligerada o de vigueta y bovedilla?`

Ejemplos de preguntas malas:

- `Describe mejor tu proyecto`
- `Dame más detalles`
- `Especifica el alcance técnico completo`

## Política de supuestos

Todo supuesto debe cumplir esto:

1. Ser visible para el usuario
2. Quedar guardado junto al presupuesto
3. Poder convertirse en campo editable
4. Marcar si el presupuesto es preliminar o validado

Clasificación:

- `low`: casi no hubo supuestos
- `medium`: hubo varios supuestos razonables
- `high`: faltaba demasiada información

Si el nivel es `high`, la app debe mostrar una advertencia clara:

`Este presupuesto es preliminar y debe validarse antes de enviarlo al cliente.`

## Datos mínimos por tipo de obra

### Barda

Mínimos ideales:

- longitud
- altura
- tipo de block
- cimentación sí/no
- castillos/dala sí/no
- acabado

### Losa

Mínimos ideales:

- área o largo/ancho
- tipo de losa
- espesor
- resistencia del concreto
- acero o sistema estructural
- acabado inferior/superior

### Casa / vivienda

Mínimos ideales:

- superficie aproximada
- número de niveles
- número de espacios
- nivel de acabado
- sistema constructivo
- ubicación

### Remodelación de baño

Mínimos ideales:

- dimensiones aproximadas
- qué se demuele
- qué se instala nuevo
- tipo de acabados
- muebles y accesorios incluidos

## Diseño de prompts propuesto

### Prompt A. Normalizador

Rol:

`Eres un analista de requerimientos de construcción en México. Tu trabajo es convertir texto libre y ambiguo en un JSON estructurado sin inventar silenciosamente.`

Reglas:

- extrae solo lo que esté presente o sea muy inferible
- marca faltantes como `null` o en listas
- devuelve solo JSON
- no generes partidas todavía

### Prompt B. Decisor

Rol:

`Eres un revisor técnico que determina si una solicitud ya puede presupuestarse o si requiere preguntas mínimas de aclaración.`

Reglas:

- prioriza seguridad técnica
- máximo 3 preguntas
- si es posible, permitir preliminar

### Prompt C. Generador técnico

Este puede heredar mucho de tu prompt actual en `AIBudgetService`, pero ya alimentado con:

- tipo de obra normalizado
- medidas confirmadas
- supuestos aprobados
- catálogo relevante
- precios oficiales
- modo de generación: preliminar o validado

### Prompt D. Validador final

Rol:

`Eres un auditor técnico de presupuestos de construcción. Revisa omisiones típicas, conceptos faltantes, cantidades incoherentes y supuestos no declarados.`

Objetivo:

- revisar si faltó cimentación
- revisar si faltó mano de obra implícita
- revisar si la cantidad parece incompatible con las medidas
- revisar si la salida contradice el alcance

## Contrato de datos sugerido

Se recomienda crear estas estructuras en código:

- `BudgetIntent`
- `BudgetCompletenessDecision`
- `BudgetAssumptions`
- `BudgetGenerationResult`

### BudgetIntent

```json
{
  "intent": "generate_budget",
  "project_type": "",
  "work_type": "",
  "scope_summary": "",
  "measurements": {},
  "location": "",
  "detected_requirements": [],
  "missing_data": [],
  "confidence": 0
}
```

### BudgetCompletenessDecision

```json
{
  "decision": "generate_now | ask_clarifying_questions | generate_preliminary",
  "questions": [],
  "missing_critical": [],
  "missing_optional": [],
  "allow_preliminary_budget": true
}
```

### BudgetAssumptions

```json
{
  "assumptions": [],
  "assumption_level": "low | medium | high",
  "warnings": []
}
```

### BudgetGenerationResult

```json
{
  "generation_mode": "validated | preliminary",
  "summary": "",
  "assumptions_used": [],
  "items": [],
  "warnings": []
}
```

## Propuesta de implementación en tu código actual

### Fase 1. Sin romper lo existente

Agregar nuevas funciones en [AIBudgetService.js](C:/Users/MQerKAcademy/Desktop/proyectos/presupuesto-ia/src/services/AIBudgetService.js):

- `normalizeBudgetPrompt(prompt, projectInfo, config)`
- `assessBudgetPromptCompleteness(normalizedIntent)`
- `buildBudgetAssumptions(normalizedIntent, decision, projectInfo)`
- `generateBudgetFromStructuredIntent(prompt, structuredIntent, decision, assumptions, catalog, config)`

La función actual `generateBudgetFromPrompt(...)` puede seguir existiendo, pero convertirse en orquestador.

### Fase 2. Mejorar experiencia en UI

En el flujo del editor:

- si la decisión es `ask_clarifying_questions`, mostrar modal corto
- si la decisión permite preliminar, ofrecer botón:
  - `Responder preguntas`
  - `Generar preliminar`

### Fase 3. Persistencia

Guardar en el proyecto:

- prompt original
- intent normalizado
- supuestos usados
- warnings
- modo de generación

Esto ayuda para:

- auditoría
- regenerar mejor después
- explicar por qué salieron ciertas partidas

## Ejemplo real deseado

Entrada del usuario:

`Hazme una barda de 20 metros`

Respuesta ideal del sistema:

1. Detecta:
   - obra: barda de block
   - longitud: 20 m
   - faltan altura, block, cimentación, acabado

2. UI responde:

`Puedo ayudarte, pero me faltan 3 datos clave:
- altura de la barda
- tipo de block
- si incluye cimentación y castillos

¿Quieres responder eso o te genero un preliminar con supuestos?`

3. Si el usuario elige preliminar:

- altura asumida: 2.50 m
- block asumido: 15 cm
- incluye cimentación y castillos
- acabado aparente

4. La IA genera partidas y deja esas suposiciones visibles.

## Reglas de calidad

La IA de presupuestos debe obedecer estas reglas:

1. Nunca inventar silenciosamente datos críticos
2. Declarar siempre supuestos
3. No hacer preguntas abiertas vagas
4. Priorizar preguntas mínimas y concretas
5. Marcar si el resultado es preliminar
6. Mantener trazabilidad entre prompt, faltantes, supuestos y salida final

## Recomendación de rollout

### Etapa 1

Solo diseñar y consumir el normalizador antes del generador final.

### Etapa 2

Activar preguntas de aclaración en UI.

### Etapa 3

Guardar supuestos y warnings dentro del proyecto.

### Etapa 4

Agregar validador post-generación para detectar omisiones típicas.

## Conclusión

El producto no debe exigir usuarios expertos en prompting.  
Debe aceptar lenguaje cotidiano y convertirlo en un flujo técnico controlado.

La mejora clave no es solo cambiar de modelo, sino cambiar la arquitectura del razonamiento:

- de `prompt único`
- a `pipeline estructurado`

Eso reducirá desvaríos, mejorará consistencia, permitirá preguntas inteligentes y dejará la aplicación lista para escalar a distintos modelos baratos o premium sin depender tanto de la “magia” del LLM.
