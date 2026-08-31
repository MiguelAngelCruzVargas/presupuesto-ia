import React, { useMemo, useState } from 'react';
import { Package, AlertTriangle, Download, ChevronDown, CalendarClock } from 'lucide-react';
import InsumosService from '../../services/InsumosService';
import { formatCurrency } from '../../utils/format';

/**
 * Programa de suministro: qué insumos pide cada fase de la obra y para cuándo
 * hay que tenerlos comprados.
 *
 * Las cantidades salen del APU de cada partida (exactas, sin IA de por medio),
 * multiplicadas por la cantidad de obra. Las partidas sin APU se listan aparte
 * en vez de omitirse: si no se puede cuantificar, hay que decirlo.
 */
const InsumosPorFase = ({ scheduleData, items = [] }) => {
    const [diasAnticipacion, setDiasAnticipacion] = useState(InsumosService.DIAS_ANTICIPACION_COMPRA);
    const [faseAbierta, setFaseAbierta] = useState(0);

    const programa = useMemo(
        () => InsumosService.programaDeSuministro(scheduleData, items, { diasAnticipacion }),
        [scheduleData, items, diasAnticipacion]
    );

    const cobertura = useMemo(() => InsumosService.consolidar(items).cobertura, [items]);

    const formatearFecha = (fecha) => {
        if (!fecha) return '—';
        return new Date(`${fecha}T12:00:00`).toLocaleDateString('es-MX', {
            day: '2-digit', month: 'short', year: 'numeric'
        });
    };

    const exportarCSV = () => {
        const filas = InsumosService.aFilasExportables(programa);
        if (filas.length === 0) return;

        const encabezados = Object.keys(filas[0]);
        const escapar = (valor) => `"${String(valor ?? '').replace(/"/g, '""')}"`;
        const csv = [
            encabezados.join(','),
            ...filas.map(fila => encabezados.map(h => escapar(fila[h])).join(','))
        ].join('\n');

        // BOM para que Excel respete los acentos
        const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const enlace = document.createElement('a');
        enlace.href = url;
        enlace.download = 'programa_de_suministro.csv';
        enlace.click();
        URL.revokeObjectURL(url);
    };

    if (!scheduleData?.phases?.length) {
        return (
            <div className="p-8 text-center text-slate-500">
                Genera el cronograma para ver el programa de suministro.
            </div>
        );
    }

    return (
        <div className="p-4 sm:p-6 space-y-4 overflow-y-auto h-full">
            {/* Resumen */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="bg-white border-2 border-slate-200 rounded-xl p-4">
                    <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">Materiales del proyecto</div>
                    <div className="text-2xl font-bold text-slate-900 mt-1">
                        {formatCurrency(programa.totalMateriales)}
                    </div>
                </div>
                <div className="bg-white border-2 border-slate-200 rounded-xl p-4">
                    <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">Partidas cuantificadas</div>
                    <div className="text-2xl font-bold text-slate-900 mt-1">
                        {cobertura.partidasConAPU} <span className="text-base font-medium text-slate-500">de {cobertura.totalPartidas}</span>
                    </div>
                </div>
                <div className="bg-white border-2 border-slate-200 rounded-xl p-4">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">
                        Comprar con anticipación
                    </label>
                    <div className="flex items-center gap-2">
                        <input
                            type="number"
                            min="0"
                            max="90"
                            value={diasAnticipacion}
                            onChange={(e) => setDiasAnticipacion(Math.max(0, Number(e.target.value) || 0))}
                            className="w-20 text-lg font-bold text-slate-900 border-2 border-slate-300 rounded-lg px-2 py-1 focus:outline-none focus:border-indigo-500"
                        />
                        <span className="text-sm text-slate-600">días antes</span>
                    </div>
                </div>
            </div>

            {/* Aviso de partidas sin APU */}
            {programa.sinAPU.length > 0 && (
                <div className="bg-amber-50 border-2 border-amber-300 rounded-xl p-4">
                    <div className="flex items-start gap-3">
                        <AlertTriangle size={20} className="text-amber-600 shrink-0 mt-0.5" />
                        <div className="min-w-0">
                            <p className="font-bold text-amber-900">
                                {programa.sinAPU.length} partida{programa.sinAPU.length > 1 ? 's' : ''} sin APU: sus insumos NO están contados aquí
                            </p>
                            <p className="text-sm text-amber-800 mt-1">
                                Genera el APU de estas partidas en el editor para que entren al programa de compras:
                            </p>
                            <p className="text-sm text-amber-700 mt-1.5 font-medium">
                                {programa.sinAPU.join(' · ')}
                            </p>
                        </div>
                    </div>
                </div>
            )}

            <div className="flex justify-end">
                <button
                    type="button"
                    onClick={exportarCSV}
                    className="inline-flex items-center gap-2 px-4 py-2.5 bg-white border-2 border-slate-300 text-slate-700 hover:bg-slate-50 rounded-xl font-bold text-sm transition"
                >
                    <Download size={16} />
                    Exportar a Excel (CSV)
                </button>
            </div>

            {/* Fases */}
            <div className="space-y-3">
                {programa.fases.map((fase, index) => {
                    const abierta = faseAbierta === index;

                    return (
                        <div key={fase.fase + index} className="bg-white border-2 border-slate-200 rounded-xl overflow-hidden">
                            <button
                                type="button"
                                onClick={() => setFaseAbierta(abierta ? -1 : index)}
                                className="w-full flex items-center justify-between gap-3 p-4 text-left hover:bg-slate-50 transition"
                            >
                                <div className="flex items-center gap-3 min-w-0">
                                    <div className="p-2 rounded-xl bg-indigo-50 text-indigo-600 shrink-0">
                                        <Package size={20} />
                                    </div>
                                    <div className="min-w-0">
                                        <h3 className="font-bold text-slate-900 truncate">{fase.fase}</h3>
                                        <p className="text-xs text-slate-500">
                                            {fase.materiales.length} insumo{fase.materiales.length === 1 ? '' : 's'} · obra del {formatearFecha(fase.startDate)} al {formatearFecha(fase.endDate)}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3 shrink-0">
                                    <div className="text-right hidden sm:block">
                                        <div className="text-xs font-bold text-rose-600 uppercase tracking-wide flex items-center gap-1 justify-end">
                                            <CalendarClock size={13} />
                                            Comprar antes de
                                        </div>
                                        <div className="text-sm font-bold text-slate-900">{formatearFecha(fase.fechaLimiteCompra)}</div>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-xs text-slate-500">Materiales</div>
                                        <div className="text-sm font-bold text-slate-900">{formatCurrency(fase.costoMateriales)}</div>
                                    </div>
                                    <ChevronDown size={20} className={`text-slate-400 transition-transform ${abierta ? 'rotate-180' : ''}`} />
                                </div>
                            </button>

                            {abierta && (
                                <div className="border-t border-slate-200">
                                    {/* Fecha límite visible también en celular */}
                                    <div className="sm:hidden px-4 py-2 bg-rose-50 border-b border-rose-100 text-sm">
                                        <span className="font-bold text-rose-700">Comprar antes de: </span>
                                        <span className="font-bold text-slate-900">{formatearFecha(fase.fechaLimiteCompra)}</span>
                                    </div>

                                    {fase.materiales.length === 0 ? (
                                        <p className="p-4 text-sm text-slate-500">
                                            Sin materiales cuantificados en esta fase (las partidas no tienen APU).
                                        </p>
                                    ) : (
                                        <div className="overflow-x-auto">
                                            <table className="w-full text-sm">
                                                <thead className="bg-slate-50 text-slate-600">
                                                    <tr>
                                                        <th className="text-left font-bold px-4 py-2">Insumo</th>
                                                        <th className="text-right font-bold px-4 py-2 whitespace-nowrap">Cantidad</th>
                                                        <th className="text-left font-bold px-4 py-2">Unidad</th>
                                                        <th className="text-right font-bold px-4 py-2 whitespace-nowrap">Costo</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {fase.materiales.map((material, i) => (
                                                        <tr key={material.descripcion + i} className="border-t border-slate-100">
                                                            <td className="px-4 py-2">
                                                                <div className="font-medium text-slate-800">{material.descripcion}</div>
                                                                <div className="text-xs text-slate-500">Para: {material.partidas.join(', ')}</div>
                                                            </td>
                                                            <td className="px-4 py-2 text-right font-bold text-slate-900 whitespace-nowrap">
                                                                {material.cantidad.toLocaleString('es-MX')}
                                                            </td>
                                                            <td className="px-4 py-2 text-slate-600">{material.unidad}</td>
                                                            <td className="px-4 py-2 text-right text-slate-700 whitespace-nowrap">
                                                                {formatCurrency(material.costoTotal)}
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    )}

                                    {fase.partidasSinAPU.length > 0 && (
                                        <p className="px-4 py-3 bg-amber-50 border-t border-amber-100 text-xs text-amber-800">
                                            <strong>No cuantificado en esta fase:</strong> {fase.partidasSinAPU.join(' · ')}
                                        </p>
                                    )}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default InsumosPorFase;
