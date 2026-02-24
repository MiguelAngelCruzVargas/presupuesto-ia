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

    // Verificar si hay usuario y si es email admin (Pro email)
    if (!user || !user.email || !SubscriptionService.isProEmail(user.email)) {
        return <Navigate to="/dashboard" replace />;
    }

    return children;
};

export default AdminRoute;
