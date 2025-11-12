# Request Optimization Guide

Techniques for optimizing API requests to improve performance and user experience.

## Debouncing

Delays execution until user stops interacting.

**When to use:**
- Search inputs
- Form field validation
- Auto-save features

**Implementation:**
```javascript
function debounce(func, delay = 300) {
  let timeoutId;
  return function debounced(...args) {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => {
      func.apply(this, args);
    }, delay);
  };
}

// Usage
const searchInput = document.getElementById('search');
const debouncedSearch = debounce(performSearch, 500);
searchInput.addEventListener('input', (e) => {
  debouncedSearch(e.target.value);
});
```

## Throttling

Limits execution frequency.

**When to use:**
- Scroll events
- Window resize
- Mouse move tracking
- Status polling

**Implementation:**
```javascript
function throttle(func, limit = 1000) {
  let inThrottle;
  return function throttled(...args) {
    if (!inThrottle) {
      func.apply(this, args);
      inThrottle = true;
      setTimeout(() => { inThrottle = false; }, limit);
    }
  };
}

// Usage
const throttledPoll = throttle(pollStatus, 2000);
setInterval(throttledPoll, 500); // Called max once per 2s
```

## Request Deduplication

Prevents identical concurrent requests.

**When to use:**
- Multiple components requesting same data
- Rapid button clicks
- Race conditions

**Implementation:**
See SKILL.md for complete RequestDeduplicator class.

**Usage:**
```javascript
const deduplicator = new RequestDeduplicator();

// Multiple calls share single request
deduplicator.fetch('user:123', fetchUser);
deduplicator.fetch('user:123', fetchUser); // Reuses first
```

## Request Queueing

Manages concurrent requests with priority.

**When to use:**
- Rate-limited APIs
- Batch operations
- Resource-intensive requests

**Implementation:**
See SKILL.md for complete RequestQueue class.

**Usage:**
```javascript
const queue = new RequestQueue({ concurrency: 3 });

// High priority (user action)
queue.enqueue(() => fetch('/api/important'), 10);

// Low priority (background)
queue.enqueue(() => fetch('/api/background'), 1);
```

## Caching

Store and reuse responses.

**Simple Cache:**
```javascript
class ResponseCache {
  constructor(ttl = 60000) {
    this.cache = new Map();
    this.ttl = ttl;
  }

  set(key, value) {
    this.cache.set(key, {
      value,
      expires: Date.now() + this.ttl
    });
  }

  get(key) {
    const item = this.cache.get(key);
    if (!item) return null;

    if (Date.now() > item.expires) {
      this.cache.delete(key);
      return null;
    }

    return item.value;
  }

  clear() {
    this.cache.clear();
  }
}

// Usage
const cache = new ResponseCache(60000); // 1 minute TTL

async function fetchWithCache(url) {
  const cached = cache.get(url);
  if (cached) return cached;

  const response = await fetch(url);
  const data = await response.json();
  cache.set(url, data);
  return data;
}
```

## Best Practices

1. **Debounce user input** to reduce API calls
2. **Throttle high-frequency events** (scroll, resize)
3. **Deduplicate identical requests** in flight
4. **Queue requests** when API has rate limits
5. **Cache responses** with appropriate TTL
6. **Clear cache** on relevant mutations
7. **Monitor request rates** in production
8. **Use service workers** for advanced caching
