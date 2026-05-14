# Graph Guide: presupuesto-ia

## Cómo Leer Este Archivo
- "Usa" significa que un archivo depende de otro.
- "Recibe uso de" significa que otros módulos dependen de ese archivo.
- Los módulos listados primero son los más relevantes para entender el flujo real del proyecto.

## Resumen del Grafo
- Nodos: 138
- Relaciones: 255
- Módulos más conectados: App.jsx (36), Editor.jsx (29), AuthContext.jsx (16), ProjectContext.jsx (16), supabaseClient.js (15), AIBudgetService.js (14), SubscriptionContext.jsx (12), Layout.jsx (10)

## Archivos Orquestadores
- App.jsx
  Path: presupuesto-ia/src/App.jsx
  Usa: PriceSearchPage.jsx, DemoPage.jsx, ConfirmEmail.jsx, History.jsx, ProjectContext.jsx, ProtectedRoute.jsx, PDFTemplatesPage.jsx, UsageNotification.jsx
  Recibe uso de: main.jsx
- Editor.jsx
  Path: presupuesto-ia/src/pages/Editor.jsx
  Usa: APUService.js, ShareProjectModal.jsx, ProjectContext.jsx, MaterialGenerator.jsx, AIPriceHelper.jsx, format.js, helpers.js, PDFPreviewModal.jsx
  Recibe uso de: App.jsx, DemoPage.jsx
- AuthContext.jsx
  Path: presupuesto-ia/src/context/AuthContext.jsx
  Usa: supabaseClient.js, sentry.js
  Recibe uso de: App.jsx, AdminRoute.jsx, ChangePasswordModal.jsx, InactivityHandler.jsx, Sidebar.jsx, ProtectedRoute.jsx, SupportChat.jsx, ProjectContext.jsx
- ProjectContext.jsx
  Path: presupuesto-ia/src/context/ProjectContext.jsx
  Usa: helpers.js, supabaseClient.js, AuthContext.jsx, CalculationsService.js
  Recibe uso de: App.jsx, Layout.jsx, SupportChat.jsx, Catalog.jsx, Dashboard.jsx, DemoPage.jsx, Editor.jsx, History.jsx
- AIBudgetService.js
  Path: presupuesto-ia/src/services/AIBudgetService.js
  Usa: helpers.js, APUService.js, ErrorService.js, BackendAIService.js, MarketPriceService.js
  Recibe uso de: AIDescriptionGenerator.jsx, AIPriceHelper.jsx, BudgetAnalysisModal.jsx, GeneratorModal.jsx, MaterialGenerator.jsx, ScheduleGenerator.jsx, Catalog.jsx, Dashboard.jsx
- SubscriptionContext.jsx
  Path: presupuesto-ia/src/context/SubscriptionContext.jsx
  Usa: AuthContext.jsx, SubscriptionService.js
  Recibe uso de: App.jsx, LogEntryModal.jsx, PricingModal.jsx, UsageNotification.jsx, SupportChat.jsx, ImageCompressor.jsx, Editor.jsx, PhotographicReportPage.jsx
- Layout.jsx
  Path: presupuesto-ia/src/components/layout/Layout.jsx
  Usa: ProjectContext.jsx, SupportChat.jsx, Sidebar.jsx, PricingModal.jsx, UsageNotification.jsx, SidebarContext.jsx, Toast.jsx, RateLimitModal.jsx
  Recibe uso de: App.jsx
- Dashboard.jsx
  Path: presupuesto-ia/src/pages/Dashboard.jsx
  Usa: format.js, ErrorService.js, ProjectContext.jsx, AIBudgetService.js, ErrorTestPanel.jsx, supabaseClient.js, AuthContext.jsx, CalculationsService.js
  Recibe uso de: Nadie
- ProjectPersistenceService.js
  Path: presupuesto-ia/src/services/ProjectPersistenceService.js
  Usa: SupabaseService.js, supabaseClient.js
  Recibe uso de: MaterialGenerator.jsx, ScheduleGenerator.jsx, BitacoraPage.jsx, Editor.jsx, History.jsx, PhotographicReportPage.jsx, ProjectReportsDashboard.jsx, ScheduleGanttPage.jsx
- SupportChat.jsx
  Path: presupuesto-ia/src/components/support/SupportChat.jsx
  Usa: ErrorService.js, SystemSettingsService.js, ErrorContext.jsx, ProjectContext.jsx, AuthContext.jsx, SubscriptionContext.jsx, SupportAIService.js, markdownRenderer.jsx
  Recibe uso de: Layout.jsx
- AdminDashboard.jsx
  Path: presupuesto-ia/src/pages/AdminDashboard.jsx
  Usa: SystemSettingsService.js, supabaseClient.js, PricingModal.jsx, AuthContext.jsx, Toast.jsx, markdownRenderer.jsx, SubscriptionService.js
  Recibe uso de: App.jsx, App.jsx
- PhotographicReportPage.jsx
  Path: presupuesto-ia/src/pages/PhotographicReportPage.jsx
  Usa: ImageUploadService.js, ProjectPersistenceService.js, PDFReportService.js, ProjectContext.jsx, LimitModal.jsx, BitacoraService.js, SubscriptionContext.jsx, AlertModal.jsx
  Recibe uso de: App.jsx

## Núcleo Compartido
- Editor.jsx
  Path: presupuesto-ia/src/pages/Editor.jsx
  Recibe uso de: App.jsx, DemoPage.jsx
  Usa: APUService.js, ShareProjectModal.jsx, ProjectContext.jsx, MaterialGenerator.jsx, AIPriceHelper.jsx, format.js, helpers.js, PDFPreviewModal.jsx
- AuthContext.jsx
  Path: presupuesto-ia/src/context/AuthContext.jsx
  Recibe uso de: App.jsx, AdminRoute.jsx, ChangePasswordModal.jsx, InactivityHandler.jsx, Sidebar.jsx, ProtectedRoute.jsx, SupportChat.jsx, ProjectContext.jsx
  Usa: supabaseClient.js, sentry.js
- ProjectContext.jsx
  Path: presupuesto-ia/src/context/ProjectContext.jsx
  Recibe uso de: App.jsx, Layout.jsx, SupportChat.jsx, Catalog.jsx, Dashboard.jsx, DemoPage.jsx, Editor.jsx, History.jsx
  Usa: helpers.js, supabaseClient.js, AuthContext.jsx, CalculationsService.js
- supabaseClient.js
  Path: presupuesto-ia/src/lib/supabaseClient.js
  Recibe uso de: KeepAlive.jsx, AuthContext.jsx, ProjectContext.jsx, AdminDashboard.jsx, ConfirmEmail.jsx, Dashboard.jsx, BitacoraService.js, MarketPriceService.js
  Usa: Nadie
- AIBudgetService.js
  Path: presupuesto-ia/src/services/AIBudgetService.js
  Recibe uso de: AIDescriptionGenerator.jsx, AIPriceHelper.jsx, BudgetAnalysisModal.jsx, GeneratorModal.jsx, MaterialGenerator.jsx, ScheduleGenerator.jsx, Catalog.jsx, Dashboard.jsx
  Usa: helpers.js, APUService.js, ErrorService.js, BackendAIService.js, MarketPriceService.js
- SubscriptionContext.jsx
  Path: presupuesto-ia/src/context/SubscriptionContext.jsx
  Recibe uso de: App.jsx, LogEntryModal.jsx, PricingModal.jsx, UsageNotification.jsx, SupportChat.jsx, ImageCompressor.jsx, Editor.jsx, PhotographicReportPage.jsx
  Usa: AuthContext.jsx, SubscriptionService.js
- ErrorService.js
  Path: presupuesto-ia/src/services/ErrorService.js
  Recibe uso de: SupportChat.jsx, CreateTemplateModal.jsx, ErrorTestPanel.jsx, ErrorContext.jsx, Dashboard.jsx, Editor.jsx, AIBudgetService.js, SupportAIService.js
  Usa: sentry.js
- ProjectPersistenceService.js
  Path: presupuesto-ia/src/services/ProjectPersistenceService.js
  Recibe uso de: MaterialGenerator.jsx, ScheduleGenerator.jsx, BitacoraPage.jsx, Editor.jsx, History.jsx, PhotographicReportPage.jsx, ProjectReportsDashboard.jsx, ScheduleGanttPage.jsx
  Usa: SupabaseService.js, supabaseClient.js
- format.js
  Path: presupuesto-ia/src/utils/format.js
  Recibe uso de: MaterialModal.jsx, Catalog.jsx, Dashboard.jsx, Editor.jsx, History.jsx, ProjectReportsDashboard.jsx, SharedProjectPage.jsx, Templates.jsx
  Usa: Nadie
- AdminDashboard.jsx
  Path: presupuesto-ia/src/pages/AdminDashboard.jsx
  Recibe uso de: App.jsx, App.jsx
  Usa: SystemSettingsService.js, supabaseClient.js, PricingModal.jsx, AuthContext.jsx, Toast.jsx, markdownRenderer.jsx, SubscriptionService.js
- SubscriptionService.js
  Path: presupuesto-ia/src/services/SubscriptionService.js
  Recibe uso de: AdminRoute.jsx, LimitModal.jsx, PricingModal.jsx, UsageNotification.jsx, SubscriptionContext.jsx, AdminDashboard.jsx, UsageDashboard.jsx
  Usa: supabaseClient.js, SystemSettingsService.js
- Card.jsx
  Path: presupuesto-ia/src/components/ui/Card.jsx
  Recibe uso de: Dashboard.jsx, Editor.jsx, History.jsx, NotFound.jsx, PDFTemplatesPage.jsx, ProjectReportsDashboard.jsx, Templates.jsx, UsageDashboard.jsx
  Usa: Nadie

## Recomendación Para Otro Agente
Empieza por los archivos orquestadores, luego revisa el núcleo compartido y por último entra a archivos hoja. Este orden reduce tokens y acelera el entendimiento del sistema.
