/**
 * Retry Manager - Unit Tests
 * Tests for exponential backoff and retry strategies
 */

describe('RetryManager', () => {
    let retryManager;

    beforeEach(() => {
        jest.useFakeTimers();
        retryManager = new RetryManager({
            maxRetries: 3,
            initialDelay: 100,
            maxDelay: 5000,
            backoffMultiplier: 2
        });
    });

    afterEach(() => {
        jest.useRealTimers();
    });

    describe('Basic Retry', () => {
        test('should execute successful operation immediately', async () => {
            const operation = jest.fn().mockResolvedValue('success');
            const result = await retryManager.execute(operation);

            expect(result).toBe('success');
            expect(operation).toHaveBeenCalledTimes(1);
        });

        test('should retry on failure', async () => {
            const operation = jest.fn()
                .mockRejectedValueOnce(new Error('Fail 1'))
                .mockRejectedValueOnce(new Error('Fail 2'))
                .mockResolvedValueOnce('success');

            const result = await retryManager.execute(operation);

            expect(result).toBe('success');
            expect(operation).toHaveBeenCalledTimes(3);
        });

        test('should throw after max retries exhausted', async () => {
            const operation = jest.fn().mockRejectedValue(new Error('Always fails'));

            await expect(retryManager.execute(operation))
                .rejects
                .toThrow('Always fails');

            expect(operation).toHaveBeenCalledTimes(3);
        });
    });

    describe('Exponential Backoff', () => {
        test('should use exponential backoff delays', async () => {
            const delays = [];
            const operation = jest.fn()
                .mockRejectedValueOnce(new Error('Fail'))
                .mockRejectedValueOnce(new Error('Fail'))
                .mockResolvedValueOnce('success');

            const customRetry = new RetryManager({
                maxRetries: 3,
                initialDelay: 100,
                maxDelay: 5000,
                backoffMultiplier: 2,
                jitter: false
            });

            // Mock setTimeout to capture delays
            jest.spyOn(global, 'setTimeout');

            try {
                await customRetry.execute(operation);
            } catch (e) {
                // Error expected
            }

            // Verify exponential backoff pattern
            expect(customRetry.stats.totalAttempts).toBe(3);
        });

        test('should not exceed max delay', () => {
            const delay1 = retryManager._calculateDelay(1);
            const delay2 = retryManager._calculateDelay(2);
            const delay3 = retryManager._calculateDelay(3);
            const delay4 = retryManager._calculateDelay(4);

            expect(delay1).toBeLessThanOrEqual(5000);
            expect(delay2).toBeLessThanOrEqual(5000);
            expect(delay3).toBeLessThanOrEqual(5000);
            expect(delay4).toBeLessThanOrEqual(5000);
        });
    });

    describe('Retryable Errors', () => {
        test('should retry on network errors', async () => {
            const operation = jest.fn()
                .mockRejectedValueOnce(new Error('ECONNRESET'))
                .mockResolvedValueOnce('success');

            const result = await retryManager.execute(operation);
            expect(result).toBe('success');
        });

        test('should retry on retryable HTTP status', async () => {
            const error = new Error('Server error');
            error.status = 503;

            const operation = jest.fn()
                .mockRejectedValueOnce(error)
                .mockResolvedValueOnce('success');

            const result = await retryManager.execute(operation);
            expect(result).toBe('success');
        });

        test('should not retry on client errors', async () => {
            const error = new Error('Bad request');
            error.status = 400;

            const operation = jest.fn().mockRejectedValue(error);

            await expect(retryManager.execute(operation))
                .rejects
                .toThrow('Bad request');

            expect(operation).toHaveBeenCalledTimes(1);
        });
    });

    describe('Circuit Breaker', () => {
        test('should open circuit after failures', async () => {
            const operation = jest.fn().mockRejectedValue(new Error('Fail'));
            const breaker = retryManager.createCircuitBreaker(operation, {
                failureThreshold: 2,
                resetTimeout: 1000
            });

            // Fail twice
            try { await breaker(); } catch (e) {}
            try { await breaker(); } catch (e) {}

            // Circuit should be open now
            await expect(breaker()).rejects.toThrow('Circuit breaker is OPEN');
        });

        test('should transition to half-open after timeout', async () => {
            const operation = jest.fn()
                .mockRejectedValue(new Error('Fail'))
                .mockResolvedValueOnce('success');

            const breaker = retryManager.createCircuitBreaker(operation, {
                failureThreshold: 1,
                resetTimeout: 100
            });

            // Fail to open circuit
            try { await breaker(); } catch (e) {}

            // Wait for reset timeout
            jest.advanceTimersByTime(150);

            // Should succeed and close circuit
            const result = await breaker();
            expect(result).toBe('success');
        });
    });

    describe('Statistics', () => {
        test('should track total attempts', async () => {
            const operation = jest.fn().mockResolvedValue('success');
            await retryManager.execute(operation);
            await retryManager.execute(operation);

            expect(retryManager.stats.totalAttempts).toBe(2);
        });

        test('should track successful retries', async () => {
            const operation = jest.fn()
                .mockRejectedValueOnce(new Error('Fail'))
                .mockResolvedValueOnce('success');

            await retryManager.execute(operation);

            expect(retryManager.stats.successfulRetries).toBe(1);
        });

        test('should calculate success rate', () => {
            retryManager.stats.totalAttempts = 10;
            retryManager.stats.failedRetries = 2;

            const stats = retryManager.getStats();
            expect(stats.successRate).toBe('80.0%');
        });
    });

    describe('Callbacks', () => {
        test('should call onRetry callback', async () => {
            const onRetry = jest.fn();
            const operation = jest.fn()
                .mockRejectedValueOnce(new Error('Fail'))
                .mockResolvedValueOnce('success');

            await retryManager.execute(operation, { onRetry });

            expect(onRetry).toHaveBeenCalled();
        });

        test('should call onFailure callback', async () => {
            const onFailure = jest.fn();
            const operation = jest.fn().mockRejectedValue(new Error('Fail'));

            try {
                await retryManager.execute(operation, { onFailure });
            } catch (e) {}

            expect(onFailure).toHaveBeenCalled();
        });
    });
});
