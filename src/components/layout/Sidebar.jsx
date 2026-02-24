import React, { useState, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { LayoutDashboard, FileText, Book, History, Hammer, LogOut, User, Layers, FileImage, Key, Moon, Sun, BarChart3, ChevronLeft, ChevronRight, Shield, DollarSign, FileEdit } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { useSidebar } from '../../context/SidebarContext';
import { PDFTemplateService } from '../../services/PDFTemplateService';
import ChangePasswordModal from '../auth/ChangePasswordModal';

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

    useEffect(() => {
        const active = PDFTemplateService.getActiveTemplate();
        setHasActiveTemplate(!!active);
    }, []);

    const navItems = [
        { path: '/dashboard', icon: LayoutDashboard, label: 'Tablero' },
        { path: '/editor', icon: FileText, label: 'Presupuesto' },
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
            ${mobileOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0
            w-64 ${isCollapsed ? 'md:w-20' : 'md:w-64'}
        `}>
            <div className={`p-6 flex items-center ${!isExpanded ? 'justify-center' : 'gap-3'} border-b border-slate-800 relative`}>
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
                    className="hidden md:block absolute -right-3 top-1/2 -translate-y-1/2 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-full p-1.5 transition-all z-50 shadow-lg"
                    title={isCollapsed ? 'Expandir menú' : 'Colapsar menú'}
                >
                    {isCollapsed ? (
                        <ChevronRight size={16} className="text-slate-300" />
                    ) : (
                        <ChevronLeft size={16} className="text-slate-300" />
                    )}
                </button>
            </div>

            <nav className="flex-1 py-6 px-3 space-y-2 overflow-y-auto max-h-full scrollbar-thin scrollbar-thumb-slate-700">
                {navItems.map(item => (
                    <NavLink
                        key={item.path}
                        to={item.path}
                        onClick={() => mobileOpen && setMobileOpen(false)} // Cerrar sidebar al navegar en mobile
                        className={({ isActive }) => `w-full flex items-center ${!isExpanded ? 'justify-center px-0' : 'gap-3 px-4'} py-3 rounded-xl transition-all duration-200 group relative
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
                    className={({ isActive }) => `w-full flex items-center ${!isExpanded ? 'justify-center px-0' : 'gap-3 px-4'} py-3 rounded-xl transition-all duration-200 group relative
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

            <div className={`p-4 border-t border-slate-800 space-y-3 ${!isExpanded ? 'px-2' : ''}`}>
                {/* Toggle de Tema */}
                <button
                    onClick={toggleTheme}
                    className={`w-full flex items-center ${!isExpanded ? 'justify-center px-0' : 'justify-center gap-2 px-3'} py-2 bg-slate-800/50 hover:bg-slate-700 rounded-lg text-sm font-medium transition border border-slate-700`}
                    title={isDark ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
                >
                    {isDark ? (
                        <>
                            <Sun size={16} />
                            {isExpanded && <span className="inline">Modo Claro</span>}
                        </>
                    ) : (
                        <>
                            <Moon size={16} />
                            {isExpanded && <span className="inline">Modo Oscuro</span>}
                        </>
                    )}
                </button>

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
