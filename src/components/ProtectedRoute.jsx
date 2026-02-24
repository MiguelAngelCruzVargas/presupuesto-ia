import React, { useEffect } from 'react';
import { Navigate, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Loader } from 'lucide-react';

const ProtectedRoute = ({ children, requireAuth = false }) => {
    const { user, loading } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();

    // Monitorear continuamente el estado de autenticación
    useEffect(() => {
        if (!loading) {
            // Si requiere autenticación y no hay usuario, forzar redirección
            if (requireAuth && !user) {
                navigate('/login', { replace: true });
            }
            // Si está en login/registro y ya hay usuario, forzar redirección al dashboard
            if (!requireAuth && user && (location.pathname === '/login' || location.pathname === '/register')) {
                navigate('/dashboard', { replace: true });
            }
        }
    }, [user, loading, requireAuth, navigate, location.pathname]);

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50">
                <div className="text-center">
                    <Loader size={48} className="animate-spin text-blue-600 mx-auto mb-4" />
                    <p className="text-slate-600">Cargando...</p>
                </div>
            </div>
        );
    }

    // Si requiere autenticación y no hay usuario, redirigir a login
    if (requireAuth && !user) {
        return <Navigate to="/login" replace />;
    }

    // Si está en login y ya hay usuario, redirigir al dashboard
    if (!requireAuth && user) {
        return <Navigate to="/dashboard" replace />;
    }

    return children;
};

export default ProtectedRoute;
