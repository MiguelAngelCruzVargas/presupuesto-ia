import React from 'react';

/**
 * Renderiza texto con formato markdown básico a elementos React
 * Soporta: **negrita**, listas numeradas (1. 2. 3.), listas con viñetas (- *), saltos de línea
 */
export function renderMarkdown(text) {
    if (!text || typeof text !== 'string') return null;

    // Dividir por líneas
    const lines = text.split('\n');
    const elements = [];
    let inList = false;
    let listItems = [];
    let listType = null;
    let keyCounter = 0;

    const closeList = () => {
        if (inList && listItems.length > 0) {
            if (listType === 'ordered') {
                elements.push(
                    <ol key={`list-${keyCounter++}`} className="list-decimal list-inside space-y-1 my-2 ml-4">
                        {listItems.map((item, idx) => (
                            <li key={idx} className="ml-2">{renderInlineMarkdown(item)}</li>
                        ))}
                    </ol>
                );
            } else {
                elements.push(
                    <ul key={`list-${keyCounter++}`} className="list-disc list-inside space-y-1 my-2 ml-4">
                        {listItems.map((item, idx) => (
                            <li key={idx} className="ml-2">{renderInlineMarkdown(item)}</li>
                        ))}
                    </ul>
                );
            }
            listItems = [];
            inList = false;
            listType = null;
        }
    };

    lines.forEach((line, index) => {
        const trimmedLine = line.trim();

        // Lista numerada (1. 2. 3.)
        if (/^\d+\.\s/.test(trimmedLine)) {
            if (inList && listType !== 'ordered') {
                closeList();
            }
            inList = true;
            listType = 'ordered';
            const itemText = trimmedLine.replace(/^\d+\.\s/, '');
            listItems.push(itemText);
            return;
        }

        // Lista con viñetas (- * •)
        if (/^[-*•]\s/.test(trimmedLine)) {
            if (inList && listType !== 'unordered') {
                closeList();
            }
            inList = true;
            listType = 'unordered';
            const itemText = trimmedLine.replace(/^[-*•]\s/, '');
            listItems.push(itemText);
            return;
        }

        // Si hay una lista acumulada y esta línea no es parte de la lista
        if (inList) {
            closeList();
        }

        // Línea vacía
        if (trimmedLine.length === 0) {
            if (index > 0 && index < lines.length - 1 && elements.length > 0) {
                elements.push(<br key={`br-${keyCounter++}`} />);
            }
            return;
        }

        // Párrafo normal
        elements.push(
            <p key={`p-${keyCounter++}`} className="my-1.5 leading-relaxed">
                {renderInlineMarkdown(trimmedLine)}
            </p>
        );
    });

    // Cerrar lista si quedó abierta
    closeList();

    return elements.length > 0 ? <>{elements}</> : <p>{text}</p>;
}

/**
 * Renderiza markdown inline (negritas, código, etc.)
 */
function renderInlineMarkdown(text) {
    if (!text || typeof text !== 'string') return null;

    const result = [];
    let remainingText = text;
    let keyCounter = 0;

    // Procesar mientras haya texto
    while (remainingText.length > 0) {
        // Buscar próxima negrita
        const boldMatch = remainingText.match(/\*\*([^*]+?)\*\*/);

        // Buscar próximo código
        const codeMatch = remainingText.match(/`([^`]+)`/);

        // Determinar qué viene primero
        let nextIndex = remainingText.length;
        let nextType = null;
        let nextContent = null;

        if (boldMatch && boldMatch.index !== undefined) {
            if (boldMatch.index < nextIndex) {
                nextIndex = boldMatch.index;
                nextType = 'bold';
                nextContent = boldMatch[1];
            }
        }

        if (codeMatch && codeMatch.index !== undefined) {
            if (codeMatch.index < nextIndex) {
                nextIndex = codeMatch.index;
                nextType = 'code';
                nextContent = codeMatch[1];
            }
        }

        // Si encontramos un formato
        if (nextType) {
            // Agregar texto previo al formato
            if (nextIndex > 0) {
                const beforeText = remainingText.substring(0, nextIndex);
                if (beforeText) {
                    result.push(<span key={`text-${keyCounter++}`}>{beforeText}</span>);
                }
            }

            // Procesar el formato encontrado
            if (nextType === 'bold') {
                result.push(
                    <strong key={`bold-${keyCounter++}`} className="font-semibold">
                        {nextContent}
                    </strong>
                );
                remainingText = remainingText.substring(nextIndex + boldMatch[0].length);
            } else if (nextType === 'code') {
                result.push(
                    <code
                        key={`code-${keyCounter++}`}
                        className="bg-slate-100 dark:bg-slate-700 px-1.5 py-0.5 rounded text-xs font-mono"
                    >
                        {nextContent}
                    </code>
                );
                remainingText = remainingText.substring(nextIndex + codeMatch[0].length);
            }
        } else {
            // No hay más formato, agregar el resto del texto y terminar
            if (remainingText) {
                result.push(<span key={`text-${keyCounter++}`}>{remainingText}</span>);
            }
            break;
        }
    }

    return result.length > 0 ? <>{result}</> : text;
}
