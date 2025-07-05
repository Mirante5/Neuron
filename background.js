/**
 * @file background.js
 * @description Background service worker for Neuron extension
 */

// Ensure proper extension initialization
chrome.runtime.onInstalled.addListener(() => {
    console.log('Neuron extension installed/updated successfully');
});

// Handle extension startup
chrome.runtime.onStartup.addListener(() => {
    console.log('Neuron extension started');
});

// Basic error handling for the background script
self.addEventListener('error', (error) => {
    console.error('Neuron background script error:', error);
});

// Handle storage changes for debugging if needed
chrome.storage.onChanged.addListener((changes, namespace) => {
    if (namespace === 'local' && changes.neuronUserConfig) {
        console.log('Neuron configuration updated');
    }
});