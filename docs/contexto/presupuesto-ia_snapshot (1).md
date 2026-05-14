### ARCHITECTURAL INTELLIGENCE SNAPSHOT
Project Context: presupuesto-ia
Tech Stack: React, JavaScript, CSS, SCSS/Sass, Vite, Vue, Tailwind CSS, Express.js, TypeScript, HTML, Python
Scale: 138 Analyzed Modules

### PROJECT IDENTITY
One-line Description: presupuesto-ia es un proyecto enfocado en análisis y visualización de arquitectura de software.
Architecture Summary: Frontend detectado con 132 archivos principales de interfaz. Backend detectado con 6 archivos de lógica/servicio. Se mapearon 255 relaciones entre módulos. Los hotspots más conectados son supabaseClient.js [15], AuthContext.jsx [14], ProjectContext.jsx [12], SubscriptionContext.jsx [10].
Primary Entry Points: presupuesto-ia/src/App.jsx, presupuesto-ia/src/main.jsx
Main Directories: presupuesto-ia
Dominant File Types: .jsx (70), .js (59), .py (6), .css (2), .html (1)

### PRODUCT CAPABILITIES
Core Product Capabilities: N/A
Core Product Files: N/A
Analysis Mode Split: Deterministic local analysis first, optional AI enrichment second.
Important Framing: No describas este proyecto solo como visualizador de grafo si las capacidades detectadas muestran handoff, task packs, error packs, impacto, búsqueda semántica o memoria de proyecto.

### EXPLICIT CONSTRAINTS
Deployment Model: local-first tool. No asumir SaaS, multiusuario ni servicio remoto salvo evidencia explícita.
Authentication: no se detectó autenticación, cuentas de usuario ni login como capacidad central del producto.
Persistence Model: la persistencia detectada es local. No afirmar almacenamiento en nube, base de datos de usuarios ni sincronización remota sin evidencia explícita.
Inference Rule: si una capacidad no aparece en archivos, rutas, dependencias o funciones detectadas, no la inventes.

### ESTRUCTURA DE DIRECTORIOS
└── presupuesto-ia/
    ├── scripts/
    │   ├── analizar-pdf-estructura.py
    │   ├── analizar-pdf-pagina.py
    │   ├── contar-todos-conceptos.js
    │   ├── contar-unicos-excel.js
    │   ├── convertir-excel-neodata.js
    │   ├── debug-pdf.py
    │   ├── descargar-cdmx-pdf.js
    │   ├── descargar-tabulador-cdmx.js
    │   ├── detectar-problema-importacion.js
    │   ├── extract-sept-custom.py
    │   ├── extraer-catalogo-construbase.js
    │   ├── extraer-pdf-cdmx.js
    │   ├── extraer-pdf-cdmx.py
    │   ├── extraer-pdf-mas-reciente.py
    │   ├── extraer-pdf-simple.js
    │   ├── fix-dark-mode-text.js
    │   ├── import-tabulador.js
    │   ├── iniciar-proxy-seguro.js
    │   ├── verificar-api-keys.js
    │   ├── verificar-conceptos-excel.js
    │   ├── verificar-faltantes.js
    │   ├── verificar-importacion-completa.js
    │   └── verify-prices.js
    ├── src/
    │   ├── components/
    │   │   ├── ai/
    │   │   │   ├── AIDescriptionGenerator.jsx
    │   │   │   └── AIPriceHelper.jsx
    │   │   ├── auth/
    │   │   │   ├── AdminRoute.jsx
    │   │   │   ├── ChangePasswordModal.jsx
    │   │   │   └── InactivityHandler.jsx
    │   │   ├── bitacora/
    │   │   │   ├── DiaryEntryModal.jsx
    │   │   │   ├── LogEntryModal.jsx
    │   │   │   └── PhotographicReportModal.jsx
    │   │   ├── budget/
    │   │   │   ├── APUModal.jsx
    │   │   │   ├── BudgetAnalysisModal.jsx
    │   │   │   ├── CostConceptsModal.jsx
    │   │   │   ├── GeneratorModal.jsx
    │   │   │   ├── PDFEditorModal.jsx
    │   │   │   ├── PDFPreviewModal.jsx
    │   │   │   ├── ScheduleModal.jsx
    │   │   │   └── TechnicalDescriptionViewer.jsx
    │   │   ├── layout/
    │   │   │   ├── Layout.jsx
    │   │   │   └── Sidebar.jsx
    │   │   ├── materials/
    │   │   │   ├── MaterialGenerator.jsx
    │   │   │   └── MaterialModal.jsx
    │   │   ├── schedule/
    │   │   │   ├── GanttChart.jsx
    │   │   │   └── ScheduleGenerator.jsx
    │   │   ├── sharing/
    │   │   │   └── ShareProjectModal.jsx
    │   │   ├── subscription/
    │   │   │   ├── LimitModal.jsx
    │   │   │   ├── PricingModal.jsx
    │   │   │   └── UsageNotification.jsx
    │   │   ├── support/
    │   │   │   └── SupportChat.jsx
    │   │   ├── templates/
    │   │   │   └── CreateTemplateModal.jsx
    │   │   ├── testing/
    │   │   │   └── ErrorTestPanel.jsx
    │   │   ├── ui/
    │   │   │   ├── AlertModal.jsx
    │   │   │   ├── Badge.jsx
    │   │   │   ├── Card.jsx
    │   │   │   ├── ConfirmModal.jsx
    │   │   │   ├── ImageCompressor.jsx
    │   │   │   ├── RateLimitModal.jsx
    │   │   │   └── Toast.jsx
    │   │   ├── ErrorBoundary.jsx
    │   │   ├── KeepAlive.jsx
    │   │   └── ProtectedRoute.jsx
    │   ├── context/
    │   │   ├── AuthContext.jsx
    │   │   ├── ErrorContext.jsx
    │   │   ├── PricingModalContext.jsx
    │   │   ├── ProjectContext.jsx
    │   │   ├── SidebarContext.jsx
    │   │   ├── SubscriptionContext.jsx
    │   │   └── ThemeContext.jsx
    │   ├── lib/
    │   │   ├── aiProxyServer.js
    │   │   ├── errorHandlers.js
    │   │   ├── sentry.js
    │   │   └── supabaseClient.js
    │   ├── pages/
    │   │   ├── AdminDashboard.jsx
    │   │   ├── BitacoraPage.jsx
    │   │   ├── Catalog.jsx
    │   │   ├── ConfirmEmail.jsx
    │   │   ├── Dashboard.jsx
    │   │   ├── DemoPage.jsx
    │   │   ├── Editor.jsx
    │   │   ├── History.jsx
    │   │   ├── LandingPage.jsx
    │   │   ├── Login.jsx
    │   │   ├── NotFound.jsx
    │   │   ├── PDFEditorPage.jsx
    │   │   ├── PDFTemplatesPage.jsx
    │   │   ├── PhotographicReportPage.jsx
    │   │   ├── PriceSearchPage.jsx
    │   │   ├── PricingPage.jsx
    │   │   ├── ProjectReportsDashboard.jsx
    │   │   ├── ScheduleGanttPage.jsx
    │   │   ├── SharedProjectPage.jsx
    │   │   ├── Templates.jsx
    │   │   └── UsageDashboard.jsx
    │   ├── scripts/
    │   │   └── test-supabase.js
    │   ├── services/
    │   │   ├── AIBudgetService.js
    │   │   ├── AIService.js
    │   │   ├── ApiKeyManager.js
    │   │   ├── APUService.js
    │   │   ├── BackendAIService.js
    │   │   ├── BitacoraService.js
    │   │   ├── CalculationsService.js
    │   │   ├── ErrorService.js
    │   │   ├── ExportService.js
    │   │   ├── ImageUploadService.js
    │   │   ├── ImportService.js
    │   │   ├── MarketPriceService.js
    │   │   ├── PDFReportService.js
    │   │   ├── PDFService.js
    │   │   ├── PDFTemplateService.js
    │   │   ├── ProjectPersistenceService.js
    │   │   ├── ShareService.js
    │   │   ├── StorageService.js
    │   │   ├── SubscriptionService.js
    │   │   ├── SupabaseService.js
    │   │   ├── SupportAIService.js
    │   │   ├── SystemSettingsService.js
    │   │   ├── TemplateService.js
    │   │   ├── UserSubscriptionService.js
    │   │   └── ValidationService.js
    │   ├── utils/
    │   │   ├── format.js
    │   │   ├── helpers.js
    │   │   ├── markdownRenderer.jsx
    │   │   ├── security.js
    │   │   └── testErrorHandling.js
    │   ├── App.css
    │   ├── App.jsx
    │   ├── index.css
    │   └── main.jsx
    ├── debug-pdf.js
    ├── eslint.config.js
    ├── index.html
    ├── list_models.js
    ├── postcss.config.js
    ├── tailwind.config.js
    ├── test-pdf.js
    ├── verify-pdf-text.js
    └── vite.config.js

### MODULE LAYER OVERVIEW
- [PRESUPUESTO-IA]: App.jsx, main.jsx, App.css, AIDescriptionGenerator.jsx, AIPriceHelper.jsx, AdminRoute.jsx, ChangePasswordModal.jsx, InactivityHandler.jsx, DiaryEntryModal.jsx, LogEntryModal.jsx...

### EXECUTIVE SUMMARY FOR AGENTS
- Project Goal: presupuesto-ia centraliza información del código para convertir un proyecto local en contexto accionable para humanos y agentes.
- Key Flows: Carga de archivos -> análisis local -> grafo y hotspots -> task packs / error packs / semantic search / impact analysis -> exportación de artefactos -> revisión con IA opcional.
- Product Differentiators: N/A
- Critical Hotspots: supabaseClient.js [15], AuthContext.jsx [14], ProjectContext.jsx [12], SubscriptionContext.jsx [10], format.js [10], AIBudgetService.js [9]
- Sample Dependency Paths: App.jsx -> PriceSearchPage.jsx, App.jsx -> DemoPage.jsx, App.jsx -> ConfirmEmail.jsx, App.jsx -> History.jsx, App.jsx -> ProjectContext.jsx, App.jsx -> ProtectedRoute.jsx, App.jsx -> PDFTemplatesPage.jsx, App.jsx -> UsageNotification.jsx

### GRAPH INTERPRETATION GUIDE
Este grafo representa dependencias entre archivos. Si un archivo A apunta a B, normalmente significa que A importa, usa o depende de B.
Los nodos con muchas conexiones entrantes suelen ser piezas centrales o utilidades compartidas. Los nodos con muchas conexiones salientes suelen ser orquestadores, pantallas principales o servicios que coordinan otros módulos.
- App.jsx: 36 conexiones totales (35 salientes, 1 entrantes). Usa -> PriceSearchPage.jsx, DemoPage.jsx, ConfirmEmail.jsx, History.jsx. Es usado por -> main.jsx.
- Editor.jsx: 29 conexiones totales (27 salientes, 2 entrantes). Usa -> APUService.js, ShareProjectModal.jsx, ProjectContext.jsx, MaterialGenerator.jsx. Es usado por -> App.jsx, DemoPage.jsx.
- AuthContext.jsx: 16 conexiones totales (2 salientes, 14 entrantes). Usa -> supabaseClient.js, sentry.js. Es usado por -> App.jsx, AdminRoute.jsx, ChangePasswordModal.jsx, InactivityHandler.jsx.
- ProjectContext.jsx: 16 conexiones totales (4 salientes, 12 entrantes). Usa -> helpers.js, supabaseClient.js, AuthContext.jsx, CalculationsService.js. Es usado por -> App.jsx, Layout.jsx, SupportChat.jsx, Catalog.jsx.
- supabaseClient.js: 15 conexiones totales (0 salientes, 15 entrantes). Usa -> N/A. Es usado por -> KeepAlive.jsx, AuthContext.jsx, ProjectContext.jsx, AdminDashboard.jsx.
- AIBudgetService.js: 14 conexiones totales (5 salientes, 9 entrantes). Usa -> helpers.js, APUService.js, ErrorService.js, BackendAIService.js. Es usado por -> AIDescriptionGenerator.jsx, AIPriceHelper.jsx, BudgetAnalysisModal.jsx, GeneratorModal.jsx.
- SubscriptionContext.jsx: 12 conexiones totales (2 salientes, 10 entrantes). Usa -> AuthContext.jsx, SubscriptionService.js. Es usado por -> App.jsx, LogEntryModal.jsx, PricingModal.jsx, UsageNotification.jsx.
- Layout.jsx: 10 conexiones totales (9 salientes, 1 entrantes). Usa -> ProjectContext.jsx, SupportChat.jsx, Sidebar.jsx, PricingModal.jsx. Es usado por -> App.jsx.
- Dashboard.jsx: 10 conexiones totales (10 salientes, 0 entrantes). Usa -> format.js, ErrorService.js, ProjectContext.jsx, AIBudgetService.js. Es usado por -> N/A.
- ErrorService.js: 10 conexiones totales (1 salientes, 9 entrantes). Usa -> sentry.js. Es usado por -> SupportChat.jsx, CreateTemplateModal.jsx, ErrorTestPanel.jsx, ErrorContext.jsx.

### STRATEGIC CLASS/FILE RELATIONSHIPS
[App.jsx] calls -> (PriceSearchPage.jsx, DemoPage.jsx, ConfirmEmail.jsx, History.jsx, ProjectContext.jsx, ProtectedRoute.jsx, PDFTemplatesPage.jsx, UsageNotification.jsx, BitacoraPage.jsx, PricingPage.jsx, LandingPage.jsx, UsageDashboard.jsx, ErrorContext.jsx, ProjectReportsDashboard.jsx, KeepAlive.jsx, AuthContext.jsx, Layout.jsx, SubscriptionContext.jsx, AdminRoute.jsx, SharedProjectPage.jsx, Catalog.jsx, InactivityHandler.jsx, AdminDashboard.jsx, Editor.jsx, Templates.jsx, AdminDashboard.jsx, SidebarContext.jsx, Login.jsx, PhotographicReportPage.jsx, ErrorBoundary.jsx, ThemeContext.jsx, NotFound.jsx, ScheduleGanttPage.jsx, PDFEditorPage.jsx, PricingModalContext.jsx)
[main.jsx] calls -> (App.jsx, sentry.js, testErrorHandling.js, index.css, errorHandlers.js)
[AIDescriptionGenerator.jsx] calls -> (AIBudgetService.js)
[AIPriceHelper.jsx] calls -> (AIBudgetService.js)
[AdminRoute.jsx] calls -> (AuthContext.jsx, SubscriptionService.js)
[ChangePasswordModal.jsx] calls -> (AuthContext.jsx)
[InactivityHandler.jsx] calls -> (AuthContext.jsx)
[DiaryEntryModal.jsx] calls -> (BitacoraService.js)
[LogEntryModal.jsx] calls -> (LimitModal.jsx, BitacoraService.js, SubscriptionContext.jsx)
[PhotographicReportModal.jsx] calls -> (ImageUploadService.js, BitacoraService.js)
[APUModal.jsx] calls -> (APUService.js)
[BudgetAnalysisModal.jsx] calls -> (AIBudgetService.js)
[GeneratorModal.jsx] calls -> (AIBudgetService.js)
[PDFPreviewModal.jsx] calls -> (PDFService.js)
[ScheduleModal.jsx] calls -> (GanttChart.jsx)
[ErrorBoundary.jsx] calls -> (sentry.js)
[KeepAlive.jsx] calls -> (supabaseClient.js)
[Layout.jsx] calls -> (ProjectContext.jsx, SupportChat.jsx, Sidebar.jsx, PricingModal.jsx, UsageNotification.jsx, SidebarContext.jsx, Toast.jsx, RateLimitModal.jsx, PricingModalContext.jsx)
[Sidebar.jsx] calls -> (ThemeContext.jsx, PDFTemplateService.js, AuthContext.jsx, ChangePasswordModal.jsx, SidebarContext.jsx)
[MaterialGenerator.jsx] calls -> (ProjectPersistenceService.js, MaterialModal.jsx, AIBudgetService.js)
[MaterialModal.jsx] calls -> (format.js, PDFService.js)
[ProtectedRoute.jsx] calls -> (AuthContext.jsx)
[ScheduleGenerator.jsx] calls -> (ProjectPersistenceService.js, AIBudgetService.js, ScheduleModal.jsx)
[ShareProjectModal.jsx] calls -> (ShareService.js)
[LimitModal.jsx] calls -> (SubscriptionService.js, PricingModalContext.jsx)
[PricingModal.jsx] calls -> (SubscriptionContext.jsx, markdownRenderer.jsx, SubscriptionService.js)
[UsageNotification.jsx] calls -> (SubscriptionContext.jsx, PricingModalContext.jsx, SubscriptionService.js)
[SupportChat.jsx] calls -> (ErrorService.js, SystemSettingsService.js, ErrorContext.jsx, ProjectContext.jsx, AuthContext.jsx, SubscriptionContext.jsx, SupportAIService.js, markdownRenderer.jsx)
[CreateTemplateModal.jsx] calls -> (ErrorService.js, PDFTemplateService.js)
[ErrorTestPanel.jsx] calls -> (ErrorService.js)
[ImageCompressor.jsx] calls -> (ImageUploadService.js, SubscriptionContext.jsx)
[Toast.jsx] calls -> (ErrorContext.jsx)
[AuthContext.jsx] calls -> (supabaseClient.js, sentry.js)
[ErrorContext.jsx] calls -> (ErrorService.js)
[ProjectContext.jsx] calls -> (helpers.js, supabaseClient.js, AuthContext.jsx, CalculationsService.js)
[SubscriptionContext.jsx] calls -> (AuthContext.jsx, SubscriptionService.js)
[aiProxyServer.js] calls -> (eslint.config.js, ApiKeyManager.js)
[errorHandlers.js] calls -> (sentry.js)
[AdminDashboard.jsx] calls -> (SystemSettingsService.js, supabaseClient.js, PricingModal.jsx, AuthContext.jsx, Toast.jsx, markdownRenderer.jsx, SubscriptionService.js)
[BitacoraPage.jsx] calls -> (ProjectPersistenceService.js, PDFReportService.js, ConfirmModal.jsx, LogEntryModal.jsx, BitacoraService.js, AlertModal.jsx)
[Catalog.jsx] calls -> (format.js, ProjectContext.jsx, AIBudgetService.js, Badge.jsx, MarketPriceService.js)
[ConfirmEmail.jsx] calls -> (supabaseClient.js)
[Dashboard.jsx] calls -> (format.js, ErrorService.js, ProjectContext.jsx, AIBudgetService.js, ErrorTestPanel.jsx, supabaseClient.js, AuthContext.jsx, CalculationsService.js, Card.jsx, ValidationService.js)
[DemoPage.jsx] calls -> (helpers.js, ProjectContext.jsx, Editor.jsx)
[Editor.jsx] calls -> (APUService.js, ShareProjectModal.jsx, ProjectContext.jsx, MaterialGenerator.jsx, AIPriceHelper.jsx, format.js, helpers.js, PDFPreviewModal.jsx, CreateTemplateModal.jsx, SubscriptionContext.jsx, BudgetAnalysisModal.jsx, TechnicalDescriptionViewer.jsx, ValidationService.js, PDFService.js, CostConceptsModal.jsx, LimitModal.jsx, AIDescriptionGenerator.jsx, Badge.jsx, GeneratorModal.jsx, Card.jsx, ProjectPersistenceService.js, ScheduleGenerator.jsx, ErrorService.js, SupabaseService.js, AIBudgetService.js, APUModal.jsx, ConfirmModal.jsx)
[History.jsx] calls -> (format.js, ProjectPersistenceService.js, ProjectContext.jsx, Card.jsx)
[Login.jsx] calls -> (AuthContext.jsx)
[NotFound.jsx] calls -> (Card.jsx)
[PDFTemplatesPage.jsx] calls -> (PDFTemplateService.js, PDFPreviewModal.jsx, ProjectContext.jsx, CalculationsService.js, Card.jsx, PDFService.js)
[PhotographicReportPage.jsx] calls -> (ImageUploadService.js, ProjectPersistenceService.js, PDFReportService.js, ProjectContext.jsx, LimitModal.jsx, BitacoraService.js, SubscriptionContext.jsx, AlertModal.jsx)
[PriceSearchPage.jsx] calls -> (ApiKeyManager.js, ProjectContext.jsx, AuthContext.jsx)
[PricingPage.jsx] calls -> (PricingModal.jsx, SubscriptionContext.jsx, PricingModalContext.jsx)
[ProjectReportsDashboard.jsx] calls -> (format.js, ProjectPersistenceService.js, ConfirmModal.jsx, AlertModal.jsx, Card.jsx)
[ScheduleGanttPage.jsx] calls -> (ProjectPersistenceService.js, GanttChart.jsx)
[SharedProjectPage.jsx] calls -> (format.js, ShareService.js, PDFService.js)
[Templates.jsx] calls -> (format.js, ProjectContext.jsx, AuthContext.jsx, Card.jsx, PDFTemplateService.js)
[UsageDashboard.jsx] calls -> (SubscriptionContext.jsx, Card.jsx, PricingModalContext.jsx, SubscriptionService.js)
[AIBudgetService.js] calls -> (helpers.js, APUService.js, ErrorService.js, BackendAIService.js, MarketPriceService.js)
[AIService.js] calls -> (BackendAIService.js)
[ApiKeyManager.js] calls -> (SystemSettingsService.js)
[APUService.js] calls -> (MarketPriceService.js)
[BitacoraService.js] calls -> (supabaseClient.js)
[CalculationsService.js] calls -> (APUService.js)
[ErrorService.js] calls -> (sentry.js)
[ExportService.js] calls -> (format.js, CalculationsService.js)
[ImportService.js] calls -> (helpers.js)
[MarketPriceService.js] calls -> (supabaseClient.js)
[PDFService.js] calls -> (format.js, PDFTemplateService.js)
[PDFTemplateService.js] calls -> (helpers.js)
[ProjectPersistenceService.js] calls -> (SupabaseService.js, supabaseClient.js)
[ShareService.js] calls -> (supabaseClient.js)
[StorageService.js] calls -> (helpers.js)
[SubscriptionService.js] calls -> (supabaseClient.js, SystemSettingsService.js)
[SupabaseService.js] calls -> (helpers.js, supabaseClient.js)
[SupportAIService.js] calls -> (ErrorService.js)
[SystemSettingsService.js] calls -> (security.js, supabaseClient.js)
[TemplateService.js] calls -> (supabaseClient.js)
[UserSubscriptionService.js] calls -> (ApiKeyManager.js, supabaseClient.js)
[testErrorHandling.js] calls -> (ErrorService.js, sentry.js)

### KEY SOURCE CODE (COMPRESSED TOP 12)

--- SOURCE: presupuesto-ia/src/App.jsx ---
```jsx
import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ProjectProvider } from './context/ProjectContext';
import { SubscriptionProvider } from './context/SubscriptionContext';
import { ThemeProvider } from './context/ThemeContext';
import { PricingModalProvider } from './context/PricingModalContext';
import { ErrorProvider } from './context/ErrorContext';
import { SidebarProvider } from './context/SidebarContext';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/layout/Layout';
import ErrorBoundary from './components/ErrorBoundary';
import Dashboard from './pages/Dashboard';
import Editor from './pages/Editor';
import Catalog from './pages/Catalog';
import History from './pages/History';
import Templates from './pages/Templates';
import PDFTemplatesPage from './pages/PDFTemplatesPage';
import Login from './pages/Login';
import LandingPage from './pages/LandingPage';
import DemoPage from './pages/DemoPage';
import BitacoraPage from './pages/BitacoraPage';
import PhotographicReportPage from './pages/PhotographicReportPage';
import PricingPage from './pages/PricingPage';
import UsageDashboard from './pages/UsageDashboard';
import ScheduleGanttPage from './pages/ScheduleGanttPage';
import SharedProjectPage from './pages/SharedProjectPage';
import UsageNotification from './components/subscription/UsageNotification';
import ConfirmEmail from './pages/ConfirmEmail';
import NotFound from './pages/NotFound';
import InactivityHandler from './components/auth/InactivityHandler';
import KeepAlive from './components/KeepAlive';
import AdminDashboard from './pages/AdminDashboard';
import AdminRoute from './components/auth/AdminRoute';
import PriceSearchPage from './pages/PriceSearchPage';
import PDFEditorPage from './pages/PDFEditorPage';
import ProjectReportsDashboard from './pages/ProjectReportsDashboard';


const App = () => {
    return (
        <ErrorBoundary>
            <ThemeProvider>
                <ErrorProvider>
                    <AuthProvider>
                        <SubscriptionProvider>
                            <PricingModalProvider>
                                <SidebarProvider>
                                    <ProjectProvider>
                                        <Router>
                                            <InactivityHandler />
                                            <KeepAlive />
                                            <Routes>
                                                {/* Landing Page - Public */}
                                                <Route path="/" element={<LandingPage />} />

                                                {/* Demo Page - Public */}
                                                <Route path="/demo" element={<DemoPage />} />

                                                {/* Email Confirmation - Public */}
                                                <Route path="/confirm-email" element={<ConfirmEmail />} />
                                                <Route path="/auth/callback" element={<ConfirmEmail />} />
                                                <Route path="/auth/confirm" element={<ConfirmEmail />} />

                                                {/* Shared Project Routes - Public */}
                                                <Route path="/share/:token" element={<SharedProjectPage />} />
                                                <Route path="/s/:token" element={<SharedProjectPage />} />

                                                {/* Public route - Login */}
                                                <Route path="/login" element={
                                                    <ProtectedRoute requireAuth={false}>
                                                        <Login />
                                                    </ProtectedRoute>
                                                } />

                                                {/* Protected routes - Require authentication */}
                                                <Route path="/dashboard" element={
                                                    <ProtectedRoute requireAuth={true}>
                                                        <Layout title="Visión General"><Dashboard /></Layout>
                                                    </ProtectedRoute>
// ... code continues (truncated for efficiency)
```

--- SOURCE: presupuesto-ia/src/main.jsx ---
```jsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App'

import './lib/sentry'

import './lib/errorHandlers'

if (import.meta.env.DEV) {
  import('./utils/testErrorHandling.js')
}

window.addEventListener('pageshow', (event) => {
  if (event.persisted) {
    window.location.reload();
  }
});

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

```

--- SOURCE: presupuesto-ia/src/App.css ---
```css
#root {
  width: 100%;
  margin: 0;
  padding: 0;
}

.logo {
  height: 6em;
  padding: 1.5em;
  will-change: filter;
  transition: filter 300ms;
}
.logo:hover {
  filter: drop-shadow(0 0 2em #646cffaa);
}
.logo.react:hover {
  filter: drop-shadow(0 0 2em #61dafbaa);
}

@keyframes logo-spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

@media (prefers-reduced-motion: no-preference) {
  a:nth-of-type(2) .logo {
    animation: logo-spin infinite 20s linear;
  }
}

.card {
  padding: 2em;
}

.read-the-docs {
  color: #888;
}

```

--- SOURCE: presupuesto-ia/src/components/ai/AIDescriptionGenerator.jsx ---
```jsx
import React, { useState } from 'react';
import { Sparkles, Loader, X, Check } from 'lucide-react';
import { AIBudgetService } from '../../services/AIBudgetService';

const AIDescriptionGenerator = ({ itemData, context, onSelect, onClose }) => {
    const [loading, setLoading] = useState(false);
    const [suggestions, setSuggestions] = useState([]);
    const [error, setError] = useState('');
    const [selectedIndex, setSelectedIndex] = useState(null);

    const generateSuggestions = async () => {
        setLoading(true);
        setError('');
        setSuggestions([]);

        try {
            const descriptions = await AIBudgetService.generateDescription(itemData, context);
            setSuggestions(descriptions);
        } catch (err) {
            console.error('Error generating descriptions:', err);
            setError(err.message || 'Error al generar descripciones');
        } finally {
            setLoading(false);
        }
    };

    const handleSelect = (description, index) => {
        setSelectedIndex(index);
        onSelect(description);
    };

    React.useEffect(() => {
        generateSuggestions();
    }, []);

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-hidden flex flex-col">
                {/* Header */}
                <div className="bg-gradient-to-r from-purple-600 to-indigo-600 p-6 text-white">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <Sparkles size={24} />
                            <div>
                                <h3 className="text-xl font-bold">Generador de Descripciones IA</h3>
                                <p className="text-purple-100 text-sm">Powered by Gemini AI</p>
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            className="hover:bg-white/20 p-2 rounded-lg transition"
                        >
                            <X size={20} />
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6">
                    {/* Item Info */}
                    <div className="bg-slate-50 rounded-lg p-4 mb-6">
                        <h4 className="font-semibold text-slate-700 mb-2">Información de la partida:</h4>
                        <div className="grid grid-cols-2 gap-2 text-sm">
                            {itemData.code && (
                                <div>
                                    <span className="text-slate-500">Código:</span>
                                    <span className="ml-2 font-medium">{itemData.code}</span>
                                </div>
                            )}
                            {itemData.unit && (
                                <div>
                                    <span className="text-slate-500">Unidad:</span>
                                    <span className="ml-2 font-medium">{itemData.unit}</span>
                                </div>
                            )}
                            {itemData.category && (
                                <div>
                                    <span className="text-slate-500">Categoría:</span>
                                    <span className="ml-2 font-medium">{itemData.category}</span>
                                </div>
// ... code continues (truncated for efficiency)
```

--- SOURCE: presupuesto-ia/src/components/ai/AIPriceHelper.jsx ---
```jsx
import React, { useState, useEffect } from 'react';
import { TrendingUp, Sparkles, AlertCircle } from 'lucide-react';
import { AIBudgetService } from '../../services/AIBudgetService';

const AIPriceHelper = ({ itemData, catalogData, onSuggestionClick }) => {
    const [suggestion, setSuggestion] = useState(null);
    const [loading, setLoading] = useState(false);
    const [visible, setVisible] = useState(false);


    const fetchSuggestion = async () => {
        setLoading(true);
        try {
            const result = await AIBudgetService.suggestPrice(itemData, catalogData);
            setSuggestion(result);
            setVisible(true);
        } catch (error) {
            console.error('Error fetching price suggestion:', error);
            setVisible(false);
        } finally {
            setLoading(false);
        }
    };

    const getConfidenceColor = (confidence) => {
        switch (confidence) {
            case 'high': return 'text-green-600 bg-green-50 border-green-200';
            case 'medium': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
            case 'low': return 'text-orange-600 bg-orange-50 border-orange-200';
            default: return 'text-slate-600 bg-slate-50 border-slate-200';
        }
    };

    const getConfidenceLabel = (confidence) => {
        switch (confidence) {
            case 'high': return 'Alta confianza';
            case 'medium': return 'Confianza media';
            case 'low': return 'Baja confianza';
            default: return 'Sin datos';
        }
    };

    if (!visible || !suggestion) {
        return (
            <button
                onClick={fetchSuggestion}
                disabled={loading}
                className="mt-1 text-xs flex items-center gap-1 text-purple-600 hover:text-purple-700 font-medium transition-colors"
                title="Consultar precio sugerido con IA"
            >
                {loading ? (
                    <span className="animate-spin">⏳</span>
                ) : (
                    <Sparkles size={14} />
                )}
                {loading ? 'Analizando...' : 'Sugerir Precio'}
            </button>
        );
    }

    if (suggestion.suggested === null) {
        return (
            <div className="mt-2 p-3 bg-slate-50 border border-slate-200 rounded-lg text-sm relative group">
                <button
                    onClick={() => setVisible(false)}
                    className="absolute top-1 right-1 text-slate-400 hover:text-slate-600"
                >
                    ×
                </button>
                <div className="flex items-center gap-2 text-slate-600">
                    <AlertCircle size={16} />
                    <span>{suggestion.message}</span>
                </div>
            </div>
        );
    }

    return (
        <div className="mt-2 p-3 bg-gradient-to-r from-purple-50 to-indigo-50 border border-purple-200 rounded-lg">
            <div className="flex items-start gap-3">
// ... code continues (truncated for efficiency)
```

--- SOURCE: presupuesto-ia/src/components/auth/AdminRoute.jsx ---
```jsx
import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Loader } from 'lucide-react';
import { SubscriptionService } from '../../services/SubscriptionService';

const AdminRoute = ({ children }) => {
    const { user, loading } = useAuth();

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50">
                <div className="text-center">
                    <Loader size={48} className="animate-spin text-blue-600 mx-auto mb-4" />
                    <p className="text-slate-600">Verificando permisos...</p>
                </div>
            </div>
        );
    }

    if (!user || !user.email || !SubscriptionService.isProEmail(user.email)) {
        return <Navigate to="/dashboard" replace />;
    }

    return children;
};

export default AdminRoute;

```

--- SOURCE: presupuesto-ia/src/components/auth/ChangePasswordModal.jsx ---
```jsx
import React, { useState } from 'react';
import { X, Lock, Eye, EyeOff, CheckCircle, AlertCircle } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const ChangePasswordModal = ({ isOpen, onClose }) => {
    const { updatePassword } = useAuth();
    const [formData, setFormData] = useState({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
    });
    const [showPasswords, setShowPasswords] = useState({
        current: false,
        new: false,
        confirm: false
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);

    const validatePassword = (password) => {
        const validations = {
            length: password.length >= 12,
            uppercase: /[A-Z]/.test(password),
            lowercase: /[a-z]/.test(password),
            number: /[0-9]/.test(password),
            special: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)
        };

        const strength = Object.values(validations).filter(Boolean).length;
        const strengthLevel = strength <= 2 ? 'débil' : strength <= 4 ? 'media' : 'fuerte';

        return {
            valid: validations.length && validations.uppercase && validations.lowercase && validations.number,
            validations,
            strength,
            strengthLevel
        };
    };

    const passwordValidation = formData.newPassword ? validatePassword(formData.newPassword) : null;

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess(false);

        if (!formData.currentPassword) {
            setError('Ingresa tu contraseña actual');
            return;
        }

        if (!formData.newPassword) {
            setError('Ingresa una nueva contraseña');
            return;
        }

        if (!passwordValidation?.valid) {
            setError('La nueva contraseña no cumple con los requisitos de seguridad');
            return;
        }

        if (formData.newPassword !== formData.confirmPassword) {
            setError('Las contraseñas no coinciden');
            return;
        }

        if (formData.currentPassword === formData.newPassword) {
            setError('La nueva contraseña debe ser diferente a la actual');
            return;
        }

        setLoading(true);
        try {
            const { error: updateError } = await updatePassword(formData.newPassword);
            
            if (updateError) {
                if (updateError.message.includes('password') || updateError.message.includes('auth')) {
                    setError('Error al actualizar la contraseña. Asegúrate de que tu contraseña actual sea correcta.');
                } else {
// ... code continues (truncated for efficiency)
```

--- SOURCE: presupuesto-ia/src/components/auth/InactivityHandler.jsx ---
```jsx
import React, { useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';

const INACTIVITY_LIMIT_MS = 60 * 60 * 1000;

const InactivityHandler = () => {
    const { user, signOut } = useAuth();
    const navigate = useNavigate();
    const timerRef = useRef(null);

    const handleLogout = useCallback(async () => {
        if (user) {
            console.log('Sesión cerrada automáticamente por inactividad');
            await signOut();
            navigate('/login?reason=inactivity', { replace: true });
        }
    }, [user, signOut, navigate]);

    const resetTimer = useCallback(() => {
        if (timerRef.current) {
            clearTimeout(timerRef.current);
        }
        if (user) {
            timerRef.current = setTimeout(handleLogout, INACTIVITY_LIMIT_MS);
        }
    }, [user, handleLogout]);

    useEffect(() => {
        if (!user) return;

        const events = ['mousemove', 'keydown', 'click', 'scroll', 'touchstart'];

        let lastReset = Date.now();
        const handleActivity = () => {
            const now = Date.now();
            if (now - lastReset > 1000) {
                resetTimer();
                lastReset = now;
            }
        };

        resetTimer();

        events.forEach(event => {
            window.addEventListener(event, handleActivity);
        });

        return () => {
            if (timerRef.current) clearTimeout(timerRef.current);
            events.forEach(event => {
                window.removeEventListener(event, handleActivity);
            });
        };
    }, [user, resetTimer]);

    return null; // Este componente no renderiza nada visualmente
};

export default InactivityHandler;

```

--- SOURCE: presupuesto-ia/src/components/bitacora/DiaryEntryModal.jsx ---
```jsx
import React, { useState } from 'react';
import { X, BookOpen, Save, Calendar } from 'lucide-react';
import BitacoraService from '../../services/BitacoraService';

const DiaryEntryModal = ({ isOpen, onClose, projectId, onSave, editingEntry = null }) => {
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [content, setContent] = useState('');
    const [authorName, setAuthorName] = useState('');
    const [authorRole, setAuthorRole] = useState('Residente');
    const [authorSignature, setAuthorSignature] = useState('');
    const [uploading, setUploading] = useState(false);
    const [noteNumber, setNoteNumber] = useState(null);

    React.useEffect(() => {
        if (isOpen && editingEntry) {
            const entryDate = editingEntry.log_date ? new Date(editingEntry.log_date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0];
            setDate(entryDate);
            setContent(editingEntry.content || '');
            setAuthorName(editingEntry.author_name || '');
            setAuthorRole(editingEntry.author_role || 'Residente');
            setAuthorSignature(editingEntry.author_signature || '');
        } else if (isOpen && !editingEntry) {
            setDate(new Date().toISOString().split('T')[0]);
            setContent('');
            setAuthorName('');
            setAuthorRole('Residente');
            setAuthorSignature('');
        }
    }, [isOpen, editingEntry]);

    React.useEffect(() => {
        if (isOpen && projectId && !editingEntry) {
            const fetchNextNoteNumber = async () => {
                try {
                    const nextNumber = await BitacoraService.getNextNoteNumber(projectId);
                    setNoteNumber(nextNumber);
                } catch (error) {
                    console.error('Error fetching note number:', error);
                    setNoteNumber(1);
                }
            };
            fetchNextNoteNumber();
        } else if (editingEntry) {
            setNoteNumber(editingEntry.note_number);
        }
    }, [isOpen, projectId, editingEntry]);

    if (!isOpen) return null;

    const handleSubmit = async () => {
        if (!projectId) {
            alert('Error: No se encontró el ID del proyecto');
            return;
        }

        if (!content.trim()) {
            alert('Por favor, escribe el contenido del diario');
            return;
        }

        if (!authorName.trim()) {
            alert('Por favor, ingresa el nombre del autor');
            return;
        }

        setUploading(true);
        try {
            const logDate = new Date(date + 'T12:00:00').toISOString();

            if (editingEntry && editingEntry.id) {
                await BitacoraService.updateLog(editingEntry.id, {
                    content,
                    logDate,
                    authorName,
                    authorRole,
                    authorSignature,
                    classification: 'Informe',
                    subject: `Diario de Obra - ${new Date(date).toLocaleDateString('es-MX')}`,
                    isDiaryEntry: true
                });
// ... code continues (truncated for efficiency)
```

--- SOURCE: presupuesto-ia/src/components/bitacora/LogEntryModal.jsx ---
```jsx
import React, { useState } from 'react';
import { X, FileText, Save, Cloud, Users, Package, AlertCircle } from 'lucide-react';
import BitacoraService from '../../services/BitacoraService';
import { useSubscription } from '../../context/SubscriptionContext';
import LimitModal from '../subscription/LimitModal';

const LogEntryModal = ({ isOpen, onClose, task, projectId, onSave, editingLog = null }) => {
    const { checkLimit, incrementUsage, isPro } = useSubscription();
    const [content, setContent] = useState('');
    const [progress, setProgress] = useState(0);
    const [uploading, setUploading] = useState(false);
    const [limitModal, setLimitModal] = useState({
        isOpen: false,
        actionType: null,
        usage: 0,
        limit: 0
    });

    const [subject, setSubject] = useState('');
    const [classification, setClassification] = useState('Informe');
    const [authorRole, setAuthorRole] = useState('Residente');
    const [status, setStatus] = useState('Abierta');
    const [noteNumber, setNoteNumber] = useState(null);
    
    const [weather, setWeather] = useState(''); // Condiciones climáticas
    const [materials, setMaterials] = useState(''); // Materiales utilizados
    const [personnel, setPersonnel] = useState(''); // Personal utilizado
    const [observations, setObservations] = useState(''); // Observaciones adicionales

    React.useEffect(() => {
        if (isOpen && editingLog) {
            const cleanContent = BitacoraService.getCleanContent(editingLog.content || '');
            setContent(cleanContent);
            setProgress(editingLog.progress_percentage || 0);
            setSubject(editingLog.subject || '');
            setClassification(editingLog.classification || 'Informe');
            setAuthorRole(editingLog.author_role || 'Residente');
            setStatus(editingLog.status || 'Abierta');
            setNoteNumber(editingLog.note_number);
            const metadata = BitacoraService.extractBitacoraMetadata(editingLog.content) || {};
            setWeather(metadata.weather || '');
            setMaterials(metadata.materials || '');
            setPersonnel(metadata.personnel || '');
            setObservations(metadata.observations || '');
        } else if (isOpen && !editingLog) {
            setContent('');
            setProgress(task?.progress || 0);
            setSubject('');
            setClassification('Informe');
            setAuthorRole('Residente');
            setStatus('Abierta');
            setWeather('');
            setMaterials('');
            setPersonnel('');
            setObservations('');
        }
    }, [isOpen, editingLog, task]);

    React.useEffect(() => {
        if (isOpen && projectId && !editingLog) {
            const fetchNextNoteNumber = async () => {
                try {
                    const nextNumber = await BitacoraService.getNextNoteNumber(projectId);
                    setNoteNumber(nextNumber);
                } catch (error) {
                    console.error('Error fetching note number:', error);
                    setNoteNumber(1); // Fallback
                }
            };
            fetchNextNoteNumber();
        } else if (editingLog) {
            setNoteNumber(editingLog.note_number);
        }
    }, [isOpen, projectId, editingLog]);

    if (!isOpen) return null;
    
    const taskData = task || { id: 'general', name: 'Nota General', progress: 0 };

    const handleSubmit = async () => {
// ... code continues (truncated for efficiency)
```

--- SOURCE: presupuesto-ia/src/components/bitacora/PhotographicReportModal.jsx ---
```jsx
import React, { useState, useEffect } from 'react';
import { X, Camera, Save, Plus, Trash2, Check, Upload } from 'lucide-react';
import BitacoraService from '../../services/BitacoraService';
import ImageUploadService from '../../services/ImageUploadService';

const PhotographicReportModal = ({ isOpen, onClose, projectId, items = [], onSave, editingLog = null }) => {
    const [reportDate, setReportDate] = useState(new Date().toISOString().split('T')[0]);
    const [entries, setEntries] = useState([]);
    const [uploading, setUploading] = useState(false);

    useEffect(() => {
        if (isOpen && editingLog) {
            const logDate = editingLog.log_date ? new Date(editingLog.log_date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0];
            setReportDate(logDate);

            const conceptName = editingLog.subject?.replace('Reporte Fotográfico: ', '') || 'Concepto';
            
            const item = items.find(i => 
                i.description === conceptName || 
                i.id?.toString() === editingLog.task_id
            );

            const entry = {
                id: Date.now(),
                logId: editingLog.id, // ID del log para actualizar
                itemId: item?.id || editingLog.task_id,
                itemName: conceptName,
                itemCode: item?.code || '',
                photos: [], // Se cargarán desde las URLs
                previewUrls: editingLog.photos || [], // URLs existentes
                photoUrls: editingLog.photos || [], // URLs originales para mantener
                description: editingLog.content || '',
                progress: editingLog.progress_percentage || 100,
                isCompleted: editingLog.progress_percentage === 100
            };

            setEntries([entry]);
        } else if (isOpen && !editingLog) {
            setReportDate(new Date().toISOString().split('T')[0]);
            setEntries([]);
        }
    }, [isOpen, editingLog, items]);

    useEffect(() => {
        return () => {
            entries.forEach(entry => {
                entry.previewUrls.forEach(url => {
                    if (url.startsWith('blob:')) {
                        ImageUploadService.revokePreviewUrl(url);
                    }
                });
            });
        };
    }, [entries]);

    if (!isOpen) return null;

    const handleAddBlock = () => {
        setEntries([...entries, {
            id: Date.now(),
            itemId: 'block-' + Date.now(),
            itemName: '',
            itemCode: '',
            photos: [],
            previewUrls: [],
            photoUrls: [],
            description: '',
            progress: 100,
            isCompleted: true
        }]);
    };

    const handleRemoveEntry = (entryId) => {
        const entry = entries.find(e => e.id === entryId);
        if (entry) {
            entry.previewUrls.forEach(url => ImageUploadService.revokePreviewUrl(url));
        }
        setEntries(entries.filter(e => e.id !== entryId));
    };

// ... code continues (truncated for efficiency)
```

--- SOURCE: presupuesto-ia/src/components/budget/APUModal.jsx ---
```jsx
import React, { useState, useEffect } from 'react';
import { X, Calculator, Check, AlertTriangle, Settings } from 'lucide-react';
import { APUService } from '../../services/APUService';

const APUModal = ({ item, apuData, onClose, onApply }) => {
    const [editableData, setEditableData] = useState(null);
    const [totals, setTotals] = useState({
        materialsTotal: 0,
        laborTotal: 0,
        equipmentTotal: 0,
        minorToolsCost: 0,
        directCost: 0,
        indirectCost: 0,
        subtotal1: 0,
        financingCost: 0,
        subtotal2: 0,
        profitCost: 0,
        subtotal3: 0,
        additionalCost: 0,
        finalPrice: 0
    });

    useEffect(() => {
        if (apuData) {
            const normalized = APUService.normalizeAPUData(apuData);
            setEditableData(normalized);
        }
    }, [apuData]);

    useEffect(() => {
        if (editableData) {
            calculateTotals();
        }
    }, [editableData]);

    if (!item || !editableData) return null;

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('es-MX', {
            style: 'currency',
            currency: 'MXN'
        }).format(amount);
    };

    const formatPercent = (val) => `${(val * 100).toFixed(2)}%`;

    const calculateTotals = () => {
        const calculatedTotals = APUService.calculateAPUTotals(editableData);
        setTotals(calculatedTotals);
    };

    const handleUpdateRow = (category, index, field, value) => {
        const newData = { ...editableData };
        const row = newData[category][index];
        row[field] = parseFloat(value) || 0;
        setEditableData(newData);
    };

    const handleUpdatePct = (field, value) => {
        const newData = { ...editableData };
        newData[field] = parseFloat(value) / 100;
        setEditableData(newData);
    };

    const renderLaborTable = () => (
        <div className="mb-6">
            <h3 className="text-sm font-bold uppercase tracking-wider mb-2 text-orange-700 dark:text-orange-400 border-b border-orange-200 dark:border-orange-700 pb-1">
                Mano de Obra
            </h3>
            <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                    <thead className="bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-300 font-medium">
                        <tr>
                            <th className="px-3 py-2">Categoría</th>
                            <th className="px-3 py-2 w-16 text-center">Und</th>
                            <th className="px-3 py-2 w-20 text-right">Cant.</th>
                            <th className="px-3 py-2 w-24 text-right">Salario Base</th>
                            <th className="px-3 py-2 w-16 text-right">FSR</th>
                            <th className="px-3 py-2 w-24 text-right">Salario Real</th>
                            <th className="px-3 py-2 w-24 text-right">Total</th>
// ... code continues (truncated for efficiency)
```
