import React from 'react';

const Badge = ({ type }) => {
    const styles = {
        'Materiales': 'bg-blue-100 text-blue-700 border-blue-200',
        'Mano de Obra': 'bg-emerald-100 text-emerald-700 border-emerald-200',
        'Equipos': 'bg-amber-100 text-amber-700 border-amber-200',
        'Instalaciones': 'bg-purple-100 text-purple-700 border-purple-200',
        'Obra Civil': 'bg-orange-100 text-orange-700 border-orange-200',
        'Otros': 'bg-slate-100 text-slate-600 border-slate-200'
    };
    return (
        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${styles[type] || styles['Otros']}`}>
            {type}
        </span>
    );
};

export default Badge;
