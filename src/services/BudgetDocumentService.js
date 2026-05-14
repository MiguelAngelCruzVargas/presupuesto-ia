const STORAGE_KEY = 'presugenius_budget_documents';

const MONTH_LABELS = [
    '01 Enero',
    '02 Febrero',
    '03 Marzo',
    '04 Abril',
    '05 Mayo',
    '06 Junio',
    '07 Julio',
    '08 Agosto',
    '09 Septiembre',
    '10 Octubre',
    '11 Noviembre',
    '12 Diciembre'
];

export class BudgetDocumentService {
    static getStore() {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            if (!raw) {
                return {
                    globalCounter: 0,
                    monthCounters: {},
                    entries: []
                };
            }

            const parsed = JSON.parse(raw);
            return {
                globalCounter: parsed.globalCounter || 0,
                monthCounters: parsed.monthCounters || {},
                entries: Array.isArray(parsed.entries) ? parsed.entries : []
            };
        } catch (error) {
            console.error('Error loading budget document store:', error);
            return {
                globalCounter: 0,
                monthCounters: {},
                entries: []
            };
        }
    }

    static saveStore(store) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
    }

    static sanitizeSegment(value, fallback = 'SinNombre') {
        const cleaned = String(value || fallback)
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/[<>:"/\\|?*\x00-\x1F]/g, '')
            .replace(/\s+/g, ' ')
            .trim();

        return cleaned || fallback;
    }

    static getPeriodParts(date = new Date()) {
        const currentDate = date instanceof Date ? date : new Date(date);
        const year = String(currentDate.getFullYear());
        const monthNumber = String(currentDate.getMonth() + 1).padStart(2, '0');
        const monthIndex = currentDate.getMonth();
        const monthLabel = MONTH_LABELS[monthIndex] || `${monthNumber} Mes`;
        const periodKey = `${year}-${monthNumber}`;

        return {
            year,
            monthNumber,
            monthLabel,
            periodKey
        };
    }

    static buildMetadata({ projectName, clientName, createdAt, globalCounter, monthlyCounter }) {
        const { year, monthNumber, monthLabel, periodKey } = this.getPeriodParts(createdAt);
        const safeProjectName = this.sanitizeSegment(projectName, 'Presupuesto');
        const safeClientName = this.sanitizeSegment(clientName, 'Cliente');
        const monthlySequence = String(monthlyCounter).padStart(3, '0');
        const globalSequence = String(globalCounter).padStart(5, '0');
        const budgetNumber = `PR-${year}-${monthNumber}-${monthlySequence}`;
        const fileName = `${budgetNumber} - ${safeClientName} - ${safeProjectName}.pdf`;
        const relativeDirectory = `Presupuestos/${year}/${monthLabel}`;

        return {
            budgetNumber,
            monthlySequence,
            globalSequence,
            fileName,
            relativeDirectory,
            periodKey,
            year,
            monthNumber,
            monthLabel,
            createdAt: new Date(createdAt || new Date()).toISOString(),
            projectName: safeProjectName,
            clientName: safeClientName
        };
    }

    static getDraftBudgetDocument({ projectName, clientName, createdAt = new Date() } = {}) {
        const store = this.getStore();
        const { periodKey } = this.getPeriodParts(createdAt);
        const nextGlobal = (store.globalCounter || 0) + 1;
        const nextMonthly = (store.monthCounters?.[periodKey] || 0) + 1;

        return this.buildMetadata({
            projectName,
            clientName,
            createdAt,
            globalCounter: nextGlobal,
            monthlyCounter: nextMonthly
        });
    }

    static registerGeneratedBudget({ projectName, clientName, createdAt = new Date() } = {}) {
        const store = this.getStore();
        const { periodKey } = this.getPeriodParts(createdAt);
        const nextGlobal = (store.globalCounter || 0) + 1;
        const nextMonthly = (store.monthCounters?.[periodKey] || 0) + 1;

        const metadata = this.buildMetadata({
            projectName,
            clientName,
            createdAt,
            globalCounter: nextGlobal,
            monthlyCounter: nextMonthly
        });

        store.globalCounter = nextGlobal;
        store.monthCounters[periodKey] = nextMonthly;
        store.entries.unshift(metadata);
        store.entries = store.entries.slice(0, 1000);
        this.saveStore(store);

        return metadata;
    }

    static getMonthlyStats(year, monthNumber) {
        const store = this.getStore();
        const key = `${year}-${String(monthNumber).padStart(2, '0')}`;
        return {
            periodKey: key,
            total: store.monthCounters[key] || 0
        };
    }
}

export default BudgetDocumentService;
