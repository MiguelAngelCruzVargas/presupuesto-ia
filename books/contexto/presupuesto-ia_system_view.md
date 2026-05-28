# System View: presupuesto-ia

## Capas Detectadas
- [presupuesto-ia]: debug-pdf.js, eslint.config.js, index.html, list_models.js, postcss.config.js, tailwind.config.js, test-pdf.js, verify-pdf-text.js, vite.config.js
- [presupuesto-ia/scripts]: analizar-pdf-estructura.py, analizar-pdf-pagina.py, contar-todos-conceptos.js, contar-unicos-excel.js, convertir-excel-neodata.js, debug-pdf.py, descargar-cdmx-pdf.js, descargar-tabulador-cdmx.js, detectar-problema-importacion.js, extract-sept-custom.py, extraer-catalogo-construbase.js, extraer-pdf-cdmx.js...
- [presupuesto-ia/src]: App.jsx, main.jsx, App.css, AIDescriptionGenerator.jsx, AIPriceHelper.jsx, AdminRoute.jsx, ChangePasswordModal.jsx, InactivityHandler.jsx, DiaryEntryModal.jsx, LogEntryModal.jsx, PhotographicReportModal.jsx, APUModal.jsx...

## Módulos Más Conectados
- App.jsx: 36 conexiones (35 salientes, 1 entrantes)
  Usa -> PriceSearchPage.jsx, DemoPage.jsx, ConfirmEmail.jsx, History.jsx
  Es usado por -> main.jsx
- Editor.jsx: 29 conexiones (27 salientes, 2 entrantes)
  Usa -> APUService.js, ShareProjectModal.jsx, ProjectContext.jsx, MaterialGenerator.jsx
  Es usado por -> App.jsx, DemoPage.jsx
- AuthContext.jsx: 16 conexiones (2 salientes, 14 entrantes)
  Usa -> supabaseClient.js, sentry.js
  Es usado por -> App.jsx, AdminRoute.jsx, ChangePasswordModal.jsx, InactivityHandler.jsx
- ProjectContext.jsx: 16 conexiones (4 salientes, 12 entrantes)
  Usa -> helpers.js, supabaseClient.js, AuthContext.jsx, CalculationsService.js
  Es usado por -> App.jsx, Layout.jsx, SupportChat.jsx, Catalog.jsx
- supabaseClient.js: 15 conexiones (0 salientes, 15 entrantes)
  Usa -> N/A
  Es usado por -> KeepAlive.jsx, AuthContext.jsx, ProjectContext.jsx, AdminDashboard.jsx
- AIBudgetService.js: 14 conexiones (5 salientes, 9 entrantes)
  Usa -> helpers.js, APUService.js, ErrorService.js, BackendAIService.js
  Es usado por -> AIDescriptionGenerator.jsx, AIPriceHelper.jsx, BudgetAnalysisModal.jsx, GeneratorModal.jsx
- SubscriptionContext.jsx: 12 conexiones (2 salientes, 10 entrantes)
  Usa -> AuthContext.jsx, SubscriptionService.js
  Es usado por -> App.jsx, LogEntryModal.jsx, PricingModal.jsx, UsageNotification.jsx
- Layout.jsx: 10 conexiones (9 salientes, 1 entrantes)
  Usa -> ProjectContext.jsx, SupportChat.jsx, Sidebar.jsx, PricingModal.jsx
  Es usado por -> App.jsx
- Dashboard.jsx: 10 conexiones (10 salientes, 0 entrantes)
  Usa -> format.js, ErrorService.js, ProjectContext.jsx, AIBudgetService.js
  Es usado por -> N/A
- ErrorService.js: 10 conexiones (1 salientes, 9 entrantes)
  Usa -> sentry.js
  Es usado por -> SupportChat.jsx, CreateTemplateModal.jsx, ErrorTestPanel.jsx, ErrorContext.jsx

## Flujos de Dependencia
- App.jsx -> PriceSearchPage.jsx
- App.jsx -> DemoPage.jsx
- App.jsx -> ConfirmEmail.jsx
- App.jsx -> History.jsx
- App.jsx -> ProjectContext.jsx
- App.jsx -> ProtectedRoute.jsx
- App.jsx -> PDFTemplatesPage.jsx
- App.jsx -> UsageNotification.jsx
- App.jsx -> BitacoraPage.jsx
- App.jsx -> PricingPage.jsx
- App.jsx -> LandingPage.jsx
- App.jsx -> UsageDashboard.jsx
- App.jsx -> ErrorContext.jsx
- App.jsx -> ProjectReportsDashboard.jsx
- App.jsx -> KeepAlive.jsx
- App.jsx -> AuthContext.jsx
- App.jsx -> Layout.jsx
- App.jsx -> SubscriptionContext.jsx
- App.jsx -> AdminRoute.jsx
- App.jsx -> SharedProjectPage.jsx
