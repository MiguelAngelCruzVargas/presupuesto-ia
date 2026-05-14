# Hotspots & Deuda Técnica: presupuesto-ia

## Hotspots Prioritarios
1. supabaseClient.js
   Path: presupuesto-ia/src/lib/supabaseClient.js
   Importancia: 15
   Tipo: .js
2. AuthContext.jsx
   Path: presupuesto-ia/src/context/AuthContext.jsx
   Importancia: 14
   Tipo: .jsx
3. ProjectContext.jsx
   Path: presupuesto-ia/src/context/ProjectContext.jsx
   Importancia: 12
   Tipo: .jsx
4. SubscriptionContext.jsx
   Path: presupuesto-ia/src/context/SubscriptionContext.jsx
   Importancia: 10
   Tipo: .jsx
5. format.js
   Path: presupuesto-ia/src/utils/format.js
   Importancia: 10
   Tipo: .js
6. AIBudgetService.js
   Path: presupuesto-ia/src/services/AIBudgetService.js
   Importancia: 9
   Tipo: .js
7. ErrorService.js
   Path: presupuesto-ia/src/services/ErrorService.js
   Importancia: 9
   Tipo: .js
8. Card.jsx
   Path: presupuesto-ia/src/components/ui/Card.jsx
   Importancia: 8
   Tipo: .jsx
9. ProjectPersistenceService.js
   Path: presupuesto-ia/src/services/ProjectPersistenceService.js
   Importancia: 8
   Tipo: .js
10. helpers.js
   Path: presupuesto-ia/src/utils/helpers.js
   Importancia: 8
   Tipo: .js

## Recomendaciones de Acción
- Revisa primero los archivos con más conexiones entrantes: suelen ser utilidades compartidas o núcleos frágiles.
- Revisa luego los archivos con más conexiones salientes: suelen ser orquestadores o pantallas con demasiadas responsabilidades.
- Antes de refactorizar, sigue las relaciones del grafo para evitar romper cadenas de dependencias ocultas.
