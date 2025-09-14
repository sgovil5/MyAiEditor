// Sample TypeScript utility functions for MyAiEditor
// Demonstrates TypeScript syntax highlighting and features

export interface User {
    id: number;
    name: string;
    email: string;
    isActive: boolean;
    createdAt: Date;
}

export interface ApiResponse<T> {
    data: T;
    status: number;
    message: string;
    timestamp: Date;
}

/**
 * Utility class for common string operations
 */
export class StringUtils {
    /**
     * Capitalizes the first letter of a string
     * @param str - The input string
     * @returns The capitalized string
     */
    static capitalize(str: string): string {
        if (!str) return '';
        return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
    }

    /**
     * Converts a string to camelCase
     * @param str - The input string
     * @returns The camelCase string
     */
    static toCamelCase(str: string): string {
        return str
            .replace(/(?:^\w|[A-Z]|\b\w)/g, (word, index) =>
                index === 0 ? word.toLowerCase() : word.toUpperCase()
            )
            .replace(/\s+/g, '');
    }

    /**
     * Truncates a string to a specified length
     * @param str - The input string
     * @param length - Maximum length
     * @param ellipsis - Whether to add ellipsis
     * @returns The truncated string
     */
    static truncate(str: string, length: number, ellipsis: boolean = true): string {
        if (str.length <= length) return str;

        const truncated = str.substring(0, length);
        return ellipsis ? `${truncated}...` : truncated;
    }
}

/**
 * Utility functions for array operations
 */
export class ArrayUtils {
    /**
     * Removes duplicates from an array
     * @param arr - The input array
     * @returns Array without duplicates
     */
    static unique<T>(arr: T[]): T[] {
        return Array.from(new Set(arr));
    }

    /**
     * Groups array elements by a key
     * @param arr - The input array
     * @param keyFn - Function to extract the grouping key
     * @returns Object with grouped elements
     */
    static groupBy<T, K extends string | number>(
        arr: T[],
        keyFn: (item: T) => K
    ): Record<K, T[]> {
        return arr.reduce((groups, item) => {
            const key = keyFn(item);
            if (!groups[key]) {
                groups[key] = [];
            }
            groups[key].push(item);
            return groups;
        }, {} as Record<K, T[]>);
    }

    /**
     * Shuffles an array using Fisher-Yates algorithm
     * @param arr - The input array
     * @returns A new shuffled array
     */
    static shuffle<T>(arr: T[]): T[] {
        const shuffled = [...arr];

        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }

        return shuffled;
    }
}

/**
 * Date utility functions
 */
export class DateUtils {
    /**
     * Formats a date as YYYY-MM-DD
     * @param date - The date to format
     * @returns Formatted date string
     */
    static formatDate(date: Date): string {
        return date.toISOString().split('T')[0];
    }

    /**
     * Calculates the difference between two dates in days
     * @param date1 - First date
     * @param date2 - Second date
     * @returns Difference in days
     */
    static daysDifference(date1: Date, date2: Date): number {
        const diffTime = Math.abs(date2.getTime() - date1.getTime());
        return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    }

    /**
     * Checks if a date is today
     * @param date - The date to check
     * @returns True if the date is today
     */
    static isToday(date: Date): boolean {
        const today = new Date();
        return date.toDateString() === today.toDateString();
    }
}

// Example usage and exports
export const exampleUser: User = {
    id: 1,
    name: StringUtils.capitalize('john doe'),
    email: 'john.doe@example.com',
    isActive: true,
    createdAt: new Date()
};

export default {
    StringUtils,
    ArrayUtils,
    DateUtils
};