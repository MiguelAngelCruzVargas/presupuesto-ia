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
                                                } />

                                                {/* Editor Routes */}
                                                <Route path="/editor" element={
                                                    <ProtectedRoute requireAuth={true}>
                                                        <Layout title="Constructor de Presupuestos"><Editor /></Layout>
                                                    </ProtectedRoute>
                                                } />
                                                <Route path="/editor/:id" element={
                                                    <ProtectedRoute requireAuth={true}>
                                                        <Layout title="Constructor de Presupuestos"><Editor /></Layout>
                                                    </ProtectedRoute>
                                                } />

                                                {/* Bitacora Route */}
                                                <Route path="/project/:id/bitacora" element={
                                                    <ProtectedRoute requireAuth={true}>
                                                        <Layout title="Bitácora de Obra"><BitacoraPage /></Layout>
                                                    </ProtectedRoute>
                                                } />

                                                {/* Schedule Gantt Route */}
                                                <Route path="/project/:id/schedule" element={
                                                    <ProtectedRoute requireAuth={true}>
                                                        <ScheduleGanttPage />
                                                    </ProtectedRoute>
                                                } />

                                                {/* Photographic Report Routes */}
                                                <Route path="/project/:projectId/report/new" element={
                                                    <ProtectedRoute requireAuth={true}>
                                                        <Layout title="Nuevo Reporte Fotográfico"><PhotographicReportPage /></Layout>
                                                    </ProtectedRoute>
                                                } />
                                                <Route path="/project/:projectId/report/:logId/edit" element={
                                                    <ProtectedRoute requireAuth={true}>
                                                        <Layout title="Editar Reporte Fotográfico"><PhotographicReportPage /></Layout>
                                                    </ProtectedRoute>
                                                } />

                                                <Route path="/catalog" element={
                                                    <ProtectedRoute requireAuth={true}>
                                                        <Layout title="Base de Datos Maestra"><Catalog /></Layout>
                                                    </ProtectedRoute>
                                                } />
                                                <Route path="/templates" element={
                                                    <ProtectedRoute requireAuth={true}>
                                                        <Layout title="Plantillas"><Templates /></Layout>
                                                    </ProtectedRoute>
                                                } />
                                                <Route path="/pdf-templates" element={
                                                    <ProtectedRoute requireAuth={true}>
                                                        <Layout title="Configurar PDF"><PDFTemplatesPage /></Layout>
                                                    </ProtectedRoute>
                                                } />
                                                <Route path="/history" element={
                                                    <ProtectedRoute requireAuth={true}>
                                                        <Layout title="Archivos Guardados"><History /></Layout>
                                                    </ProtectedRoute>
                                                } />
                                                <Route path="/pricing" element={
                                                    <ProtectedRoute requireAuth={true}>
                                                        <Layout title="Planes y Precios"><PricingPage /></Layout>
                                                    </ProtectedRoute>
                                                } />
                                                <Route path="/usage" element={
                                                    <ProtectedRoute requireAuth={true}>
                                                        <Layout title="Dashboard de Uso"><UsageDashboard /></Layout>
                                                    </ProtectedRoute>
                                                } />

                                                {/* Price Search Route */}
                                                <Route path="/pricesearch" element={
                                                    <ProtectedRoute requireAuth={true}>
                                                        <Layout title="Búsqueda de Precios"><PriceSearchPage /></Layout>
                                                    </ProtectedRoute>
                                                } />

                                                {/* PDF Editor Route */}
                                                <Route path="/pdf-editor" element={
                                                    <ProtectedRoute requireAuth={true}>
                                                        <Layout title="Editar PDF"><PDFEditorPage /></Layout>
                                                    </ProtectedRoute>
                                                } />

                                                {/* Admin Route */}
                                                <Route path="/admin" element={
                                                    <AdminRoute>
                                                        <Layout title="Administración del Sistema"><AdminDashboard /></Layout>
                                                    </AdminRoute>
                                                } />

                                                {/* Catch-all route - 404 Not Found */}
                                                <Route path="*" element={<NotFound />} />
                                            </Routes>
                                        </Router>
                                    </ProjectProvider>
                                </SidebarProvider>
                            </PricingModalProvider>
                        </SubscriptionProvider>
                    </AuthProvider>
                </ErrorProvider>
            </ThemeProvider>
        </ErrorBoundary>
    );
};

export default App;
