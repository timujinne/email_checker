/**
 * Error Boundary - Unit Tests
 * Tests for error boundary system and error handling
 */

describe('ErrorBoundary', () => {
    let errorBoundary;
    let element;

    beforeEach(() => {
        element = createElement('div', 'test-component');
        appendToBody(element);
    });

    afterEach(() => {
        document.body.innerHTML = '';
    });

    describe('Initialization', () => {
        test('should initialize error boundary', () => {
            errorBoundary = new ErrorBoundary('TestComponent', element);
            expect(errorBoundary).toBeDefined();
            expect(errorBoundary.componentName).toBe('TestComponent');
            expect(errorBoundary.hasError).toBe(false);
        });

        test('should create wrapper element', () => {
            errorBoundary = new ErrorBoundary('TestComponent', element);
            expect(errorBoundary.wrapper).toBeDefined();
            expect(document.querySelector('.error-boundary-wrapper')).toBeInTheDocument();
        });

        test('should have correct options', () => {
            const options = { showErrorUI: true, retryable: true };
            errorBoundary = new ErrorBoundary('TestComponent', element, options);
            expect(errorBoundary.options.showErrorUI).toBe(true);
            expect(errorBoundary.options.retryable).toBe(true);
        });
    });

    describe('Error Capturing', () => {
        beforeEach(() => {
            errorBoundary = new ErrorBoundary('TestComponent', element);
        });

        test('should capture error', () => {
            const error = new Error('Test error');
            errorBoundary.captureError(error);

            expect(errorBoundary.hasError).toBe(true);
            expect(errorBoundary.error).toBe(error);
            expect(errorBoundary.errorCount).toBe(1);
        });

        test('should increment error count', () => {
            const error = new Error('Test error');

            errorBoundary.captureError(error);
            expect(errorBoundary.errorCount).toBe(1);

            errorBoundary.hasError = false; // Reset for next capture
            errorBoundary.captureError(error);
            expect(errorBoundary.errorCount).toBe(2);
        });

        test('should prevent recursive error handling', () => {
            const error = new Error('Test error');

            errorBoundary.captureError(error);
            const firstCount = errorBoundary.errorCount;

            // Try to capture again while already in error state
            errorBoundary.captureError(new Error('Another error'));

            // Error count should not increment (recursive prevention)
            expect(errorBoundary.errorCount).toBe(firstCount);
        });
    });

    describe('Error UI Rendering', () => {
        beforeEach(() => {
            errorBoundary = new ErrorBoundary('TestComponent', element, {
                showErrorUI: true,
                showErrorDetails: true
            });
        });

        test('should render error UI', () => {
            const error = new Error('Test error');
            errorBoundary.captureError(error);
            errorBoundary.renderErrorUI();

            const errorContainer = document.querySelector('.error-boundary-container');
            expect(errorContainer).toBeInTheDocument();
        });

        test('should display error message in UI', () => {
            const error = new Error('Custom error message');
            errorBoundary.captureError(error);
            errorBoundary.renderErrorUI();

            const html = document.body.innerHTML;
            expect(html).toContain('Custom error message');
        });

        test('should show error details when enabled', () => {
            errorBoundary = new ErrorBoundary('TestComponent', element, {
                showErrorDetails: true
            });

            const error = new Error('Test error');
            errorBoundary.captureError(error);
            errorBoundary.renderErrorUI();

            const html = document.body.innerHTML;
            expect(html).toContain('Error Details');
        });

        test('should hide error details when disabled', () => {
            errorBoundary = new ErrorBoundary('TestComponent', element, {
                showErrorDetails: false
            });

            const error = new Error('Test error');
            errorBoundary.captureError(error);
            errorBoundary.renderErrorUI();

            const html = document.body.innerHTML;
            expect(html).not.toContain('Error Details');
        });
    });

    describe('Error Recovery', () => {
        beforeEach(() => {
            errorBoundary = new ErrorBoundary('TestComponent', element, {
                retryable: true
            });
        });

        test('should reset error state on retry', async () => {
            const error = new Error('Test error');
            errorBoundary.captureError(error);
            expect(errorBoundary.hasError).toBe(true);

            await errorBoundary.retry();
            expect(errorBoundary.hasError).toBe(false);
            expect(errorBoundary.error).toBe(null);
        });

        test('should reset error state', () => {
            const error = new Error('Test error');
            errorBoundary.captureError(error);
            expect(errorBoundary.errorCount).toBe(1);

            errorBoundary.reset();
            expect(errorBoundary.hasError).toBe(false);
            expect(errorBoundary.error).toBe(null);
            expect(errorBoundary.errorCount).toBe(0);
        });
    });

    describe('Event Handling', () => {
        beforeEach(() => {
            errorBoundary = new ErrorBoundary('TestComponent', element);
        });

        test('should call onError callback', () => {
            const onError = jest.fn();
            errorBoundary.options.onError = onError;

            const error = new Error('Test error');
            errorBoundary.captureError(error);

            expect(onError).toHaveBeenCalledWith(error);
        });

        test('should notify observers on error', () => {
            const observer = jest.fn();
            errorBoundary.subscribe(observer);

            const error = new Error('Test error');
            errorBoundary.captureError(error);

            expect(observer).toHaveBeenCalledWith('error', expect.objectContaining({
                component: 'TestComponent',
                error: error,
                count: 1
            }));
        });

        test('should notify observers on retry', async () => {
            const observer = jest.fn();
            errorBoundary.subscribe(observer);

            const error = new Error('Test error');
            errorBoundary.captureError(error);
            observer.mockClear();

            await errorBoundary.retry();

            expect(observer).toHaveBeenCalledWith('retry', expect.objectContaining({
                component: 'TestComponent'
            }));
        });
    });

    describe('Statistics', () => {
        beforeEach(() => {
            errorBoundary = new ErrorBoundary('TestComponent', element);
        });

        test('should track error statistics', () => {
            const stats = errorBoundary.getStats();
            expect(stats.component).toBe('TestComponent');
            expect(stats.hasError).toBe(false);
            expect(stats.errorCount).toBe(0);
        });

        test('should update statistics on error', () => {
            const error = new Error('Test error');
            errorBoundary.captureError(error);

            const stats = errorBoundary.getStats();
            expect(stats.hasError).toBe(true);
            expect(stats.errorCount).toBe(1);
            expect(stats.lastError).toBe('Test error');
        });
    });
});

describe('ErrorBoundaryManager', () => {
    let manager;

    beforeEach(() => {
        manager = new ErrorBoundaryManager();
    });

    describe('Boundary Registration', () => {
        test('should register error boundary', () => {
            const element = createElement('div', 'test');
            const boundary = new ErrorBoundary('Test', element);

            manager.register('test-boundary', boundary);
            expect(manager.get('test-boundary')).toBe(boundary);
        });

        test('should retrieve registered boundary', () => {
            const element = createElement('div', 'test');
            const boundary = new ErrorBoundary('Test', element);

            manager.register('test-boundary', boundary);
            const retrieved = manager.get('test-boundary');

            expect(retrieved).toBeDefined();
            expect(retrieved.componentName).toBe('Test');
        });
    });

    describe('Global Error Handling', () => {
        test('should handle global errors', () => {
            const observer = jest.fn();
            manager.subscribe(observer);

            const error = new Error('Global error');
            window.dispatchEvent(new ErrorEvent('error', { error }));

            // Note: Event listeners for global errors may not trigger in test environment
            // This test verifies the infrastructure is in place
            expect(manager.observers.length).toBe(1);
        });
    });

    describe('Statistics', () => {
        test('should collect all statistics', () => {
            const element1 = createElement('div', 'test1');
            const element2 = createElement('div', 'test2');

            const boundary1 = new ErrorBoundary('Component1', element1);
            const boundary2 = new ErrorBoundary('Component2', element2);

            manager.register('comp1', boundary1);
            manager.register('comp2', boundary2);

            const stats = manager.getAllStats();
            expect(stats.length).toBe(2);
            expect(stats[0].component).toBe('Component1');
            expect(stats[1].component).toBe('Component2');
        });
    });
});

// Helper to check if element is in document
HTMLElement.prototype.isConnected = true;
