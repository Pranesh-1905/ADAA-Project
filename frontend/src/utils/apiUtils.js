/**
 * API Utilities - Error Handling, Retry Logic, and Request Management
 * 
 * This module provides utilities for making robust API calls with:
 * - Automatic retry with exponential backoff
 * - Request timeout handling
 * - Better error messages
 * - Request cancellation
 */

/**
 * Custom error class for API errors
 */
export class APIError extends Error {
    constructor(message, status, data) {
        super(message);
        this.name = 'APIError';
        this.status = status;
        this.data = data;
    }
}

/**
 * Sleep utility for retry delays
 */
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Make a fetch request with timeout
 * 
 * @param {string} url - The URL to fetch
 * @param {object} options - Fetch options
 * @param {number} timeout - Timeout in milliseconds (default: 30000)
 * @returns {Promise<Response>}
 */
export async function fetchWithTimeout(url, options = {}, timeout = 30000) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
        const response = await fetch(url, {
            ...options,
            signal: controller.signal,
        });
        clearTimeout(timeoutId);
        return response;
    } catch (error) {
        clearTimeout(timeoutId);
        if (error.name === 'AbortError') {
            throw new APIError('Request timed out. Please try again.', 408, null);
        }
        throw error;
    }
}

/**
 * Make a fetch request with automatic retry
 * 
 * @param {string} url - The URL to fetch
 * @param {object} options - Fetch options
 * @param {object} retryConfig - Retry configuration
 * @returns {Promise<Response>}
 */
export async function fetchWithRetry(
    url,
    options = {},
    retryConfig = {
        maxRetries: 3,
        initialDelay: 1000,
        maxDelay: 10000,
        backoffMultiplier: 2,
        retryOn: [408, 429, 500, 502, 503, 504],
    }
) {
    const {
        maxRetries,
        initialDelay,
        maxDelay,
        backoffMultiplier,
        retryOn,
    } = retryConfig;

    let lastError;
    let delay = initialDelay;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
            const response = await fetchWithTimeout(url, options);

            // If response is successful or not retryable, return it
            if (response.ok || !retryOn.includes(response.status)) {
                return response;
            }

            // Store error for potential retry
            lastError = new APIError(
                `Request failed with status ${response.status}`,
                response.status,
                await response.json().catch(() => null)
            );

            // Don't retry on last attempt
            if (attempt === maxRetries) {
                throw lastError;
            }

            // Wait before retrying
            console.log(`Retrying request (attempt ${attempt + 1}/${maxRetries})...`);
            await sleep(delay);
            delay = Math.min(delay * backoffMultiplier, maxDelay);

        } catch (error) {
            lastError = error;

            // Don't retry on last attempt or non-retryable errors
            if (attempt === maxRetries || !(error instanceof APIError)) {
                throw error;
            }

            // Wait before retrying
            console.log(`Retrying request (attempt ${attempt + 1}/${maxRetries})...`);
            await sleep(delay);
            delay = Math.min(delay * backoffMultiplier, maxDelay);
        }
    }

    throw lastError;
}

/**
 * Parse error response and return user-friendly message
 * 
 * @param {Error} error - The error object
 * @returns {string} User-friendly error message
 */
export function getErrorMessage(error) {
    if (error instanceof APIError) {
        // Try to extract message from error data
        if (error.data?.detail) {
            return error.data.detail;
        }
        if (error.data?.message) {
            return error.data.message;
        }
        return error.message;
    }

    if (error.message) {
        return error.message;
    }

    return 'An unexpected error occurred. Please try again.';
}

/**
 * Make an authenticated API request
 * 
 * @param {string} url - The URL to fetch
 * @param {object} options - Fetch options
 * @returns {Promise<any>} Parsed JSON response
 */
export async function apiRequest(url, options = {}) {
    const token = localStorage.getItem('token');

    if (!token) {
        throw new APIError('Authentication required. Please log in.', 401, null);
    }

    const response = await fetchWithRetry(url, {
        ...options,
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
            ...options.headers,
        },
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new APIError(
            errorData?.detail || `Request failed with status ${response.status}`,
            response.status,
            errorData
        );
    }

    return response.json();
}

/**
 * Debounce function - delays execution until after wait milliseconds
 * 
 * @param {Function} func - Function to debounce
 * @param {number} wait - Delay in milliseconds
 * @returns {Function} Debounced function
 */
export function debounce(func, wait) {
    let timeout;

    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };

        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

/**
 * Throttle function - limits execution to once per wait milliseconds
 * 
 * @param {Function} func - Function to throttle
 * @param {number} wait - Minimum time between executions
 * @returns {Function} Throttled function
 */
export function throttle(func, wait) {
    let inThrottle;

    return function executedFunction(...args) {
        if (!inThrottle) {
            func(...args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, wait);
        }
    };
}

/**
 * Format bytes to human-readable size
 * 
 * @param {number} bytes - Size in bytes
 * @param {number} decimals - Number of decimal places
 * @returns {string} Formatted size string
 */
export function formatBytes(bytes, decimals = 2) {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];

    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

/**
 * Format number with commas
 * 
 * @param {number} num - Number to format
 * @returns {string} Formatted number string
 */
export function formatNumber(num) {
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

/**
 * Validate email address
 * 
 * @param {string} email - Email to validate
 * @returns {boolean} True if valid
 */
export function isValidEmail(email) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
}

/**
 * Copy text to clipboard
 * 
 * @param {string} text - Text to copy
 * @returns {Promise<boolean>} True if successful
 */
export async function copyToClipboard(text) {
    try {
        await navigator.clipboard.writeText(text);
        return true;
    } catch (err) {
        console.error('Failed to copy:', err);
        return false;
    }
}

/**
 * Download data as file
 * 
 * @param {string} data - Data to download
 * @param {string} filename - Filename
 * @param {string} type - MIME type
 */
export function downloadFile(data, filename, type = 'text/plain') {
    const blob = new Blob([data], { type });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}

export default {
    APIError,
    fetchWithTimeout,
    fetchWithRetry,
    getErrorMessage,
    apiRequest,
    debounce,
    throttle,
    formatBytes,
    formatNumber,
    isValidEmail,
    copyToClipboard,
    downloadFile,
};
