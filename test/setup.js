/**
 * Jest Test Setup
 * Global test configuration and utilities
 */

// Polyfills
global.fetch = jest.fn();

// Mock localStorage
const localStorageMock = {
    getItem: jest.fn(),
    setItem: jest.fn(),
    removeItem: jest.fn(),
    clear: jest.fn()
};
global.localStorage = localStorageMock;

// Mock sessionStorage
const sessionStorageMock = {
    getItem: jest.fn(),
    setItem: jest.fn(),
    removeItem: jest.fn(),
    clear: jest.fn()
};
global.sessionStorage = sessionStorageMock;

// Mock IndexedDB
global.indexedDB = {
    open: jest.fn(() => ({
        onsuccess: jest.fn(),
        onerror: jest.fn(),
        onupgradeneeded: jest.fn()
    }))
};

// Mock performance API
global.performance = {
    memory: {
        usedJSHeapSize: 1000000,
        jsHeapSizeLimit: 2000000
    },
    mark: jest.fn(),
    measure: jest.fn(),
    getEntriesByName: jest.fn(() => []),
    getEntriesByType: jest.fn(() => [])
};

// Mock navigator
global.navigator = {
    userAgent: 'Mozilla/5.0 (Test Browser)'
};

// Suppress console logs in tests unless explicitly testing them
const originalConsoleLog = console.log;
const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;

global.console = {
    ...console,
    log: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
    // Restore original for debugging if needed
    _originalLog: originalConsoleLog,
    _originalError: originalConsoleError,
    _originalWarn: originalConsoleWarn
};

// Helper to restore console for debugging
global.restoreConsole = () => {
    console.log = originalConsoleLog;
    console.error = originalConsoleError;
    console.warn = originalConsoleWarn;
};

// Test utilities
global.wait = (ms = 0) => new Promise(resolve => setTimeout(resolve, ms));

global.flushPromises = () => new Promise(resolve => setImmediate(resolve));

// Create DOM element helper
global.createElement = (tag = 'div', id = null, classes = '') => {
    const element = document.createElement(tag);
    if (id) element.id = id;
    if (classes) element.className = classes;
    return element;
};

// Append to body helper
global.appendToBody = (element) => {
    document.body.appendChild(element);
    return element;
};

// Clean up after each test
afterEach(() => {
    // Clear all mocks
    jest.clearAllMocks();

    // Clear DOM
    document.body.innerHTML = '';

    // Clear storage
    localStorage.clear();
    sessionStorage.clear();
});
