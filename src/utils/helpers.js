/**
 * Generate a valid UUID v4
 * Compatible with Supabase UUID columns
 */
export const generateId = () => {
    // Use crypto.randomUUID if available (modern browsers)
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
        return crypto.randomUUID();
    }

    // Fallback: Generate UUID v4 manually
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
};

/**
 * Get current year dynamically
 * Used to ensure all prices and APUs use current year references
 */
export const getCurrentYear = () => {
    return new Date().getFullYear();
};

/**
 * Get current year range (current and previous year)
 * Format: "2024-2025"
 */
export const getCurrentYearRange = () => {
    const currentYear = getCurrentYear();
    const previousYear = currentYear - 1;
    return `${previousYear}-${currentYear}`;
};