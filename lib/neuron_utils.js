/**
 * @file neuron_utils.js
 * @version 1.0.0
 * @description Standardized utility functions for Neuron extension modules
 * Provides consistent patterns for configuration loading, null checking, and error handling
 */

window.NeuronUtils = (function() {
    'use strict';

    const CONFIG_KEY = 'neuronUserConfig';

    /**
     * Standardized configuration loading with proper error handling
     * @param {string} scriptId - The ID of the script requesting configuration
     * @returns {Promise<Object>} Configuration object with defaults
     */
    async function loadConfiguration(scriptId) {
        try {
            if (!chrome?.storage?.local) {
                console.warn(`[Neuron|${scriptId}] chrome.storage não disponível. Usando configurações padrão.`);
                return {};
            }

            const result = await chrome.storage.local.get(CONFIG_KEY);
            const config = result[CONFIG_KEY] || {};
            console.log(`[Neuron|${scriptId}] Configurações carregadas.`);
            return config;
        } catch (error) {
            console.error(`[Neuron|${scriptId}] Erro ao carregar configurações:`, error);
            return {};
        }
    }

    /**
     * Standardized script activation check with defensive null checking
     * @param {Object} config - Configuration object
     * @param {string} scriptId - The ID of the script to check
     * @returns {boolean} Whether the script should be active
     */
    function isScriptActive(config, scriptId) {
        if (!config || typeof config !== 'object') {
            return false;
        }
        
        // Use defensive checking - default to enabled if not explicitly disabled
        const masterEnabled = config.masterEnableNeuron !== false;
        const featureEnabled = config.featureSettings?.[scriptId]?.enabled !== false;
        
        return masterEnabled && featureEnabled;
    }

    /**
     * Standardized error logging with consistent formatting
     * @param {string} scriptId - The ID of the script logging the error
     * @param {string} message - Error message
     * @param {Error|any} error - Error object or additional data
     */
    function logError(scriptId, message, error = null) {
        const formattedMessage = `%cNeuron (${scriptId}): ${message}`;
        if (error) {
            console.error(formattedMessage, "color: red; font-weight: bold;", error);
        } else {
            console.error(formattedMessage, "color: red; font-weight: bold;");
        }
    }

    /**
     * Standardized info logging with consistent formatting
     * @param {string} scriptId - The ID of the script logging the info
     * @param {string} message - Info message
     */
    function logInfo(scriptId, message) {
        console.log(`%cNeuron (${scriptId}): ${message}`, "color: blue; font-weight: bold;");
    }

    /**
     * Standardized warning logging with consistent formatting
     * @param {string} scriptId - The ID of the script logging the warning
     * @param {string} message - Warning message
     */
    function logWarning(scriptId, message) {
        console.warn(`%cNeuron (${scriptId}): ${message}`, "color: orange; font-weight: bold;");
    }

    /**
     * Safely get nested object property with default value
     * @param {Object} obj - Object to traverse
     * @param {string} path - Dot-separated path (e.g., 'textModels.Arquivar')
     * @param {any} defaultValue - Default value if path doesn't exist
     * @returns {any} Value at path or default value
     */
    function safeGet(obj, path, defaultValue = null) {
        if (!obj || typeof obj !== 'object') {
            return defaultValue;
        }

        const keys = path.split('.');
        let current = obj;

        for (const key of keys) {
            if (current === null || current === undefined || !(key in current)) {
                return defaultValue;
            }
            current = current[key];
        }

        return current;
    }

    /**
     * Standardized DOM element creation with error handling
     * @param {string} tagName - HTML tag name
     * @param {Object} attributes - Object with attribute key-value pairs
     * @param {string} textContent - Text content for the element
     * @returns {HTMLElement|null} Created element or null on error
     */
    function createElement(tagName, attributes = {}, textContent = '') {
        try {
            const element = document.createElement(tagName);
            
            Object.entries(attributes).forEach(([key, value]) => {
                if (key === 'className') {
                    element.className = value;
                } else if (key === 'style' && typeof value === 'object') {
                    Object.assign(element.style, value);
                } else {
                    element.setAttribute(key, value);
                }
            });

            if (textContent) {
                element.textContent = textContent;
            }

            return element;
        } catch (error) {
            console.error('NeuronUtils: Erro ao criar elemento:', error);
            return null;
        }
    }

    /**
     * Standardized mutation observer setup with cleanup
     * @param {Element} target - Element to observe
     * @param {Function} callback - Callback function for mutations
     * @param {Object} options - MutationObserver options
     * @returns {MutationObserver} Observer instance
     */
    function createObserver(target, callback, options = { childList: true, subtree: true }) {
        const observer = new MutationObserver(callback);
        observer.observe(target, options);
        return observer;
    }

    /**
     * Standardized debounce function
     * @param {Function} func - Function to debounce
     * @param {number} wait - Wait time in milliseconds
     * @returns {Function} Debounced function
     */
    function debounce(func, wait) {
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
     * Validate configuration structure
     * @param {Object} config - Configuration to validate
     * @returns {Object} Validation result with isValid and errors
     */
    function validateConfig(config) {
        const errors = [];
        
        if (!config || typeof config !== 'object') {
            errors.push('Configuration must be an object');
            return { isValid: false, errors };
        }

        // Check required properties
        if (typeof config.masterEnableNeuron !== 'boolean' && config.masterEnableNeuron !== undefined) {
            errors.push('masterEnableNeuron must be a boolean');
        }

        if (config.featureSettings && typeof config.featureSettings !== 'object') {
            errors.push('featureSettings must be an object');
        }

        return { isValid: errors.length === 0, errors };
    }

    // Public API
    return {
        loadConfiguration,
        isScriptActive,
        logError,
        logInfo,
        logWarning,
        safeGet,
        createElement,
        createObserver,
        debounce,
        validateConfig,
        CONFIG_KEY
    };
})();
