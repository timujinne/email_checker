/**
 * Request Queue Template
 * Manages concurrent requests with priority and concurrency limits
 *
 * Usage:
 *   const queue = new RequestQueue({ concurrency: 3 });
 *   await queue.enqueue(() => fetch('/api/data'), 10); // High priority
 *   await queue.enqueue(() => fetch('/api/background'), 1); // Low priority
 */

class RequestQueue {
  constructor(options = {}) {
    this.concurrency = options.concurrency || 3;
    this.activeRequests = 0;
    this.queue = [];
    this.stats = {
      total: 0,
      completed: 0,
      failed: 0
    };
  }

  /**
   * Enqueues a request with priority
   */
  async enqueue(fetchFn, priority = 0) {
    this.stats.total++;

    return new Promise((resolve, reject) => {
      this.queue.push({
        fetchFn,
        priority,
        resolve,
        reject,
        timestamp: Date.now()
      });

      // Sort by priority (higher first), then by timestamp (FIFO)
      this.queue.sort((a, b) => {
        if (b.priority !== a.priority) {
          return b.priority - a.priority;
        }
        return a.timestamp - b.timestamp;
      });

      this._processQueue();
    });
  }

  /**
   * Processes queue
   */
  async _processQueue() {
    if (this.activeRequests >= this.concurrency || this.queue.length === 0) {
      return;
    }

    const item = this.queue.shift();
    this.activeRequests++;

    try {
      const result = await item.fetchFn();
      this.stats.completed++;
      item.resolve(result);
    } catch (error) {
      this.stats.failed++;
      item.reject(error);
    } finally {
      this.activeRequests--;
      this._processQueue();
    }
  }

  /**
   * Gets queue status
   */
  getStatus() {
    return {
      active: this.activeRequests,
      queued: this.queue.length,
      concurrency: this.concurrency,
      stats: { ...this.stats }
    };
  }

  /**
   * Clears queue
   */
  clear() {
    this.queue.forEach(item => {
      item.reject(new Error('Queue cleared'));
    });
    this.queue = [];
  }

  /**
   * Changes concurrency limit
   */
  setConcurrency(limit) {
    this.concurrency = limit;
    this._processQueue();
  }
}

/**
 * Request Deduplicator
 * Prevents identical concurrent requests
 */
class RequestDeduplicator {
  constructor() {
    this.pendingRequests = new Map();
  }

  /**
   * Fetches with deduplication
   */
  async fetch(key, fetchFn) {
    // Return pending request if exists
    if (this.pendingRequests.has(key)) {
      return this.pendingRequests.get(key);
    }

    // Create new request
    const promise = fetchFn()
      .finally(() => {
        // Remove from pending after completion
        this.pendingRequests.delete(key);
      });

    this.pendingRequests.set(key, promise);
    return promise;
  }

  /**
   * Checks if request is pending
   */
  isPending(key) {
    return this.pendingRequests.has(key);
  }

  /**
   * Clears all pending requests
   */
  clear() {
    this.pendingRequests.clear();
  }

  /**
   * Gets pending request count
   */
  getPendingCount() {
    return this.pendingRequests.size;
  }
}

/**
 * Debounce Helper
 */
function debounce(func, delay = 300) {
  let timeoutId;

  return function debounced(...args) {
    clearTimeout(timeoutId);

    timeoutId = setTimeout(() => {
      func.apply(this, args);
    }, delay);
  };
}

/**
 * Throttle Helper
 */
function throttle(func, limit = 1000) {
  let inThrottle;
  let lastResult;

  return function throttled(...args) {
    if (!inThrottle) {
      lastResult = func.apply(this, args);
      inThrottle = true;

      setTimeout(() => {
        inThrottle = false;
      }, limit);
    }

    return lastResult;
  };
}

/**
 * Example Usage
 */
function example() {
  // Request Queue
  const queue = new RequestQueue({ concurrency: 3 });

  // High priority request (user action)
  queue.enqueue(
    () => fetch('/api/process_one').then(r => r.json()),
    10
  ).then(result => {
    console.log('High priority done:', result);
  });

  // Low priority requests (background loading)
  const lists = ['list1.txt', 'list2.txt', 'list3.txt'];
  lists.forEach(list => {
    queue.enqueue(
      () => fetch(`/api/list-details/${list}`).then(r => r.json()),
      1
    ).then(details => {
      console.log('List details:', details);
    });
  });

  // Monitor queue status
  setInterval(() => {
    const status = queue.getStatus();
    console.log('Queue status:', status);
  }, 1000);

  // Request Deduplicator
  const deduplicator = new RequestDeduplicator();

  async function fetchEmailMetadata(email) {
    return deduplicator.fetch(`metadata:${email}`, async () => {
      const response = await fetch(`/api/email-metadata/${email}`);
      return response.json();
    });
  }

  // Multiple calls share single request
  fetchEmailMetadata('user@example.com').then(data => console.log(data));
  fetchEmailMetadata('user@example.com').then(data => console.log(data)); // Reuses first

  // Debounce search
  const searchInput = document.getElementById('search');
  const debouncedSearch = debounce((query) => {
    fetch(`/api/search?q=${query}`)
      .then(r => r.json())
      .then(results => console.log(results));
  }, 500);

  searchInput.addEventListener('input', (e) => {
    debouncedSearch(e.target.value);
  });

  // Throttle status polling
  const throttledPoll = throttle(() => {
    fetch('/api/status')
      .then(r => r.json())
      .then(status => updateUI(status));
  }, 2000);

  // Can call frequently, but only executes every 2 seconds
  setInterval(throttledPoll, 500);
}

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    RequestQueue,
    RequestDeduplicator,
    debounce,
    throttle
  };
}
