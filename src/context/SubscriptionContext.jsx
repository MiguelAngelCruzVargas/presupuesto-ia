import React, { createContext, useState, useEffect, useContext } from 'react';
import { useAuth } from './AuthContext';
import { SubscriptionService } from '../services/SubscriptionService';

const SubscriptionContext = createContext();

export const useSubscription = () => {
    const context = useContext(SubscriptionContext);
    if (context === undefined) {
        throw new Error('useSubscription must be used within a SubscriptionProvider');
    }
    return context;
};

export const SubscriptionProvider = ({ children }) => {
    const { user } = useAuth();
    const [plan, setPlan] = useState(SubscriptionService.PLANS.FREE);
    const [usage, setUsage] = useState(SubscriptionService.getDefaultUsage());
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (user) {
            // Verificar inmediatamente si es un email Pro
            if (user.email && SubscriptionService.isProEmail(user.email)) {
                setPlan(SubscriptionService.PLANS.PRO);
                setUsage(SubscriptionService.getDefaultUsage());
                setLoading(false);
            } else {
                loadSubscriptionData();
            }
        } else {
            setPlan(SubscriptionService.PLANS.FREE);
            setUsage(SubscriptionService.getDefaultUsage());
            setLoading(false);
        }
    }, [user]);

    const loadSubscriptionData = async () => {
        if (!user) return;

        // Verificar primero si es email Pro
        if (user.email && SubscriptionService.isProEmail(user.email)) {
            setPlan(SubscriptionService.PLANS.PRO);
            setUsage(SubscriptionService.getDefaultUsage());
            setLoading(false);
            return;
        }

        setLoading(true);
        try {
            const [userPlan, userUsage] = await Promise.all([
                SubscriptionService.getUserPlan(user.id),
                SubscriptionService.getUserUsage(user.id)
            ]);

            setPlan(userPlan);
            setUsage(userUsage);
        } catch (error) {
            console.error('Error loading subscription data:', error);
            // Si hay error pero es email Pro, asignar Pro
            if (user.email && SubscriptionService.isProEmail(user.email)) {
                setPlan(SubscriptionService.PLANS.PRO);
            }
        } finally {
            setLoading(false);
        }
    };

    const checkLimit = async (actionType) => {
        if (!user) return { allowed: false, remaining: 0 };

        // Si es email Pro, siempre permitir
        if (user.email && SubscriptionService.isProEmail(user.email)) {
            return { allowed: true, remaining: -1, limit: -1, current: 0 };
        }

        const result = await SubscriptionService.canPerformAction(user.id, actionType);

        // Actualizar uso local
        if (result.allowed) {
            setUsage(prev => ({
                ...prev,
                [actionType]: (prev[actionType] || 0) + 1
            }));
        }

        return result;
    };

    const incrementUsage = async (actionType) => {
        if (!user) return;

        try {
            await SubscriptionService.incrementUsage(user.id, actionType);
            await loadSubscriptionData(); // Recargar datos
        } catch (error) {
            console.error('Error incrementing usage:', error);
        }
    };

    const refreshData = async () => {
        await loadSubscriptionData();
    };

    // Determinar si es Pro (por plan o por email especial)
    const isProUser = plan.id === 'pro' || (user?.email && SubscriptionService.isProEmail(user.email));

    const value = {
        plan: isProUser ? SubscriptionService.PLANS.PRO : plan,
        usage,
        loading,
        checkLimit,
        incrementUsage,
        refreshData,
        isPro: isProUser
    };

    return (
        <SubscriptionContext.Provider value={value}>
            {children}
        </SubscriptionContext.Provider>
    );
};

