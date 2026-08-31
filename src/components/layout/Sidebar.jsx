import React, { useState, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { LayoutDashboard, FileText, Book, History, Hammer, LogOut, User, Layers, FileImage, Key, Moon, Sun, BarChart3, ChevronLeft, ChevronRight, Shield, DollarSign, FileEdit, Camera } from 'lucide-react';

import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { useSidebar } from '../../context/SidebarContext';
import { PDFTemplateService } from '../../services/PDFTemplateService';
import ChangePasswordModal from '../auth/ChangePasswordModal';

// En monitores de poca altura el bloque de abajo (tema + tarjeta de usuario)
// se come el espacio del menú. Con esto se detecta para compactarlo.
// 900px: por debajo de eso el menú completo (11 opciones + encabezado + pie)
// ya no cabe sin recortarse. Súbelo o bájalo si quieres otro punto de corte.
const useShortViewport = (maxHeight = 900) => {
    const query = `(max-height: ${maxHeight}px)`;
    const [isShort, setIsShort] = useState(
        () => typeof window !== 'undefined' && window.matchMedia(query).matches
    );

    useEffect(() => {
        const mq = window.matchMedia(query);
        const onChange = (event) => setIsShort(event.matches);
        setIsShort(mq.matches);
        mq.addEventListener('change', onChange);
        return () => mq.removeEventListener('change', onChange);
    }, [query]);

    return isShort;
};

const Sidebar = ({ mobileOpen, setMobileOpen }) => {
    const { user, signOut } = useAuth();
    const { isDark, toggleTheme } = useTheme();
    const { isCollapsed, toggleSidebar } = useSidebar();
    const navigate = useNavigate();
    const [hasActiveTemplate, setHasActiveTemplate] = useState(false);
    const [showChangePasswordModal, setShowChangePasswordModal] = useState(false);

    // Verificar si es admin
    const isAdmin = user?.email === 'isc20350265@gmail.com';

    // Determinar si el sidebar debe mostrarse expandido (texto visible)
    // En mobile siempre expandido si está abierto, en desktop depende de isCollapsed
    const isExpanded = mobileOpen || !isCollapsed;

    // Pantalla baja: menos aire y pie de sidebar en una sola fila de iconos
    const isShort = useShortViewport();
    const compactFooter = isShort && isExpanded;

    useEffect(() => {
        // Trae las plantillas de tu cuenta al entrar, para que el PDF salga con
        // tu marca aunque sea la primera vez que abres la app en este equipo
        let cancelado = false;
        (async () => {
            if (user) await PDFTemplateService.syncFromCloud();
            if (!cancelado) setHasActiveTemplate(!!PDFTemplateService.getActiveTemplate());
        })();
        return () => { cancelado = true; };
    }, [user]);

    const navItems = [
        { path: '/dashboard', icon: LayoutDashboard, label: 'Tablero' },
        { path: '/editor', icon: FileText, label: 'Presupuesto' },
        { path: '/reports', icon: Camera, label: 'Reportes' },
        { path: '/catalog', icon: Book, label: 'Catálogo' },
        { path: '/templates', icon: Layers, label: 'Plantillas' },
        { path: '/usage', icon: BarChart3, label: 'Mi Uso' },

        {
            path: '/pdf-templates',
            icon: FileImage,
            label: 'Configurar PDF',
            badge: hasActiveTemplate ? '✓' : null
        },
        { path: '/history', icon: History, label: 'Historial' },
        { path: '/pricesearch', icon: DollarSign, label: 'Precios IA' },
        ...(isAdmin ? [{ path: '/admin', icon: Shield, label: 'Administrar', badge: 'Admin' }] : [])
    ];

    const handleLogout = async () => {
        await signOut();
        navigate('/login', { replace: true });
    };

    return (
        <aside className={`
            fixed h-full z-40 transition-all duration-300 shadow-xl bg-slate-900 text-white flex flex-col
            ${mobileOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0
            w-64 ${isCollapsed ? 'lg:w-20' : 'lg:w-64'}
        `}>
            <div className={`${isShort ? 'p-4' : 'p-6'} flex items-center ${!isExpanded ? 'justify-center' : 'gap-3'} border-b border-slate-800 relative`}>
                <div className="bg-blue-600 p-2 rounded-lg shadow-lg shadow-blue-900/50">
                    <Hammer className="text-white" size={24} />
                </div>
                {isExpanded && (
                    <div className="block">
                        <h1 className="font-bold text-lg tracking-tight">PresuGenius</h1>
                        <p className="text-[10px] text-slate-400 uppercase tracking-widest">Pro Edition</p>
                    </div>
                )}
                {/* Botón para colapsar/expandir - Solo visible en Desktop */}
                <button
                    onClick={toggleSidebar}
                    className="hidden lg:block absolute -right-3 top-1/2 -translate-y-1/2 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-full p-1.5 transition-all z-50 shadow-lg"
                    title={isCollapsed ? 'Expandir menú' : 'Colapsar menú'}
                >
                    {isCollapsed ? (
                        <ChevronRight size={16} className="text-slate-300" />
                    ) : (
                        <ChevronLeft size={16} className="text-slate-300" />
                    )}
                </button>
            </div>

            <nav className={`flex-1 min-h-0 px-3 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-700 ${isShort ? 'py-2 space-y-1' : 'py-6 space-y-2'}`}>
                {navItems.map(item => (
                    <NavLink
                        key={item.path}
                        to={item.path}
                        onClick={() => mobileOpen && setMobileOpen(false)} // Cerrar sidebar al navegar en mobile
                        className={({ isActive }) => `w-full flex items-center ${!isExpanded ? 'justify-center px-0' : 'gap-3 px-4'} ${isShort ? 'py-2' : 'py-3'} rounded-xl transition-all duration-200 group relative
              ${isActive ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/40 translate-x-1' : 'text-slate-400 hover:bg-white/5 hover:text-white'}`}
                        title={!isExpanded ? item.label : ''}
                    >
                        {({ isActive }) => (
                            <>
                                <item.icon size={20} className={isActive ? 'animate-pulse' : ''} />
                                {isExpanded && (
                                    <>
                                        <span className="font-medium block">{item.label}</span>
                                        {item.badge && (
                                            <span className="ml-auto w-5 h-5 rounded-full bg-emerald-500 text-white text-xs flex items-center justify-center font-bold">
                                                {item.badge}
                                            </span>
                                        )}
                                        {isActive && !item.badge && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-white block"></div>}
                                    </>
                                )}
                                {!isExpanded && item.badge && (
                                    <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-emerald-500 text-white text-[10px] flex items-center justify-center font-bold">
                                        {item.badge}
                                    </span>
                                )}
                            </>
                        )}
                    </NavLink>
                ))}

                {/* PDF Editor - Navigation Link */}
                <NavLink
                    to="/pdf-editor"
                    onClick={() => mobileOpen && setMobileOpen(false)}
                    className={({ isActive }) => `w-full flex items-center ${!isExpanded ? 'justify-center px-0' : 'gap-3 px-4'} ${isShort ? 'py-2' : 'py-3'} rounded-xl transition-all duration-200 group relative
              ${isActive ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/40 translate-x-1' : 'text-slate-400 hover:bg-white/5 hover:text-white'}`}
                    title={!isExpanded ? 'Editar PDF' : ''}
                >
                    {({ isActive }) => (
                        <>
                            <FileEdit size={20} className={isActive ? 'animate-pulse' : ''} />
                            {isExpanded && <span className="font-medium block">Editar PDF</span>}
                            {isActive && isExpanded && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-white block"></div>}
                        </>
                    )}
                </NavLink>
            </nav>

            <div className={`shrink-0 border-t border-slate-800 ${isShort ? 'p-2 space-y-2' : 'p-4 space-y-3'} ${!isExpanded ? 'px-2' : ''}`}>
                {/* Toggle de Tema (en pantalla baja va dentro de la fila de abajo) */}
                {!compactFooter && (
                    <button
                        onClick={toggleTheme}
                        className={`w-full flex items-center ${!isExpanded ? 'justify-center px-0' : 'justify-center gap-2 px-3'} py-2 bg-slate-800/50 hover:bg-slate-700 rounded-lg text-sm font-medium transition border border-slate-700`}
                        title={isDark ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
                    >
                        {isDark ? (
                            <>
                                <Sun size={16} />
                                {isExpanded && <span className="inline">Cambiar a claro</span>}
                            </>
                        ) : (
                            <>
                                <Moon size={16} />
                                {isExpanded && <span className="inline">Cambiar a oscuro</span>}
                            </>
                        )}
                    </button>
                )}

                {user ? (
                    <>
                        {!isExpanded ? (
                            <div className="flex flex-col gap-2">
                                <button
                                    onClick={() => setShowChangePasswordModal(true)}
                                    className="w-full flex items-center justify-center p-2 bg-slate-800/50 hover:bg-slate-700 rounded-lg transition border border-slate-700"
                                    title="Cambiar Contraseña"
                                >
                                    <Key size={16} />
                                </button>
                                <button
                                    onClick={handleLogout}
                                    className="w-full flex items-center justify-center p-2 bg-slate-800/50 hover:bg-slate-700 rounded-lg transition border border-slate-700"
                                    title="Cerrar Sesión"
                                >
                                    <LogOut size={16} />
                                </button>
                                <div className="w-full flex items-center justify-center p-2">
                                    <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center" title={user.email}>
                                        <User size={16} />
                                    </div>
                                </div>
                            </div>
                        ) : compactFooter ? (
                            /* Pantalla baja: correo + tema, contraseña y salir en una sola fila */
                            <div className="flex items-center gap-1.5 bg-slate-800/50 rounded-xl px-2 py-1.5 border border-slate-700">
                                <div className="w-7 h-7 shrink-0 rounded-full bg-blue-600 flex items-center justify-center" title={user.email}>
                                    <User size={14} />
                                </div>
                                <p className="flex-1 min-w-0 text-xs font-medium text-white truncate" title={user.email}>
                                    {user.email}
                                </p>
                                <button
                                    onClick={toggleTheme}
                                    className="shrink-0 p-1.5 text-slate-300 hover:text-white hover:bg-slate-700 rounded-lg transition"
                                    title={isDark ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
                                    aria-label={isDark ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
                                >
                                    {isDark ? <Sun size={15} /> : <Moon size={15} />}
                                </button>
                                <button
                                    onClick={() => setShowChangePasswordModal(true)}
                                    className="shrink-0 p-1.5 text-slate-300 hover:text-white hover:bg-slate-700 rounded-lg transition"
                                    title="Cambiar contraseña"
                                    aria-label="Cambiar contraseña"
                                >
                                    <Key size={15} />
                                </button>
                                <button
                                    onClick={handleLogout}
                                    className="shrink-0 p-1.5 text-slate-300 hover:text-red-400 hover:bg-slate-700 rounded-lg transition"
                                    title="Cerrar sesión"
                                    aria-label="Cerrar sesión"
                                >
                                    <LogOut size={15} />
                                </button>
                            </div>
                        ) : (
                            <div className="bg-slate-800/50 rounded-xl p-3 block border border-slate-700 space-y-2">
                                <div className="flex items-center gap-2 mb-2">
                                    <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center">
                                        <User size={16} />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-xs text-slate-400">Conectado como</p>
                                        <p className="text-sm font-medium text-white truncate">{user.email}</p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setShowChangePasswordModal(true)}
                                    className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-sm font-medium transition"
                                >
                                    <Key size={14} />
                                    Cambiar Contraseña
                                </button>
                                <button
                                    onClick={handleLogout}
                                    className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-sm font-medium transition"
                                >
                                    <LogOut size={14} />
                                    Cerrar Sesión
                                </button>
                            </div>
                        )}
                    </>
                ) : (
                    isExpanded && (
                        <div className="bg-slate-800/50 rounded-xl p-4 block border border-slate-700">
                            <p className="text-xs text-slate-400 mb-2">Modo Local</p>
                            <button
                                onClick={() => navigate('/login')}
                                className="w-full px-3 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-sm font-medium transition"
                            >
                                Iniciar Sesión
                            </button>
                        </div>
                    )
                )}
            </div>

            {/* Change Password Modal */}
            <ChangePasswordModal
                isOpen={showChangePasswordModal}
                onClose={() => setShowChangePasswordModal(false)}
            />
        </aside>
    );
};

export default Sidebar;
