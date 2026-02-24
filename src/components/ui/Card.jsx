import React from 'react';

const Card = ({ children, className = "", title, action }) => (
    <div className={`bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden transition-all hover:shadow-md ${className}`}>
        {(title || action) && (
            <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/50">
                {title && <h3 className="font-bold text-slate-800 dark:text-slate-100 flex items-center">{title}</h3>}
                {action && <div>{action}</div>}
            </div>
        )}
        <div className="p-6">{children}</div>
    </div>
);

export default Card;
