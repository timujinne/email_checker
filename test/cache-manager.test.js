/**
 * Cache Manager - Unit Tests
 * Tests for multi-layer caching system
 */

describe('CacheManager', () => {
    let cacheManager;

    beforeEach(() => {
        cacheManager = new CacheManager({
            maxMemoryItems: 100,
            maxMemorySize: 10 * 1024 * 1024,
            ttl: 3600000
        });
    });

    describe('Basic Operations', () => {
        test('should initialize cache manager', () => {
            expect(cacheManager).toBeDefined();
            expect(cacheManager.memoryCache).toBeDefined();
            expect(cacheManager.stats).toBeDefined();
        });

        test('should set and get value', async () => {
            await cacheManager.set('key1', { data: 'value1' });
            const result = await cacheManager.get('key1');

            expect(result).toEqual({ data: 'value1' });
        });

        test('should return undefined for missing key', async () => {
            const result = await cacheManager.get('nonexistent');
            expect(result).toBeUndefined();
        });

        test('should delete value', async () => {
            await cacheManager.set('key1', 'value1');
            await cacheManager.delete('key1');
            const result = await cacheManager.get('key1');

            expect(result).toBeUndefined();
        });
    });

    describe('TTL Management', () => {
        test('should respect TTL', async () => {
            const now = Date.now();
            jest.useFakeTimers();

            await cacheManager.set('key1', 'value1', 1000); // 1 second TTL
            jest.advanceTimersByTime(500);

            let result = await cacheManager.get('key1');
            expect(result).toBe('value1');

            jest.advanceTimersByTime(600); // Total 1100ms
            result = await cacheManager.get('key1');
            expect(result).toBeUndefined();

            jest.useRealTimers();
        });

        test('should use default TTL', async () => {
            const now = Date.now();
            jest.useFakeTimers();

            await cacheManager.set('key1', 'value1'); // Use default TTL
            const item = cacheManager.memoryCache.get('key1');

            expect(item.expires).toBeDefined();
            expect(item.expires - now).toBeGreaterThan(0);

            jest.useRealTimers();
        });
    });

    describe('Statistics', () => {
        test('should track cache hits', async () => {
            await cacheManager.set('key1', 'value1');
            await cacheManager.get('key1');
            await cacheManager.get('key1');

            expect(cacheManager.stats.hits).toBe(2);
        });

        test('should track cache misses', async () => {
            await cacheManager.get('nonexistent');
            await cacheManager.get('another-nonexistent');

            expect(cacheManager.stats.misses).toBe(2);
        });

        test('should calculate hit rate', async () => {
            await cacheManager.set('key1', 'value1');
            await cacheManager.get('key1');
            await cacheManager.get('key1');
            await cacheManager.get('nonexistent');

            const stats = cacheManager.getStats();
            expect(stats.hitRate).toBe('66.7%');
        });

        test('should track set operations', async () => {
            await cacheManager.set('key1', 'value1');
            await cacheManager.set('key2', 'value2');

            expect(cacheManager.stats.setOperations).toBe(2);
        });

        test('should track delete operations', async () => {
            await cacheManager.set('key1', 'value1');
            await cacheManager.delete('key1');

            expect(cacheManager.stats.deleteOperations).toBe(1);
        });
    });

    describe('Memory Management', () => {
        test('should respect max items limit', async () => {
            const manager = new CacheManager({ maxMemoryItems: 2 });

            await manager.set('key1', { data: 'a' });
            await manager.set('key2', { data: 'b' });
            await manager.set('key3', { data: 'c' }); // Should evict key1 (LRU)

            expect(manager.memoryCache.size).toBeLessThanOrEqual(2);
        });

        test('should evict LRU item on memory pressure', async () => {
            const manager = new CacheManager({ maxMemoryItems: 2 });

            await manager.set('key1', { data: 'a' });
            await manager.set('key2', { data: 'b' });

            // Access key1 to make it more recent
            await manager.get('key1');

            // Add new item - key2 should be evicted (LRU)
            await manager.set('key3', { data: 'c' });

            expect(manager.memoryCache.has('key1')).toBe(true);
            expect(manager.memoryCache.has('key2')).toBe(false);
        });
    });

    describe('Clear Operations', () => {
        test('should clear all cache', async () => {
            await cacheManager.set('key1', 'value1');
            await cacheManager.set('key2', 'value2');

            await cacheManager.clear();

            expect(cacheManager.memoryCache.size).toBe(0);
            expect(cacheManager.accessOrder.length).toBe(0);
        });
    });

    describe('API Response Caching', () => {
        test('should cache API responses', async () => {
            const response = { status: 200, data: [1, 2, 3] };
            await cacheManager.cacheResponse('/api/data', response);

            const cached = await cacheManager.getCachedResponse('/api/data');
            expect(cached).toEqual(response);
        });

        test('should use cache key based on URL', async () => {
            const response1 = { data: 'url1' };
            const response2 = { data: 'url2' };

            await cacheManager.cacheResponse('/api/data1', response1);
            await cacheManager.cacheResponse('/api/data2', response2);

            const cached1 = await cacheManager.getCachedResponse('/api/data1');
            const cached2 = await cacheManager.getCachedResponse('/api/data2');

            expect(cached1).toEqual(response1);
            expect(cached2).toEqual(response2);
        });
    });

    describe('Observers', () => {
        test('should notify observers on set', (done) => {
            const observer = jest.fn((event, data) => {
                if (event === 'set') {
                    expect(data.key).toBe('key1');
                    done();
                }
            });

            cacheManager.subscribe(observer);
            cacheManager.set('key1', 'value1');
        });

        test('should notify observers on eviction', (done) => {
            const manager = new CacheManager({ maxMemoryItems: 1 });
            const observer = jest.fn((event, data) => {
                if (event === 'evict') {
                    expect(data.key).toBe('key1');
                    done();
                }
            });

            manager.subscribe(observer);
            manager.set('key1', 'value1').then(() => {
                manager.set('key2', 'value2');
            });
        });
    });
});
