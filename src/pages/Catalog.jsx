import React, { useState } from 'react';
import { Search, Trash2, Plus, X, Sparkles, MapPin, Eye, ArrowRight, Check, AlertTriangle, Info } from 'lucide-react';
import Badge from '../components/ui/Badge';
import { useProject } from '../context/ProjectContext';
import { formatCurrency } from '../utils/format';
import { AIBudgetService } from '../services/AIBudgetService';

const Catalog = () => {
    const { catalog, addToCatalog, deleteFromCatalog, updateCatalogBulk, showToast } = useProject();
    const [search, setSearch] = useState('');
    const [showAddModal, setShowAddModal] = useState(false);
    const [isUpdatingPrices, setIsUpdatingPrices] = useState(false);
    const [newItem, setNewItem] = useState({
        description: '',
        unit: 'pza',
        unitPrice: '',
        category: 'Materiales'
    });

    const [showUpdateModal, setShowUpdateModal] = useState(false);
    const [updateLocation, setUpdateLocation] = useState('México');
    const [isDetectingLocation, setIsDetectingLocation] = useState(false);

    // New state for Review Modal
    const [showReviewModal, setShowReviewModal] = useState(false);
    const [pendingUpdates, setPendingUpdates] = useState([]);
    const [selectedUpdates, setSelectedUpdates] = useState({}); // { itemId: boolean }

    const handleAdd = async (e) => {
        e.preventDefault();
        if (!newItem.description || !newItem.unitPrice) return;

        const success = await addToCatalog({
            ...newItem,
            unitPrice: parseFloat(newItem.unitPrice)
        });

        if (success) {
            setShowAddModal(false);
            setNewItem({ description: '', unit: 'pza', unitPrice: '', category: 'Materiales' });
        }
    };

    const handleOpenUpdateModal = () => {
        if (catalog.length === 0) {
            showToast('No hay conceptos en el catálogo para actualizar', 'warning');
            return;
        }
        setShowUpdateModal(true);
    };

    const handleDetectLocation = async () => {
        setIsDetectingLocation(true);

        const detectViaIp = async () => {
            try {
                const response = await fetch('https://ipapi.co/json/');
                if (!response.ok) throw new Error('Error fetching location');
                const data = await response.json();
                if (data.city && data.region) {
                    setUpdateLocation(`${data.city}, ${data.region}`);
                    showToast('Ubicación detectada (IP)', 'success');
                } else {
                    setUpdateLocation('México');
                    showToast('No se pudo detectar ciudad exacta', 'warning');
                }
            } catch (error) {
                console.error('Error detecting location:', error);
                setUpdateLocation('México');
                showToast('No se pudo detectar la ubicación', 'info');
            } finally {
                setIsDetectingLocation(false);
            }
        };

        if ('geolocation' in navigator) {
            navigator.geolocation.getCurrentPosition(
                async (position) => {
                    try {
                        const { latitude, longitude } = position.coords;
                        // Use OpenStreetMap Nominatim for free reverse geocoding
                        const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`);
                        const data = await response.json();

                        const address = data.address;
                        const city = address.city || address.town || address.village || address.municipality;
                        const state = address.state;

                        if (city) {
                            setUpdateLocation(`${city}, ${state || ''}`);
                            showToast('Ubicación detectada (GPS)', 'success');
                            setIsDetectingLocation(false);
                        } else {
                            detectViaIp();
                        }
                    } catch (error) {
                        console.warn('GPS Reverse geocoding failed, falling back to IP', error);
                        detectViaIp();
                    }
                },
                (error) => {
                    console.warn('GPS denied or failed', error);
                    detectViaIp();
                }
            );
        } else {
            detectViaIp();
        }
    };

    const confirmUpdatePrices = async () => {
        setShowUpdateModal(false);
        setIsUpdatingPrices(true);
        try {
            // 1. Get AI updates (without applying them yet)
            const updatedCatalog = await AIBudgetService.updateCatalogPrices(catalog, updateLocation);

            // 2. Identify ONLY items that changed
            const changes = updatedCatalog.filter(updatedItem => {
                const original = catalog.find(c => c.id === updatedItem.id);
                return original && Math.abs(original.unitPrice - updatedItem.unitPrice) > 0.01;
            }).map(updatedItem => {
                const original = catalog.find(c => c.id === updatedItem.id);
                return {
                    ...updatedItem,
                    originalPrice: original.unitPrice,
                    priceDiff: updatedItem.unitPrice - original.unitPrice,
                    diffPercent: ((updatedItem.unitPrice - original.unitPrice) / original.unitPrice) * 100
                };
            });

            if (changes.length === 0) {
                showToast('La IA analizó tu catálogo y los precios parecen actuales.', 'success');
                setIsUpdatingPrices(false);
                return;
            }

            // 3. Prepare Review Modal
            setPendingUpdates(changes);
            // Select all by default
            const initialSelection = {};
            changes.forEach(item => initialSelection[item.id] = true);
            setSelectedUpdates(initialSelection);

            setShowReviewModal(true);

        } catch (error) {
            console.error('Error updating prices:', error);
            showToast('Error al analizar precios', 'error');
        } finally {
            setIsUpdatingPrices(false);
        }
    };

    const handleApplyUpdates = async () => {
        const itemsToUpdate = pendingUpdates.filter(item => selectedUpdates[item.id]);

        if (itemsToUpdate.length === 0) {
            setShowReviewModal(false);
            return;
        }

        // Merge updates into catalog
        const newCatalog = catalog.map(item => {
            const update = itemsToUpdate.find(u => u.id === item.id);
            if (update) {
                return {
                    ...item,
                    unitPrice: update.unitPrice,
                    lastUpdate: update.lastUpdate,
                    priceNote: update.priceNote,
                    source: update.source
                };
            }
            return item;
        });

        await updateCatalogBulk(newCatalog);
        showToast(`${itemsToUpdate.length} precios actualizados correctamente`, 'success');
        setShowReviewModal(false);
    };

    const toggleUpdateSelection = (id) => {
        setSelectedUpdates(prev => ({
            ...prev,
            [id]: !prev[id]
        }));
    };

    const [activeTab, setActiveTab] = useState('personal'); // 'personal' | 'market'
    const [viewItem, setViewItem] = useState(null);
    const [marketItems, setMarketItems] = useState([]);
    const [marketLoading, setMarketLoading] = useState(false);
    const [marketPage, setMarketPage] = useState(1);
    const [marketTotal, setMarketTotal] = useState(0);
    const [marketSearch, setMarketSearch] = useState('');

    // Load market items when tab changes or search changes
    React.useEffect(() => {
        if (activeTab === 'market') {
            loadMarketItems();
        }
    }, [activeTab, marketPage, marketSearch]);

    const loadMarketItems = async () => {
        setMarketLoading(true);
        try {
            const { MarketPriceService } = await import('../services/MarketPriceService');
            const { data, count } = await MarketPriceService.searchPrices(marketSearch, marketPage, 20);
            setMarketItems(data);
            setMarketTotal(count);
        } catch (error) {
            console.error('Error loading market items:', error);
            showToast('Error al cargar precios de mercado', 'error');
        } finally {
            setMarketLoading(false);
        }
    };

    const handleAddToMyCatalog = async (item) => {
        const success = await addToCatalog({
            description: item.description,
            unit: item.unit,
            unitPrice: item.base_price,
            category: item.category || 'Materiales'
        });
        if (success) {
            showToast('Agregado a tu catálogo', 'success');
        }
    };

    return (
        <div className="space-y-6 animate-fadeIn pb-20">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800">Catálogo Maestro</h2>
                    <p className="text-slate-500 text-sm">
                        {activeTab === 'personal'
                            ? 'Gestiona tus precios personales y conceptos personalizados.'
                            : 'Consulta la base de datos compartida del mercado (solo lectura).'}
                    </p>
                </div>

                <div className="flex bg-slate-100 p-1 rounded-lg">
                    <button
                        onClick={() => setActiveTab('personal')}
                        className={`px-4 py-2 rounded-md text-sm font-medium transition ${activeTab === 'personal' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                        Mis Conceptos
                    </button>
                    <button
                        onClick={() => setActiveTab('market')}
                        className={`px-4 py-2 rounded-md text-sm font-medium transition ${activeTab === 'market' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                        Base de Datos Maestra
                    </button>
                </div>
            </div>

            {/* Toolbar */}
            <div className="flex justify-between items-center">
                <div className="flex gap-3">
                    {activeTab === 'personal' && (
                        <button
                            onClick={handleOpenUpdateModal}
                            disabled={isUpdatingPrices}
                            className="flex items-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-600 rounded-lg hover:bg-indigo-100 transition font-bold text-sm border border-indigo-200"
                            title="Actualizar precios con IA"
                        >
                            {isUpdatingPrices ? (
                                <div className="animate-spin rounded-full h-4 w-4 border-2 border-indigo-600 border-t-transparent"></div>
                            ) : (
                                <Sparkles size={16} />
                            )}
                            <span>{isUpdatingPrices ? 'Actualizando...' : 'Actualizar Precios IA'}</span>
                        </button>
                    )}
                </div>

                <div className="relative">
                    <Search className="absolute left-3 top-2.5 text-slate-400" size={16} />
                    <input
                        value={activeTab === 'personal' ? search : marketSearch}
                        onChange={(e) => activeTab === 'personal' ? setSearch(e.target.value) : setMarketSearch(e.target.value)}
                        placeholder={activeTab === 'personal' ? "Buscar en mis conceptos..." : "Buscar en base de datos maestra..."}
                        className="pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none w-64 md:w-80"
                    />
                </div>
            </div>

            {/* Content */}
            {activeTab === 'personal' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {catalog.filter(c => c.description.toLowerCase().includes(search.toLowerCase())).map(c => (
                        <div key={c.id} className="bg-white p-4 rounded-xl border border-slate-200 hover:shadow-md transition group relative">
                            <div className="flex justify-between items-start mb-2">
                                <Badge type={c.category} />
                                <button
                                    onClick={() => deleteFromCatalog(c.id)}
                                    className="text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition"
                                    title="Eliminar del catálogo"
                                >
                                    <Trash2 size={14} />
                                </button>
                            </div>
                            <p className="font-medium text-slate-800 text-sm mb-3 line-clamp-3 min-h-[3rem]">{c.description}</p>
                            <div className="flex justify-between items-center text-sm border-t border-slate-100 pt-3">
                                <span className="text-slate-500 bg-slate-50 px-2 py-0.5 rounded text-xs font-medium">{c.unit}</span>
                                <span className="font-mono font-bold text-blue-600">{formatCurrency(c.unitPrice)}</span>
                            </div>
                        </div>
                    ))}

                    {/* Add New Card - Solo visible en pestaña personal */}
                    <button
                        onClick={() => setShowAddModal(true)}
                        className="border-2 border-dashed border-slate-200 rounded-xl flex flex-col items-center justify-center p-6 text-slate-400 hover:border-blue-400 hover:text-blue-500 hover:bg-blue-50 transition cursor-pointer min-h-[160px]"
                    >
                        <div className="bg-blue-50 p-3 rounded-full mb-3 group-hover:bg-blue-100 transition">
                            <Plus size={24} />
                        </div>
                        <span className="font-bold">Nuevo Concepto</span>
                    </button>
                </div>
            ) : (
                <div className="space-y-4">
                    {/* Información de solo lectura */}
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-800 flex items-start gap-2">
                        <Eye size={18} className="text-blue-600 mt-0.5 flex-shrink-0" />
                        <div>
                            <span className="font-bold">Base de Datos Maestra (Solo Lectura)</span>
                            <p className="text-xs text-blue-700 mt-1">Esta base de datos es compartida y no se puede modificar. Puedes agregar conceptos a tu catálogo personal usando el botón +.</p>
                        </div>
                    </div>

                    {marketLoading ? (
                        <div className="flex justify-center py-12">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {marketItems.map(item => (
                                <div key={item.id} className="bg-white p-4 rounded-xl border border-indigo-100 hover:border-indigo-300 hover:shadow-md transition group relative">
                                    <div className="flex justify-between items-start mb-2">
                                        <Badge type={item.category || 'Materiales'} />
                                        <span className="text-[10px] text-slate-400 bg-slate-50 px-2 py-1 rounded-full border border-slate-100">
                                            {item.source === 'cdmx_tabulador' ? 'CDMX' :
                                                item.source === 'construbase_libre' ? 'Construbase' :
                                                    item.source === 'neodata' ? 'Neodata' : item.source}
                                        </span>
                                    </div>
                                    {/* Mostrar partida o código si está disponible */}
                                    {(item.metadata?.partida || item.metadata?.codigo) && (
                                        <div className="mb-2">
                                            <span className="text-[10px] font-mono text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
                                                {item.metadata?.partida || item.metadata?.codigo}
                                                {item.metadata?.renglon && ` - ${item.metadata.renglon}`}
                                            </span>
                                        </div>
                                    )}
                                    <p className="font-medium text-slate-800 text-sm mb-3 line-clamp-3 min-h-[3rem]">{item.description}</p>
                                    <div className="flex justify-between items-center text-sm border-t border-slate-100 pt-3">
                                        <div className="flex flex-col">
                                            <span className="text-slate-500 text-xs">{item.unit}</span>
                                            <span className="text-[10px] text-slate-400">{item.location}</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className="font-mono font-bold text-indigo-600">{formatCurrency(item.base_price)}</span>
                                            <button
                                                onClick={() => setViewItem(item)}
                                                className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition"
                                                title="Ver detalles completos (Solo lectura)"
                                            >
                                                <Eye size={16} />
                                            </button>
                                            <button
                                                onClick={() => handleAddToMyCatalog(item)}
                                                className="p-1.5 bg-indigo-50 text-indigo-600 rounded-lg hover:bg-indigo-100 transition"
                                                title="Agregar a mi catálogo personal"
                                            >
                                                <Plus size={16} />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Pagination */}
                    <div className="flex justify-between items-center pt-4 border-t border-slate-200">
                        <span className="text-sm text-slate-500">
                            Mostrando {marketItems.length} de {marketTotal} resultados
                        </span>
                        <div className="flex gap-2">
                            <button
                                onClick={() => setMarketPage(p => Math.max(1, p - 1))}
                                disabled={marketPage === 1}
                                className="px-3 py-1 border rounded hover:bg-slate-50 disabled:opacity-50 text-sm"
                            >
                                Anterior
                            </button>
                            <span className="px-3 py-1 text-sm font-medium text-slate-600 bg-slate-50 rounded">
                                Página {marketPage}
                            </span>
                            <button
                                onClick={() => setMarketPage(p => p + 1)}
                                disabled={marketItems.length < 20}
                                className="px-3 py-1 border rounded hover:bg-slate-50 disabled:opacity-50 text-sm"
                            >
                                Siguiente
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal Agregar */}
            {showAddModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fadeIn">
                    <div className="bg-white rounded-2xl shadow-xl max-w-md w-full overflow-hidden">
                        <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                            <h3 className="font-bold text-slate-800">Agregar al Catálogo</h3>
                            <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
                        </div>
                        <form onSubmit={handleAdd} className="p-6 space-y-4">

                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Descripción</label>
                                <textarea
                                    value={newItem.description}
                                    onChange={e => setNewItem({ ...newItem, description: e.target.value })}
                                    className="w-full border border-slate-200 rounded-lg p-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                                    rows={3}
                                    placeholder="Ej: Muro de block..."
                                    required
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Unidad</label>
                                    <input
                                        value={newItem.unit}
                                        onChange={e => setNewItem({ ...newItem, unit: e.target.value })}
                                        className="w-full border border-slate-200 rounded-lg p-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                        placeholder="m2, pza..."
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Precio Unitario</label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        min="0"
                                        value={newItem.unitPrice}
                                        onChange={e => setNewItem({ ...newItem, unitPrice: e.target.value })}
                                        className="w-full border border-slate-200 rounded-lg p-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                        placeholder="0.00"
                                        required
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Categoría</label>
                                <select
                                    value={newItem.category}
                                    onChange={e => setNewItem({ ...newItem, category: e.target.value })}
                                    className="w-full border border-slate-200 rounded-lg p-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                                >
                                    {['Materiales', 'Mano de Obra', 'Equipos', 'Instalaciones', 'Obra Civil'].map(c => <option key={c} value={c}>{c}</option>)}
                                </select>
                            </div>
                            <div className="pt-4 flex gap-3">
                                <button type="button" onClick={() => setShowAddModal(false)} className="flex-1 px-4 py-2 text-slate-600 font-bold hover:bg-slate-100 rounded-lg transition">Cancelar</button>
                                <button type="submit" className="flex-1 px-4 py-2 bg-blue-600 text-white font-bold hover:bg-blue-700 rounded-lg transition shadow-lg shadow-blue-200">Guardar</button>
                            </div>
                        </form>
                    </div>
                </div>
            )
            }

            {/* Modal Actualizar Precios */}
            {showUpdateModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fadeIn">
                    <div className="bg-white rounded-2xl shadow-xl max-w-md w-full overflow-hidden">
                        <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-indigo-50">
                            <h3 className="font-bold text-indigo-900 flex items-center gap-2">
                                <Sparkles size={18} className="text-indigo-600" /> Actualizar Precios con IA
                            </h3>
                            <button onClick={() => setShowUpdateModal(false)} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
                        </div>
                        <div className="p-6 space-y-4">
                            <p className="text-sm text-slate-600">
                                La IA analizará tu catálogo y actualizará los precios unitarios basándose en el mercado actual.
                            </p>

                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Ubicación de Referencia</label>
                                <div className="flex gap-2">
                                    <input
                                        value={updateLocation}
                                        onChange={e => setUpdateLocation(e.target.value)}
                                        className="flex-1 border border-slate-200 rounded-lg p-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                                        placeholder="Ej: Ciudad de México, Monterrey..."
                                    />
                                    <button
                                        onClick={handleDetectLocation}
                                        disabled={isDetectingLocation}
                                        className="px-3 py-2 bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200 transition border border-slate-200"
                                        title="Usar ubicación actual"
                                    >
                                        {isDetectingLocation ? (
                                            <div className="animate-spin rounded-full h-4 w-4 border-2 border-slate-500 border-t-transparent"></div>
                                        ) : (
                                            <MapPin size={18} />
                                        )}
                                    </button>
                                </div>
                                <p className="text-xs text-slate-400 mt-1">Especifica la ciudad para obtener precios regionales más precisos.</p>
                            </div>

                            <div className="bg-amber-50 border border-amber-100 rounded-lg p-3 text-xs text-amber-800 flex gap-2">
                                <span className="font-bold">Nota:</span>
                                Este proceso puede tomar unos segundos dependiendo del tamaño de tu catálogo.
                            </div>

                            <div className="pt-2 flex gap-3">
                                <button onClick={() => setShowUpdateModal(false)} className="flex-1 px-4 py-2 text-slate-600 font-bold hover:bg-slate-100 rounded-lg transition">Cancelar</button>
                                <button
                                    onClick={confirmUpdatePrices}
                                    className="flex-1 px-4 py-2 bg-indigo-600 text-white font-bold hover:bg-indigo-700 rounded-lg transition shadow-lg shadow-indigo-200"
                                >
                                    Confirmar Actualización
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal de Revisión de Precios */}
            {showReviewModal && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fadeIn">
                    <div className="bg-white rounded-2xl shadow-xl max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden">
                        <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-indigo-50 flex-shrink-0">
                            <div>
                                <h3 className="font-bold text-indigo-900 flex items-center gap-2">
                                    <Sparkles size={18} className="text-indigo-600" /> Revisión de Actualizaciones
                                </h3>
                                <p className="text-xs text-indigo-700 mt-1">
                                    Se encontraron {pendingUpdates.length} ajustes de precios para {updateLocation}. Selecciona los que deseas aplicar.
                                </p>
                            </div>
                            <button onClick={() => setShowReviewModal(false)} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-0">
                            <table className="w-full text-left border-collapse">
                                <thead className="bg-slate-50 sticky top-0 z-10 shadow-sm">
                                    <tr>
                                        <th className="p-4 w-10">
                                            <input
                                                type="checkbox"
                                                checked={Object.values(selectedUpdates).every(Boolean)}
                                                onChange={() => {
                                                    const allSelected = Object.values(selectedUpdates).every(Boolean);
                                                    const newSelection = {};
                                                    pendingUpdates.forEach(item => newSelection[item.id] = !allSelected);
                                                    setSelectedUpdates(newSelection);
                                                }}
                                                className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500"
                                            />
                                        </th>
                                        <th className="p-4 text-xs font-bold text-slate-500 uppercase">Concepto</th>
                                        <th className="p-4 text-xs font-bold text-slate-500 uppercase text-right">Precio Anterior</th>
                                        <th className="p-4 w-8"></th>
                                        <th className="p-4 text-xs font-bold text-slate-500 uppercase text-right">Nuevo Precio</th>
                                        <th className="p-4 text-xs font-bold text-slate-500 uppercase">Razón / Fuente</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {pendingUpdates.map(item => (
                                        <tr key={item.id} className={`hover:bg-slate-50 transition ${!selectedUpdates[item.id] ? 'opacity-50 grayscale bg-slate-50' : ''}`}>
                                            <td className="p-4">
                                                <input
                                                    type="checkbox"
                                                    checked={!!selectedUpdates[item.id]}
                                                    onChange={() => toggleUpdateSelection(item.id)}
                                                    className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500"
                                                />
                                            </td>
                                            <td className="p-4">
                                                <p className="text-sm font-medium text-slate-800 line-clamp-2">{item.description}</p>
                                                <span className="text-[10px] text-slate-400">{item.unit} | {item.category}</span>
                                            </td>
                                            <td className="p-4 text-right font-mono text-slate-500 text-sm">
                                                {formatCurrency(item.originalPrice)}
                                            </td>
                                            <td className="p-4 text-center text-slate-300">
                                                <ArrowRight size={14} />
                                            </td>
                                            <td className="p-4 text-right">
                                                <div className="flex flex-col items-end">
                                                    <span className="font-mono font-bold text-indigo-600 text-sm">{formatCurrency(item.unitPrice)}</span>
                                                    <span className={`text-[10px] font-bold px-1.5 rounded-full ${item.priceDiff > 0 ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'}`}>
                                                        {item.priceDiff > 0 ? '+' : ''}{item.diffPercent.toFixed(1)}%
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="p-4">
                                                <div className="flex items-start gap-2">
                                                    <span className={`mt-0.5 w-1.5 h-1.5 rounded-full flex-shrink-0 ${item.source === 'ai' ? 'bg-purple-500' : 'bg-blue-500'}`}></span>
                                                    <p className="text-xs text-slate-600 max-w-[200px]">{item.priceNote || 'Actualización automática'}</p>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        <div className="p-4 border-t border-slate-200 bg-slate-50 flex justify-between items-center flex-shrink-0">
                            <span className="text-sm text-slate-500">
                                {Object.values(selectedUpdates).filter(Boolean).length} seleccionados
                            </span>
                            <div className="flex gap-3">
                                <button
                                    onClick={() => setShowReviewModal(false)}
                                    className="px-4 py-2 text-slate-600 font-bold hover:bg-slate-100 rounded-lg transition"
                                >
                                    Cancelar
                                </button>
                                <button
                                    onClick={handleApplyUpdates}
                                    className="px-6 py-2 bg-indigo-600 text-white font-bold hover:bg-indigo-700 rounded-lg transition shadow-lg shadow-indigo-200 flex items-center gap-2"
                                >
                                    <Check size={18} /> Aplicar Actualizaciones
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal Ver Detalles (Solo Lectura) */}
            {viewItem && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fadeIn">
                    <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden">
                        <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50 flex-shrink-0">
                            <h3 className="font-bold text-slate-800 flex items-center gap-2">
                                <Eye size={18} className="text-slate-500" /> Detalle de Concepto
                            </h3>
                            <button onClick={() => setViewItem(null)} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
                        </div>
                        <div className="overflow-y-auto flex-1 p-6 space-y-4">
                            {/* Descripción */}
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Descripción</label>
                                <p className="text-sm text-slate-800 bg-slate-50 p-3 rounded-lg border border-slate-200 whitespace-pre-wrap break-words leading-relaxed">{viewItem.description || 'Sin descripción'}</p>
                            </div>

                            {/* Información Principal del Excel */}
                            <div className="bg-gradient-to-br from-indigo-50 to-blue-50 border border-indigo-200 rounded-lg p-4 space-y-3">
                                <p className="text-xs font-bold text-indigo-900 uppercase mb-3 flex items-center gap-2">
                                    <span className="w-1 h-4 bg-indigo-600 rounded"></span>
                                    Información Principal
                                </p>
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                    {viewItem.metadata?.partida && (
                                        <div className="bg-white p-2 rounded border border-indigo-100">
                                            <span className="text-[10px] font-bold text-indigo-600 uppercase block mb-1">Partida</span>
                                            <span className="text-sm font-mono text-indigo-900">{viewItem.metadata.partida}</span>
                                        </div>
                                    )}
                                    {viewItem.metadata?.codigo && (
                                        <div className="bg-white p-2 rounded border border-indigo-100">
                                            <span className="text-[10px] font-bold text-indigo-600 uppercase block mb-1">Código</span>
                                            <span className="text-sm font-mono text-indigo-900">{viewItem.metadata.codigo}</span>
                                        </div>
                                    )}
                                    {viewItem.metadata?.renglon && (
                                        <div className="bg-white p-2 rounded border border-indigo-100">
                                            <span className="text-[10px] font-bold text-indigo-600 uppercase block mb-1">Renglón</span>
                                            <span className="text-sm font-mono text-indigo-900">{viewItem.metadata.renglon}</span>
                                        </div>
                                    )}
                                    {viewItem.metadata?.n !== null && viewItem.metadata?.n !== undefined && (
                                        <div className="bg-white p-2 rounded border border-indigo-100">
                                            <span className="text-[10px] font-bold text-indigo-600 uppercase block mb-1">N</span>
                                            <span className="text-sm font-mono text-indigo-900">{viewItem.metadata.n}</span>
                                        </div>
                                    )}
                                    {viewItem.metadata?.tipo !== null && viewItem.metadata?.tipo !== undefined && (
                                        <div className="bg-white p-2 rounded border border-indigo-100">
                                            <span className="text-[10px] font-bold text-indigo-600 uppercase block mb-1">Tipo</span>
                                            <span className="text-sm font-mono text-indigo-900">{viewItem.metadata.tipo}</span>
                                        </div>
                                    )}
                                    {viewItem.metadata?.codigo_auxiliar && (
                                        <div className="bg-white p-2 rounded border border-indigo-100">
                                            <span className="text-[10px] font-bold text-indigo-600 uppercase block mb-1">Código Auxiliar</span>
                                            <span className="text-sm font-mono text-indigo-900">{viewItem.metadata.codigo_auxiliar}</span>
                                        </div>
                                    )}
                                </div>
                                {viewItem.metadata?.descripcion_partida && (
                                    <div className="mt-3 pt-3 border-t border-indigo-200 bg-white p-3 rounded border border-indigo-100">
                                        <span className="text-[10px] font-bold text-indigo-600 uppercase block mb-1">Clasificación / Descripción de la Partida</span>
                                        <p className="text-sm text-indigo-900 font-medium">{viewItem.metadata.descripcion_partida}</p>
                                    </div>
                                )}
                            </div>

                            {/* Información de Precios y Unidades */}
                            <div className="bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-200 rounded-lg p-4 space-y-3">
                                <p className="text-xs font-bold text-emerald-900 uppercase mb-3 flex items-center gap-2">
                                    <span className="w-1 h-4 bg-emerald-600 rounded"></span>
                                    Precios y Unidades
                                </p>
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                    <div className="bg-white p-3 rounded border border-emerald-100">
                                        <span className="text-[10px] font-bold text-emerald-600 uppercase block mb-1">Unidad</span>
                                        <span className="text-sm font-mono font-bold text-emerald-900">{viewItem.unit || 'N/A'}</span>
                                    </div>
                                    <div className="bg-white p-3 rounded border border-emerald-100">
                                        <span className="text-[10px] font-bold text-emerald-600 uppercase block mb-1">Precio Base</span>
                                        <span className="text-sm font-mono font-bold text-emerald-700">{formatCurrency(viewItem.base_price)}</span>
                                    </div>
                                    {viewItem.metadata?.cantidad && (
                                        <div className="bg-white p-3 rounded border border-emerald-100">
                                            <span className="text-[10px] font-bold text-emerald-600 uppercase block mb-1">Cantidad</span>
                                            <span className="text-sm font-mono text-emerald-900">{parseFloat(viewItem.metadata.cantidad).toFixed(4)}</span>
                                        </div>
                                    )}
                                    {viewItem.metadata?.importe && (
                                        <div className="bg-white p-3 rounded border border-emerald-100">
                                            <span className="text-[10px] font-bold text-emerald-600 uppercase block mb-1">Importe</span>
                                            <span className="text-sm font-mono font-bold text-emerald-700">{formatCurrency(viewItem.metadata.importe)}</span>
                                        </div>
                                    )}
                                    {viewItem.metadata?.costo && (
                                        <div className="bg-white p-3 rounded border border-emerald-100">
                                            <span className="text-[10px] font-bold text-emerald-600 uppercase block mb-1">Costo</span>
                                            <span className="text-sm font-mono font-bold text-emerald-700">{formatCurrency(viewItem.metadata.costo)}</span>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Información Adicional y Notas */}
                            {(viewItem.metadata?.texto_auxiliar || viewItem.metadata?.correo_nube || viewItem.metadata?.maestro_nube) && (
                                <div className="bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200 rounded-lg p-4 space-y-3">
                                    <p className="text-xs font-bold text-amber-900 uppercase mb-3 flex items-center gap-2">
                                        <span className="w-1 h-4 bg-amber-600 rounded"></span>
                                        Información Adicional
                                    </p>
                                    {viewItem.metadata?.texto_auxiliar && (
                                        <div className="bg-white p-3 rounded border border-amber-100">
                                            <span className="text-[10px] font-bold text-amber-600 uppercase block mb-2">Texto Auxiliar / Notas</span>
                                            <p className="text-sm text-amber-900 whitespace-pre-wrap break-words">{viewItem.metadata.texto_auxiliar}</p>
                                        </div>
                                    )}
                                    <div className="grid grid-cols-2 gap-3">
                                        {viewItem.metadata?.correo_nube && (
                                            <div className="bg-white p-2 rounded border border-amber-100">
                                                <span className="text-[10px] font-bold text-amber-600 uppercase block mb-1">Correo Nube</span>
                                                <span className="text-xs text-amber-900 break-all">{viewItem.metadata.correo_nube}</span>
                                            </div>
                                        )}
                                        {viewItem.metadata?.maestro_nube && (
                                            <div className="bg-white p-2 rounded border border-amber-100">
                                                <span className="text-[10px] font-bold text-amber-600 uppercase block mb-1">Maestro Nube</span>
                                                <span className="text-xs text-amber-900">{viewItem.metadata.maestro_nube}</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Información de Categoría y Fuente */}
                            <div className="grid grid-cols-2 gap-4">
                                <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Categoría</label>
                                    <p className="text-sm font-medium text-slate-800">{viewItem.category || 'N/A'}</p>
                                </div>
                                <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Fuente</label>
                                    <p className="text-sm font-medium text-slate-800 capitalize">{viewItem.source?.replace(/_/g, ' ') || 'N/A'}</p>
                                </div>
                            </div>

                        </div>
                        <div className="p-4 border-t border-slate-200 bg-slate-50 flex-shrink-0">
                            <button
                                onClick={() => {
                                    handleAddToMyCatalog(viewItem);
                                    setViewItem(null);
                                }}
                                className="w-full py-3 bg-indigo-600 text-white font-bold hover:bg-indigo-700 rounded-lg transition shadow-lg shadow-indigo-200 flex justify-center items-center gap-2"
                            >
                                <Plus size={18} /> Agregar a Mi Catálogo
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Catalog;
