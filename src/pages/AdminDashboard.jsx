import React, { useState, useEffect } from 'react';
import { Save, RefreshCw, Smartphone, CreditCard, Key, Shield, CheckCircle, AlertCircle, Plus, Trash2, Eye, Users, Search, ToggleLeft, ToggleRight } from 'lucide-react';
import { renderMarkdown } from '../utils/markdownRenderer';
import { systemSettingsService } from '../services/SystemSettingsService';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabaseClient'; // Import supabase for user management
import PricingModal from '../components/subscription/PricingModal';
import Toast from '../components/ui/Toast';
import { SubscriptionService } from '../services/SubscriptionService';

const AdminDashboard = () => {
    const { user } = useAuth();
    const [settings, setSettings] = useState(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [activeTab, setActiveTab] = useState('general');
    const [toast, setToast] = useState(null);
    const [showPreview, setShowPreview] = useState(false);

    // User Management State
    const [users, setUsers] = useState([]);
    const [loadingUsers, setLoadingUsers] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');

    // Initial load
    useEffect(() => {
        loadSettings();
    }, []);

    // Load users when tab changes
    useEffect(() => {
        if (activeTab === 'users') {
            loadUsers();
        }
    }, [activeTab]);

    const loadSettings = async () => {
        setLoading(true);
        try {
            const data = await systemSettingsService.getAllSettings();
            setSettings(data);
        } catch (error) {
            console.error(error);
            showToast('Error cargando configuración', 'error');
        } finally {
            setLoading(false);
        }
    };

    const loadUsers = async () => {
        setLoadingUsers(true);
        try {
            // Fetch profiles
            const { data: profiles, error: profilesError } = await supabase
                .from('profiles')
                .select('*')
                .order('created_at', { ascending: false });

            if (profilesError) throw profilesError;

            // Fetch subscriptions
            const { data: subs, error: subsError } = await supabase
                .from('user_subscriptions')
                .select('user_id, plan');

            if (subsError) throw subsError;

            // Merge data
            const mergedUsers = profiles.map(profile => {
                const sub = subs.find(s => s.user_id === profile.id);
                return {
                    ...profile,
                    subscription_tier: sub ? sub.plan : 'free'
                };
            });

            setUsers(mergedUsers || []);
        } catch (error) {
            console.error(error);
            showToast('Error cargando usuarios', 'error');
        } finally {
            setLoadingUsers(false);
        }
    };

    const toggleUserPlan = async (userId, currentTier) => {
        const newTier = currentTier === 'pro' ? 'free' : 'pro';
        try {
            const success = await SubscriptionService.setUserPlan(userId, newTier);

            if (!success) throw new Error('Error updating plan');

            setUsers(users.map(u => u.id === userId ? { ...u, subscription_tier: newTier } : u));
            showToast(`Usuario actualizado a ${newTier.toUpperCase()}`, 'success');
        } catch (error) {
            console.error(error);
            showToast('Error actualizando usuario', 'error');
        }
    };

    const handleSave = async (key, value) => {
        setSaving(true);
        try {
            const success = await systemSettingsService.saveSetting(key, value);
            if (success) {
                setSettings(prev => ({ ...prev, [key]: value }));
                showToast('Configuración guardada', 'success');
            } else {
                showToast('Error al guardar', 'error');
            }
        } catch (error) {
            showToast('Error inesperado', 'error');
        } finally {
            setSaving(false);
        }
    };

    const showToast = (message, type) => {
        setToast({ message, type });
        setTimeout(() => setToast(null), 3000);
    };

    const getPreviewData = () => {
        if (!settings) return null;
        return {
            pro: {
                price: settings.plan_pro_price,
                description: settings.plan_pro_description,
                features: settings.plan_pro_features || []
            },
            free: {
                description: settings.plan_free_description,
                features: settings.plan_free_features || []
            },
            bankDetails: settings.bank_details
        };
    };

    const filteredUsers = users.filter(u =>
        u.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.full_name?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (loading) {
        return <div className="p-8 text-center text-slate-500">Cargando configuración del sistema...</div>;
    }

    return (
        <div className="max-w-6xl mx-auto p-6 space-y-8 animate-fadeIn">
            {/* Header */}
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold text-slate-800 dark:text-slate-100 flex items-center gap-3">
                        <Shield className="w-8 h-8 text-indigo-600" />
                        Panel de Administración
                    </h1>
                    <p className="text-slate-500 mt-2">Gestiona la configuración global del sistema</p>
                </div>
                <div className="flex items-center gap-4">
                    <div className="text-sm text-slate-500 text-right hidden md:block">
                        <p>Logueado como</p>
                        <p className="font-bold text-indigo-600">{user?.email}</p>
                    </div>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-4 border-b border-slate-200 dark:border-slate-700 overflow-x-auto pb-1">
                <TabButton active={activeTab === 'general'} onClick={() => setActiveTab('general')} icon={<Smartphone size={18} />} label="General" />
                <TabButton active={activeTab === 'plans'} onClick={() => setActiveTab('plans')} icon={<CreditCard size={18} />} label="Planes" />
                <TabButton active={activeTab === 'users'} onClick={() => setActiveTab('users')} icon={<Users size={18} />} label="Usuarios" />
                <TabButton active={activeTab === 'api'} onClick={() => setActiveTab('api')} icon={<Key size={18} />} label="API Keys" />
            </div>

            {/* Content */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 p-8">

                {/* GENERAL SETTINGS */}
                {activeTab === 'general' && (
                    <div className="space-y-8">
                        <SectionTitle title="Configuración de WhatsApp" description="Número para el botón de soporte flotante" />

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <InputField
                                label="Número de WhatsApp (con código de país)"
                                value={settings.whatsapp_number}
                                onChange={(val) => setSettings({ ...settings, whatsapp_number: val })}
                                onSave={() => handleSave('whatsapp_number', settings.whatsapp_number)}
                                placeholder="521..."
                                saving={saving}
                            />
                            <InputField
                                label="Mensaje predeterminado"
                                value={settings.support_message}
                                onChange={(val) => setSettings({ ...settings, support_message: val })}
                                onSave={() => handleSave('support_message', settings.support_message)}
                                saving={saving}
                            />
                        </div>
                    </div>
                )}

                {/* PLANS SETTINGS */}
                {activeTab === 'plans' && (
                    <div className="space-y-8">
                        <div className="flex justify-between items-start">
                            <SectionTitle title="Precios y Contenido" description="Personaliza cómo se ven los planes" />
                            <button
                                onClick={() => setShowPreview(true)}
                                className="flex items-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-700 dark:hover:bg-slate-600 dark:text-slate-200 px-4 py-2 rounded-lg transition-colors font-medium border border-slate-200 dark:border-slate-600"
                            >
                                <Eye size={18} />
                                Previsualizar Modal
                            </button>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                            <div className="space-y-6">
                                <h4 className="font-bold text-slate-700 dark:text-slate-300 border-b pb-2">Plan Pro</h4>
                                <InputField
                                    label="Precio Mensual (MXN)"
                                    type="number"
                                    value={settings.plan_pro_price}
                                    onChange={(val) => setSettings({ ...settings, plan_pro_price: Number(val) })}
                                    onSave={() => handleSave('plan_pro_price', settings.plan_pro_price)}
                                    saving={saving}
                                    prefix="$"
                                />
                                <TextAreaField
                                    label="Instrucciones de Pago / Datos Bancarios"
                                    value={settings.bank_details}
                                    onChange={(val) => setSettings({ ...settings, bank_details: val })}
                                    onSave={() => handleSave('bank_details', settings.bank_details)}
                                    saving={saving}
                                    rows={5}
                                    placeholder="Banco: ... CLABE: ..."
                                />
                                {settings.bank_details && (
                                    <div className="mt-[-1rem] p-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl">
                                        <p className="text-xs font-bold text-slate-400 uppercase mb-2">Vista Previa:</p>
                                        <div className="text-sm text-slate-700 dark:text-slate-300">
                                            {renderMarkdown(settings.bank_details)}
                                        </div>
                                    </div>
                                )}
                                <DynamicList
                                    title="Características del Plan Pro"
                                    items={settings.plan_pro_features || []}
                                    onUpdate={(newItems) => {
                                        setSettings({ ...settings, plan_pro_features: newItems });
                                        handleSave('plan_pro_features', newItems);
                                    }}
                                    placeholder="Nueva característica..."
                                />
                            </div>

                            <div className="space-y-6 lg:border-l lg:pl-8 border-slate-200 dark:border-slate-700">
                                <div>
                                    <h4 className="font-bold text-slate-700 dark:text-slate-300 border-b pb-2 mb-4">Límites Técnicos</h4>
                                    <LimitInputField
                                        label="Presupuestos"
                                        value={settings.plan_pro_limits?.budgets}
                                        onChange={(val) => setSettings({ ...settings, plan_pro_limits: { ...settings.plan_pro_limits, budgets: val } })}
                                        onSave={() => handleSave('plan_pro_limits', settings.plan_pro_limits)}
                                        saving={saving}
                                    />
                                    <div className="mt-4">
                                        <LimitInputField
                                            label="Generaciones IA"
                                            value={settings.plan_pro_limits?.ai_generations}
                                            onChange={(val) => setSettings({ ...settings, plan_pro_limits: { ...settings.plan_pro_limits, ai_generations: val } })}
                                            onSave={() => handleSave('plan_pro_limits', settings.plan_pro_limits)}
                                            saving={saving}
                                        />
                                    </div>
                                </div>

                                <div>
                                    <h4 className="font-bold text-slate-700 dark:text-slate-300 border-b pb-2 mb-4">Descripción Corta</h4>
                                    <InputField
                                        label="Texto Promocional"
                                        value={settings.plan_pro_description}
                                        onChange={(val) => setSettings({ ...settings, plan_pro_description: val })}
                                        onSave={() => handleSave('plan_pro_description', settings.plan_pro_description)}
                                        saving={saving}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* USERS MANAGEMENT */}
                {activeTab === 'users' && (
                    <div className="space-y-6">
                        <SectionTitle title="Gestión de Usuarios" description="Administra cuentas y permisos de acceso" />

                        <div className="flex gap-4 mb-6">
                            <div className="relative flex-1">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                                <input
                                    type="text"
                                    placeholder="Buscar por nombre o email..."
                                    className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                            </div>
                        </div>

                        {loadingUsers ? (
                            <div className="text-center py-10 text-slate-500">Cargando usuarios...</div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm text-left">
                                    <thead className="text-xs text-slate-500 uppercase bg-slate-50 dark:bg-slate-900">
                                        <tr>
                                            <th className="px-6 py-3">Usuario</th>
                                            <th className="px-6 py-3">Email</th>
                                            <th className="px-6 py-3">Fecha Registro</th>
                                            <th className="px-6 py-3">Plan Actual</th>
                                            <th className="px-6 py-3 text-right">Acciones</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filteredUsers.map((u) => (
                                            <tr key={u.id} className="bg-white dark:bg-slate-800 border-b border-slate-100 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50">
                                                <td className="px-6 py-4 font-medium text-slate-900 dark:text-white">
                                                    {u.full_name || 'Sin nombre'}
                                                </td>
                                                <td className="px-6 py-4 text-slate-500">{u.email}</td>
                                                <td className="px-6 py-4 text-slate-500">{new Date(u.created_at).toLocaleDateString()}</td>
                                                <td className="px-6 py-4">
                                                    <span className={`px-2 py-1 rounded-full text-xs font-bold uppercase ${u.subscription_tier === 'pro'
                                                        ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400'
                                                        : 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-400'
                                                        }`}>
                                                        {u.subscription_tier || 'Free'}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    <button
                                                        onClick={() => toggleUserPlan(u.id, u.subscription_tier)}
                                                        className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${u.subscription_tier === 'pro'
                                                            ? 'bg-red-50 text-red-600 hover:bg-red-100'
                                                            : 'bg-green-50 text-green-600 hover:bg-green-100'
                                                            }`}
                                                    >
                                                        {u.subscription_tier === 'pro' ? (
                                                            <>Downgrade <ToggleLeft size={16} /></>
                                                        ) : (
                                                            <>Activar Pro <ToggleRight size={16} /></>
                                                        )}
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                                {filteredUsers.length === 0 && <p className="text-center py-8 text-slate-500">No se encontraron usuarios.</p>}
                            </div>
                        )}
                    </div>
                )}

                {/* API KEYS SETTINGS */}
                {activeTab === 'api' && (
                    <div className="space-y-8">
                        <SectionTitle title="Gemini API Keys" description="Gestiona las llaves para el servicio de IA" />

                        {/* Toggle para ignorar .env */}
                        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-xl p-4 flex items-center justify-between mb-6">
                            <div>
                                <h4 className="font-bold text-amber-800 dark:text-amber-200 flex items-center gap-2">
                                    <Shield size={18} />
                                    Modo Estricto (Ignorar .env)
                                </h4>
                                <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
                                    Si activas esto, el sistema <strong>solamente</strong> usará las keys listadas abajo y ignorará las del archivo .env.
                                </p>
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={settings.ignore_env_keys || false}
                                    onChange={(e) => {
                                        setSettings({ ...settings, ignore_env_keys: e.target.checked });
                                        handleSave('ignore_env_keys', e.target.checked);
                                    }}
                                    className="sr-only peer"
                                />
                                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 dark:peer-focus:ring-indigo-800 rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-indigo-600"></div>
                            </label>
                        </div>

                        <DynamicList
                            title="Keys Gratuitas (Pool Free)"
                            items={settings.api_keys?.gemini?.free || []}
                            onUpdate={(newKeys) => {
                                const newApiKeys = { ...settings.api_keys, gemini: { ...settings.api_keys.gemini, free: newKeys } };
                                setSettings({ ...settings, api_keys: newApiKeys });
                                handleSave('api_keys', newApiKeys);
                            }}
                            placeholder="Pegar API Key gratuita..."
                            isCode
                        />

                        <div className="pt-6 border-t border-slate-100 dark:border-slate-700">
                            <DynamicList
                                title="Keys Pro (Pool Pago)"
                                items={settings.api_keys?.gemini?.pro || []}
                                onUpdate={(newKeys) => {
                                    const newApiKeys = { ...settings.api_keys, gemini: { ...settings.api_keys.gemini, pro: newKeys } };
                                    setSettings({ ...settings, api_keys: newApiKeys });
                                    handleSave('api_keys', newApiKeys);
                                }}
                                placeholder="Pegar API Key Pro..."
                                isCode
                                titleColor="text-amber-600"
                            />
                        </div>
                    </div>
                )}

            </div>

            {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

            {/* Preview Modal */}
            <PricingModal
                isOpen={showPreview}
                onClose={() => setShowPreview(false)}
                previewData={getPreviewData()}
            />
        </div>
    );
};

// UI Components Helpers
const TabButton = ({ active, onClick, icon, label }) => (
    <button
        onClick={onClick}
        className={`flex items-center gap-2 px-6 py-3 font-medium transition-all relative whitespace-nowrap ${active ? 'text-indigo-600 bg-indigo-50 dark:bg-indigo-900/20 rounded-t-lg' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg'
            }`}
    >
        {icon}
        {label}
        {active && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-indigo-600"></div>}
    </button>
);

const SectionTitle = ({ title, description }) => (
    <div className="mb-4">
        <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">{title}</h3>
        <p className="text-sm text-slate-500">{description}</p>
    </div>
);

const TextAreaField = ({ label, value, onChange, onSave, placeholder, rows = 3, saving }) => (
    <div className="flex flex-col gap-2">
        <label className="text-xs font-bold uppercase text-slate-400">{label}</label>
        <div className="flex gap-2">
            <textarea
                value={value || ''}
                onChange={(e) => onChange(e.target.value)}
                rows={rows}
                className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg py-2.5 px-4 outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-mono text-sm resize-none"
                placeholder={placeholder}
            />
            <button
                onClick={onSave}
                disabled={saving}
                className="h-fit bg-indigo-600 hover:bg-indigo-700 text-white p-2.5 rounded-lg transition-colors shadow-sm disabled:opacity-50"
                title="Guardar"
            >
                {saving ? <RefreshCw className="animate-spin w-5 h-5" /> : <Save className="w-5 h-5" />}
            </button>
        </div>
    </div>
);

const InputField = ({ label, value, onChange, onSave, placeholder, type = 'text', saving, prefix }) => (
    <div className="flex flex-col gap-2">
        <label className="text-xs font-bold uppercase text-slate-400">{label}</label>
        <div className="flex gap-2">
            <div className="relative flex-1">
                {prefix && <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">{prefix}</span>}
                <input
                    type={type}
                    value={value || ''}
                    onChange={(e) => onChange(e.target.value)}
                    className={`w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg py-2.5 px-4 outline-none focus:ring-2 focus:ring-indigo-500 transition-all ${prefix ? 'pl-8' : ''}`}
                    placeholder={placeholder}
                />
            </div>
            <button
                onClick={onSave}
                disabled={saving}
                className="bg-indigo-600 hover:bg-indigo-700 text-white p-2.5 rounded-lg transition-colors shadow-sm disabled:opacity-50"
                title="Guardar"
            >
                {saving ? <RefreshCw className="animate-spin w-5 h-5" /> : <Save className="w-5 h-5" />}
            </button>
        </div>
    </div>
);

const LimitInputField = ({ label, value, onChange, onSave, saving }) => {
    const isUnlimited = value === -1;
    const [customValue, setCustomValue] = useState(isUnlimited ? 10 : value);

    const handleToggle = (checked) => {
        if (checked) {
            onChange(-1);
        } else {
            onChange(customValue);
        }
    };

    const handleNumberChange = (val) => {
        const num = Number(val);
        setCustomValue(num);
        onChange(num);
    };

    return (
        <div className="flex flex-col gap-2">
            <div className="flex justify-between items-center">
                <label className="text-xs font-bold uppercase text-slate-400">{label}</label>
                <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                        type="checkbox"
                        checked={isUnlimited}
                        onChange={(e) => handleToggle(e.target.checked)}
                        className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 transition-colors cursor-pointer"
                    />
                    <span className={`text-sm font-medium transition-colors ${isUnlimited ? 'text-indigo-600' : 'text-slate-500'}`}>Ilimitado</span>
                </label>
            </div>

            <div className="flex gap-2">
                <div className="relative flex-1">
                    <input
                        type="number"
                        value={isUnlimited ? '' : value}
                        onChange={(e) => handleNumberChange(e.target.value)}
                        disabled={isUnlimited}
                        className={`w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg py-2.5 px-4 outline-none focus:ring-2 focus:ring-indigo-500 transition-all ${isUnlimited ? 'opacity-50 cursor-not-allowed bg-slate-100 dark:bg-slate-800' : ''}`}
                        placeholder={isUnlimited ? "∞" : "Cantidad máxima"}
                    />
                </div>
                <button
                    onClick={onSave}
                    disabled={saving}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white p-2.5 rounded-lg transition-colors shadow-sm disabled:opacity-50"
                    title="Guardar"
                >
                    {saving ? <RefreshCw className="animate-spin w-5 h-5" /> : <Save className="w-5 h-5" />}
                </button>
            </div>
        </div>
    );
};

const DynamicList = ({ title, items, onUpdate, placeholder, isCode, titleColor }) => {
    const [newItem, setNewItem] = useState('');

    const addItem = () => {
        if (!newItem.trim()) return;
        onUpdate([...items, newItem.trim()]);
        setNewItem('');
    };

    const removeItem = (index) => {
        const updated = items.filter((_, i) => i !== index);
        onUpdate(updated);
    };

    return (
        <div>
            <h4 className={`text-sm font-bold uppercase mb-3 ${titleColor || 'text-slate-500'}`}>{title}</h4>
            <div className="space-y-2 mb-3">
                {items.map((item, idx) => (
                    <div key={idx} className="flex items-center gap-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 p-2 rounded-lg text-sm text-slate-600 dark:text-slate-300">
                        <span className={`flex-1 ${isCode ? 'font-mono' : ''} truncate`}>
                            {isCode ? `${item.substring(0, 8)}...${item.substring(item.length - 4)}` : item}
                        </span>
                        <button onClick={() => removeItem(idx)} className="text-red-500 hover:bg-red-50 p-1.5 rounded-md transition-colors">
                            <Trash2 size={14} />
                        </button>
                    </div>
                ))}
                {items.length === 0 && <p className="text-sm text-slate-400 italic">No hay elementos</p>}
            </div>
            <div className="flex gap-2">
                <input
                    value={newItem}
                    onChange={(e) => setNewItem(e.target.value)}
                    placeholder={placeholder}
                    className="flex-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                    onKeyDown={(e) => e.key === 'Enter' && addItem()}
                />
                <button
                    onClick={addItem}
                    disabled={!newItem.trim()}
                    className="bg-green-600 hover:bg-green-700 text-white px-3 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                >
                    <Plus size={16} />
                </button>
            </div>
        </div>
    );
};

export default AdminDashboard;
