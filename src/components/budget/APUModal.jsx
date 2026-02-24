import React, { useState, useEffect } from 'react';
import { X, Calculator, Check, AlertTriangle, Settings } from 'lucide-react';
import { APUService } from '../../services/APUService';

const APUModal = ({ item, apuData, onClose, onApply }) => {
    const [editableData, setEditableData] = useState(null);
    const [totals, setTotals] = useState({
        materialsTotal: 0,
        laborTotal: 0,
        equipmentTotal: 0,
        minorToolsCost: 0,
        directCost: 0,
        indirectCost: 0,
        subtotal1: 0,
        financingCost: 0,
        subtotal2: 0,
        profitCost: 0,
        subtotal3: 0,
        additionalCost: 0,
        finalPrice: 0
    });

    useEffect(() => {
        if (apuData) {
            // Normalizar datos usando el servicio
            const normalized = APUService.normalizeAPUData(apuData);
            setEditableData(normalized);
        }
    }, [apuData]);

    useEffect(() => {
        if (editableData) {
            calculateTotals();
        }
    }, [editableData]);

    if (!item || !editableData) return null;

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('es-MX', {
            style: 'currency',
            currency: 'MXN'
        }).format(amount);
    };

    const formatPercent = (val) => `${(val * 100).toFixed(2)}%`;

    const calculateTotals = () => {
        // Usar el servicio para calcular todos los totales
        const calculatedTotals = APUService.calculateAPUTotals(editableData);
        setTotals(calculatedTotals);
    };

    const handleUpdateRow = (category, index, field, value) => {
        const newData = { ...editableData };
        const row = newData[category][index];
        row[field] = parseFloat(value) || 0;
        setEditableData(newData);
    };

    const handleUpdatePct = (field, value) => {
        const newData = { ...editableData };
        newData[field] = parseFloat(value) / 100;
        setEditableData(newData);
    };

    const renderLaborTable = () => (
        <div className="mb-6">
            <h3 className="text-sm font-bold uppercase tracking-wider mb-2 text-orange-700 dark:text-orange-400 border-b border-orange-200 dark:border-orange-700 pb-1">
                Mano de Obra
            </h3>
            <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                    <thead className="bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-300 font-medium">
                        <tr>
                            <th className="px-3 py-2">Categoría</th>
                            <th className="px-3 py-2 w-16 text-center">Und</th>
                            <th className="px-3 py-2 w-20 text-right">Cant.</th>
                            <th className="px-3 py-2 w-24 text-right">Salario Base</th>
                            <th className="px-3 py-2 w-16 text-right">FSR</th>
                            <th className="px-3 py-2 w-24 text-right">Salario Real</th>
                            <th className="px-3 py-2 w-24 text-right">Total</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                        {(editableData.labor || []).map((row, index) => {
                            const realSalary = APUService.getRealSalary(row);
                            const itemTotal = APUService.calculateLaborItemTotal(row);
                            return (
                                <tr key={index} className="hover:bg-slate-50 dark:hover:bg-slate-800">
                                    <td className="px-3 py-2 text-slate-700 dark:text-slate-200"><input value={row.description} onChange={(e) => handleUpdateRow('labor', index, 'description', e.target.value)} className="w-full bg-transparent outline-none text-slate-700 dark:text-slate-200" /></td>
                                    <td className="px-3 py-2 text-center text-xs text-slate-600 dark:text-slate-300">{row.unit}</td>
                                    <td className="px-3 py-2 text-right"><input type="number" value={row.quantity} onChange={(e) => handleUpdateRow('labor', index, 'quantity', e.target.value)} className="w-16 text-right bg-slate-50 dark:bg-slate-700 dark:text-slate-200 rounded outline-none" /></td>
                                    <td className="px-3 py-2 text-right"><input type="number" value={row.baseSalary || row.unitPrice} onChange={(e) => handleUpdateRow('labor', index, 'baseSalary', e.target.value)} className="w-20 text-right bg-slate-50 dark:bg-slate-700 dark:text-slate-200 rounded outline-none" /></td>
                                    <td className="px-3 py-2 text-right"><input type="number" step="0.01" value={row.fsr || APUService.DEFAULT_CONFIG.defaultFSR} onChange={(e) => handleUpdateRow('labor', index, 'fsr', e.target.value)} className="w-14 text-right bg-slate-50 dark:bg-slate-700 dark:text-slate-200 rounded outline-none" /></td>
                                    <td className="px-3 py-2 text-right text-slate-500 dark:text-slate-400 text-xs">{formatCurrency(realSalary)}</td>
                                    <td className="px-3 py-2 text-right font-medium text-slate-700 dark:text-slate-200">{formatCurrency(itemTotal)}</td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );

    const renderSimpleTable = (title, key, color) => {
        const colorClasses = {
            emerald: 'text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-700',
            slate: 'text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-600'
        };
        return (
            <div className="mb-6">
                <h3 className={`text-sm font-bold uppercase tracking-wider mb-2 ${colorClasses[color] || colorClasses.slate} border-b pb-1`}>
                    {title}
                </h3>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-300 font-medium">
                            <tr>
                                <th className="px-3 py-2">Descripción</th>
                                <th className="px-3 py-2 w-16 text-center">Und</th>
                                <th className="px-3 py-2 w-20 text-right">Cant.</th>
                                <th className="px-3 py-2 w-24 text-right">P. Unitario</th>
                                <th className="px-3 py-2 w-24 text-right">Total</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                            {(editableData[key] || []).map((row, index) => (
                                <tr key={index} className="hover:bg-slate-50 dark:hover:bg-slate-800">
                                    <td className="px-3 py-2 text-slate-700 dark:text-slate-200"><input value={row.description} onChange={(e) => handleUpdateRow(key, index, 'description', e.target.value)} className="w-full bg-transparent outline-none text-slate-700 dark:text-slate-200" /></td>
                                    <td className="px-3 py-2 text-center text-xs text-slate-600 dark:text-slate-300">{row.unit}</td>
                                    <td className="px-3 py-2 text-right"><input type="number" value={row.quantity} onChange={(e) => handleUpdateRow(key, index, 'quantity', e.target.value)} className="w-16 text-right bg-slate-50 dark:bg-slate-700 dark:text-slate-200 rounded outline-none" /></td>
                                    <td className="px-3 py-2 text-right"><input type="number" value={row.unitPrice} onChange={(e) => handleUpdateRow(key, index, 'unitPrice', e.target.value)} className="w-20 text-right bg-slate-50 dark:bg-slate-700 dark:text-slate-200 rounded outline-none" /></td>
                                    <td className="px-3 py-2 text-right font-medium text-slate-700 dark:text-slate-200">{formatCurrency(row.quantity * row.unitPrice)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        );
    };

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fadeIn">
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-5xl h-[90vh] flex flex-col">
                {/* Header */}
                <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex justify-between items-start bg-slate-50 dark:bg-slate-800 rounded-t-xl flex-shrink-0">
                    <div>
                        <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 mb-1">
                            <Calculator size={20} />
                            <span className="font-bold text-sm uppercase tracking-wide">Análisis de Precios Unitarios (Neodata Style)</span>
                        </div>
                        <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100 line-clamp-1">{item.description}</h2>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full text-slate-500 dark:text-slate-400"><X size={20} /></button>
                </div>

                {/* Content - Scrollable */}
                <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Left Column: Tables */}
                    <div className="lg:col-span-2 space-y-6">
                        {renderSimpleTable("Materiales", "materials", "emerald")}
                        {renderLaborTable()}
                        {renderSimpleTable("Equipo y Maquinaria", "equipment", "slate")}

                        {/* Minor Tools Row */}
                        <div className="flex justify-between items-center p-3 bg-slate-50 dark:bg-slate-700 rounded border border-slate-200 dark:border-slate-600 text-sm">
                            <span className="font-medium text-slate-600 dark:text-slate-300">Herramienta Menor (% de Mano de Obra)</span>
                            <div className="flex items-center gap-4">
                                <div className="flex items-center gap-1">
                                    <input
                                        type="number"
                                        value={editableData.minorToolsPct * 100}
                                        onChange={(e) => handleUpdatePct('minorToolsPct', e.target.value)}
                                        className="w-12 text-right bg-white dark:bg-slate-600 dark:text-slate-200 border border-slate-300 dark:border-slate-500 rounded px-1"
                                    />
                                    <span className="text-slate-500 dark:text-slate-400">%</span>
                                </div>
                                <span className="font-bold text-slate-800 dark:text-slate-200 w-24 text-right">{formatCurrency(totals.minorToolsCost)}</span>
                            </div>
                        </div>
                    </div>

                    {/* Right Column: Cascade Summary */}
                    <div className="lg:col-span-1">
                        <div className="bg-slate-50 dark:bg-slate-700 p-5 rounded-xl border border-slate-200 dark:border-slate-600">
                            <h3 className="font-bold text-slate-800 dark:text-slate-100 mb-4 flex items-center gap-2">
                                <Settings size={18} /> Resumen de Costos
                            </h3>

                            <div className="space-y-3 text-sm">
                                <div className="flex justify-between text-slate-600 dark:text-slate-300">
                                    <span>Costo Directo</span>
                                    <span className="font-bold text-slate-800 dark:text-slate-100">{formatCurrency(totals.directCost)}</span>
                                </div>

                                <div className="border-t border-slate-200 dark:border-slate-600 my-2"></div>

                                <div className="flex justify-between items-center">
                                    <span className="text-slate-600 dark:text-slate-300">Indirectos</span>
                                    <div className="flex items-center gap-2">
                                        <input type="number" value={editableData.indirectsPct * 100} onChange={(e) => handleUpdatePct('indirectsPct', e.target.value)} className="w-10 text-right bg-white dark:bg-slate-600 dark:text-slate-200 border border-slate-300 dark:border-slate-500 rounded px-1 text-xs" />
                                        <span className="text-xs text-slate-400 dark:text-slate-500">%</span>
                                        <span className="w-20 text-right text-slate-700 dark:text-slate-200">{formatCurrency(totals.indirectCost)}</span>
                                    </div>
                                </div>

                                <div className="flex justify-between font-medium text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-600 p-1 rounded">
                                    <span>Subtotal 1</span>
                                    <span>{formatCurrency(totals.subtotal1)}</span>
                                </div>

                                <div className="flex justify-between items-center">
                                    <span className="text-slate-600 dark:text-slate-300">Financiamiento</span>
                                    <div className="flex items-center gap-2">
                                        <input type="number" value={editableData.financingPct * 100} onChange={(e) => handleUpdatePct('financingPct', e.target.value)} className="w-10 text-right bg-white dark:bg-slate-600 dark:text-slate-200 border border-slate-300 dark:border-slate-500 rounded px-1 text-xs" />
                                        <span className="text-xs text-slate-400 dark:text-slate-500">%</span>
                                        <span className="w-20 text-right text-slate-700 dark:text-slate-200">{formatCurrency(totals.financingCost)}</span>
                                    </div>
                                </div>

                                <div className="flex justify-between font-medium text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-600 p-1 rounded">
                                    <span>Subtotal 2</span>
                                    <span>{formatCurrency(totals.subtotal2)}</span>
                                </div>

                                <div className="flex justify-between items-center">
                                    <span className="text-slate-600 dark:text-slate-300">Utilidad</span>
                                    <div className="flex items-center gap-2">
                                        <input type="number" value={editableData.profitPct * 100} onChange={(e) => handleUpdatePct('profitPct', e.target.value)} className="w-10 text-right bg-white dark:bg-slate-600 dark:text-slate-200 border border-slate-300 dark:border-slate-500 rounded px-1 text-xs" />
                                        <span className="text-xs text-slate-400 dark:text-slate-500">%</span>
                                        <span className="w-20 text-right text-slate-700 dark:text-slate-200">{formatCurrency(totals.profitCost)}</span>
                                    </div>
                                </div>

                                <div className="flex justify-between items-center">
                                    <span className="text-slate-600 dark:text-slate-300">Cargos Adic.</span>
                                    <div className="flex items-center gap-2">
                                        <input type="number" value={editableData.additionalPct * 100} onChange={(e) => handleUpdatePct('additionalPct', e.target.value)} className="w-10 text-right bg-white dark:bg-slate-600 dark:text-slate-200 border border-slate-300 dark:border-slate-500 rounded px-1 text-xs" />
                                        <span className="text-xs text-slate-400 dark:text-slate-500">%</span>
                                        <span className="w-20 text-right text-slate-700 dark:text-slate-200">{formatCurrency(totals.additionalCost)}</span>
                                    </div>
                                </div>

                                <div className="border-t-2 border-slate-800 dark:border-slate-500 my-4"></div>

                                <div className="border-t-2 border-slate-800 dark:border-slate-500 my-4"></div>

                                <div className="flex justify-between items-end mb-2">
                                    <span className="font-bold text-lg text-slate-800 dark:text-slate-100">Precio Unitario</span>
                                    <span className="font-bold text-2xl text-indigo-600 dark:text-indigo-400">{formatCurrency(totals.finalPrice)}</span>
                                </div>
                                <p className="text-xs text-slate-500 dark:text-slate-400 italic">
                                    Precio por 1 {item.unit || 'unidad'} del concepto. Se aplicará como precio unitario al item.
                                </p>
                            </div>

                            <button
                                onClick={() => onApply(totals.finalPrice)}
                                className="w-full mt-6 bg-indigo-600 hover:bg-indigo-700 text-white py-3 rounded-lg font-bold shadow-lg shadow-indigo-200 transition flex justify-center items-center gap-2"
                            >
                                <Check size={20} /> Aplicar Precio Final
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default APUModal;
