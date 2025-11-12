/**
 * Unit Test Template - API Client
 * Complete example of testing API client with mocks
 *
 * USAGE: Copy and adapt for your API client tests
 * PATTERN: AAA (Arrange, Act, Assert)
 */

// Import the module to test
import { API } from '../services/api';

// Import fixtures/factories
import { createMockList } from '../fixtures/factories/list-factory';

describe('API Client', () => {
  // Setup before each test
  beforeEach(() => {
    // Clear all mocks
    jest.clearAllMocks();

    // Reset fetch mock
    global.fetch = jest.fn();
  });

  // Cleanup after each test
  afterEach(() => {
    // Restore original implementations
    jest.restoreAllMocks();
  });

  // Group related tests
  describe('GET Requests', () => {
    describe('fetchLists()', () => {
      test('should fetch lists successfully', async () => {
        // Arrange: Mock successful response
        const mockLists = [
          createMockList(),
          createMockList({ country: 'DE' })
        ];

        global.fetch = jest.fn(() =>
          Promise.resolve({
            ok: true,
            status: 200,
            json: () => Promise.resolve({ lists: mockLists })
          })
        );

        // Act: Call the function
        const result = await API.fetchLists();

        // Assert: Verify behavior
        expect(fetch).toHaveBeenCalledWith('/api/lists', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json'
          }
        });
        expect(result.lists).toEqual(mockLists);
        expect(result.lists).toHaveLength(2);
      });

      test('should handle 404 error', async () => {
        // Arrange: Mock 404 response
        global.fetch = jest.fn(() =>
          Promise.resolve({
            ok: false,
            status: 404,
            json: () => Promise.resolve({ error: 'Not found' })
          })
        );

        // Act & Assert: Expect rejection
        await expect(API.fetchLists()).rejects.toThrow('Not found');
      });

      test('should handle 500 error', async () => {
        // Arrange: Mock server error
        global.fetch = jest.fn(() =>
          Promise.resolve({
            ok: false,
            status: 500,
            json: () => Promise.resolve({ error: 'Server error' })
          })
        );

        // Act & Assert: Expect rejection
        await expect(API.fetchLists()).rejects.toThrow('Server error');
      });

      test('should handle network error', async () => {
        // Arrange: Mock network failure
        global.fetch = jest.fn(() =>
          Promise.reject(new Error('Network error'))
        );

        // Act & Assert: Expect rejection
        await expect(API.fetchLists()).rejects.toThrow('Network error');
      });

      test('should handle malformed JSON', async () => {
        // Arrange: Mock invalid JSON response
        global.fetch = jest.fn(() =>
          Promise.resolve({
            ok: true,
            status: 200,
            json: () => Promise.reject(new Error('Invalid JSON'))
          })
        );

        // Act & Assert: Expect rejection
        await expect(API.fetchLists()).rejects.toThrow('Invalid JSON');
      });

      test('should handle empty response', async () => {
        // Arrange: Mock empty response
        global.fetch = jest.fn(() =>
          Promise.resolve({
            ok: true,
            status: 200,
            json: () => Promise.resolve({ lists: [] })
          })
        );

        // Act
        const result = await API.fetchLists();

        // Assert
        expect(result.lists).toEqual([]);
        expect(result.lists).toHaveLength(0);
      });
    });

    describe('fetchListStatus()', () => {
      test('should fetch status for specific list', async () => {
        // Arrange
        const mockStatus = {
          id: 'list-1',
          processing: false,
          completed: true,
          progress: 100
        };

        global.fetch = jest.fn(() =>
          Promise.resolve({
            ok: true,
            json: () => Promise.resolve(mockStatus)
          })
        );

        // Act
        const result = await API.fetchListStatus('list-1');

        // Assert
        expect(fetch).toHaveBeenCalledWith('/api/lists/list-1/status', expect.any(Object));
        expect(result.id).toBe('list-1');
        expect(result.completed).toBe(true);
      });
    });
  });

  describe('POST Requests', () => {
    describe('processFile()', () => {
      test('should process file successfully', async () => {
        // Arrange
        const filename = 'test.txt';
        const mockResponse = {
          success: true,
          filename,
          stats: { total: 1000, clean: 800, blocked: 200 }
        };

        global.fetch = jest.fn(() =>
          Promise.resolve({
            ok: true,
            status: 200,
            json: () => Promise.resolve(mockResponse)
          })
        );

        // Act
        const result = await API.processFile(filename);

        // Assert
        expect(fetch).toHaveBeenCalledWith('/api/process', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ filename })
        });
        expect(result.success).toBe(true);
        expect(result.stats.clean).toBe(800);
      });

      test('should handle validation error', async () => {
        // Arrange: Mock validation error
        global.fetch = jest.fn(() =>
          Promise.resolve({
            ok: false,
            status: 400,
            json: () => Promise.resolve({
              error: 'Validation error',
              details: { filename: 'Required' }
            })
          })
        );

        // Act & Assert
        await expect(API.processFile('')).rejects.toThrow('Validation error');
      });
    });

    describe('applySmartFilter()', () => {
      test('should apply filter successfully', async () => {
        // Arrange
        const filename = 'test_clean.txt';
        const filter = 'italy_hydraulics';
        const mockResponse = {
          success: true,
          high_priority: 150,
          medium_priority: 300,
          low_priority: 100
        };

        global.fetch = jest.fn(() =>
          Promise.resolve({
            ok: true,
            json: () => Promise.resolve(mockResponse)
          })
        );

        // Act
        const result = await API.applySmartFilter(filename, filter);

        // Assert
        expect(fetch).toHaveBeenCalledWith('/api/smart-filter/process', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ filename, filter })
        });
        expect(result.high_priority).toBe(150);
      });
    });
  });

  describe('Request Retry Logic', () => {
    test('should retry on failure and succeed', async () => {
      // Arrange: First call fails, second succeeds
      global.fetch = jest.fn()
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ lists: [] })
        });

      // Act
      const result = await API.fetchListsWithRetry();

      // Assert
      expect(fetch).toHaveBeenCalledTimes(2);
      expect(result.lists).toEqual([]);
    });

    test('should fail after max retries', async () => {
      // Arrange: All calls fail
      global.fetch = jest.fn(() =>
        Promise.reject(new Error('Network error'))
      );

      // Act & Assert
      await expect(API.fetchListsWithRetry()).rejects.toThrow('Network error');
      expect(fetch).toHaveBeenCalledTimes(3); // Initial + 2 retries
    });
  });

  describe('Request Cancellation', () => {
    test('should cancel pending request', async () => {
      // Arrange
      const abortController = new AbortController();
      global.fetch = jest.fn(() =>
        new Promise((resolve) => {
          setTimeout(() => resolve({ ok: true }), 1000);
        })
      );

      // Act
      const requestPromise = API.fetchLists({ signal: abortController.signal });
      abortController.abort();

      // Assert
      await expect(requestPromise).rejects.toThrow('Request aborted');
    });
  });

  describe('Caching', () => {
    test('should use cached response', async () => {
      // Arrange: First call hits API, second uses cache
      const mockLists = [createMockList()];

      global.fetch = jest.fn(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ lists: mockLists })
        })
      );

      // Act
      const result1 = await API.fetchListsCached();
      const result2 = await API.fetchListsCached();

      // Assert
      expect(fetch).toHaveBeenCalledTimes(1); // Only called once
      expect(result1).toEqual(result2);
    });
  });
});
