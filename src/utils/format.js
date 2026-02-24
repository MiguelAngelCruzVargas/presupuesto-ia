export const formatCurrency = (amount, currency = 'MXN') => {
    return new Intl.NumberFormat('es-MX', {
        style: 'currency',
        currency: currency,
        minimumFractionDigits: 2
    }).format(amount);
};

export const numberToWords = (amount) => {
    const units = ['', 'UN', 'DOS', 'TRES', 'CUATRO', 'CINCO', 'SEIS', 'SIETE', 'OCHO', 'NUEVE'];
    const tens = ['', 'DIEZ', 'VEINTE', 'TREINTA', 'CUARENTA', 'CINCUENTA', 'SESENTA', 'SETENTA', 'OCHENTA', 'NOVENTA'];
    const teens = ['DIEZ', 'ONCE', 'DOCE', 'TRECE', 'CATORCE', 'QUINCE', 'DIECISEIS', 'DIECISIETE', 'DIECIOCHO', 'DIECINUEVE'];
    const hundreds = ['', 'CIENTO', 'DOSCIENTOS', 'TRESCIENTOS', 'CUATROCIENTOS', 'QUINIENTOS', 'SEISCIENTOS', 'SETECIENTOS', 'OCHOCIENTOS', 'NOVECIENTOS'];

    const numberToWordsRecursive = (number) => {
        if (number === 0) return '';
        if (number === 1) return 'UN '; // Special case for 1 to ensure "UN" instead of "UNO" in compound numbers often, but mainly handled by getTens/Hundreds logic if needed, actually "UNO" might be needed at end but usually "UN" for currency. Let's stick to current logic which uses 'UN' in units array? 
        // Wait, original units array had 'UN'.
        // Let's refine the helper functions inside.
    };

    const getHundreds = (num) => {
        if (num > 99) {
            if (num === 100) return 'CIEN ';
            return hundreds[Math.floor(num / 100)] + ' ' + getTens(num % 100);
        }
        return getTens(num);
    };

    const getTens = (num) => {
        if (num < 10) return units[num];
        if (num >= 10 && num < 20) return teens[num - 10];

        // Special handling for 20-29 (VEINTI...)
        if (num >= 20 && num < 30) {
            if (num === 20) return 'VEINTE';
            // VEINTIUN, VEINTIDOS, etc.
            // Note: We use 'VEINTI' + unit. 
            // Since unit[1] is 'UN', we get 'VEINTIUN'. Correct for adjectives.
            // unit[2] is 'DOS', 'VEINTIDOS'.
            return 'VEINTI' + units[num - 20];
        }

        if (num >= 30) {
            const ten = Math.floor(num / 10);
            const unit = num % 10;
            return tens[ten] + (unit > 0 ? ' Y ' + units[unit] : '');
        }
        return '';
    };

    const convertGroup = (n) => {
        if (n === 0) return '';
        return getHundreds(n);
    };

    const integerPart = Math.floor(amount);
    const decimalPart = Math.round((amount - integerPart) * 100);

    let output = '';

    if (integerPart === 0) {
        output = 'CERO ';
    } else if (integerPart >= 1000000) {
        const millions = Math.floor(integerPart / 1000000);
        const remainder = integerPart % 1000000;

        if (millions === 1) {
            output = 'UN MILLÓN ';
        } else {
            output = convertGroup(millions) + ' MILLONES ';
        }

        if (remainder > 0) {
            if (remainder >= 1000) {
                const thousands = Math.floor(remainder / 1000);
                const units = remainder % 1000;

                if (thousands === 1) {
                    output += 'MIL ';
                } else {
                    output += convertGroup(thousands) + ' MIL ';
                }

                if (units > 0) output += convertGroup(units);
            } else {
                output += convertGroup(remainder);
            }
        }
    } else if (integerPart >= 1000) {
        const thousands = Math.floor(integerPart / 1000);
        const units = integerPart % 1000;

        if (thousands === 1) {
            output += 'MIL ';
        } else {
            output += convertGroup(thousands) + ' MIL ';
        }

        if (units > 0) output += convertGroup(units);
    } else {
        output = convertGroup(integerPart);
    }

    const currencyName = integerPart === 1 ? 'PESO' : 'PESOS';
    return `${output.trim()} ${currencyName} ${decimalPart.toString().padStart(2, '0')}/100 M.N.`;
};
