import React, { useState } from 'react';
import { Search, MapPin, DollarSign, Building, Store, Loader2, Info } from 'lucide-react';
import { useProject } from '../context/ProjectContext';
import { useAuth } from '../context/AuthContext'; // Para obtener el userTier
import { FUNCTION_TYPE, USER_TIER } from '../services/ApiKeyManager'; // Para tipos de función y tiers

const PriceSearchPage = () => {
    const [material, setMaterial] = useState('');
    const [locations, setLocations] = useState('');
    const [prices, setPrices] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const { toast, setToast, showRateLimitModal } = useProject();
    const { user } = useAuth(); // Obtener el usuario para determinar el tier

    const handleSearch = async (e) => {
        e.preventDefault();
        if (!material.trim() || !locations.trim()) {
            setToast({ message: 'Por favor, ingresa un material y al menos una ubicación.', type: 'error' });
            return;
        }

        setLoading(true);
        setError(null);
        setPrices([]);

        try {
            const userTier = user?.isPro ? USER_TIER.PRO : USER_TIER.FREE;

            const response = await fetch('http://localhost:4001/api/ai/pricesearch', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    material,
                    locations,
                    userTier,
                    functionType: FUNCTION_TYPE.PRICE_SEARCH,
                }),
            });

            const data = await response.json();

            if (response.ok && data.success) {
                if (response.status === 429) {
                    const retryAfter = data.retryAfter || 60;
                    showRateLimitModal(data.error, retryAfter);
                    return;
                }

                if (data.data.length > 0) {
                    setPrices(data.data);
                    setToast({ message: 'Búsqueda de precios completada.', type: 'success' });
                } else {
                    setToast({ message: 'No se encontraron precios para los criterios especificados.', type: 'info' });
                }
            } else {
                if (response.status === 429) {
                    const retryAfter = data.retryAfter || 60;
                    showRateLimitModal(data.error, retryAfter);
                    return;
                }
                setError(data.error || 'Ocurrió un error al buscar precios.');
                setToast({ message: data.error || 'Error al buscar precios.', type: 'error' });
            }
        } catch (err) {
            console.error('Error fetching prices:', err);
            setError('No se pudo conectar con el servicio de búsqueda de precios.');
            setToast({ message: 'Error de conexión con la IA.', type: 'error' });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="container mx-auto p-4 md:p-8">
            <h1 className="text-3xl font-bold text-slate-800 dark:text-slate-100 mb-6">Búsqueda de Precios con IA</h1>

            <div className="bg-white dark:bg-slate-800 rounded-lg shadow-md p-6 mb-8">
                <form onSubmit={handleSearch} className="space-y-4">
                    <div>
                        <label htmlFor="material" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                            Material a buscar:
                        </label>
                        <input
                            type="text"
                            id="material"
                            className="w-full p-3 border border-slate-300 dark:border-slate-600 rounded-md bg-slate-50 dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:ring-blue-500 focus:border-blue-500"
                            placeholder="Ej: Cemento gris, Varilla 3/8, Ladrillo rojo"
                            value={material}
                            onChange={(e) => setMaterial(e.target.value)}
                            required
                        />
                    </div>
                    <div>
                        <label htmlFor="locations" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                            Ubicaciones (separadas por comas):
                        </label>
                        <textarea
                            id="locations"
                            rows="3"
                            className="w-full p-3 border border-slate-300 dark:border-slate-600 rounded-md bg-slate-50 dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:ring-blue-500 focus:border-blue-500"
                            placeholder="Ej: México Ciudad de México, Nezahualcóyotl, Oaxaca San Juan Bautista Tuxtepec Oaxaca"
                            value={locations}
                            onChange={(e) => setLocations(e.target.value)}
                            required
                        ></textarea>
                        <p className="mt-2 text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1">
                            <Info size={14} />
                            La IA intentará buscar en empresas y tiendas dentro de estas regiones.
                        </p>
                    </div>
                    <button
                        type="submit"
                        className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white font-semibold rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-slate-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        disabled={loading}
                    >
                        {loading ? (
                            <>
                                <Loader2 className="animate-spin" size={20} />
                                Buscando precios...
                            </>
                        ) : (
                            <>
                                <Search size={20} />
                                Buscar Precios
                            </>
                        )}
                    </button>
                </form>
            </div>

            {error && (
                <div className="bg-red-100 dark:bg-red-900 border border-red-400 text-red-700 dark:text-red-200 px-4 py-3 rounded relative mb-8" role="alert">
                    <strong className="font-bold">Error:</strong>
                    <span className="block sm:inline"> {error}</span>
                </div>
            )}

            {prices.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {prices.map((item, index) => (
                        <div key={index} className="bg-white dark:bg-slate-800 rounded-lg shadow-md p-6 border border-slate-200 dark:border-slate-700 hover:shadow-lg transition-shadow">
                            <h3 className="text-xl font-semibold text-slate-900 dark:text-slate-100 mb-3 flex items-center gap-2">
                                <DollarSign size={20} className="text-green-500" />
                                {item.name}
                            </h3>
                            <p className="text-slate-700 dark:text-slate-300 mb-2 flex items-center gap-2">
                                <MapPin size={16} className="text-blue-500" />
                                <span className="font-medium">Ubicación:</span> {item.location}
                            </p>
                            <p className="text-slate-700 dark:text-slate-300 mb-2 flex items-center gap-2">
                                <Building size={16} className="text-purple-500" />
                                <span className="font-medium">Precio:</span> <span className="text-green-600 dark:text-green-400 font-bold">{item.price}</span>
                            </p>
                            <p className="text-slate-600 dark:text-slate-400 text-sm flex items-center gap-2">
                                <Store size={16} className="text-orange-500" />
                                <span className="font-medium">Fuente:</span> {item.source}
                            </p>
                        </div>
                    ))}
                </div>
            )}

            {!loading && prices.length === 0 && !error && (material.trim() || locations.trim()) && (
                <div className="bg-blue-100 dark:bg-blue-900 border border-blue-400 text-blue-700 dark:text-blue-200 px-4 py-3 rounded relative" role="alert">
                    <strong className="font-bold">Consejo:</strong>
                    <span className="block sm:inline"> Ingresa un material y una o varias ubicaciones para iniciar la búsqueda de precios.</span>
                </div>
            )}
        </div>
    );
};

export default PriceSearchPage;
