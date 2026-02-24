import React, { createContext, useState, useEffect, useContext } from 'react';
import { supabase } from '../lib/supabaseClient';
import { setSentryUser, clearSentryUser } from '../lib/sentry';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Check active session
        supabase.auth.getSession().then(({ data: { session } }) => {
            const currentUser = session?.user ?? null;
            setUser(currentUser);
            setLoading(false);

            // Configurar usuario en Sentry
            if (currentUser) {
                setSentryUser(currentUser);
            }
        });

        // Listen for auth changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            const currentUser = session?.user ?? null;
            setUser(currentUser);

            // Configurar usuario en Sentry
            if (currentUser) {
                setSentryUser(currentUser);
            } else {
                clearSentryUser();
            }
        });

        return () => subscription.unsubscribe();
    }, []);

    const signUp = async (email, password, metadata = {}) => {
        // Obtener la URL base de la aplicación
        const baseUrl = window.location.origin;

        const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: metadata,
                emailRedirectTo: `${baseUrl}/confirm-email`
            }
        });
        return { data, error };
    };

    const signIn = async (email, password) => {
        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password
        });
        return { data, error };
    };

    const signOut = async () => {
        // Limpiar estado inmediatamente para evitar race conditions antes de la navegación
        setUser(null);

        const { error } = await supabase.auth.signOut();

        // Limpiar usuario de Sentry
        clearSentryUser();

        return { error };
    };

    const resetPassword = async (email) => {
        // Obtener la URL base de la aplicación
        const baseUrl = window.location.origin;

        const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
            redirectTo: `${baseUrl}/confirm-email`
        });
        return { data, error };
    };

    const updatePassword = async (newPassword) => {
        const { data, error } = await supabase.auth.updateUser({
            password: newPassword
        });
        return { data, error };
    };

    const value = {
        user,
        loading,
        signUp,
        signIn,
        signOut,
        resetPassword,
        updatePassword
    };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
