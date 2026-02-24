import React, { useState, useEffect } from 'react';
import { FileText, X, Edit } from 'lucide-react';

// Componente para renderizar memoria descriptiva con formato Markdown
const TechnicalDescriptionViewer = ({ content, onUpdate, onDelete }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [editContent, setEditContent] = useState(content);
    
    // Sincronizar editContent cuando content cambia externamente
    useEffect(() => {
        if (!isEditing) {
            setEditContent(content);
        }
    }, [content, isEditing]);

    // Función para convertir Markdown básico a HTML
    const renderMarkdown = (text) => {
        if (!text) return '';
        
        let html = text;
        
        // Convertir títulos ## Título a <h2>
        html = html.replace(/^## (.+)$/gm, '<h2 class="text-xl font-bold text-slate-800 dark:text-slate-100 mt-4 mb-2">$1</h2>');
        
        // Convertir negritas **texto** a <strong>
        html = html.replace(/\*\*([^*]+)\*\*/g, '<strong class="font-bold text-slate-900 dark:text-slate-50">$1</strong>');
        
        // PRIMERO: Detectar fórmulas LaTeX completas con \text{} y espacios (ej: f'c=200 \text{ kg/cm}^2)
        // Patrón mejorado que captura fórmulas completas incluyendo superíndices después de \text{}
        // Captura: f'c=200 \text{ kg/cm}^2 (permite espacios y captura superíndices con o sin espacio)
        // Usa un patrón más flexible que captura hasta encontrar un punto, coma, paréntesis o espacio seguido de otra palabra
        html = html.replace(/([a-zA-Z]'[a-zA-Z]?\s*[=≤≥<>]\s*\d+\s*\\text\{[^}]+\}(?:\s*\^[0-9a-zA-Z]+)?)/g, (match) => {
            if (match.includes('<span')) return match;
            // Procesar \text{} dentro de la fórmula
            let processed = match.replace(/\\text\{([^}]+)\}/g, '<span class="italic">$1</span>');
            // Procesar superíndices ^ (captura ^2, ^3, etc., con o sin espacios antes)
            processed = processed.replace(/\s*\^([0-9a-zA-Z]+)/g, '<sup class="text-xs">$1</sup>');
            return `<span class="font-mono bg-indigo-50 dark:bg-indigo-900/30 px-1.5 py-0.5 rounded text-indigo-700 dark:text-indigo-300">${processed}</span>`;
        });
        
        // SEGUNDO: Convertir fórmulas LaTeX con delimitadores $fórmula$
        html = html.replace(/\$([^$]+)\$/g, (match, formula) => {
            if (match.includes('<span')) return match;
            // Procesar \text{} dentro de la fórmula
            let processed = formula.replace(/\\text\{([^}]+)\}/g, '<span class="italic">$1</span>');
            // Procesar superíndices
            processed = processed.replace(/\^(\d+|[a-zA-Z]+)/g, '<sup class="text-xs">$1</sup>');
            return `<span class="font-mono bg-indigo-50 dark:bg-indigo-900/30 px-1.5 py-0.5 rounded text-indigo-700 dark:text-indigo-300">${processed}</span>`;
        });
        
        // TERCERO: Detectar fórmulas técnicas simples (f'c=200, sin \text{})
        html = html.replace(/(f'[a-zA-Z]?\s*[=≤≥<>]\s*\d+[^\s<]*)/g, (match) => {
            if (match.includes('<span')) return match;
            return `<span class="font-mono bg-indigo-50 dark:bg-indigo-900/30 px-1.5 py-0.5 rounded text-indigo-700 dark:text-indigo-300">${match}</span>`;
        });
        
        // CUARTO: Detectar comandos LaTeX \text{} sueltos que no fueron capturados
        html = html.replace(/(\\text\{[^}]+\})/g, (match) => {
            if (match.includes('<span')) return match;
            return match.replace(/\\text\{([^}]+)\}/g, '<span class="italic font-mono bg-indigo-50 dark:bg-indigo-900/30 px-1.5 py-0.5 rounded text-indigo-700 dark:text-indigo-300">$1</span>');
        });
        
        // Convertir saltos de línea dobles en párrafos
        html = html.split('\n\n').map(paragraph => {
            if (paragraph.trim().startsWith('<h2')) return paragraph;
            return `<p class="mb-3 text-slate-700 dark:text-slate-300 leading-relaxed">${paragraph.trim().replace(/\n/g, '<br/>')}</p>`;
        }).join('');
        
        return html;
    };

    const handleSave = () => {
        onUpdate(editContent);
        setIsEditing(false);
    };

    const handleCancel = () => {
        setEditContent(content);
        setIsEditing(false);
    };

    return (
        <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-indigo-100 dark:border-slate-700 shadow-sm animate-fadeIn">
            <div className="flex justify-between items-center mb-3">
                <h4 className="text-xs font-bold text-indigo-500 uppercase flex items-center">
                    <FileText size={14} className="mr-1" /> Memoria Descriptiva
                </h4>
                <div className="flex gap-2">
                    {!isEditing ? (
                        <>
                            <button 
                                onClick={() => setIsEditing(true)} 
                                className="text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300 text-xs font-medium"
                                title="Editar"
                            >
                                <Edit size={14} />
                            </button>
                            <button 
                                onClick={onDelete} 
                                className="text-slate-300 hover:text-slate-500 dark:hover:text-slate-400"
                                title="Eliminar"
                            >
                                <X size={14} />
                            </button>
                        </>
                    ) : (
                        <>
                            <button 
                                onClick={handleSave} 
                                className="text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 text-xs font-medium"
                                title="Guardar"
                            >
                                Guardar
                            </button>
                            <button 
                                onClick={handleCancel} 
                                className="text-slate-500 hover:text-slate-700 dark:text-slate-400 text-xs font-medium"
                                title="Cancelar"
                            >
                                Cancelar
                            </button>
                        </>
                    )}
                </div>
            </div>
            
            {isEditing ? (
                <textarea
                    value={editContent}
                    onChange={(e) => setEditContent(e.target.value)}
                    className="w-full text-sm text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-700 rounded-lg p-3 border border-slate-200 dark:border-slate-600 resize-y focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 whitespace-pre-wrap leading-relaxed font-mono"
                    rows={Math.min(Math.max(editContent.split('\n').length, 8), 20)}
                    placeholder="Escribe la memoria descriptiva aquí. Usa **negritas**, ## para títulos, y $fórmulas$ para expresiones matemáticas."
                />
            ) : (
                <div 
                    className="prose prose-sm max-w-none dark:prose-invert text-slate-700 dark:text-slate-300 leading-relaxed"
                    dangerouslySetInnerHTML={{ __html: renderMarkdown(content) }}
                    style={{
                        fontFamily: 'system-ui, -apple-system, sans-serif',
                        lineHeight: '1.7'
                    }}
                />
            )}
        </div>
    );
};

export default TechnicalDescriptionViewer;

